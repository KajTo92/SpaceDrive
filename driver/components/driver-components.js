import { getDriverRideAction, journeyStages, statusLabel } from "../../shared/ride-status.js?v=2";
import { resolveAssetUrl } from "../../shared/asset-url.js";

let rootPath = "../";
export const setDriverRoot = (path) => { rootPath = path; };
export const assetUrl = (path) => resolveAssetUrl(path, rootPath);
export const driverUrl = (path = "") => `${rootPath}driver/${path}`;
export const driverRideUrl = (id) => driverUrl(`rides/detail.html?id=${encodeURIComponent(id)}`);
export const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
export const statusText = statusLabel;
export const formatDate = (value, options = { day: "2-digit", month: "short" }) => new Intl.DateTimeFormat("en-GB", options).format(new Date(`${value}T12:00:00`));

export function DriverLayout({ active, title, subtitle, driver, availability, notifications, content }) {
  const unread = notifications.filter((item) => !item.read).length;
  const nav = [
    ["home", "", "house", "Home"],
    ["rides", "rides/", "route", "Rides"],
    ["schedule", "schedule/", "calendar-days", "Schedule"],
    ["profile", "profile/", "user-round", "Profile"],
  ];
  const navItems = nav.map(([key, path, glyph, label]) => `<a class="driver-nav__item${active === key ? " is-active" : ""}" href="${driverUrl(path)}"${active === key ? ' aria-current="page"' : ""}>${icon(glyph)}<span>${label}</span></a>`).join("");
  const initials = driver.name.split(" ").map((part) => part[0]).join("").slice(0, 2);
  return `
    <a class="driver-skip" href="#driverContent">Skip to content</a>
    <div class="driver-shell">
      <aside class="driver-sidebar" aria-label="Driver navigation">
        <a class="driver-brand" href="${driverUrl()}"><img src="${assetUrl("spacedrive-monogram-header.png")}" alt="" width="426" height="640"><span>Space Drive<small>Driver</small></span></a>
        <nav class="driver-nav">${navItems}</nav>
        <div class="driver-sidebar__status">${DriverAvailability(availability, true)}</div>
      </aside>
      <div class="driver-workspace">
        <header class="driver-header">
          <div class="driver-header__title"><span>${subtitle || "Driver portal"}</span><h1>${title}</h1></div>
          <div class="driver-header__actions">
            <div class="header-availability">${DriverAvailability(availability)}</div>
            <button class="driver-icon-button notification-trigger" type="button" aria-label="Open notifications" aria-expanded="false" data-notification-trigger>${icon("bell")}${unread ? `<span>${unread}</span>` : ""}</button>
            <div class="driver-account-wrap"><button class="driver-profile-chip" type="button" aria-label="Open account menu" aria-expanded="false" data-account-trigger><span>${initials}</span><strong>${driver.shortName || driver.name}</strong>${icon("chevron-down")}</button><div class="driver-account-menu" data-account-menu hidden><a href="${driverUrl("profile/")}">${icon("user-round")} Profile</a><button type="button" data-account-signout>${icon("log-out")} Log out</button></div></div>
          </div>
        </header>
        <main class="driver-content" id="driverContent">${content}</main>
      </div>
      <nav class="driver-mobile-nav" aria-label="Driver navigation">${navItems}</nav>
      ${DriverNotificationCenter(notifications)}
    </div>`;
}

export function DriverAvailability(status, compact = false) {
  const labels = { available: "Available", busy: "Busy", offline: "Offline" };
  return `<label class="driver-availability${compact ? " driver-availability--stack" : ""}"><span>${compact ? "Driver status" : "Status"}</span><span class="availability-control availability-control--${status}"><i aria-hidden="true"></i><select data-driver-availability aria-label="Driver status">${Object.entries(labels).map(([value, label]) => `<option value="${value}"${value === status ? " selected" : ""}>${label}</option>`).join("")}</select>${icon("chevron-down")}</span></label>`;
}

export function DriverNotificationCenter(notifications) {
  return `<div class="driver-notification-scrim" data-notification-close hidden></div><aside class="driver-notification-center" aria-label="Driver notifications" aria-hidden="true" data-notification-center><header><div><span>Operations</span><h2>Notifications</h2></div><button class="driver-icon-button" type="button" aria-label="Close notifications" data-notification-close>${icon("x")}</button></header><div class="driver-notification-list">${notifications.length ? notifications.map((note) => `<article class="driver-notification${note.read ? "" : " is-unread"}">${icon(note.priority === "important" ? "alarm-clock" : "bell")}<div><strong>${note.title}</strong><p>${note.body}</p><time>${formatDate(note.createdAt.slice(0, 10), { day: "numeric", month: "short" })}</time></div></article>`).join("") : EmptyState("No notifications", "Operational updates will appear here.", "bell")}</div></aside>`;
}

export function JourneyStatus(status) {
  if (status === "cancelled") return `<div class="driver-cancelled">${icon("circle-x")}<strong>Journey cancelled</strong></div>`;
  const current = journeyStages.findIndex(([key]) => key === status);
  return `<div class="driver-journey-status" aria-label="Journey status: ${statusLabel(status)}">${journeyStages.slice(1).map(([key, label], index) => {
    const stageIndex = journeyStages.findIndex(([value]) => value === key);
    return `<div class="driver-journey-status__step${stageIndex < current ? " is-complete" : ""}${stageIndex === current ? " is-current" : ""}"><span>${stageIndex < current ? icon("check") : ""}</span><small>${label}</small></div>`;
  }).join("")}</div>`;
}

export function DriverRideAction(ride, sticky = false) {
  const action = getDriverRideAction(ride.status);

  if (sticky) {
    if (!action) {
      const complete = ride.status === "completed";
      return `<div class="driver-ride-action driver-ride-action--sticky is-finished">${icon(complete ? "badge-check" : "circle-x")}<span><strong>${complete ? "Journey completed" : "No action required"}</strong><small>${complete ? "Ride details remain available." : "This journey is not active."}</small></span></div>`;
    }

    return `<div class="driver-ride-action driver-ride-action--sticky" data-ride-action-wrap><button type="button" data-ride-action data-ride-id="${ride.id}" data-next-status="${action.nextStatus}">${icon(action.icon)}<span>${action.label}</span>${icon("arrow-right")}</button></div>`;
  }

  if (ride.status === "cancelled") {
    return `<div class="driver-ride-action is-finished">${icon("circle-x")}<span><strong>Journey cancelled</strong><small>No further action is required.</small></span></div>`;
  }

  const stages = [
    { status: "driver_on_the_way", label: "Start driving to passenger", glyph: "navigation" },
    { status: "driver_arrived", label: "I have arrived", glyph: "map-pin-check" },
    { status: "passenger_onboard", label: "Passenger on board", glyph: "user-check" },
    { status: "completed", label: "Complete journey", glyph: "badge-check" },
  ];
  const currentIndex = stages.findIndex((stage) => stage.status === ride.status);
  const nextStatus = action?.nextStatus;

  return `<div class="driver-ride-action driver-ride-action--steps" data-ride-action-wrap>
    <span class="ride-stage-title">Update journey</span>
    <div class="ride-stage-buttons" aria-label="Journey stages">
      ${stages.map((stage, index) => {
        const complete = currentIndex > index;
        const current = currentIndex === index;
        const rollback = currentIndex > index;
        const next = stage.status === nextStatus;
        const stateClass = current ? " is-current" : rollback ? " is-complete is-rollback" : next ? " is-next" : "";
        const attrs = rollback || next
          ? ` data-ride-action data-ride-id="${ride.id}" data-next-status="${stage.status}"${rollback ? ` aria-label="Return journey to ${stage.label}"` : ""}`
          : ` disabled${current ? ' aria-current="step"' : ""}`;
        const leadingIcon = current || complete ? "check" : stage.glyph;
        return `<button type="button" class="ride-stage-button${stateClass}"${attrs}>${icon(leadingIcon)}<span>${stage.label}</span>${rollback ? icon("undo-2") : next ? icon("arrow-right") : ""}</button>`;
      }).join("")}
    </div>
    <small>Current status: ${statusLabel(ride.status)}</small>
  </div>`;
}

export function DriverMissionCard(ride) {
  const passenger = ride.passenger?.name || "Passenger details pending";
  return `<section class="driver-mission" aria-labelledby="missionTitle" data-current-ride-id="${ride.id}">
    <header class="driver-mission__header"><div><span>Next journey</span><p>${nextRideCountdown(ride)}</p></div><span class="driver-status-badge driver-status-badge--${ride.status}" data-current-ride-status>${statusLabel(ride.status)}</span></header>
    <div class="driver-mission__route"><div><span>Pickup</span><h2 id="missionTitle">${ride.pickup.name}</h2><small>${ride.pickup.address}</small></div><time><small>${formatDate(ride.pickupDate, { weekday: "short", day: "numeric", month: "short" })}</small><strong>${ride.pickupTime}</strong></time><div><span>Destination</span><h3>${ride.destination.name}</h3><small>${ride.estimatedDuration || "Duration pending"}</small></div></div>
    <div class="driver-mission__brief"><div>${icon("user-round")}<span><small>Passenger</small><strong>${passenger}</strong></span></div><div>${icon("users-round")}<span><small>Passengers</small><strong>${ride.passengers}</strong></span></div><div>${icon("luggage")}<span><small>Luggage</small><strong>${ride.luggage || "Not provided"}</strong></span></div><div>${icon("plane")}<span><small>Flight</small><strong>${ride.flight?.flightNumber || ride.flightNumber || "Not provided"}</strong></span></div></div>
    <div class="driver-mission__status"><span>Journey progress</span><div data-journey-progress>${JourneyStatus(ride.status)}</div></div>
    ${DriverRideAction(ride)}
  </section>`;
}

export function DriverTripMap(ride) {
  return `<section class="driver-map-section"><div class="driver-map-header"><div><span>Route</span><h2>${ride.pickup.name} to ${ride.destination.name}</h2></div></div><div class="driver-trip-map live-trip-map" data-live-map data-ride-id="${ride.id}"></div><div class="driver-map-actions"><button type="button" data-navigation data-destination="pickup">${icon("map-pin")} Pickup</button><button type="button" data-navigation data-destination="destination">${icon("flag")} Destination</button></div></section>`;
}

export function PassengerPreferencesCard(ride) {
  const preferences = [...(ride.preferences || []), ...(ride.specialRequests || [])];
  return `<article class="driver-info-card passenger-preferences"><header>${icon("sliders-horizontal")}<div><span>Passenger preferences</span><h2>Prepare the cabin</h2></div></header>${preferences.length ? `<ul>${preferences.map((item) => `<li>${icon("check")}<span>${item}</span></li>`).join("")}</ul>` : `<p class="driver-muted">No special preferences</p>`}</article>`;
}

export function PassengerCard(ride) {
  const passenger = ride.passenger;
  if (!passenger) return EmptyState("Passenger data pending", "Passenger details will appear when dispatch confirms the journey.", "user-round");
  const enabled = Boolean(passenger.phone);
  return `<article class="driver-info-card passenger-card"><header><div class="passenger-card__avatar">${passenger.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><div><span>Passenger</span><h2>${passenger.name}</h2><p>${ride.passengers} ${ride.passengers === 1 ? "passenger" : "passengers"}<br>${ride.luggage || "Luggage not provided"}</p></div></header><div class="passenger-contact-actions"><button type="button" data-contact="call"${enabled ? "" : " disabled"}>${icon("phone")} Call</button><button type="button" data-contact="message"${enabled ? "" : " disabled"}>${icon("message-circle")} Message</button><button type="button" data-contact="whatsapp"${enabled ? "" : " disabled"}>${icon("message-square")} WhatsApp</button></div>${enabled ? "" : '<small class="driver-muted">Contact details are not connected.</small>'}</article>`;
}

export function FlightInfoCard(ride) {
  const flight = ride.flight;
  if (!flight) return `<article class="driver-info-card flight-card"><header>${icon("plane")}<div><span>Flight information</span><h2>Not provided</h2></div></header><p class="driver-muted">No flight is linked to this journey.</p></article>`;
  return `<article class="driver-info-card flight-card"><header>${icon("plane")}<div><span>Flight information</span><h2>${flight.airline || "Flight"} ${flight.flightNumber}</h2></div><strong class="flight-state">${flight.status || "Status pending"}</strong></header><div class="flight-grid"><div><span>Scheduled arrival</span><strong>${flight.scheduledArrival || "Pending"}</strong></div><div><span>Estimated</span><strong>${flight.estimatedArrival || "Pending"}</strong></div><div><span>Terminal</span><strong>${flight.terminal || "Pending"}</strong></div></div></article>`;
}

export function QuickActions(ride) {
  return `<section class="driver-quick-actions" aria-label="Quick actions" data-quick-actions><button type="button" data-navigation data-destination="pickup">${icon("navigation")}<span>Navigate to pickup</span></button><button type="button" data-navigation data-destination="destination">${icon("flag")}<span>Navigate to destination</span></button><button type="button" data-contact="call"${ride.passenger?.phone ? "" : " disabled"}>${icon("phone")}<span>Call passenger</span></button><button type="button" data-contact="message"${ride.passenger?.phone ? "" : " disabled"}>${icon("message-circle")}<span>Message</span></button><button type="button" data-report-problem data-ride-id="${ride.id}">${icon("triangle-alert")}<span>Report problem</span></button></section>`;
}

export function RideIssueModal(ride) {
  const issues = [["passenger_not_here", "Passenger not here"], ["traffic_delay", "Traffic delay"], ["pickup_issue", "Pickup issue"], ["vehicle_problem", "Vehicle problem"], ["other", "Other"]];
  return `<div class="driver-modal-backdrop" data-issue-modal hidden><section class="driver-issue-sheet" role="dialog" aria-modal="true" aria-labelledby="issueTitle"><header><div><span>Journey ${ride.id.toUpperCase()}</span><h2 id="issueTitle">Report a problem</h2></div><button class="driver-icon-button" type="button" aria-label="Close dialog" data-issue-close>${icon("x")}</button></header><form data-issue-form><fieldset><legend>What happened?</legend><div class="issue-options">${issues.map(([value, label]) => `<label><input type="radio" name="issueType" value="${value}" required><span>${label}</span></label>`).join("")}</div></fieldset><fieldset class="waiting-options" data-waiting-options hidden><legend>How long have you been waiting?</legend><div>${[5, 10, 15].map((value) => `<label><input type="radio" name="waitingMinutes" value="${value}"><span>${value === 15 ? "15+ min" : `${value} min`}</span></label>`).join("")}</div><p>Contact the passenger first. Dispatch can be notified after the report is saved.</p></fieldset><label class="issue-note"><span>Optional note</span><textarea name="note" rows="3" placeholder="Add useful details for dispatch"></textarea></label><div class="issue-sheet__actions"><button class="driver-secondary-button" type="button" data-issue-close>Cancel</button><button class="driver-primary-button" type="submit">Save report</button></div></form></section></div>`;
}

export function DriverRideCard(ride, label) {
  const passenger = ride.passenger?.name || "Passenger pending";
  return `<article class="driver-ride-card"><a href="${driverRideUrl(ride.id)}"><time><strong>${ride.pickupTime}</strong><span>${formatDate(ride.pickupDate, { weekday: "short", day: "numeric", month: "short" })}</span></time><div class="driver-ride-card__route"><span>${ride.pickup.name}</span>${icon("arrow-right")}<strong>${ride.destination.name}</strong><small>${passenger}<br>${ride.vehicle ? `${ride.vehicle.brand} ${ride.vehicle.model}` : "Vehicle pending"}</small></div><span class="driver-status-badge driver-status-badge--${ride.status}">${label || statusLabel(ride.status)}</span>${icon("chevron-right")}</a></article>`;
}

export function DriverSchedule(rides) {
  return `<div class="driver-schedule">${rides.length ? rides.map((ride) => `<div class="schedule-event"><time>${ride.pickupTime}</time><span></span><div><a href="${driverRideUrl(ride.id)}"><strong>${ride.pickup.name}</strong>${icon("arrow-right")}<strong>${ride.destination.name}</strong></a><p>${ride.passenger?.name || "Passenger pending"}</p></div><span class="driver-status-badge driver-status-badge--${ride.status}">${statusLabel(ride.status)}</span></div>`).join("") : EmptyState("No rides in this period", "You're all clear for now.", "calendar-check")}</div>`;
}

export function LocationPermissionCard(permission, tracking = false) {
  const labels = { granted: "Granted", denied: "Denied", prompt: "Not requested", unavailable: "Unavailable" };
  return `<article class="driver-setting-card location-permission-card"><header>${icon("locate-fixed")}<div><span>Location permission</span><h2>${labels[permission] || "Not requested"}</h2></div></header><p>Location is shared only during an active journey and only after you enable it.</p><div class="location-sharing-row"><span><strong>Share live location</strong><small>${tracking ? "Active for this journey" : "Off"}</small></span><button class="driver-toggle${tracking ? " is-on" : ""}" type="button" role="switch" aria-checked="${tracking}" data-location-toggle><span></span></button></div><p class="location-error" data-location-error hidden></p></article>`;
}

export function LoadingSkeleton(type = "home") {
  return `<div class="driver-loading driver-loading--${type}" aria-label="Loading driver portal"><div class="driver-skeleton driver-skeleton--heading"></div><div class="driver-skeleton driver-skeleton--mission"></div><div class="driver-skeleton-grid"><div class="driver-skeleton"></div><div class="driver-skeleton"></div></div></div>`;
}

export function EmptyState(title, body, glyph = "route") {
  return `<div class="driver-empty-state">${icon(glyph)}<h2>${title}</h2><p>${body}</p></div>`;
}

export function ErrorState(title, body) {
  return `<div class="driver-error-state">${icon("circle-alert")}<h2>${title}</h2><p>${body}</p><a class="driver-primary-button" href="${driverUrl()}">Back to home</a></div>`;
}

export function nextRideCountdown(ride) {
  const pickup = new Date(`${ride.pickupDate}T${ride.pickupTime}:00`);
  const minutes = Math.round((pickup.getTime() - Date.now()) / 60000);
  if (minutes <= 0) return "Pickup window active";
  if (minutes < 60) return `Pickup in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `Next ride in ${hours}h ${remaining}m`;
}
