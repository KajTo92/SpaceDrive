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
