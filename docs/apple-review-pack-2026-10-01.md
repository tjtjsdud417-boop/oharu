> Latest follow-up: account deletion backend and web are active; the new final iOS candidate with the reviewed header fix is **1.0.0 (13)**, EAS build `c311f5b3-8c83-4220-b4c0-c9726d15d4a7`. Build and App Store Connect upload are complete. Apple processing state and export compliance completion must be read in the parent's authenticated ASC session. [Exact build 13 audit](ios-encryption-audit-build13.md), [account deletion evidence](account-deletion-release-2026-10-01.md). Physical-device recording, real-provider E2E and reviewer access remain pending. Earlier preparation notes below are historical.

# Apple Guideline 2.1 대응 자료 — 제출 전 검토본

대상: App Store Connect 앱 `6807312683`, bundle `com.oharu.today`, 버전 `1.0`. 기존 거절은 build 6의 Guideline 2.1 Information Needed이며, 심사 이력이 적은 신규 개발자에게 앱 설명과 실제 기기 동작 영상을 요청한 것이다. 특정 crash를 재현한 거절이라고 해석하지 않는다. [기존 심사 메시지](https://appstoreconnect.apple.com/apps/6807312683/distribution/reviewsubmissions/details/fdc865db-b6af-41bc-8049-1e5ab3f89e7f).

아래 답변과 Review Notes는 현재 코드의 사실을 반영한 초안이다. **아직 전송하지 않았다.** 영상 링크, 최종 build 번호, 실제 인증 검증, 계정 삭제 경로가 해결되기 전에는 재심사 준비 완료로 표시하지 않는다. iOS11은 후속 UX 수정 전 빌드이므로 최종 촬영/재심사 후보가 아니다.

## App Review 답변 초안 (English)

Thank you for explaining the information required under Guideline 2.1.

Oharu is a personal task planner for people who want to organize daily tasks and dated plans. Users can add, edit, complete and delete their own tasks, review them in Today and Calendar, choose a visual theme, and optionally enable local reminder notifications. Core planning is available without an account using local guest storage. An optional email account provides cloud synchronization through Supabase.

The app does not provide a public feed, messaging, public profiles or public sharing of user content. Task content is private user data. The current iOS app has no in-app purchase or paid subscription flow. Its optional AI theme workflow lets the user copy a theme-only prompt to an external ChatGPT or Claude interface and import a validated theme JSON file. Oharu does not automatically send tasks, account credentials or API keys to those services.

External services used by this version are Supabase for optional authentication and cloud data, Oharu's website for privacy/support information, and a font CDN for typography. The app uses Apple's operating-system notification services for local reminders. An iPhone widget and browser-closed web push are not enabled features of this version. The app is a general productivity tool and does not provide regulated financial, health, gambling or government services.

The code supports Korean, English, Japanese, Chinese and Spanish. We have not implemented country-specific feature variants. This statement does not describe the distribution territories selected in App Store Connect.

We have prepared the app description and reviewer instructions below. Account deletion is implemented and its backend and website are deployed, but real-provider authentication and the physical-device deletion demonstration are not yet verified. We will supply the requested recording of the final candidate running on a physical iPhone with the latest available iOS, including launch, planning, sign-up/sign-in and account deletion, after the owner supplies approved disposable test access. We are not representing the outstanding recording or device checks as completed.

## App Review Notes 초안 (English)

App: Oharu — personal daily task planner.

Guest review: Launch the app and use Today to add two test tasks. Change a task's time, complete one task and delete the other. Open Calendar to select a date and create a dated task. Open Settings to select a theme. The guest planning flow does not require sign-in.

Optional account flow: Email sign-up/sign-in is used for Supabase cloud synchronization. Reviewer test access has not yet been configured or verified. No password is included in this draft. The final candidate is iOS 1.0.0 (13); build and upload are complete. Settings > Delete account starts password-account deletion with recent authentication and explicit DELETE confirmation. Google accounts use the direct https://oharu.today/?account=delete page for a fresh PKCE OAuth transaction and a separate final confirmation; verified TOTP is required where applicable. The backend and website are active. Physical-device authentication, cleanup and deletion E2E remain unverified. Do not use a real user's account for a deletion demonstration.

Notifications: Permission is requested through an explicit user action. Review permission denial and later permission enablement through iOS Settings. Delivery timing depends on iOS and device state. No remote push entitlement is enabled in the current build.

AI themes: Copy a theme-only prompt, use an external AI interface if desired, and import JSON in Oharu. Preview/validation precedes Apply. This is not a verified direct ChatGPT/Claude OAuth connector.

Payments and public community features: No current in-app purchase flow, public feed, public messaging or public content-sharing feature. Public-content report/block demonstrations are therefore not applicable to this version.

Support/privacy: https://oharu.today/privacy.html ; support contact ceo@moodweb.co.kr.

Final candidate: iOS 1.0.0 (13), EAS build c311f5b3-8c83-4220-b4c0-c9726d15d4a7. Build and App Store Connect upload are complete; EAS submission fd63770a-b10a-4a57-8090-816c3cd007fb is FINISHED with no error. The parent's authenticated App Store Connect session must confirm Apple processing and complete export compliance for this exact build. Physical-device video URL and reviewer test access are still pending. Do not include private credentials, personal task data or a fabricated video URL.

## 실물 iPhone 촬영 및 최종 검증 체크리스트

- 최종 후보 build 번호를 TestFlight와 앱에서 확인한다. 기기 모델, iOS 버전, 촬영 일시를 기록하고 최신 사용 가능 iOS 여부를 확인한다. 실제 iPhone 촬영이어야 하며 Chromium 캡처는 대체 증거가 아니다.
- 앱 첫 실행, 상태 표시줄/노치/Dynamic Island와 헤더, 하단 home indicator를 보여 준다. 세로/짧은 가로 화면에서 버튼과 본문이 잘리지 않는지 확인한다.
- Today에 A/B를 한 번씩 추가해 정확히 두 개임을 확인한다. 수정/시간 지정/완료/삭제 및 앱 재실행 후 저장 복원을 보여 준다.
- Calendar의 다음달/날짜/스크롤을 선택하고 미제출 제목·시간을 입력한다. 로그인 열기→닫기 및 뒤/앞 이동 후 값과 위치가 유지되는지 보여 준다.
- Settings 뒤로 이동, 로그인 닫기/실패, 키보드 표시·닫기 및 입력란 노출, 큰 글자 설정과 VoiceOver의 주요 버튼 접근을 확인한다. 네이티브 swipe-back은 실제 기기에서 별도로 확인한다.
- 승인된 테스트 접근만 사용해 가입/로그인/로그아웃/클라우드 복원을 검증한다. 이메일 인증 단계나 reviewer 접근 정보가 필요하면 소유자가 먼저 준비한다. 실제 사용자 계정 삭제나 임의 공유 계정 생성은 하지 않는다.
- 계정 삭제 기능이 마련된 후 소유자가 승인한 폐기 가능한 테스트 계정으로 삭제 시작/확인/결과를 촬영한다. 코드와 운영 백엔드·웹은 마련됐지만 실물 iPhone·승인된 폐기 가능 계정 검증 및 촬영이 없어 이 항목은 **대기**다. 지원 이메일 안내만으로 삭제 기능이 구현됐다고 표시하지 않는다.
- 알림 권한 거부와 정상 허용을 보여 주고, 실제 예약 알림을 앱 전경/백그라운드에서 확인한다. 사용하지 않는 public UGC/report/block 및 결제 흐름은 해당 없음으로 설명한다.
- 영상에는 비밀번호, 인증 코드, API key, 개인 일정 또는 다른 사람의 정보가 노출되지 않도록 한다. 편집으로 실패를 숨기거나 OS 화면을 합성하지 않는다. 심사자가 인증 없이 볼 수 있는 영상 접근성을 별도로 확인한다.
- 동일한 최종 사실·영상 링크를 심사 답변과 App Review Notes에 반영한다. 제출 직전 build 선택과 수출규정 상태를 확인한다.

## TestFlight 설치 경로와 현재 제한

소유자: App Store Connect → Oharu (`6807312683`) → TestFlight → iOS builds에서 최종 후보를 선택한다. 현재 iOS11은 Apple 처리 `VALID`지만 내부/외부 모두 `MISSING_EXPORT_COMPLIANCE`이며 후속 UX 수정도 미포함이다. 법적 답변 및 최종 후보 처리 완료 전 설치 가능하다고 단정하지 않는다.

기존 승인된 테스터 그룹/계정이 있는지 확인한 뒤 해당 계정으로 iPhone TestFlight 앱에서 Oharu를 설치한다. 새 테스터 초대·공개 링크·계정 권한은 아직 만들지 않았다. 외부 테스트는 Apple Beta App Review 요구 여부도 확인해야 한다. 승인된 테스터가 없으면 소유자가 정확한 테스트 계정과 초대 범위를 정해야 한다.

읽기 전용 ASC 확인에서는 현재 Review Detail의 `demoAccountRequired=false`, demo 계정명 미설정이었다. 이는 실제 로그인 검증이 성공했다는 의미가 아니다.

## 재심사 전 남은 조건

1. 후속 UX 수정 독립 리뷰 PASS → 영향 테스트/commit/CI → 포함 크레딧 확인 → 허용된 최종 iOS 빌드 1회와 기존 TestFlight 업로드.
2. 최종 IPA의 암호화 구성 동등성 기록 및 소유자의 수출규정 답변.
3. 계정 삭제 기능과 승인된 리뷰어 인증 접근. [Apple 계정 삭제 요구](https://developer.apple.com/support/offering-account-deletion-in-your-app/)에 맞는 앱 내 시작 경로를 구현·검증해야 한다.
4. 실물 iPhone 검증과 영상, 필요한 자산/라이선스 및 국가별 배포 정보의 소유자 확인.
5. 완성된 자료를 소유자가 검토한 뒤 심사 답변/Notes 업데이트 및 재심사 제출.

## 준비본 갱신 상태

후속 UX 독립 리뷰는7/7 PASS다. 계정 삭제에는 이메일 비밀번호 재확인, Google OAuth 재확인, 기존 TOTP 확인, 현재 소유자 제한과 서버 성공 뒤 기기 정리를 추가 준비했다. Google 사용자에게 비밀번호 생성을 요구하지 않으며, 새 Google OAuth 자격/redirect 권한을 만들지 않는다. 이 변경은 운영 미활성이고 실물 영상에도 아직 기록되지 않았다. 위 영어 초안의 outstanding 설명은 실제 운영 활성화/검증 후에만 완료형으로 바꾼다.
