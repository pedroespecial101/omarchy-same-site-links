// tldts is bundled locally before this file in manifest.json. It contains the
// Public Suffix List and handles ICANN plus delegated/private suffixes offline.
const tldtsApi = globalThis.tldts;

function normaliseHostname(hostname) {
  return String(hostname || "").trim().toLowerCase().replace(/\.$/, "");
}

function isIpAddress(hostname) {
  return /^\[[0-9a-f:]+\]$/i.test(hostname) ||
    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);
}

function registrableDomainFromHostname(hostname) {
  const host = normaliseHostname(hostname);
  if (!host || host === "localhost" || isIpAddress(host)) return host;
  if (!tldtsApi || typeof tldtsApi.getDomain !== "function") return "";
  return tldtsApi.getDomain(host, { allowPrivateDomains: true }) || "";
}

function registrableDomainFromUrl(value) {
  try {
    return registrableDomainFromHostname(new URL(value).hostname);
  } catch {
    return "";
  }
}

function sameRegistrableDomain(firstUrl, secondUrl) {
  const first = registrableDomainFromUrl(firstUrl);
  const second = registrableDomainFromUrl(secondUrl);
  return Boolean(first && second && first === second);
}
