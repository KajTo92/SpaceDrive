import { assignedDriver } from "../../passenger/data/mock-passenger.js?v=5";

export const currentDriver = {
  ...assignedDriver,
  email: "jan@spacedrive.ch",
  phone: "+41 79 506 71 42",
  preferredVehicleId: "veh-s",
  availability: "available",
  notificationsEnabled: true,
};

export const driverNotifications = [
  { id: "driver-note-1", title: "Pickup in 30 minutes", body: "Review the Zürich Airport pickup and passenger preferences.", createdAt: "2026-08-29T06:55:00Z", read: false, rideId: "sd-240829", priority: "important" },
  { id: "driver-note-2", title: "Passenger added a request", body: "A name sign is required at arrivals.", createdAt: "2026-08-28T18:20:00Z", read: false, rideId: "sd-240829" },
  { id: "driver-note-3", title: "Journey assigned", body: "St. Moritz to Zürich has been added to today's schedule.", createdAt: "2026-08-27T12:45:00Z", read: true, rideId: "sd-240829-2" },
  { id: "driver-note-4", title: "Flight LX123", body: "The flight is currently scheduled to arrive on time at Terminal 2.", createdAt: "2026-08-29T06:40:00Z", read: true, rideId: "sd-240829" },
];
