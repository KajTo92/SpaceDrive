import test from "node:test";
import assert from "node:assert/strict";
import { googleMapsRouteUrl, routePoint } from "../passenger/components/live-trip-map.js";

test("Google Maps uses stored coordinates before textual addresses", () => {
  assert.equal(routePoint({ name: "Wrong label", address: "Wrong address", latitude: 47.4582, longitude: 8.5555 }), "47.4582,8.5555");
});

test("Google Maps does not duplicate identical name and address", () => {
  const place = { name: "Eichlistrasse 10, 8155 Niederhasli", address: "Eichlistrasse 10, 8155 Niederhasli" };
  assert.equal(routePoint(place), "Eichlistrasse 10, 8155 Niederhasli");
  const url = googleMapsRouteUrl(place, { name: "Zürich Airport", address: "Fromattweg, 8058 Zürich-Flughafen" });
  assert.doesNotMatch(decodeURIComponent(url), /Eichlistrasse 10, 8155 Niederhasli, Eichlistrasse 10/);
});

test("Google Maps automatically fits the viewport to the complete route", () => {
  const url = googleMapsRouteUrl(
    { latitude: 47.4582, longitude: 8.5555 },
    { latitude: 47.3769, longitude: 8.5417 },
  );
  assert.doesNotMatch(url, /[?&]z=/);
  assert.match(url, /saddr=47\.4582%2C8\.5555/);
  assert.match(url, /daddr=47\.3769%2C8\.5417/);
});
