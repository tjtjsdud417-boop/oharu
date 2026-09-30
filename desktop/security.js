"use strict";
const { pathToFileURL } = require("url");
function isAllowedExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      (url.hostname === "accounts.google.com" || url.hostname.endsWith(".supabase.co"));
  } catch { return false; }
}
function isTrustedAppUrl(value, fallbackPath) {
  try {
    const url = new URL(value);
    if (url.origin === "https://oharu.today") return true;
    const expected = new URL(pathToFileURL(fallbackPath).href);
    return url.protocol === "file:" && url.pathname === expected.pathname;
  } catch { return false; }
}
module.exports = { isAllowedExternalUrl, isTrustedAppUrl };
