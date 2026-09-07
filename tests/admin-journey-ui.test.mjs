import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../admin/admin-app.js", import.meta.url), "utf8");
const components = readFileSync(new URL("../admin/components/admin-components.js", import.meta.url), "utf8");
const service = readFileSync(new URL("../admin/services/admin-service.js", import.meta.url), "utf8");

test("journey details expose date, pickup time and requested vehicle", () => {
  assert.match(app, /journey-schedule-summary/);
  assert.match(app, /<dt>Date<\/dt>/);
  assert.match(app, /<dt>Pickup time<\/dt>/);
  assert.match(app, /<dt>Requested vehicle<\/dt>/);
});

test("request views expose the passenger vehicle choice", () => {
  assert.match(app, /request-vehicle/);
  assert.match(app, /requested-vehicle-callout/);
});

test("driver assignment checks the selected calendar day", () => {
  assert.match(service, /driver_availability_days/);
  assert.match(service, /Not marked available on/);
  assert.match(components, /Not available/);
  assert.match(components, /\["conflict","unavailable"\]/);
});

test("drivers page renders editable availability before recruitment", () => {
  assert.match(app, /data-admin-driver-day/);
  assert.match(app, /setAdminDriverAvailabilityDay/);
  assert.ok(app.indexOf('class="driver-management"') < app.indexOf('class="driver-recruitment"'));
});

test("dashboard prioritizes three alert-oriented metrics and the dispatch timeline", () => {
  const dashboardSource = app.slice(app.indexOf("async function renderDashboard"), app.indexOf("function requestLabel"));
  assert.match(dashboardSource, /dashboard-timeline/);
  assert.match(dashboardSource, /New requests[\s\S]*\? "critical"/);
  assert.doesNotMatch(dashboardSource, /Requires attention/);
  assert.doesNotMatch(dashboardSource, /A compact view of the operating day/);
  assert.doesNotMatch(dashboardSource, /Drivers available/);
  assert.doesNotMatch(dashboardSource, /Vehicles available/);
});
