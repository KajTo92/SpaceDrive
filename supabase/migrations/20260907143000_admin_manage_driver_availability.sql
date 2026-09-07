drop policy if exists driver_availability_insert on public.driver_availability_days;
create policy driver_availability_insert
on public.driver_availability_days for insert to authenticated
with check (
  public.is_admin()
  or (
    driver_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'driver'
    )
  )
);

drop policy if exists driver_availability_delete on public.driver_availability_days;
create policy driver_availability_delete
on public.driver_availability_days for delete to authenticated
using (driver_id = auth.uid() or public.is_admin());
