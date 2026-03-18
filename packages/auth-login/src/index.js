const DEFAULT_LOGIN_CONFIG = {
  submitButtonId: "submit",
  emailInputId: "email",
  magicPublishableKey: "pk_live_5FDB2E95F816D1E5",
  magicLocale: "da",
  callbackPath: "/auth/callback",
  postSignUpElementId: "postSignUp",
  loggedInFalseElementId: "loggedInFalse",
  errorElementId: "errorTrue",
  errorBoxId: "errorbox",
  logoutCookieName: "outsetaPlanUid",
  logoutCookieDomain: ".anvisninger.dk",
  emailCheckWorkerUrl: "https://anvisninger-outseta-planinfo.maxks.workers.dev/check-email",
  emailCheckTimeoutMs: 8000,
  signupPath: "/oprettelse/opret-abonnement",
  redirectToSignupIfEmailNotFound: true,
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

function hideElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = "none";
  }
}

function displayErrorMessage(message, config) {
  const errorBox = document.getElementById(config.errorBoxId);
  if (!errorBox) {
    console.warn("[Login] error box not found:", config.errorBoxId);
    return;
  }

  // Set the error message text
  const errorContent = errorBox.querySelector("p") || errorBox;
  errorContent.textContent = message;

  // Show the error box
  errorBox.style.display = "block";
}

function clearErrorMessage(config) {
  const errorBox = document.getElementById(config.errorBoxId);
  if (errorBox) {
    errorBox.style.display = "none";
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function fetchWithTimeout(url, timeoutMs, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : null;

    if (!response.ok) {
      const message = data?.error || `HTTP ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function checkEmailExistsForLogin(email, config) {
  if (!config.emailCheckWorkerUrl || !email || !isValidEmail(email)) {
    return { checked: false, exists: true };
  }

  const url = `${config.emailCheckWorkerUrl}?email=${encodeURIComponent(email)}`;

  try {
    const data = await fetchWithTimeout(url, config.emailCheckTimeoutMs, {
      headers: { Accept: "application/json" },
    });

    return {
      checked: true,
      exists: Boolean(data?.exists),
    };
  } catch (error) {
    console.warn("[Login] email pre-check failed, proceeding with Magic login:", error);
    return { checked: true, exists: true, error };
  }
}

function redirectToSignup(email, config) {
  if (!config.redirectToSignupIfEmailNotFound || !config.signupPath) {
    return;
  }

  const signupUrl = new URL(config.signupPath, window.location.origin);
  signupUrl.searchParams.set("email", email);
  window.location.href = signupUrl.toString();
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

function getMagicErrorCode(error) {
  if (!error) {
    return null;
  }

  if (typeof error.code === "number" || typeof error.code === "string") {
    return error.code;
  }

  return null;
}

function isMagicError(error) {
  if (!error) {
    return false;
  }

  const code = getMagicErrorCode(error);
  if (typeof code === "number" && code < 0) {
    return true;
  }

  const name = String(error.name || "").toLowerCase();
  const message = String(error.message || "").toLowerCase();
  return (
    name.includes("rpcerror") ||
    name.includes("sdkerror") ||
    message.includes("magic") ||
    message.includes("otp") ||
    message.includes("id token")
  );
}

function isMagicCancellation(error) {
  if (!error) {
    return false;
  }

  const code = getMagicErrorCode(error);
  const codeAsText = String(code || "").toLowerCase();
  const name = String(error.name || "").toLowerCase();
  const message = String(error.message || "").toLowerCase();

  return (
    code === -10001 ||
    codeAsText.includes("userCancelled") ||
    codeAsText.includes("cancelled") ||
    name.includes("userCancelled") ||
    name.includes("cancelled") ||
    message.includes("user cancelled") ||
    message.includes("user closed") ||
    message.includes("modal closed") ||
    message.includes("aborted")
  );
}

function getMagicUserErrorMessage(error) {
  const code = getMagicErrorCode(error);
  const codeAsText = String(code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();

  if (code === -10003 || codeAsText.includes("useralreadyloggedin") || message.includes("already logged in")) {
    return "Du er allerede logget ind. Opdater siden og prøv igen.";
  }

  if (codeAsText.includes("magiclinkexpired") || message.includes("expired")) {
    return "Koden er udløbet. Start login igen for at få en ny kode.";
  }

  if (codeAsText.includes("magiclinkratelimited") || message.includes("rate") || message.includes("too many")) {
    return "For mange loginforsøg. Vent et øjeblik og prøv igen.";
  }

  // Invalid code is handled by Magic's modal, no additional alert needed
  if (codeAsText.includes("invalid") || message.includes("invalid otp") || message.includes("invalid code")) {
    return null;
  }

  if (codeAsText.includes("accessdeniedtouser") || code === -10011 || message.includes("access denied")) {
    return "Adgang afvist. Kontakt support for hjælp.";
  }

  if (codeAsText.includes("missingapikey") || message.includes("api key")) {
    return "Login kan ikke startes lige nu. Kontakt support for hjælp.";
  }

  return null;
}

function handleLoginError(error, config) {
  console.error("Error while logging in:", error);

  // User intentionally closed the modal - no error message needed
  if (isMagicCancellation(error)) {
    return;
  }

  if (isMagicError(error)) {
    const message = getMagicUserErrorMessage(error);
    if (message) {
      displayErrorMessage(message, config);
    }
    return;
  }

  if (String(error?.message || "").toLowerCase().includes("outseta")) {
    displayErrorMessage("Login lykkedes ikke. Prøv igen. Kontakt support, hvis fejlen fortsætter.", config);
    return;
  }

  displayErrorMessage("Der opstod et teknisk problem. Prøv igen. Kontakt support, hvis fejlen fortsætter.", config);
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

  // Clear any previous error messages
  clearErrorMessage(config);

  const submitButton = document.getElementById(config.submitButtonId);
  if (submitButton) {
    submitButton.disabled = true;
  }

  const emailInput = document.getElementById(config.emailInputId);
  const email = (emailInput?.value || "").trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    displayErrorMessage("Indtast venligst en gyldig e-mailadresse.", config);
    if (submitButton) {
      submitButton.disabled = false;
    }
    return;
  }

  if (!window.Outseta || typeof window.Outseta.setMagicLinkIdToken !== "function" || typeof window.Outseta.getUser !== "function") {
    throw new Error("Outseta er ikke tilgængelig.");
  }

  const emailCheckResult = await checkEmailExistsForLogin(email, config);
  if (emailCheckResult.checked && !emailCheckResult.exists) {
    displayErrorMessage("Vi kunne ikke finde en konto med denne e-mail. Fortsæt til oprettelse.", config);
    if (submitButton) {
      submitButton.disabled = false;
    }
    redirectToSignup(email, config);
    return;
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
      handleLoginError(error, config);
    }

    const submitButton = document.getElementById(config.submitButtonId);
    if (!submitButton) {
      console.warn("[Login] submit button not found:", config.submitButtonId);
      return;
    }

    submitButton.addEventListener("click", (event) => {
      handleLogin(event, config).catch((error) => {
        if (!isMagicCancellation(error)) {
          handleLoginError(error, config);
        }
        submitButton.disabled = false;
      });
    });

    handleURLActions(config);
  }, config.useWebflowReady);
}

export default initOutsetaMagicLogin;