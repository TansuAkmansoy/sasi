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
