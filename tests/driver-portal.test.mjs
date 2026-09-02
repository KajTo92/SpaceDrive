import test from "node:test";
import assert from "node:assert/strict";
import { FlightInfoCard, PassengerPreferencesCard } from "../driver/components/driver-components.js";
import { buildNavigationUrl } from "../driver/services/navigation-service.js";

test("driver navigation accepts database coordinate strings", () => {
  const url = buildNavigationUrl({ destination: { latitude: "47.4582", longitude: "8.5555" } });
  assert.match(decodeURIComponent(url), /destination=47\.4582,8\.5555/);
});

test("driver navigation falls back to a full textual address", () => {
  const url = buildNavigationUrl({ destination: { name: "Zürich Airport", address: "Flughafenstrasse, 8058 Zürich" } });
  assert.match(decodeURIComponent(url), /destination=Flughafenstrasse,\+8058\+Zürich/);
});

test("driver briefing shows passenger preferences and a stored flight number", () => {
  const ride = {
    preferences: ["Cabin temperature: 21°C", "Water: still"],
    specialRequests: ["Quiet ride"],
    flightNumber: "LX123",
  };
  assert.match(PassengerPreferencesCard(ride), /Cabin temperature: 21°C/);
  assert.match(PassengerPreferencesCard(ride), /Quiet ride/);
  assert.match(FlightInfoCard(ride), /LX123/);
});
