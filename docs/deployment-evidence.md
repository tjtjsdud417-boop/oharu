> Current corrected release evidence: [QA corrections](qa-corrections.md), core snapshot 8c58b86. The deployment and 47-test results below are historical checkpoints, not the latest release.

# 2026-09-30 배포/복구 증거

## 웹 운영 배포 완료

- 최초 소스 `9a2d433`, 오프라인 예약 보호 후속 `926bd4f`, 브랜치 `release/launch-hardening-20260930`.
- Vercel project `moodweb/oharu`, project ID `prj_LfIMV5Vk0OpSAaz1hjH71J2pbCc0`.
- 최신 Deployment ID `dpl_BcFvnoKeAzdLYUdV5TkQkKEC1maK`, 상태 `READY`, target `production`.
- URL: https://oharu-qjoj4tm31-moodweb.vercel.app → https://oharu.today .
- 배포 직전 `web/extract-diag.mjs`와 `node --check web/_diag.mjs` 통과.
- 배포 후 index, theme-system JS/CSS, reminders.js, sw.js, theme-schema.json, privacy.html 모두 HTTP 200 / 작업본 SHA256 일치.
- admin 배포 결과가 아닌 별도의 실제 프런트엔드 배포 확인이다.

## 운영 복구/CI

- 기존 Supabase 프로젝트 `tcaghsjndfaxlsgaqrdi`가 INACTIVE였고 기존 프로젝트 restore로 복구됐다. 새 프로젝트/키/요금제 변경 없음.
- 상위 담당자 ACTIVE_HEALTHY 및 SELECT 1 확인. 이 작업의 공개 앱 키 REST HEAD HTTP 200 확인.
- 개선한 keepalive 실제 CI 성공: https://github.com/tjtjsdud417-boop/oharu/actions/runs/36696466703 . 이전 main 7회 실패와 구분한다.
- 사용자 로그인/개인 데이터 기기간 왕복/실계정 테마 저장은 아직 미검증.

## 테스트

`npm test` 47/47 통과(오프라인 알 수 없는 목록이 기존 예약을 지우지 않는 회귀 포함). 별도 Chrome 회귀 10개 흐름 재실행 통과 및 페이지 JS 오류 0. UI 캡처와 결과 JSON은 로컬 `output/playwright/`에 있다. 알림 허용/거부/단일 표시 검사는 모의 Notification API이며 실제 OS 수신 증거는 아니다.

## 복구

이전 프런트엔드 READY 배포는 `dpl_6myBC7YpYmkEeTsVwSLA86xjUhWr` (`oharu-hwyvx4njr-moodweb.vercel.app`). 긴급 롤백은 정확한 `moodweb/oharu` 프로젝트에서 이 배포를 프로덕션 승격하고 도메인 응답을 확인한다. 원본 로컬 저장소와 미커밋 MCP 수정, 기존 배포 산출물은 삭제하지 않았다.

## 미완료 플랫폼

Windows는 무서명 NSIS 산출물만 준비했고 기존 공개 installer를 교체하지 않았다. 모바일은 별도 EAS 빌드/스토어 권한 상태를 모바일 문서에서 확인한다. iOS 위젯 draft는 배포 활성화하지 않았다. 웹 운영 배포 완료를 모든 앱스토어 공개 완료로 해석하지 않는다.
