import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("./site-utils.js", import.meta.url), "utf8");
const context = { URL, Set, String, Boolean, RegExp };
vm.createContext(context);
vm.runInContext(`${source}\nthis.api = { registrableDomainFromUrl, sameRegistrableDomain };`, context);

assert.equal(context.api.registrableDomainFromUrl("https://www.ebay.co.uk/itm/123"), "ebay.co.uk");
assert.equal(context.api.registrableDomainFromUrl("https://signin.ebay.co.uk/login"), "ebay.co.uk");
assert.equal(context.api.sameRegistrableDomain("https://www.ebay.co.uk", "https://signin.ebay.co.uk/login"), true);
assert.equal(context.api.sameRegistrableDomain("https://www.ebay.co.uk", "https://paypal.com"), false);
assert.equal(context.api.registrableDomainFromUrl("https://alice.github.io/project"), "alice.github.io");

console.log("site-utils tests passed");
