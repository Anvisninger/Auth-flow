import test from "node:test";
import assert from "node:assert/strict";

import authFlow, { initSignupFlow, isCritical, setCriticalError } from "../packages/auth-flow/src/index.js";
import authLogin, { initOutsetaMagicLogin } from "../packages/auth-login/src/index.js";
import authLogout, { initOutsetaMagicLogout, runOutsetaMagicLogout } from "../packages/auth-logout/src/index.js";
import authCallback, { initOutsetaAuthCallback } from "../packages/auth-callback/src/index.js";

test("auth package exports are available", () => {
  assert.equal(typeof authFlow, "function");
  assert.equal(typeof initSignupFlow, "function");

  assert.equal(typeof authLogin, "function");
  assert.equal(typeof initOutsetaMagicLogin, "function");

  assert.equal(typeof authLogout, "function");
  assert.equal(typeof initOutsetaMagicLogout, "function");
  assert.equal(typeof runOutsetaMagicLogout, "function");

  assert.equal(typeof authCallback, "function");
  assert.equal(typeof initOutsetaAuthCallback, "function");
});

test("auth-flow exposes critical-state flags for frontend failsafe", () => {
  assert.equal(typeof setCriticalError, "function");
  assert.equal(typeof isCritical, "boolean");

  setCriticalError();
  assert.equal(isCritical, true);
});
