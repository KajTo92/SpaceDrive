create or replace function public.admin_create_ride(payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_driver uuid := nullif(payload->>'driver_id','')::uuid;
  v_vehicle uuid := nullif(payload->>'vehicle_id','')::uuid;
  v_start timestamptz := (payload->>'scheduled_start_at')::timestamptz;
  v_end timestamptz := coalesce(nullif(payload->>'scheduled_end_at','')::timestamptz,v_start+interval '90 minutes');
begin
  if not public.is_admin() then raise exception 'Admin required'; end if;
  if v_driver is not null then perform pg_advisory_xact_lock(hashtextextended(v_driver::text,0)); end if;
  if v_vehicle is not null then perform pg_advisory_xact_lock(hashtextextended(v_vehicle::text,1)); end if;
  if v_driver is not null and public.check_driver_conflict(v_driver,v_start,v_end,null) then raise exception 'Driver conflict'; end if;
  if v_vehicle is not null and public.check_vehicle_conflict(v_vehicle,v_start,v_end,null) then raise exception 'Vehicle conflict'; end if;
  insert into public.rides(service_type,status,passenger_id,customer_name,customer_email,customer_phone,pickup_name,pickup_address,destination_name,destination_address,scheduled_start_at,scheduled_end_at,passenger_count,luggage,flight_number,driver_id,vehicle_id,final_price,currency,payment_status,booking_source,special_requests)
  values((payload->>'service_type')::public.service_type,(case when v_driver is not null and v_vehicle is not null then 'driver_assigned' else 'confirmed' end)::public.ride_status,nullif(payload->>'passenger_id','')::uuid,payload->>'customer_name',lower(payload->>'customer_email'),payload->>'customer_phone',payload->>'pickup_name',payload->>'pickup_address',payload->>'destination_name',payload->>'destination_address',v_start,v_end,coalesce((payload->>'passenger_count')::smallint,1),payload->>'luggage',payload->>'flight_number',v_driver,v_vehicle,nullif(payload->>'final_price','')::numeric,upper(coalesce(payload->>'currency','CHF')),'unpaid',(payload->>'booking_source')::public.booking_source,payload->>'special_requests') returning id into v_id;
  insert into public.ride_activity(ride_id,actor_id,event_type,message) values(v_id,auth.uid(),'created','Journey created by dispatch');
  return v_id;
end; $$;

revoke all on function public.admin_create_ride(jsonb) from public;
grant execute on function public.admin_create_ride(jsonb) to authenticated;
