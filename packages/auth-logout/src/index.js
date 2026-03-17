const DEFAULT_LOGOUT_CONFIG = {
  magicPublishableKey: "pk_live_5FDB2E95F816D1E5",
  redirectPath: "/auth/login#o-logout-link",
  logoutCookieName: "outsetaPlanUid",
  logoutCookieDomain: ".anvisninger.dk",
  useWebflowReady: false,
};

function withDomReady(fn, useWebflowReady) {
  if (useWebflowReady && window.Webflow && Array.isArray(window.Webflow)) {
    window.Webflow.push(fn);
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
    return;
  }

  fn();
}

function ensureMagic(config) {
  if (window.magic) {
    return window.magic;
  }

  if (!window.Magic) {
    throw new Error("Magic SDK er ikke indlæst. Tilføj script-tag i head.");
  }

  window.magic = new window.Magic(config.magicPublishableKey);
  return window.magic;
}

function clearAuthStorage() {
  localStorage.removeItem("hasLoggedIn");
}

function clearCookie(config) {
  document.cookie = `${config.logoutCookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${config.logoutCookieDomain}; Secure; SameSite=None;`;
  document.cookie = `${config.logoutCookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; Secure; SameSite=None;`;
}

async function logoutOutseta() {
  if (window.Outseta?.auth && typeof window.Outseta.auth.logout === "function") {
    await window.Outseta.auth.logout();
  }
}

export async function runOutsetaMagicLogout(userConfig = {}) {
  const config = { ...DEFAULT_LOGOUT_CONFIG, ...(userConfig || {}) };
  const magic = ensureMagic(config);

  clearAuthStorage();
  clearCookie(config);

  try {
    await logoutOutseta();
  } catch (error) {
    console.warn("[Logout] Outseta logout failed:", error);
  }

  await magic.user.logout();
  window.location.href = config.redirectPath;
}

export function initOutsetaMagicLogout(userConfig = {}) {
  withDomReady(() => {
    runOutsetaMagicLogout(userConfig).catch((error) => {
      console.error("[Logout] Failed:", error);
      window.alert("Der opstod et problem ved log ud. Prøv igen.");
    });
  }, userConfig?.useWebflowReady ?? DEFAULT_LOGOUT_CONFIG.useWebflowReady);
}

export default initOutsetaMagicLogout;