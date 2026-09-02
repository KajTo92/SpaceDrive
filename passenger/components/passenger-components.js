import { journeyStages, statusLabel } from "../../shared/ride-status.js?v=2";
import { resolveAssetUrl } from "../../shared/asset-url.js";
import { serviceType } from "../../shared/service-type.js";

let rootPath = "../";

export function setPassengerRoot(path) {
  rootPath = path;
}

export const assetUrl = (path) => resolveAssetUrl(path, rootPath);
export const passengerUrl = (path = "") => `${rootPath}passenger/${path}`;
export const tripUrl = (id) => passengerUrl(`trips/detail.html?id=${encodeURIComponent(id)}`);

export { statusLabel };
export const money = (ride) => ride.price ? `${ride.currency} ${ride.price.toLocaleString("en-CH")}` : "Quote pending";
export const formatDate = (value, options = { day: "2-digit", month: "short" }) => new Intl.DateTimeFormat("en-GB", options).format(new Date(`${value}T12:00:00`));

function icon(name) {
  return `<i data-lucide="${name}" aria-hidden="true"></i>`;
}

export function ServiceTypeBadge(ride) {
  const service = serviceType(ride);
  return `<span class="service-type-badge service-type-badge--${service.key}">${icon(service.icon)}${service.label}</span>`;
}

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
const passengerInitials = (passenger) => [passenger?.firstName, passenger?.lastName].filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "SD";

function journeyPlace(location = {}) {
  const name = String(location.name || "").trim();
  const address = String(location.address || "").trim();
  let headline = name || address;
  let detail = address && address !== name ? address : "";

  if (!detail && headline.includes(",")) {
    const [first, ...rest] = headline.split(",");
    headline = first.trim();
    detail = rest.join(",").trim();
  } else if (detail.toLocaleLowerCase().startsWith(`${headline.toLocaleLowerCase()},`)) {
    detail = detail.slice(headline.length + 1).trim();
  }

  return `<span class="journey-route-place"><strong>${escapeHtml(headline)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</span>`;
}

export function PassengerLayout({ active, title, subtitle, passenger, notifications, content }) {
  const unread = notifications.filter((item) => !item.read).length;
  const nav = [
    ["home", "", "house", "Home"],
    ["trips", "trips/", "calendar-days", "Trips"],
    ["requests", "requests/", "send", "Requests"],
    ["profile", "profile/", "user-round", "Profile"],
  ];
  const navItems = nav.map(([key, path, glyph, label]) => `<a class="passenger-nav__item${active === key ? " is-active" : ""}" href="${passengerUrl(path)}"${active === key ? ' aria-current="page"' : ""}>${icon(glyph)}<span>${label}</span></a>`).join("");

  return `
    <a class="passenger-skip" href="#passengerContent">Skip to content</a>
    <div class="passenger-shell">
      <aside class="passenger-sidebar" aria-label="Passenger navigation">
        <a class="passenger-brand" href="${passengerUrl()}"><img src="${assetUrl("spacedrive-monogram-header.png")}" alt="" width="426" height="640"><span>Space Drive</span></a>
        <nav class="passenger-nav">${navItems}</nav>
        <div class="passenger-sidebar__service"><span>Private service</span><strong>Available 24/7</strong><a href="${passengerUrl("requests/")}">Request a journey ${icon("arrow-up-right")}</a></div>
      </aside>
      <div class="passenger-workspace">
        <header class="passenger-header">
          <div><p>${subtitle || "Passenger portal"}</p><h1>${title}</h1></div>
          <div class="passenger-header__actions">
            <button class="icon-button notification-trigger" type="button" aria-label="Open notifications" aria-expanded="false" data-notification-trigger>${icon("bell")} ${unread ? `<span>${unread}</span>` : ""}</button>
            <div class="account-menu-wrap"><button class="profile-chip" type="button" aria-label="Open account menu" aria-expanded="false" data-account-trigger><span>${passengerInitials(passenger)}</span><strong>${escapeHtml([passenger?.firstName, passenger?.lastName].filter(Boolean).join(" ") || "Passenger")}</strong>${icon("chevron-down")}</button><div class="account-menu" data-account-menu hidden><a href="${passengerUrl("profile/")}">${icon("user-round")} Profile</a><button type="button" data-account-signout>${icon("log-out")} Log out</button></div></div>
          </div>
        </header>
        <main class="passenger-content" id="passengerContent">${content}</main>
      </div>
      <nav class="passenger-mobile-nav" aria-label="Passenger navigation">${navItems}</nav>
      ${NotificationCenter(notifications)}
    </div>`;
}

export function NotificationCenter(notifications) {
  return `
    <div class="notification-scrim" data-notification-close hidden></div>
    <aside class="notification-center" aria-label="Notifications" aria-hidden="true" data-notification-center>
      <header><div><span>Updates</span><h2>Notifications</h2></div><button class="icon-button" type="button" aria-label="Close notifications" data-notification-close>${icon("x")}</button></header>
      <div class="notification-list">${notifications.length ? notifications.map((note) => `<article class="notification-item${note.read ? "" : " is-unread"}"><span>${icon(note.rideId ? "car-front" : "mail")}</span><div><strong>${note.title}</strong><p>${note.body}</p><time>${formatDate(note.createdAt.slice(0, 10), { day: "numeric", month: "short" })}</time></div></article>`).join("") : EmptyState("No notifications", "Journey updates will appear here.", "bell")}</div>
    </aside>`;
}

export function JourneyStatus(status) {
  if (status === "cancelled") return `<div class="journey-cancelled">${icon("circle-x")}<div><strong>Journey cancelled</strong><span>Please contact Space Drive if you need assistance.</span></div></div>`;
  const current = journeyStages.findIndex(([key]) => key === status);
  return `<div class="journey-status" aria-label="Journey status: ${statusLabel(status)}">${journeyStages.map(([key, label], index) => `<div class="journey-status__step${index < current ? " is-complete" : ""}${index === current ? " is-current" : ""}"><span>${index < current ? icon("check") : ""}</span><small>${label}</small></div>`).join("")}</div>`;
}

export function NextJourneyCard(ride) {
  const vehicleBrand = ride.vehicle?.brand || "Vehicle";
  const vehicleModel = ride.vehicle?.model || "Assignment pending";
  const driverName = ride.driver?.shortName || ride.driver?.name || "Driver pending";
  return `
    <section class="next-journey" aria-labelledby="nextJourneyTitle">
      <div class="next-journey__primary">
        <div class="next-journey__heading"><div><p>Your next journey</p>${ServiceTypeBadge(ride)}<h2 id="nextJourneyTitle">${journeyPlace(ride.pickup)}<span class="journey-route-arrow">${icon("arrow-right")}</span>${journeyPlace(ride.destination)}</h2></div><span class="status-badge status-badge--${ride.status}">${statusLabel(ride.status)}</span></div>
        <div class="journey-time"><div><span>Tomorrow, ${formatDate(ride.pickupDate, { weekday: "long", day: "numeric", month: "long" })}</span><strong>${ride.pickupTime}</strong></div><div><span>Estimated duration</span><strong>${ride.estimatedDuration}</strong></div><div><span>Passengers</span><strong>${ride.passengers}</strong></div><div><span>Luggage</span><strong>${ride.luggage}</strong></div></div>
        <div class="next-journey__status"><span>Journey status</span>${JourneyStatus(ride.status)}</div>
        <div class="next-journey__footer"><div><span>${vehicleBrand}</span><strong>${vehicleModel}</strong><small>${ride.driver ? `with ${driverName}` : driverName}</small></div><div class="journey-price"><span>Journey total</span><strong>${money(ride)}</strong></div></div>
        <div class="journey-actions"><a class="passenger-button passenger-button--primary" href="${tripUrl(ride.id)}">View journey</a><button class="passenger-button" type="button" data-demo-action="Contact driver">Contact driver</button><button class="passenger-button passenger-button--quiet" type="button" data-demo-action="Modify trip">Modify trip</button></div>
      </div>
      <div class="next-journey__map"><div class="live-trip-map" data-live-map data-ride-id="${ride.id}"></div><div class="map-caption"><span>${icon("navigation")} Route overview</span><small>Live driver location will appear before pickup.</small></div></div>
    </section>`;
}

export function RideCard(ride, completed = false) {
  return `<article class="ride-card"><a class="ride-card__main" href="${tripUrl(ride.id)}"><time><strong>${formatDate(ride.pickupDate, { day: "2-digit" })}</strong><span>${formatDate(ride.pickupDate, { month: "short" })}</span><small>${ride.pickupTime}</small></time><div class="ride-card__route"><span>${ride.pickup.name}</span>${icon("arrow-right")}<strong>${ride.destination.name}</strong><small>${ride.vehicle?.brand || "Vehicle"} ${ride.vehicle?.model || "pending"}</small></div><div class="ride-card__meta">${ServiceTypeBadge(ride)}<span class="status-badge status-badge--${ride.status}">${statusLabel(ride.status)}</span><strong>${money(ride)}</strong><small>${ride.driver?.shortName || "Driver pending"}</small></div></a>${completed ? `<div class="ride-card__actions"><button type="button" data-demo-action="Book again">Book again</button><button type="button" data-demo-action="Invoice">Invoice</button><a href="${tripUrl(ride.id)}">Details</a></div>` : ""}</article>`;
}

export function DriverCard(driver, expanded = false) {
  if (!driver) return EmptyState("No driver assigned", "Your chauffeur profile will appear as soon as the driver is confirmed.", "user-round");
  const photo = driver.photo ? `<img src="${assetUrl(driver.photo)}" alt="Portrait of ${driver.name}">` : `<span class="driver-card__initials">${String(driver.name || "SD").split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>`;
  return `<article class="driver-card${expanded ? " driver-card--expanded" : ""}"><div class="driver-card__photo">${photo}</div><div class="driver-card__content"><span>Your chauffeur</span><h2>${driver.name}</h2><p>${driver.role || "Chauffeur"}</p><div class="driver-stats"><div>${icon("star")}<strong>${driver.rating || "—"}</strong><span>Rating</span></div><div><strong>${driver.completedTrips || 0}</strong><span>Journeys</span></div></div><div class="driver-languages">${(driver.languages || []).map((language) => `<span>${language}</span>`).join("")}</div><div class="driver-actions"><button class="passenger-button" type="button" disabled title="Contact details are not connected">${icon("phone")} Call</button><button class="passenger-button" type="button" disabled title="Messaging is not connected">${icon("message-circle")} Message</button><button class="passenger-button" type="button" disabled title="WhatsApp is not connected">${icon("message-square")} WhatsApp</button></div></div></article>`;
}

export function VehicleCard(vehicle, expanded = false) {
  if (!vehicle) return EmptyState("Vehicle pending", "Your vehicle will appear here once assigned.", "car-front");
  return `<article class="vehicle-card${expanded ? " vehicle-card--expanded" : ""}"><div><span>Your vehicle</span><h2>${vehicle.brand}<br><strong>${vehicle.model}</strong></h2><p>${vehicle.category}${vehicle.plate ? ` · ${vehicle.plate}` : ""}</p></div><img src="${assetUrl(vehicle.image)}" alt="${vehicle.brand} ${vehicle.model}"></article>`;
}

export function EmptyState(title, body, glyph = "calendar") {
  return `<div class="empty-state">${icon(glyph)}<h3>${title}</h3><p>${body}</p><a class="passenger-button passenger-button--primary" href="${passengerUrl("requests/")}">Request a ride</a></div>`;
}

export function LoadingSkeleton(type = "dashboard") {
  return `<div class="loading-layout loading-layout--${type}" aria-label="Loading content"><div class="skeleton skeleton--heading"></div><div class="skeleton skeleton--hero"></div><div class="skeleton-row"><div class="skeleton"></div><div class="skeleton"></div></div></div>`;
}

export function ErrorState(title, body) {
  return `<div class="error-state">${icon("circle-alert")}<h2>${title}</h2><p>${body}</p><a class="passenger-button passenger-button--primary" href="${passengerUrl()}">Back to home</a></div>`;
}
