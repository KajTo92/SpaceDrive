import test from "node:test";
import assert from "node:assert/strict";
import { serviceTypeLabel } from "../shared/service-type.js";

test("service types have consistent labels in every portal", () => {
  assert.equal(serviceTypeLabel({ serviceType: "transfer" }), "Simple Transfer");
  assert.equal(serviceTypeLabel({ requestType: "city_tour" }), "City Tour");
  assert.equal(serviceTypeLabel({ serviceType: "hourly_concierge" }), "Hourly Concierge");
});
