# Settings source review — 2026-10-01

This local change follows the released header source `9bd379a3588ca919dfb56afd60c6ef76a7f336da` and documentation snapshot `45e734252b504cf0cb1255aa453b76f764b83616`. It has not been pushed or deployed. Existing web deployment, iOS 13, Android 7 and Windows 1.8.0 artifacts remain the reviewed header baseline.

## Result

- Settings start with theme and AI choices. Account management is the last card; account deletion, existing handlers and reauthentication remain available.
- Existing color palettes appear as miniature task previews. Selection previews first, with explicit Apply and Undo. JSON input invalidates stale previews; files retain the size and schema checks. The requested label is `AI에게 전달받은 JSON 붙여넣기`.
- The newly proposed illustrated theme pack is excluded after the user's rejection. No new illustration, background asset, pet or animation is enabled. Optional declarative visual fields currently accept only `none` and `off`.
- ChatGPT/Claude buttons show direct connection in preparation. Opening a provider page never records a connected state. ChatGPT has no guessed install URL. Claude's official prefill link remains inside its explanatory preview disclosure.
- Existing personal-token controls are in a closed advanced disclosure. Existing MCP code and live backend are unchanged.
- Notification description and rows share 18px content padding. Main limitations remain visible; detailed time zone/sync/grace/power notes are expandable. Windows quit/PC shutdown limits and browser/native limits are preserved in Korean and English.
- Narrow controls and large text wrap; settings-only default muted text and small filled controls have sufficient contrast without changing the header brand or body arrangement.

## Verification

The focused command passed **57/57** tests: theme validation/account isolation, reminder boundaries and races, account deletion web/native, integration idempotency, settings behavior, and **12 iOS navigation/history/calendar/large-text regressions**. No real account was deleted and no grant was created.

`scripts/settings-layout-check.cjs` passed **64 layouts / 256 states**, with Korean/English, guest/synthetic signed-in, collapsed/gallery/AI views, 320/360/390/430 widths, 200%/310% text, 568×240 landscape and small Windows widgets. JSON includes exact control rectangles and overflow measurements. This is Chromium with synthetic native bridges, not physical iPhone/WKWebView validation.

Evidence in this checkout:

- `output/playwright/settings-ux/bounds.json`
- `output/playwright/settings-ux/web-390x844-1-en-gallery.png`
- `output/playwright/settings-ux/ios-568x240-3.1-en.png`
- `output/playwright/settings-ux/windows-340x480-3.1-ko.png`
- `output/playwright/settings-before/` and `settings-current/` (the before fixture is restored from exact source `9bd379a`).

The supplied Library PNG and theme ZIP were prepared through the official consumer materialization helper. Its host retry downloaded bytes but failed at unsupported Windows `os.setxattr`. The helper was not patched and no alternate download path was used; these attachments were not locally inspected or integrated. Parent pixel observations and actual local rendered screenshots informed the notification layout work.

## Platform state and rollback

Web external assets and the mobile inline HTML are synchronized through `scripts/integrate-launch.cjs`; Windows packages the new module through its existing resource allowlist. New settings are source-only: no Windows installer, iOS/Android build or store submission was made. Toss retains its independently verified header bundle; this new settings/AI revision still needs adapter-specific preparation, since Toss has a different account and external-link capability surface.

Restore the UI files from `45e7342`/`9bd379a` to roll back this local revision. Preserve the unrelated original dirty MCP file and all prior release artifacts. OAuth work is isolated in `oauth-preparation/`; it is not imported by the frontend or deployed function.
