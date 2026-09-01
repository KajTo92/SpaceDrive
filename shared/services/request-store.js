const PASSENGER_REQUESTS_KEY = "spacedrive-passenger-requests-v1";

function readRequests() {
  try { return JSON.parse(localStorage.getItem(PASSENGER_REQUESTS_KEY)) || []; }
  catch { return []; }
}

export function submitPassengerRideRequest(input) {
  const requestType = input.requestType || input.serviceType || "transfer";
  const requestLabels = { city_tour: "City Tour", hourly_concierge: "Hourly Concierge", transfer: "Transfer" };
  const request = {
    id: `request-passenger-${Date.now()}`,
    passengerId: "passenger-alex",
    passenger: { id: "passenger-alex", name: "Alex Müller", email: "alex.mueller@example.com" },
    currency: "CHF",
    status: "request_received",
    source: requestType === "city_tour" ? "city_tour" : "website",
    createdAt: new Date().toISOString(),
    activity: [{ id: `activity-${Date.now()}`, type: "request_received", message: `${requestLabels[requestType] || "Journey"} request received from Passenger Portal`, createdAt: new Date().toISOString(), actor: "Alex Müller" }],
    ...input,
    requestType,
    serviceType: input.serviceType || requestType,
  };
  const requests = readRequests();
  requests.unshift(request);
  localStorage.setItem(PASSENGER_REQUESTS_KEY, JSON.stringify(requests));
  window.dispatchEvent(new CustomEvent("spacedrive:passenger-request", { detail: request }));
  return request;
}

export const getPassengerSubmittedRequests = () => readRequests();
