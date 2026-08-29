import { assignedDriver, notifications, passenger, rideRequests } from "../data/mock-passenger.js?v=3";
import { getAllRides, getSharedRideById } from "../../shared/services/ride-store.js?v=4";

const wait = (value, delay = 180) => new Promise((resolve) => window.setTimeout(() => resolve(structuredClone(value)), delay));

export const getPassenger = () => wait(passenger);
export const getCurrentRide = () => wait(getSharedRideById("sd-240829"));
export const getPassengerTrips = () => wait(getAllRides().filter((ride) => ride.passengerId === passenger.id));
export const getRideById = (id) => wait(getAllRides().find((ride) => ride.id === id && ride.passengerId === passenger.id) || null);
export const getRideRequests = () => wait(rideRequests);
export const getAssignedDriver = () => wait(assignedDriver || null);
export const getNotifications = () => wait(notifications);

export function saveJourneyPreferences(preferences) {
  localStorage.setItem("spacedrive-passenger-preferences", JSON.stringify(preferences));
  return wait(preferences, 120);
}

export function getSavedJourneyPreferences(fallback) {
  try {
    return JSON.parse(localStorage.getItem("spacedrive-passenger-preferences")) || fallback;
  } catch {
    return fallback;
  }
}
