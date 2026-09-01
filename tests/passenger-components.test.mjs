import test from "node:test";
import assert from "node:assert/strict";
import { NextJourneyCard, PassengerLayout, assetUrl, setPassengerRoot } from "../passenger/components/passenger-components.js";

test("next journey renders before driver and vehicle assignment", () => {
  const html = NextJourneyCard({
    id: "0b32af53-ff71-4d03-8591-c67e223384f5",
    pickup: { name: "Zürich" },
    destination: { name: "Interlaken" },
    pickupDate: "2026-09-26",
    pickupTime: "20:00",
    passengers: 2,
    luggage: null,
    status: "confirmed",
    price: 750,
    currency: "CHF",
    vehicle: null,
    driver: null,
  });

  assert.match(html, /Assignment pending/);
  assert.match(html, /Driver pending/);
});

test("passenger layout uses the authenticated passenger identity", () => {
  const html = PassengerLayout({
    active: "home",
    title: "Home",
    passenger: { firstName: "Jan", lastName: "Kowalski" },
    notifications: [],
    content: "",
  });

  assert.match(html, /<span>JK<\/span><strong>Jan Kowalski<\/strong>/);
  assert.doesNotMatch(html, /Alex Morgan/);
});

test("bundled and external image URLs are resolved safely", () => {
  setPassengerRoot("../../");
  assert.match(assetUrl("spacedrive-monogram-header.png"), /spacedrive-monogram-header\.png$/);
  assert.match(assetUrl("y2025.png"), /y2025\.png$/);
  assert.equal(assetUrl("https://example.com/avatar.png"), "https://example.com/avatar.png");
});
