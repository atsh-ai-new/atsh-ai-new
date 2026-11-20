import { canonicalDomain, checkDomainWithNamecheap } from "./domain-availability.js";
import { isIP } from "node:net";

// IANA's authoritative RDAP bootstrap. This provides REAL registration records,
// not a registrar quote and never a guarantee that an unregistered name is purchasable.
const BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json";
const BOOTSTRAP_TTL_MS = 24 * 60 * 60 * 1000;
let cachedServices = null;
let lastBootstrapAt = 0;

function safeRegistryBase(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash) return null;
    if (!/^[a-z0-9.-]+$/i.test(url.hostname) || !url.hostname.includes(".") ||
        url.hostname === "localhost" || url.hostname.endsWith(".localhost") ||
        url.hostname.endsWith(".local") || url.hostname.endsWith(".internal") || isIP(url.hostname)) return null;
    return url;
  } catch { return null; }
}

export function findRegistryRdapBase(domain, services) {
  const tld = domain.split(".").at(-1);
  if (!Array.isArray(services)) return null;
  for (const row of services) {
    if (!Array.isArray(row) || !Array.isArray(row[0]) || !Array.isArray(row[1])) continue;
    if (!row[0].some(suffix => typeof suffix === "string" && suffix.toLowerCase() === tld)) continue;
    for (const value of row[1]) {
      if (typeof value !== "string") continue;
      const url = safeRegistryBase(value);
      if (url) return url;
    }
  }
  return null;
}

async function loadBootstrap(fetchFn) {
  if (cachedServices && Date.now() - lastBootstrapAt < BOOTSTRAP_TTL_MS) return cachedServices;
  const response = await fetchFn(BOOTSTRAP_URL, {
    headers: { Accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw Error("RDAP bootstrap unavailable");
  const body = await response.json();
  if (!Array.isArray(body?.services) || body.services.length === 0 || body.services.length > 10000) {
    throw Error("Invalid RDAP bootstrap");
  }
  cachedServices = body.services;
  lastBootstrapAt = Date.now();
  return cachedServices;
}

/**
 * status=registered: an authoritative registry record exists.
 * status=not_registered: authoritative registry RDAP returned HTTP 404.
 * Neither result is a registrar purchase quotation. available is NEVER true here.
 */
export async function checkDomainWithRdap(input, { fetchFn = fetch, services } = {}) {
  const domain = canonicalDomain(input);
  if (!domain) throw Error("Invalid domain");
  const registryServices = services ?? await loadBootstrap(fetchFn);
  const base = findRegistryRdapBase(domain, registryServices);
  const common = {
    domain, provider: "rdap", environment: "production", checkedAt: new Date().toISOString(),
    reservation: false, regularPriceVerified: false, available: null
  };
  if (!base) return { ...common, status: "unsupported", verifiedRegistration: false };
  const registryUrl = new URL(base);
  registryUrl.pathname = registryUrl.pathname.replace(/\/?$/, "/") + "domain/" + encodeURIComponent(domain);
  const response = await fetchFn(registryUrl, {
    headers: { Accept: "application/rdap+json, application/json" },
    redirect: "error", signal: AbortSignal.timeout(8000)
  });
  if (response.status === 404) {
    return { ...common, status: "not_registered", verifiedRegistration: true };
  }
  if (response.status !== 200) throw Error("RDAP registry unavailable");
  let payload;
  try { payload = await response.json(); } catch { throw Error("Invalid RDAP registry response"); }
  if (payload?.objectClassName !== "domain" || payload?.ldhName?.toLowerCase() !== domain) {
    throw Error("Unverified RDAP domain response");
  }
  return { ...common, status: "registered", available: false, verifiedRegistration: true };
}

// Prefer actual registrar availability if a production account is configured.
// Sandbox MUST NOT be used as live availability: its registry is fictitious.
export async function checkDomainLive(input, { env = process.env, fetchFn = fetch, services } = {}) {
  const domain = canonicalDomain(input);
  if (!domain) throw Error("Invalid domain");
  const registrarKeys = ["NAMECHEAP_API_KEY", "NAMECHEAP_API_USER", "NAMECHEAP_USERNAME", "NAMECHEAP_CLIENT_IP"];
  if (env.NAMECHEAP_ENV === "production" && registrarKeys.every(key => Boolean(env[key]))) {
    const result = await checkDomainWithNamecheap(domain, { env, fetchFn });
    if (result.configured && typeof result.available === "boolean") {
      return { ...result, status: result.available ? "available" : "unavailable", verifiedRegistration: true };
    }
  }
  return checkDomainWithRdap(domain, { fetchFn, services });
}
