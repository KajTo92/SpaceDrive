import {
  OPERATIONS_DATE, approveRideRequest, assignDriver, assignVehicle, checkDriverConflict, checkVehicleConflict,
  createManualRide, declineRideRequest, getAdminDashboard, getDriverAvailabilityCalendar, getDrivers, getJourneyById, getJourneys, getNotifications, getPassengers,
  getRequestById, getRideRequests, getVehicles, getDriverApplications, reviewDriverApplication, inviteDriver, markRequestUnderReview, sendRideOffer, setAdminDriverAvailabilityDay, setDriverUnavailable, setVehicleUnavailable,
  updateJourneyNotes, updateJourneyStatus, updatePaymentStatus, updateRidePrice, subscribeToAdminRides, deleteJourney, uploadDriverPhoto, makePassengerDriver,
} from "./services/admin-service.js?v=5";
import { requireRole, signOut } from "../shared/supabase-client.js";
import { journeyRoute as journeyRouteData, serviceType, serviceTypeLabel } from "../shared/service-type.js";
import {
  ActivityLog, AdminLayout, DriverAssignmentSelector, EmptyState, ErrorState, LoadingSkeleton, Modal, PageHeading, StatusBadge,
  VehicleAssignmentSelector, adminUrl, assetUrl, escapeHtml, formatDate, formatMoney, icon, initials, setAdminRoot, statusLabel,
} from "./components/admin-components.js?v=2";
import "./admin-overrides.css";
import { calendarCells, dateKey, monthBounds, monthLabel, shiftedMonth } from "../shared/availability-calendar.js";

const app = document.querySelector("#adminApp");
const page = document.body.dataset.page || "dashboard";
const root = document.body.dataset.root || "../";
setAdminRoot(root);
await requireRole(["admin"], `${root}login.html`);

const requestFilters = [
  ["all", "All"], ["request_received", "New"], ["under_review", "Under review"], ["offer_sent", "Offer sent"],
  ["awaiting_customer", "Awaiting customer"], ["confirmed", "Confirmed"], ["declined", "Declined"],
];
const rideStatuses = ["request_received", "under_review", "offer_sent", "confirmed", "driver_assigned", "driver_on_the_way", "driver_arrived", "passenger_onboard", "completed", "cancelled", "declined"];
const paymentStatuses = ["unpaid", "deposit_paid", "paid", "invoice", "cash"];

function refreshIcons() { globalThis.lucide?.createIcons({ attrs: { "stroke-width": 1.65 } }); }

function toast(message, type = "success") {
  document.querySelector(".admin-toast")?.remove();
  const node = document.createElement("div");
  node.className = `admin-toast admin-toast--${type}`;
  node.setAttribute("role", type === "error" ? "alert" : "status");
  node.innerHTML = `${icon(type === "error" ? "triangle-alert" : "circle-check")}<span>${escapeHtml(message)}</span>`;
  document.body.append(node);
  requestAnimationFrame(() => node.classList.add("is-visible"));
  window.setTimeout(() => node.remove(), 3400);
  refreshIcons();
}

async function withLayout({ active, title, subtitle, content }) {
  const notifications = await getNotifications();
  app.innerHTML = AdminLayout({ active, title, subtitle, notifications, content });
  bindLayout();
}

function bindLayout() {
  const sidebar = document.querySelector(".admin-sidebar");
  const menu = document.querySelector("[data-admin-menu]");
  const menuScrim = document.querySelector("[data-admin-menu-close]");
  const setMenu = (open) => { sidebar?.classList.toggle("is-open", open); menu?.setAttribute("aria-expanded", String(open)); if (menuScrim) menuScrim.hidden = !open; };
  menu?.addEventListener("click", () => setMenu(true));
  menuScrim?.addEventListener("click", () => setMenu(false));
  const center = document.querySelector("[data-notification-center]");
  const notificationScrim = document.querySelector(".admin-notification-scrim");
  const trigger = document.querySelector("[data-notification-trigger]");
  const setNotifications = (open) => { center?.classList.toggle("is-open", open); center?.setAttribute("aria-hidden", String(!open)); trigger?.setAttribute("aria-expanded", String(open)); if (notificationScrim) notificationScrim.hidden = !open; };
  trigger?.addEventListener("click", () => setNotifications(true));
  document.querySelectorAll("[data-notification-close]").forEach((button) => button.addEventListener("click", () => setNotifications(false)));
  document.querySelector("[data-admin-signout]")?.addEventListener("click", signOut);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") { setMenu(false); setNotifications(false); closeAllModals(); } }, { once: true });
  refreshIcons();
}

function bindModals() {
  document.querySelectorAll("[data-modal-open]").forEach((button) => button.addEventListener("click", () => openModal(button.dataset.modalOpen)));
  document.querySelectorAll("[data-modal-close]").forEach((button) => button.addEventListener("click", () => button.closest("[data-modal]").hidden = true));
  document.querySelectorAll("[data-modal]").forEach((backdrop) => backdrop.addEventListener("click", (event) => { if (event.target === backdrop) backdrop.hidden = true; }));
}

function openModal(id) { const modal = document.querySelector(`[data-modal="${id}"]`); if (!modal) return; modal.hidden = false; modal.querySelector("input, select, button")?.focus(); }
function closeAllModals() { document.querySelectorAll("[data-modal]").forEach((modal) => { modal.hidden = true; }); }

function metricCard(label, value, glyph, tone = "neutral", href = "") {
  const content = `<span>${icon(glyph)}${escapeHtml(label)}</span><strong>${value}</strong><small>${tone === "critical" ? "Requires action" : "Operational count"}</small>`;
  return href ? `<a class="admin-metric admin-metric--${tone}" href="${href}">${content}</a>` : `<article class="admin-metric admin-metric--${tone}">${content}</article>`;
}

function journeyRoute(ride) { const route = journeyRouteData(ride); return route.single ? `<span class="route-stack"><strong>${escapeHtml(route.single)}</strong></span>` : `<span class="route-stack"><strong>${escapeHtml(route.pickup)}</strong>${icon("arrow-down")}<strong>${escapeHtml(route.destination)}</strong></span>`; }
function journeyRouteTitle(ride) { const route = journeyRouteData(ride); return route.single ? escapeHtml(route.single) : `${escapeHtml(route.pickup)} ${icon("arrow-right")} ${escapeHtml(route.destination)}`; }
function driverName(ride) { return ride.driver?.name || "Not assigned"; }
function vehicleName(ride) { return ride.vehicle ? `${ride.vehicle.brand} ${ride.vehicle.model} ${ride.vehicle.year}` : "Not assigned"; }
function ServiceBadge(ride) { const service = serviceType(ride); return `<span class="admin-service-badge admin-service-badge--${service.key}">${icon(service.icon)}${escapeHtml(service.label)}</span>`; }

function JourneyRow(ride) {
  const needsAssignment = ride.status === "confirmed" && (!ride.driverId || !ride.vehicleId);
  return `<a class="journey-row${needsAssignment ? " journey-row--needs-assignment" : ""}" href="${adminUrl(`journeys/detail.html?id=${ride.id}`)}"><time><strong>${escapeHtml(ride.pickupTime)}</strong><span>${formatDate(ride.pickupDate, { day: "2-digit", month: "short" })}</span></time><span class="journey-route">${journeyRoute(ride)}</span><span class="journey-person"><strong>${escapeHtml(ride.passenger?.name || "Passenger pending")}</strong><small>${ride.passengers} passengers</small></span><span class="journey-assignment"><strong>${escapeHtml(driverName(ride))}</strong><small>${escapeHtml(vehicleName(ride))}</small></span><span class="journey-price"><strong>${formatMoney(ride.price)}</strong><small>${escapeHtml((ride.paymentStatus || "unpaid").replaceAll("_", " "))}</small></span><span class="journey-badges">${ServiceBadge(ride)}${StatusBadge(ride.status)}</span></a>`;
}

async function renderDashboard() {
  const dashboard = await getAdminDashboard();
  const now = new Date();
  let visibleMonth = { year: now.getFullYear(), month: now.getMonth() };
  const renderDriverCalendars = async () => {
    const todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate());
    const bounds = monthBounds(visibleMonth.year, visibleMonth.month);
    const drivers = await getDriverAvailabilityCalendar(bounds.start, bounds.end);
    const calendars = drivers.map(driver=>{const available=new Set(driver.availableDates);const cells=calendarCells(visibleMonth.year,visibleMonth.month).map(cell=>cell?`<span class="admin-driver-calendar__day${available.has(cell.date)?" is-available":""}${cell.date===todayKey?" is-today":""}" title="${cell.date}${available.has(cell.date)?" - available":""}">${cell.day}</span>`:'<span class="admin-driver-calendar__blank"></span>').join("");return `<article class="admin-driver-calendar"><header><span class="admin-driver-calendar__avatar">${driver.photo?`<img src="${escapeHtml(driver.photo)}" alt="">`:initials(driver.name)}</span><div><h3>${escapeHtml(driver.name)}</h3><p>${available.size} available days</p></div></header><div class="admin-driver-calendar__weekdays">${["M","T","W","T","F","S","S"].map(day=>`<span>${day}</span>`).join("")}</div><div class="admin-driver-calendar__grid">${cells}</div></article>`;}).join("");
    return `<section class="admin-availability" aria-labelledby="availabilityTitle"><header><div><h2 id="availabilityTitle">Driver availability</h2><p>Monthly availability submitted by every registered driver.</p></div><div class="admin-availability__navigation"><button type="button" data-admin-calendar-move="-1" aria-label="Previous month">${icon("chevron-left")}</button><strong>${monthLabel(visibleMonth.year,visibleMonth.month)}</strong><button type="button" data-admin-calendar-move="1" aria-label="Next month">${icon("chevron-right")}</button></div></header><div class="admin-availability__scroll"><div class="admin-availability__grid">${calendars||EmptyState("No registered drivers","Driver calendars will appear here.","calendar-days")}</div></div></section>`;
  };
  const content = `
    <section class="control-hero"><div><span>Today</span><h2>${formatDate(dashboard.date, { weekday: "long", day: "numeric", month: "long" })}</h2><p>Assignments, request flow and the fleet status for today's operation.</p></div><a class="admin-button admin-button--primary" href="${adminUrl("journeys/")}" data-modal-open="newJourney">${icon("plus")} New journey</a></section>
    <section class="admin-metrics" aria-label="Today's operational metrics">
      ${metricCard("Today's journeys", dashboard.metrics.todayJourneys, "route", "neutral", adminUrl("journeys/"))}
      ${metricCard("New requests", dashboard.metrics.newRequests, "inbox", dashboard.metrics.newRequests ? "critical" : "neutral", adminUrl("requests/"))}
      ${metricCard("Unassigned rides", dashboard.metrics.unassignedRides, "circle-alert", dashboard.metrics.unassignedRides ? "critical" : "neutral", adminUrl("journeys/"))}
    </section>
    <div data-admin-driver-calendars>${await renderDriverCalendars()}</div>
    <section class="dispatch-board dashboard-timeline"><header><div><h2>Today's timeline</h2><p>Drivers and vehicles scheduled for today's journeys.</p></div><div class="dispatch-toggle"><button class="is-active" type="button" data-timeline-view="drivers">Drivers</button><button type="button" data-timeline-view="vehicles">Vehicles</button></div></header><div class="timeline-scroll"><div class="timeline-header"><span></span>${Array.from({ length: 10 }, (_, index) => `<time>${String(5 + index * 2).padStart(2, "0")}:00</time>`).join("")}</div><div class="timeline-resources" data-timeline-panel="drivers">${dashboard.drivers.map((driver) => `<div class="timeline-row"><div class="timeline-label"><span>${initials(driver.name)}</span><div><strong>${escapeHtml(driver.name)}</strong><small>${escapeHtml(driver.availability)}</small></div></div><div class="timeline-track">${dashboard.today.filter((ride) => ride.driverId === driver.id).map(timelineBlock).join("")}</div></div>`).join("")}</div><div class="timeline-resources" data-timeline-panel="vehicles" hidden>${dashboard.vehicles.map((vehicle) => `<div class="timeline-row"><div class="timeline-label"><span>${icon("car-front")}</span><div><strong>${escapeHtml(`${vehicle.model} ${vehicle.year}`)}</strong><small>${escapeHtml(vehicle.plate)}</small></div></div><div class="timeline-track">${dashboard.today.filter((ride) => ride.vehicleId === vehicle.id).map(timelineBlock).join("")}</div></div>`).join("")}</div></div></section>`;
  await withLayout({ active: "dashboard", title: "Control center", subtitle: "Dispatch operations", content });
  const calendarsRoot=document.querySelector("[data-admin-driver-calendars]");
  const bindCalendarNavigation=()=>calendarsRoot.querySelectorAll("[data-admin-calendar-move]").forEach(button=>button.addEventListener("click",async()=>{visibleMonth=shiftedMonth(visibleMonth.year,visibleMonth.month,Number(button.dataset.adminCalendarMove));calendarsRoot.innerHTML=await renderDriverCalendars();bindCalendarNavigation();refreshIcons();}));
  bindCalendarNavigation();
  document.querySelectorAll("[data-timeline-view]").forEach((button) => button.addEventListener("click", () => { document.querySelectorAll("[data-timeline-view]").forEach((item) => item.classList.toggle("is-active", item === button)); document.querySelectorAll("[data-timeline-panel]").forEach((panel) => { panel.hidden = panel.dataset.timelinePanel !== button.dataset.timelineView; }); }));
}

function requestLabel(request) {
  return serviceTypeLabel(request).toUpperCase();
}
function requestIcon(request) { return request.requestType === "city_tour" ? "map" : request.requestType === "hourly_concierge" ? "clock-3" : "send"; }
function requestedVehicleName(ride) { return ride.requestedVehicle || (ride.vehicle ? `${ride.vehicle.brand} ${ride.vehicle.model}` : "No vehicle preference"); }
function RequestRow(request) {
  const price = request.finalPrice || request.calculatedPrice || request.price;
  return `<button class="request-row" type="button" data-open-request="${request.id}"><span class="request-source">${icon(requestIcon(request))}<strong>${escapeHtml(requestLabel(request))}</strong><small>${formatDate(request.createdAt?.slice(0, 10) || request.pickupDate, { day: "2-digit", month: "short" })}</small></span><span><strong>${escapeHtml(request.passenger?.name || "Passenger")}</strong><small>${escapeHtml(request.passenger?.email || "Passenger Portal")}</small></span><span class="request-route"><strong>${journeyRouteTitle(request)}</strong><small>${formatDate(request.pickupDate, { day: "2-digit", month: "short" })}, ${escapeHtml(request.pickupTime)}</small><small class="request-vehicle">${icon("car-front")} ${escapeHtml(requestedVehicleName(request))}</small></span><span><strong>${formatMoney(price)}</strong><small>${request.passengers || 1} passengers</small></span>${StatusBadge(request.status)}${icon("chevron-right")}</button>`;
}

function RequestDetail(request) {
  const price = request.finalPrice || request.calculatedPrice || request.price || 0;
  const facts = [
    ["Passenger", request.passenger?.name || "Passenger pending"], ["Pickup", `${request.pickup.name}, ${request.pickup.address || ""}`], ["Destination", `${request.destination.name}, ${request.destination.address || ""}`],
    ["Date and time", `${formatDate(request.pickupDate)} at ${request.pickupTime}`], ["Passengers", request.passengers || 1], ["Luggage", request.luggage || "Not provided"],
    ["Requested vehicle", requestedVehicleName(request)], ["Flight", request.flightNumber || "Not provided"], ["Source", request.source || "website"],
  ];
  const hourly = request.hourlyDetails;
  const plannedStops = hourly?.plannedStops?.map((stop) => stop.name || stop.address).filter(Boolean) || [];
  const hourlyCallout = request.requestType === "hourly_concierge" ? `<div class="city-tour-callout">${icon("clock-3")}<div><strong>${hourly?.durationHours || "-"} hours at CHF ${hourly?.hourlyRate || "-"}/hour</strong><p>${escapeHtml((hourly?.purpose || "Purpose pending").replaceAll("_", " "))}. ${hourly?.includedKilometers || "-"} km included.</p><p>${plannedStops.length ? `Planned stops: ${escapeHtml(plannedStops.join(", "))}` : "Flexible itinerary, no stops provided."}</p></div></div>` : "";
  return `<div class="request-review"><header class="request-review__hero"><div><button type="button" class="admin-back-button" data-close-request>${icon("arrow-left")} Requests</button><span>${escapeHtml(requestLabel(request))}</span><h2>${journeyRouteTitle(request)}</h2><p>${formatDate(request.pickupDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} at ${escapeHtml(request.pickupTime)}</p></div>${StatusBadge(request.status)}</header>
    <div class="request-review__grid"><section class="detail-surface"><header><h3>Request details</h3><button class="admin-button admin-button--quiet" type="button" data-review-request>${icon("pencil")} Request changes</button></header><div class="requested-vehicle-callout">${icon("car-front")}<div><span>Passenger selected</span><strong>${escapeHtml(requestedVehicleName(request))}</strong></div></div><dl class="fact-grid">${facts.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>${request.requestType === "city_tour" ? `<div class="city-tour-callout">${icon("map")}<div><strong>${escapeHtml(request.tourDetails?.region || "Custom tour")}</strong><p>${request.tourDetails?.durationHours || "-"} hours, ${escapeHtml(request.tourDetails?.style || "Custom style")}</p></div></div>` : ""}${hourlyCallout}<section class="notes-preview"><h3>Special requests</h3><p>${escapeHtml(request.specialRequests?.join(", ") || "No special requests")}</p></section></section>
      <aside class="offer-editor"><header><span>Pricing</span><h3>Prepare the offer</h3></header><div class="calculated-price"><span>Calculated price</span><strong>${formatMoney(request.calculatedPrice || request.price)}</strong></div><form data-offer-form><label><span>Final offer</span><span class="currency-input"><b>CHF</b><input name="finalPrice" type="number" min="0" step="5" value="${Number(price)}" required></span></label><label><span>Optional note or reason</span><textarea name="priceNote" rows="3" placeholder="Additional waiting time">${escapeHtml(request.priceNote || "")}</textarea></label><div class="offer-actions"><button class="admin-button" type="button" data-save-price>${icon("save")} Save price</button><button class="admin-button admin-button--primary" type="submit">${icon("send")} Send offer</button></div></form><div class="review-decisions"><button class="admin-button admin-button--positive" type="button" data-approve-request>${icon("check")} Approve</button><button class="admin-button admin-button--danger" type="button" data-decline-request>${icon("x")} Decline</button></div></aside>
    </div>${ActivityLog(request.activity)}</div>`;
}

async function renderRequests() {
  const requests = await getRideRequests();
  const requestedId = new URLSearchParams(location.search).get("id");
  const selected = requestedId ? await getRequestById(requestedId) : null;
  if (requestedId && !selected) { await withLayout({ active: "requests", title: "Requests", subtitle: "Inbox", content: ErrorState("Request not found", "This request ID is invalid or no longer available.") }); return; }
  const counts = Object.fromEntries(requestFilters.map(([key]) => [key, key === "all" ? requests.length : requests.filter((item) => item.status === key || (key === "request_received" && item.status === "pending_review") || (key === "awaiting_customer" && item.status === "awaiting_confirmation")).length]));
  const content = selected ? RequestDetail(selected) : `${PageHeading("Requests inbox", "Review passenger requests, set the final price and move accepted work into dispatch.")}<div class="admin-filters" role="tablist" aria-label="Request status">${requestFilters.map(([key, label], index) => `<button class="${index === 0 ? "is-active" : ""}" type="button" role="tab" aria-selected="${index === 0}" data-request-filter="${key}">${label}<span>${counts[key]}</span></button>`).join("")}</div><section class="request-list" data-request-list>${requests.length ? requests.map(RequestRow).join("") : EmptyState("No new requests", "All ride requests have been reviewed.", "inbox")}</section>`;
  await withLayout({ active: "requests", title: selected ? "Review request" : "Requests", subtitle: selected ? selected.id.toUpperCase() : "Passenger inbox", content });
  if (selected) bindRequestReview(selected); else bindRequestList(requests);
}

function bindRequestList(requests) {
  document.querySelectorAll("[data-open-request]").forEach((button) => button.addEventListener("click", () => { location.href = `${adminUrl("requests/")}?id=${encodeURIComponent(button.dataset.openRequest)}`; }));
  document.querySelectorAll("[data-request-filter]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-request-filter]").forEach((item) => { const active = item === button; item.classList.toggle("is-active", active); item.setAttribute("aria-selected", String(active)); });
    const key = button.dataset.requestFilter;
    const filtered = key === "all" ? requests : requests.filter((item) => item.status === key || (key === "request_received" && item.status === "pending_review") || (key === "awaiting_customer" && item.status === "awaiting_confirmation"));
    document.querySelector("[data-request-list]").innerHTML = filtered.length ? filtered.map(RequestRow).join("") : EmptyState("No requests in this view", "All matching requests have been reviewed.", "inbox");
    bindRequestList(filtered);
    refreshIcons();
  }));
}

function bindRequestReview(request) {
  const form = document.querySelector("[data-offer-form]");
  document.querySelector("[data-close-request]")?.addEventListener("click", () => location.href = adminUrl("requests/"));
  document.querySelector("[data-review-request]")?.addEventListener("click", async () => { try { await markRequestUnderReview(request.id); toast("Request moved to under review."); await renderRequests(); } catch (error) { toast(error.message, "error"); } });
  document.querySelector("[data-save-price]")?.addEventListener("click", async () => { try { const data = new FormData(form); await updateRidePrice(request.id, data.get("finalPrice"), data.get("priceNote")); toast("Final price saved."); await renderRequests(); } catch (error) { toast(error.message, "error"); } });
  form?.addEventListener("submit", async (event) => { event.preventDefault(); try { const data = new FormData(form); await sendRideOffer(request.id, data.get("finalPrice"), data.get("priceNote")); toast("Offer sent to passenger."); await renderRequests(); } catch (error) { toast(error.message, "error"); } });
  document.querySelector("[data-approve-request]")?.addEventListener("click", async () => { try { const updated = await approveRideRequest(request.id); toast("Request approved. Journey created."); location.href = adminUrl(`journeys/detail.html?id=${updated.id}`); } catch (error) { toast(error.message, "error"); } });
  document.querySelector("[data-decline-request]")?.addEventListener("click", async () => { try { await declineRideRequest(request.id, "Request declined by Dispatch"); toast("Request declined."); await renderRequests(); } catch (error) { toast(error.message, "error"); } });
}

function manualRideForm(passengers, drivers, vehicles) {
  return `<form class="admin-form admin-form--grid" data-manual-ride-form><label><span>Passenger</span><select name="passengerId"><option value="">Select passenger</option>${passengers.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("")}</select></label><label><span>Guest name</span><input name="customerName" placeholder="Required when no passenger is selected"></label><label><span>Guest email</span><input name="customerEmail" type="email"></label><label><span>Guest phone</span><input name="customerPhone" type="tel"></label><label><span>Source</span><select name="source"><option>admin</option><option>phone</option><option>whatsapp</option><option>hotel</option><option>business</option></select></label><label class="span-2"><span>Pickup</span><input name="pickup" required placeholder="Zürich Airport"></label><label class="span-2"><span>Destination</span><input name="destination" required placeholder="St. Moritz"></label><label><span>Date</span><input name="pickupDate" type="date" required value="${OPERATIONS_DATE}"></label><label><span>Time</span><input name="pickupTime" type="time" required value="12:00"></label><label><span>Passengers</span><input name="passengers" type="number" min="1" max="7" value="1" required></label><label><span>Luggage</span><input name="luggage" placeholder="2 large cases"></label><label><span>Vehicle class</span><input name="vehicleClass" placeholder="First Class"></label><label><span>Price (CHF)</span><input name="price" type="number" min="0" step="5" required></label><label><span>Flight</span><input name="flightNumber" placeholder="LX123"></label><label><span>Driver</span><select name="driverId"><option value="">Assign later</option>${drivers.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("")}</select></label><label><span>Vehicle</span><select name="vehicleId"><option value="">Assign later</option>${vehicles.map((item) => `<option value="${item.id}">${escapeHtml(`${item.brand} ${item.model} ${item.year}`)}</option>`).join("")}</select></label><label class="span-2"><span>Special requests</span><textarea name="specialRequests" rows="2"></textarea></label><label class="span-2"><span>Internal note</span><textarea name="internalNote" rows="2"></textarea></label><div class="form-actions span-2"><button class="admin-button" type="button" data-modal-close>Cancel</button><button class="admin-button admin-button--primary" type="submit">${icon("plus")} Create journey</button></div></form>`;
}

async function renderJourneys() {
  const [journeys, passengers, drivers, vehicles] = await Promise.all([getJourneys(), getPassengers(), getDrivers(), getVehicles()]);
  const groups = { upcoming: journeys.filter((ride) => ride.pickupDate > OPERATIONS_DATE && !["cancelled", "completed"].includes(ride.status)), today: journeys.filter((ride) => ride.pickupDate === OPERATIONS_DATE), completed: journeys.filter((ride) => ride.status === "completed"), cancelled: journeys.filter((ride) => ride.status === "cancelled") };
  const content = `${PageHeading("Journeys", "Every confirmed, active and completed Space Drive journey.", `<button class="admin-button admin-button--primary" type="button" data-modal-open="newJourney">${icon("plus")} New journey</button>`)}<div class="admin-filters" role="tablist" aria-label="Journey view">${Object.entries(groups).map(([key, list], index) => `<button class="${index === 0 ? "is-active" : ""}" type="button" data-journey-filter="${key}">${key[0].toUpperCase() + key.slice(1)}<span>${list.length}</span></button>`).join("")}</div><section class="journey-list" data-journey-list>${groups.upcoming.length ? groups.upcoming.sort((a, b) => `${a.pickupDate}${a.pickupTime}`.localeCompare(`${b.pickupDate}${b.pickupTime}`)).map(JourneyRow).join("") : EmptyState("No upcoming journeys", "Nothing is scheduled after today.", "calendar-check")}</section>${Modal("newJourney", "Create a journey", manualRideForm(passengers, drivers, vehicles), "wide")}`;
  await withLayout({ active: "journeys", title: "Journeys", subtitle: "Operations schedule", content });
  bindModals();
  document.querySelectorAll("[data-journey-filter]").forEach((button) => button.addEventListener("click", () => { document.querySelectorAll("[data-journey-filter]").forEach((item) => item.classList.toggle("is-active", item === button)); const list = groups[button.dataset.journeyFilter] || []; document.querySelector("[data-journey-list]").innerHTML = list.length ? list.sort((a, b) => `${a.pickupDate}${a.pickupTime}`.localeCompare(`${b.pickupDate}${b.pickupTime}`)).map(JourneyRow).join("") : EmptyState(`No ${button.dataset.journeyFilter} journeys`, button.dataset.journeyFilter === "today" ? "No journeys scheduled for today." : "Nothing to show in this view.", "calendar-check"); refreshIcons(); }));
  document.querySelector("[data-manual-ride-form]")?.addEventListener("submit", async (event) => { event.preventDefault(); try { const input = Object.fromEntries(new FormData(event.currentTarget)); const ride = await createManualRide(input); toast("Journey created."); location.href = adminUrl(`journeys/detail.html?id=${ride.id}`); } catch (error) { toast(error.message, "error"); } });
}

function JourneyDetail(ride, drivers, vehicles, driverChecks, vehicleChecks) {
  return `<a class="admin-back-link" href="${adminUrl("journeys/")}">${icon("arrow-left")} Back to journeys</a><section class="journey-detail-hero"><div><span>${formatDate(ride.pickupDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} at ${escapeHtml(ride.pickupTime)}</span>${ServiceBadge(ride)}<h2>${journeyRouteTitle(ride)}</h2><p>${escapeHtml(ride.passenger?.name || "Passenger pending")}, ${ride.passengers} passengers</p></div><div><strong>${formatMoney(ride.price)}</strong>${StatusBadge(ride.status)}</div></section>
    <section class="journey-schedule-summary" aria-label="Journey date and time"><div>${icon("calendar-days")}<span>Date<strong>${formatDate(ride.pickupDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</strong></span></div><div>${icon("clock-3")}<span>Pickup time<strong>${escapeHtml(ride.pickupTime || "Not provided")}</strong></span></div></section>
    <section class="journey-command"><div><label><span>Journey status</span><select data-journey-status>${rideStatuses.map((status) => `<option value="${status}"${status === ride.status ? " selected" : ""}>${escapeHtml(statusLabel(status))}</option>`).join("")}</select></label><label><span>Payment status</span><select data-payment-status>${paymentStatuses.map((status) => `<option value="${status}"${status === ride.paymentStatus ? " selected" : ""}>${escapeHtml(status.replaceAll("_", " "))}</option>`).join("")}</select></label><button class="admin-button admin-button--danger" type="button" data-delete-journey>${icon("trash-2")} Delete journey</button></div><span>${icon("shield-check")} Changes are recorded in the activity log.</span></section>
    <div class="journey-detail-grid"><section class="detail-surface"><header><h3>Journey</h3><span>${escapeHtml(ride.id)}</span></header><dl class="fact-grid"><div><dt>Date</dt><dd>${formatDate(ride.pickupDate, { day: "numeric", month: "long", year: "numeric" })}</dd></div><div><dt>Pickup time</dt><dd>${escapeHtml(ride.pickupTime || "Not provided")}</dd></div><div><dt>Requested vehicle</dt><dd>${escapeHtml(requestedVehicleName(ride))}</dd></div><div><dt>Pickup</dt><dd>${escapeHtml(ride.pickup.address)}</dd></div><div><dt>Destination</dt><dd>${escapeHtml(ride.destination.address)}</dd></div><div><dt>Flight</dt><dd>${escapeHtml(ride.flightNumber || "Not provided")}</dd></div><div><dt>Passengers</dt><dd>${ride.passengers}</dd></div><div><dt>Luggage</dt><dd>${escapeHtml(ride.luggage || "Not provided")}</dd></div><div><dt>Preferences</dt><dd>${escapeHtml(ride.preferences?.join(", ") || "None")}</dd></div><div><dt>Special requests</dt><dd>${escapeHtml(ride.specialRequests?.join(", ") || "None")}</dd></div><div><dt>Source</dt><dd>${escapeHtml(ride.source || "admin")}</dd></div></dl></section><section class="detail-surface passenger-summary"><header><h3>Passenger</h3><a href="${adminUrl(`passengers/?id=${ride.passengerId}`)}">Open profile</a></header><div class="passenger-identity"><span>${initials(ride.passenger?.name)}</span><div><strong>${escapeHtml(ride.passenger?.name || "Passenger pending")}</strong><small>${escapeHtml(ride.passenger?.email || "Email not provided")}</small><small>${escapeHtml(ride.passenger?.phone || "Phone not provided")}</small></div></div></section></div>
    <section class="assignment-grid">${DriverAssignmentSelector({ ride, drivers, checks: driverChecks })}${VehicleAssignmentSelector({ ride, vehicles, checks: vehicleChecks })}</section>
    <section class="notes-editor"><header><h3>Journey notes</h3><p>Passenger-visible, internal and driver notes stay separated.</p></header><form data-notes-form><label><span>Passenger-visible note</span><textarea name="passengerVisibleNote" rows="3">${escapeHtml(ride.passengerVisibleNote || "")}</textarea></label><label><span>Internal admin note</span><textarea name="internalNote" rows="3">${escapeHtml(ride.internalNote || "")}</textarea></label><label><span>Driver note</span><textarea name="driverNote" rows="3">${escapeHtml(ride.driverNote || "")}</textarea></label><button class="admin-button" type="submit">${icon("save")} Save notes</button></form></section>${ActivityLog(ride.activity)}`;
}

async function refreshJourneyDetailsInPlace(anchorSelector, focusSelector) {
  const anchorTop = document.querySelector(anchorSelector)?.getBoundingClientRect().top;
  const previousScroll = window.scrollY;
  await renderJourneyDetails();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const nextAnchor = document.querySelector(anchorSelector);
  if (nextAnchor && Number.isFinite(anchorTop)) {
    window.scrollBy({ top: nextAnchor.getBoundingClientRect().top - anchorTop, left: 0, behavior: "auto" });
  } else {
    window.scrollTo({ top: previousScroll, left: 0, behavior: "auto" });
  }
  document.querySelector(focusSelector)?.focus({ preventScroll: true });
}

async function renderJourneyDetails() {
  const requestedId = new URLSearchParams(location.search).get("id");
  const id = requestedId?.replace(/^journey-/, "");
  if (id && id !== requestedId) history.replaceState(null, "", `${location.pathname}?id=${encodeURIComponent(id)}`);
  const [ride, drivers, vehicles] = await Promise.all([id ? getJourneyById(id) : null, getDrivers(), getVehicles()]);
  if (!ride) { await withLayout({ active: "journeys", title: "Journey details", subtitle: "Not found", content: ErrorState("Ride not found", "This ride ID is invalid or the journey is no longer available.") }); return; }
  const [driverCheckEntries,vehicleCheckEntries]=await Promise.all([Promise.all(drivers.map(async driver=>[driver.id,await checkDriverConflict(driver.id,ride)])),Promise.all(vehicles.map(async vehicle=>[vehicle.id,await checkVehicleConflict(vehicle.id,ride)]))]);
  await withLayout({ active: "journeys", title: "Journey details", subtitle: ride.id.toUpperCase(), content: JourneyDetail(ride, drivers, vehicles, Object.fromEntries(driverCheckEntries), Object.fromEntries(vehicleCheckEntries)) });
  document.querySelector("[data-journey-status]")?.addEventListener("change", async (event) => { try { await updateJourneyStatus(ride.id, event.target.value); toast("Journey status updated."); await renderJourneyDetails(); } catch (error) { toast(error.message, "error"); } });
  document.querySelector("[data-payment-status]")?.addEventListener("change", async (event) => { try { await updatePaymentStatus(ride.id, event.target.value); toast("Payment status updated."); await renderJourneyDetails(); } catch (error) { toast(error.message, "error"); } });
  document.querySelectorAll("[data-assign-driver]").forEach((button) => button.addEventListener("click", async () => { try { const driverId = button.dataset.assignDriver; await assignDriver(ride.id, driverId); toast("Driver assigned."); await refreshJourneyDetailsInPlace('[data-assignment-selector="driver"]', `[data-assign-driver="${driverId}"]`); } catch (error) { toast(error.message, "error"); } }));
  document.querySelectorAll("[data-assign-vehicle]").forEach((button) => button.addEventListener("click", async () => { try { const vehicleId = button.dataset.assignVehicle; await assignVehicle(ride.id, vehicleId); toast("Vehicle assigned."); await refreshJourneyDetailsInPlace('[data-assignment-selector="vehicle"]', `[data-assign-vehicle="${vehicleId}"]`); } catch (error) { toast(error.message, "error"); } }));
  document.querySelector("[data-notes-form]")?.addEventListener("submit", async (event) => { event.preventDefault(); try { await updateJourneyNotes(ride.id, Object.fromEntries(new FormData(event.currentTarget))); toast("Notes saved."); await renderJourneyDetails(); } catch (error) { toast(error.message, "error"); } });
  document.querySelector("[data-delete-journey]")?.addEventListener("click", async () => { if (!window.confirm("Delete this journey permanently? This action cannot be undone.")) return; try { await deleteJourney(ride.id); location.href = adminUrl("journeys/"); } catch (error) { toast(error.message, "error"); } });
}

function timeMinutes(value) { const [hours, minutes] = value.split(":").map(Number); return hours * 60 + minutes; }
function endTime(ride) { return ride.estimatedEndAt ? new Date(ride.estimatedEndAt).toTimeString().slice(0, 5) : `${String(Math.min(23, Math.floor((timeMinutes(ride.pickupTime) + 90) / 60))).padStart(2, "0")}:${String((timeMinutes(ride.pickupTime) + 90) % 60).padStart(2, "0")}`; }
function timelineBlock(ride) { const start = Math.max(0, timeMinutes(ride.pickupTime) - 5 * 60); const end = Math.max(start + 45, timeMinutes(endTime(ride)) - 5 * 60); const left = start / (18 * 60) * 100; const width = Math.max(5, (end - start) / (18 * 60) * 100); return `<a class="timeline-booking timeline-booking--${ride.status}" style="left:${left}%;width:${width}%" href="${adminUrl(`journeys/detail.html?id=${ride.id}`)}"><strong>${escapeHtml(ride.pickupTime)} ${escapeHtml(ride.pickup.name)}</strong><small>${escapeHtml(serviceTypeLabel(ride))} · ${escapeHtml(ride.destination.name)}, ${escapeHtml(ride.passenger?.name || "Passenger")}</small></a>`; }

async function renderDrivers() {
  const [journeys, applications] = await Promise.all([getJourneys(), getDriverApplications()]);
  const pendingApplications = applications.filter((item) => item.status === "pending");
  const now = new Date();
  let visibleMonth = { year: now.getFullYear(), month: now.getMonth() };
  const renderDriverCards = async () => {
    const bounds = monthBounds(visibleMonth.year, visibleMonth.month);
    const drivers = await getDriverAvailabilityCalendar(bounds.start, bounds.end);
    const todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate());
    const cards = drivers.map((driver) => {
      const available = new Set(driver.availableDates);
      const upcoming = journeys.filter((ride) => ride.driverId === driver.id && ride.pickupDate >= OPERATIONS_DATE && !["completed", "cancelled"].includes(ride.status));
      const cells = calendarCells(visibleMonth.year, visibleMonth.month).map((cell) => cell ? `<button class="driver-management-calendar__day${available.has(cell.date) ? " is-available" : ""}${cell.date === todayKey ? " is-today" : ""}" type="button" data-admin-driver-day="${driver.id}" data-availability-date="${cell.date}" data-available="${available.has(cell.date)}" aria-pressed="${available.has(cell.date)}" aria-label="${cell.date}: ${available.has(cell.date) ? "available" : "not available"}"><span>${cell.day}</span>${available.has(cell.date) ? icon("check") : ""}</button>` : '<span class="driver-management-calendar__blank"></span>').join("");
      return `<article class="driver-management-card"><header><span class="driver-management-card__photo">${driver.photo ? `<img src="${assetUrl(driver.photo)}" alt="Portrait of ${escapeHtml(driver.name)}">` : initials(driver.name)}</span><div><span>Chauffeur</span><h2>${escapeHtml(driver.name)}</h2><p>${escapeHtml(driver.email)}</p></div>${StatusBadge(driver.availability)}</header><div class="driver-management-card__body"><dl><div><dt>Phone</dt><dd>${escapeHtml(driver.phone || "Not provided")}</dd></div><div><dt>Languages</dt><dd>${escapeHtml(driver.languages.join(", ") || "Not provided")}</dd></div><div><dt>Completed rides</dt><dd>${driver.completedTrips}</dd></div><div><dt>Upcoming rides</dt><dd>${upcoming.length}</dd></div></dl><section class="driver-management-calendar" aria-label="Availability calendar for ${escapeHtml(driver.name)}"><header><div><span>Availability</span><strong>${available.size} days selected</strong></div><small>Click a day to change it</small></header><div class="driver-management-calendar__weekdays">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => `<span>${day}</span>`).join("")}</div><div class="driver-management-calendar__grid">${cells}</div></section></div><footer><label class="admin-button driver-photo-upload">${icon("camera")} Upload photo<input type="file" accept="image/jpeg,image/png,image/webp" data-driver-photo="${driver.id}" hidden></label><button class="admin-button" type="button" data-driver-unavailable="${driver.id}">${icon("calendar-x")} Add unavailable period</button></footer></article>`;
    }).join("");
    return { drivers, markup: cards || EmptyState("No registered drivers", "Registered chauffeurs will appear here.", "users-round") };
  };
  let driverView = await renderDriverCards();
  const applicationRows = pendingApplications.length ? pendingApplications.map((item) => `<article class="attention-item"><div><strong>${escapeHtml(`${item.profile?.first_name || ""} ${item.profile?.last_name || ""}`.trim())}</strong><p>${escapeHtml(item.profile?.email || "")} · ${escapeHtml((item.languages || []).join(", "))}</p></div><button class="admin-button admin-button--positive" data-review-driver="approved" data-application-id="${item.id}">Approve</button><button class="admin-button admin-button--danger" data-review-driver="rejected" data-application-id="${item.id}">Reject</button></article>`).join("") : EmptyState("No pending applications", "New driver applications will appear here.", "user-check");
  const inviteForm = `<form class="admin-form admin-form--grid" data-invite-driver><label><span>Email</span><input name="email" type="email" required></label><label><span>First name</span><input name="firstName"></label><label><span>Last name</span><input name="lastName"></label><button class="admin-button admin-button--primary" type="submit">${icon("mail-plus")} Invite driver</button></form>`;
  const forms = driverView.drivers.map((driver) => Modal(`driver-${driver.id}`, `Set ${driver.name} unavailable`, `<form class="admin-form" data-driver-unavailable-form="${driver.id}"><label><span>From</span><input name="from" type="date" required></label><label><span>To</span><input name="to" type="date" required></label><label><span>Reason</span><select name="reason"><option>Vacation</option><option>Sick</option><option>Private</option><option>Other</option></select></label><div class="form-actions"><button class="admin-button" type="button" data-modal-close>Cancel</button><button class="admin-button admin-button--primary" type="submit">Save period</button></div></form>`)).join("");
  await withLayout({ active: "drivers", title: "Drivers", subtitle: "Chauffeur operations", content: `${PageHeading("Drivers", "Availability, contact data and upcoming assignments.")}<section class="driver-management"><header><div><span>Registered chauffeurs</span><h2>Driver team</h2><p>Review each chauffeur and manage their working days directly in the calendar.</p></div><div class="driver-management__month"><button type="button" data-driver-month-move="-1" aria-label="Previous month">${icon("chevron-left")}</button><strong data-driver-month-label>${monthLabel(visibleMonth.year, visibleMonth.month)}</strong><button type="button" data-driver-month-move="1" aria-label="Next month">${icon("chevron-right")}</button></div></header><div class="driver-management__grid" data-driver-management-grid>${driverView.markup}</div></section><section class="driver-recruitment"><header><span>Team growth</span><h2>Applications & invitations</h2><p>Review new candidates or invite a chauffeur after managing the active team.</p></header><div class="driver-recruitment__grid"><section class="detail-surface"><header><h2>Driver applications</h2><span>${pendingApplications.length} pending</span></header><div class="attention-list">${applicationRows}</div></section><section class="detail-surface"><header><h2>Invite driver</h2></header>${inviteForm}</section></div></section>${forms}` });
  bindModals();
  const bindDriverCards = () => {
    document.querySelectorAll("[data-driver-unavailable]").forEach((button) => button.addEventListener("click", () => openModal(`driver-${button.dataset.driverUnavailable}`)));
    document.querySelectorAll("[data-driver-photo]").forEach((input) => input.addEventListener("change", async () => { const file = input.files?.[0]; if (!file) return; try { input.disabled = true; await uploadDriverPhoto(input.dataset.driverPhoto, file); toast("Driver photo uploaded."); await renderDrivers(); } catch (error) { input.disabled = false; toast(error.message, "error"); } }));
    document.querySelectorAll("[data-admin-driver-day]").forEach((button) => button.addEventListener("click", async () => { const nextAvailable = button.dataset.available !== "true"; try { button.disabled = true; await setAdminDriverAvailabilityDay(button.dataset.adminDriverDay, button.dataset.availabilityDate, nextAvailable); button.dataset.available = String(nextAvailable); button.setAttribute("aria-pressed", String(nextAvailable)); button.setAttribute("aria-label", `${button.dataset.availabilityDate}: ${nextAvailable ? "available" : "not available"}`); button.classList.toggle("is-available", nextAvailable); button.querySelector("svg")?.remove(); if (nextAvailable) { button.insertAdjacentHTML("beforeend", icon("check")); refreshIcons(); } const count = button.closest(".driver-management-card").querySelectorAll("[data-available='true']").length; button.closest(".driver-management-calendar").querySelector("strong").textContent = `${count} days selected`; toast(nextAvailable ? "Availability day added." : "Availability day removed."); } catch (error) { button.disabled = false; toast(error.message, "error"); } finally { button.disabled = false; } }));
  };
  bindDriverCards();
  document.querySelectorAll("[data-driver-month-move]").forEach((button) => button.addEventListener("click", async () => { const grid = document.querySelector("[data-driver-management-grid]"); try { button.disabled = true; visibleMonth = shiftedMonth(visibleMonth.year, visibleMonth.month, Number(button.dataset.driverMonthMove)); driverView = await renderDriverCards(); grid.innerHTML = driverView.markup; document.querySelector("[data-driver-month-label]").textContent = monthLabel(visibleMonth.year, visibleMonth.month); bindDriverCards(); refreshIcons(); } catch (error) { toast(error.message, "error"); } finally { button.disabled = false; } }));
  document.querySelectorAll("[data-driver-unavailable-form]").forEach((form) => form.addEventListener("submit", async (event) => { event.preventDefault(); try { await setDriverUnavailable(form.dataset.driverUnavailableForm, Object.fromEntries(new FormData(form))); toast("Driver unavailability saved."); await renderDrivers(); } catch (error) { toast(error.message, "error"); } }));
  document.querySelectorAll("[data-review-driver]").forEach((button) => button.addEventListener("click", async () => { try { await reviewDriverApplication(button.dataset.applicationId, button.dataset.reviewDriver); toast(`Application ${button.dataset.reviewDriver}.`); await renderDrivers(); } catch (error) { toast(error.message, "error"); } }));
  document.querySelector("[data-invite-driver]")?.addEventListener("submit", async (event) => { event.preventDefault(); try { await inviteDriver(Object.fromEntries(new FormData(event.currentTarget))); toast("Driver invitation sent."); event.currentTarget.reset(); } catch (error) { toast(error.message, "error"); } });
}

async function renderVehicles() {
  const [vehicles, journeys] = await Promise.all([getVehicles(), getJourneys()]);
  const cards = vehicles.map((vehicle) => { const upcoming = journeys.filter((ride) => ride.vehicleId === vehicle.id && ride.pickupDate >= OPERATIONS_DATE && !["completed", "cancelled"].includes(ride.status)); return `<article class="vehicle-admin-card"><div class="vehicle-admin-image"><img src="${assetUrl(vehicle.image)}" alt="${escapeHtml(`${vehicle.brand} ${vehicle.model} ${vehicle.year}`)}"></div><header><div><span>${escapeHtml(vehicle.category)}</span><h2>${escapeHtml(`${vehicle.brand} ${vehicle.model}`)}</h2><p>${vehicle.year}, ${escapeHtml(vehicle.plate)}</p></div>${StatusBadge(vehicle.status)}</header><dl><div><dt>Seats</dt><dd>${vehicle.seats}</dd></div><div><dt>Luggage</dt><dd>${escapeHtml(vehicle.luggageCapacity)}</dd></div><div><dt>Upcoming rides</dt><dd>${upcoming.length}</dd></div><div><dt>Next service</dt><dd>${formatDate(vehicle.serviceDate)}</dd></div></dl><p class="vehicle-note">${escapeHtml(vehicle.notes || "No fleet note")}</p><footer><button class="admin-button" type="button" data-vehicle-unavailable="${vehicle.id}">${icon("calendar-x")} Block vehicle</button></footer></article>`; }).join("");
  const forms = vehicles.map((vehicle) => Modal(`vehicle-${vehicle.id}`, `Block ${vehicle.model} ${vehicle.year}`, `<form class="admin-form" data-vehicle-unavailable-form="${vehicle.id}"><label><span>From</span><input name="from" type="date" required></label><label><span>To</span><input name="to" type="date" required></label><label><span>Reason</span><select name="reason"><option value="service">Service</option><option value="cleaning">Cleaning</option><option value="private_use">Private use</option><option value="issue">Issue</option><option value="other">Other</option></select></label><div class="form-actions"><button class="admin-button" type="button" data-modal-close>Cancel</button><button class="admin-button admin-button--primary" type="submit">Block vehicle</button></div></form>`)).join("");
  await withLayout({ active: "vehicles", title: "Vehicles", subtitle: "Fleet readiness", content: `${PageHeading("Fleet", "Three vehicles with operational status, service dates and assignment load.")}<section class="vehicle-admin-grid">${cards}</section>${forms}` });
  bindModals();
  document.querySelectorAll("[data-vehicle-unavailable]").forEach((button) => button.addEventListener("click", () => openModal(`vehicle-${button.dataset.vehicleUnavailable}`)));
  document.querySelectorAll("[data-vehicle-unavailable-form]").forEach((form) => form.addEventListener("submit", async (event) => { event.preventDefault(); try { await setVehicleUnavailable(form.dataset.vehicleUnavailableForm, Object.fromEntries(new FormData(form))); toast("Vehicle block saved."); await renderVehicles(); } catch (error) { toast(error.message, "error"); } }));
}

async function renderPassengers() {
  const [passengers, journeys, drivers, vehicles] = await Promise.all([getPassengers(), getJourneys(), getDrivers(), getVehicles()]);
  const id = new URLSearchParams(location.search).get("id");
  const passenger = id ? passengers.find((item) => item.id === id) : null;
  if (id && !passenger) { await withLayout({ active: "passengers", title: "Passengers", subtitle: "Not found", content: ErrorState("Passenger not found", "This passenger profile is unavailable.") }); return; }
  if (passenger) {
    const history = journeys.filter((ride) => ride.passengerId === passenger.id);
    const content = `<a class="admin-back-link" href="${adminUrl("passengers/")}">${icon("arrow-left")} Back to passengers</a><section class="passenger-profile-hero"><span>${initials(passenger.name)}</span><div><h2>${escapeHtml(passenger.name)}</h2><p>${escapeHtml(passenger.email)}<br>${escapeHtml(passenger.phone)}</p></div><button class="admin-button admin-button--primary" type="button" data-modal-open="newPassengerJourney">${icon("plus")} Create journey</button></section><section class="passenger-profile-grid"><article class="detail-surface"><header><h3>Preferences</h3></header><div class="preference-tags">${passenger.preferences.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div><h4>Internal notes</h4><p>${escapeHtml(passenger.internalNotes || "No internal notes")}</p></article><article class="passenger-stats"><div><strong>${passenger.completedRides}</strong><span>Completed rides</span></div><div><strong>${passenger.upcomingRides}</strong><span>Upcoming rides</span></div><div><strong>${formatMoney(passenger.totalSpend)}</strong><span>Total spend</span></div><div><strong>${formatDate(passenger.lastRide)}</strong><span>Last ride</span></div></article></section><section class="dashboard-today"><header><div><h2>Ride history</h2><p>Journeys linked to this passenger.</p></div></header><div class="journey-list">${history.length ? history.map(JourneyRow).join("") : EmptyState("No ride history", "Journeys will appear when they are created.")}</div></section>${Modal("newPassengerJourney", `Create journey for ${passenger.name}`, manualRideForm(passengers, drivers, vehicles), "wide")}`;
    await withLayout({ active: "passengers", title: passenger.name, subtitle: "Passenger profile", content });
    document.querySelector(".passenger-profile-hero").insertAdjacentHTML("afterend", `<section class="detail-surface"><header><div><h3>Driver access</h3><p>Change this passenger account to a driver account. Email confirmation is still required to sign in.</p></div><button class="admin-button admin-button--positive" type="button" data-make-driver>Make driver</button></header><p data-driver-role-message role="status"></p></section>`);
    document.querySelector("[data-make-driver]").addEventListener("click", async (event) => {
      if (!window.confirm(`Give ${passenger.name} (${passenger.email}) access to the Driver Portal?`)) return;
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = "Updating…";
      try {
        await makePassengerDriver(passenger.id);
        location.href = adminUrl("drivers/");
      } catch (error) {
        document.querySelector("[data-driver-role-message]").textContent = error.message || "Unable to change role. Please try again.";
        button.disabled = false;
        button.textContent = "Make driver";
      }
    });
    bindModals();
    const form = document.querySelector("[data-manual-ride-form]"); if (form) form.querySelector("[name=passengerId]").value = passenger.id;
    form?.addEventListener("submit", async (event) => { event.preventDefault(); try { const ride = await createManualRide(Object.fromEntries(new FormData(form))); location.href = adminUrl(`journeys/detail.html?id=${ride.id}`); } catch (error) { toast(error.message, "error"); } });
    return;
  }
  const content = `${PageHeading("Passengers", "A light operational CRM for preferences, history and repeat bookings.")}<section class="passenger-table"><header><span>Passenger</span><span>Contact</span><span>Completed</span><span>Upcoming</span><span>Total spend</span><span>Last ride</span></header>${passengers.map((item) => `<a href="${adminUrl(`passengers/?id=${item.id}`)}"><span class="passenger-name"><b>${initials(item.name)}</b><strong>${escapeHtml(item.name)}</strong></span><span><strong>${escapeHtml(item.email)}</strong><small>${escapeHtml(item.phone)}</small></span><span>${item.completedRides}</span><span>${item.upcomingRides}</span><span>${formatMoney(item.totalSpend)}</span><span>${formatDate(item.lastRide)} ${icon("chevron-right")}</span></a>`).join("")}</section>`;
  await withLayout({ active: "passengers", title: "Passengers", subtitle: "Client operations", content });
}

async function render() {
  app.innerHTML = LoadingSkeleton(page);
  try {
    const renderers = { dashboard: renderDashboard, requests: renderRequests, journeys: renderJourneys, "journey-detail": renderJourneyDetails, drivers: renderDrivers, vehicles: renderVehicles, passengers: renderPassengers };
    await (renderers[page] || renderDashboard)();
  } catch (error) {
    console.error("Control Center load failed", JSON.stringify({
      message: error?.message || String(error),
      code: error?.code || null,
      details: error?.details || null,
      hint: error?.hint || null,
    }));
    app.innerHTML = ErrorState("Control Center unavailable", "The local operations service could not load. Please try again.");
    refreshIcons();
  }
}

render();
let adminRealtimeTimer;
subscribeToAdminRides(() => { clearTimeout(adminRealtimeTimer); adminRealtimeTimer = setTimeout(render, 120); });
