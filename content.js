(() => {
  "use strict";

  const DEFAULT_MODE = "dry-run";
  let mode = DEFAULT_MODE;

  const normaliseMode = (value) =>
    ["disabled", "dry-run", "enabled"].includes(value) ? value : DEFAULT_MODE;

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
      await chrome.storage.local.set({ lastDetection: detection });
    } catch {
      // Diagnostics must never interfere with navigation.
    }
  };

  const logDryRunDecision = (detection) => {
    console.info("Omarchy Same-Site Links", {
      Standalone: detection.standalone,
      "Current site": detection.currentSite,
      Target: detection.target,
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
      target: targetUrl.href,
      targetSite,
      sameSite,
      wouldIntercept: sameSite,
      decision: sameSite ? "SAME SITE -> current window" : "EXTERNAL -> untouched"
    };
  };

  const onClick = (event) => {
    if (!isStandaloneWebApp() || mode === "disabled" || !isUnmodifiedLeftClick(event)) return;

    const link = getLinkFromEvent(event);
    if (!link || !linkTargetOpensElsewhere(link)) return;

    const detection = inspectLink(link);
    if (!detection) return;

    void saveDetection(detection);

    if (mode === "dry-run") logDryRunDecision(detection);

    if (mode !== "enabled" || !detection.sameSite) return;

    event.preventDefault();
    event.stopPropagation();
    location.assign(detection.target);
  };

  chrome.storage.local.get({ mode: DEFAULT_MODE }).then((result) => {
    mode = normaliseMode(result.mode);
  }).catch(() => {});

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes.mode) return;
    mode = normaliseMode(changes.mode.newValue);
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "get-state") {
      chrome.storage.local.get({ mode: DEFAULT_MODE, lastDetection: null }).then((result) => {
        sendResponse({
          standalone: isStandaloneWebApp(),
          currentSite: registrableDomainFromHostname(location.hostname),
          mode: normaliseMode(result.mode),
          lastDetection: result.lastDetection
        });
      }).catch(() => sendResponse({
        standalone: isStandaloneWebApp(),
        currentSite: registrableDomainFromHostname(location.hostname),
        mode
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
