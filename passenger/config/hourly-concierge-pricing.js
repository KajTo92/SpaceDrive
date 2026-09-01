import { SPACE_DRIVE_FLEET, fleetVehicleName, getFleetVehicle } from "../../shared/config/fleet.js?v=1";

export const HOURLY_CONCIERGE_MIN_HOURS = 3;
export const HOURLY_CONCIERGE_MAX_HOURS = 12;
export const INCLUDED_KILOMETERS_PER_HOUR = 25;

export const HOURLY_CONCIERGE_PRICING = Object.freeze({
  "vehicle-model-y-2024": 90,
  "vehicle-model-y-2025": 105,
  "vehicle-v-class": 120,
});

export const HOURLY_CONCIERGE_VEHICLES = Object.freeze(SPACE_DRIVE_FLEET.map((vehicle) => Object.freeze({
  ...vehicle,
  name: fleetVehicleName(vehicle),
  hourlyRate: HOURLY_CONCIERGE_PRICING[vehicle.id],
})));

export function calculateIncludedKilometers(durationHours) {
  const duration = Number(durationHours);
  return Number.isFinite(duration) && duration >= HOURLY_CONCIERGE_MIN_HOURS && duration <= HOURLY_CONCIERGE_MAX_HOURS
    ? duration * INCLUDED_KILOMETERS_PER_HOUR
    : null;
}

export function calculateHourlyConciergePrice(vehicleId, durationHours) {
  const vehicle = getFleetVehicle(vehicleId);
  const hourlyRate = HOURLY_CONCIERGE_PRICING[vehicleId];
  const duration = Number(durationHours);
  if (!vehicle || !hourlyRate || !Number.isFinite(duration) || duration < HOURLY_CONCIERGE_MIN_HOURS || duration > HOURLY_CONCIERGE_MAX_HOURS) return null;
  return {
    vehicle,
    vehicleName: fleetVehicleName(vehicle),
    hourlyRate,
    durationHours: duration,
    includedKilometers: calculateIncludedKilometers(duration),
    total: Math.round(hourlyRate * duration),
    currency: "CHF",
  };
}
