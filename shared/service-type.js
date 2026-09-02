const serviceTypes = {
  transfer: { label: "Simple Transfer", icon: "route" },
  city_tour: { label: "City Tour", icon: "map" },
  hourly_concierge: { label: "Hourly Concierge", icon: "clock-3" },
};

export function serviceType(ride = {}) {
  const key = ride.serviceType || ride.requestType || "transfer";
  return { key, ...(serviceTypes[key] || serviceTypes.transfer) };
}

export const serviceTypeLabel = (ride) => serviceType(ride).label;

export function journeyRoute(ride = {}) {
  if (serviceType(ride).key === "city_tour") {
    return { single: ride.tourDetails?.region || ride.pickup?.name || ride.destination?.name || "City Tour" };
  }
  return { pickup: ride.pickup?.name || "Pickup", destination: ride.destination?.name || "Destination" };
}
