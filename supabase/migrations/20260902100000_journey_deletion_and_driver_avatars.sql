begin;

create or replace function public.delete_journey(p_ride uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_role public.user_role;
  v_deleted boolean;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null then raise exception 'Authentication required'; end if;

  delete from public.rides
  where id = p_ride
    and (
      v_role = 'admin'
      or (v_role = 'passenger' and passenger_id = auth.uid())
      or (v_role = 'driver' and driver_id = auth.uid())
    )
  returning true into v_deleted;

  if not coalesce(v_deleted, false) then
    raise exception 'Journey not found or cannot be deleted by this account';
  end if;
end;
$$;
grant execute on function public.delete_journey(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('driver-avatars', 'driver-avatars', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists driver_avatars_admin_manage on storage.objects;
create policy driver_avatars_admin_manage on storage.objects
for all to authenticated
using (bucket_id = 'driver-avatars' and public.is_admin())
with check (bucket_id = 'driver-avatars' and public.is_admin());

create or replace function public.admin_set_driver_avatar(p_driver uuid, p_avatar_url text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admin required'; end if;
  update public.profiles
  set avatar_url = nullif(btrim(p_avatar_url), '')
  where id = p_driver and role = 'driver';
  if not found then raise exception 'Driver not found'; end if;
end;
$$;
grant execute on function public.admin_set_driver_avatar(uuid,text) to authenticated;

commit;
