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
