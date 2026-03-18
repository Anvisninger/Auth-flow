const ALLOWED_ORIGINS = [
  "https://anvisninger-dk-e81a432f7570a8eceb515ecb.webflow.io",
  "https://anvisninger.dk",
  "https://www.anvisninger.dk",
];

function getCorsHeaders(origin) {
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    };
  }
  return {};
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    // Check origin
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return new Response(JSON.stringify({ error: "Origin not allowed" }), {
        status: 403,
        headers: withSecurityHeaders({ "Content-Type": "application/json" }),
      });
    }

    const corsHeaders = getCorsHeaders(origin);

    if (request.method !== "GET" && request.method !== "OPTIONS") {
      return json({ error: "Method not allowed" }, 405, withNoStore(corsHeaders));
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: withSecurityHeaders(corsHeaders) });
    }

    if (url.pathname === "/plans") {
      return handlePlans(url, env, corsHeaders);
    }

    if (url.pathname === "/check-email") {
      return handleCheckEmail(request, url, env, corsHeaders, ctx);
    }

    return new Response("Not found", {
      status: 404,
      headers: withSecurityHeaders(corsHeaders),
    });
  },
};

async function handlePlans(url, env, corsHeaders) {
  const employeesParam = url.searchParams.get("employees");
  const employees =
    employeesParam != null && employeesParam !== ""
      ? Number(employeesParam)
      : null;

  if (employeesParam != null && (!Number.isFinite(employees) || employees < 0)) {
    return json({ error: "Ugyldigt antal medarbejdere." }, 400, withNoStore(corsHeaders));
  }

  const planFamilyName = "OffentligtUdbud - Prismodel 2026";

  const endpoint = "https://anvisninger.outseta.com/api/v1/billing/planfamilies";

  const res = await fetchOutseta(endpoint, env);

  if (!res.ok) {
    await res.text();
    return json(
      { error: "Planopslag er midlertidigt utilgængeligt. Prøv igen senere." },
      502,
      withNoStore(corsHeaders)
    );
  }

  const raw = await res.json();

  const family = (raw?.items || []).find((pf) => pf?.Name === planFamilyName);

  if (!family) {
    return json(
      {
        error: "Prisplanerne kunne ikke findes. Kontakt support, hvis problemet fortsætter.",
      },
      404,
      withNoStore(corsHeaders)
    );
  }

  const plans = (family?.Plans || [])
    .filter((p) => p && p.IsActive !== false)
    .map((p) => ({
      planUid: p?.Uid ?? null,
      name: p?.Name ?? null,
      annualRate: Number(p?.AnnualRate),
      maximumPeople: p?.MaximumPeople == null ? null : Number(p.MaximumPeople),
    }))
    .filter((p) => p.planUid && p.name)
    .sort((a, b) => {
      if (a.maximumPeople == null) return 1;
      if (b.maximumPeople == null) return -1;
      return a.maximumPeople - b.maximumPeople;
    });

  let selectedPlan = null;

  if (employees != null) {
    for (const p of plans) {
      if (p.maximumPeople != null && employees <= p.maximumPeople) {
        selectedPlan = p;
        break;
      }
    }

    if (!selectedPlan) {
      selectedPlan =
        plans.find((p) => p.maximumPeople == null) ||
        plans[plans.length - 1] ||
        null;
    }
  }

  return json(
    {
      planFamilyName,
      plans,
      ...(employees != null ? { employees, plan: selectedPlan } : {}),
    },
    200,
    withNoStore(corsHeaders)
  );
}

async function handleCheckEmail(request, url, env, corsHeaders, ctx) {
  const emailParam = url.searchParams.get("email");
  const email = (emailParam || "").trim().toLowerCase();

  if (!email) {
    return json({ error: "Manglende e-mailadresse." }, 400, withNoStore(corsHeaders));
  }

  if (!isValidEmail(email)) {
    return json({ error: "Ugyldig e-mailadresse." }, 400, withNoStore(corsHeaders));
  }

  if (await isRateLimited(request, ctx)) {
    return json(
      { error: "For mange forespørgsler. Vent et øjeblik og prøv igen." },
      429,
      withNoStore(corsHeaders)
    );
  }

  // Query Outseta for person with this email
  // Email parameter filters the query correctly
  const endpoint = `https://anvisninger.outseta.com/api/v1/crm/people?Email=${encodeURIComponent(email)}`;

  const res = await fetchOutseta(endpoint, env);

  if (!res.ok) {
    await res.text();
    return json(
      { error: "E-mailvalidering er midlertidigt utilgængelig. Prøv igen senere." },
      502,
      withNoStore(corsHeaders)
    );
  }

  const raw = await res.json();
  const people = raw?.items || [];

  // Only block if person exists AND is attached to an account
  let exists = false;
  if (people.length > 0) {
    const person = people[0];
    // PersonAccount is an array of PersonAccount objects
    // A non-empty PersonAccount array means the person is linked to an account
    // Note: Account object inside PersonAccount may be null even when link exists
    const personAccounts = Array.isArray(person?.PersonAccount) ? person.PersonAccount : [];
    const hasAccount = personAccounts.length > 0;
    exists = !!hasAccount;
  }

  return json(
    {
      exists,
      message: exists ? "E-mailadressen er allerede tilknyttet en konto." : "E-mailadressen kan bruges.",
    },
    200,
    withNoStore(corsHeaders)
  );
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getClientFingerprint(request) {
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "unknown";
  const userAgent = request.headers.get("User-Agent") || "unknown";
  return `${ip}|${userAgent}`;
}

async function isRateLimited(request, ctx) {
  const fingerprint = getClientFingerprint(request);
  const cache = caches.default;

  // Counter key tracks total requests per fingerprint (1-hour window)
  const counterKey = new Request(
    `https://internal.anvisninger/check-email-counter/${encodeURIComponent(fingerprint)}`
  );

  // Last-request-time key tracks when the user last made a request
  const lastRequestKey = new Request(
    `https://internal.anvisninger/check-email-last-request/${encodeURIComponent(fingerprint)}`
  );

  const [counterResponse, lastRequestResponse] = await Promise.all([
    cache.match(counterKey),
    cache.match(lastRequestKey),
  ]);

  let count = 0;
  if (counterResponse) {
    const text = await counterResponse.text();
    count = parseInt(text, 10) || 0;
  }

  // Increment counter for this request
  count++;

  // Progressive backoff thresholds:
  // - Checks 1-2: No rate limit (free checks)
  // - Checks 3-4: 5-second cooldown (allow but with delay)
  // - Checks 5-10: 15-second cooldown (escalating)
  // - Checks 11+: 60-second cooldown (hard limit)

  let shouldBlock = false;
  let cooldownSeconds = 0;

  if (count > 2 && count <= 4) {
    cooldownSeconds = 5;
  } else if (count > 4 && count <= 10) {
    cooldownSeconds = 15;
  } else if (count > 10) {
    cooldownSeconds = 60;
  }

  // Check if user is in cooldown period
  if (cooldownSeconds > 0 && lastRequestResponse) {
    const lastRequestTime = parseInt(await lastRequestResponse.text(), 10);
    const now = Date.now();
    const elapsedSeconds = (now - lastRequestTime) / 1000;

    if (elapsedSeconds < cooldownSeconds) {
      shouldBlock = true;
    }
  }

  if (shouldBlock) {
    return true;
  }

  // Update cache: increment counter (1-hour TTL) and update last-request time (cooldown TTL)
  const counterMarker = new Response(String(count), {
    headers: {
      "Cache-Control": "max-age=3600", // 1 hour
    },
  });

  const lastRequestMarker = new Response(String(Date.now()), {
    headers: {
      "Cache-Control": `max-age=${cooldownSeconds || 60}`, // At least 60s to avoid duplicate updates
    },
  });

  const write = Promise.all([
    cache.put(counterKey, counterMarker),
    cache.put(lastRequestKey, lastRequestMarker),
  ]);

  if (ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(write);
  } else {
    await write;
  }

  return false;
}

function withNoStore(headers) {
  return {
    ...headers,
    "Cache-Control": "no-store",
  };
}

function withSecurityHeaders(headers = {}) {
  return {
    ...headers,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  };
}

async function fetchOutseta(endpoint, env) {
  const authHeader = `Outseta ${env.OUTSETA_API_KEY}:${env.OUTSETA_API_SECRET}`;

  return fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
    },
  });
}

function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: withSecurityHeaders({ "Content-Type": "application/json", ...headers }),
  });
}
