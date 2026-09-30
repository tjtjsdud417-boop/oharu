# 독립 QA 후 수정 증거

## 추가 경계 수정 (현재)

기존 6개 결함은 독립 재검토에서 15/15 통과했다. 추가 발견된 권한 거부 응답 누락과 SW 조회 중 취소된 알림 경합은 `d8b2888`에서 수정했다. 요청 종류별 ID를 분리하고, 표시 직전 최신 항목을 재검사한다. 삭제/완료/시간 변경된 항목을 건너뛰어도 다음 유효 항목은 처리한다.

현재 자동 테스트 70/70 및 추가 리뷰 재현 4/4 통과. 추가 수정의 독립 재확인 결과는 대기 중이다. 운영 웹은 `dpl_6C4MJanmLcpsGF6rfiZ3HvumPHu4` / `https://oharu-qu2ktpul3-moodweb.vercel.app`로 갱신했다. Windows 최신 초안은 114,693,045 bytes, SHA256 `706BD7D7DE16734152E3C3635AA0CC26BB24D6BA03E320A0809DBD1E993D8256`이다.

모바일 첫 실행은 실제 Android 에뮬레이터에서 `currentUserId is not defined`로 실패함을 발견했다. 모바일 HTML에 없던 변수를 통합 코드가 참조한 결함이며, CDN 로딩 실패로 확인된 것은 아니다. `65626f0`에서 선언·세션 갱신을 수정하고, 별도로 필수 Supabase SDK 2.117.2를 MIT 라이선스와 함께 앱에 번들해 외부 CDN 없이 게스트 초기화가 가능하도록 했다. 외부 요청 전부 차단한 실제 HTML 시작/CRUD/재실행 저장 테스트를 포함한 전체 77/77 통과. HTML SHA256 `34FC1B992AA847D8E51E0A2B948CC0F957F58C93419D3B95EE353F607BE628F8`. 새 정식 EAS 산출물의 기기 검증 전 기존 빌드를 출시 완료로 취급하지 않는다.

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
