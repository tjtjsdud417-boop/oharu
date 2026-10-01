# Header spacing: local review handoff

## Source and isolation

- Source checkout (read-only): `C:/Users/pbuny/Documents/Codex/2026-09-30/task-8/oharu`.
- Source HEAD: `64d0fd157e3f9c6822e8d4e2d7d1c01fa150abc5`.
- Independent checkout: `C:/Users/pbuny/Documents/Codex/2026-10-01/task-2/oharu`, branch `fix/header-flow-20261001`.
- The already prepared header patch and its browser test were copied without changes. The original user project, source checkout, and their Git indexes were not edited.
- The original dirty `admin/supabase/functions/mcp/index.ts` was not copied or included. The independent checkout retains that file from HEAD. Copied release metadata and icon assets remain unstaged local material and are not part of this patch.

## Changes

The date and actions share a wrapping row in normal document flow. The question follows that row, so wrapping or enlarged text increases header height without drawing controls over the question. Existing font sizes and body components are preserved. App padding respects safe-area values. Mobile settings headings can wrap.

The parent provided independent review PASS for the inherited header patch. The review also reproduced an older 320px English signed-in settings defect: the MCP Issue token button extended to x=333.734375. Three scoped CSS rules in the web HTML make that settings row wrap and constrain its controls. No MCP backend, token issuance, authentication, or account deletion logic changed. Native HTML has no corresponding MCP issuance implementation. The isolated Toss adapter removes this MCP section.

## Validation already completed

- Inherited `tests/header-bounds.test.cjs`: 2 tests PASS, including 540 fixture combinations: web/Android/iOS model, 320/360/390/430/568 widths, 100/200/310 percent text, Korean/English, guest/signed-in state, today/calendar/settings. The 390px old absolute positioning reproduces overlap and the patch removes it.
- `scripts/header-platform-check.cjs`: 289 full HTML runtime conditions PASS. Includes Windows minimum window 340x480, actual iOS menu code in Chromium, long titles, screen switches, recorded bounding boxes, and a simulated nonzero safe-area CSS check. Supabase, external resources and native bridge effects were replaced with offline synthetic behavior.
- Related existing checks: 62 tests PASS covering native bootstrap, iOS history/back/login-close/calendar drafts/310 percent short landscape, web/native account deletion fixtures, guest storage and integration. No real user account was deleted.
- `scripts/header-reported-capture.cjs`: full-source 390px before/after captures and numeric bounding boxes PASS using the exact source base commit for the before state. The synthetic guest login control is shown; no backend is contacted.
- Dedicated task-10 Toss copy: 30 header markup/CSS combinations PASS, plus 7 existing adapter/repository tests PASS. SDK execution was not part of this geometry check.
- Final MCP-only change: `tests/mcp-responsive.test.cjs` PASS for 320px English synthetic signed-in settings, 1 condition, no token issued. The test uses the actual renderMcp function and now checks fixture initialization errors. Earlier fixture ID/boundary failures were test harness defects and were corrected.
- The hundreds of header cases were not rerun for the three scoped MCP CSS rules.

All browser claims above are Chromium checks. Physical Android, iPhone Safari/WKWebView/Dynamic Type, native status bars and actual Electron/DPI checks are not claimed.

## Evidence

- `output/playwright/header-bounds/results.json`: 540 fixture outcomes and selected screenshots.
- `output/playwright/header-platforms/bounds.json`: 289 conditions with numeric rectangles and selected full-source screenshots.
- `output/playwright/header-reported/bounds.json`, `before-390.png`, `after-390.png`: exact source before/after geometry.
- `output/playwright/mcp-responsive/bounds.json`, `signedin-en-320.png`: fixed MCP settings condition.
- Dedicated Toss: `../toss-prepared/output/playwright/header/bounds.json` relative to the project parent, and selected screenshots.

The exact user attachment is Library item `libfile_2175d5f1708c8191888b7f6d7c700605`, backing file `file_000000008fc481f68508abfff5425817`, `1000106181.jpg`, version 0. This consumer attempted the official resolved-reference materialization procedure. The sandbox download failed; the single approved host retry downloaded bytes but the unmodified Library helper failed because Windows Python lacks os.setxattr. No alternate transfer or metadata bypass was used. This consumer therefore does not claim to have viewed the user attachment. The parent reported completing its own official pixel inspection. This consumer viewed the inherited reproduction captures and its new full-source screenshots.

## Exact bytes and platform synchronization

| Input | SHA-256 |
| --- | --- |
| Inherited web header-only patch, independently reviewed | 4a892c73360dab6e0a4949b43c88da2bb8ba403f22bc0c4d81ad8a530ae566fb |
| Final web HTML including the scoped MCP CSS fix | bb6d826eec200c66474fe4d80e34ad9a7c2a6602413dc5e0f22d8e3bf1073525 |
| Final mobile HTML, unchanged from inherited patch | 71fd5fcb73bbddc0f03ec38e729d213e703f3ca3ceee485df18262df27ce55ab |
| Both Toss preserved snapshots after header-only patch | 718fe2b4406927b589eabddfd929b5af338a9b6c374d85fbd857aee3a73de3da |

- Web/mobile web: shared `web/index.html` updated locally.
- iOS/Android: shared `mobile/assets/web/app.html` updated locally. Native SafeAreaView and font-scale bridge remain unchanged.
- Windows: online renderer loads `https://oharu.today/?desktop=1`; offline renderer loads `web/index.html`. `desktop/package.json` extraResources packages that same web directory. The updated fallback source is ready; existing binaries have not been rebuilt.
- Root Toss adapter snapshot and generated index are synchronized. Its runtime JS and adapter logic have no content changes.
- Dedicated task-10 Toss source was copied read-only to `C:/Users/pbuny/Documents/Codex/2026-10-01/task-2/toss-prepared`; its own snapshot manifest and generated index carry the same header patch. Its newer adapter logic was preserved. No new .ait archive was built. Existing copied ARTIFACTS/submission records describe the prior artifact and must not be used as evidence for this patch.

## Existing release targets (public identifiers only)

| Service | Existing target |
| --- | --- |
| Git remote | https://github.com/tjtjsdud417-boop/oharu |
| Existing release branch / draft PR | release/launch-hardening-20260930 / https://github.com/tjtjsdud417-boop/oharu/pull/1 |
| Vercel frontend | oharu; project prj_LfIMV5Vk0OpSAaz1hjH71J2pbCc0; team team_XIhamC09IOC4J0rnxpDQOilm; scope moodweb |
| Domain | https://oharu.today |
| EAS | account saiapp; project oharu; project ID 9fac0860-511e-45e3-84de-5526d3ed132d |
| iOS | com.oharu.today; App Store ID 6807312683; existing Apple Team Y2MYGYLUD8 from parent handoff |
| Android | com.oharu.today |

Vercel project metadata and existing CLI identities were read successfully. EAS build:list from the independent mobile copy failed because the expo package is not installed in that copy. No credentials or signing keys were read or copied. Existing build 12/submission records remain historical: build 12 predates this header change.

## Pending external actions

The parent explicitly paused push, deployment and remote build uploads after its automatic approval review required confirmation of the code-transfer destinations. This consumer did not attempt any of those external writes or another transfer path. Local commits and evidence are ready for review. CI, production deployment/hash verification, iOS/Android builds/submissions, Windows installer packaging and public store releases remain pending. Native builds must use verified included credits and existing signing; no new paid settings or credentials are authorized. Apple review/export-compliance/physical-video gates remain with the parent. TestFlight is not public App Store release.
