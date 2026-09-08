import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const page = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("public transfer booking captures passenger count", () => {
  assert.match(page, /id="passengerCount"/);
  assert.match(page, /data-public-passengers/);
  assert.match(app, /passengers: Number\(elements\.passengerCount\.value \|\| 1\)/);
});

test("email inquiry opens a populated draft addressed to Space Drive", () => {
  assert.match(app, /const INQUIRY_EMAIL = "jan@spacecode\.ch"/);
  assert.match(app, /window\.location\.href = getMailtoUrl\(payload\)/);
  assert.match(app, /Email: \$\{email\}/);
  assert.match(app, /Passengers: \$\{passengers\}/);
  assert.doesNotMatch(app, /submit_ride_request/);
});

test("mobile booking shows contact details before the email action", () => {
  assert.match(styles, /\.map-column \{ display: contents; \}/);
  assert.match(styles, /\.contact-panel \{[^}]*order: 3;/);
  assert.match(styles, /\.email-request-cta \{ order: 4; \}/);
});
