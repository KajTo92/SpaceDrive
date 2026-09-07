create table if not exists public.driver_availability_days (
  driver_id uuid not null references public.profiles(id) on delete cascade,
  available_date date not null,
  created_at timestamptz not null default now(),
  primary key (driver_id, available_date)
);

alter table public.driver_availability_days enable row level security;

create policy driver_availability_select
on public.driver_availability_days for select to authenticated
using (driver_id = auth.uid() or public.is_admin());

create policy driver_availability_insert
on public.driver_availability_days for insert to authenticated
with check (
  driver_id = auth.uid()
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'driver'
  )
);

create policy driver_availability_delete
on public.driver_availability_days for delete to authenticated
using (driver_id = auth.uid());

grant select, insert, delete on public.driver_availability_days to authenticated;

create index if not exists driver_availability_date_idx
on public.driver_availability_days(available_date, driver_id);
