import test from "node:test";
import assert from "node:assert/strict";
import { checkDomainWithRdap, checkDomainLive, findRegistryRdapBase } from "../src/domain-registry-lookup.js";

const SERVICES = [
  [["com", "net"], ["https://rdap.verisign.com/com/v1/"]],
  [["org"], ["https://rdap.example.org/rdap/"]]
];

test("IANA registry bootstrap selects safe authoritative HTTPS server", () => {
  assert.equal(findRegistryRdapBase("example.com", SERVICES)?.href, "https://rdap.verisign.com/com/v1/");
  assert.equal(findRegistryRdapBase("example.unknown", SERVICES), null);
  assert.equal(findRegistryRdapBase("example.com", [[["com"], ["http://localhost/"]]]), null);
  assert.equal(findRegistryRdapBase("example.com", [[["com"], ["https://127.0.0.1/domain/"]]]), null);
});

test("RDAP 200 confirms registered name, NEVER availability for purchase", async () => {
  const result = await checkDomainWithRdap("Example.COM", {
    services: SERVICES,
    fetchFn: async url => {
      assert.equal(url.toString(), "https://rdap.verisign.com/com/v1/domain/example.com");
      return { status: 200, json: async () => ({ objectClassName: "domain", ldhName: "EXAMPLE.COM" }) };
    }
  });
  assert.equal(result.status, "registered");
  assert.equal(result.available, false);
  assert.equal(result.provider, "rdap");
  assert.equal(result.reservation, false);
  assert.equal(result.verifiedRegistration, true);
});

test("authoritative RDAP 404 means no registration record, NOT confirmed availability", async () => {
  const result = await checkDomainWithRdap("unused.example.org", {
    services: SERVICES,
    fetchFn: async url => {
      assert.equal(url.toString(), "https://rdap.example.org/rdap/domain/unused.example.org");
      return { status: 404 };
    }
  });
  assert.equal(result.status, "not_registered");
  assert.equal(result.available, null);
  assert.equal(result.regularPriceVerified, false);
});

test("unsupported TLD is inconclusive without inventing unavailability", async () => {
  const result = await checkDomainWithRdap("something.invalid", {
    services: SERVICES,
    fetchFn: () => { throw Error("Should not query unsupported TLD"); }
  });
  assert.equal(result.status, "unsupported");
  assert.equal(result.available, null);
  assert.equal(result.verifiedRegistration, false);
});

test("RDAP network failures and mismatched responses cannot produce a positive answer", async () => {
  await assert.rejects(() => checkDomainWithRdap("example.com", {
    services: SERVICES, fetchFn: async () => ({ status: 429 })
  }), /unavailable/);
  await assert.rejects(() => checkDomainWithRdap("example.com", {
    services: SERVICES, fetchFn: async () => ({ status: 200, json: async () => ({ objectClassName: "domain", ldhName: "somebodyelse.com" }) })
  }), /Unverified/);
  await assert.rejects(() => checkDomainWithRdap("not a domain", { services: SERVICES }), /Invalid/);
});

test("missing/sandbox Namecheap keys still use REAL RDAP, not fictitious sandbox", async () => {
  const env = { NAMECHEAP_ENV: "sandbox", NAMECHEAP_API_KEY: "test", NAMECHEAP_API_USER: "test",
    NAMECHEAP_USERNAME: "test", NAMECHEAP_CLIENT_IP: "127.0.0.1" };
  const result = await checkDomainLive("example.com", {
    env, services: SERVICES, fetchFn: async () => ({ status: 404 })
  });
  assert.equal(result.provider, "rdap");
  assert.equal(result.status, "not_registered");
  assert.equal(result.available, null);
});

test("production Namecheap API wins and returns verified registrar availability", async () => {
  const env = { NAMECHEAP_ENV: "production", NAMECHEAP_API_KEY: "test", NAMECHEAP_API_USER: "test",
    NAMECHEAP_USERNAME: "test", NAMECHEAP_CLIENT_IP: "192.0.2.10" };
  const xml = '<ApiResponse Status="OK"><CommandResponse Type="namecheap.domains.check"><DomainCheckResult Domain="example.com" Available="true" ErrorNo="0" IsPremiumName="false" PremiumRegistrationPrice="0"/></CommandResponse></ApiResponse>';
  const result = await checkDomainLive("example.com", {
    env, services: SERVICES, fetchFn: async url => {
      assert.equal(new URL(url).hostname, "api.namecheap.com");
      return { ok: true, text: async () => xml };
    }
  });
  assert.equal(result.provider, "namecheap");
  assert.equal(result.environment, "production");
  assert.equal(result.available, true);
  assert.equal(result.status, "available");
  assert.equal(result.reservation, false);
});
