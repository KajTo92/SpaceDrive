import {
  getAssignedDriver,
  getCurrentRide,
  getNotifications,
  getPassenger,
  getPassengerTrips,
  getRideById,
  getRideRequests,
  getSavedJourneyPreferences,
  saveJourneyPreferences,
} from "./services/passenger-service.js?v=4";
import {
  DriverCard,
  EmptyState,
  ErrorState,
  JourneyStatus,
  LoadingSkeleton,
  NextJourneyCard,
  PassengerLayout,
  RideCard,
  RideRequestCard,
  VehicleCard,
  assetUrl,
  formatDate,
  money,
  passengerUrl,
  setPassengerRoot,
  statusLabel,
  tripUrl,
} from "./components/passenger-components.js?v=6";
import { LiveTripMap } from "./components/live-trip-map.js?v=5";

const app = document.querySelector("#passengerApp");
const page = document.body.dataset.page || "home";
const root = document.body.dataset.root || "../";
setPassengerRoot(root);

function refreshIcons() {
  globalThis.lucide?.createIcons({ attrs: { "stroke-width": 1.65 } });
}

function toast(message) {
  document.querySelector(".passenger-toast")?.remove();
  const node = document.createElement("div");
  node.className = "passenger-toast";
  node.setAttribute("role", "status");
  node.textContent = message;
  document.body.append(node);
  requestAnimationFrame(() => node.classList.add("is-visible"));
  window.setTimeout(() => node.remove(), 2800);
}

function bindSharedInteractions() {
  const center = document.querySelector("[data-notification-center]");
  const trigger = document.querySelector("[data-notification-trigger]");
  const scrim = document.querySelector(".notification-scrim");
  const setNotificationsOpen = (open) => {
    center?.classList.toggle("is-open", open);
    center?.setAttribute("aria-hidden", String(!open));
    trigger?.setAttribute("aria-expanded", String(open));
    if (scrim) scrim.hidden = !open;
    if (open) center?.querySelector("button")?.focus();
  };
  trigger?.addEventListener("click", () => setNotificationsOpen(true));
  document.querySelectorAll("[data-notification-close]").forEach((item) => item.addEventListener("click", () => setNotificationsOpen(false)));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setNotificationsOpen(false);
  });
  document.querySelectorAll("[data-demo-action]").forEach((button) => button.addEventListener("click", () => toast(`${button.dataset.demoAction} is ready for backend connection.`)));
  refreshIcons();
}

async function withLayout({ active, title, subtitle, content }) {
  const notifications = await getNotifications();
  app.innerHTML = PassengerLayout({ active, title, subtitle, notifications, content });
  bindSharedInteractions();
}

async function mountMaps(rides) {
  const items = Array.isArray(rides) ? rides : [rides];
  for (const container of document.querySelectorAll("[data-live-map]")) {
    const ride = items.find((item) => item?.id === container.dataset.rideId);
    if (ride) await LiveTripMap(container, ride);
  }
}

async function renderDashboard() {
  const [currentRide, trips, driver] = await Promise.all([getCurrentRide(), getPassengerTrips(), getAssignedDriver()]);
  if (!currentRide) {
    await withLayout({ active: "home", title: "Good evening, Alex.", subtitle: "Passenger portal", content: EmptyState("No upcoming journeys", "Your next journey starts here.", "calendar-days") });
    return;
  }
  const upcoming = trips.filter((ride) => ride.id !== currentRide.id && !["completed", "cancelled"].includes(ride.status));
  const content = `
    <div class="dashboard-heading"><div><p>Good evening, Alex.</p><h2>Your private travel, arranged.</h2></div><time>${formatDate("2026-08-28", { weekday: "long", day: "numeric", month: "long" })}</time></div>
    ${NextJourneyCard(currentRide)}
    <section class="dashboard-lower">
      <div class="upcoming-section"><header class="section-heading"><h2>Upcoming journeys</h2><a href="${passengerUrl("trips/")}">View all</a></header><div class="upcoming-list">${upcoming.length ? upcoming.map((ride) => RideCard(ride)).join("") : EmptyState("No upcoming journeys", "Your next journey starts here.")}</div></div>
      <div class="dashboard-driver">${DriverCard(driver)}</div>
    </section>`;
  await withLayout({ active: "home", title: "Home", subtitle: "Passenger portal", content });
  await mountMaps(currentRide);
}

async function renderTrips() {
  const trips = await getPassengerTrips();
  const upcoming = trips.filter((ride) => !["completed", "cancelled"].includes(ride.status));
  const completed = trips.filter((ride) => ride.status === "completed");
  const content = `
    <section class="page-heading"><p>Your journeys</p><h2>My trips</h2><span>Every confirmed and completed Space Drive journey in one place.</span></section>
    <div class="segmented-control" role="tablist" aria-label="Trip filter"><button class="is-active" type="button" role="tab" aria-selected="true" data-trip-filter="upcoming">Upcoming <span>${upcoming.length}</span></button><button type="button" role="tab" aria-selected="false" data-trip-filter="completed">Completed <span>${completed.length}</span></button></div>
    <section class="trip-list" data-trip-panel="upcoming">${upcoming.length ? upcoming.map((ride) => RideCard(ride)).join("") : EmptyState("No upcoming journeys", "Your next journey starts here.")}</section>
    <section class="trip-list" data-trip-panel="completed" hidden>${completed.length ? completed.map((ride) => RideCard(ride, true)).join("") : EmptyState("No completed journeys", "Completed rides will be saved here.", "check")}</section>`;
  await withLayout({ active: "trips", title: "Trips", subtitle: "Journey history", content });
  document.querySelectorAll("[data-trip-filter]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-trip-filter]").forEach((item) => { const active = item === button; item.classList.toggle("is-active", active); item.setAttribute("aria-selected", String(active)); });
    document.querySelectorAll("[data-trip-panel]").forEach((panel) => { panel.hidden = panel.dataset.tripPanel !== button.dataset.tripFilter; });
  }));
}

function detailsList(ride) {
  const rows = [
    ["Flight", ride.flightNumber || "Not provided"],
    ["Passengers", String(ride.passengers)],
    ["Luggage", ride.luggage || "Not provided"],
    ["Preferences", ride.preferences?.join(", ") || "No preferences"],
    ["Special requests", ride.specialRequests?.join(", ") || "None"],
  ];
  return rows.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
}

function cancellationModal(ride) {
  return `<div class="modal-backdrop" data-modal-backdrop hidden><div class="confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="cancelTitle"><button class="icon-button modal-close" type="button" aria-label="Close dialog" data-modal-close><i data-lucide="x"></i></button><span>Journey ${ride.id.toUpperCase()}</span><h2 id="cancelTitle">Cancel this journey?</h2><p>This demo will not change your booking. A connected version will show the cancellation policy before confirmation.</p><div><button class="passenger-button" type="button" data-modal-close>Keep journey</button><button class="passenger-button passenger-button--danger" type="button" data-confirm-cancel>Cancel journey</button></div></div></div>`;
}

async function renderTripDetails() {
  const rideId = new URLSearchParams(location.search).get("id");
  const ride = rideId ? await getRideById(rideId) : null;
  if (!ride) {
    await withLayout({ active: "trips", title: "Trip details", subtitle: "Journey not found", content: ErrorState("We could not find this journey", "The trip ID is invalid or the journey is no longer available.") });
    return;
  }
  const content = `
    <a class="back-link" href="${passengerUrl("trips/")}"><i data-lucide="arrow-left"></i> Back to trips</a>
    <section class="trip-hero"><div><span>${formatDate(ride.pickupDate, { weekday: "long", day: "numeric", month: "long" })} at ${ride.pickupTime}</span><h2>${ride.pickup.name}<i data-lucide="arrow-right"></i>${ride.destination.name}</h2></div><div><span class="status-badge status-badge--${ride.status}">${statusLabel(ride.status)}</span><strong>${money(ride)}</strong></div></section>
    <section class="detail-status"><header class="section-heading"><h2>Journey status</h2><span>${statusLabel(ride.status)}</span></header>${JourneyStatus(ride.status)}</section>
    <section class="detail-map"><div class="live-trip-map" data-live-map data-ride-id="${ride.id}"></div></section>
    <section class="detail-pair">${DriverCard(ride.driver)}${VehicleCard(ride.vehicle)}</section>
    <section class="trip-information"><div><span>Journey details</span><h2>Everything arranged for you.</h2></div><div class="trip-information__list">${detailsList(ride)}</div></section>
    <section class="trip-action-bar"><button class="passenger-button passenger-button--primary" type="button" data-demo-action="Contact driver">Contact driver</button><button class="passenger-button" type="button" data-demo-action="Modify journey">Modify journey</button><button class="passenger-button" type="button" data-demo-action="Share journey">Share journey</button><button class="passenger-button passenger-button--danger-quiet" type="button" data-cancel-journey>Cancel journey</button></section>
    ${cancellationModal(ride)}`;
  await withLayout({ active: "trips", title: "Trip details", subtitle: ride.id.toUpperCase(), content });
  await mountMaps(ride);
  const modal = document.querySelector("[data-modal-backdrop]");
  const openModal = () => { modal.hidden = false; modal.querySelector("[data-modal-close]").focus(); };
  const closeModal = () => { modal.hidden = true; document.querySelector("[data-cancel-journey]").focus(); };
  document.querySelector("[data-cancel-journey]")?.addEventListener("click", openModal);
  modal?.querySelectorAll("[data-modal-close]").forEach((button) => button.addEventListener("click", closeModal));
  modal?.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
  modal?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
      return;
    }
    if (event.key === "Tab") {
      const controls = [...modal.querySelectorAll("button:not([disabled]),a[href]")];
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  modal?.querySelector("[data-confirm-cancel]")?.addEventListener("click", () => { closeModal(); toast("Cancellation is a demo action. Your journey remains confirmed."); });
}

async function renderRequests() {
  const requests = await getRideRequests();
  const content = `<section class="page-heading"><p>Concierge requests</p><h2>Ride requests</h2><span>Review offers and refine journeys before they become confirmed trips.</span></section><section class="request-list">${requests.length ? requests.map(RideRequestCard).join("") : EmptyState("No active ride requests", "You do not have any pending requests.", "send")}</section>`;
  await withLayout({ active: "requests", title: "Requests", subtitle: "Private concierge", content });
}

async function renderDriver() {
  const driver = await getAssignedDriver();
  const content = `<section class="page-heading"><p>Your assigned chauffeur</p><h2>My driver</h2><span>Meet the professional responsible for your next journey.</span></section>${driver ? `<section class="driver-profile">${DriverCard(driver, true)}${VehicleCard(driver.vehicle, true)}</section><section class="driver-service-note"><i data-lucide="shield-check"></i><div><h2>Space Drive standard</h2><p>Every chauffeur is selected for discretion, local expertise and attentive private service.</p></div></section>` : EmptyState("No driver assigned", "Your chauffeur profile will appear as soon as a driver is confirmed.", "user-round")}`;
  await withLayout({ active: "driver", title: "Driver", subtitle: "Your chauffeur", content });
}

function preferenceOption(name, value, label, current) {
  return `<label class="preference-choice"><input type="radio" name="${name}" value="${value}"${current === value ? " checked" : ""}><span>${label}</span></label>`;
}

function preferencesMarkup(preferences) {
  return `<form class="preferences-form" data-preferences-form><section><header><i data-lucide="volume-x"></i><div><h3>Ride atmosphere</h3><p>Choose how you prefer to travel.</p></div></header><div class="choice-row">${preferenceOption("atmosphere", "quiet", "Quiet ride", preferences.atmosphere)}${preferenceOption("atmosphere", "normal", "Normal", preferences.atmosphere)}${preferenceOption("atmosphere", "chat", "Happy to chat", preferences.atmosphere)}</div></section><section><header><i data-lucide="thermometer"></i><div><h3>Temperature</h3><p><output data-temperature-output>${preferences.temperature}°C</output></p></div></header><input class="temperature-range" type="range" name="temperature" min="18" max="24" value="${preferences.temperature}" aria-label="Preferred temperature"></section><section><header><i data-lucide="music-2"></i><div><h3>Music</h3><p>Your preferred cabin soundtrack.</p></div></header><div class="choice-row">${preferenceOption("music", "none", "No music", preferences.music)}${preferenceOption("music", "lounge", "Lounge", preferences.music)}${preferenceOption("music", "playlist", "My playlist", preferences.music)}</div></section><section><header><i data-lucide="glass-water"></i><div><h3>Water</h3><p>Prepared before pickup.</p></div></header><div class="choice-row">${preferenceOption("water", "still", "Still", preferences.water)}${preferenceOption("water", "sparkling", "Sparkling", preferences.water)}${preferenceOption("water", "no_preference", "No preference", preferences.water)}</div></section><section class="preference-toggle"><header><i data-lucide="badge-check"></i><div><h3>Airport pickup</h3><p>Driver waiting with a name sign.</p></div></header><label class="switch"><input type="checkbox" name="airportNameSign"${preferences.airportNameSign ? " checked" : ""}><span></span></label></section><button class="passenger-button passenger-button--primary preferences-save" type="submit">Save preferences</button></form>`;
}

async function renderProfile() {
  const passenger = await getPassenger();
  const preferences = getSavedJourneyPreferences(passenger.preferences);
  const content = `
    <section class="profile-heading"><div class="profile-avatar">AM</div><div><p>Passenger profile</p><h2>${passenger.firstName} ${passenger.lastName}</h2><span>${passenger.email}</span></div></section>
    <section class="profile-grid"><article class="profile-section"><header><h2>Personal information</h2><button type="button" data-demo-action="Edit profile">Edit</button></header><div class="profile-values"><div><span>Full name</span><strong>${passenger.firstName} ${passenger.lastName}</strong></div><div><span>Email</span><strong>${passenger.email}</strong></div><div><span>Telephone</span><strong>Not added</strong></div></div></article><article class="profile-section saved-places"><header><h2>Saved places</h2><button type="button" data-demo-action="Add place">Add place</button></header>${passenger.savedPlaces.map((place) => `<div><i data-lucide="${place.name === "Home" ? "house" : "briefcase-business"}"></i><span><strong>${place.name}</strong><small>${place.address}</small></span><button type="button" aria-label="Edit ${place.name}" data-demo-action="Edit place"><i data-lucide="pencil"></i></button></div>`).join("")}</article></section>
    <section class="preferences-section"><div class="section-heading section-heading--stack"><h2>Journey preferences</h2><p>Saved locally for this demo. These settings are ready to move to a passenger profile API.</p></div>${preferencesMarkup(preferences)}</section>
    <section class="profile-grid profile-grid--settings"><article class="profile-section"><header><h2>Notifications</h2></header><label class="setting-row"><span><strong>Journey updates</strong><small>Driver and booking status</small></span><span class="switch"><input type="checkbox" checked><span></span></span></label><label class="setting-row"><span><strong>New offers</strong><small>Ride request proposals</small></span><span class="switch"><input type="checkbox" checked><span></span></span></label></article><article class="profile-section"><header><h2>Security</h2></header><div class="security-summary"><i data-lucide="shield-check"></i><div><strong>Account protection</strong><p>Authentication and magic link settings will be connected with the backend.</p></div></div><button class="passenger-button" type="button" data-demo-action="Security settings">Security settings</button></article></section>`;
  await withLayout({ active: "profile", title: "Profile", subtitle: "Personal settings", content });
  const form = document.querySelector("[data-preferences-form]");
  const range = form.querySelector("[name=temperature]");
  range.addEventListener("input", () => { form.querySelector("[data-temperature-output]").textContent = `${range.value}°C`; });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    await saveJourneyPreferences({ atmosphere: data.get("atmosphere"), temperature: Number(data.get("temperature")), music: data.get("music"), water: data.get("water"), airportNameSign: data.get("airportNameSign") === "on" });
    toast("Journey preferences saved on this device.");
  });
}

async function render() {
  app.innerHTML = LoadingSkeleton(page);
  try {
    const renderers = { home: renderDashboard, trips: renderTrips, "trip-detail": renderTripDetails, requests: renderRequests, driver: renderDriver, profile: renderProfile };
    await (renderers[page] || renderDashboard)();
  } catch (error) {
    console.error(error);
    app.innerHTML = ErrorState("Passenger portal is unavailable", "We could not load your journey data. Please try again.");
    refreshIcons();
  }
}

render();
