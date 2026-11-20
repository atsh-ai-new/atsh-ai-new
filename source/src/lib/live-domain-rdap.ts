import {domainToASCII} from "node:url";
import {isIP} from "node:net";

export type RegistryLookup = {
  domain: string;
  provider: "rdap";
  environment: "production";
  status: "registered" | "not_registered" | "unsupported";
  available: false | null;
  verifiedRegistration: boolean;
  reservation: false;
  regularPriceVerified: false;
  checkedAt: string;
};

type BootstrapService = [string[], string[]];
let bootstrapCache: {services: BootstrapService[]; expiresAt: number} | null = null;
const resultsCache = new Map<string, {value: RegistryLookup; expiresAt: number}>();

export function normalizeDomain(value: string): string | null {
  if (typeof value !== "string" || value.length > 253 || /[\/\\?#@:&\s]/u.test(value.trim())) return null;
  const domain = domainToASCII(value.trim().toLowerCase().replace(/\.$/, ""));
  if (!domain || domain.length > 253 || domain.length < 4) return null;
  const labels = domain.split(".");
  if (labels.length < 2 || labels.some(label =>
    label.length < 1 || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
  )) return null;
  if (!/^[a-z]{2,63}$/.test(labels[labels.length - 1])) return null;
  return domain;
}

function safeRdapBase(input: string): URL | null {
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.port || url.username || url.password || url.search || url.hash ||
        !/^[a-z0-9.-]+$/i.test(url.hostname) || !url.hostname.includes(".") ||
        isIP(url.hostname) || url.hostname.endsWith(".local") || url.hostname.endsWith(".internal") ||
        url.hostname === "localhost" || url.hostname.endsWith(".localhost")) return null;
    return url;
  } catch { return null; }
}

export function findAuthoritativeRdapBase(domain: string, services: BootstrapService[]): URL | null {
  let best: {url: URL; length: number} | null = null;
  for (const entry of services) {
    if (!Array.isArray(entry) || !Array.isArray(entry[0]) || !Array.isArray(entry[1])) continue;
    for (const suffix of entry[0]) {
      if (typeof suffix !== "string" || !(domain === suffix || domain.endsWith("." + suffix))) continue;
      if (best && best.length >= suffix.length) continue;
      for (const raw of entry[1]) {
        if (typeof raw !== "string") continue;
        const url = safeRdapBase(raw);
        if (url) {best = {url, length: suffix.length}; break;}
      }
    }
  }
  return best?.url ?? null;
}

async function authoritativeServices(fetchFn: typeof fetch): Promise<BootstrapService[]> {
  if (bootstrapCache && bootstrapCache.expiresAt > Date.now()) return bootstrapCache.services;
  const response = await fetchFn("https://data.iana.org/rdap/dns.json", {
    headers: {Accept: "application/json"},
    redirect: "error",
    signal: AbortSignal.timeout(8000),
    cache: "no-store"
  });
  if (!response.ok) throw new Error("IANA RDAP bootstrap failed");
  const data = await response.json();
  if (!Array.isArray(data?.services) || data.services.length < 1 || data.services.length > 10000)
    throw new Error("Invalid IANA RDAP bootstrap");
  bootstrapCache = {services: data.services as BootstrapService[], expiresAt: Date.now() + 12 * 60 * 60 * 1000};
  return bootstrapCache.services;
}

/**
 * Authoritative RDAP reads registration records only.
 * A 404 may mean "not registered", NEVER guaranteed availability for sale.
 * Unsupported extensions remain unknown, and network errors are not converted to availability.
 */
export async function lookupRegistry(
  rawName: string,
  options: {fetchFn?: typeof fetch; services?: BootstrapService[]} = {}
): Promise<RegistryLookup> {
  const domain = normalizeDomain(rawName);
  if (!domain) throw new Error("Invalid domain");
  const cached = resultsCache.get(domain);
  if (!options.fetchFn && !options.services && cached && cached.expiresAt > Date.now()) return cached.value;

  const fetchFn = options.fetchFn ?? fetch;
  const services = options.services ?? await authoritativeServices(fetchFn);
  const base = findAuthoritativeRdapBase(domain, services);
  const common = {
    domain, provider: "rdap" as const, environment: "production" as const,
    available: null as null | false, reservation: false as const,
    regularPriceVerified: false as const, checkedAt: new Date().toISOString()
  };
  let result: RegistryLookup;
  if (!base) result = {...common, status: "unsupported", verifiedRegistration: false};
  else {
    const endpoint = new URL(base.toString());
    endpoint.pathname = endpoint.pathname.replace(/\/?$/, "/") + "domain/" + encodeURIComponent(domain);
    const response = await fetchFn(endpoint, {
      headers: {Accept: "application/rdap+json, application/json"},
      redirect: "error",
      signal: AbortSignal.timeout(8000),
      cache: "no-store"
    });
    if (response.status === 404) result = {...common, status: "not_registered", verifiedRegistration: true};
    else {
      if (response.status !== 200) throw new Error("RDAP unavailable");
      const record = await response.json();
      if (record?.objectClassName !== "domain" ||
          typeof record?.ldhName !== "string" || record.ldhName.toLowerCase() !== domain)
        throw new Error("Unexpected RDAP response");
      result = {...common, status: "registered", verifiedRegistration: true, available: false};
    }
  }
  if (!options.fetchFn && !options.services) {
    if (resultsCache.size > 500) resultsCache.clear();
    resultsCache.set(domain, {value: result, expiresAt: Date.now() + 60_000});
  }
  return result;
}
