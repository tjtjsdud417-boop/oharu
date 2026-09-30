"use strict";
const { pathToFileURL } = require("url");
const EXTERNAL_HOSTS = new Set([
  "accounts.google.com",
  "tcaghsjndfaxlsgaqrdi.supabase.co",
  "chatgpt.com",
  "claude.ai",
  "oharu.today",
]);
function isAllowedExternalUrl(value) {
  try {
    if (typeof value !== "string") return false;
    const url = new URL(value);
    if (url.protocol === "mailto:") return value === "mailto:ceo@moodweb.co.kr";
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    if (EXTERNAL_HOSTS.has(url.hostname)) return true;
    // Limit downloads/source links to this repository, not arbitrary GitHub pages.
    return url.hostname === "github.com" && !url.pathname.includes("%") &&
      (url.pathname === "/tjtjsdud417-boop/oharu" || url.pathname.startsWith("/tjtjsdud417-boop/oharu/"));
  } catch { return false; }
}
function externalUrlForAppLink(value, fallbackPath, currentUrl) {
  if (isAllowedExternalUrl(value)) return value;
  // The unchanged privacy anchor is root-relative. When the bundled offline
  // document opens it, map only that exact URL to the public privacy page.
  try {
    const fallback = pathToFileURL(fallbackPath).href;
    const current = new URL(currentUrl);
    current.search = "";
    current.hash = "";
    if (current.href === fallback && value === new URL("/privacy", fallback).href) {
      return "https://oharu.today/privacy";
    }
  } catch {}
  return null;
}
function isTrustedAppUrl(value, fallbackPath) {
  try {
    const url = new URL(value);
    if (url.origin === "https://oharu.today") return true;
    const expected = new URL(pathToFileURL(fallbackPath).href);
    return url.protocol === "file:" && url.pathname === expected.pathname;
  } catch { return false; }
}
module.exports = { isAllowedExternalUrl, isTrustedAppUrl, externalUrlForAppLink };
