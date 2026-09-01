import test from "node:test";
import assert from "node:assert/strict";
import { NextJourneyCard } from "../passenger/components/passenger-components.js";

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
