-- Atomically grant driver access to an existing passenger, without confirming email.
create or replace function public.admin_make_passenger_driver(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_role public.user_role;
begin
  if not public.is_admin() then raise exception 'Admin required'; end if;
  select role into v_role from public.profiles where id = p_user for update;
  if v_role is null then raise exception 'Passenger not found'; end if;
  if v_role not in ('passenger', 'driver') then raise exception 'Only passenger accounts can become drivers'; end if;
  update public.profiles set role = 'driver' where id = p_user;
  insert into public.driver_profiles(user_id) values(p_user) on conflict(user_id) do nothing;
  update public.driver_applications
    set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(),
        admin_note = 'Driver access granted from passenger profile'
    where user_id = p_user and status = 'pending';
end; $$;
revoke all on function public.admin_make_passenger_driver(uuid) from public, anon;
grant execute on function public.admin_make_passenger_driver(uuid) to authenticated;
