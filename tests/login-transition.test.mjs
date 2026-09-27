import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const home = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const login = readFileSync(new URL("../login.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("homepage login links use the cinematic page transition", () => {
  assert.equal((home.match(/data-login-transition/g) || []).length, 2);
  assert.match(app, /spacedrive-login-transition/);
  assert.match(app, /prefers-reduced-motion: reduce/);
  assert.match(css, /login-page-out/);
  assert.match(css, /login-curtain-in/);
});

test("login page restores the matching entrance animation before paint", () => {
  assert.match(login, /sessionStorage\.getItem\("spacedrive-login-transition"\)/);
  assert.match(login, /classList\.add\("login-arrival"\)/);
  assert.match(css, /html\.login-arrival \.login-main/);
});
