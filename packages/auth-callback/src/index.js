const DEFAULT_CALLBACK_CONFIG = {
  loginReferrerPaths: ["/auth/login", "/log-ind", "/401", "/oprettelse/onboarding"],
  loginRedirectPath: "/auth/login",
  onboardingRedirectPath: "/oprettelse/onboarding",
  upgradeRedirectPath: "/kampagne/opgrader",
  overviewRedirectPath: "/oversigt",
  errorRedirectPath: "/404",
  planUidCookieName: "outsetaPlanUid",
  cookieDomain: ".anvisninger.dk",
  cookieDaysToExpire: 7,
  useWebflowReady: false,
  validPlanUids: [
    "zWZLy6Qp",
    "amR8RM9J",
    "79O8x6WE",
    "zWZG31mp",
    "LmJO1AQP",
    "DQ25J6mV",
    "wmj17oWV",
    "pWrPoaQn",
    "E9L7vZQw",
    "y9gxX8WM",
    "amRAV3WJ",
    "4960R4mX",
    "7ma8z1WE",
    "4960KdmX",
    "y9qDkqQA",
    "dQGxko94",
    "OW40EGWg",
    "XQYOn4WP",
    "wQX2vZWK",
    "L9PMe6WJ",
    "BWzE5N9E",
    "dQGxOp94",
    "OW4073Wg",
    "XQYOgRWP"
  ],
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

function checkReferrer(referrerPaths) {
  const referrer = document.referrer || "";
  return referrerPaths.some((path) => referrer.includes(path));
}

function removeCallbackFlags() {
  localStorage.removeItem("comingFromOpgrader");
  localStorage.removeItem("planUpgrade");
  localStorage.removeItem("hasLoggedIn");
}

function getCookie(name) {
  const cookieParts = `; ${document.cookie}`.split(`; ${name}=`);
  return cookieParts.length === 2 ? cookieParts.pop().split(";").shift() : null;
}

function resolveCookieDomain(config) {
  const hostname = window.location.hostname;
  if (hostname === "anvisninger.dk" || hostname.endsWith(".anvisninger.dk")) {
    return config.cookieDomain;
  }
  return null;
}

function setCookieWithExpiry(name, value, daysToExpire, cookieDomain) {
  const now = new Date();
  now.setTime(now.getTime() + daysToExpire * 24 * 60 * 60 * 1000);
  const expires = `expires=${now.toUTCString()}`;
  const domainPart = cookieDomain ? `;domain=${cookieDomain}` : "";
  document.cookie = `${name}=${value};${expires};path=/;Secure;SameSite=None${domainPart}`;
}

function deleteCookie(name, cookieDomain) {
  const domainPart = cookieDomain ? `; domain=${cookieDomain}` : "";
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/${domainPart}; Secure; SameSite=None`;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; Secure; SameSite=None`;
}

function updatePlanUidCookie(planUid, config) {
  const existingPlanUid = getCookie(config.planUidCookieName);
  if (existingPlanUid) {
    deleteCookie(config.planUidCookieName, config.cookieDomain);
  }

  setCookieWithExpiry(
    config.planUidCookieName,
    planUid,
    config.cookieDaysToExpire,
    resolveCookieDomain(config)
  );
}

function redirectToLoginWithFlag(flag, config) {
  window.location.href = `${config.loginRedirectPath}#${flag}`;
}

function redirectToErrorPage(config, errorPath = config.errorRedirectPath) {
  window.location.href = errorPath;
}

function redirectToPlan(planUid, config) {
  if (config.validPlanUids.includes(planUid)) {
    window.location.href = config.overviewRedirectPath;
    return;
  }

  console.error(`[Callback] Invalid planUid: ${planUid}`);
  redirectToErrorPage(config);
}

function handleExistingPlan(config) {
  const existingPlanUid = getCookie(config.planUidCookieName);

  if (existingPlanUid) {
    redirectToPlan(existingPlanUid, config);
    return;
  }

  redirectToLoginWithFlag("logged-in-false", config);
}

function handlePlanUpgrade(config) {
  if (!window.Outseta || typeof window.Outseta.getUser !== "function") {
    console.error("[Callback] Outseta.getUser is not available during plan upgrade.");
    redirectToErrorPage(config);
    return;
  }

  window.Outseta.getUser()
    .then((profile) => {
      const planUid = profile?.Account?.CurrentSubscription?.Plan?.Uid;

      if (!planUid) {
        console.error("[Callback] No planUid found during plan upgrade.");
        redirectToErrorPage(config);
        return;
      }

      updatePlanUidCookie(planUid, config);
      removeCallbackFlags();
      window.location.href = config.overviewRedirectPath;
    })
    .catch((error) => {
      console.error("[Callback] Error fetching user profile for plan upgrade:", error);
      redirectToErrorPage(config);
    });
}

function handleAccessTokenSet(jwt, config, opgrader, hasLoggedIn) {
  const planUid = jwt?.["outseta:planUid"];

  if (!planUid) {
    console.error("[Callback] No planUid in JWT during login redirection.", jwt);
    redirectToErrorPage(config);
    return;
  }

  setCookieWithExpiry(
    config.planUidCookieName,
    planUid,
    config.cookieDaysToExpire,
    resolveCookieDomain(config)
  );

  if (hasLoggedIn === "false") {
    removeCallbackFlags();
    window.location.href = config.onboardingRedirectPath;
    return;
  }

  if (opgrader === "true") {
    removeCallbackFlags();
    window.location.href = config.upgradeRedirectPath;
    return;
  }

  redirectToPlan(planUid, config);
}

function handleLoginRedirection(config, opgrader, hasLoggedIn) {
  if (!window.Outseta || typeof window.Outseta.on !== "function") {
    console.error("[Callback] Outseta event API is not available during login redirection.");
    redirectToErrorPage(config);
    return;
  }

  let handled = false;

  window.Outseta.on("accessToken.set", (jwt) => {
    if (handled) return;
    handled = true;

    if (!jwt) {
      console.error("[Callback] No JWT received during login redirection.");
      redirectToErrorPage(config);
      return;
    }

    handleAccessTokenSet(jwt, config, opgrader, hasLoggedIn);
  });

  setTimeout(() => {
    if (handled) return;
    console.warn("[Callback] accessToken.set was not received in time. Falling back to existing plan lookup.");
    handleExistingPlan(config);
  }, 2500);
}

export function initOutsetaAuthCallback(userConfig = {}) {
  const config = { ...DEFAULT_CALLBACK_CONFIG, ...(userConfig || {}) };

  withDomReady(() => {
    const comingFromLoginOrBackup = checkReferrer(config.loginReferrerPaths);
    const opgrader = localStorage.getItem("comingFromOpgrader");
    const planUpgrade = localStorage.getItem("planUpgrade");
    const hasLoggedIn = localStorage.getItem("hasLoggedIn");

    // If a plan cookie already exists, trust it first regardless of referrer.
    const existingPlanUid = getCookie(config.planUidCookieName);
    if (existingPlanUid) {
      redirectToPlan(existingPlanUid, config);
      return;
    }

    if (planUpgrade === "true") {
      handlePlanUpgrade(config);
      return;
    }

    // In staging or privacy-hardened contexts, referrer can be empty even after login.
    // Try accessToken flow if either referrer indicates login OR we are on callback without a plan cookie.
    if (comingFromLoginOrBackup || window.location.pathname.includes("/auth/callback")) {
      handleLoginRedirection(config, opgrader, hasLoggedIn);
      return;
    }

    handleExistingPlan(config);
  }, config.useWebflowReady);
}

export default initOutsetaAuthCallback;
