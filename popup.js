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

    const mode = ["disabled", "dry-run", "enabled"].includes(state?.mode) ? state.mode : "dry-run";
    const control = document.querySelector(`input[name="mode"][value="${mode}"]`);
    if (control) control.checked = true;

    const detection = state?.lastDetection;
    $("last-link").textContent = detection?.target || "No link detected yet.";
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

    const stored = await chrome.storage.local.get({ mode: "dry-run", lastDetection: null });
    render({ standalone: false, mode: stored.mode, lastDetection: stored.lastDetection });
  };

  document.querySelectorAll('input[name="mode"]').forEach((control) => {
    control.addEventListener("change", async () => {
      await chrome.storage.local.set({ mode: control.value });
      await sendToActiveTab({ type: "set-mode", mode: control.value });
    });
  });

  void load();
})();
