alter table reservations add column if not exists stay_minor bigint;
alter table reservations add column if not exists pet boolean not null default false;
alter table reservations add column if not exists pet_fee_minor bigint;
alter table reservations add column if not exists short_stay_fee_minor bigint;
alter table reservations add column if not exists hold_until timestamptz;

create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table app_settings enable row level security;
drop policy if exists owner_all on app_settings;
create policy owner_all on app_settings for all to authenticated using (true) with check (true);

create or replace function save_reservation(p jsonb, pays jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  rid uuid;
  cols text;
  ins jsonb := jsonb_strip_nulls(p) - 'id' - 'created_at' - 'updated_at' - 'payments';
  keep uuid[];
begin
  if nullif(p->>'id', '') is null then
    select string_agg(quote_ident(c.column_name), ', ') into cols
      from information_schema.columns c
     where c.table_schema = 'public' and c.table_name = 'reservations' and ins ? c.column_name;
    execute format('insert into reservations (%s) select %s from jsonb_populate_record(null::reservations, $1) returning id', cols, cols)
      using ins into rid;
  else
    select string_agg(format('%I = r.%I', c.column_name, c.column_name), ', ') into cols
      from information_schema.columns c
     where c.table_schema = 'public' and c.table_name = 'reservations'
       and c.column_name not in ('id', 'created_at', 'updated_at') and p ? c.column_name;
    execute format('update reservations t set %s from jsonb_populate_record(null::reservations, $1) r where t.id = r.id returning t.id', cols)
      using p into rid;
    if rid is null then
      raise exception 'Rezervasyon bulunamadı' using errcode = 'P0002';
    end if;
  end if;

  select coalesce(array_agg((x->>'id')::uuid), '{}') into keep
    from jsonb_array_elements(coalesce(pays, '[]'::jsonb)) x
   where nullif(x->>'id', '') is not null;

  delete from payments where reservation_id = rid and not (id = any(keep));

  insert into payments (id, reservation_id, kind, amount_minor, currency, rate, method, paid_on)
  select coalesce(nullif(x->>'id', '')::uuid, gen_random_uuid()), rid, x->>'kind',
         (x->>'amount_minor')::bigint, x->>'currency', nullif(x->>'rate', '')::numeric,
         coalesce(x->>'method', 'transfer'), coalesce(nullif(x->>'paid_on', '')::date, current_date)
    from jsonb_array_elements(coalesce(pays, '[]'::jsonb)) x
  on conflict (id) do update set
    kind = excluded.kind, amount_minor = excluded.amount_minor, currency = excluded.currency,
    rate = excluded.rate, method = excluded.method, paid_on = excluded.paid_on;

  return rid;
end $$;

revoke all on function save_reservation(jsonb, jsonb) from public, anon;
grant execute on function save_reservation(jsonb, jsonb) to authenticated;
