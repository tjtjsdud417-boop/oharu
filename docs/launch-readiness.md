# 오하루 출시 보강 · 2026-09-30

현재 배포·검증·계정 인수 상태는 [출시 상태](release-status.md)를 우선 확인한다. 이 문서의 기준 버전과 계획은 최초 조사 이력이며, 최신 산출물 해시는 플랫폼별 검증 문서에 기록한다.

## 보호한 기준본

- 실제 원본: `C:\Users\pbuny\Documents\투두리스트` (바탕화면 소스 아님).
- 원본/공개 Git HEAD: `7d1dcd366b46e32d65a21b70ae1fcfe23333db10`.
- 원본 수정 MCP 함수 및 미추적 `mobile/`, `RELEASE_MANIFEST.json`을 작업본에 보존. 원본 reset/덮어쓰기 없음.
- 별도 작업본: `C:\Users\pbuny\Documents\Codex\2026-09-30\task-8\oharu`, `release/launch-hardening-20260930`.
- 기존 버전은 웹 1.7.6, desktop package 1.7.3, 기존 배포 태그 1.4.0으로 불일치. 스토어 상태는 과거 manifest만으로 최신 성공 판정하지 않음.

## 완료 기준

기본 화면 배치, IME 보호, `oneul.v3`, 기존 todo 데이터 모델을 유지한다. 10개 테마는 시각 토큰만 적용하고 JSON 가져오기는 검증 후 명시적으로 적용한다. 알림은 사용자 버튼으로만 권한을 요청하며 수정·완료·삭제·로그아웃 시 예약을 조정한다. 문법/단위/브라우저 검증, 실제 빌드, 배포 후 도메인 반영을 각각 따로 증명한다.

## 지원 상태와 한계

| 대상 | 알림 방식 | 앱 종료 후 | 위젯 | 검증/남은 조건 |
|---|---|---|---|---|
| PC·모바일 웹 | Notifications API, ServiceWorker 표시 | 서버 Web Push 예약 인프라 미연결 | 홈 화면 바로가기만, native 위젯 아님 | HTTPS/사용자 권한 필요; 탭 중단·절전 정시 보장 불가 |
| Windows | Electron OS 알림, main-process 예약 | 앱/트레이 완전 종료 후 미지원 | 기존 독립 데스크톱 창 | 서명/신뢰도/실제 GUI 별도 검증 |
| iPhone 앱 | Expo OS local notification | 예약된 항목 가능 | WidgetKit extension 필요 | native 새 빌드, 실기기, entitlement/provisioning 검증 필요 |
| Galaxy 앱 | Expo OS local notification | OS 제한 내 예약 | Android 홈 AppWidget 구현·Kotlin 컴파일 완료 | 실기기 미검증; 잠금 위젯 OEM 차이, 정시 제한 |

## 추가 마켓 대상 (09:38 UTC 요청 반영)

| 대상 | 현재 상태 | 별도 조건 |
|---|---|---|
| Apps in Toss | 공식 요건/적합한 어댑터 조사 담당 분리 | 개발자 계정·사업자/약관·리뷰 및 플랫폼 로그인/결제/권한 요건 확인 |
| Microsoft Store | 기존 NSIS 증거 준비; Store/MSIX 패키징 미완료 | Partner Center 소유권·패키지 ID·배포 요건 확인. Store 배포가 웹 직접 EXE의 SmartScreen 평판을 자동 해결하지 않음 |
| ChatGPT/Claude 등 관련 AI 마켓 | 기존 MCP와 안전한 테마 JSON/스키마 유지 | 공식 디렉터리 자격·인증·검토 절차 조사. 구독을 임의 API 크레딧으로 간주하지 않음 |

공식 마켓 등록 준비/허용된 제출은 요청 범위다. 새 계정·법적 동의·사업자 검증·새 OAuth 접근·인증서 발급·유료 광고/결제는 자동 진행하지 않는다. 무관한 사이트 일괄 홍보나 스팸 등록은 대상이 아니다. 마켓 작업은 기존 기능/서명/App ID를 임의 변경하지 않는 별도 파일 소유권으로 진행한다.

시간은 기존 모델의 날짜+시간을 **현재 기기 시간대의 벽시계 시간**으로 해석한다. 여행 시 앱 재개 후 재조정한다. 시간대가 다른 기기는 동일한 현지 시각에 알린다. 절대시각 동기화 모델로 오해하지 않는다. 다른 기기/MCP에서 수정한 일정은 해당 앱이 열려 동기화되어야 예약이 바뀐다. 네트워크가 끊겨도 이미 native에 예약된 알림은 OS가 담당하지만 원격 변경은 반영되지 않는다. 브라우저·Windows 재개 시 5분 이내만 보충하고 오래 지난 알림은 폭주시키지 않는다.

## 운영 발견

공개 프런트엔드와 로컬의 동일 Supabase project host에서 DNS 조회 실패가 관측됐다. keepalive 최근 7회 curl exit 6과 일치했다. 상위 담당자가 기존 Oharu 프로젝트 INACTIVE를 확인하고 무료 요금제/기존 데이터 그대로 복구했다. 09:18:57 UTC ACTIVE_HEALTHY/SELECT 1 확인, 본 작업에서 기존 앱 공개 키로 REST HEAD HTTP 200 확인. 임의 URL 교체/secret 재생성은 없었다. 실제 사용자 로그인·개인 데이터 동기화·기기간 테마 왕복은 별도 실계정 검증이 남아 있다.

## 정상 배포 원칙

`web/.vercel/project.json` projectName은 `oharu`. 웹 배포는 반드시 이 작업본의 `web/`에서만 수행하고, main script를 추출해 `node --check` 통과 후 커밋으로 복구점을 남긴다. admin 배포 status를 프런트 성공으로 간주하지 않는다. 배포 후 `https://oharu.today` HTML/자산을 검증한다. 새 인증서 구매, 스토어 계약, 보안 경고 우회, 새 OAuth 접근은 자동 수행하지 않는다.

## 검증 기록

각 하위 보고서와 실행 로그를 함께 확인한다. 코드 구현, 패키지 생성, 실제 OS 표시, 스토어 승인, 공개 배포는 서로 다른 단계다. 이 문서에 pass 근거가 없는 단계는 미검증이다.

- Chrome 실제 브라우저: 원본 대비 기본/10테마 주요 요소 geometry 동일, 게스트 추가/완료/삭제, 재시작 테마 복원, invalid JSON 거부, preview/apply/undo, 390px 가로 overflow 없음 통과. 페이지 JS 오류 0.
- 권한 거부·허용과 due 알림 단일 표시·끄기: 브라우저 Notification API 모의 구현으로 통과. 실제 Windows/iPhone/Galaxy 알림 수신을 의미하지 않음.
- 증거: `output/playwright/results.json`, `default-before.png`, `default-after.png`, `theme-settings-desktop.png`, `theme-settings-mobile.png` (사용자 로컬에 유지, 저장소 업로드 제외).
- Windows 최종 1.8.0 NSIS 생성 및 앱/설치 PE 메타데이터 확인. 무서명이며 설치/OS GUI는 미검증. 자세한 해시는 Windows 문서 참조.
- 스토어 접근: 현재 별도 클라우드 콘솔은 Oharu 계정과 불일치/Apple 로그아웃. 실제 Oharu Play 계정 ID `6680712075127571897`, Expo owner `saiapp`, package/bundle `com.oharu.today`, ASC ID `6807312683`를 기준으로 로그인 재확인 필요. 기존 모바일 native Android 생성물은 다른 ID/debug 서명이므로 배포하지 않음.
