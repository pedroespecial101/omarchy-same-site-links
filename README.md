# Omarchy Same-Site Links

A small Manifest V3 Chromium extension for Omarchy `--app=` web-app windows.
When enabled, an ordinary left-click on an explicit `target="_blank"` HTTP(S)
link stays in the current window when the destination
has the same registrable domain as the current page.

Normal Chromium windows are detected with
`matchMedia('(display-mode: standalone)').matches` and are left untouched.

## Modes

- **Disabled**: no link detection or interception.
- **Dry Run**: records decisions in the popup and console without changing navigation.
- **Enabled** (default for new installs): same-site new-window links navigate the current web-app window.

The mode is stored with `chrome.storage.local`.

The popup can also disable interception for the current registrable domain. Site
bypasses are stored locally and propagate immediately to open web-app pages.

Registrable domains are calculated with a locally bundled `tldts` Public Suffix
List implementation, including delegated suffixes such as `github.io`. No
network access is required at runtime. Full diagnostic URLs are never persisted:
local diagnostics retain only the destination hostname, pathname, and decision.

## Install for local testing

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this directory.
4. Open or restart an Omarchy Chromium web app, then use the extension popup.

The extension intentionally uses only the `storage` permission. Content scripts
run on HTTP(S) pages because the same behavior is intended across Omarchy web
apps.

## Scope

The extension has been tested against eBay and AliExpress. It only changes
explicit `_blank` link-target behavior. It does not rewrite named targets or
`window.open()` calls, or modified clicks, so Ctrl/Cmd/Shift/Alt-clicks and
middle-clicks preserve their normal intent. Normal Chromium remains inactive.
