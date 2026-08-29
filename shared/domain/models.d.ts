export type RideStatus =
  | "requested"
  | "confirmed"
  | "driver_assigned"
  | "driver_on_the_way"
  | "driver_arrived"
  | "passenger_onboard"
  | "completed"
  | "cancelled";

export type RequestStatus =
  | "pending_review"
  | "offer_sent"
  | "awaiting_confirmation"
  | "confirmed"
  | "declined";

export type UserRole = "passenger" | "driver" | "admin";
export type DriverAvailabilityStatus = "available" | "busy" | "offline";

export type Location = { name: string; address: string; latitude: number; longitude: number };

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
  vehicle?: Vehicle;
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
  createdAt: string;
};

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
};

export type SavedPlace = Location & { id: string };
export type JourneyPreferences = { atmosphere: "quiet" | "normal" | "chat"; temperature: number; music: "none" | "lounge" | "playlist"; water: "still" | "sparkling" | "no_preference"; airportNameSign: boolean };
export type Passenger = { id: string; firstName: string; lastName: string; email: string; phone?: string; savedPlaces: SavedPlace[]; preferences: JourneyPreferences };
export type PassengerNotification = { id: string; title: string; body: string; createdAt: string; read: boolean; rideId?: string };
export type DriverNotification = PassengerNotification & { priority?: "normal" | "important" };
