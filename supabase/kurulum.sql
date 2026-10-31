-- =====================================================================
-- SASI — Supabase veritabanı kurulumu
-- Supabase panelinde: SQL Editor → New query → bu dosyanın tamamını
-- yapıştır → Run. Birden fazla kez çalıştırmak güvenlidir.
-- =====================================================================

create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------
-- Tablolar
-- ---------------------------------------------------------------------
create table if not exists villas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort int not null default 0,
  currency text not null default 'EUR' check (currency in ('TRY','EUR','GBP','USD')),
  active boolean not null default true
);

create table if not exists monthly_prices (
  villa_id uuid not null references villas(id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  weekly_minor bigint not null check (weekly_minor >= 0),
  currency text not null check (currency in ('TRY','EUR','GBP','USD')),
  primary key (villa_id, year, month)
);

create table if not exists agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_commission_pct numeric(5,2)
);

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  villa_id uuid not null references villas(id),
  status text not null default 'confirmed'
    check (status in ('option','confirmed','completed','cancelled','option_released')),
  check_in date not null,
  check_out date not null,
  option_until date,
  guest_name text not null default '',
  guest_phone text,
  guest_email text,
  guests_count int,
  currency text not null default 'EUR' check (currency in ('TRY','EUR','GBP','USD')),
  gross_minor bigint not null default 0,
  manual_price boolean not null default false,
  agency_id uuid references agencies(id) on delete set null,
  commission_pct numeric(5,2),
  commission_minor bigint,
  invoice_date date,
  registry_done boolean not null default false,
  registry_date date,
  note text,
  cancel_date date,
  cancel_reason text,
  refund_status text check (refund_status in ('pending','refunded','none')),
  deduction_minor bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_range check (check_out > check_in),
  constraint option_needs_date check (status <> 'option' or option_until is not null)
);

-- ÇİFTE SATIŞ KORUMASI: aynı villada aktif konaklamalar çakışamaz.
-- [giriş, çıkış) yarı açık aralık: çıkış günü yeni giriş yapılabilir.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'no_overlap') then
    alter table reservations add constraint no_overlap
      exclude using gist (villa_id with =, daterange(check_in, check_out, '[)') with &&)
      where (status in ('option','confirmed','completed'));
  end if;
end $$;

create index if not exists reservations_dates on reservations (check_in, check_out);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  kind text not null check (kind in ('deposit','interim','balance','refund')),
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null check (currency in ('TRY','EUR','GBP','USD')),
  rate numeric(14,6),
  method text not null default 'transfer' check (method in ('cash','transfer','card','agency','other')),
  paid_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists payments_res on payments (reservation_id);

create table if not exists reservation_history (
  id bigint generated always as identity primary key,
  reservation_id uuid not null references reservations(id) on delete cascade,
  changed_at timestamptz not null default now(),
  action text not null,
  changes jsonb
);
create index if not exists history_res on reservation_history (reservation_id, changed_at desc);

create table if not exists share_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  kind text not null check (kind in ('availability','admin')),
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  revoked boolean not null default false
);

-- ---------------------------------------------------------------------
-- Tetikleyiciler: updated_at ve değişiklik geçmişi
-- ---------------------------------------------------------------------
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists reservations_touch on reservations;
create trigger reservations_touch before update on reservations
  for each row execute function touch_updated_at();

create or replace function log_reservation_change() returns trigger language plpgsql as $$
declare
  diff jsonb;
begin
  if tg_op = 'INSERT' then
    insert into reservation_history (reservation_id, action, changes)
    values (new.id, 'created', null);
    return new;
  end if;
  select jsonb_object_agg(n.key, jsonb_build_object('old', o.value, 'new', n.value))
    into diff
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o using (key)
   where n.value is distinct from o.value
     and n.key not in ('updated_at','created_at');
  if diff is not null then
    insert into reservation_history (reservation_id, action, changes)
    values (new.id, 'updated', diff);
  end if;
  return new;
end $$;

drop trigger if exists reservations_log on reservations;
create trigger reservations_log after insert or update on reservations
  for each row execute function log_reservation_change();

-- ---------------------------------------------------------------------
-- Rezervasyonu ödemeleriyle birlikte tek işlemde kaydet
-- ---------------------------------------------------------------------
create or replace function save_reservation(p jsonb, pays jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  r reservations;
  rid uuid;
  keep uuid[];
begin
  r := jsonb_populate_record(null::reservations, p);
  if r.id is null then
    insert into reservations (villa_id, status, check_in, check_out, option_until, guest_name,
      guest_phone, guest_email, guests_count, currency, gross_minor, manual_price, agency_id,
      commission_pct, commission_minor, invoice_date, registry_done, registry_date, note,
      cancel_date, cancel_reason, refund_status, deduction_minor)
    values (r.villa_id, coalesce(r.status,'confirmed'), r.check_in, r.check_out, r.option_until,
      coalesce(r.guest_name,''), r.guest_phone, r.guest_email, r.guests_count, coalesce(r.currency,'EUR'),
      coalesce(r.gross_minor,0), coalesce(r.manual_price,false), r.agency_id, r.commission_pct,
      r.commission_minor, r.invoice_date, coalesce(r.registry_done,false), r.registry_date, r.note,
      r.cancel_date, r.cancel_reason, r.refund_status, r.deduction_minor)
    returning id into rid;
  else
    update reservations set
      villa_id = r.villa_id, status = r.status, check_in = r.check_in, check_out = r.check_out,
      option_until = r.option_until, guest_name = coalesce(r.guest_name,''), guest_phone = r.guest_phone,
      guest_email = r.guest_email, guests_count = r.guests_count, currency = r.currency,
      gross_minor = coalesce(r.gross_minor,0), manual_price = coalesce(r.manual_price,false),
      agency_id = r.agency_id, commission_pct = r.commission_pct, commission_minor = r.commission_minor,
      invoice_date = r.invoice_date, registry_done = coalesce(r.registry_done,false),
      registry_date = r.registry_date, note = r.note, cancel_date = r.cancel_date,
      cancel_reason = r.cancel_reason, refund_status = r.refund_status, deduction_minor = r.deduction_minor
    where id = r.id
    returning id into rid;
    if rid is null then
      raise exception 'Rezervasyon bulunamadı' using errcode = 'P0002';
    end if;
  end if;

  select coalesce(array_agg((x->>'id')::uuid), '{}')
    into keep
    from jsonb_array_elements(coalesce(pays,'[]'::jsonb)) x
   where nullif(x->>'id','') is not null;

  delete from payments where reservation_id = rid and not (id = any(keep));

  insert into payments (id, reservation_id, kind, amount_minor, currency, rate, method, paid_on)
  select coalesce(nullif(x->>'id','')::uuid, gen_random_uuid()), rid, x->>'kind',
         (x->>'amount_minor')::bigint, x->>'currency', nullif(x->>'rate','')::numeric,
         coalesce(x->>'method','transfer'), coalesce(nullif(x->>'paid_on','')::date, current_date)
    from jsonb_array_elements(coalesce(pays,'[]'::jsonb)) x
  on conflict (id) do update set
    kind = excluded.kind, amount_minor = excluded.amount_minor, currency = excluded.currency,
    rate = excluded.rate, method = excluded.method, paid_on = excluded.paid_on;

  return rid;
end $$;

-- ---------------------------------------------------------------------
-- Paylaşım bağlantısı: giriş yapmadan, yalnızca geçerli anahtarla okunur
-- availability → yalnızca dolu tarihler (isim, fiyat yok)
-- admin        → tüm kayıtlar, salt okunur
-- ---------------------------------------------------------------------
create or replace function share_view(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  l share_links;
  result jsonb;
begin
  if p_token is null or length(p_token) < 20 then
    return null;
  end if;
  select * into l from share_links
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     and not revoked;
  if not found then
    return null;
  end if;

  if l.kind = 'availability' then
    select jsonb_build_object(
      'kind', 'availability',
      'today', current_date,
      'villas', coalesce(jsonb_agg(jsonb_build_object(
        'name', v.name,
        'busy', (select coalesce(jsonb_agg(jsonb_build_array(r.check_in, r.check_out) order by r.check_in), '[]'::jsonb)
                   from reservations r
                  where r.villa_id = v.id
                    and r.status in ('option','confirmed','completed')
                    and r.check_out >= current_date - 62)
      ) order by v.sort, v.name), '[]'::jsonb))
      into result
      from villas v where v.active;
    return result;
  end if;

  select jsonb_build_object(
    'kind', 'admin',
    'label', l.label,
    'today', current_date,
    'villas', (select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name) order by v.sort, v.name), '[]'::jsonb)
                 from villas v where v.active),
    'reservations', (select coalesce(jsonb_agg(
        to_jsonb(r)
        || jsonb_build_object('agency_name', a.name)
        || jsonb_build_object('payments', (select coalesce(jsonb_agg(to_jsonb(p) order by p.paid_on), '[]'::jsonb)
                                              from payments p where p.reservation_id = r.id))
        order by r.check_in), '[]'::jsonb)
        from reservations r left join agencies a on a.id = r.agency_id)
  ) into result;
  return result;
end $$;

-- ---------------------------------------------------------------------
-- Güvenlik: tablolar yalnızca giriş yapmış hesaba açık
-- (Supabase → Authentication → Sign In / Providers → "Allow new users to
--  sign up" kapalı olmalı; böylece tek hesap sizin hesabınız olur.)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['villas','monthly_prices','agencies','reservations','payments','reservation_history','share_links'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists owner_all on %I', t);
    execute format('create policy owner_all on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

revoke all on function share_view(text) from public;
grant execute on function share_view(text) to anon, authenticated;
revoke all on function save_reservation(jsonb, jsonb) from public, anon;
grant execute on function save_reservation(jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Başlangıç verisi: villalar
-- ---------------------------------------------------------------------
insert into villas (name, sort, currency) values
  ('Villa Poyraz', 1, 'EUR'),
  ('Villa Seascape', 2, 'EUR'),
  ('Villa Shipahoy', 3, 'EUR')
on conflict (name) do nothing;
