const ALLOWED_ORIGINS = [
  "https://anvisninger-dk-e81a432f7570a8eceb515ecb.webflow.io",
  "https://anvisninger.dk",
  "https://www.anvisninger.dk",
];

function getCorsHeaders(origin) {
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
        headers: { "Content-Type": "application/json" },
      });
    }

    const corsHeaders = getCorsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/plans") {
      return handlePlans(url, env, corsHeaders);
    }

    if (url.pathname === "/check-email") {
      return handleCheckEmail(request, url, env, corsHeaders, ctx);
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
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
  const cacheKey = new Request(`https://internal.anvisninger/check-email-rate-limit/${encodeURIComponent(fingerprint)}`);
  const existing = await cache.match(cacheKey);
  if (existing) {
    return true;
  }

  const marker = new Response("1", {
    headers: {
      "Cache-Control": "max-age=3",
    },
  });

  const write = cache.put(cacheKey, marker);
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
    headers: { "Content-Type": "application/json", ...headers },
  });
}
