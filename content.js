(() => {
  "use strict";

  const DEFAULT_MODE = "enabled";
  let mode = DEFAULT_MODE;
  let bypassedSites = new Set();

  const normaliseMode = (value) =>
    ["disabled", "dry-run", "enabled"].includes(value) ? value : DEFAULT_MODE;

  const normaliseBypassedSites = (value) =>
    Array.isArray(value)
      ? value
        .filter((site) => typeof site === "string" && site)
        .map((site) => site.toLowerCase())
      : [];

  const isStandaloneWebApp = () => matchMedia("(display-mode: standalone)").matches;

  const isUnmodifiedLeftClick = (event) =>
    event.button === 0 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey;

  const linkTargetOpensElsewhere = (link) => {
    const target = (link.getAttribute("target") || "").trim().toLowerCase();
    return target === "_blank";
  };

  const getLinkFromEvent = (event) => {
    const element = event.target instanceof Element ? event.target : null;
    return element ? element.closest("a[href]") : null;
  };

  const saveDetection = async (detection) => {
    try {
      await chrome.storage.session.set({
        lastDetection: {
          standalone: detection.standalone,
          currentSite: detection.currentSite,
          targetHost: detection.targetUrl.hostname,
          targetPath: detection.targetUrl.pathname || "/",
          targetSite: detection.targetSite,
          sameSite: detection.sameSite,
          wouldIntercept: detection.wouldIntercept,
          decision: detection.decision
        }
      });
    } catch {
      // Diagnostics must never interfere with navigation.
    }
  };

  const logDryRunDecision = (detection) => {
    console.info("Omarchy Same-Site Links", {
      Standalone: detection.standalone,
      "Current site": detection.currentSite,
      Target: detection.targetUrl.href,
      "Same site": detection.sameSite,
      "Would intercept": detection.wouldIntercept,
      Decision: detection.decision
    });
  };

  const inspectLink = (link) => {
    let targetUrl;
    try {
      targetUrl = new URL(link.href, location.href);
    } catch {
      return null;
    }

    if (!/^https?:$/.test(targetUrl.protocol) || !/^https?:$/.test(location.protocol)) return null;

    const currentSite = registrableDomainFromHostname(location.hostname);
    const targetSite = registrableDomainFromHostname(targetUrl.hostname);
    const sameSite = Boolean(currentSite && targetSite && currentSite === targetSite);
    return {
      standalone: true,
      currentSite,
      targetUrl,
      targetSite,
      sameSite,
      wouldIntercept: sameSite,
      decision: sameSite ? "SAME SITE -> current window" : "EXTERNAL -> untouched"
    };
  };

  const onClick = (event) => {
    if (!isStandaloneWebApp() || mode === "disabled" || !isUnmodifiedLeftClick(event)) return;

    const currentSite = registrableDomainFromHostname(location.hostname);
    if (!currentSite || bypassedSites.has(currentSite)) return;

    const link = getLinkFromEvent(event);
    if (!link || !linkTargetOpensElsewhere(link)) return;

    const detection = inspectLink(link);
    if (!detection) return;

    void saveDetection(detection);

    if (mode === "dry-run") logDryRunDecision(detection);

    if (mode !== "enabled" || !detection.sameSite) return;

    event.preventDefault();
    event.stopPropagation();
    location.assign(detection.targetUrl.href);
  };

  chrome.storage.local.get({ mode: DEFAULT_MODE, bypassedSites: [] }).then((result) => {
    mode = normaliseMode(result.mode);
    bypassedSites = new Set(normaliseBypassedSites(result.bypassedSites));
  }).catch(() => {});
  void chrome.storage.local.remove("lastDetection").catch(() => {});

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (changes.mode) mode = normaliseMode(changes.mode.newValue);
    if (changes.bypassedSites) {
      bypassedSites = new Set(normaliseBypassedSites(changes.bypassedSites.newValue));
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "get-state") {
      Promise.all([
        chrome.storage.local.get({ mode: DEFAULT_MODE, bypassedSites: [] }),
        chrome.storage.session.get({ lastDetection: null })
      ]).then(([localState, sessionState]) => {
        const currentSite = registrableDomainFromHostname(location.hostname);
        sendResponse({
          standalone: isStandaloneWebApp(),
          currentSite,
          mode: normaliseMode(localState.mode),
          bypassed: normaliseBypassedSites(localState.bypassedSites).includes(currentSite),
          lastDetection: sessionState.lastDetection
        });
      }).catch(() => sendResponse({
        standalone: isStandaloneWebApp(),
        currentSite: registrableDomainFromHostname(location.hostname),
        mode,
        bypassed: bypassedSites.has(registrableDomainFromHostname(location.hostname))
      }));
      return true;
    }

    if (message?.type === "set-mode" && ["disabled", "dry-run", "enabled"].includes(message.mode)) {
      mode = message.mode;
      sendResponse({ ok: true });
    }
    return false;
  });

  document.addEventListener("click", onClick, true);
})();
