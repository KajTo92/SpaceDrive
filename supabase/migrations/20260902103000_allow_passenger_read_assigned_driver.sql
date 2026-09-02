begin;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.rides r
    where r.driver_id = auth.uid() and r.passenger_id = profiles.id
  )
  or exists (
    select 1 from public.rides r
    where r.passenger_id = auth.uid() and r.driver_id = profiles.id
  )
);

commit;
