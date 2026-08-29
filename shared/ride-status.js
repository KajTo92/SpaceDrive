export const rideStatusLabels = Object.freeze({
  requested: "Requested",
  confirmed: "Confirmed",
  driver_assigned: "Driver assigned",
  driver_on_the_way: "Driver on the way",
  driver_arrived: "Driver arrived",
  passenger_onboard: "Passenger onboard",
  completed: "Completed",
  cancelled: "Cancelled",
  pending_review: "Pending review",
  offer_sent: "Offer sent",
  awaiting_confirmation: "Awaiting confirmation",
  declined: "Declined",
});

export const journeyStages = Object.freeze([
  ["requested", "Requested"],
  ["confirmed", "Confirmed"],
  ["driver_assigned", "Driver assigned"],
  ["driver_on_the_way", "On the way"],
  ["driver_arrived", "Arrived"],
  ["passenger_onboard", "Onboard"],
  ["completed", "Completed"],
]);

export const driverRideActions = Object.freeze({
  confirmed: { nextStatus: "driver_on_the_way", label: "Start driving to passenger", icon: "navigation" },
  driver_assigned: { nextStatus: "driver_on_the_way", label: "Start driving to passenger", icon: "navigation" },
  driver_on_the_way: { nextStatus: "driver_arrived", label: "I have arrived", icon: "map-pin-check" },
  driver_arrived: { nextStatus: "passenger_onboard", label: "Passenger on board", icon: "user-check" },
  passenger_onboard: { nextStatus: "completed", label: "Complete journey", icon: "check" },
});

export const statusLabel = (status) => rideStatusLabels[status] || String(status || "").replaceAll("_", " ");
export const getDriverRideAction = (status) => driverRideActions[status] || null;
export const isTrackingRideStatus = (status) => ["driver_on_the_way", "driver_arrived", "passenger_onboard"].includes(status);
export const isClosedRideStatus = (status) => ["completed", "cancelled"].includes(status);
