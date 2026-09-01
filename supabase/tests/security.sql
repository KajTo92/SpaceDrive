-- Run against a disposable/local Supabase database: supabase test db.
begin;
do $$ begin
  assert (select relrowsecurity from pg_class where oid='public.rides'::regclass), 'rides RLS must be enabled';
  assert (select relrowsecurity from pg_class where oid='public.profiles'::regclass), 'profiles RLS must be enabled';
  assert not has_table_privilege('anon','public.rides','SELECT'), 'anon must not select rides';
  assert not has_table_privilege('authenticated','public.rides','UPDATE'), 'clients must use lifecycle RPCs';
  assert not has_column_privilege('authenticated','public.profiles','role','UPDATE'), 'role cannot be self-updated';
end $$;
rollback;
