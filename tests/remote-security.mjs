import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const projectRef = "bzgkkwrnentbhrittkxa";
const url = `https://${projectRef}.supabase.co`;
const cli = fileURLToPath(new URL("../node_modules/.bin/supabase", import.meta.url));
const keys = JSON.parse(execFileSync(cli, ["projects", "api-keys", "--project-ref", projectRef, "--output", "json"], { encoding: "utf8" }));
const key = (name) => keys.find((item) => item.name === name || item.name === `${name}_key`)?.api_key;
const anonKey = key("anon") || key("publishable");
const serviceKey = key("service_role") || key("secret");
if (!anonKey || !serviceKey) throw new Error("Could not obtain project API keys from authenticated Supabase CLI.");

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const marker = `codex-security-${Date.now()}`;
const password = `T!${randomBytes(18).toString("base64url")}`;
const users = [];
const rideIds = [];
const results = [];
const report = (name) => { results.push(name); console.log(`PASS ${name}`); };

async function createUser(label) {
  const email = `${marker}-${label}@example.invalid`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { first_name: label, last_name: "Security Test", phone: "+41000000000" } });
  if (error) throw error;
  users.push(data.user.id);
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: loginData, error: loginError } = await client.auth.signInWithPassword({ email, password });
  if (loginError) throw loginError;
  await client.realtime.setAuth(loginData.session.access_token);
  return { id: data.user.id, email, client };
}

async function submit(client, user, serviceType, startOffsetHours = 24) {
  const start = new Date(Date.now() + startOffsetHours * 3600000);
  const details = serviceType === "city_tour" ? { region: "Zürich", tour_style: "private", duration_minutes: 240, custom_notes: marker }
    : serviceType === "hourly_concierge" ? { purpose: "business", duration_minutes: 180, hourly_rate_snapshot: 150, included_kilometers_snapshot: 60 } : undefined;
  const { data, error } = await client.rpc("submit_ride_request", { payload: { service_type: serviceType, scheduled_start_at: start.toISOString(), scheduled_end_at: new Date(start.getTime() + 90 * 60000).toISOString(), duration_minutes: 90, customer_name: "Security Test", customer_email: user.email, customer_phone: "+41000000000", pickup_name: "Test A", pickup_address: "Test A", destination_name: "Test B", destination_address: "Test B", passenger_count: 1, currency: "CHF", special_requests: marker, details } });
  if (error) throw error;
  rideIds.push(data);
  return data;
}

try {
  const [passengerA, passengerB, driverA, driverB, dispatch] = await Promise.all([createUser("passenger-a"), createUser("passenger-b"), createUser("driver-a"), createUser("driver-b"), createUser("admin")]);
  for (const driver of [driverA, driverB]) {
    const { error } = await admin.from("profiles").update({ role: "driver" }).eq("id", driver.id); if (error) throw error;
    const { error: profileError } = await admin.from("driver_profiles").upsert({ user_id: driver.id, availability_status: "available", languages: ["English"] }); if (profileError) throw profileError;
  }
  const { error: adminRoleError } = await admin.from("profiles").update({ role: "admin" }).eq("id", dispatch.id); if (adminRoleError) throw adminRoleError;

  const rideA = await submit(passengerA.client, passengerA, "transfer", 24);
  const rideB = await submit(passengerB.client, passengerB, "transfer", 48);
  const cityTour = await submit(passengerA.client, passengerA, "city_tour", 72);
  const hourly = await submit(passengerA.client, passengerA, "hourly_concierge", 96);
  report("Transfer, City Tour and Hourly Concierge create central rides");

  const { data: passengerARides, error: paError } = await passengerA.client.from("rides").select("id"); if (paError) throw paError;
  assert(passengerARides.some((r) => r.id === rideA)); assert(!passengerARides.some((r) => r.id === rideB)); report("cross-passenger SELECT blocked");

  const { error: promoteError } = await passengerA.client.from("profiles").update({ role: "admin" }).eq("id", passengerA.id);
  assert(promoteError); report("self role escalation blocked");

  const { error: applicationError } = await passengerA.client.rpc("submit_driver_application", { languages: ["English"], application_note: marker }); if (applicationError) throw applicationError;
  const { data: application } = await admin.from("driver_applications").select("id").eq("user_id", passengerA.id).single();
  const { error: approveSelfError } = await passengerA.client.from("driver_applications").update({ status: "approved" }).eq("id", application.id);
  assert(approveSelfError); report("driver application self-approval blocked");

  const { error: priceError } = await driverA.client.from("rides").update({ final_price: 1 }).eq("id", rideA); assert(priceError);
  const { error: assignError } = await passengerA.client.from("rides").update({ driver_id: driverA.id }).eq("id", rideA); assert(assignError); report("driver price and passenger assignment mutations blocked");

  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: anonReadError } = await anon.from("rides").select("id"); assert(anonReadError); report("anonymous rides SELECT blocked");

  const { error: offerError } = await dispatch.client.rpc("admin_send_offer", { ride_id: rideA, final_price: 420, note: marker }); if (offerError) throw offerError;
  const { error: acceptError } = await passengerA.client.rpc("passenger_accept_offer", { ride_id: rideA }); if (acceptError) throw acceptError;
  const { data: fleet, error: fleetError } = await dispatch.client.from("vehicles").select("id").limit(1).single(); if (fleetError) throw fleetError;
  const { error: assignmentError } = await dispatch.client.rpc("admin_assign_ride", { p_ride: rideA, p_driver: driverA.id, p_vehicle: fleet.id }); if (assignmentError) throw assignmentError;

  const { data: driverARides, error: daError } = await driverA.client.from("rides").select("id"); if (daError) throw daError;
  assert(driverARides.some((r) => r.id === rideA)); assert(!driverARides.some((r) => r.id === rideB)); report("cross-driver SELECT blocked");

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Realtime ride status event timed out")), 12000);
    const channel = passengerA.client.channel(`ride-status-${marker}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "rides", filter: `id=eq.${rideA}` }, async (payload) => {
      if (payload.new.status !== "driver_on_the_way") return;
      clearTimeout(timer);
      await passengerA.client.removeChannel(channel);
      resolve();
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        const { error } = await driverA.client.rpc("driver_update_ride_status", { ride_id: rideA, target_status: "driver_on_the_way" });
        if (error) reject(error);
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(new Error(`Realtime channel ${status}`));
    });
  });
  report("Passenger receives realtime ride status update");

  for (const status of ["driver_arrived", "passenger_onboard", "completed"]) {
    const { error } = await driverA.client.rpc("driver_update_ride_status", { ride_id: rideA, target_status: status }); if (error) throw error;
  }
  const { data: completed, error: completedError } = await passengerA.client.from("rides").select("status,final_price,driver_id,vehicle_id").eq("id", rideA).single(); if (completedError) throw completedError;
  assert.equal(completed.status, "completed"); assert.equal(completed.final_price, 420); report("offer, accept, assignment and driver lifecycle complete");

  const { data: cityDetail } = await admin.from("city_tour_details").select("ride_id").eq("ride_id", cityTour).single(); assert.equal(cityDetail.ride_id, cityTour);
  const { data: hourlyDetail } = await admin.from("hourly_concierge_details").select("ride_id").eq("ride_id", hourly).single(); assert.equal(hourlyDetail.ride_id, hourly); report("service detail snapshots persisted");
} finally {
  if (rideIds.length) await admin.from("rides").delete().in("id", rideIds);
  for (const id of users) await admin.auth.admin.deleteUser(id);
  console.log(`CLEANUP ${rideIds.length} rides and ${users.length} temporary users removed`);
}

console.log(`REMOTE SECURITY: ${results.length} checks passed`);
