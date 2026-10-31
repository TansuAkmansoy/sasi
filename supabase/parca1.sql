create extension if not exists btree_gist with schema extensions;

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
