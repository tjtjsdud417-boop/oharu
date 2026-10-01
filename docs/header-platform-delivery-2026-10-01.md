# Oharu header fix: final platform delivery

Web and mobile web are live. Native iOS 13 and Android 7 builds completed once using existing included credits and signing. Windows 1.8.0 is installed and running on the user's PC. Toss AIT has been rebuilt and internally verified; it has not been uploaded or published.

## Source

- Base: `64d0fd157e3f9c6822e8d4e2d7d1c01fa150abc5`.
- Stable source: `9bd379a3588ca919dfb56afd60c6ef76a7f336da`, remote existing release branch and PR #1.
- Native archive stage: `1061f434b1355001d020fa3dd11fc78113cd56ba`, required app source/assets only.
- Separate Toss source: `6c3855f297ed5ea120f50cb7b05547996999ebe0`.
- Original user project and prior checkouts/indexes remain untouched; dirty MCP backend change was excluded.
- Existing production web deployment and relevant checks: [web evidence](header-web-deployed-2026-10-01.md), [review evidence](header-release-2026-10-01.md).

## Native artifacts

| Platform | Final version/build | EAS ID | SHA256 |
| --- | --- | --- | --- |
| iOS | 1.0.0 (13) | c311f5b3-8c83-4220-b4c0-c9726d15d4a7 | BF5F8B3CF1121A00A3C956FC6E30A4A557A2E00DB1010E503E93B281F121AD3C |
| Android | 1.0.0 / code 7 | c1ed31fa-6a1f-40d8-ae63-51bb68ded680 | 59F8BBF541F81A93B2C2348B09FD4BC0D3FDA0F408F7BBFD79C4242DF5D2E7FE |

Both EAS builds are FINISHED. Files, byte sizes, download URLs and source/stage commits are in `output/native-artifacts/artifacts.json`. `verification.json` directly verifies versions and the embedded mobile HTML in both archives: SHA256 `71FD5FCB73BBDDC0F03EC38E729D213E703F3CA3CEEE485DF18262DF27CE55AB`.

Android `jarsigner` verifies the AAB signature. Its public upload certificate SHA256 exactly matches existing build 6: `C6:31:84:66:6E:A7:91:B2:65:26:C9:1E:1E:9C:E3:E6:EF:F5:AC:BE:5C:E2:8C:80:60:8C:6F:44:77:EA:CC:C0`. Certificate trust/timestamp warnings do not establish general PKI trust. No new key was made or copied.

iOS upload submission `fd63770a-b10a-4a57-8090-816c3cd007fb` is FINISHED with error null; [exact build 13 encryption audit](ios-encryption-audit-build13.md) records the continued category 4 recommendation and its limits. Apple processing/export completion is a separate authenticated ASC check.

Existing EAS included build use changed from 1900/4500 to 2200/4500; 2300 remained after these builds. `output/eas/included-credits-after.json` records the final official read. No paid overage, new signing credential, App Group, OAuth or VAPID key was created.

## Windows user review is ready

- Installer: `desktop/dist/Oharu-Setup.exe`, version 1.8.0, 114,702,895 bytes, SHA256 `7F861DA4D333FE11885EAA5C35A6DDA76B4D2E5A484337F161160DCAC323F8D4`.
- Installed app: `C:/Users/pbuny/AppData/Local/Programs/Oharu/Oharu.exe`, SHA256 `DBFAD9AE81D6079434C3EADE5AA9EB53125E600B4447B04222BA8A1DD0F856BA`.
- Per-user installer exit code 0; HKCU registration version 1.8.0; installed HTML SHA256 `BB6D826EEC200C66474FE4D80E34AD9A7C2A6602413DC5E0F22D8E3BF1073525` exactly matches production web.
- Start Menu `Oharu (오하루).lnk` points to the installed exe. Main process PID 44708 has window title **오하루 — 오늘 할 일**, handle 1247176, read at 2026-10-01T11:37:46Z. The app is open for the user to inspect. Do not relaunch the installer.
- Full private local evidence: `output/windows-installation.json`. Public-safe artifact metadata: `desktop/dist/build-verification.json`.
- Existing GitHub v1.8.0 draft release ID `399901461` now contains this installer, matching blockmap and metadata: [validation release](https://github.com/tjtjsdud417-boop/oharu/releases/tag/untagged-cad0de67bec6d9401072). GitHub's returned SHA256 digests match all three local files; `output/windows-github-draft.json` is the read-back record. It remains draft and its existing tag was not rewritten.
- Authenticode is **NotSigned**. The successful NSIS packaging reused the app after the normal rcedit/icon step; official `signAndEditExecutable=false` avoided irrelevant macOS symlink extraction on Windows. No OS security setting was changed or warning bypassed.
- Installation used the existing per-user installer and supported `/S` option, not simulated unobserved GUI clicks. [Official NSIS installer options](https://nsis.sourceforge.io/Docs/Chapter3.html#installerusage). User data was not removed.
- Installed native window/taskbar pixels were not visually inspected. The [Computer Use SKILL.md](C:/Users/pbuny/.codex/plugins/cache/openai-bundled/computer-use/26.928.31416/skills/computer-use/SKILL.md) requires “Use node_repl JavaScript for all Computer Use actions.” No node_repl tool was exposed in this environment; no custom UI automation or guessed coordinate/key operation was substituted. Process/window-handle, registration, shortcut target and installed bytes were read using Windows system APIs.

## Toss artifact

Own `../toss-prepared/oharu.ait` is 45,361 bytes, SHA256 `1610CD006B2DAF737195D7F4197C73DCE01724BF10CA5203884E4A1EDA17568B`. Local bundle ID `01a0f723-2715-72c3-a4c5-e34cca5aed0f` is not a deployed service ID.

Official `AITReader` verifies every internal file hash and every `sources/` entry against the built dist files. Final HTML includes the flow header and no old absolute action positioning. `../toss-prepared/output/ait-header-verification.json` and refreshed `ARTIFACTS.json` record this exact archive. Prior submission screenshots remain historical. No `ait deploy`, token generation, registration or publication was performed.

## Remaining publication gates

- Apple: parent's authenticated ASC read of build 13 processing and export compliance; choose build 13; approved reviewer access; physical iPhone review and Guideline 2.1 video; final Review Notes/reply and Apple approval. TestFlight/upload is not public release.
- Android: existing Play Console publisher access and production-track review/release. A signed AAB alone is not Play publication. No publisher key/account was created.
- Windows: user visual review; Microsoft Store identity/signing/account requirements for a Store release remain unresolved. Existing GitHub v1.8.0 stays a draft validation release.
- Toss: existing Apps-in-Toss account, SDK/runtime review, submission assets and platform approval. A local AIT build is not publication.
- Physical iPhone/WKWebView/Dynamic Type, Android native renderer and Electron/DPI visual checks remain distinct from the recorded Chromium geometry tests. No real user account deletion was exercised.
