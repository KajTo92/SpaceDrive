import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const loginHtml = readFileSync(new URL("../login.html", import.meta.url), "utf8");
const loginJs = readFileSync(new URL("../login.js", import.meta.url), "utf8");
const registerJs = readFileSync(new URL("../shared/register.js", import.meta.url), "utf8");

test("login uses one form and routes authenticated users by profile role", () => {
  assert.equal((loginHtml.match(/data-login-form/g) || []).length, 1);
  assert.doesNotMatch(loginHtml, /data-login-tab|Login as passenger|Login as driver|Dispatch/);
  assert.match(loginJs, /role==="admin"\?"admin\/":role==="driver"\?"driver\/":"passenger\/"/);
});

test("login restores a persisted Supabase session and opens the role portal", () => {
  assert.match(loginJs, /supabase\.auth\.getSession\(\)/);
  assert.match(loginJs, /location\.replace\(destination\)/);
  assert.match(loginJs, /restoreSession\(\)/);
});

test("public registration cannot request a driver role", () => {
  assert.doesNotMatch(registerJs, /driver_application_requested|data\.registerForm|application_note/);
});
