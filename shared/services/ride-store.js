import { rides as seedRides } from "../../passenger/data/mock-passenger.js?v=5";

const STATUS_STORAGE_KEY = "spacedrive-ride-statuses-v2";
const clone = (value) => typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));

function getStoredStatuses() {
  try { return JSON.parse(localStorage.getItem(STATUS_STORAGE_KEY)) || {}; }
  catch { return {}; }
}

const withStoredStatus = (ride) => ({ ...ride, driverId: ride.driverId || ride.driver?.id, vehicleId: ride.vehicleId || ride.vehicle?.id, status: getStoredStatuses()[ride.id] || ride.status });

export const getAllRides = () => clone(seedRides.map(withStoredStatus));

export function getSharedRideById(id) {
  const ride = seedRides.find((item) => item.id === id);
  return ride ? clone(withStoredStatus(ride)) : null;
}

export function updateSharedRideStatus(id, status) {
  const ride = seedRides.find((item) => item.id === id);
  if (!ride) throw new Error("Ride not found");
  const statuses = getStoredStatuses();
  statuses[id] = status;
  localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(statuses));
  const updated = clone({ ...ride, status });
  window.dispatchEvent(new CustomEvent("spacedrive:ride-status", { detail: { id, status } }));
  return updated;
}

export function subscribeToRideStatus(listener) {
  const handler = (event) => listener(event.detail);
  window.addEventListener("spacedrive:ride-status", handler);
  return () => window.removeEventListener("spacedrive:ride-status", handler);
}
