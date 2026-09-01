create or replace function public.protect_profile_privileges() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not public.is_admin()
     and coalesce(auth.role(),'') <> 'service_role'
     and (new.role is distinct from old.role or new.email is distinct from old.email) then
    raise exception 'Role and email cannot be changed by this operation';
  end if;
  return new;
end; $$;
