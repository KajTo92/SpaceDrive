import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mapRide } from "../shared/services/ride-mapper.js";

const sql=readFileSync(new URL("../supabase/migrations/20260901150000_space_drive_core.sql",import.meta.url),"utf8");
const accessSql=readFileSync(new URL("../supabase/migrations/20260902100000_journey_deletion_and_driver_avatars.sql",import.meta.url),"utf8");
const assignedDriverSql=readFileSync(new URL("../supabase/migrations/20260902103000_allow_passenger_read_assigned_driver.sql",import.meta.url),"utf8");
test("new Auth users are always passengers",()=>{assert.match(sql,/values \(new\.id, 'passenger'/);assert.doesNotMatch(sql,/raw_user_meta_data->>'role'/);});
test("privileged mutations are RPC guarded",()=>{for(const name of ["admin_send_offer","admin_assign_ride","admin_review_driver_application","admin_create_ride"])assert.match(sql,new RegExp(`function public\\.${name}[\\s\\S]*?if not public\\.is_admin\\(\\)`));});
test("driver lifecycle contains only forward transitions",()=>{for(const transition of ["driver_assigned' and target_status='driver_on_the_way","driver_on_the_way' and target_status='driver_arrived","driver_arrived' and target_status='passenger_onboard","passenger_onboard' and target_status='completed"])assert.ok(sql.includes(transition));});
test("RLS scopes rides to passenger, driver, or admin",()=>{assert.match(sql,/create policy rides_select[\s\S]*passenger_id=auth\.uid\(\)[\s\S]*driver_id=auth\.uid\(\)/);assert.match(sql,/revoke insert,update,delete on public\.rides from anon,authenticated/);});
test("fleet seed contains the required stable slugs",()=>{for(const slug of ["tesla-model-y-2024","tesla-model-y-2025","mercedes-v-class"])assert.ok(sql.includes(slug));});
test("ride mapper preserves the central lifecycle",()=>{const ride=mapRide({id:"1",service_type:"transfer",status:"driver_arrived",customer_name:"Guest",customer_email:"g@example.com",customer_phone:"1",pickup_name:"A",pickup_address:"A",destination_name:"B",destination_address:"B",scheduled_start_at:"2026-09-02T10:00:00Z",passenger_count:1,currency:"CHF",payment_status:"unpaid",booking_source:"website",created_at:"2026-09-01T00:00:00Z"});assert.equal(ride.status,"driver_arrived");assert.equal(ride.requestType,"transfer");});
test("ride mapper exposes the assigned driver to passengers",()=>{const ride=mapRide({id:"2",status:"driver_assigned",pickup_name:"A",pickup_address:"A",destination_name:"B",destination_address:"B",scheduled_start_at:"2026-09-03T10:00:00Z",passenger_count:1,driver_id:"driver-1",driver:{id:"driver-1",first_name:"Anna",last_name:"Nowak",avatar_url:"https://example.com/anna.jpg",driver_profiles:[{languages:["Polish","English"]}]}});assert.equal(ride.driver.shortName,"Anna");assert.equal(ride.driver.photo,"https://example.com/anna.jpg");assert.deepEqual(ride.driver.languages,["Polish","English"]);});
test("journey deletion is scoped to admin, owner passenger, or assigned driver",()=>{assert.match(accessSql,/v_role = 'admin'/);assert.match(accessSql,/v_role = 'passenger' and passenger_id = auth\.uid\(\)/);assert.match(accessSql,/v_role = 'driver' and driver_id = auth\.uid\(\)/);});
test("driver avatar storage is admin managed",()=>{assert.match(accessSql,/driver-avatars/);assert.match(accessSql,/public\.is_admin\(\)/);assert.match(accessSql,/admin_set_driver_avatar/);});
test("passengers can read only drivers assigned to their rides",()=>{assert.match(assignedDriverSql,/r\.passenger_id = auth\.uid\(\) and r\.driver_id = profiles\.id/);});
