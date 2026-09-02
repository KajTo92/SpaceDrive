const location = (name, address, latitude, longitude) => ({ name: name || address || "", address: address || name || "", latitude, longitude });

export function mapRide(row) {
  if (!row) return null;
  const start = new Date(row.scheduled_start_at);
  const end = row.scheduled_end_at ? new Date(row.scheduled_end_at) : null;
  const driverProfile = row.driver;
  return {
    id: row.id,
    passengerId: row.passenger_id,
    passenger: row.passenger ? { id: row.passenger.id, name: `${row.passenger.first_name || ""} ${row.passenger.last_name || ""}`.trim() || row.customer_name, email: row.passenger.email, phone: row.passenger.phone } : { id: row.passenger_id, name: row.customer_name || "Guest passenger", email: row.customer_email, phone: row.customer_phone },
    pickup: location(row.pickup_name, row.pickup_address, row.pickup_latitude, row.pickup_longitude),
    destination: location(row.destination_name, row.destination_address, row.destination_latitude, row.destination_longitude),
    pickupDate: row.scheduled_start_at?.slice(0, 10),
    pickupTime: row.scheduled_start_at ? start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : "",
    estimatedEndAt: end?.toISOString(), passengers: row.passenger_count, luggage: row.luggage,
    flightNumber: row.flight_number, driverId: row.driver_id, vehicleId: row.vehicle_id,
    requestedVehicleId: row.requested_vehicle_id, requestedVehicle: row.requested_vehicle_class,
    driver: driverProfile ? { id: driverProfile.id, name: `${driverProfile.first_name || ""} ${driverProfile.last_name || ""}`.trim(), shortName: driverProfile.first_name || "", email: driverProfile.email, phone: driverProfile.phone, photo: driverProfile.avatar_url || "", languages: driverProfile.driver_profiles?.[0]?.languages || [], role: "Chauffeur", rating: null, completedTrips: 0 } : null,
    vehicle: row.vehicle ? { id: row.vehicle.id, brand: row.vehicle.brand, model: row.vehicle.model, year: row.vehicle.year, category: row.vehicle.category, plate: row.vehicle.plate, seats: row.vehicle.seat_capacity, luggageCapacity: row.vehicle.luggage_capacity, image: row.vehicle.image_url, status: row.vehicle.operational_status } : null,
    price: row.final_price ?? row.estimated_price, finalPrice: row.final_price, calculatedPrice: row.estimated_price,
    currency: row.currency, status: row.status, paymentStatus: row.payment_status, source: row.booking_source,
    serviceType: row.service_type, requestType: row.service_type, specialRequests: row.special_requests ? [row.special_requests] : [],
    createdAt: row.created_at, hourlyDetails: row.hourly_concierge_details?.[0] || row.hourly_concierge_details,
    tourDetails: row.city_tour_details?.[0] || row.city_tour_details,
    plannedStops: row.ride_stops || [], activity: (row.ride_activity || []).map((item) => ({ id: item.id, type: item.event_type, message: item.message, createdAt: item.created_at }))
  };
}

export const rideSelect = `*, passenger:profiles!rides_passenger_id_fkey(id,first_name,last_name,email,phone), driver:profiles!rides_driver_id_fkey(id,first_name,last_name,email,phone,avatar_url,driver_profiles(languages)), vehicle:vehicles!rides_vehicle_id_fkey(*), city_tour_details(*), hourly_concierge_details(*), ride_stops(*), ride_activity(*)`;
