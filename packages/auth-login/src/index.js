const DEFAULT_LOGIN_CONFIG = {
  submitButtonId: "submit",
  emailInputId: "email",
  magicPublishableKey: "pk_live_5FDB2E95F816D1E5",
  magicLocale: "da",
  callbackPath: "/auth/callback",
  postSignUpElementId: "postSignUp",
  loggedInFalseElementId: "loggedInFalse",
  errorElementId: "errorTrue",
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

function displayElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = "block";
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function clearAuthStorage() {
  localStorage.clear();
  sessionStorage.clear();
}

function resolveCookieDomain(config) {
  const hostname = window.location.hostname;
  if (hostname === "anvisninger.dk" || hostname.endsWith(".anvisninger.dk")) {
    return config.logoutCookieDomain;
  }
  return null;
}

function expireCookie(name, domain) {
  const domainPart = domain ? `; domain=${domain}` : "";
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domainPart}; Secure; SameSite=None;`;
}

function handleLogout(config) {
  clearAuthStorage();
  expireCookie(config.logoutCookieName, resolveCookieDomain(config));
  window.alert("Luk venligst alle vinduer for at logge helt ud!");
}

function handleURLActions(config) {
  const currentUrl = new URL(window.location.href);
  const route = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;

  if (route.includes("post-sign-up")) {
    displayElement(config.postSignUpElementId);
  } else if (route.includes("o-logout-link")) {
    handleLogout(config);
  } else if (route.includes("logged-in-false")) {
    displayElement(config.loggedInFalseElementId);
  } else if (currentUrl.pathname === "/404" || route.includes("/404")) {
    displayElement(config.errorElementId);
  }
}

function handleLoginError(error) {
  console.error("Error while logging in:", error);
  window.alert(`Der er opstået et problem: ${error?.message || error} Venligst kontakt support.`);
}

function ensureMagic(config) {
  if (window.magic) {
    return window.magic;
  }

  if (!window.Magic) {
    throw new Error("Magic SDK er ikke indlæst. Tilføj script-tag i head.");
  }

  window.magic = new window.Magic(config.magicPublishableKey, { locale: config.magicLocale });
  return window.magic;
}

async function handleLogin(event, config) {
  event.preventDefault();

  const emailInput = document.getElementById(config.emailInputId);
  const email = (emailInput?.value || "").trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    window.alert("Indtast venligst en gyldig e-mailadresse.");
    return;
  }

  if (!window.Outseta || typeof window.Outseta.setMagicLinkIdToken !== "function" || typeof window.Outseta.getUser !== "function") {
    throw new Error("Outseta er ikke tilgængelig.");
  }

  const magic = ensureMagic(config);
  const idToken = await magic.auth.loginWithEmailOTP({ email });
  await window.Outseta.setMagicLinkIdToken(idToken);
  const user = await window.Outseta.getUser();
  localStorage.setItem("hasLoggedIn", user?.HasLoggedIn);
  window.location.href = config.callbackPath;
}

export function initOutsetaMagicLogin(userConfig = {}) {
  const config = { ...DEFAULT_LOGIN_CONFIG, ...(userConfig || {}) };

  withDomReady(() => {
    try {
      ensureMagic(config);
    } catch (error) {
      handleLoginError(error);
    }

    const submitButton = document.getElementById(config.submitButtonId);
    if (!submitButton) {
      console.warn("[Login] submit button not found:", config.submitButtonId);
      return;
    }

    submitButton.addEventListener("click", (event) => {
      handleLogin(event, config).catch(handleLoginError);
    });

    handleURLActions(config);
  }, config.useWebflowReady);
}

export default initOutsetaMagicLogin;