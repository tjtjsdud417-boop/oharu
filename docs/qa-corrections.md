# 독립 QA 후 수정 증거

## Final source verification (2026-09-30)

Final result: 93/93 local tests; CI runs 36705938136 and 36705932859 pass at `68fab81`. Android6/iOS10 builds finished; both include final HTML `87C31B68E3E585C4FAC5B42A45E6BE83112BB562062675496EB878147D00A134`. Final AAB signature verification and QA-signed converted APK installation/offline startup passed. iOS10 TestFlight submission `d7acba8f-cb12-4511-b873-b3aac7458ad1` finished with no submission error; Apple processing/tester-ready state is not verified. These final statuses supersede the build-in-progress entries below.

Independent security-final review: 18 groups passed, no reproduced external trust escalation. `requestId` correlates responses; it is not a signed or monotonic anti-replay revision. Deliberately replaying a valid old command from already-trusted bundled JavaScript can schedule it again. Normal sync posts synchronously, retries reconstruct the current snapshot, and native operations use one FIFO promise queue. A regression test holds an OS scheduling promise open, queues cancellation, then releases the old operation and verifies zero remaining reservations. No normal asynchronous cancellation overwrite was reproduced; no runtime rewrite or extra cloud build was needed for this test.

This section supersedes the historical hashes and counts below. Source `bbe77f9a4fdd804247b56fd300608dd416fdafab`: 92/92 local tests pass; GitHub runs 36704804638 and 36704800099 pass. `73d383f` also copies `repo.update` inputs at the storage boundary, preventing a caller's later object mutation from being silently flushed by another write. No existing user records were deleted or deduplicated.

Final native HTML SHA256: `87C31B68E3E585C4FAC5B42A45E6BE83112BB562062675496EB878147D00A134`. Android bridge patch `2e69a0d` requires original opaque source origin, main-frame provenance and a local file document, followed by the app's exact document URI check. Unsupported legacy callbacks cannot forward privileged commands. Actual Android 14/WebView 113 tests verified offline cold start, denial/retry, two OS reservations, iframe message rejection, cancellation and home-widget add/open/clear.

The Expo channel now uses `AndroidImportance.HIGH`, verified as native importance 4. Actual background notification due 10:51:00 UTC was created at 10:52:26.703 and visible at 10:52:27.506: delivery works, but this inexact alarm does not guarantee the selected minute. Final EAS Android 6 (`2b90d55c-656c-4197-bac0-cd4dd313dcae`) and iOS 10 (`fc6e32c7-9f73-4f14-a33a-791fe8c538aa`) are building; older mobile artifacts are superseded.

Production web remains verified only through `d8b2888`. Vercel rejected subsequent writes; read access to the exact existing project still succeeds. Guest-storage fixes are **not deployed**. See [current release limits](release-status.md).

## Earlier guest-storage checkpoint (historical)

`a0c90c9`는 기존 게스트 배열 공유로 한 번 추가한 항목이 저장소에 두 번 기록되는 문제를 고친다. web/native의 load snapshot과 add 입력을 복사한다. 기존 데이터 삭제나 정리 작업은 추가하지 않았다. 오늘·달력 추가 직후 저장 개수/고유 ID, Android/iOS 모드 재실행 검사를 추가했다. Toss는 별도 repository가 이미 snapshot을 복사하며 정밀 개수 검사도 통과했다. 통합 테스트 88/88 통과, 독립 재확인 대기.

이 수정의 Vercel 배포는 `Not authorized`로 실패했다. 기존 계정 whoami 및 정확한 `moodweb/oharu` 프로젝트 읽기 조회는 정상이나, 다른 계정/token으로 우회하지 않았다. 현재 운영 웹은 앞선 `d8b2888` 수정까지만 확인된 상태다.

최신 모바일 HTML SHA256 `91D7138FFAA143A87A777FE40BE91AB78F5CB5A79B40DD131DD723A9FABA84C1`. Android5/iOS9는 이 게스트 저장 수정 전 검증용으로, 최종 출시본이 아니다. Android의 실제 WebView 메시지 origin이 문자열 `null`로 전달되어 URI 검사가 ready/알림/위젯 메시지를 차단하는 별도 원인을 확인했고, 메인 프레임과 실제 URL을 보존하는 네이티브 수정·검증이 진행 중이다.

## 추가 경계 수정 (현재)

기존 6개 결함은 독립 재검토에서 15/15 통과했다. 추가 발견된 권한 거부 응답 누락과 SW 조회 중 취소된 알림 경합은 `d8b2888`에서 수정했다. 요청 종류별 ID를 분리하고, 표시 직전 최신 항목을 재검사한다. 삭제/완료/시간 변경된 항목을 건너뛰어도 다음 유효 항목은 처리한다.

현재 자동 테스트 70/70 및 추가 리뷰 재현 4/4 통과. 추가 수정의 독립 재확인 결과는 대기 중이다. 운영 웹은 `dpl_6C4MJanmLcpsGF6rfiZ3HvumPHu4` / `https://oharu-qu2ktpul3-moodweb.vercel.app`로 갱신했다. Windows 최신 초안은 114,693,045 bytes, SHA256 `706BD7D7DE16734152E3C3635AA0CC26BB24D6BA03E320A0809DBD1E993D8256`이다.

모바일 첫 실행은 실제 Android 에뮬레이터에서 `currentUserId is not defined`로 실패함을 발견했다. 모바일 HTML에 없던 변수를 통합 코드가 참조한 결함이며, CDN 로딩 실패로 확인된 것은 아니다. `65626f0`에서 선언·세션 갱신을 수정하고, 별도로 필수 Supabase SDK 2.117.2를 MIT 라이선스와 함께 앱에 번들해 외부 CDN 없이 게스트 초기화가 가능하도록 했다. 외부 요청 전부 차단한 실제 HTML 시작/CRUD/재실행 저장 테스트를 포함한 전체 77/77 통과. HTML SHA256 `925E951622833D21F862FE4F9C78E0FEBC8A3B829DEE1C973FDEDDBA2B352CE8`. 새 정식 EAS 산출물의 기기 검증 전 기존 빌드를 출시 완료로 취급하지 않는다.

## 앞선 수정 및 검증 이력

검토 원본: 작업 task-9의 `audit/REVIEW.md` (읽기 전용). 수정 snapshot: `8c58b86f12ff0bb02c935bdcfc0f87d6bc256ae5`.

| 결함 | 수정 | 회귀 증거 |
|---|---|---|
| 다른 탭 로그아웃 후 알림 잔존 | 모든 auth 소유자 변경/로그아웃에서 즉시 예약 제거, 비동기 재초기화 | 양쪽 HTML auth callback 테스트 |
| 계정 간 테마 Undo 혼입 | 소유자 epoch, preview/undo 정리, 늦은 비동기 결과 무시 | 실제 격리 Chrome 계정 전환 테스트 |
| 과거 500개로 미래 알림 누락 | 과거 필터 후 정렬/예산 적용 | 500개 과거 + 미래 테스트 |
| 손상 발송 기록에서 중복 | 타입·시간 검증 및 소유자별 메모리 중복 방지 | 손상 JSON true 반복 tick 1회 표시 |
| native 예약 실패 재시도 차단 | 성공 ACK 후 fingerprint 저장, 실패 재시도/backoff | 실패→재시도→성공 ACK 테스트 |
| Windows 오류 UI 전달 누락 | 예약 응답과 상태 polling에 OS 오류 전달 | main 상태 17개 테스트 및 웹 표시 검사 |

로컬 `npm test`: 68/68 통과. 원 리뷰 재현 복사본: 9/9 통과. 수정본 GitHub CI 두 실행 모두 성공: 36699244381, 36699249097. 별도 독립 재검토 결과는 이 표의 자체 재현 결과와 구분한다.

운영 웹 배포: `dpl_5ZDEfmi5ikGGgdtJCqEC9u4kXxgV`, `https://oharu-on0vx6wnb-moodweb.vercel.app`, alias `https://oharu.today`, READY. index/theme JS/CSS/reminders/SW/schema/privacy 7개 HTTP 200 및 SHA256 작업 파일 일치. 운영 Chrome 검사 10개 통과, pageErrors 0. 알림 검사는 브라우저 API 모사이며 실제 OS 수신을 뜻하지 않는다.

기본 및 10개 테마 주요 요소 geometry 유지, 게스트 CRUD, 테마 저장/불량 JSON 거부/미리보기/적용/Undo, 모바일 390px overflow 없음, 알림 권한 거부/중복 억제를 확인했다. 스크린샷 및 결과 JSON은 로컬 `output/playwright/production/`에 보관한다.

Windows 최종 Electron 44.5.1 빌드: 114,692,922 bytes, SHA256 `D4CCCE748883DFF59D0EC88E6229CE5BC43F8E7BAA4E349F36BA649D7F7B7FD0`. 실제 숨김 Electron 런타임 검사 통과. OS tray/notification은 mock이며 설치와 GUI는 미검증. 인증서 미서명 상태를 숨기지 않는다.

모바일 기존 Android4/iOS8 빌드는 수정 전 검증용이며 최종 출시본으로 쓰지 않는다. iOS8 업로드는 처리 VALID / MISSING_EXPORT_COMPLIANCE 상태다. Android 에뮬레이터 첫 실행 문제를 추가 조사 중이므로 수정본 최종 빌드는 보류했다.
