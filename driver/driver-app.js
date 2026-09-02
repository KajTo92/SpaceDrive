import {
  getDriverAvailability,
  getDriverCurrentRide,
  getDriverNotifications,
  getDriverProfile,
  getDriverRideById,
  getDriverRides,
  getDriverSchedule,
  reportRideIssue,
  updateDriverAvailability,
  updateRideStatus,
  subscribeToDriverRides,
  deleteJourney,
} from "./services/driver-service.js?v=5";
import "./config.js";
import { currentProfile, requireRole, signOut, supabase } from "../shared/supabase-client.js";
import { openNavigation } from "./services/navigation-service.js?v=2";
import { LiveTripMap } from "../passenger/components/live-trip-map.js?v=5";
import { isClosedRideStatus, isTrackingRideStatus, statusLabel } from "../shared/ride-status.js?v=2";
import {
  DriverLayout,
  DriverMissionCard,
  DriverRideAction,
  DriverRideCard,
  DriverSchedule,
  DriverTripMap,
  EmptyState,
  ErrorState,
  FlightInfoCard,
  LoadingSkeleton,
  LocationPermissionCard,
  JourneyStatus,
  PassengerCard,
  PassengerPreferencesCard,
  QuickActions,
  RideIssueModal,
  assetUrl,
  driverRideUrl,
  driverUrl,
  formatDate,
  icon,
  setDriverRoot,
} from "./components/driver-components.js?v=8";

const app = document.querySelector("#driverApp");
const page = document.body.dataset.page || "home";
const root = document.body.dataset.root || "../";
setDriverRoot(root);
const signedInProfile = await currentProfile();
const { data: pendingApplication } = signedInProfile?.role === "passenger" ? await supabase.from("driver_applications").select("status").eq("user_id", signedInProfile.id).eq("status", "pending").maybeSingle() : { data: null };
const driverAccessPending = Boolean(pendingApplication);
if (driverAccessPending) {
  app.innerHTML = `<main class="driver-access-state"><img src="${root}spacedrive-monogram.png" alt="Space Drive"><span>Driver application received</span><h1>Your account is waiting for approval.</h1><p>You can continue using your Passenger Portal while dispatch reviews your application.</p><a class="driver-primary-button" href="${root}passenger/">Open Passenger Portal</a></main>`;
} else {
  await requireRole(["driver", "admin"], `${root}login.html`);
}
let activeRide = null;
let locationController = null;

function refreshIcons() {
  globalThis.lucide?.createIcons({ attrs: { "stroke-width": 1.65 } });
}

function toast(message, action) {
  document.querySelector(".driver-toast")?.remove();
  const node = document.createElement("div");
  node.className = "driver-toast";
  node.setAttribute("role", "status");
  node.innerHTML = `<span>${message}</span>${action ? `<button type="button" data-toast-action>${action}</button><button type="button" data-toast-close>Not now</button>` : ""}`;
  document.body.append(node);
  requestAnimationFrame(() => node.classList.add("is-visible"));
  node.querySelector("[data-toast-close]")?.addEventListener("click", () => node.remove());
  window.setTimeout(() => node.remove(), action ? 9000 : 3200);
  return node;
}

function locationStateChanged(state) {
  document.querySelectorAll("[data-location-toggle]").forEach((toggle) => {
    toggle.classList.toggle("is-on", state.isTracking);
    toggle.setAttribute("aria-checked", String(state.isTracking));
    const row = toggle.closest(".location-sharing-row");
    if (row) row.querySelector("small").textContent = state.isTracking ? "Active for this journey" : "Off";
  });
  document.querySelectorAll("[data-location-error]").forEach((message) => {
    message.hidden = !state.error;
    message.textContent = state.error?.message || "";
  });
}

function ensureLocationController(ride) {
  if (locationController) return locationController;
  locationController = { getState: () => ({ permission: "unsupported", isTracking: false, error: null }), start: async () => false, stop: () => {} };
  return locationController;
}

async function withLayout({ active, title, subtitle, content }) {
  const [driver, notifications, availability] = await Promise.all([getDriverProfile(), getDriverNotifications(), getDriverAvailability()]);
  app.innerHTML = DriverLayout({ active, title, subtitle, driver, availability, notifications, content });
  bindSharedInteractions();
}

function bindSharedInteractions() {
  const center = document.querySelector("[data-notification-center]");
  const trigger = document.querySelector("[data-notification-trigger]");
  const scrim = document.querySelector(".driver-notification-scrim");
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
  document.addEventListener("click", (event) => { if (!event.target.closest(".driver-account-wrap")) setAccountMenu(false); });
  document.querySelectorAll("[data-driver-availability]").forEach((select) => select.addEventListener("change", async () => {
    const status = await updateDriverAvailability(select.value);
    document.querySelectorAll("[data-driver-availability]").forEach((item) => { item.value = status; item.parentElement.className = `availability-control availability-control--${status}`; });
    toast(`Driver status changed to ${statusLabel(status)}.`);
  }));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") { setNotificationsOpen(false); setAccountMenu(false); } }, { once: true });
  bindRideInteractions();
  refreshIcons();
}

function bindRideInteractions() {
  bindRideActionButtons();
  document.querySelectorAll("[data-navigation]").forEach((button) => button.addEventListener("click", () => {
    if (!activeRide) return;
    const destination = button.dataset.destination === "destination" ? activeRide.destination : activeRide.pickup;
    try { openNavigation({ destination }); } catch (error) { toast(error.message); }
  }));
  document.querySelectorAll("[data-contact]").forEach((button) => button.addEventListener("click", () => toast("Passenger contact will be enabled when secure contact data is connected.")));
  document.querySelectorAll("[data-location-toggle]").forEach((button) => button.addEventListener("click", async () => {
    if (!activeRide || !isTrackingRideStatus(activeRide.status)) {
      toast("Live location is available only during an active journey.");
      return;
    }
    const controller = ensureLocationController(activeRide);
    if (controller.getState().isTracking) controller.stopTracking(); else await controller.startTracking();
  }));
  bindIssueModal();
}

function updateRideStatusInterface(ride) {
  document.querySelectorAll("[data-current-ride-status]").forEach((badge) => {
    badge.className = `driver-status-badge driver-status-badge--${ride.status}`;
    badge.textContent = statusLabel(ride.status);
  });
  document.querySelectorAll("[data-current-ride-status-label]").forEach((label) => {
    label.textContent = statusLabel(ride.status);
  });

  const progress = document.querySelector("[data-journey-progress]");
  if (progress) progress.innerHTML = JourneyStatus(ride.status);

  document.querySelectorAll("[data-ride-action-wrap]").forEach((wrap) => {
    const sticky = wrap.classList.contains("driver-ride-action--sticky");
    wrap.outerHTML = DriverRideAction(ride, sticky);
  });

  bindRideActionButtons();
  refreshIcons();
}

function bindRideActionButtons() {
  document.querySelectorAll("[data-ride-action]:not([data-ride-action-bound])").forEach((button) => {
    button.dataset.rideActionBound = "true";
    button.addEventListener("click", async () => {
    button.disabled = true;
    const previousStatus = activeRide?.status;
    const updated = await updateRideStatus(button.dataset.rideId, button.dataset.nextStatus);
    activeRide = updated;
    if (isClosedRideStatus(updated.status)) locationController?.stopTracking();
    if (["confirmed", "driver_assigned"].includes(previousStatus) && updated.status === "driver_on_the_way") {
      const prompt = toast("Enable live location sharing for this journey?", "Enable");
      prompt.querySelector("[data-toast-action]")?.addEventListener("click", async () => { await ensureLocationController(updated).startTracking(); prompt.remove(); });
    } else toast(`Journey status: ${statusLabel(updated.status)}.`);
      updateRideStatusInterface(updated);
    });
  });
}

function bindIssueModal() {
  const modal = document.querySelector("[data-issue-modal]");
  if (!modal) return;
  const open = () => { modal.hidden = false; modal.querySelector("input")?.focus(); };
  const close = () => { modal.hidden = true; document.querySelector("[data-report-problem]")?.focus(); };
  document.querySelectorAll("[data-report-problem]").forEach((button) => button.addEventListener("click", open));
  modal.querySelectorAll("[data-issue-close]").forEach((button) => button.addEventListener("click", close));
  modal.addEventListener("click", (event) => { if (event.target === modal) close(); });
  modal.querySelectorAll("[name=issueType]").forEach((input) => input.addEventListener("change", () => {
    const waiting = modal.querySelector("[data-waiting-options]");
    waiting.hidden = input.value !== "passenger_not_here";
    waiting.querySelectorAll("input").forEach((item) => { item.required = input.value === "passenger_not_here"; });
  }));
  modal.querySelector("[data-issue-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await reportRideIssue({ rideId: activeRide.id, type: data.get("issueType"), note: data.get("note"), waitingMinutes: data.get("waitingMinutes") ? Number(data.get("waitingMinutes")) : undefined });
    close();
    toast("Problem saved locally for dispatcher integration.");
  });
}

async function mountMap(ride) {
  for (const container of document.querySelectorAll("[data-live-map]")) await LiveTripMap(container, ride);
}

function todayRideLabel(ride, currentId) {
  if (ride.id === currentId) return "Next";
  return ride.status === "completed" ? "Completed" : statusLabel(ride.status);
}

async function renderHome() {
  const [currentRide, rides] = await Promise.all([getDriverCurrentRide(), getDriverRides()]);
  activeRide = currentRide;
  if (!currentRide) {
    const availability = await getDriverAvailability();
    await withLayout({ active: "home", title: "Mission control", subtitle: "Driver portal", content: availability === "offline" ? `${EmptyState("You're currently offline", "Go available when you are ready to receive journey assignments.", "power")}<button class="driver-primary-button" type="button" data-go-available>Go available</button>` : EmptyState("No rides today", "You're all clear for now.", "calendar-check") });
    document.querySelector("[data-go-available]")?.addEventListener("click", async () => { await updateDriverAvailability("available"); render(); });
    return;
  }
  const controller = ensureLocationController(currentRide);
  const location = controller.getState();
  const today = rides.filter((ride) => ride.pickupDate === "2026-08-29").sort((a, b) => a.pickupTime.localeCompare(b.pickupTime));
  const content = `
    <section class="driver-page-intro"><div><span>Good morning</span><h2>Ready for the next journey.</h2></div><time>${formatDate("2026-08-29", { weekday: "long", day: "numeric", month: "long" })}</time></section>
    <div class="driver-home-grid"><div>${DriverMissionCard(currentRide)}</div><div>${DriverTripMap(currentRide)}</div></div>
    <section class="driver-briefing-grid">${PassengerCard(currentRide)}${PassengerPreferencesCard(currentRide)}${FlightInfoCard(currentRide)}${LocationPermissionCard(location.permission, location.isTracking)}</section>
    ${QuickActions(currentRide)}
    <section class="driver-today"><header><div><span>Today</span><h2>${today.length} journeys</h2></div><a href="${driverUrl("rides/")}">View all ${icon("arrow-right")}</a></header><div>${today.map((ride) => DriverRideCard(ride, todayRideLabel(ride, currentRide.id))).join("")}</div></section>
    ${RideIssueModal(currentRide)}`;
  await withLayout({ active: "home", title: "Mission control", subtitle: "Driver portal", content });
  await mountMap(currentRide);
}

async function renderRides() {
  const rides = await getDriverRides();
  activeRide = rides.find((ride) => !isClosedRideStatus(ride.status)) || null;
  const today = rides.filter((ride) => ride.pickupDate === "2026-08-29");
  const upcoming = rides.filter((ride) => ride.pickupDate > "2026-08-29" && !isClosedRideStatus(ride.status));
  const completed = rides.filter((ride) => ride.status === "completed");
  const groups = { today, upcoming, completed };
  const content = `<section class="driver-page-heading"><span>Journeys</span><h2>Rides</h2><p>Scan the route, passenger and current journey state at a glance.</p></section><div class="driver-segmented" role="tablist" aria-label="Ride filter">${Object.entries(groups).map(([key, list], index) => `<button class="${index === 0 ? "is-active" : ""}" type="button" role="tab" aria-selected="${index === 0}" data-ride-filter="${key}">${key[0].toUpperCase() + key.slice(1)} <span>${list.length}</span></button>`).join("")}</div>${Object.entries(groups).map(([key, list], index) => `<section class="driver-ride-list" data-ride-panel="${key}"${index === 0 ? "" : " hidden"}>${list.length ? list.map((ride) => DriverRideCard(ride)).join("") : EmptyState(key === "today" ? "No rides today" : `No ${key} rides`, key === "completed" ? "Completed journeys will appear here." : "No journeys assigned yet.")}</section>`).join("")}`;
  await withLayout({ active: "rides", title: "Rides", subtitle: "Journey list", content });
  document.querySelectorAll("[data-ride-filter]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-ride-filter]").forEach((item) => { const selected = item === button; item.classList.toggle("is-active", selected); item.setAttribute("aria-selected", String(selected)); });
    document.querySelectorAll("[data-ride-panel]").forEach((panel) => { panel.hidden = panel.dataset.ridePanel !== button.dataset.rideFilter; });
  }));
}

async function renderRideDetails() {
  const rideId = new URLSearchParams(location.search).get("id");
  const ride = rideId ? await getDriverRideById(rideId) : null;
  activeRide = ride;
  if (!ride) {
    await withLayout({ active: "rides", title: "Ride details", subtitle: "Journey not found", content: ErrorState("Ride not found", "This ride ID is invalid or the journey is no longer assigned to you.") });
    return;
  }
  const permission = ensureLocationController(ride).getState();
  const completion = ride.status === "completed" ? `<section class="completion-summary"><div><span>Completed at</span><strong>${ride.completedAt || "Not recorded"}</strong></div><div><span>Duration</span><strong>${ride.estimatedDuration || "Not recorded"}</strong></div><div><span>Distance</span><strong>${ride.distance || "Not recorded"}</strong></div></section>` : "";
  const content = `<a class="driver-back-link" href="${driverUrl("rides/")}">${icon("arrow-left")} Back to rides</a><section class="driver-detail-hero"><div><span>${formatDate(ride.pickupDate, { weekday: "long", day: "numeric", month: "long" })} at ${ride.pickupTime}</span><h2>${ride.pickup.name}${icon("arrow-right")}${ride.destination.name}</h2></div><span class="driver-status-badge driver-status-badge--${ride.status}" data-current-ride-status>${statusLabel(ride.status)}</span></section>${completion}<section class="driver-detail-status"><header><h2>Journey status</h2><strong data-current-ride-status-label>${statusLabel(ride.status)}</strong></header>${DriverRideAction(ride)} </section>${DriverTripMap(ride)}<section class="driver-detail-grid">${PassengerCard(ride)}${PassengerPreferencesCard(ride)}${FlightInfoCard(ride)}${LocationPermissionCard(permission.permission, permission.isTracking)}</section><section class="driver-journey-facts"><div><span>Pickup</span><strong>${ride.pickup.address}</strong></div><div><span>Destination</span><strong>${ride.destination.address}</strong></div><div><span>Vehicle</span><strong>${ride.vehicle ? `${ride.vehicle.brand} ${ride.vehicle.model}` : "Not assigned"}</strong></div><div><span>Notes</span><strong>${ride.notes || "No notes"}</strong></div></section>${QuickActions(ride)}${RideIssueModal(ride)}<section class="driver-danger-zone"><div><strong>Delete journey</strong><span>Permanently remove this journey and its updates.</span></div><button class="driver-secondary-button driver-secondary-button--danger" type="button" data-delete-journey>${icon("trash-2")} Delete journey</button></section>${DriverRideAction(ride, true)}`;
  await withLayout({ active: "rides", title: "Ride details", subtitle: ride.id.toUpperCase(), content });
  await mountMap(ride);
  document.querySelector("[data-delete-journey]")?.addEventListener("click", async () => { if (!window.confirm("Delete this journey permanently? This action cannot be undone.")) return; try { await deleteJourney(ride.id); location.href = driverUrl("rides/"); } catch (error) { toast(error.message); } });
}

async function renderSchedulePage() {
  const rides = await getDriverSchedule();
  activeRide = rides.find((ride) => !isClosedRideStatus(ride.status)) || null;
  const views = {
    today: rides.filter((ride) => ride.pickupDate === "2026-08-29"),
    tomorrow: rides.filter((ride) => ride.pickupDate === "2026-08-30"),
    week: rides.filter((ride) => ride.pickupDate >= "2026-08-29" && ride.pickupDate <= "2026-09-04"),
  };
  const content = `<section class="driver-page-heading"><span>Working plan</span><h2>Schedule</h2><p>Your pickups and routes without calendar clutter.</p></section><div class="driver-segmented" role="tablist" aria-label="Schedule period">${Object.keys(views).map((key, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button" role="tab" aria-selected="${index === 0}" data-schedule-filter="${key}">${key === "week" ? "This week" : key[0].toUpperCase() + key.slice(1)}</button>`).join("")}</div>${Object.entries(views).map(([key, list], index) => `<section data-schedule-panel="${key}"${index === 0 ? "" : " hidden"}>${DriverSchedule(list)}</section>`).join("")}`;
  await withLayout({ active: "schedule", title: "Schedule", subtitle: "Driver calendar", content });
  document.querySelectorAll("[data-schedule-filter]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-schedule-filter]").forEach((item) => { const selected = item === button; item.classList.toggle("is-active", selected); item.setAttribute("aria-selected", String(selected)); });
    document.querySelectorAll("[data-schedule-panel]").forEach((panel) => { panel.hidden = panel.dataset.schedulePanel !== button.dataset.scheduleFilter; });
  }));
}

async function renderPassengerPage() {
  const ride = await getDriverCurrentRide();
  activeRide = ride;
  const content = ride ? `<section class="driver-page-heading"><span>Current journey</span><h2>Passenger briefing</h2><p>Contact and cabin preferences for the next pickup.</p></section><section class="driver-detail-grid driver-detail-grid--passenger">${PassengerCard(ride)}${PassengerPreferencesCard(ride)}${FlightInfoCard(ride)}</section>${QuickActions(ride)}${RideIssueModal(ride)}` : EmptyState("No passenger assigned", "Passenger details appear with your next active journey.", "user-round");
  await withLayout({ active: "rides", title: "Passenger", subtitle: "Mission contact", content });
}

async function renderProfile() {
  const [driver, availability] = await Promise.all([getDriverProfile(), getDriverAvailability()]);
  const currentRide = await getDriverCurrentRide();
  activeRide = currentRide;
  const location = ensureLocationController(currentRide).getState();
  const vehicle = currentRide?.vehicle;
  const content = `<section class="driver-profile-hero"><img src="${assetUrl(driver.photo)}" alt="Portrait of ${driver.name}"><div><span>Driver profile</span><h2>${driver.name}</h2><p>${driver.email}</p></div></section><section class="driver-profile-grid"><article class="driver-setting-card"><header>${icon("id-card")}<div><span>Personal information</span><h2>${driver.name}</h2></div></header><dl><div><dt>Role</dt><dd>${driver.role}</dd></div><div><dt>Languages</dt><dd>${driver.languages.join(", ")}</dd></div><div><dt>Driver status</dt><dd>${statusLabel(getDriverAvailability())}</dd></div></dl></article>${vehicle ? `<article class="driver-setting-card vehicle-assignment"><header>${icon("car-front")}<div><span>Assigned vehicle</span><h2>${vehicle.brand} ${vehicle.model}</h2></div></header><img src="${assetUrl(vehicle.image)}" alt="${vehicle.brand} ${vehicle.model}"><dl><div><dt>Class</dt><dd>${vehicle.category}</dd></div><div><dt>Plate</dt><dd>${vehicle.plate || "Not assigned"}</dd></div></dl></article>` : EmptyState("No assigned vehicle", "Dispatch has not assigned a vehicle yet.", "car-front")}${LocationPermissionCard(location.permission, location.isTracking)}<article class="driver-setting-card"><header>${icon("bell")}<div><span>Notifications</span><h2>Journey updates</h2></div></header><label class="driver-setting-row"><span><strong>Operational updates</strong><small>Assignments, pickup changes and flight updates</small></span><input type="checkbox" checked aria-label="Operational updates"></label></article><article class="driver-setting-card"><header>${icon("shield-check")}<div><span>Security</span><h2>Driver account</h2></div></header><p>Authentication and device security are ready for backend connection.</p><button class="driver-secondary-button" type="button" data-demo>Security settings</button></article><article class="driver-setting-card"><header>${icon("settings-2")}<div><span>App preferences</span><h2>Driver experience</h2></div></header><label class="driver-setting-row"><span><strong>Stable mission layout</strong><small>Keep journey details visible when its status changes</small></span><input type="checkbox" checked disabled aria-label="Stable mission layout"></label></article></section>`;
  await withLayout({ active: "profile", title: "Profile", subtitle: "Driver settings", content });
  document.querySelector("[data-demo]")?.addEventListener("click", () => toast("Security settings are ready for authentication integration."));
}

async function render() {
  app.innerHTML = LoadingSkeleton(page);
  try {
    const renderers = { home: renderHome, rides: renderRides, "ride-detail": renderRideDetails, schedule: renderSchedulePage, passenger: renderPassengerPage, profile: renderProfile };
    await (renderers[page] || renderHome)();
  } catch (error) {
    console.error(error);
    app.innerHTML = ErrorState("Driver portal is unavailable", "Journey data could not be loaded. Please try again.");
    refreshIcons();
  }
}

if (!driverAccessPending) {
  render();
  let driverRealtimeTimer;
  subscribeToDriverRides(() => { clearTimeout(driverRealtimeTimer); driverRealtimeTimer = setTimeout(render, 120); });
}
