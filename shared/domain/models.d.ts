export type RideStatus =
  | "request_received"
  | "under_review"
  | "offer_sent"
  | "confirmed"
  | "driver_assigned"
  | "driver_on_the_way"
  | "driver_arrived"
  | "passenger_onboard"
  | "completed"
  | "cancelled"
  | "declined";

export type RequestStatus =
  | "request_received"
  | "pending_review"
  | "under_review"
  | "offer_sent"
  | "awaiting_customer"
  | "awaiting_confirmation"
  | "confirmed"
  | "declined";

export type UserRole = "passenger" | "driver" | "admin";
export type DriverAvailabilityStatus = "available" | "busy" | "offline" | "unavailable";
export type VehicleStatus = "available" | "unavailable" | "service";
export type PaymentStatus = "unpaid" | "deposit_paid" | "paid" | "invoice" | "cash";
export type BookingSource = "website" | "phone" | "whatsapp" | "hotel" | "business" | "admin";
export type ServiceType = "transfer" | "city_tour" | "hourly_concierge";
export type ConciergePurpose = "business" | "dinner_evening" | "shopping" | "events" | "multiple_stops" | "airport_meetings" | "private_other";

export type Location = { name: string; address: string; latitude?: number; longitude?: number };

export type HourlyConciergeDetails = {
  durationHours: number;
  purpose: ConciergePurpose;
  plannedStops?: Location[];
  currentStop?: Location;
  hourlyRate: number;
  includedKilometers: number;
  bookingStartAt?: string;
  bookingEndAt?: string;
  extensionHours?: number;
};

export type DriverLocation = {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  updatedAt: string;
};

export type Vehicle = {
  id: string;
  brand: string;
  model: string;
  trim?: string;
  category: string;
  plate?: string;
  image?: string;
  year: number;
  seats: number;
  luggageCapacity?: string;
  status: VehicleStatus;
  serviceDate?: string;
  notes?: string;
};

export type Driver = {
  id: string;
  name: string;
  shortName?: string;
  role: string;
  photo?: string;
  rating?: number;
  completedTrips?: number;
  languages?: string[];
  phone?: string;
  email?: string;
  availability?: DriverAvailabilityStatus;
  preferredVehicleId?: string;
};

export type PassengerSummary = { id: string; name: string; email?: string; phone?: string };

export type FlightInfo = {
  flightNumber: string;
  airline?: string;
  scheduledArrival?: string;
  estimatedArrival?: string;
  terminal?: string;
  status?: string;
};

export type Ride = {
  id: string;
  passengerId: string;
  passenger?: PassengerSummary;
  pickup: Location;
  destination: Location;
  routeCoordinates: [number, number][];
  pickupDate: string;
  pickupTime: string;
  passengers: number;
  luggage?: string;
  estimatedDuration?: string;
  estimatedArrival?: string;
  distance?: string;
  completedAt?: string;
  vehicleId?: string;
  driverId?: string;
  vehicle?: Vehicle;
  driver?: Driver;
  driverLocation?: DriverLocation;
  price?: number;
  currency: string;
  status: RideStatus;
  flightNumber?: string;
  flight?: FlightInfo;
  preferences?: string[];
  specialRequests?: string[];
  notes?: string;
  internalNote?: string;
  driverNote?: string;
  passengerVisibleNote?: string;
  paymentStatus?: PaymentStatus;
  source?: BookingSource;
  estimatedEndAt?: string;
  serviceType?: ServiceType;
  hourlyDetails?: HourlyConciergeDetails;
  activity?: ActivityEvent[];
  createdAt: string;
};

export type ActivityEvent = { id: string; type: string; message: string; createdAt: string; actor?: string };

export type RideIssueType = "passenger_not_here" | "traffic_delay" | "pickup_issue" | "vehicle_problem" | "other";
export type RideIssue = { id: string; rideId: string; type: RideIssueType; note?: string; waitingMinutes?: 5 | 10 | 15; createdAt: string };

export type RideRequest = {
  id: string;
  pickup: Location;
  destination: Location;
  pickupDate: string;
  pickupTime: string;
  vehicle?: Vehicle;
  price?: number;
  currency: string;
  status: RequestStatus;
  passenger?: PassengerSummary;
  passengers?: number;
  luggage?: string;
  flightNumber?: string;
  specialRequests?: string[];
  calculatedPrice?: number;
  finalPrice?: number;
  priceNote?: string;
  source?: BookingSource;
  requestedVehicle?: string;
  requestedVehicleId?: string;
  plannedStops?: Location[];
  serviceType?: ServiceType;
  requestType?: ServiceType;
  tourDetails?: { region: string; durationHours: number; style: string };
  hourlyDetails?: HourlyConciergeDetails;
  activity?: ActivityEvent[];
  createdAt?: string;
};

export type SavedPlace = Location & { id: string };
export type JourneyPreferences = { atmosphere: "quiet" | "normal" | "chat"; temperature: number; music: "none" | "lounge" | "playlist"; water: "still" | "sparkling" | "no_preference"; airportNameSign: boolean };
export type Passenger = { id: string; firstName: string; lastName: string; email: string; phone?: string; savedPlaces: SavedPlace[]; preferences: JourneyPreferences };
export type PassengerNotification = { id: string; title: string; body: string; createdAt: string; read: boolean; rideId?: string };
export type DriverNotification = PassengerNotification & { priority?: "normal" | "important" };
