// A compact public-suffix rule set for the suffixes most often encountered by
// Omarchy web apps. The explicit multi-label rules are what prevent
// www.ebay.co.uk and signin.ebay.co.uk from being treated as different sites.
//
// Keep this list easy to extend when a web app uses another delegated suffix.
// The fallback is correct for ordinary one-label public suffixes (.com, .de,
// .io, etc.).
const MULTI_LABEL_PUBLIC_SUFFIXES = new Set([
  // United Kingdom
  "ac.uk", "co.uk", "gov.uk", "ltd.uk", "me.uk", "net.uk", "nhs.uk", "org.uk", "plc.uk", "police.uk",
  // Australia and New Zealand
  "asn.au", "com.au", "edu.au", "gov.au", "id.au", "net.au", "org.au", "co.nz", "ac.nz", "govt.nz", "net.nz", "org.nz",
  // Europe
  "co.at", "or.at", "com.cy", "com.mt", "com.pl", "com.pt", "com.tr", "co.il", "co.im", "co.in", "co.me", "co.rs", "co.za",
  // Asia
  "co.jp", "ne.jp", "or.jp", "com.cn", "net.cn", "org.cn", "com.hk", "net.hk", "org.hk", "com.sg", "net.sg", "org.sg",
  "com.tw", "net.tw", "org.tw", "co.kr", "or.kr", "go.kr", "com.my", "net.my", "org.my", "co.th", "in.th",
  // Americas
  "com.ar", "com.br", "com.co", "com.mx", "com.pe", "com.uy", "com.ve", "net.ar", "net.br", "org.ar", "org.br",
  // Common delegated hosting suffixes (these are public suffixes in the PSL)
  "github.io", "gitlab.io", "pages.dev", "vercel.app", "netlify.app", "web.app", "firebaseapp.com"
]);

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

  const labels = host.split(".").filter(Boolean);
  if (labels.length < 2) return host;

  const suffix = labels.slice(-2).join(".");
  const suffixLabelCount = MULTI_LABEL_PUBLIC_SUFFIXES.has(suffix) ? 2 : 1;
  if (labels.length <= suffixLabelCount) return host;

  return labels.slice(-(suffixLabelCount + 1)).join(".");
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
