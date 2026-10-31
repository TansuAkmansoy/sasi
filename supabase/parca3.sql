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

insert into villas (name, sort, currency) values
  ('Villa Poyraz', 1, 'EUR'),
  ('Villa Seascape', 2, 'EUR'),
  ('Villa Shipahoy', 3, 'EUR')
on conflict (name) do nothing;
