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

    const cors = getCorsHeaders(origin);

    if (request.method !== "GET" && request.method !== "OPTIONS") {
      return json({ error: "Method not allowed" }, 405, cors);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: withSecurityHeaders(cors) });
    }

    if (url.pathname !== "/cvr") {
      return new Response("Not found", { status: 404, headers: withSecurityHeaders(cors) });
    }

    const cvr = (url.searchParams.get("cvr") || "").replace(/\s+/g, "");
    const debugRequested = url.searchParams.get("debug") === "1";
    const debug = debugRequested && env.ALLOW_DEBUG === "1";

    if (!/^\d{8}$/.test(cvr)) {
      return json({ error: "CVR-nummeret skal være præcis 8 cifre." }, 400, cors);
    }

    const companyUrl = `https://api.cvr.dev/api/cvr/virksomhed?cvr_nummer=${encodeURIComponent(cvr)}`;
    const ansatteUrl = `https://api.cvr.dev/api/cvrdev/virksomhed/ansatte?cvr_nummer=${encodeURIComponent(cvr)}`;

    // Cache: use a separate cache key per CVR
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;

    // Only cache non-debug requests
    if (!debug) {
      const cached = await cache.match(cacheKey);
      if (cached) return withCors(cached, cors);
    }

    // cvr.dev docs: Authorization: Bearer <api-key>
    const authHeader = { Authorization: `Bearer ${env.CVR_DEV_API_KEY}` };
    const [companyRes, ansatteRes] = await Promise.all([
      fetch(companyUrl, { headers: authHeader }),
      fetch(ansatteUrl, { headers: authHeader }),
    ]);

    const companyText = await companyRes.text();

    if (!companyRes.ok) {
      const errorMsg = companyRes.status === 404
        ? "CVR-nummeret blev ikke fundet. Tjek at det er korrekt."
        : `Opslag fejlede (${companyRes.status}). Prøv igen senere.`;
      return json(
        {
          error: errorMsg,
          ...(debug ? { companySample: companyText.slice(0, 800) } : {}),
        },
        companyRes.status,
        cors
      );
    }

    let list;
    try {
      list = JSON.parse(companyText);
    } catch {
      return json(
        { error: "Systemet svarede ikke korrekt. Prøv igen senere.", ...(debug ? { companySample: companyText.slice(0, 800) } : {}) },
        502,
        cors
      );
    }

    const company = Array.isArray(list) ? list[0] : null;
    if (!company) return json({ error: "CVR-nummeret blev ikke fundet. Tjek at det er korrekt." }, 404, cors);

    const meta = company.virksomhedMetadata || {};

    // Name
    const name =
      meta?.nyesteNavn?.navn ||
      company?.navne?.[0]?.navn ||
      null;

    // Company form
    const virksomhedsform =
      meta?.nyesteVirksomhedsform?.kortBeskrivelse ||
      company?.virksomhedsform?.[0]?.kortBeskrivelse ||
      null;
    // ENK = Enkeltmandsvirksomhed, PMV = Personligt ejet mindre virksomhed
    const SOLE_TRADE_CODES = ["ENK", "PMV"];
    const isSoleTrade = virksomhedsform
      ? SOLE_TRADE_CODES.includes(virksomhedsform.toUpperCase())
      : false;

    // Address
    const addr =
      meta?.nyesteBeliggenhedsadresse ||
      company?.beliggenhedsadresse?.[0] ||
      meta?.nyestePostadresse ||
      company?.postadresse?.[0] ||
      null;

    const address = formatDkAddress(addr);
    const addressObject = buildOutsetaAddress(addr);

    // Parse the aggregated ansatte endpoint (covers all P-units; more up to date
    // than the virksomhed-level beskaeftigelse arrays which stop being updated for
    // many companies after a few years).
    let ansatteLatest = null;
    if (ansatteRes.ok) {
      try {
        const ansatteList = JSON.parse(await ansatteRes.text());
        // API returns either a bare object or a 1-element array depending on version
        const ansatteObj = Array.isArray(ansatteList) ? ansatteList[0] : ansatteList;
        const records = ansatteObj?.ansatte;
        if (Array.isArray(records)) {
          // Filter to non-null ansatte, then pick the record with the latest dato.
          ansatteLatest = latestRecord(
            records.filter((r) => r.ansatte != null),
            (r) => r.dato ? r.dato.replace(/-/g, "") : "0"
          );
        }
      } catch {
        // Non-fatal — fall back to virksomhed arrays below
      }
    }

    // Employees: prefer the aggregated ansatte endpoint for most companies.
    // Fall back to the raw virksomhed-level arrays if the ansatte endpoint has
    // no data (e.g. not included in subscription, or new company).
    //
    // Within the virksomhed arrays: filter nulls first, then pick the latest
    // period (monthly > quarterly > annual).

    const latestMonthly = latestRecord(
      (company.maanedsbeskaeftigelse || []).filter((r) => r.antalAnsatte != null),
      (r) => r.aar * 100 + (r.maaned || 0)
    );
    const latestQuarterly = latestRecord(
      (company.kvartalsbeskaeftigelse || []).filter((r) => r.antalAnsatte != null),
      (r) => r.aar * 10 + (r.kvartal || 0)
    );
    const latestAnnual = latestRecord(
      (company.aarsbeskaeftigelse || []).filter((r) => r.antalAnsatte != null),
      (r) => r.aar
    );

    let employees = null;
    let employeesSource = "none";
    let employeesPeriod = null;

    if (ansatteLatest != null) {
      employees = ansatteLatest.ansatte;
      employeesSource = "ansatte";
      employeesPeriod = ansatteLatest.dato;
    } else if (latestMonthly != null) {
      employees = latestMonthly.antalAnsatte;
      employeesSource = "monthly";
      employeesPeriod = `${latestMonthly.aar}-${String(latestMonthly.maaned).padStart(2, "0")}`;
    } else if (latestQuarterly != null) {
      employees = latestQuarterly.antalAnsatte;
      employeesSource = "quarterly";
      employeesPeriod = `${latestQuarterly.aar}-Q${latestQuarterly.kvartal}`;
    } else if (latestAnnual != null) {
      employees = latestAnnual.antalAnsatte;
      employeesSource = "annual";
      employeesPeriod = String(latestAnnual.aar);
    }

    // Last resort for sole traders with no employment records at all
    if (employees == null && isSoleTrade) {
      employees = 1;
      employeesSource = "soleTrade";
    }

    const payload = {
      cvr,
      name,
      address,
      addressObject,
      employees,
      employeesSource,
      employeesPeriod,
      isSoleTrade,
      ...(debug
        ? {
            debug: {
              companyStatus: companyRes.status,
              ansatteStatus: ansatteRes.status,
              employeesSource,
              employeesPeriod,
              ansatteLatest: ansatteLatest
                ? { dato: ansatteLatest.dato, ansatte: ansatteLatest.ansatte, interval: ansatteLatest.ansatte_interval, rapporteringsinterval: ansatteLatest.rapporteringsinterval }
                : null,
              latestMonthly: latestMonthly
                ? { aar: latestMonthly.aar, maaned: latestMonthly.maaned, antalAnsatte: latestMonthly.antalAnsatte, intervalKode: latestMonthly.intervalKodeAntalAnsatte }
                : null,
              latestQuarterly: latestQuarterly
                ? { aar: latestQuarterly.aar, kvartal: latestQuarterly.kvartal, antalAnsatte: latestQuarterly.antalAnsatte, intervalKode: latestQuarterly.intervalKodeAntalAnsatte }
                : null,
              latestAnnual: latestAnnual
                ? { aar: latestAnnual.aar, antalAnsatte: latestAnnual.antalAnsatte, intervalKode: latestAnnual.intervalKodeAntalAnsatte }
                : null,
              metadataMonthly: meta?.nyesteMaanedsbeskaeftigelse
                ? { aar: meta.nyesteMaanedsbeskaeftigelse.aar, maaned: meta.nyesteMaanedsbeskaeftigelse.maaned, antalAnsatte: meta.nyesteMaanedsbeskaeftigelse.antalAnsatte }
                : null,
            },
          }
        : {}),
    };

    const response = json(payload, 200, {
      ...cors,
      // Browser/proxy cache hint (1 hour)
      "Cache-Control": "public, max-age=3600",
    });

    // Edge cache (1 hour) for non-debug
    if (!debug) {
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  },
};

function latestRecord(arr, scoreFn) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr.reduce((best, cur) => (scoreFn(cur) > scoreFn(best) ? cur : best));
}

function buildOutsetaAddress(a) {
  if (!a) return null;
  const street = [a.vejnavn, a.husnummerFra ?? a.husnummer, a.bogstavFra].filter(Boolean).join(" ");
  const floorDoor = [a.etage ? `${a.etage}.` : null, a.sidedoer].filter(Boolean).join(" ");
  const line1 = [street, floorDoor].filter(Boolean).join(", ") || a.adresseTekst || "";
  return {
    AddressLine1: line1,
    AddressLine2: "",
    City: a.postdistrikt || "",
    State: "",
    PostalCode: a.postnummer ? String(a.postnummer) : "",
    Country: "Denmark",
  };
}

function formatDkAddress(a) {
  if (!a) return null;
  if (a.adresseTekst) return a.adresseTekst;

  const street = [a.vejnavn, a.husnummerFra ?? a.husnummer, a.bogstavFra].filter(Boolean).join(" ");
  const floorDoor = [a.etage ? `${a.etage}.` : null, a.sidedoer].filter(Boolean).join(" ");
  const zipCity = [a.postnummer, a.postdistrikt].filter(Boolean).join(" ");

  const parts = [street, floorDoor, zipCity].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: withSecurityHeaders({ "Content-Type": "application/json", ...headers }),
  });
}

function withCors(response, cors) {
  // Ensure CORS headers are present even for cached responses
  const h = new Headers(response.headers);
  for (const [k, v] of Object.entries(cors)) h.set(k, v);
  return new Response(response.body, { status: response.status, headers: h });
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
