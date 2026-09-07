const inactiveStatuses = new Set(["completed", "cancelled", "declined"]);

export function rideDepartureTime(ride) {
  const value = `${ride?.pickupDate || ""}T${ride?.pickupTime || "00:00"}`;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

export function nearestUpcomingRide(rides, now = Date.now()) {
  return [...(rides || [])]
    .filter((ride) => !inactiveStatuses.has(ride.status) && rideDepartureTime(ride) >= now)
    .sort((a, b) => rideDepartureTime(a) - rideDepartureTime(b))[0] || null;
}
