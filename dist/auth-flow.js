var AnvisningerAuthFlow = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // packages/auth-flow/src/index.js
  var index_exports = {};
  __export(index_exports, {
    default: () => index_default,
    initOutsetaAuthCallback: () => initOutsetaAuthCallback,
    initOutsetaMagicLogin: () => initOutsetaMagicLogin,
    initOutsetaMagicLogout: () => initOutsetaMagicLogout,
    initSignupFlow: () => initSignupFlow,
    isCritical: () => isCritical,
    setCriticalError: () => setCriticalError
  });

  // packages/auth-flow/src/ga-tracking.js
  function generateTransactionId() {
    const now = /* @__PURE__ */ new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const dateStr = `${year}${month}${day}`;
    const uid = Array.from(
      { length: 8 },
      () => Math.floor(Math.random() * 16).toString(16)
    ).join("");
    return `ANV-${dateStr}-${uid}`;
  }
  function pushGAPurchaseEvent(config, state) {
    if (!config.gaConfig || !config.gaConfig.trackPurchase) return;
    if (!state.plan || !state.plan.annualRate) return;
    window.dataLayer = window.dataLayer || [];
    const plan = state.plan;
    const transactionId = generateTransactionId();
    const affiliation = config.gaConfig.companyName || "Anvisninger.dk";
    const itemCategory = config.gaConfig.itemCategory || "Abonnement";
    const itemId = plan.planUid || "PLAN_UID_IKKE_FUNDET";
    const itemName = plan.name || "PLAN_NAVN_IKKE_FUNDET";
    const price = Math.round(plan.annualRate);
    const currency = "DKK";
    window.dataLayer.push({
      event: "purchase",
      ecommerce: {
        transaction_id: transactionId,
        affiliation,
        value: price,
        currency,
        items: [
          {
            item_id: itemId,
            item_name: itemName,
            affiliation,
            item_category: itemCategory,
            item_brand: affiliation,
            price,
            quantity: 1
          }
        ]
      }
    });
  }
  function setupOutsetaCompletionTracking(config, state) {
    if (!config.gaConfig || !config.gaConfig.trackPurchase) return;
    if (!window.Outseta || typeof window.Outseta.on !== "function") return;
    window.Outseta.on("signup", (account) => {
      pushGAPurchaseEvent(config, state);
    });
  }

  // packages/auth-callback/src/index.js
  var DEFAULT_CALLBACK_CONFIG = {
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
      "j9bn3w9n",
      "zWZG31mp",
      "LmJO1AQP",
      "DQ25J6mV",
      "wmj17oWV",
      "pWrPoaQn",
      "E9L7vZQw",
      "y9gxX8WM",
      "Rm88n5m4",
      "L9P8AE9J",
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
      "BWzE5N9E"
    ]
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
    const now = /* @__PURE__ */ new Date();
    now.setTime(now.getTime() + daysToExpire * 24 * 60 * 60 * 1e3);
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
    window.Outseta.getUser().then((profile) => {
      const planUid = profile?.Account?.CurrentSubscription?.Plan?.Uid;
      if (!planUid) {
        console.error("[Callback] No planUid found during plan upgrade.");
        redirectToErrorPage(config);
        return;
      }
      updatePlanUidCookie(planUid, config);
      removeCallbackFlags();
      window.location.href = config.overviewRedirectPath;
    }).catch((error) => {
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
    window.Outseta.on("accessToken.set", (jwt) => {
      if (!jwt) {
        console.error("[Callback] No JWT received during login redirection.");
        redirectToErrorPage(config);
        return;
      }
      handleAccessTokenSet(jwt, config, opgrader, hasLoggedIn);
    });
  }
  function initOutsetaAuthCallback(userConfig = {}) {
    const config = { ...DEFAULT_CALLBACK_CONFIG, ...userConfig || {} };
    withDomReady(() => {
      const comingFromLoginOrBackup = checkReferrer(config.loginReferrerPaths);
      const opgrader = localStorage.getItem("comingFromOpgrader");
      const planUpgrade = localStorage.getItem("planUpgrade");
      const hasLoggedIn = localStorage.getItem("hasLoggedIn");
      if (comingFromLoginOrBackup) {
        handleLoginRedirection(config, opgrader, hasLoggedIn);
        return;
      }
      if (planUpgrade === "true") {
        handlePlanUpgrade(config);
        return;
      }
      handleExistingPlan(config);
    }, config.useWebflowReady);
  }

  // packages/auth-login/src/index.js
  var DEFAULT_LOGIN_CONFIG = {
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
    useWebflowReady: false
  };
  function withDomReady2(fn, useWebflowReady) {
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
  function resolveCookieDomain2(config) {
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
    expireCookie(config.logoutCookieName, resolveCookieDomain2(config));
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
    window.alert(`Der er opst\xE5et et problem: ${error?.message || error} Venligst kontakt support.`);
  }
  function ensureMagic(config) {
    if (window.magic) {
      return window.magic;
    }
    if (!window.Magic) {
      throw new Error("Magic SDK er ikke indl\xE6st. Tilf\xF8j script-tag i head.");
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
      throw new Error("Outseta er ikke tilg\xE6ngelig.");
    }
    const magic = ensureMagic(config);
    const idToken = await magic.auth.loginWithEmailOTP({ email });
    await window.Outseta.setMagicLinkIdToken(idToken);
    const user = await window.Outseta.getUser();
    localStorage.setItem("hasLoggedIn", user?.HasLoggedIn);
    window.location.href = config.callbackPath;
  }
  function initOutsetaMagicLogin(userConfig = {}) {
    const config = { ...DEFAULT_LOGIN_CONFIG, ...userConfig || {} };
    withDomReady2(() => {
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

  // packages/auth-logout/src/index.js
  var DEFAULT_LOGOUT_CONFIG = {
    magicPublishableKey: "pk_live_5FDB2E95F816D1E5",
    redirectPath: "/auth/login#o-logout-link",
    logoutCookieName: "outsetaPlanUid",
    logoutCookieDomain: ".anvisninger.dk",
    useWebflowReady: false
  };
  function withDomReady3(fn, useWebflowReady) {
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
  function ensureMagic2(config) {
    if (window.magic) {
      return window.magic;
    }
    if (!window.Magic) {
      throw new Error("Magic SDK er ikke indl\xE6st. Tilf\xF8j script-tag i head.");
    }
    window.magic = new window.Magic(config.magicPublishableKey);
    return window.magic;
  }
  function clearAuthStorage2() {
    localStorage.clear();
    sessionStorage.clear();
  }
  function resolveCookieDomain3(config) {
    const hostname = window.location.hostname;
    if (hostname === "anvisninger.dk" || hostname.endsWith(".anvisninger.dk")) {
      return config.logoutCookieDomain;
    }
    return null;
  }
  function expireCookie2(name, domain) {
    const domainPart = domain ? `; domain=${domain}` : "";
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domainPart}; Secure; SameSite=None;`;
  }
  function clearCookie(config) {
    expireCookie2(config.logoutCookieName, resolveCookieDomain3(config));
    expireCookie2(config.logoutCookieName, null);
  }
  async function logoutOutseta() {
    if (window.Outseta?.auth && typeof window.Outseta.auth.logout === "function") {
      await window.Outseta.auth.logout();
    }
  }
  async function runOutsetaMagicLogout(userConfig = {}) {
    const config = { ...DEFAULT_LOGOUT_CONFIG, ...userConfig || {} };
    const magic = ensureMagic2(config);
    clearAuthStorage2();
    clearCookie(config);
    try {
      await logoutOutseta();
    } catch (error) {
      console.warn("[Logout] Outseta logout failed:", error);
    }
    await magic.user.logout();
    window.location.href = config.redirectPath;
  }
  function initOutsetaMagicLogout(userConfig = {}) {
    withDomReady3(() => {
      runOutsetaMagicLogout(userConfig).catch((error) => {
        console.error("[Logout] Failed:", error);
        window.alert("Der opstod et problem ved log ud. Pr\xF8v igen.");
      });
    }, userConfig?.useWebflowReady ?? DEFAULT_LOGOUT_CONFIG.useWebflowReady);
  }

  // packages/auth-flow/src/index.js
  var BUILD_TIME = true ? "2026-03-17T14:29:08.495Z" : null;
  var DEFAULT_CONFIG = {
    sliderId: "slider-signup",
    cvrWorkerUrl: "https://anvisninger-cvr-dev.maxks.workers.dev/cvr",
    planWorkerUrl: "https://anvisninger-outseta-planinfo.maxks.workers.dev/plans",
    basisPlanUid: "BWzE5N9E",
    cvrInputId: "CVR-input",
    overlayId: "cvr-loading-overlay",
    errorBoxIds: null,
    outputIds: {
      cvr: "CVR",
      name: "companyName",
      address: "companyAddress",
      employees: "companyEmployees",
      planName: "planName",
      pricePerYear: "pricePerYear"
    },
    radios: {
      customerType: { name: "customerType", values: ["Privat", "Erhverv", "Offentlig", "Uddannelse"] },
      basisOrPro: { name: "basisOrPro", values: ["Basis", "Pro"] }
    },
    timeouts: {
      cvrMs: 12e3,
      planMs: 12e3
    },
    useWebflowReady: true,
    onPlanUidChange: null,
    handOffButtonId: "hand-off-outseta",
    outsetaState: "checkout",
    registrationDefaultsBuilder: null,
    personFieldIds: {
      email: "email",
      firstName: "first-name",
      lastName: "last-name",
      phone: "phone-number"
    },
    emailCheckWorkerUrl: null,
    emailCheckTimeoutMs: 8e3,
    invoicingFieldIds: {
      ean: "EAN",
      invoiceEmail: "Faktureringsmail"
    },
    gaConfig: {
      companyName: "Anvisninger",
      itemCategory: "Abonnement",
      trackPurchase: true
    },
    outsetaDomain: "anvisninger.outseta.com"
  };
  var STEP_ORDER = [
    "customerType",
    "basisOrPro",
    "cvr",
    "company",
    "planReview",
    "invoicing",
    "contactSales",
    "contact"
  ];
  var isCritical = false;
  function setCriticalError() {
    isCritical = true;
    console.warn("[Flow] Critical error detected - form is broken");
  }
  function withDomReady4(fn, useWebflowReady) {
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
  function setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value === void 0 || value === null || value === "" ? "-" : String(value);
  }
  function showError(errorBoxId, msg) {
    const el = document.getElementById(errorBoxId);
    if (!el) return;
    el.textContent = msg || "";
    el.style.display = msg ? "block" : "none";
  }
  function toKebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/[\s_]+/g, "-").toLowerCase();
  }
  function getErrorBoxId(config, step, fieldId = null) {
    if (config.errorBoxIds && step && config.errorBoxIds[step]) {
      return config.errorBoxIds[step];
    }
    if (step) {
      const stepKebab = toKebabCase(step);
      if (fieldId) {
        const fieldKebab = toKebabCase(fieldId);
        return `errorbox-${stepKebab}-${fieldKebab}`;
      }
      return `errorbox-${stepKebab}`;
    }
    return null;
  }
  function showErrorForStep(config, step, msg) {
    const id = getErrorBoxId(config, step);
    if (!id) return;
    showError(id, msg);
  }
  function showErrorForCurrent(sliderEl, config, msg) {
    const step = getCurrentStep(sliderEl);
    showErrorForStep(config, step, msg);
  }
  function showInvoicingError(config, fieldKey, msg) {
    const fieldIdMap = {
      email: config.invoicingFieldIds.invoiceEmail,
      ean: config.invoicingFieldIds.ean
    };
    const fieldId = fieldIdMap[fieldKey] || fieldKey;
    const id = getErrorBoxId(config, "invoicing", fieldId);
    if (!id) return;
    showError(id, msg);
  }
  function clearInvoicingErrors(config) {
    showInvoicingError(config, "email", "");
    showInvoicingError(config, "ean", "");
  }
  function clearAllErrors(config) {
    STEP_ORDER.forEach((step) => showErrorForStep(config, step, ""));
    clearInvoicingErrors(config);
    showError(getErrorBoxId(config, "contact", config.personFieldIds.email), "");
    showError(getErrorBoxId(config, "contact", config.personFieldIds.firstName), "");
    showError(getErrorBoxId(config, "contact", config.personFieldIds.lastName), "");
    showError(getErrorBoxId(config, "contact", config.personFieldIds.phone), "");
  }
  function showOverlay(overlayId, show) {
    const el = document.getElementById(overlayId);
    if (!el) return;
    if (show) {
      el.style.display = "flex";
      el.style.flexDirection = "row";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.gap = "0px";
    } else {
      el.style.display = "none";
    }
  }
  function lockAllArrows(sliderEl, lock) {
    const arrows = sliderEl.querySelectorAll(
      ".w-slider-arrow-right, .w-slider-arrow-left"
    );
    arrows.forEach((arrow) => {
      arrow.style.pointerEvents = lock ? "none" : "";
      arrow.style.opacity = lock ? "0.4" : "";
      arrow.style.cursor = lock ? "default" : "";
      arrow.setAttribute("aria-disabled", lock ? "true" : "false");
    });
  }
  function setRightArrowEnabled(sliderEl, enabled) {
    const right = sliderEl.querySelector(".w-slider-arrow-right");
    if (!right) return;
    right.style.pointerEvents = enabled ? "" : "none";
    right.style.opacity = enabled ? "" : "0.4";
    right.style.cursor = enabled ? "" : "default";
    right.setAttribute("aria-disabled", enabled ? "false" : "true");
  }
  function setButtonEnabled(button, enabled) {
    if (!button) return;
    button.style.pointerEvents = enabled ? "" : "none";
    button.style.opacity = enabled ? "" : "0.5";
    button.style.cursor = enabled ? "" : "default";
    button.setAttribute("aria-disabled", enabled ? "false" : "true");
    if ("disabled" in button) button.disabled = !enabled;
  }
  function isErrorVisible(errorBoxId) {
    const el = document.getElementById(errorBoxId);
    if (!el) return false;
    return (el.textContent || "").trim() !== "" && el.style.display !== "none";
  }
  function getSlides(sliderEl) {
    return Array.from(sliderEl.querySelectorAll(".w-slide"));
  }
  function getCurrentIndex(sliderEl) {
    const dots = Array.from(sliderEl.querySelectorAll(".w-slider-dot"));
    const activeIdx = dots.findIndex((d) => d.classList.contains("w-active"));
    if (activeIdx >= 0) return activeIdx;
    const slides = getSlides(sliderEl);
    const currentIdx = slides.findIndex((s) => s.classList.contains("w--current"));
    return currentIdx >= 0 ? currentIdx : 0;
  }
  function getCurrentStep(sliderEl) {
    const slides = getSlides(sliderEl);
    const idx = getCurrentIndex(sliderEl);
    const slide = slides[idx] || slides[0];
    return slide ? (slide.getAttribute("data-step") || "").trim() : null;
  }
  function buildStepToIndex(sliderEl) {
    const slides = getSlides(sliderEl);
    const m = /* @__PURE__ */ new Map();
    slides.forEach((s, i) => {
      const step = (s.getAttribute("data-step") || "").trim();
      if (step) m.set(step, i);
    });
    return m;
  }
  function clickDot(sliderEl, index) {
    const dots = sliderEl.querySelectorAll(".w-slider-dot");
    const dot = dots && dots[index];
    if (!dot) {
      console.warn("[Flow] dot not found for index:", index);
      return;
    }
    dot.click();
  }
  function goToStep(sliderEl, stepToIndex, stepName, nav) {
    const idx = stepToIndex.get(stepName);
    if (typeof idx !== "number") {
      console.error("[Flow] Unknown step:", stepName, "known:", Array.from(stepToIndex.keys()));
      return;
    }
    nav.isProgrammaticNav = true;
    clickDot(sliderEl, idx);
    setTimeout(() => {
      const slides = sliderEl.querySelectorAll("[data-step]");
      slides.forEach((slide) => {
        if (slide.dataset.step === stepName) {
          slide.removeAttribute("aria-hidden");
        }
      });
      nav.isProgrammaticNav = false;
    }, 150);
  }
  function goToStepWithHistory(sliderEl, stepToIndex, targetStep, nav) {
    const currentStep = getCurrentStep(sliderEl);
    if (currentStep && currentStep !== targetStep) nav.history.push(currentStep);
    goToStep(sliderEl, stepToIndex, targetStep, nav);
  }
  function getRadioValueByName(name) {
    const checked = document.querySelector(
      'input[type="radio"][name="' + name + '"]:checked'
    );
    return checked ? checked.value : null;
  }
  function isValidEmail2(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
  function isValidEan(value) {
    return /^\d{13}$/.test(value);
  }
  function isValidDanishPhone(phone) {
    if (!phone) return false;
    const raw = phone.trim();
    const digits = raw.replace(/\D/g, "");
    if (raw.startsWith("+") || raw.startsWith("00")) {
      if (digits.startsWith("45")) return digits.length === 10;
      if (digits.startsWith("0045")) return digits.length === 12;
      return true;
    }
    return digits.length === 8;
  }
  function formatDanishPhone(phone) {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 8) {
      return "+45" + digits;
    }
    if (digits.startsWith("0045")) {
      return "+45" + digits.slice(4);
    }
    return phone;
  }
  function syncNextArrowRequirement(sliderEl, radios) {
    const step = getCurrentStep(sliderEl);
    if (step === "customerType") {
      setRightArrowEnabled(sliderEl, !!getRadioValueByName(radios.customerType.name));
      return;
    }
    if (step === "basisOrPro") {
      setRightArrowEnabled(sliderEl, !!getRadioValueByName(radios.basisOrPro.name));
      return;
    }
    if (step === "contactSales") {
      setRightArrowEnabled(sliderEl, false);
      return;
    }
    setRightArrowEnabled(sliderEl, true);
  }
  function resetState(state, nav, config, keepPersonType = false) {
    nav.history = [];
    if (!keepPersonType) state.personType = null;
    state.subscriptionType = null;
    state.planUid = null;
    state.plan = null;
    state.company = { cvr: null, name: null, address: null, addressObject: null, employees: null };
    clearAllErrors(config);
  }
  function resetFromStep(step, state, nav, config) {
    if (step === "customerType") return resetState(state, nav, config);
    if (step === "basisOrPro") return resetState(state, nav, config, true);
    if (step === "cvr") {
      nav.history = [];
      state.company = { cvr: null, name: null, address: null, addressObject: null, employees: null };
      showErrorForStep(config, "cvr", "");
      return;
    }
    showErrorForStep(config, step, "");
  }
  function nextAfterCompany(state) {
    if (state.subscriptionType === "paid") return "planReview";
    if (state.personType === "organisation" && state.subscriptionType === "free") return "contact";
    return "invoicing";
  }
  async function fetchWithTimeout(url, timeoutMs, options) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs || 12e3);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let errorMsg = "";
        let isCritical2 = false;
        if (res.status === 403) {
          errorMsg = "Systemet er ikke tilg\xE6ngeligt fra dit lokation. Kontakt venligst support.";
          isCritical2 = true;
        } else if (res.status === 404) {
          errorMsg = data && data.error ? data.error : "Ikke fundet. Tjek dine oplysninger og pr\xF8v igen.";
          isCritical2 = false;
        } else if (res.status >= 500) {
          errorMsg = "Serveren har problemer. Pr\xF8v igen senere.";
          isCritical2 = true;
        } else {
          errorMsg = data && data.error ? data.error : "Systemfejl (" + res.status + ")";
        }
        const err = new Error(errorMsg);
        err.isCritical = isCritical2;
        throw err;
      }
      return data;
    } catch (err) {
      if (err && err.name === "AbortError") {
        const timeoutErr = new Error("Anmodningen tok for lang tid. Pr\xF8v igen.");
        timeoutErr.isCritical = true;
        throw timeoutErr;
      }
      throw err;
    } finally {
      clearTimeout(t);
    }
  }
  async function fetchCVR(cvr, config) {
    const url = config.cvrWorkerUrl + "?cvr=" + encodeURIComponent(cvr);
    return fetchWithTimeout(url, config.timeouts.cvrMs, { headers: { Accept: "application/json" } });
  }
  async function fetchPlanInfoByEmployees(employees, config) {
    const url = config.planWorkerUrl + "?employees=" + encodeURIComponent(String(employees));
    return fetchWithTimeout(url, config.timeouts.planMs, { headers: { Accept: "application/json" } });
  }
  async function checkEmailExists(email, config) {
    if (!email || !isValidEmail2(email)) return { exists: false };
    const baseUrl = config.emailCheckWorkerUrl ? config.emailCheckWorkerUrl : config.planWorkerUrl.replace(/\/plans$/, "/check-email");
    const url = baseUrl + "?email=" + encodeURIComponent(email);
    try {
      const res = await fetchWithTimeout(url, config.emailCheckTimeoutMs, {
        headers: { Accept: "application/json" }
      });
      return res;
    } catch (err) {
      console.error("[Flow] email check failed:", err);
      return { exists: false, error: err && err.message ? err.message : null };
    }
  }
  function formatDKK(n) {
    const num = Number(n);
    if (!Number.isFinite(num)) return "-";
    return num.toLocaleString("da-DK", { maximumFractionDigits: 0 });
  }
  function setPlanUI(plan, config) {
    if (!plan) {
      setText(config.outputIds.planName, "-");
      setText(config.outputIds.pricePerYear, "-");
      return;
    }
    setText(config.outputIds.planName, plan.name || "-");
    if (plan.planUid === config.basisPlanUid) {
      setText(config.outputIds.pricePerYear, "0");
      return;
    }
    setText(config.outputIds.pricePerYear, formatDKK(plan.annualRate));
  }
  function notifyPlanUidChange(config, planUid) {
    if (typeof config.onPlanUidChange === "function") {
      config.onPlanUidChange(planUid);
    }
  }
  function getInputValueById(id) {
    if (!id) return "";
    const el = document.getElementById(id);
    if (!el) return "";
    return (el.value || "").trim();
  }
  function normalizeRegistrationDefaults(defaults) {
    if (!defaults || typeof defaults !== "object") return { Person: {}, Account: {} };
    const normalized = {
      Person: defaults.Person || {},
      Account: defaults.Account || {}
    };
    if (defaults.Subscription) {
      normalized.Subscription = defaults.Subscription;
    }
    return normalized;
  }
  function buildRegistrationDefaults(config, state) {
    if (typeof config.registrationDefaultsBuilder === "function") {
      return normalizeRegistrationDefaults(config.registrationDefaultsBuilder(state));
    }
    const person = {
      Email: getInputValueById(config.personFieldIds.email),
      FirstName: getInputValueById(config.personFieldIds.firstName),
      LastName: getInputValueById(config.personFieldIds.lastName)
    };
    const phone = getInputValueById(config.personFieldIds.phone);
    if (phone) {
      person.PhoneMobile = formatDanishPhone(phone);
    }
    const account = {};
    const companyName = state.company.name;
    if (companyName) {
      account.Name = companyName;
    }
    const cvr = state.company.cvr;
    if (cvr) account.CVR_VAT = cvr;
    const addressObject = state.company.addressObject;
    if (addressObject) account.BillingAddress = addressObject;
    const employees = state.company.employees;
    if (employees !== void 0 && employees !== null) {
      account.AntalAnsatte = Number(employees);
    }
    const ean = getInputValueById(config.invoicingFieldIds.ean);
    if (ean) account.Ean = ean;
    const invoiceEmail = getInputValueById(config.invoicingFieldIds.invoiceEmail);
    if (invoiceEmail) account.Faktureringsmail = invoiceEmail;
    return normalizeRegistrationDefaults({
      Person: person,
      Account: account
    });
  }
  function initSignupFlow(userConfig = {}) {
    const config = {
      ...DEFAULT_CONFIG,
      ...userConfig,
      outputIds: { ...DEFAULT_CONFIG.outputIds, ...userConfig.outputIds || {} },
      radios: { ...DEFAULT_CONFIG.radios, ...userConfig.radios || {} },
      timeouts: { ...DEFAULT_CONFIG.timeouts, ...userConfig.timeouts || {} },
      gaConfig: { ...DEFAULT_CONFIG.gaConfig, ...userConfig.gaConfig || {} }
    };
    const state = {
      personType: null,
      subscriptionType: null,
      planUid: null,
      plan: null,
      company: { cvr: null, name: null, address: null, employees: null },
      emailCheck: { email: "", status: "idle" }
    };
    const nav = {
      history: [],
      isProgrammaticNav: false
    };
    if (BUILD_TIME) {
      console.log("[Flow] build time", BUILD_TIME);
    } else {
      console.log("[Flow] build time unknown");
    }
    withDomReady4(() => {
      const sliderEl = document.getElementById(config.sliderId);
      if (!sliderEl) {
        console.error("[Flow] slider not found:", config.sliderId);
        return;
      }
      let updateHandOffButtonState = () => {
      };
      const stepToIndex = buildStepToIndex(sliderEl);
      document.querySelectorAll('input[type="radio"][name="' + config.radios.customerType.name + '"]').forEach((r) => {
        r.addEventListener("change", () => {
          resetState(state, nav, config);
          syncNextArrowRequirement(sliderEl, config.radios);
        });
      });
      document.querySelectorAll('input[type="radio"][name="' + config.radios.basisOrPro.name + '"]').forEach((r) => {
        r.addEventListener("change", () => {
          resetState(state, nav, config, true);
          syncNextArrowRequirement(sliderEl, config.radios);
        });
      });
      const attachInputClearer = (fieldId, step, field) => {
        const input = document.getElementById(fieldId);
        if (!input) return;
        const clearError = () => showError(getErrorBoxId(config, step, field), "");
        if (step === "invoicing") {
          input.addEventListener("input", () => {
            if (field === "email") showInvoicingError(config, "email", "");
            else if (field === "ean") showInvoicingError(config, "ean", "");
          });
        } else {
          input.addEventListener("input", clearError);
        }
      };
      const cvrInput = document.getElementById(config.cvrInputId);
      if (cvrInput) {
        cvrInput.addEventListener("input", () => showErrorForStep(config, "cvr", ""));
      }
      sliderEl.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        if (nav.isProgrammaticNav) return;
        const currentStep = getCurrentStep(sliderEl);
        if (currentStep === "contact") return;
        const arrow = sliderEl.querySelector(".w-slider-arrow-right");
        if (!arrow) return;
        if (arrow.style.pointerEvents === "none") return;
        e.preventDefault();
        arrow.click();
      });
      attachInputClearer(config.personFieldIds.firstName, "contact", config.personFieldIds.firstName);
      attachInputClearer(config.personFieldIds.lastName, "contact", config.personFieldIds.lastName);
      attachInputClearer(config.personFieldIds.email, "contact", config.personFieldIds.email);
      attachInputClearer(config.personFieldIds.phone, "contact", config.personFieldIds.phone);
      attachInputClearer(config.invoicingFieldIds.invoiceEmail, "invoicing", "email");
      attachInputClearer(config.invoicingFieldIds.ean, "invoicing", "ean");
      const emailInputLive = document.getElementById(config.personFieldIds.email);
      if (emailInputLive) {
        emailInputLive.addEventListener("input", () => {
          state.emailCheck = { email: "", status: "idle" };
          updateHandOffButtonState();
        });
      }
      sliderEl.addEventListener(
        "click",
        () => {
          setTimeout(() => syncNextArrowRequirement(sliderEl, config.radios), 60);
        },
        true
      );
      setTimeout(() => syncNextArrowRequirement(sliderEl, config.radios), 80);
      sliderEl.addEventListener(
        "click",
        (e) => {
          const backArrow = e.target.closest(".w-slider-arrow-left");
          if (!backArrow) return;
          if (nav.isProgrammaticNav) return;
          const currentStep = getCurrentStep(sliderEl);
          const prevStep = nav.history.pop();
          if (!prevStep) return;
          e.preventDefault();
          e.stopPropagation();
          if (currentStep === "contactSales" && prevStep === "customerType") {
            goToStep(sliderEl, stepToIndex, prevStep, nav);
            setTimeout(() => syncNextArrowRequirement(sliderEl, config.radios), 80);
          } else {
            resetFromStep(prevStep, state, nav, config);
            goToStep(sliderEl, stepToIndex, prevStep, nav);
            setTimeout(() => syncNextArrowRequirement(sliderEl, config.radios), 80);
          }
        },
        true
      );
      let inFlight = false;
      sliderEl.addEventListener(
        "click",
        async (e) => {
          const nextArrow = e.target.closest(".w-slider-arrow-right");
          if (!nextArrow) return;
          if (nav.isProgrammaticNav) return;
          const currentStep = getCurrentStep(sliderEl);
          if (currentStep === "customerType") {
            e.preventDefault();
            e.stopPropagation();
            const value = getRadioValueByName(config.radios.customerType.name);
            if (value === "Privat") {
              state.personType = "private";
              state.subscriptionType = "free";
              state.planUid = config.basisPlanUid;
              state.plan = {
                name: "Basis",
                annualRate: 0,
                planUid: config.basisPlanUid,
                maximumPeople: null
              };
              setPlanUI(state.plan, config);
              notifyPlanUidChange(config, state.planUid);
              goToStepWithHistory(sliderEl, stepToIndex, "contact", nav);
            } else if (value === "Erhverv") {
              state.personType = "organisation";
              goToStepWithHistory(sliderEl, stepToIndex, "basisOrPro", nav);
            } else if (value === "Offentlig" || value === "Uddannelse") {
              state.personType = value.toLowerCase();
              goToStepWithHistory(sliderEl, stepToIndex, "contactSales", nav);
            }
            return;
          }
          if (currentStep === "basisOrPro") {
            e.preventDefault();
            e.stopPropagation();
            const value = getRadioValueByName(config.radios.basisOrPro.name);
            if (value === "Basis") {
              state.subscriptionType = "free";
              state.planUid = config.basisPlanUid;
              state.plan = {
                name: "Basis",
                annualRate: 0,
                planUid: config.basisPlanUid,
                maximumPeople: null
              };
              setPlanUI(state.plan, config);
              notifyPlanUidChange(config, state.planUid);
            } else {
              state.subscriptionType = "paid";
              state.planUid = null;
              state.plan = null;
              setPlanUI(null, config);
              notifyPlanUidChange(config, null);
            }
            goToStepWithHistory(sliderEl, stepToIndex, "cvr", nav);
            return;
          }
          if (currentStep === "cvr") {
            e.preventDefault();
            e.stopPropagation();
            if (!cvrInput) {
              showErrorForStep(config, currentStep, "Der opstod en teknisk fejl. Opdater siden og pr\xF8v igen.");
              return;
            }
            if (inFlight) return;
            showErrorForStep(config, currentStep, "");
            const cvr = (cvrInput.value || "").replace(/\s+/g, "");
            if (!/^\d{8}$/.test(cvr)) {
              showErrorForStep(config, currentStep, "CVR skal v\xE6re 8 cifre.");
              return;
            }
            inFlight = true;
            lockAllArrows(sliderEl, true);
            showOverlay(config.overlayId, true);
            try {
              const data = await fetchCVR(cvr, config);
              if (!data.cvr || !data.name) {
                throw new Error("CVR blev ikke fundet. Tjek at CVR'et er korrekt.");
              }
              if (data.employees == null && state.subscriptionType === "paid") {
                showErrorForStep(
                  config,
                  currentStep,
                  "Vi kunne ikke finde medarbejdertallet for denne virksomhed. Kontakt venligst vores salgsteam."
                );
                return;
              }
              state.company = {
                cvr: data.cvr || cvr,
                name: data.name || null,
                address: data.address || null,
                addressObject: data.addressObject || null,
                employees: data.employees === void 0 ? null : data.employees
              };
              if (!state.company.name) {
                throw new Error("Virksomhedsnavn kunne ikke findes. Tjek CVR'et.");
              }
              if (!state.company.address) {
                throw new Error("Virksomhedsadresse kunne ikke findes. Kontakt venligst vores salgsteam.");
              }
              setText(config.outputIds.cvr, state.company.cvr);
              setText(config.outputIds.name, state.company.name);
              setText(config.outputIds.address, state.company.address);
              setText(
                config.outputIds.employees,
                state.company.employees == null ? "-" : state.company.employees
              );
              if (state.subscriptionType === "paid") {
                const employees = state.company.employees;
                if (employees == null) {
                  throw new Error("Employee count missing for paid subscription.");
                }
                const planResp = await fetchPlanInfoByEmployees(employees, config);
                const selected = planResp && planResp.plan ? planResp.plan : null;
                const planUid = selected?.planUid || selected?.Uid || planResp?.planUid || null;
                if (!selected || !planUid) {
                  throw new Error("No plan found for employee count.");
                }
                state.planUid = planUid;
                state.plan = selected;
                setPlanUI(selected, config);
                notifyPlanUidChange(config, state.planUid);
              } else {
                state.planUid = config.basisPlanUid;
                state.plan = {
                  name: "Basis",
                  annualRate: 0,
                  planUid: config.basisPlanUid,
                  maximumPeople: null
                };
                setPlanUI(state.plan, config);
                notifyPlanUidChange(config, state.planUid);
              }
              goToStepWithHistory(sliderEl, stepToIndex, "company", nav);
            } catch (err) {
              console.error("[Flow] CVR/plan lookup failed:", err);
              if (err && err.isCritical) {
                if (typeof setCriticalError === "function") {
                  setCriticalError();
                } else {
                  console.warn("[Flow] setCriticalError not available");
                }
              }
              showErrorForStep(
                config,
                currentStep,
                err && err.message ? err.message : "Vi kunne ikke hente virksomhedsoplysninger. Tjek CVR'et og pr\xF8v igen."
              );
            } finally {
              showOverlay(config.overlayId, false);
              lockAllArrows(sliderEl, false);
              inFlight = false;
              setTimeout(() => syncNextArrowRequirement(sliderEl, config.radios), 80);
            }
            return;
          }
          if (currentStep === "planReview") {
            e.preventDefault();
            e.stopPropagation();
            showErrorForStep(config, currentStep, "");
            goToStepWithHistory(sliderEl, stepToIndex, "invoicing", nav);
            return;
          }
          if (currentStep === "company") {
            e.preventDefault();
            e.stopPropagation();
            showErrorForStep(config, currentStep, "");
            const nextStep = nextAfterCompany(state);
            goToStepWithHistory(sliderEl, stepToIndex, nextStep, nav);
            return;
          }
          if (currentStep === "contactSales") {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          if (currentStep === "invoicing") {
            e.preventDefault();
            e.stopPropagation();
            clearInvoicingErrors(config);
            const invoiceEmail = getInputValueById(config.invoicingFieldIds.invoiceEmail);
            const ean = getInputValueById(config.invoicingFieldIds.ean);
            let hasError = false;
            if (invoiceEmail && !isValidEmail2(invoiceEmail)) {
              showInvoicingError(config, "email", "Faktureringse-mailadresse er ugyldig.");
              hasError = true;
            }
            if (ean && !isValidEan(ean)) {
              showInvoicingError(config, "ean", "EAN skal v\xE6re 13 cifre.");
              hasError = true;
            }
            if (hasError) return;
            goToStepWithHistory(sliderEl, stepToIndex, "contact", nav);
            return;
          }
        },
        true
      );
      const form = sliderEl.closest("form");
      if (form) form.addEventListener("submit", (e) => e.preventDefault());
      const handOffButton = document.getElementById(config.handOffButtonId);
      if (handOffButton) {
        const handOffDefaultText = (handOffButton.textContent || "").trim() || "Bekr\xE6ft";
        const setHandOffButtonText = (status) => {
          if (status === "pending") {
            handOffButton.textContent = "Validerer e-mail...";
            return;
          }
          handOffButton.textContent = handOffDefaultText;
        };
        const setContactInputsEnabled = (enabled) => {
          const contactFieldIds2 = [
            config.personFieldIds.firstName,
            config.personFieldIds.lastName,
            config.personFieldIds.email,
            config.personFieldIds.phone
          ];
          contactFieldIds2.forEach((fieldId) => {
            const input = document.getElementById(fieldId);
            if (!input) return;
            input.disabled = !enabled;
          });
        };
        const setBackArrowEnabled = (enabled) => {
          const backArrow = sliderEl.querySelector(".w-slider-arrow-left");
          if (!backArrow) return;
          backArrow.style.pointerEvents = enabled ? "" : "none";
          backArrow.style.opacity = enabled ? "" : "0.4";
          backArrow.style.cursor = enabled ? "" : "default";
          backArrow.setAttribute("aria-disabled", enabled ? "false" : "true");
        };
        updateHandOffButtonState = () => {
          const firstName = getInputValueById(config.personFieldIds.firstName);
          const lastName = getInputValueById(config.personFieldIds.lastName);
          const email = getInputValueById(config.personFieldIds.email);
          const phone = getInputValueById(config.personFieldIds.phone);
          const check = state.emailCheck || { email: "", status: "idle" };
          let enabled = true;
          if (!firstName || !lastName || !email || !isValidEmail2(email)) {
            enabled = false;
          }
          if (email && isValidEmail2(email)) {
            if (check.email === email && (check.status === "exists" || check.status === "error" || check.status === "pending")) {
              enabled = false;
            }
          }
          if (phone && !isValidDanishPhone(phone)) {
            enabled = false;
          }
          if (isErrorVisible(getErrorBoxId(config, "contact", config.personFieldIds.firstName)) || isErrorVisible(getErrorBoxId(config, "contact", config.personFieldIds.lastName)) || isErrorVisible(getErrorBoxId(config, "contact", config.personFieldIds.email)) || isErrorVisible(getErrorBoxId(config, "contact", config.personFieldIds.phone))) {
            enabled = false;
          }
          setButtonEnabled(handOffButton, enabled);
          setHandOffButtonText(check.status);
          setContactInputsEnabled(check.status !== "pending");
          setBackArrowEnabled(check.status !== "pending");
        };
        const contactFieldIds = [
          config.personFieldIds.firstName,
          config.personFieldIds.lastName,
          config.personFieldIds.email,
          config.personFieldIds.phone
        ];
        contactFieldIds.forEach((fieldId) => {
          const input = document.getElementById(fieldId);
          if (!input) return;
          input.addEventListener("input", updateHandOffButtonState);
        });
        const phoneInput = document.getElementById(config.personFieldIds.phone);
        if (phoneInput) {
          phoneInput.addEventListener("input", () => {
            const phone = getInputValueById(config.personFieldIds.phone);
            const phoneErrorBoxId = getErrorBoxId(config, "contact", config.personFieldIds.phone);
            if (phone && !isValidDanishPhone(phone)) {
              showError(phoneErrorBoxId, "Telefonnummeret skal v\xE6re 8 cifre (dansk) eller inkludere landekode.");
            } else {
              showError(phoneErrorBoxId, "");
            }
          });
        }
        updateHandOffButtonState();
        handOffButton.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          showError(getErrorBoxId(config, "contact", config.personFieldIds.firstName), "");
          showError(getErrorBoxId(config, "contact", config.personFieldIds.lastName), "");
          showError(getErrorBoxId(config, "contact", config.personFieldIds.email), "");
          showError(getErrorBoxId(config, "contact", config.personFieldIds.phone), "");
          const firstName = getInputValueById(config.personFieldIds.firstName);
          const lastName = getInputValueById(config.personFieldIds.lastName);
          const email = getInputValueById(config.personFieldIds.email);
          let hasError = false;
          if (!firstName) {
            showError(getErrorBoxId(config, "contact", config.personFieldIds.firstName), "Fornavn er p\xE5kr\xE6vet.");
            hasError = true;
          }
          if (!lastName) {
            showError(getErrorBoxId(config, "contact", config.personFieldIds.lastName), "Efternavn er p\xE5kr\xE6vet.");
            hasError = true;
          }
          if (!email || !isValidEmail2(email)) {
            showError(getErrorBoxId(config, "contact", config.personFieldIds.email), "En gyldig e-mailadresse er p\xE5kr\xE6vet.");
            hasError = true;
          }
          const emailCheck = state.emailCheck || { email: "", status: "idle" };
          if (!hasError && email && isValidEmail2(email)) {
            if (emailCheck.email !== email || emailCheck.status === "idle") {
              state.emailCheck = { email, status: "pending" };
              updateHandOffButtonState();
              const result = await checkEmailExists(email, config);
              console.log("[Flow] Email check result:", result);
              if (result.exists) {
                showError(getErrorBoxId(config, "contact", config.personFieldIds.email), "Denne e-mailadresse er allerede registreret. Brug venligst en anden e-mailadresse.");
                state.emailCheck = { email, status: "exists" };
                hasError = true;
              } else if (result.error) {
                showError(getErrorBoxId(config, "contact", config.personFieldIds.email), "E-mailadressen kunne ikke valideres. Pr\xF8v igen.");
                state.emailCheck = { email, status: "error" };
                hasError = true;
              } else {
                state.emailCheck = { email, status: "ok" };
              }
              updateHandOffButtonState();
            } else if (emailCheck.status === "pending") {
              showError(getErrorBoxId(config, "contact", config.personFieldIds.email), "E-mailadressen valideres. Vent et \xF8jeblik.");
              hasError = true;
            } else if (emailCheck.status === "exists") {
              showError(getErrorBoxId(config, "contact", config.personFieldIds.email), "Denne e-mailadresse er allerede registreret. Brug venligst en anden e-mailadresse.");
              hasError = true;
            } else if (emailCheck.status === "error") {
              showError(getErrorBoxId(config, "contact", config.personFieldIds.email), "E-mailadressen kunne ikke valideres. Pr\xF8v igen.");
              hasError = true;
            }
          }
          const phone = getInputValueById(config.personFieldIds.phone);
          if (phone && !isValidDanishPhone(phone)) {
            showError(getErrorBoxId(config, "contact", config.personFieldIds.phone), "Telefonnummeret skal v\xE6re 8 cifre (dansk) eller inkludere landekode.");
            hasError = true;
          }
          const emailErrorBox = document.getElementById(getErrorBoxId(config, "contact", config.personFieldIds.email));
          if (emailErrorBox && emailErrorBox.textContent && emailErrorBox.style.display === "block") {
            hasError = true;
          }
          if (hasError) return;
          if (!window.Outseta || !window.Outseta.auth || !window.Outseta.auth.open) {
            showErrorForCurrent(sliderEl, config, "Betalingssystemet er ikke tilg\xE6ngeligt. Pr\xF8v igen senere.");
            return;
          }
          const registrationDefaults = buildRegistrationDefaults(config, state) || { Person: {}, Account: {} };
          console.log("[Flow] Sending to Outseta:", {
            planUid: state.planUid,
            state: config.outsetaState,
            registrationDefaults: JSON.stringify(registrationDefaults)
          });
          window.Outseta.auth.open({
            planUid: state.planUid,
            state: config.outsetaState,
            registrationDefaults
          });
          setupOutsetaCompletionTracking(config, state);
        });
      } else {
        console.warn("[Flow] handoff button not found:", config.handOffButtonId);
      }
      console.log("[Flow] ready", {
        sliderId: config.sliderId,
        worker: config.cvrWorkerUrl,
        steps: Array.from(stepToIndex.keys())
      });
    }, config.useWebflowReady);
    return {
      getState: () => ({ ...state, company: { ...state.company } })
    };
  }
  var index_default = initSignupFlow;
  return __toCommonJS(index_exports);
})();
