import { currentDriver, driverNotifications } from "../data/mock-driver.js?v=3";
import { getAllRides, getSharedRideById, updateSharedRideStatus } from "../../shared/services/ride-store.js?v=4";
import { isClosedRideStatus } from "../../shared/ride-status.js?v=2";

const AVAILABILITY_KEY = "spacedrive-driver-availability";
const ISSUES_KEY = "spacedrive-driver-issues";
const wait = (value, delay = 140) => new Promise((resolve) => window.setTimeout(() => resolve(typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value))), delay));

export const getDriverProfile = () => wait(currentDriver);
export const getDriverNotifications = () => wait(driverNotifications);

export function getDriverRides() {
  return wait(getAllRides().filter((ride) => ride.driver?.id === currentDriver.id));
}

export async function getDriverCurrentRide() {
  const rides = getAllRides().filter((ride) => ride.driver?.id === currentDriver.id);
  const preferred = rides.find((ride) => ride.id === "sd-240829" && !isClosedRideStatus(ride.status));
  return wait(preferred || rides.find((ride) => !isClosedRideStatus(ride.status)) || null);
}

export function getDriverRideById(id) {
  const ride = getSharedRideById(id);
  return wait(ride?.driver?.id === currentDriver.id ? ride : null);
}

export async function getDriverSchedule() {
  const rides = await getDriverRides();
  return rides.sort((a, b) => `${a.pickupDate}T${a.pickupTime}`.localeCompare(`${b.pickupDate}T${b.pickupTime}`));
}

export function updateRideStatus(id, status) {
  return wait(updateSharedRideStatus(id, status), 180);
}

export function getDriverAvailability() {
  return localStorage.getItem(AVAILABILITY_KEY) || currentDriver.availability;
}

export function updateDriverAvailability(status) {
  if (!["available", "busy", "offline"].includes(status)) throw new Error("Invalid driver availability");
  localStorage.setItem(AVAILABILITY_KEY, status);
  return wait(status, 100);
}

export function reportRideIssue({ rideId, type, note = "", waitingMinutes }) {
  const issue = { id: `issue-${Date.now()}`, rideId, type, note: note.trim(), waitingMinutes, createdAt: new Date().toISOString() };
  let issues = [];
  try { issues = JSON.parse(localStorage.getItem(ISSUES_KEY)) || []; } catch { issues = []; }
  issues.push(issue);
  localStorage.setItem(ISSUES_KEY, JSON.stringify(issues));
  return wait(issue, 160);
}
