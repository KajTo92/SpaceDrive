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
  insert into public.rides(
    service_type,status,passenger_id,customer_name,customer_email,customer_phone,
    pickup_name,pickup_address,pickup_latitude,pickup_longitude,
    destination_name,destination_address,destination_latitude,destination_longitude,
    scheduled_start_at,scheduled_end_at,duration_minutes,passenger_count,luggage,flight_number,
    requested_vehicle_id,requested_vehicle_class,estimated_price,currency,booking_source,special_requests
  )
  values (
    v_service,'request_received',v_uid,btrim(payload->>'customer_name'),v_email,btrim(payload->>'customer_phone'),
    coalesce(nullif(btrim(payload->>'pickup_name'),''),btrim(payload->>'pickup_address')),btrim(payload->>'pickup_address'),
    nullif(payload->>'pickup_latitude','')::double precision,nullif(payload->>'pickup_longitude','')::double precision,
    nullif(btrim(payload->>'destination_name'),''),nullif(btrim(payload->>'destination_address'),''),
    nullif(payload->>'destination_latitude','')::double precision,nullif(payload->>'destination_longitude','')::double precision,
    v_start,nullif(payload->>'scheduled_end_at','')::timestamptz,nullif(payload->>'duration_minutes','')::int,
    greatest(coalesce((payload->>'passenger_count')::smallint,1),1),nullif(payload->>'luggage',''),nullif(payload->>'flight_number',''),
    nullif(payload->>'requested_vehicle_id','')::uuid,nullif(payload->>'requested_vehicle_class',''),
    nullif(payload->>'estimated_price','')::numeric,upper(coalesce(nullif(payload->>'currency',''),'CHF')),
    'website',nullif(payload->>'special_requests','')
  ) returning id into v_id;
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

revoke all on function public.submit_ride_request(jsonb) from public;
grant execute on function public.submit_ride_request(jsonb) to anon, authenticated;
