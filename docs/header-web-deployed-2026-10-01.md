# Header fix: production web deployment

- Source commit: 9bd379a3588ca919dfb56afd60c6ef76a7f336da. Pushed fast-forward to the existing release/launch-hardening-20260930 branch; existing PR #1 now references this commit.
- CI: https://github.com/tjtjsdud417-boop/oharu/actions/runs/36850965415 SUCCESS. The other launch run 36850959369 and inactive preparation run 36850965298 also completed successfully.
- Existing Vercel project: prj_LfIMV5Vk0OpSAaz1hjH71J2pbCc0; team team_XIhamC09IOC4J0rnxpDQOilm; scope moodweb/oharu.
- Production deployment: dpl_8dptm45jjgJwg91eBeFE7Vf2qnD1, READY.
- Production URL: https://oharu-bswcl69xf-moodweb.vercel.app; existing alias https://oharu.today.
- Production index SHA-256: bb6d826eec200c66474fe4d80e34ad9a7c2a6602413dc5e0f22d8e3bf1073525, exact local bytes match.
- Seven static artifacts returned HTTP 200 and matched local SHA-256: index.html, theme-system.js, theme-system.css, reminders.js, sw.js, theme-schema.json, privacy.html.
- Live Chromium verification: 390px and 320px, Korean and English, today/calendar/settings, 12 screens PASS. Question and actions do not overlap; no horizontal document overflow; no JavaScript errors or account/data mutations. Production analytics inserts were intercepted. No real account login/deletion was used.
- Evidence: output/playwright/header-production/results.json and 12 PNG files. Verification script resides at ../verify-production-header.cjs relative to the project root.
- Vercel upload used the web directory only. A local .vercelignore excluded the generated syntax diagnostic and its extractor, environment files and tooling directories. No backend source or original dirty MCP changes were deployed.

The user's exact existing-target approval was received by the parent before push/deployment. No new account, project, authentication key or paid setting was created. iOS/Android/Windows binaries and store releases are subsequent work; web deployment does not establish native or public store release.
