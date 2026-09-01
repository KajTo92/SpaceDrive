import { currentProfile, supabase } from "../../shared/supabase-client.js";
import { mapRide, rideSelect } from "../../shared/services/ride-mapper.js";
import { isClosedRideStatus } from "../../shared/ride-status.js";
const fail=e=>{if(e)throw e;};
let availabilityCache="offline";
export async function getDriverProfile(){const p=await currentProfile();if(!p)throw new Error("Authentication required");const{data,error}=await supabase.from("driver_profiles").select("*").eq("user_id",p.id).single();fail(error);availabilityCache=data.availability_status;return{id:p.id,name:`${p.first_name} ${p.last_name}`.trim(),shortName:p.first_name,photo:p.avatar_url,email:p.email,phone:p.phone,languages:data.languages,availability:data.availability_status,role:"Chauffeur"};}
export async function getDriverNotifications(){const{data,error}=await supabase.from("notifications").select("*").order("created_at",{ascending:false});fail(error);return(data||[]).map(n=>({id:n.id,title:n.title,body:n.message,createdAt:n.created_at,read:!!n.read_at,rideId:n.ride_id}));}
export async function getDriverRides(){const{data,error}=await supabase.from("rides").select(rideSelect).order("scheduled_start_at");fail(error);return(data||[]).map(mapRide);}
export async function getDriverCurrentRide(){return(await getDriverRides()).find(r=>!isClosedRideStatus(r.status))||null;}
export async function getDriverRideById(id){const{data,error}=await supabase.from("rides").select(rideSelect).eq("id",id).maybeSingle();fail(error);return mapRide(data);}
export async function getDriverSchedule(){return getDriverRides();}
export async function updateRideStatus(id,status){const{error}=await supabase.rpc("driver_update_ride_status",{ride_id:id,target_status:status});fail(error);return getDriverRideById(id);}
export function getDriverAvailability(){return availabilityCache;}
export async function updateDriverAvailability(status){if(!["available","busy","offline"].includes(status))throw new Error("Invalid driver availability");const p=await currentProfile();const{error}=await supabase.from("driver_profiles").update({availability_status:status}).eq("user_id",p.id);fail(error);availabilityCache=status;return status;}
export async function reportRideIssue({rideId,type,note="",waitingMinutes}){const p=await currentProfile();const{data,error}=await supabase.from("ride_notes").insert({ride_id:rideId,author_id:p.id,visibility:"internal_admin",note:`${type}: ${note}${waitingMinutes?` (${waitingMinutes} min)`:""}`}).select().single();fail(error);return data;}
export function subscribeToDriverRides(onChange){const c=supabase.channel("driver-rides").on("postgres_changes",{event:"UPDATE",schema:"public",table:"rides"},onChange).subscribe();return()=>supabase.removeChannel(c);}
