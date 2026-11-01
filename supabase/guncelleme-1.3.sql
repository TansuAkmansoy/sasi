alter table reservation_history add column if not exists actor text;

create or replace function log_reservation_change() returns trigger language plpgsql as $$
declare
  diff jsonb;
  who text := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email';
begin
  if tg_op = 'INSERT' then
    insert into reservation_history (reservation_id, action, changes, actor)
    values (new.id, 'created', null, who);
    return new;
  end if;
  select jsonb_object_agg(n.key, jsonb_build_object('old', o.value, 'new', n.value))
    into diff
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o using (key)
   where n.value is distinct from o.value
     and n.key not in ('updated_at', 'created_at');
  if diff is not null then
    insert into reservation_history (reservation_id, action, changes, actor)
    values (new.id, 'updated', diff, who);
  end if;
  return new;
end $$;
