import {
  getAssignedDriver,
  getCurrentRide,
  getNotifications,
  getPassenger,
  getPassengerTrips,
  getRideById,
  getSavedJourneyPreferences,
  createRideRequest,
  saveJourneyPreferences,
  subscribeToPassengerRides,
  acceptOffer,
  deleteJourney,
} from "./services/passenger-service.js?v=8";
import "./config.js";
import { requireRole, signOut } from "../shared/supabase-client.js";
import {
  DriverCard,
  EmptyState,
  ErrorState,
  JourneyStatus,
  LoadingSkeleton,
  NextJourneyCard,
  PassengerLayout,
  RideCard,
  VehicleCard,
  assetUrl,
  formatDate,
  money,
  passengerUrl,
  setPassengerRoot,
  statusLabel,
  tripUrl,
} from "./components/passenger-components.js?v=7";
import { LiveTripMap } from "./components/live-trip-map.js?v=5";
import {
  CITY_TOUR_MAX_HOURS,
  CITY_TOUR_MIN_HOURS,
  CITY_TOUR_PRICING,
  calculateCityTourPrice,
} from "./config/city-tour-pricing.js?v=1";
import {
  HOURLY_CONCIERGE_MAX_HOURS,
  HOURLY_CONCIERGE_MIN_HOURS,
  HOURLY_CONCIERGE_VEHICLES,
  calculateHourlyConciergePrice,
} from "./config/hourly-concierge-pricing.js?v=1";

const app = document.querySelector("#passengerApp");
const page = document.body.dataset.page || "home";
const root = document.body.dataset.root || "../";
setPassengerRoot(root);
await requireRole(["passenger", "admin"], `${root}login.html`);

function refreshIcons() {
  globalThis.lucide?.createIcons({ attrs: { "stroke-width": 1.65 } });
}

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);

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
  const accountTrigger = document.querySelector("[data-account-trigger]");
  const accountMenu = document.querySelector("[data-account-menu]");
  const setAccountMenu = (open) => { if (!accountMenu) return; accountMenu.hidden = !open; accountTrigger?.setAttribute("aria-expanded", String(open)); };
  accountTrigger?.addEventListener("click", (event) => { event.stopPropagation(); setAccountMenu(accountMenu.hidden); });
  document.querySelector("[data-account-signout]")?.addEventListener("click", signOut);
  document.addEventListener("click", (event) => { if (!event.target.closest(".account-menu-wrap")) setAccountMenu(false); });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { setNotificationsOpen(false); setAccountMenu(false); }
  });
  document.querySelectorAll("[data-demo-action]").forEach((button) => button.addEventListener("click", () => toast(`${button.dataset.demoAction} is ready for backend connection.`)));
  refreshIcons();
}

async function withLayout({ active, title, subtitle, content }) {
  const [notifications, passenger] = await Promise.all([getNotifications(), getPassenger()]);
  app.innerHTML = PassengerLayout({ active, title, subtitle, passenger, notifications, content });
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
  const [currentRide, trips, driver, passenger] = await Promise.all([getCurrentRide(), getPassengerTrips(), getAssignedDriver(), getPassenger()]);
  if (!currentRide) {
    await withLayout({ active: "home", title: `Welcome, ${passenger.firstName}.`, subtitle: "Passenger portal", content: EmptyState("No upcoming journeys", "Your next journey starts here.", "calendar-days") });
    return;
  }
  const upcoming = trips.filter((ride) => ride.id !== currentRide.id && !["completed", "cancelled"].includes(ride.status));
  const content = `
    <div class="dashboard-heading"><div><p>Welcome, ${passenger.firstName}.</p><h2>Your private travel, arranged.</h2></div><time>${formatDate(new Date().toISOString().slice(0,10), { weekday: "long", day: "numeric", month: "long" })}</time></div>
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

function deletionModal(ride) {
  return `<div class="modal-backdrop" data-modal-backdrop hidden><div class="confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="deleteTitle"><button class="icon-button modal-close" type="button" aria-label="Close dialog" data-modal-close><i data-lucide="x"></i></button><span>Journey ${ride.id.toUpperCase()}</span><h2 id="deleteTitle">Delete this journey?</h2><p>This permanently removes the journey and its related updates. This action cannot be undone.</p><div><button class="passenger-button" type="button" data-modal-close>Keep journey</button><button class="passenger-button passenger-button--danger" type="button" data-confirm-delete>Delete journey</button></div></div></div>`;
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
    <section class="trip-action-bar">${ride.status === "offer_sent" ? `<button class="passenger-button passenger-button--primary" type="button" data-accept-offer>Accept offer</button>` : ""}<button class="passenger-button" type="button" data-demo-action="Contact driver">Contact driver</button><button class="passenger-button" type="button" data-demo-action="Modify journey">Modify journey</button><button class="passenger-button passenger-button--danger-quiet" type="button" data-delete-journey>Delete journey</button></section>
    ${deletionModal(ride)}`;
  await withLayout({ active: "trips", title: "Trip details", subtitle: ride.id.toUpperCase(), content });
  await mountMaps(ride);
  document.querySelector("[data-accept-offer]")?.addEventListener("click", async () => { try { await acceptOffer(ride.id); toast("Offer accepted. Your journey is confirmed."); await renderTripDetails(); } catch (error) { toast(error.message); } });
  const modal = document.querySelector("[data-modal-backdrop]");
  const openModal = () => { modal.hidden = false; modal.querySelector("[data-modal-close]").focus(); };
  const closeModal = () => { modal.hidden = true; document.querySelector("[data-delete-journey]")?.focus(); };
  document.querySelector("[data-delete-journey]")?.addEventListener("click", openModal);
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
  modal?.querySelector("[data-confirm-delete]")?.addEventListener("click", async () => { try { await deleteJourney(ride.id); location.href = passengerUrl("trips/"); } catch (error) { closeModal(); toast(error.message); } });
}

function populateQuarterHourOptions(select) {
  for (let totalMinutes = 0; totalMinutes < 24 * 60; totalMinutes += 15) {
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const minutes = String(totalMinutes % 60).padStart(2, "0");
    const value = `${hours}:${minutes}`;
    select.add(new Option(value, value));
  }
}

function renderCityTourBooking() {
  const regions = ["Zürich", "Lucerne", "Bern", "Basel", "Interlaken & Jungfrau Region", "Geneva", "Lausanne & Montreux", "Rhine Falls", "Other / Custom"];
  const styles = ["City Highlights", "Scenic", "Food & Lifestyle", "Shopping", "Surprise me", "Custom"];
  const durationOptions = [3, 4, 6, 8];
  const regionOptions = regions.map((region) => `<option value="${region}">${region}</option>`).join("");
  const durationChoices = durationOptions.map((hours) => `<label class="city-tour-choice"><input type="radio" name="cityTourDuration" value="${hours}"${hours === 4 ? " checked" : ""}><span>${hours} hours</span></label>`).join("");
  const styleChoices = styles.map((style) => `<label class="city-tour-choice city-tour-choice--style"><input type="radio" name="cityTourStyle" value="${style}" required><span>${style}</span></label>`).join("");
  const teslaRate = CITY_TOUR_PRICING["Tesla Model Y"];
  const vClassRate = CITY_TOUR_PRICING["Mercedes V-Class"];

  return `
    <section class="city-tour-booking" data-city-tour-booking hidden aria-labelledby="cityTourTitle">
      <header class="city-tour-heading"><div><p>Private Chauffeur Tour</p><h2 id="cityTourTitle">Explore Switzerland your way.</h2><span>Private chauffeur. Your schedule. We shape the day around what you want to experience.</span></div></header>
      <div class="city-tour-layout" data-city-tour-content>
        <form class="city-tour-form" id="cityTourForm" data-city-tour-form novalidate>
          <section class="city-tour-form-section">
            <label class="city-tour-field"><span>Where would you like to explore?</span><span class="city-tour-control"><i data-lucide="map-pin" aria-hidden="true"></i><select name="cityTourRegion" required><option value="">Select a city or region</option>${regionOptions}</select></span></label>
          </section>
          <section class="city-tour-form-section city-tour-when">
            <label class="city-tour-field"><span>Date</span><span class="city-tour-control" data-city-tour-picker><i data-lucide="calendar-days" aria-hidden="true"></i><input type="date" name="cityTourDate" required></span></label>
            <label class="city-tour-field"><span>Start time</span><span class="city-tour-control"><i data-lucide="clock-3" aria-hidden="true"></i><select name="cityTourTime" required><option value="">--:--</option></select></span></label>
          </section>
          <fieldset class="city-tour-form-section"><legend>How long would you like your tour?</legend><div class="city-tour-choice-grid city-tour-choice-grid--duration">${durationChoices}<label class="city-tour-choice"><input type="radio" name="cityTourDuration" value="custom"><span>Custom</span></label></div><label class="city-tour-custom-duration" data-city-tour-custom-duration hidden><span>Number of hours</span><input type="number" name="cityTourCustomHours" min="${CITY_TOUR_MIN_HOURS}" max="${CITY_TOUR_MAX_HOURS}" step="1" value="4" inputmode="numeric"></label></fieldset>
          <fieldset class="city-tour-form-section"><legend>Passengers</legend><div class="city-tour-passengers"><button type="button" data-city-tour-passengers="-1" aria-label="Remove one passenger"><i data-lucide="minus"></i></button><output data-city-tour-passenger-count>1</output><span data-city-tour-passenger-unit>passenger</span><button type="button" data-city-tour-passengers="1" aria-label="Add one passenger"><i data-lucide="plus"></i></button></div><small>Maximum 7 passengers</small></fieldset>
          <fieldset class="city-tour-form-section"><legend>Choose your vehicle</legend><div class="city-tour-vehicles">
            <label class="transfer-vehicle city-tour-vehicle"><input type="radio" name="cityTourVehicle" value="Tesla Model Y" checked><span><img src="${assetUrl("y2025.png")}" alt="Tesla Model Y" width="1200" height="800"><strong>Tesla Model Y</strong><small>Up to 4 passengers · CHF ${teslaRate}/hour</small></span></label>
            <label class="transfer-vehicle city-tour-vehicle"><input type="radio" name="cityTourVehicle" value="Mercedes V-Class"><span><img src="${assetUrl("vclass.png")}" alt="Mercedes V-Class" width="1200" height="800"><strong>Mercedes V-Class</strong><small>Up to 7 passengers · CHF ${vClassRate}/hour</small></span></label>
          </div><p class="city-tour-capacity-note" data-city-tour-capacity-note></p></fieldset>
          <fieldset class="city-tour-form-section"><legend>What would you like to experience?</legend><div class="city-tour-choice-grid city-tour-choice-grid--style">${styleChoices}</div></fieldset>
          <label class="city-tour-form-section city-tour-textarea"><span>Anything we should know? <small>Optional</small></span><textarea name="cityTourNotes" rows="5" placeholder="Tell us what you'd like to see, places you'd like to visit or any special requests..."></textarea></label>
        </form>
        <aside class="city-tour-summary" aria-live="polite">
          <div class="city-tour-price"><span>Estimated price</span><strong data-city-tour-price>CHF 340</strong><small data-city-tour-rate>4 hours × CHF 85/hour</small></div>
          <div class="city-tour-summary-details">
            <div><span>Destination</span><strong data-city-tour-summary-region>Choose a city or region</strong></div>
            <div><span>Date and time</span><strong data-city-tour-summary-when>Select your date and start time</strong></div>
            <div><span>Duration</span><strong data-city-tour-summary-duration>4 hours</strong></div>
            <div><span>Guests</span><strong data-city-tour-summary-passengers>1 passenger</strong></div>
            <div><span>Vehicle</span><strong data-city-tour-summary-vehicle>Tesla Model Y</strong></div>
            <div><span>Experience</span><strong data-city-tour-summary-style>Choose your tour style</strong></div>
          </div>
          <p class="city-tour-form-error" data-city-tour-error role="status"></p>
          <button class="passenger-button passenger-button--primary city-tour-submit" type="submit" form="cityTourForm">Request your private tour <i data-lucide="arrow-up-right"></i></button>
          <small class="city-tour-price-note">Final price may vary depending on itinerary and additional requests.</small>
        </aside>
      </div>
      <section class="city-tour-success" data-city-tour-success hidden tabindex="-1"><i data-lucide="circle-check-big" aria-hidden="true"></i><p>Private Chauffeur Tour</p><h2>Your private tour request has been received.</h2><span>We'll review your preferences and confirm the details shortly.</span></section>
    </section>`;
}

function renderHourlyConciergeBooking() {
  const initialEstimate = calculateHourlyConciergePrice("vehicle-model-y-2025", 4);
  const durationChoices = [3, 4, 6, 8].map((hours) => `<label class="hourly-choice"><input type="radio" name="hourlyDuration" value="${hours}"${hours === 4 ? " checked" : ""}><span>${hours} hours</span></label>`).join("");
  const purposes = [
    ["business", "Business"],
    ["dinner_evening", "Dinner & Evening"],
    ["shopping", "Shopping"],
    ["events", "Events"],
    ["multiple_stops", "Multiple Stops"],
    ["airport_meetings", "Airport + Meetings"],
    ["private_other", "Private / Other"],
  ];
  const purposeChoices = purposes.map(([value, label]) => `<label class="hourly-choice hourly-purpose"><input type="radio" name="hourlyPurpose" value="${value}" required><span>${label}</span></label>`).join("");
  const vehicles = HOURLY_CONCIERGE_VEHICLES.map((vehicle) => `<label class="hourly-vehicle"><input type="radio" name="hourlyVehicle" value="${vehicle.id}"${vehicle.id === "vehicle-model-y-2025" ? " checked" : ""}><span><img src="${assetUrl(vehicle.image)}" alt="${vehicle.name}" width="1200" height="800"><span><strong>${vehicle.name}</strong><small>Up to ${vehicle.seats} passengers</small></span><b>CHF ${vehicle.hourlyRate}<small>/hour</small></b></span></label>`).join("");

  return `
    <section class="hourly-booking" data-hourly-booking hidden aria-labelledby="hourlyTitle">
      <header class="hourly-heading"><p>Hourly Concierge</p><h2 id="hourlyTitle">Your chauffeur. Your schedule.</h2><span>Reserve a private chauffeur and vehicle by the hour. Add stops, change plans and keep your driver available throughout your booking.</span></header>
      <div class="hourly-layout" data-hourly-content>
        <form class="hourly-form" id="hourlyConciergeForm" data-hourly-form novalidate>
          <section class="hourly-form-section hourly-when">
            <label class="hourly-field"><span>Date</span><span class="hourly-control" data-hourly-picker><i data-lucide="calendar-days" aria-hidden="true"></i><input type="date" name="hourlyDate" required></span></label>
            <label class="hourly-field"><span>Start time</span><span class="hourly-control"><i data-lucide="clock-3" aria-hidden="true"></i><select name="hourlyTime" required><option value="">--:--</option></select></span></label>
          </section>
          <fieldset class="hourly-form-section"><legend>Duration</legend><div class="hourly-choice-grid hourly-duration">${durationChoices}<label class="hourly-choice"><input type="radio" name="hourlyDuration" value="custom"><span>Custom</span></label></div><label class="hourly-custom-duration" data-hourly-custom-duration hidden><span>Number of hours</span><input type="number" name="hourlyCustomHours" min="${HOURLY_CONCIERGE_MIN_HOURS}" max="${HOURLY_CONCIERGE_MAX_HOURS}" step="1" value="5" inputmode="numeric"></label><small>Minimum 3 hours, maximum 12 hours.</small></fieldset>
          <section class="hourly-form-section">
            <label class="hourly-field"><span>Pickup location</span><span class="hourly-control hourly-control--address"><i data-lucide="map-pin" aria-hidden="true"></i><input name="hourlyPickup" type="text" autocomplete="off" aria-autocomplete="list" aria-controls="hourlyPickupSuggestions" aria-expanded="false" placeholder="Hotel, address, airport or meeting point" data-address-input required><div class="passenger-address-suggestions" id="hourlyPickupSuggestions" role="listbox" data-address-list hidden></div></span></label>
          </section>
          <fieldset class="hourly-form-section"><legend>Passengers</legend><div class="hourly-passengers"><button type="button" data-hourly-passengers="-1" aria-label="Remove one passenger"><i data-lucide="minus"></i></button><output data-hourly-passenger-count>1</output><span data-hourly-passenger-unit>passenger</span><button type="button" data-hourly-passengers="1" aria-label="Add one passenger"><i data-lucide="plus"></i></button></div><small>Maximum 7 passengers.</small></fieldset>
          <fieldset class="hourly-form-section"><legend>Choose your vehicle</legend><div class="hourly-vehicles">${vehicles}</div><p class="hourly-capacity-note" data-hourly-capacity-note></p></fieldset>
          <fieldset class="hourly-form-section"><legend>How will you use your chauffeur?</legend><div class="hourly-choice-grid hourly-purpose-grid">${purposeChoices}</div></fieldset>
          <section class="hourly-form-section hourly-plans"><header><div><h3>Planned stops <small>Optional</small></h3><p>Share up to three places you already know.</p></div><button type="button" data-hourly-add-stop><i data-lucide="plus"></i> Add stop</button></header><div class="hourly-stops" data-hourly-stops></div><p class="hourly-flexibility"><strong>Don't know your full itinerary yet?</strong> No problem. You can update your plans during the booking.</p></section>
          <label class="hourly-form-section hourly-textarea"><span>Tell us about your plans <small>Optional</small></span><textarea name="hourlyNotes" rows="5" placeholder="Tell us where you'd like to go, what you're planning or leave this blank and decide later."></textarea></label>
        </form>
        <aside class="hourly-summary" aria-live="polite">
          <div class="hourly-price"><span>Estimated price</span><strong data-hourly-price>CHF ${initialEstimate.total}</strong><small data-hourly-rate>${initialEstimate.durationHours} hours at CHF ${initialEstimate.hourlyRate}/hour</small></div>
          <p class="hourly-included"><i data-lucide="circle-check" aria-hidden="true"></i><span data-hourly-included>Includes chauffeur, waiting time and up to ${initialEstimate.includedKilometers} km.</span></p>
          <div class="hourly-summary-details">
            <div><span>When</span><strong data-hourly-summary-when>Select date and start time</strong></div>
            <div><span>Duration</span><strong data-hourly-summary-duration>4 hours</strong></div>
            <div><span>Pickup</span><strong data-hourly-summary-pickup>Add pickup location</strong></div>
            <div><span>Passengers</span><strong data-hourly-summary-passengers>1 passenger</strong></div>
            <div><span>Vehicle</span><strong data-hourly-summary-vehicle>Tesla Model Y 2025</strong></div>
            <div><span>Purpose</span><strong data-hourly-summary-purpose>Choose a purpose</strong></div>
            <div><span>Included</span><strong data-hourly-summary-kilometers>${initialEstimate.includedKilometers} km</strong></div>
          </div>
          <p class="hourly-form-error" data-hourly-error role="status"></p>
          <button class="passenger-button passenger-button--primary hourly-submit" type="submit" form="hourlyConciergeForm">Request hourly concierge <i data-lucide="arrow-up-right"></i></button>
          <small class="hourly-price-note">Additional distance may be charged separately. Final availability will be confirmed by Space Drive.</small>
        </aside>
      </div>
      <section class="hourly-success" data-hourly-success hidden tabindex="-1"><i data-lucide="circle-check-big" aria-hidden="true"></i><p>Hourly Concierge</p><h2>Your hourly concierge request has been received.</h2><span>We'll review your booking and confirm the details shortly.</span><a class="passenger-button" href="${passengerUrl("requests/")}">View my requests</a></section>
    </section>`;
}

async function renderRequests() {
  const passenger = await getPassenger();
  const services = [
    { id: "simple-transfer", title: "Simple Transfer", description: "Direct, private travel from pickup to destination.", image: "passenger/assets/services/simple-transfer.png" },
    { id: "city-tour", title: "City Tour", description: "A private route through the city, paced around you.", image: "passenger/assets/services/city-tour.png" },
    { id: "hourly-concierge", title: "Hourly Concierge", description: "A chauffeur and vehicle reserved by the hour.", image: "passenger/assets/services/hourly-concierge.png" },
  ];
  const cards = services.map((service) => `<button class="service-card service-card--${service.id}" type="button" data-service-id="${service.id}" data-service-choice="${service.title}" aria-label="Choose ${service.title}" aria-pressed="false"><img src="${assetUrl(service.image)}" alt="" width="1400" height="896"><span class="service-card__shade"></span><span class="service-card__content"><span><strong>${service.title}</strong><small>${service.description}</small></span><i data-lucide="arrow-up-right" aria-hidden="true"></i></span></button>`).join("");
  const booking = `
    <section class="simple-transfer-booking" data-simple-transfer-booking hidden aria-labelledby="simpleTransferTitle">
      <header class="simple-transfer-booking__heading"><div><p>Simple Transfer</p><h2 id="simpleTransferTitle">Plan your route</h2><span>Your profile and journey preferences will be added automatically.</span></div><span class="booking-passenger-chip"><i data-lucide="circle-check"></i> Signed in as ${escapeHtml(passenger.firstName || "Passenger")}</span></header>
      <div class="transfer-booking-grid">
        <form class="transfer-booking-panel" data-transfer-form>
          <div class="transfer-route-fields">
            <label class="transfer-field"><span>Pickup location</span><i data-lucide="map-pin" aria-hidden="true"></i><input name="pickup" type="text" autocomplete="off" aria-autocomplete="list" aria-controls="pickupAddressSuggestions" aria-expanded="false" placeholder="Zurich Airport" data-address-input required><div class="passenger-address-suggestions" id="pickupAddressSuggestions" role="listbox" data-address-list hidden></div></label>
            <button class="transfer-swap" type="button" data-transfer-swap aria-label="Swap pickup and destination"><i data-lucide="arrow-up-down"></i></button>
            <label class="transfer-field"><span>Destination</span><i data-lucide="flag" aria-hidden="true"></i><input name="destination" type="text" autocomplete="off" aria-autocomplete="list" aria-controls="destinationAddressSuggestions" aria-expanded="false" placeholder="St. Moritz" data-address-input required><div class="passenger-address-suggestions" id="destinationAddressSuggestions" role="listbox" data-address-list hidden></div></label>
          </div>
          <label class="both-ways-option"><input type="checkbox" name="bothWays"><span class="both-ways-option__control"><i data-lucide="repeat-2"></i><span><strong>Both Ways</strong><small>Add a return journey on the same route</small></span><span class="both-ways-switch" aria-hidden="true"></span></span></label>
          <div class="transfer-schedule">
            <label class="transfer-schedule-field"><span>Date</span><span class="transfer-schedule-control" data-picker-control><i data-lucide="calendar-days" aria-hidden="true"></i><input type="date" name="pickupDate" required></span></label>
            <label class="transfer-schedule-field"><span>Time</span><span class="transfer-schedule-control" data-picker-control><i data-lucide="clock-3" aria-hidden="true"></i><select name="pickupTime" required><option value="">--:--</option></select></span></label>
          </div>
          <div class="transfer-schedule transfer-schedule--return" data-return-schedule hidden>
            <label class="transfer-schedule-field"><span>Return date</span><span class="transfer-schedule-control" data-picker-control><i data-lucide="calendar-days" aria-hidden="true"></i><input type="date" name="returnDate"></span></label>
            <label class="transfer-schedule-field"><span>Return time</span><span class="transfer-schedule-control" data-picker-control><i data-lucide="clock-3" aria-hidden="true"></i><select name="returnTime"><option value="">--:--</option></select></span></label>
          </div>
          <fieldset class="booking-fieldset luggage-fieldset"><legend>Luggage</legend><div class="luggage-stepper"><button type="button" data-luggage-change="-1" aria-label="Remove one piece of luggage"><i data-lucide="minus"></i></button><output data-luggage-count>1</output><span>piece</span><button type="button" data-luggage-change="1" aria-label="Add one piece of luggage"><i data-lucide="plus"></i></button></div></fieldset>
          <fieldset class="booking-fieldset vehicle-fieldset"><legend>Choose your vehicle</legend><div class="transfer-vehicles">
            <label class="transfer-vehicle"><input type="radio" name="vehicle" value="Tesla Model Y" checked><span><img src="${assetUrl("y2025.png")}" alt="Tesla Model Y" width="1200" height="800"><strong>Tesla Model Y</strong><small>Up to 4 passengers</small></span></label>
            <label class="transfer-vehicle"><input type="radio" name="vehicle" value="Mercedes V-Class"><span><img src="${assetUrl("vclass.png")}" alt="Mercedes V-Class" width="1200" height="800"><strong>Mercedes V-Class</strong><small>Up to 7 passengers</small></span></label>
          </div></fieldset>
          <p class="transfer-route-note" data-transfer-note>Enter pickup and destination to calculate your route.</p>
          <button class="passenger-button passenger-button--primary transfer-calculate" type="submit"><i data-lucide="route"></i> Show route and price</button>
          <div class="transfer-route-summary" aria-live="polite"><div><span>Distance</span><strong data-transfer-distance>--</strong></div><div><span>Travel time</span><strong data-transfer-duration>--</strong></div><div><span>Estimated price</span><strong data-transfer-price>--</strong></div></div>
        </form>
        <div class="transfer-map-column">
          <div class="transfer-map"><iframe data-transfer-map title="Simple transfer route map" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?output=embed&q=Switzerland"></iframe></div>
          <div class="transfer-request"><div><span>Ready when you are</span><strong data-transfer-total>Calculate your route first</strong></div><button class="passenger-button passenger-button--primary" type="button" data-request-availability disabled>Request availability <i data-lucide="arrow-up-right"></i></button></div>
        </div>
      </div>
    </section>`;
  const cityTourBooking = renderCityTourBooking();
  const hourlyBooking = renderHourlyConciergeBooking();
  const content = `<div class="request-screen" data-request-screen><section class="page-heading request-heading"><p>Book a journey</p><h2>How would you like to travel?</h2><span>Choose a service to begin your private journey request.</span></section><section class="service-grid" aria-label="Journey services">${cards}</section>${booking}${cityTourBooking}${hourlyBooking}</div>`;
  await withLayout({ active: "requests", title: "Request a journey", subtitle: "Private concierge", content });
  bindRequestBooking();
  bindCityTourBooking();
  bindHourlyConciergeBooking();
}

function bindRequestBooking() {
  const screen = document.querySelector("[data-request-screen]");
  const booking = document.querySelector("[data-simple-transfer-booking]");
  const cityTourBooking = document.querySelector("[data-city-tour-booking]");
  const hourlyBooking = document.querySelector("[data-hourly-booking]");
  const cards = [...document.querySelectorAll("[data-service-choice]")];
  const form = document.querySelector("[data-transfer-form]");
  const pickup = form.querySelector("[name=pickup]");
  const destination = form.querySelector("[name=destination]");
  const note = document.querySelector("[data-transfer-note]");
  const distanceOutput = document.querySelector("[data-transfer-distance]");
  const durationOutput = document.querySelector("[data-transfer-duration]");
  const priceOutput = document.querySelector("[data-transfer-price]");
  const totalOutput = document.querySelector("[data-transfer-total]");
  const map = document.querySelector("[data-transfer-map]");
  const requestButton = document.querySelector("[data-request-availability]");
  const luggageOutput = document.querySelector("[data-luggage-count]");
  const bothWays = form.querySelector("[name=bothWays]");
  const dateInput = form.querySelector("[name=pickupDate]");
  const timeInput = form.querySelector("[name=pickupTime]");
  const returnSchedule = form.querySelector("[data-return-schedule]");
  const returnDateInput = form.querySelector("[name=returnDate]");
  const returnTimeInput = form.querySelector("[name=returnTime]");
  const vehicleInputs = [...form.querySelectorAll("[name=vehicle]")];
  const vehicleRates = {
    "Tesla Model Y": { base: 8, short: 2.5, long: 1.5 },
    "Mercedes V-Class": { base: 10, short: 3.5, long: 2 },
  };
  let luggage = 1;
  let routeReady = false;
  let basePrice = null;
  let routeDistanceKm = null;
  bindPassengerAddressAutocomplete(form);
  [timeInput, returnTimeInput].forEach(populateQuarterHourOptions);
  const today = new Date().toISOString().slice(0, 10);
  dateInput.min = today;
  returnDateInput.min = today;

  const updateAvailabilityState = () => {
    const returnReady = !bothWays.checked || (returnDateInput.value && returnTimeInput.value);
    requestButton.disabled = !(routeReady && dateInput.value && timeInput.value && returnReady);
  };

  const updateEstimatedPrice = () => {
    if (routeDistanceKm === null) return;
    const vehicle = form.querySelector("[name=vehicle]:checked").value;
    const rates = vehicleRates[vehicle];
    basePrice = rates.base + routeDistanceKm * (routeDistanceKm <= 20 ? rates.short : rates.long);
    const totalPrice = Math.round(basePrice * (bothWays.checked ? 2 : 1));
    const formattedPrice = `CHF ${totalPrice.toLocaleString("de-CH")}`;
    priceOutput.textContent = formattedPrice;
    totalOutput.textContent = `${formattedPrice} estimated${bothWays.checked ? " for both ways" : ""}`;
  };

  const resetEstimate = () => {
    routeReady = false;
    basePrice = null;
    routeDistanceKm = null;
    updateAvailabilityState();
    distanceOutput.textContent = "--";
    durationOutput.textContent = "--";
    priceOutput.textContent = "--";
    totalOutput.textContent = "Calculate your route first";
  };

  const selectService = (selected) => {
    screen.classList.add("has-selection");
    cards.forEach((card) => {
      const active = card === selected;
      card.classList.toggle("is-selected", active);
      card.setAttribute("aria-pressed", String(active));
    });
    const serviceId = selected.dataset.serviceId;
    const simpleTransfer = serviceId === "simple-transfer";
    const cityTour = serviceId === "city-tour";
    const hourlyConcierge = serviceId === "hourly-concierge";
    booking.classList.remove("is-revealed");
    cityTourBooking.classList.remove("is-revealed");
    hourlyBooking.classList.remove("is-revealed");
    booking.hidden = !simpleTransfer;
    cityTourBooking.hidden = !cityTour;
    hourlyBooking.hidden = !hourlyConcierge;
    if (simpleTransfer) {
      requestAnimationFrame(() => booking.classList.add("is-revealed"));
    } else if (cityTour) {
      requestAnimationFrame(() => cityTourBooking.classList.add("is-revealed"));
    } else if (hourlyConcierge) {
      requestAnimationFrame(() => hourlyBooking.classList.add("is-revealed"));
    }
  };

  cards.forEach((card) => card.addEventListener("click", () => selectService(card)));
  document.querySelector("[data-transfer-swap]").addEventListener("click", () => {
    [pickup.value, destination.value] = [destination.value, pickup.value];
    resetEstimate();
    note.textContent = "Route changed. Calculate again to update the estimate.";
  });
  document.querySelectorAll("[data-luggage-change]").forEach((button) => button.addEventListener("click", () => {
    luggage = Math.min(8, Math.max(0, luggage + Number(button.dataset.luggageChange)));
    luggageOutput.textContent = String(luggage);
    luggageOutput.nextElementSibling.textContent = luggage === 1 ? "piece" : "pieces";
  }));
  bothWays.addEventListener("change", () => {
    returnSchedule.hidden = !bothWays.checked;
    returnDateInput.required = bothWays.checked;
    returnTimeInput.required = bothWays.checked;
    if (!bothWays.checked) {
      returnDateInput.value = "";
      returnTimeInput.value = "";
    }
    updateEstimatedPrice();
    updateAvailabilityState();
    if (routeReady && basePrice !== null) note.textContent = bothWays.checked ? "Return journey added. The estimated price now includes both ways." : "Return journey removed. The estimate is for one way.";
  });
  vehicleInputs.forEach((input) => input.addEventListener("change", () => {
    updateEstimatedPrice();
    if (routeReady) note.textContent = `Estimate updated for ${input.value}.`;
  }));
  form.querySelectorAll("[data-picker-control]").forEach((control) => {
    const input = control.querySelector("input, select");
    control.addEventListener("click", (event) => {
      if (event.target === input) return;
      event.preventDefault();
      input.focus({ preventScroll: true });
      try {
        input.showPicker?.();
      } catch (error) {
        input.click();
      }
    });
  });
  const syncSchedule = (input) => {
    if (input === dateInput) {
      returnDateInput.min = dateInput.value || today;
      if (returnDateInput.value && returnDateInput.value < returnDateInput.min) returnDateInput.value = "";
    }
    if (input === returnDateInput && returnDateInput.value && returnDateInput.value < returnDateInput.min) {
      returnDateInput.value = "";
    }
    updateAvailabilityState();
  };
  [dateInput, timeInput, returnDateInput, returnTimeInput].forEach((input) => {
    input.addEventListener("input", () => syncSchedule(input));
    input.addEventListener("change", () => {
      syncSchedule(input);
      input.blur();
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    form.querySelectorAll("[data-address-list]").forEach((list) => {
      list.hidden = true;
      list.innerHTML = "";
    });
    form.querySelectorAll("[data-address-input]").forEach((input) => input.setAttribute("aria-expanded", "false"));
    const from = pickup.value.trim();
    const to = destination.value.trim();
    if (!from || !to) {
      resetEstimate();
      note.textContent = "Enter both locations to calculate your route.";
      note.classList.add("is-error");
      return;
    }
    note.classList.remove("is-error");
    note.textContent = "Calculating route and estimated price...";
    try {
      const route = await calculatePassengerRoute(from, to);
      const distance = `${route.distanceKm.toLocaleString("en-CH", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
      const totalMinutes = Math.max(1, Math.round(route.durationSeconds / 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const duration = hours ? `${hours} hr ${minutes} min` : `${minutes} min`;
      routeDistanceKm = route.distanceKm;
      distanceOutput.textContent = distance;
      durationOutput.textContent = duration;
      updateEstimatedPrice();
      note.textContent = "Route calculated. Final availability and price will be confirmed by Space Drive.";
      routeReady = true;
      const mapOrigin = `${route.from.lat},${route.from.lon}`;
      const mapDestination = `${route.to.lat},${route.to.lon}`;
      map.src = `https://www.google.com/maps?output=embed&saddr=${encodeURIComponent(mapOrigin)}&daddr=${encodeURIComponent(mapDestination)}`;
      updateAvailabilityState();
    } catch (error) {
      distanceOutput.textContent = "On request";
      durationOutput.textContent = "On request";
      priceOutput.textContent = "On request";
      totalOutput.textContent = "Price on request";
      note.textContent = "The live estimate is unavailable. You can still request availability.";
      note.classList.add("is-error");
      routeReady = true;
      map.src = `https://www.google.com/maps?output=embed&saddr=${encodeURIComponent(from)}&daddr=${encodeURIComponent(to)}`;
      updateAvailabilityState();
    }
  });
  requestButton.addEventListener("click", async () => {
    if (!routeReady) return;
    const vehicle = form.querySelector("[name=vehicle]:checked").value;
    const returnDetails = bothWays.checked ? ` Return: ${returnDateInput.value} at ${returnTimeInput.value}.` : "";
    const estimate = basePrice === null ? undefined : Math.round(basePrice * (bothWays.checked ? 2 : 1));
    await createRideRequest({ requestType: "transfer", pickup: { name: pickup.value, address: pickup.value }, destination: { name: destination.value, address: destination.value }, pickupDate: dateInput.value, pickupTime: timeInput.value, passengers: 1, luggage: `${luggage} ${luggage === 1 ? "piece" : "pieces"}`, requestedVehicle: vehicle, calculatedPrice: estimate, specialRequests: bothWays.checked ? [`Return ${returnDateInput.value} at ${returnTimeInput.value}`] : [] });
    toast(`Request sent to Dispatch for ${dateInput.value} at ${timeInput.value}.${returnDetails}`);
  });
}

function bindCityTourBooking() {
  const form = document.querySelector("[data-city-tour-form]");
  if (!form) return;

  const dateInput = form.querySelector("[name=cityTourDate]");
  const timeInput = form.querySelector("[name=cityTourTime]");
  const regionInput = form.querySelector("[name=cityTourRegion]");
  const customDuration = form.querySelector("[data-city-tour-custom-duration]");
  const customHoursInput = form.querySelector("[name=cityTourCustomHours]");
  const passengerOutput = form.querySelector("[data-city-tour-passenger-count]");
  const passengerUnit = form.querySelector("[data-city-tour-passenger-unit]");
  const capacityNote = form.querySelector("[data-city-tour-capacity-note]");
  const errorOutput = document.querySelector("[data-city-tour-error]");
  const content = document.querySelector("[data-city-tour-content]");
  const success = document.querySelector("[data-city-tour-success]");
  let passengers = 1;

  dateInput.min = new Date().toISOString().slice(0, 10);
  populateQuarterHourOptions(timeInput);

  const selectedDuration = () => form.querySelector("[name=cityTourDuration]:checked")?.value || "4";
  const selectedHours = () => selectedDuration() === "custom" ? Number(customHoursInput.value) : Number(selectedDuration());
  const selectedVehicle = () => form.querySelector("[name=cityTourVehicle]:checked")?.value || "Tesla Model Y";
  const selectedStyle = () => form.querySelector("[name=cityTourStyle]:checked")?.value || "";
  const formatTourDate = (value) => value ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`)) : "";

  const updateSummary = () => {
    const hours = selectedHours();
    const vehicle = selectedVehicle();
    const estimate = calculateCityTourPrice(vehicle, hours);
    const region = regionInput.value;
    const style = selectedStyle();
    const formattedDate = formatTourDate(dateInput.value);

    document.querySelector("[data-city-tour-summary-region]").textContent = region || "Choose a city or region";
    document.querySelector("[data-city-tour-summary-when]").textContent = formattedDate && timeInput.value ? `${formattedDate} · ${timeInput.value}` : "Select your date and start time";
    document.querySelector("[data-city-tour-summary-duration]").textContent = Number.isFinite(hours) ? `${hours} ${hours === 1 ? "hour" : "hours"}` : "Choose a duration";
    document.querySelector("[data-city-tour-summary-passengers]").textContent = `${passengers} ${passengers === 1 ? "passenger" : "passengers"}`;
    document.querySelector("[data-city-tour-summary-vehicle]").textContent = vehicle;
    document.querySelector("[data-city-tour-summary-style]").textContent = style || "Choose your tour style";
    document.querySelector("[data-city-tour-price]").textContent = estimate ? `CHF ${estimate.total.toLocaleString("de-CH")}` : "Price pending";
    document.querySelector("[data-city-tour-rate]").textContent = estimate ? `${hours} hours × CHF ${estimate.hourlyRate}/hour` : `Minimum ${CITY_TOUR_MIN_HOURS} hours`;
  };

  const clearError = () => {
    errorOutput.textContent = "";
  };

  form.querySelectorAll("[data-city-tour-picker]").forEach((control) => {
    const input = control.querySelector("input");
    control.addEventListener("click", (event) => {
      if (event.target === input) return;
      event.preventDefault();
      input.focus({ preventScroll: true });
      try {
        input.showPicker?.();
      } catch (error) {
        input.click();
      }
    });
    input.addEventListener("change", () => input.blur());
  });

  form.querySelectorAll("[name=cityTourDuration]").forEach((input) => input.addEventListener("change", () => {
    const custom = input.value === "custom" && input.checked;
    customDuration.hidden = !custom;
    customHoursInput.required = custom;
    if (custom) customHoursInput.focus();
    clearError();
    updateSummary();
  }));

  form.querySelectorAll("[data-city-tour-passengers]").forEach((button) => button.addEventListener("click", () => {
    passengers = Math.min(7, Math.max(1, passengers + Number(button.dataset.cityTourPassengers)));
    passengerOutput.textContent = String(passengers);
    passengerUnit.textContent = passengers === 1 ? "passenger" : "passengers";
    const teslaInput = form.querySelector('[name=cityTourVehicle][value="Tesla Model Y"]');
    teslaInput.disabled = passengers > 4;
    if (passengers > 4 && teslaInput.checked) {
      form.querySelector('[name=cityTourVehicle][value="Mercedes V-Class"]').checked = true;
      capacityNote.textContent = "Mercedes V-Class selected for groups of 5-7 passengers.";
    } else {
      capacityNote.textContent = "";
    }
    clearError();
    updateSummary();
  }));

  form.querySelectorAll("select, input, textarea").forEach((control) => {
    control.addEventListener("input", () => {
      clearError();
      updateSummary();
    });
    control.addEventListener("change", () => {
      clearError();
      updateSummary();
      if (control.tagName === "SELECT") control.blur();
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const hours = selectedHours();
    const style = selectedStyle();
    const errors = [
      [regionInput.value, "Please choose a city or region.", regionInput],
      [dateInput.value, "Please choose a tour date.", dateInput],
      [timeInput.value, "Please choose a start time.", timeInput],
      [Number.isFinite(hours) && hours >= CITY_TOUR_MIN_HOURS && hours <= CITY_TOUR_MAX_HOURS, `Please choose a duration between ${CITY_TOUR_MIN_HOURS} and ${CITY_TOUR_MAX_HOURS} hours.`, customHoursInput],
      [style, "Please choose what you would like to experience.", form.querySelector("[name=cityTourStyle]")],
    ];
    const invalid = errors.find(([valid]) => !valid);

    if (invalid) {
      errorOutput.textContent = invalid[1];
      invalid[2]?.focus();
      return;
    }

    const estimate = calculateCityTourPrice(selectedVehicle(), hours);
    await createRideRequest({ requestType: "city_tour", pickup: { name: regionInput.value, address: `Pickup in ${regionInput.value}` }, destination: { name: regionInput.value, address: "Private city itinerary" }, pickupDate: dateInput.value, pickupTime: timeInput.value, passengers, luggage: "Not provided", requestedVehicle: selectedVehicle(), calculatedPrice: estimate?.total, specialRequests: form.querySelector("[name=cityTourNotes]").value.trim() ? [form.querySelector("[name=cityTourNotes]").value.trim()] : [], tourDetails: { region: regionInput.value, durationHours: hours, style } });
    content.hidden = true;
    success.hidden = false;
    success.focus({ preventScroll: true });
    success.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  });

  updateSummary();
}

function bindHourlyConciergeBooking() {
  const form = document.querySelector("[data-hourly-form]");
  if (!form) return;

  const dateInput = form.querySelector("[name=hourlyDate]");
  const timeInput = form.querySelector("[name=hourlyTime]");
  const pickupInput = form.querySelector("[name=hourlyPickup]");
  const customDuration = form.querySelector("[data-hourly-custom-duration]");
  const customHoursInput = form.querySelector("[name=hourlyCustomHours]");
  const passengerOutput = form.querySelector("[data-hourly-passenger-count]");
  const passengerUnit = form.querySelector("[data-hourly-passenger-unit]");
  const capacityNote = form.querySelector("[data-hourly-capacity-note]");
  const stopsContainer = form.querySelector("[data-hourly-stops]");
  const addStopButton = form.querySelector("[data-hourly-add-stop]");
  const errorOutput = document.querySelector("[data-hourly-error]");
  const content = document.querySelector("[data-hourly-content]");
  const success = document.querySelector("[data-hourly-success]");
  const submitButton = document.querySelector(".hourly-submit");
  const today = new Date().toISOString().slice(0, 10);
  const purposeLabels = new Map([
    ["business", "Business"], ["dinner_evening", "Dinner & Evening"], ["shopping", "Shopping"], ["events", "Events"],
    ["multiple_stops", "Multiple Stops"], ["airport_meetings", "Airport + Meetings"], ["private_other", "Private / Other"],
  ]);
  let passengers = 1;
  let stopSequence = 0;

  dateInput.min = today;
  populateQuarterHourOptions(timeInput);
  bindPassengerAddressAutocomplete(form);

  const selectedDuration = () => form.querySelector("[name=hourlyDuration]:checked")?.value || "4";
  const selectedHours = () => selectedDuration() === "custom" ? Number(customHoursInput.value) : Number(selectedDuration());
  const selectedVehicleId = () => form.querySelector("[name=hourlyVehicle]:checked")?.value || "";
  const selectedPurpose = () => form.querySelector("[name=hourlyPurpose]:checked")?.value || "";
  const formatConciergeDate = (value) => value ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`)) : "";
  const localDateTime = (date, time, hoursToAdd = 0) => {
    if (!date || !time || !Number.isFinite(hoursToAdd)) return "";
    const value = new Date(`${date}T${time}:00`);
    value.setHours(value.getHours() + hoursToAdd);
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    const hours = String(value.getHours()).padStart(2, "0");
    const minutes = String(value.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}:00`;
  };

  const clearError = () => {
    errorOutput.textContent = "";
    form.querySelectorAll("[aria-invalid=true]").forEach((control) => control.removeAttribute("aria-invalid"));
  };

  const updateSummary = () => {
    const hours = selectedHours();
    const estimate = calculateHourlyConciergePrice(selectedVehicleId(), hours);
    const purpose = selectedPurpose();
    const formattedDate = formatConciergeDate(dateInput.value);
    const endAt = estimate ? localDateTime(dateInput.value, timeInput.value, estimate.durationHours) : "";
    const endTime = endAt ? endAt.slice(11, 16) : "";

    document.querySelector("[data-hourly-summary-when]").textContent = formattedDate && timeInput.value ? `${formattedDate}, ${timeInput.value}${endTime ? ` to ${endTime}` : ""}` : "Select date and start time";
    document.querySelector("[data-hourly-summary-duration]").textContent = estimate ? `${estimate.durationHours} hours` : "Choose a valid duration";
    document.querySelector("[data-hourly-summary-pickup]").textContent = pickupInput.value.trim() || "Add pickup location";
    document.querySelector("[data-hourly-summary-passengers]").textContent = `${passengers} ${passengers === 1 ? "passenger" : "passengers"}`;
    document.querySelector("[data-hourly-summary-vehicle]").textContent = estimate?.vehicleName || "Choose a vehicle";
    document.querySelector("[data-hourly-summary-purpose]").textContent = purposeLabels.get(purpose) || "Choose a purpose";
    document.querySelector("[data-hourly-summary-kilometers]").textContent = estimate ? `${estimate.includedKilometers} km` : "Pending";
    document.querySelector("[data-hourly-price]").textContent = estimate ? `CHF ${estimate.total.toLocaleString("de-CH")}` : "Price pending";
    document.querySelector("[data-hourly-rate]").textContent = estimate ? `${estimate.durationHours} hours at CHF ${estimate.hourlyRate}/hour` : `Choose ${HOURLY_CONCIERGE_MIN_HOURS}-${HOURLY_CONCIERGE_MAX_HOURS} hours`;
    document.querySelector("[data-hourly-included]").textContent = estimate ? `Includes chauffeur, waiting time and up to ${estimate.includedKilometers} km.` : "Included distance will appear with your estimate.";
  };

  const updateVehicleCapacity = () => {
    const teslaInputs = [...form.querySelectorAll('[name=hourlyVehicle][value^="vehicle-model-y"]')];
    teslaInputs.forEach((input) => { input.disabled = passengers > 4; });
    if (passengers > 4 && teslaInputs.some((input) => input.checked)) {
      form.querySelector('[name=hourlyVehicle][value="vehicle-v-class"]').checked = true;
      capacityNote.textContent = "Mercedes-Benz V-Class selected for groups of 5-7 passengers.";
    } else {
      capacityNote.textContent = "";
    }
  };

  const syncStops = () => {
    const rows = [...stopsContainer.querySelectorAll("[data-hourly-stop]")];
    rows.forEach((row, index) => {
      row.querySelector("label").textContent = `Stop ${index + 1}`;
      row.querySelector("input").name = `hourlyStop${index + 1}`;
    });
    addStopButton.disabled = rows.length >= 3;
    addStopButton.innerHTML = rows.length >= 3 ? "Maximum 3 stops" : '<i data-lucide="plus"></i> Add stop';
    refreshIcons();
  };

  const addStop = () => {
    if (stopsContainer.children.length >= 3) return;
    stopSequence += 1;
    const row = document.createElement("div");
    row.className = "hourly-stop";
    row.dataset.hourlyStop = String(stopSequence);
    row.innerHTML = `<label for="hourlyStop-${stopSequence}">Stop ${stopsContainer.children.length + 1}</label><div><i data-lucide="map-pin" aria-hidden="true"></i><input id="hourlyStop-${stopSequence}" type="text" autocomplete="off" placeholder="Optional destination"><button type="button" data-hourly-remove-stop aria-label="Remove stop"><i data-lucide="x"></i></button></div>`;
    stopsContainer.append(row);
    row.querySelector("input").addEventListener("input", clearError);
    row.querySelector("[data-hourly-remove-stop]").addEventListener("click", () => { row.remove(); syncStops(); });
    syncStops();
    row.querySelector("input").focus();
  };

  form.querySelectorAll("[data-hourly-picker]").forEach((control) => {
    const input = control.querySelector("input");
    control.addEventListener("click", (event) => {
      if (event.target === input) return;
      event.preventDefault();
      input.focus({ preventScroll: true });
      try { input.showPicker?.(); } catch { input.click(); }
    });
    input.addEventListener("change", () => input.blur());
  });

  form.querySelectorAll("[name=hourlyDuration]").forEach((input) => input.addEventListener("change", () => {
    const custom = input.value === "custom" && input.checked;
    customDuration.hidden = !custom;
    customHoursInput.required = custom;
    clearError();
    updateSummary();
    if (custom) customHoursInput.focus();
  }));

  form.querySelectorAll("[data-hourly-passengers]").forEach((button) => button.addEventListener("click", () => {
    passengers = Math.min(7, Math.max(1, passengers + Number(button.dataset.hourlyPassengers)));
    passengerOutput.textContent = String(passengers);
    passengerUnit.textContent = passengers === 1 ? "passenger" : "passengers";
    updateVehicleCapacity();
    clearError();
    updateSummary();
  }));

  addStopButton.addEventListener("click", addStop);
  form.querySelectorAll("select, input, textarea").forEach((control) => {
    control.addEventListener("input", () => { clearError(); updateSummary(); });
    control.addEventListener("change", () => { clearError(); updateSummary(); if (control.tagName === "SELECT") control.blur(); });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();
    const hours = selectedHours();
    const vehicleId = selectedVehicleId();
    const purpose = selectedPurpose();
    const estimate = calculateHourlyConciergePrice(vehicleId, hours);
    const errors = [
      [dateInput.value && dateInput.value >= today, "Please choose a current or future date.", dateInput],
      [timeInput.value, "Please choose a start time.", timeInput],
      [estimate && hours >= HOURLY_CONCIERGE_MIN_HOURS && hours <= HOURLY_CONCIERGE_MAX_HOURS, `Please choose a duration between ${HOURLY_CONCIERGE_MIN_HOURS} and ${HOURLY_CONCIERGE_MAX_HOURS} hours.`, customHoursInput],
      [pickupInput.value.trim(), "Please add a pickup location.", pickupInput],
      [vehicleId, "Please choose a vehicle.", form.querySelector("[name=hourlyVehicle]")],
      [purpose, "Please choose how you will use your chauffeur.", form.querySelector("[name=hourlyPurpose]")],
    ];
    const invalid = errors.find(([valid]) => !valid);
    if (invalid) {
      errorOutput.textContent = invalid[1];
      invalid[2]?.setAttribute("aria-invalid", "true");
      invalid[2]?.focus();
      return;
    }

    const plannedStops = [...stopsContainer.querySelectorAll("input")].map((input) => input.value.trim()).filter(Boolean).map((name) => ({ name, address: name }));
    const notes = form.querySelector("[name=hourlyNotes]").value.trim();
    const bookingStartAt = localDateTime(dateInput.value, timeInput.value);
    const bookingEndAt = localDateTime(dateInput.value, timeInput.value, hours);
    const originalLabel = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.textContent = "Sending request...";

    try {
      await createRideRequest({
        serviceType: "hourly_concierge",
        requestType: "hourly_concierge",
        pickup: { name: pickupInput.value.trim(), address: pickupInput.value.trim() },
        destination: { name: "At your disposal", address: "Flexible hourly itinerary" },
        pickupDate: dateInput.value,
        pickupTime: timeInput.value,
        estimatedEndAt: bookingEndAt,
        passengers,
        luggage: "Not provided",
        requestedVehicleId: vehicleId,
        requestedVehicle: estimate.vehicleName,
        calculatedPrice: estimate.total,
        plannedStops,
        specialRequests: notes ? [notes] : [],
        hourlyDetails: { durationHours: hours, purpose, plannedStops, currentStop: null, hourlyRate: estimate.hourlyRate, includedKilometers: estimate.includedKilometers, bookingStartAt, bookingEndAt, extensionHours: 0 },
      });
      content.hidden = true;
      success.hidden = false;
      success.focus({ preventScroll: true });
      success.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    } catch (error) {
      errorOutput.textContent = "We could not submit your request. Please try again.";
      submitButton.disabled = false;
      submitButton.innerHTML = originalLabel;
      refreshIcons();
    }
  });

  updateVehicleCapacity();
  updateSummary();
}

function bindPassengerAddressAutocomplete(form) {
  const escapeAddressText = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  form.querySelectorAll("[data-address-input]").forEach((input) => {
    const list = input.parentElement.querySelector("[data-address-list]");
    let suggestions = [];
    let activeIndex = -1;
    let timer = 0;
    let requestId = 0;

    const closeList = () => {
      list.hidden = true;
      list.innerHTML = "";
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      activeIndex = -1;
    };
    const chooseSuggestion = (index) => {
      const suggestion = suggestions[index];
      if (!suggestion) return;
      input.value = suggestion.value;
      closeList();
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };
    const renderList = () => {
      if (!suggestions.length) {
        closeList();
        return;
      }
      list.innerHTML = suggestions.map((suggestion, index) => `<button class="passenger-address-option${index === activeIndex ? " is-active" : ""}" id="${list.id}-${index}" type="button" role="option" aria-selected="${index === activeIndex}" data-address-index="${index}"><i data-lucide="map-pin"></i><span><strong>${escapeAddressText(suggestion.title)}</strong><small>${escapeAddressText(suggestion.detail)}</small></span></button>`).join("");
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
      if (activeIndex >= 0) input.setAttribute("aria-activedescendant", `${list.id}-${activeIndex}`);
      refreshIcons();
    };

    input.addEventListener("input", () => {
      window.clearTimeout(timer);
      const query = input.value.trim();
      if (query.length < 3) {
        closeList();
        return;
      }
      const currentRequest = ++requestId;
      timer = window.setTimeout(async () => {
        try {
          const results = await getPassengerAddressSuggestions(query);
          if (currentRequest !== requestId) return;
          suggestions = results;
          activeIndex = -1;
          renderList();
        } catch (error) {
          if (currentRequest === requestId) closeList();
        }
      }, 240);
    });
    input.addEventListener("keydown", (event) => {
      if (list.hidden || !suggestions.length) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        activeIndex = Math.min(suggestions.length - 1, Math.max(0, activeIndex + direction));
        renderList();
      } else if (event.key === "Enter" && activeIndex >= 0) {
        event.preventDefault();
        chooseSuggestion(activeIndex);
      } else if (event.key === "Escape") {
        closeList();
      }
    });
    list.addEventListener("pointerdown", (event) => {
      const option = event.target.closest("[data-address-index]");
      if (!option) return;
      event.preventDefault();
      chooseSuggestion(Number(option.dataset.addressIndex));
    });
    document.addEventListener("pointerdown", (event) => {
      if (!input.parentElement.contains(event.target)) closeList();
    });
  });
}

async function getPassengerAddressSuggestions(query) {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("limit", "6");
  url.searchParams.set("lang", "en");
  url.searchParams.set("q", `${query}, Switzerland`);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Address search failed");
  const data = await response.json();
  return (data.features || []).filter((feature) => feature.properties?.countrycode === "CH").map((feature) => {
    const properties = feature.properties || {};
    const title = properties.name || [properties.street, properties.housenumber].filter(Boolean).join(" ") || properties.city || "Switzerland";
    const detail = [properties.street, properties.housenumber, properties.postcode, properties.city, properties.state].filter(Boolean).join(", ");
    return { title, detail: detail || "Switzerland", value: [title, detail].filter(Boolean).join(", ") };
  });
}

async function calculatePassengerRoute(pickup, destination) {
  const geocode = async (query) => {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("limit", "1");
    url.searchParams.set("lang", "en");
    url.searchParams.set("q", `${query}, Switzerland`);
    const response = await fetch(url);
    if (!response.ok) throw new Error("Geocoding failed");
    const feature = (await response.json()).features?.[0];
    if (!feature) throw new Error("Location not found");
    const [lon, lat] = feature.geometry.coordinates;
    return { lon, lat };
  };
  const [from, to] = await Promise.all([geocode(pickup), geocode(destination)]);
  const coordinates = `${from.lon},${from.lat};${to.lon},${to.lat}`;
  for (const base of ["https://router.project-osrm.org", "https://routing.openstreetmap.de/routed-car"]) {
    try {
      const response = await fetch(`${base}/route/v1/driving/${coordinates}?overview=false`);
      const route = response.ok ? (await response.json()).routes?.[0] : null;
      if (route) return { distanceKm: route.distance / 1000, durationSeconds: route.duration, from, to };
    } catch (error) {
      continue;
    }
  }
  throw new Error("Route not found");
}

function preferenceOption(name, value, label, current) {
  return `<label class="preference-choice"><input type="radio" name="${name}" value="${value}"${current === value ? " checked" : ""}><span>${label}</span></label>`;
}

function preferencesMarkup(preferences) {
  return `<form class="preferences-form" data-preferences-form><section><header><i data-lucide="volume-x"></i><div><h3>Ride atmosphere</h3><p>Choose how you prefer to travel.</p></div></header><div class="choice-row">${preferenceOption("atmosphere", "quiet", "Quiet ride", preferences.atmosphere)}${preferenceOption("atmosphere", "normal", "Normal", preferences.atmosphere)}${preferenceOption("atmosphere", "chat", "Happy to chat", preferences.atmosphere)}</div></section><section><header><i data-lucide="thermometer"></i><div><h3>Temperature</h3><p><output data-temperature-output>${preferences.temperature}°C</output></p></div></header><input class="temperature-range" type="range" name="temperature" min="18" max="24" value="${preferences.temperature}" aria-label="Preferred temperature"></section><section><header><i data-lucide="music-2"></i><div><h3>Music</h3><p>Your preferred cabin soundtrack.</p></div></header><div class="choice-row">${preferenceOption("music", "none", "No music", preferences.music)}${preferenceOption("music", "lounge", "Lounge", preferences.music)}${preferenceOption("music", "playlist", "My playlist", preferences.music)}</div></section><section><header><i data-lucide="glass-water"></i><div><h3>Water</h3><p>Prepared before pickup.</p></div></header><div class="choice-row">${preferenceOption("water", "still", "Still", preferences.water)}${preferenceOption("water", "sparkling", "Sparkling", preferences.water)}${preferenceOption("water", "no_preference", "No preference", preferences.water)}</div></section><section class="preference-toggle"><header><i data-lucide="badge-check"></i><div><h3>Airport pickup</h3><p>Driver waiting with a name sign.</p></div></header><label class="switch"><input type="checkbox" name="airportNameSign"${preferences.airportNameSign ? " checked" : ""}><span></span></label></section><button class="passenger-button passenger-button--primary preferences-save" type="submit">Save preferences</button></form>`;
}

async function renderProfile() {
  const passenger = await getPassenger();
  const preferences = await getSavedJourneyPreferences(passenger.preferences);
  const content = `
    <section class="profile-heading"><div class="profile-avatar">${[passenger.firstName, passenger.lastName].filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "SD"}</div><div><p>Passenger profile</p><h2>${passenger.firstName} ${passenger.lastName}</h2><span>${passenger.email}</span></div></section>
    <section class="profile-grid"><article class="profile-section"><header><h2>Personal information</h2><button type="button" data-demo-action="Edit profile">Edit</button></header><div class="profile-values"><div><span>Full name</span><strong>${passenger.firstName} ${passenger.lastName}</strong></div><div><span>Email</span><strong>${passenger.email}</strong></div><div><span>Telephone</span><strong>Not added</strong></div></div></article><article class="profile-section saved-places"><header><h2>Saved places</h2><button type="button" data-demo-action="Add place">Add place</button></header>${passenger.savedPlaces.map((place) => `<div><i data-lucide="${place.name === "Home" ? "house" : "briefcase-business"}"></i><span><strong>${place.name}</strong><small>${place.address}</small></span><button type="button" aria-label="Edit ${place.name}" data-demo-action="Edit place"><i data-lucide="pencil"></i></button></div>`).join("")}</article></section>
    <section class="preferences-section"><div class="section-heading section-heading--stack"><h2>Journey preferences</h2><p>Saved securely to your Space Drive passenger profile.</p></div>${preferencesMarkup(preferences)}</section>
    <section class="profile-grid profile-grid--settings"><article class="profile-section"><header><h2>Notifications</h2></header><label class="setting-row"><span><strong>Journey updates</strong><small>Driver and booking status</small></span><span class="switch"><input type="checkbox" checked><span></span></span></label><label class="setting-row"><span><strong>New offers</strong><small>Ride request proposals</small></span><span class="switch"><input type="checkbox" checked><span></span></span></label></article><article class="profile-section"><header><h2>Security</h2></header><div class="security-summary"><i data-lucide="shield-check"></i><div><strong>Account protection</strong><p>Authentication and magic link settings will be connected with the backend.</p></div></div><button class="passenger-button" type="button" data-demo-action="Security settings">Security settings</button></article></section>`;
  await withLayout({ active: "profile", title: "Profile", subtitle: "Personal settings", content });
  const form = document.querySelector("[data-preferences-form]");
  const range = form.querySelector("[name=temperature]");
  range.addEventListener("input", () => { form.querySelector("[data-temperature-output]").textContent = `${range.value}°C`; });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    await saveJourneyPreferences({ atmosphere: data.get("atmosphere"), temperature: Number(data.get("temperature")), music: data.get("music"), water: data.get("water"), airportNameSign: data.get("airportNameSign") === "on" });
    toast("Journey preferences saved.");
  });
}

async function render() {
  app.innerHTML = LoadingSkeleton(page);
  try {
    const renderers = { home: renderDashboard, trips: renderTrips, "trip-detail": renderTripDetails, requests: renderRequests, profile: renderProfile };
    await (renderers[page] || renderDashboard)();
  } catch (error) {
    console.error(error);
    app.innerHTML = ErrorState("Passenger portal is unavailable", "We could not load your journey data. Please try again.");
    refreshIcons();
  }
}

render();
let passengerRealtimeTimer;
subscribeToPassengerRides(() => { clearTimeout(passengerRealtimeTimer); passengerRealtimeTimer = setTimeout(render, 120); });
