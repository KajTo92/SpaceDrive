import { statusLabel } from "../../shared/ride-status.js?v=3";

let rootPath = "../";
export const setAdminRoot = (path) => { rootPath = path; };
export const assetUrl = (path) => `${rootPath}${path}`;
export const adminUrl = (path = "") => `${rootPath}admin/${path}`;
export const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
export const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
export const formatMoney = (amount) => amount === undefined || amount === null ? "Price pending" : `CHF ${Number(amount).toLocaleString("de-CH")}`;
export const formatDate = (value, options = { day: "2-digit", month: "short", year: "numeric" }) => {
  if (!value) return "Not available";
  const text = String(value);
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T12:00:00` : text);
  return Number.isNaN(date.getTime()) ? "Not available" : new Intl.DateTimeFormat("en-GB", options).format(date);
};
export const initials = (name) => String(name || "SD").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

export function StatusBadge(status, label) {
  return `<span class="admin-status admin-status--${escapeHtml(status)}">${escapeHtml(label || statusLabel(status))}</span>`;
}

export function AdminLayout({ active, title, subtitle, notifications = [], content }) {
  const nav = [
    ["dashboard", "", "layout-dashboard", "Dashboard"],
    ["requests", "requests/", "inbox", "Requests"],
    ["journeys", "journeys/", "route", "Journeys"],
    ["dispatch", "dispatch/", "radio-tower", "Dispatch"],
    ["drivers", "drivers/", "steering-wheel", "Drivers"],
    ["vehicles", "vehicles/", "car-front", "Vehicles"],
    ["passengers", "passengers/", "users-round", "Passengers"],
  ];
  const links = nav.map(([key, path, glyph, label]) => `<a class="admin-nav__item${active === key ? " is-active" : ""}" href="${adminUrl(path)}"${active === key ? ' aria-current="page"' : ""}>${icon(glyph)}<span>${label}</span></a>`).join("");
  const unread = notifications.filter((note) => !note.read).length;
  return `<a class="admin-skip" href="#adminContent">Skip to content</a>
    <div class="admin-shell">
      <aside class="admin-sidebar" aria-label="Dispatch navigation">
        <a class="admin-brand" href="${adminUrl()}"><img src="${assetUrl("spacedrive-monogram-header.png")}" alt="" width="426" height="640"><span>Space Drive<small>Control Center</small></span></a>
        <nav class="admin-nav">${links}</nav>
        <div class="admin-sidebar__footer"><span>Operations</span><strong>Dispatch online</strong><a href="${rootPath}login.html" data-admin-signout>${icon("log-out")} Sign out</a></div>
      </aside>
      <div class="admin-workspace">
        <header class="admin-header">
          <button class="admin-mobile-menu" type="button" aria-label="Open navigation" aria-expanded="false" data-admin-menu>${icon("menu")}</button>
          <div class="admin-header__title"><span>${escapeHtml(subtitle || "Dispatch operations")}</span><h1>${escapeHtml(title)}</h1></div>
          <div class="admin-header__actions"><button class="admin-icon-button" type="button" aria-label="Open notifications" aria-expanded="false" data-notification-trigger>${icon("bell")}${unread ? `<span>${unread}</span>` : ""}</button><div class="admin-profile"><span>AR</span><div><strong>Admin</strong><small>Dispatcher</small></div></div></div>
        </header>
        <main class="admin-content" id="adminContent">${content}</main>
      </div>
      <div class="admin-sidebar-scrim" data-admin-menu-close hidden></div>
      ${NotificationCenter(notifications)}
    </div>`;
}

export function NotificationCenter(notifications) {
  return `<div class="admin-notification-scrim" data-notification-close hidden></div><aside class="admin-notification-center" aria-hidden="true" data-notification-center><header><div><span>Operations</span><h2>Notifications</h2></div><button class="admin-icon-button" type="button" aria-label="Close notifications" data-notification-close>${icon("x")}</button></header><div>${notifications.length ? notifications.map((note) => `<article class="admin-notification${note.read ? "" : " is-unread"}">${icon("bell-ring")}<div><strong>${escapeHtml(note.title)}</strong><p>${escapeHtml(note.body)}</p><time>${new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(note.createdAt))}</time></div></article>`).join("") : EmptyState("No notifications", "Operational updates will appear here.", "bell")}</div></aside>`;
}

export function PageHeading(title, description, actions = "") {
  return `<section class="admin-page-heading"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div>${actions ? `<div class="admin-page-actions">${actions}</div>` : ""}</section>`;
}

export function EmptyState(title, text, glyph = "circle-check") {
  return `<div class="admin-empty">${icon(glyph)}<strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p></div>`;
}

export function ErrorState(title, text) {
  return `<div class="admin-error" role="alert">${icon("triangle-alert")}<div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p></div><button class="admin-button" type="button" onclick="location.reload()">Try again</button></div>`;
}

export function LoadingSkeleton(page = "dashboard") {
  const rows = page === "dashboard" ? 6 : 8;
  return `<div class="admin-loading" aria-label="Loading ${escapeHtml(page)}"><div class="skeleton-line skeleton-line--title"></div><div class="skeleton-kpis">${Array.from({ length: 5 }, () => '<span class="skeleton-block"></span>').join("")}</div><div class="skeleton-panel">${Array.from({ length: rows }, () => '<span class="skeleton-line"></span>').join("")}</div></div>`;
}

export function DriverAssignmentSelector({ ride, drivers, checks }) {
  return `<div class="assignment-selector" data-assignment-selector="driver"><header><div>${icon("steering-wheel")}<span><strong>Driver assignment</strong><small>Availability includes overlaps and a 30-minute turnaround.</small></span></div>${ride.driver ? `<span class="assignment-current">${escapeHtml(ride.driver.name)}</span>` : StatusBadge("unassigned", "Not assigned")}</header><div class="assignment-options">${drivers.map((driver) => {
    const check = checks[driver.id];
    const selected = ride.driverId === driver.id;
    return `<button class="assignment-option assignment-option--${check.level}${selected ? " is-selected" : ""}" type="button" data-assign-driver="${driver.id}"${check.level === "conflict" ? " disabled" : ""}><span class="assignment-avatar">${driver.photo ? `<img src="${assetUrl(driver.photo)}" alt="">` : initials(driver.name)}</span><span><strong>${escapeHtml(driver.name)}</strong><small>${escapeHtml(driver.availability || "available")}</small></span><span class="assignment-signal">${icon(check.level === "available" ? "circle-check" : check.level === "warning" ? "triangle-alert" : "circle-x")}<strong>${check.level === "available" ? "Available" : check.level === "warning" ? "Warning" : "Conflict"}</strong><small>${escapeHtml(check.message)}</small></span></button>`;
  }).join("")}</div></div>`;
}

export function VehicleAssignmentSelector({ ride, vehicles, checks }) {
  return `<div class="assignment-selector" data-assignment-selector="vehicle"><header><div>${icon("car-front")}<span><strong>Vehicle assignment</strong><small>Vehicles are scheduled independently from chauffeurs.</small></span></div>${ride.vehicle ? `<span class="assignment-current">${escapeHtml(`${ride.vehicle.brand} ${ride.vehicle.model} ${ride.vehicle.year}`)}</span>` : StatusBadge("unassigned", "Not assigned")}</header><div class="assignment-options assignment-options--vehicles">${vehicles.map((vehicle) => {
    const check = checks[vehicle.id];
    const selected = ride.vehicleId === vehicle.id;
    return `<button class="assignment-option assignment-option--${check.level}${selected ? " is-selected" : ""}" type="button" data-assign-vehicle="${vehicle.id}"${check.level === "conflict" ? " disabled" : ""}><span class="assignment-vehicle-image"><img src="${assetUrl(vehicle.image)}" alt=""></span><span><strong>${escapeHtml(`${vehicle.brand} ${vehicle.model} ${vehicle.year}`)}</strong><small>${escapeHtml(vehicle.plate || "Plate pending")}</small></span><span class="assignment-signal">${icon(check.level === "available" ? "circle-check" : check.level === "warning" ? "triangle-alert" : "circle-x")}<strong>${check.level === "available" ? "Available" : check.level === "warning" ? "Warning" : "Conflict"}</strong><small>${escapeHtml(check.message)}</small></span></button>`;
  }).join("")}</div></div>`;
}

export function ActivityLog(items = []) {
  return `<section class="activity-log"><header><h3>Activity log</h3><span>${items.length} events</span></header>${items.length ? `<ol>${[...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((item) => `<li><time>${new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }).format(new Date(item.createdAt))}</time><span><strong>${escapeHtml(item.message)}</strong><small>${escapeHtml(item.actor || "System")}</small></span></li>`).join("")}</ol>` : EmptyState("No activity yet", "Changes to this record will appear here.", "history")}</section>`;
}

export function Modal(id, title, content, size = "normal") {
  return `<div class="admin-modal-backdrop" data-modal="${id}" hidden><section class="admin-modal admin-modal--${size}" role="dialog" aria-modal="true" aria-labelledby="${id}Title"><header><div><span>Space Drive Control Center</span><h2 id="${id}Title">${escapeHtml(title)}</h2></div><button class="admin-icon-button" type="button" aria-label="Close dialog" data-modal-close>${icon("x")}</button></header>${content}</section></div>`;
}

export { statusLabel };
