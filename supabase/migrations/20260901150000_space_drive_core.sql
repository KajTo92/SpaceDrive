begin;

create extension if not exists pgcrypto with schema extensions;

create type public.user_role as enum ('passenger','driver','admin');
create type public.service_type as enum ('transfer','city_tour','hourly_concierge');
create type public.ride_status as enum ('request_received','under_review','offer_sent','confirmed','driver_assigned','driver_on_the_way','driver_arrived','passenger_onboard','completed','cancelled','declined');
create type public.payment_status as enum ('unpaid','deposit_paid','paid','invoice','cash');
create type public.booking_source as enum ('website','phone','whatsapp','hotel','business','admin');
create type public.application_status as enum ('pending','approved','rejected');
create type public.driver_availability as enum ('available','busy','offline','unavailable');
create type public.vehicle_operational_status as enum ('available','unavailable','service');
create type public.note_visibility as enum ('internal_admin','driver','passenger','shared');
create type public.vehicle_unavailability_reason as enum ('service','cleaning','private_use','issue','other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'passenger',
  first_name text not null default '', last_name text not null default '',
  email text not null, phone text, avatar_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.driver_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  availability_status public.driver_availability not null default 'offline',
  languages text[] not null default '{}', notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.driver_applications (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.application_status not null default 'pending',
  languages text[] not null default '{}', application_note text, admin_note text,
  created_at timestamptz not null default now(), reviewed_at timestamptz, reviewed_by uuid references public.profiles(id) on delete set null
);
create unique index driver_applications_one_current on public.driver_applications(user_id) where status = 'pending';

create table public.vehicles (
  id uuid primary key default extensions.gen_random_uuid(), slug text not null unique,
  brand text not null, model text not null, year smallint not null check (year between 1900 and 2200),
  display_name text not null, category text not null, plate text unique,
  seat_capacity smallint check (seat_capacity > 0), luggage_capacity text, image_url text,
  operational_status public.vehicle_operational_status not null default 'available', active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.rides (
  id uuid primary key default extensions.gen_random_uuid(), service_type public.service_type not null,
  status public.ride_status not null default 'request_received', passenger_id uuid references public.profiles(id) on delete set null,
  customer_name text not null, customer_email text not null, customer_phone text not null,
  pickup_name text not null, pickup_address text not null, pickup_latitude double precision, pickup_longitude double precision,
  destination_name text, destination_address text, destination_latitude double precision, destination_longitude double precision,
  scheduled_start_at timestamptz not null, scheduled_end_at timestamptz, duration_minutes integer check (duration_minutes > 0),
  passenger_count smallint not null default 1 check (passenger_count > 0), luggage text, flight_number text,
  driver_id uuid references public.profiles(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  requested_vehicle_id uuid references public.vehicles(id) on delete set null, requested_vehicle_class text,
  estimated_price numeric(12,2) check (estimated_price >= 0), final_price numeric(12,2) check (final_price >= 0),
  currency char(3) not null default 'CHF', payment_status public.payment_status not null default 'unpaid',
  booking_source public.booking_source not null default 'website', special_requests text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint rides_end_after_start check (scheduled_end_at is null or scheduled_end_at > scheduled_start_at)
);

create table public.city_tour_details (
  ride_id uuid primary key references public.rides(id) on delete cascade,
  region text not null, tour_style text not null, duration_minutes integer not null check (duration_minutes > 0), custom_notes text
);
create table public.hourly_concierge_details (
  ride_id uuid primary key references public.rides(id) on delete cascade,
  purpose text not null, duration_minutes integer not null check (duration_minutes > 0),
  hourly_rate_snapshot numeric(12,2) not null check (hourly_rate_snapshot >= 0),
  included_kilometers_snapshot integer not null check (included_kilometers_snapshot >= 0)
);
create table public.ride_stops (
  id uuid primary key default extensions.gen_random_uuid(), ride_id uuid not null references public.rides(id) on delete cascade,
  position integer not null check (position >= 0), name text not null, address text not null,
  latitude double precision, longitude double precision, created_at timestamptz not null default now(), unique(ride_id, position)
);
create table public.passenger_preferences (
  passenger_id uuid primary key references public.profiles(id) on delete cascade,
  ride_atmosphere text, temperature smallint check (temperature between 14 and 30), music text, water text,
  name_sign boolean not null default false, notes text, updated_at timestamptz not null default now()
);
create table public.ride_notes (
  id uuid primary key default extensions.gen_random_uuid(), ride_id uuid not null references public.rides(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  visibility public.note_visibility not null, note text not null check (length(btrim(note)) > 0), created_at timestamptz not null default now()
);
create table public.ride_activity (
  id uuid primary key default extensions.gen_random_uuid(), ride_id uuid not null references public.rides(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null, event_type text not null, message text not null,
  metadata jsonb not null default '{}', visibility public.note_visibility not null default 'shared', created_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default extensions.gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  ride_id uuid references public.rides(id) on delete cascade, type text not null, title text not null, message text not null,
  read_at timestamptz, created_at timestamptz not null default now()
);
create table public.driver_unavailability (
  id uuid primary key default extensions.gen_random_uuid(), driver_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null, ends_at timestamptz not null, reason text not null, notes text,
  created_at timestamptz not null default now(), check (ends_at > starts_at)
);
create table public.vehicle_unavailability (
  id uuid primary key default extensions.gen_random_uuid(), vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  starts_at timestamptz not null, ends_at timestamptz not null, reason public.vehicle_unavailability_reason not null,
  notes text, created_at timestamptz not null default now(), check (ends_at > starts_at)
);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger driver_profiles_updated_at before update on public.driver_profiles for each row execute function public.set_updated_at();
create trigger vehicles_updated_at before update on public.vehicles for each row execute function public.set_updated_at();
create trigger rides_updated_at before update on public.rides for each row execute function public.set_updated_at();
create trigger passenger_preferences_updated_at before update on public.passenger_preferences for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, role, first_name, last_name, email, phone)
  values (new.id, 'passenger', coalesce(new.raw_user_meta_data->>'first_name',''), coalesce(new.raw_user_meta_data->>'last_name',''), new.email, nullif(new.raw_user_meta_data->>'phone',''));
  if coalesce((new.raw_user_meta_data->>'driver_application_requested')::boolean, false) then
    insert into public.driver_applications(user_id,languages,application_note)
    values(new.id,coalesce(array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'languages','[]'::jsonb))),'{}'),nullif(new.raw_user_meta_data->>'application_note',''));
  end if;
  return new;
end; $$;
revoke all on function public.handle_new_user() from public;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
insert into public.profiles(id,role,first_name,last_name,email,phone)
select id,'passenger',coalesce(raw_user_meta_data->>'first_name',''),coalesce(raw_user_meta_data->>'last_name',''),email,nullif(raw_user_meta_data->>'phone','') from auth.users
on conflict(id) do nothing;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
create or replace function public.is_driver() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'driver');
$$;
revoke all on function public.is_admin() from public; grant execute on function public.is_admin() to authenticated;
revoke all on function public.is_driver() from public; grant execute on function public.is_driver() to authenticated;

create or replace view public.public_vehicle_catalog as
select id, slug, brand, model, year, display_name, category, seat_capacity, luggage_capacity, image_url
from public.vehicles where active;

create or replace function public.submit_ride_request(payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_service public.service_type; v_start timestamptz; v_email text; v_uid uuid := auth.uid();
begin
  v_service := (payload->>'service_type')::public.service_type;
  v_start := (payload->>'scheduled_start_at')::timestamptz;
  v_email := lower(btrim(payload->>'customer_email'));
  if v_start is null or v_start < now() or coalesce(length(btrim(payload->>'pickup_address')),0) < 2 or
     coalesce(length(v_email),0) < 3 or coalesce(length(btrim(payload->>'customer_name')),0) < 2 or
     coalesce(length(btrim(payload->>'customer_phone')),0) < 3 or
     (v_service = 'transfer' and coalesce(length(btrim(payload->>'destination_address')),0) < 2) then
    raise exception 'Invalid ride request';
  end if;
  if v_uid is not null and v_email <> lower(coalesce((select email from auth.users where id=v_uid),'')) then
    raise exception 'Authenticated requests must use the account email';
  end if;
  insert into public.rides(service_type,status,passenger_id,customer_name,customer_email,customer_phone,pickup_name,pickup_address,destination_name,destination_address,scheduled_start_at,scheduled_end_at,duration_minutes,passenger_count,luggage,flight_number,requested_vehicle_id,requested_vehicle_class,estimated_price,currency,booking_source,special_requests)
  values (v_service,'request_received',v_uid,btrim(payload->>'customer_name'),v_email,btrim(payload->>'customer_phone'),coalesce(nullif(btrim(payload->>'pickup_name'),''),btrim(payload->>'pickup_address')),btrim(payload->>'pickup_address'),nullif(btrim(payload->>'destination_name'),''),nullif(btrim(payload->>'destination_address'),''),v_start,nullif(payload->>'scheduled_end_at','')::timestamptz,nullif(payload->>'duration_minutes','')::int,greatest(coalesce((payload->>'passenger_count')::smallint,1),1),nullif(payload->>'luggage',''),nullif(payload->>'flight_number',''),nullif(payload->>'requested_vehicle_id','')::uuid,nullif(payload->>'requested_vehicle_class',''),nullif(payload->>'estimated_price','')::numeric,upper(coalesce(nullif(payload->>'currency',''),'CHF')), 'website',nullif(payload->>'special_requests','')) returning id into v_id;
  if v_service = 'city_tour' then
    insert into public.city_tour_details(ride_id,region,tour_style,duration_minutes,custom_notes)
    values(v_id,btrim(payload#>>'{details,region}'),coalesce(nullif(btrim(payload#>>'{details,tour_style}'),''),'private'),(payload#>>'{details,duration_minutes}')::int,nullif(payload#>>'{details,custom_notes}',''));
  elsif v_service = 'hourly_concierge' then
    insert into public.hourly_concierge_details(ride_id,purpose,duration_minutes,hourly_rate_snapshot,included_kilometers_snapshot)
    values(v_id,btrim(payload#>>'{details,purpose}'),(payload#>>'{details,duration_minutes}')::int,(payload#>>'{details,hourly_rate_snapshot}')::numeric,(payload#>>'{details,included_kilometers_snapshot}')::int);
  end if;
  insert into public.ride_activity(ride_id,actor_id,event_type,message) values(v_id,v_uid,'request_received','Ride request received');
  return v_id;
exception when invalid_text_representation or not_null_violation or check_violation then raise exception 'Invalid ride request';
end; $$;
grant execute on function public.submit_ride_request(jsonb) to anon, authenticated;

create or replace function public.claim_my_guest_rides() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer; v_email text;
begin
  select lower(email) into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if v_email is null then raise exception 'Verified email required'; end if;
  update public.rides set passenger_id=auth.uid() where passenger_id is null and lower(customer_email)=v_email;
  get diagnostics n = row_count; return n;
end; $$;
grant execute on function public.claim_my_guest_rides() to authenticated;

create or replace function public.submit_driver_application(languages text[], application_note text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.driver_applications(user_id,languages,application_note) values(auth.uid(),coalesce(languages,'{}'),nullif(btrim(application_note),'')) returning id into v_id;
  return v_id;
end; $$;
grant execute on function public.submit_driver_application(text[],text) to authenticated;

create or replace function public.admin_review_driver_application(application_id uuid, decision public.application_status, note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  if not public.is_admin() then raise exception 'Admin required'; end if;
  if decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
  update public.driver_applications set status=decision, admin_note=nullif(btrim(note),''), reviewed_at=now(), reviewed_by=auth.uid()
  where id=application_id and status='pending' returning user_id into v_user;
  if v_user is null then raise exception 'Pending application not found'; end if;
  if decision='approved' then
    update public.profiles set role='driver' where id=v_user;
    insert into public.driver_profiles(user_id,languages)
      select v_user,languages from public.driver_applications where id=application_id
      on conflict(user_id) do update set languages=excluded.languages;
  end if;
end; $$;
grant execute on function public.admin_review_driver_application(uuid,public.application_status,text) to authenticated;

create or replace function public.check_driver_conflict(p_driver uuid,p_start timestamptz,p_end timestamptz,p_exclude uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.driver_unavailability u where u.driver_id=p_driver and tstzrange(u.starts_at,u.ends_at,'[)') && tstzrange(p_start,p_end,'[)'))
 or exists(select 1 from public.rides r where r.driver_id=p_driver and r.id is distinct from p_exclude and r.status not in ('cancelled','declined','completed') and tstzrange(r.scheduled_start_at - interval '30 minutes',coalesce(r.scheduled_end_at,r.scheduled_start_at+interval '90 minutes') + interval '30 minutes','[)') && tstzrange(p_start,p_end,'[)'));
$$;
create or replace function public.check_vehicle_conflict(p_vehicle uuid,p_start timestamptz,p_end timestamptz,p_exclude uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.vehicles v where v.id=p_vehicle and (not v.active or v.operational_status <> 'available'))
 or exists(select 1 from public.vehicle_unavailability u where u.vehicle_id=p_vehicle and tstzrange(u.starts_at,u.ends_at,'[)') && tstzrange(p_start,p_end,'[)'))
 or exists(select 1 from public.rides r where r.vehicle_id=p_vehicle and r.id is distinct from p_exclude and r.status not in ('cancelled','declined','completed') and tstzrange(r.scheduled_start_at - interval '30 minutes',coalesce(r.scheduled_end_at,r.scheduled_start_at+interval '90 minutes') + interval '30 minutes','[)') && tstzrange(p_start,p_end,'[)'));
$$;
revoke all on function public.check_driver_conflict(uuid,timestamptz,timestamptz,uuid) from public;
revoke all on function public.check_vehicle_conflict(uuid,timestamptz,timestamptz,uuid) from public;
grant execute on function public.check_driver_conflict(uuid,timestamptz,timestamptz,uuid) to authenticated;
grant execute on function public.check_vehicle_conflict(uuid,timestamptz,timestamptz,uuid) to authenticated;

create or replace function public.admin_send_offer(ride_id uuid, final_price numeric, note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_passenger uuid;
begin
 if not public.is_admin() then raise exception 'Admin required'; end if;
 if final_price < 0 then raise exception 'Invalid price'; end if;
 update public.rides set final_price=admin_send_offer.final_price,status='offer_sent' where id=admin_send_offer.ride_id and status in ('request_received','under_review','offer_sent') returning passenger_id into v_passenger;
 if not found then raise exception 'Ride cannot receive an offer'; end if;
 insert into public.ride_activity(ride_id,actor_id,event_type,message,metadata) values(admin_send_offer.ride_id,auth.uid(),'offer_sent','Offer sent',jsonb_build_object('final_price',final_price,'note',note));
 if v_passenger is not null then insert into public.notifications(user_id,ride_id,type,title,message) values(v_passenger,admin_send_offer.ride_id,'offer_sent','Your offer is ready','Open your ride request to review the offer.'); end if;
end; $$;
grant execute on function public.admin_send_offer(uuid,numeric,text) to authenticated;

create or replace function public.passenger_accept_offer(ride_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
 update public.rides set status='confirmed' where id=passenger_accept_offer.ride_id and passenger_id=auth.uid() and status='offer_sent';
 if not found then raise exception 'Offer not found or not owned by user'; end if;
 insert into public.ride_activity(ride_id,actor_id,event_type,message) values(passenger_accept_offer.ride_id,auth.uid(),'offer_accepted','Passenger accepted offer');
end; $$;
grant execute on function public.passenger_accept_offer(uuid) to authenticated;

create or replace function public.admin_assign_ride(p_ride uuid,p_driver uuid default null,p_vehicle uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_start timestamptz; v_end timestamptz; v_current_driver uuid; v_current_vehicle uuid;
begin
 if not public.is_admin() then raise exception 'Admin required'; end if;
 select scheduled_start_at,coalesce(scheduled_end_at,scheduled_start_at+interval '90 minutes'),driver_id,vehicle_id into v_start,v_end,v_current_driver,v_current_vehicle from public.rides where id=p_ride for update;
 if not found then raise exception 'Ride not found'; end if;
 p_driver := coalesce(p_driver,v_current_driver); p_vehicle := coalesce(p_vehicle,v_current_vehicle);
 if p_driver is not null then perform pg_advisory_xact_lock(hashtextextended(p_driver::text,0)); end if;
 if p_vehicle is not null then perform pg_advisory_xact_lock(hashtextextended(p_vehicle::text,1)); end if;
 if p_driver is not null and (not exists(select 1 from public.profiles where id=p_driver and role='driver') or public.check_driver_conflict(p_driver,v_start,v_end,p_ride)) then raise exception 'Driver unavailable or conflicting'; end if;
 if p_vehicle is not null and public.check_vehicle_conflict(p_vehicle,v_start,v_end,p_ride) then raise exception 'Vehicle unavailable or conflicting'; end if;
 update public.rides set driver_id=p_driver,vehicle_id=p_vehicle,status=case when p_driver is not null and p_vehicle is not null and status='confirmed' then 'driver_assigned' else status end where id=p_ride;
 insert into public.ride_activity(ride_id,actor_id,event_type,message,metadata) values(p_ride,auth.uid(),'assignment_updated','Driver or vehicle assignment updated',jsonb_build_object('driver_id',p_driver,'vehicle_id',p_vehicle));
end; $$;
grant execute on function public.admin_assign_ride(uuid,uuid,uuid) to authenticated;

create or replace function public.driver_update_ride_status(ride_id uuid,target_status public.ride_status) returns void
language plpgsql security definer set search_path = '' as $$
declare current_status public.ride_status; v_passenger uuid;
begin
 select status,passenger_id into current_status,v_passenger from public.rides where id=driver_update_ride_status.ride_id and driver_id=auth.uid() for update;
 if not found then raise exception 'Assigned ride not found'; end if;
 if not ((current_status='driver_assigned' and target_status='driver_on_the_way') or (current_status='driver_on_the_way' and target_status='driver_arrived') or (current_status='driver_arrived' and target_status='passenger_onboard') or (current_status='passenger_onboard' and target_status='completed')) then raise exception 'Invalid driver status transition'; end if;
 update public.rides set status=target_status where id=driver_update_ride_status.ride_id;
 insert into public.ride_activity(ride_id,actor_id,event_type,message) values(driver_update_ride_status.ride_id,auth.uid(),target_status::text,'Journey status changed to '||replace(target_status::text,'_',' '));
 if v_passenger is not null then insert into public.notifications(user_id,ride_id,type,title,message) values(v_passenger,driver_update_ride_status.ride_id,target_status::text,'Journey update',replace(initcap(target_status::text),'_',' ')); end if;
end; $$;
grant execute on function public.driver_update_ride_status(uuid,public.ride_status) to authenticated;

create or replace function public.admin_update_ride(p_ride uuid,p_status public.ride_status default null,p_payment public.payment_status default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_admin() then raise exception 'Admin required'; end if;
 update public.rides set status=coalesce(p_status,status),payment_status=coalesce(p_payment,payment_status) where id=p_ride;
 if not found then raise exception 'Ride not found'; end if;
 insert into public.ride_activity(ride_id,actor_id,event_type,message) values(p_ride,auth.uid(),'admin_updated','Journey updated by dispatch');
end; $$;
grant execute on function public.admin_update_ride(uuid,public.ride_status,public.payment_status) to authenticated;

create or replace function public.admin_create_ride(payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_driver uuid:=nullif(payload->>'driver_id','')::uuid; v_vehicle uuid:=nullif(payload->>'vehicle_id','')::uuid; v_start timestamptz:=(payload->>'scheduled_start_at')::timestamptz; v_end timestamptz:=coalesce(nullif(payload->>'scheduled_end_at','')::timestamptz,v_start+interval '90 minutes');
begin
 if not public.is_admin() then raise exception 'Admin required'; end if;
 if v_driver is not null then perform pg_advisory_xact_lock(hashtextextended(v_driver::text,0)); end if;
 if v_vehicle is not null then perform pg_advisory_xact_lock(hashtextextended(v_vehicle::text,1)); end if;
 if v_driver is not null and public.check_driver_conflict(v_driver,v_start,v_end,null) then raise exception 'Driver conflict'; end if;
 if v_vehicle is not null and public.check_vehicle_conflict(v_vehicle,v_start,v_end,null) then raise exception 'Vehicle conflict'; end if;
 insert into public.rides(service_type,status,passenger_id,customer_name,customer_email,customer_phone,pickup_name,pickup_address,destination_name,destination_address,scheduled_start_at,scheduled_end_at,passenger_count,luggage,flight_number,driver_id,vehicle_id,final_price,currency,payment_status,booking_source,special_requests)
 values((payload->>'service_type')::public.service_type,(case when v_driver is not null and v_vehicle is not null then 'driver_assigned' else 'confirmed' end)::public.ride_status,nullif(payload->>'passenger_id','')::uuid,payload->>'customer_name',lower(payload->>'customer_email'),payload->>'customer_phone',payload->>'pickup_name',payload->>'pickup_address',payload->>'destination_name',payload->>'destination_address',v_start,v_end,coalesce((payload->>'passenger_count')::smallint,1),payload->>'luggage',payload->>'flight_number',v_driver,v_vehicle,nullif(payload->>'final_price','')::numeric,upper(coalesce(payload->>'currency','CHF')),'unpaid',(payload->>'booking_source')::public.booking_source,payload->>'special_requests') returning id into v_id;
 insert into public.ride_activity(ride_id,actor_id,event_type,message) values(v_id,auth.uid(),'created','Journey created by dispatch'); return v_id;
end; $$;
grant execute on function public.admin_create_ride(jsonb) to authenticated;

create or replace function public.admin_set_user_role(user_id uuid,new_role public.user_role) returns void language plpgsql security definer set search_path='' as $$
begin if not public.is_admin() then raise exception 'Admin required'; end if; update public.profiles set role=new_role where id=user_id; end; $$;
grant execute on function public.admin_set_user_role(uuid,public.user_role) to authenticated;

alter table public.profiles enable row level security; alter table public.driver_profiles enable row level security;
alter table public.driver_applications enable row level security; alter table public.vehicles enable row level security;
alter table public.rides enable row level security; alter table public.city_tour_details enable row level security;
alter table public.hourly_concierge_details enable row level security; alter table public.ride_stops enable row level security;
alter table public.passenger_preferences enable row level security; alter table public.ride_notes enable row level security;
alter table public.ride_activity enable row level security; alter table public.notifications enable row level security;
alter table public.driver_unavailability enable row level security; alter table public.vehicle_unavailability enable row level security;

create policy profiles_select on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin() or exists(select 1 from public.rides r where r.driver_id=auth.uid() and r.passenger_id=profiles.id));
create policy profiles_update_self on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create or replace function public.protect_profile_privileges() returns trigger language plpgsql set search_path='' as $$
begin
  if not public.is_admin() and coalesce(auth.role(),'') <> 'service_role' and (new.role is distinct from old.role or new.email is distinct from old.email) then
    raise exception 'Role and email cannot be changed by this operation';
  end if;
  return new;
end; $$;
create trigger protect_profile_privileges before update on public.profiles for each row execute function public.protect_profile_privileges();
create policy driver_profiles_select on public.driver_profiles for select to authenticated using(user_id=auth.uid() or public.is_admin() or exists(select 1 from public.rides r where r.driver_id=driver_profiles.user_id and r.passenger_id=auth.uid()));
create policy driver_profiles_update_self on public.driver_profiles for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy applications_select on public.driver_applications for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy vehicles_admin_all on public.vehicles for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy vehicles_authenticated_read on public.vehicles for select to authenticated using(active);
create policy rides_select on public.rides for select to authenticated using(public.is_admin() or passenger_id=auth.uid() or driver_id=auth.uid());
create policy details_city_select on public.city_tour_details for select to authenticated using(exists(select 1 from public.rides r where r.id=ride_id and (public.is_admin() or r.passenger_id=auth.uid() or r.driver_id=auth.uid())));
create policy details_hourly_select on public.hourly_concierge_details for select to authenticated using(exists(select 1 from public.rides r where r.id=ride_id and (public.is_admin() or r.passenger_id=auth.uid() or r.driver_id=auth.uid())));
create policy stops_select on public.ride_stops for select to authenticated using(exists(select 1 from public.rides r where r.id=ride_id and (public.is_admin() or r.passenger_id=auth.uid() or r.driver_id=auth.uid())));
create policy preferences_select on public.passenger_preferences for select to authenticated using(passenger_id=auth.uid() or public.is_admin() or exists(select 1 from public.rides r where r.passenger_id=passenger_preferences.passenger_id and r.driver_id=auth.uid()));
create policy preferences_insert on public.passenger_preferences for insert to authenticated with check(passenger_id=auth.uid());
create policy preferences_update on public.passenger_preferences for update to authenticated using(passenger_id=auth.uid()) with check(passenger_id=auth.uid());
create policy notes_select on public.ride_notes for select to authenticated using(public.is_admin() or (visibility in ('passenger','shared') and exists(select 1 from public.rides r where r.id=ride_id and r.passenger_id=auth.uid())) or (visibility in ('driver','shared') and exists(select 1 from public.rides r where r.id=ride_id and r.driver_id=auth.uid())));
create policy notes_insert on public.ride_notes for insert to authenticated with check(author_id=auth.uid() and (public.is_admin() or (visibility in ('passenger','shared') and exists(select 1 from public.rides r where r.id=ride_id and r.passenger_id=auth.uid())) or (visibility in ('driver','shared') and exists(select 1 from public.rides r where r.id=ride_id and r.driver_id=auth.uid()))));
create policy activity_select on public.ride_activity for select to authenticated using(public.is_admin() or (visibility in ('passenger','shared') and exists(select 1 from public.rides r where r.id=ride_id and r.passenger_id=auth.uid())) or (visibility in ('driver','shared') and exists(select 1 from public.rides r where r.id=ride_id and r.driver_id=auth.uid())));
create policy notifications_own on public.notifications for select to authenticated using(user_id=auth.uid());
create policy notifications_mark_read on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy driver_unavailability_select on public.driver_unavailability for select to authenticated using(driver_id=auth.uid() or public.is_admin());
create policy driver_unavailability_admin on public.driver_unavailability for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy vehicle_unavailability_admin on public.vehicle_unavailability for all to authenticated using(public.is_admin()) with check(public.is_admin());

create index rides_passenger_idx on public.rides(passenger_id); create index rides_driver_idx on public.rides(driver_id);
create index rides_vehicle_idx on public.rides(vehicle_id); create index rides_status_idx on public.rides(status);
create index rides_service_idx on public.rides(service_type); create index rides_start_idx on public.rides(scheduled_start_at);
create index applications_user_idx on public.driver_applications(user_id); create index applications_status_idx on public.driver_applications(status);
create index notifications_user_idx on public.notifications(user_id); create index notifications_read_idx on public.notifications(read_at);
create index activity_ride_idx on public.ride_activity(ride_id); create index stops_ride_idx on public.ride_stops(ride_id);
create index driver_unavailability_driver_idx on public.driver_unavailability(driver_id); create index vehicle_unavailability_vehicle_idx on public.vehicle_unavailability(vehicle_id);

insert into public.vehicles(slug,brand,model,year,display_name,category,image_url)
values ('tesla-model-y-2024','Tesla','Model Y',2024,'Tesla Model Y 2024','premium_suv','/y2024.png'),
('tesla-model-y-2025','Tesla','Model Y',2025,'Tesla Model Y 2025','premium_suv','/y2025.png'),
('mercedes-v-class','Mercedes-Benz','V-Class',2025,'Mercedes-Benz V-Class','business_van','/vclass.png')
on conflict(slug) do nothing;

alter publication supabase_realtime add table public.rides;

grant select on public.public_vehicle_catalog to anon,authenticated;
revoke select on public.rides from anon;
revoke insert,update,delete on public.rides from anon,authenticated;
revoke insert,update,delete on public.driver_applications from authenticated;
revoke update(role) on public.profiles from authenticated;

commit;
