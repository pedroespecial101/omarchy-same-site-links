(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const render = (state) => {
    const standalone = Boolean(state?.standalone);
    $("environment").textContent = standalone
      ? "Standalone web app ✓"
      : "Normal Chromium — extension inactive in this window.";
    $("current-site").textContent = standalone ? (state.currentSite || "Unknown") : "—";
    $("site-section").hidden = !standalone;
    $("last-section").hidden = !standalone;
    $("bypass-section").hidden = !standalone || !state.currentSite;
    $("bypass-site-name").textContent = state.currentSite || "this site";
    $("bypass-site").checked = Boolean(standalone && state.currentSite && state.bypassed);
    $("bypass-site").disabled = !standalone || !state.currentSite;

    const mode = ["disabled", "dry-run", "enabled"].includes(state?.mode) ? state.mode : "enabled";
    const control = document.querySelector(`input[name="mode"][value="${mode}"]`);
    if (control) control.checked = true;

    const detection = state?.lastDetection;
    const target = detection?.targetHost
      ? `${detection.targetHost}${detection.targetPath || "/"}`
      : detection?.target;
    $("last-link").textContent = target || "No link detected yet.";
    $("decision").textContent = detection?.decision || "—";
  };

  const sendToActiveTab = (message) => new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs?.[0]?.id;
      if (typeof tabId !== "number") return resolve(null);
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) return resolve(null);
        resolve(response || null);
      });
    });
  });

  const load = async () => {
    const response = await sendToActiveTab({ type: "get-state" });
    if (response) {
      render(response);
      return;
    }

    const [localState, sessionState] = await Promise.all([
      chrome.storage.local.get({ mode: "enabled", bypassedSites: [] }),
      chrome.storage.session.get({ lastDetection: null })
    ]);
    render({ standalone: false, mode: localState.mode, lastDetection: sessionState.lastDetection });
  };

  document.querySelectorAll('input[name="mode"]').forEach((control) => {
    control.addEventListener("change", async () => {
      await chrome.storage.local.set({ mode: control.value });
      await sendToActiveTab({ type: "set-mode", mode: control.value });
    });
  });

  $("bypass-site").addEventListener("change", async (event) => {
    const site = $("bypass-site-name").textContent;
    if (!site || site === "this site") return;
    const stored = await chrome.storage.local.get({ bypassedSites: [] });
    const sites = new Set(Array.isArray(stored.bypassedSites) ? stored.bypassedSites : []);
    if (event.target.checked) sites.add(site);
    else sites.delete(site);
    await chrome.storage.local.set({ bypassedSites: [...sites] });
  });

  void load();
})();
