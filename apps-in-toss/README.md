# 오하루 Apps in Toss 독립 검토본

기존 웹 레이아웃을 보존한 무료 local-first 준비 빌드입니다. 계정 등록·업로드·심사·출시는 하지 않았습니다. 이 디렉터리 전체를 메인 프로젝트의 `apps-in-toss/`로 검토 후 가져갈 수 있습니다. 기존 웹, Expo, backend, 계정과 의존성을 공유하지 않습니다.

## 기준 버전과 반영 방법

- 원본 읽기 경로: `C:/Users/pbuny/Documents/Codex/2026-09-30/task-8/oharu`
- 현재 고정 커밋: `8c58b86f12ff0bb02c935bdcfc0f87d6bc256ae5`; 파일 SHA256은 `SNAPSHOT.json`.
- 최초 `0e9ef40`에서 위 커밋까지 **커밋 객체만** 비교하고 재스냅샷했습니다. `scripts/sync-pinned.mjs`는 고정 SHA만 읽습니다. 메인의 진행 중 변경 파일을 읽거나 섞지 않았습니다. 전체 diff와 선택 반영 설명은 `output/review/upstream-8c58b86.patch`, `output/review/SYNC-REVIEW.md`에 있습니다.
- index의 MCP 안내 변경은 기준 자료에 반영되었고, 기존 Toss 변환이 MCP/auth 구현을 계속 제거합니다. 알림 retry/ledger/계정 경계, 계정별 테마 변경은 Toss에 없는 기능이므로 가져오지 않았습니다. Toss local repository에 적용할 추가 행동 수정은 없었습니다.
- `snapshot/index.html`은 읽기 전용 기준 자료입니다. `scripts/prepare.mjs`가 SHA256을 확인하고 부분 변환해 `index.html`, `src/app.js`를 생성합니다. 생성 파일 직접 편집 금지. 변경 스냅샷의 해시와 변환 anchor를 함께 검토하세요.
- 원본 `.agents` 폴더에는 적용할 파일이 없었습니다. 원본 `CLAUDE.md`의 UI 보존·IME·저장키 규칙을 읽었습니다. 원본 UI/저장키는 변경하지 않았고 Toss 저장은 별도 namespace입니다.

## 실행

Node 24.15.0에서 확인했습니다.

```powershell
npm ci
npm test
npm run dev
# http://127.0.0.1:4310 — 공식 AIT Devtools가 SDK를 모의 실행
npm run build
# dist/ 정적 번들 + oharu.ait 생성. 업로드하지 않음.
```

SDK 및 Devtools 3.6.0, Vite 7.3.6을 lockfile로 고정했습니다. 초기 설치의 보안 경고는 수정 버전과 일반 `npm audit fix`로 해결했고 최종 audit 0건입니다. `--force`나 경고 무시는 사용하지 않았습니다. Windows sandbox esbuild 상위 디렉터리 읽기가 실패하여 로컬 실행만 sandbox 밖에서 재시도해 성공했습니다.

## 구현 범위

- 오늘 할 일 추가·완료·삭제, 날짜별 달력, 기존 정렬·미완료 이월 UI 보존. 한글 IME 조합 중 Enter 방어 유지.
- 실제 SDK의 `Storage.getItem/setItem`, `User.getAnonymousKey()` 반환형 `{type:'HASH', hash}`, `SafeArea.get/subscribe`, `graniteEvent`의 `backEvent`, `Screen.close` 확인 후 연결.
- 익명 키는 **기기 내 Storage namespace 구분에만** 사용합니다. 서버 인증·Supabase 권한·기기간 동기화로 사용하지 않습니다. 쓰기는 직렬화하고 성공 뒤 저장소 상태를 갱신합니다. 저장 실패나 손상된 데이터는 자동 초기화하지 않으며 오류 안내 후 입력을 막습니다.
- 본문은 light mode, SDK safe area, Toss 네이티브 navigation 사용. 하단 탭은 추가하지 않았습니다. 설정/달력에서 Back은 오늘 화면으로, 오늘에서 Back은 SDK close로 연결합니다.
- Google/email 로그인, Supabase SDK/방문 통계, 외부 가입·설치·웹 이동, MCP, 테마 외부 코드, 브라우저 알림, 결제 연결은 빌드에서 제거 또는 접근 불가 처리했습니다. 설정에서 동기화·알림·결제 미제공을 안내합니다.
- `/calendar`, `/settings` 직접 진입 지원. `intoss://oharu/...`의 oharu는 후보값이며 예약/사용 가능 여부 미확인입니다.
- `?preview=1`은 DEV 전용 별도 browser storage 모드입니다. 공식 Devtools 테스트는 이 옵션 없이 수행했습니다. production 번들에는 preview identity/Devtools 코드가 없습니다.

## 검증 상태

| 항목 | 결과 |
|---|---|
| repository 단위 테스트 4개 | 통과: 동시 저장/재로드/이월/삭제, 사용자 namespace 분리, 쓰기 실패, 손상 데이터 보존 |
| JS 문법 / Vite / ait build | 통과 |
| SDK Devtools 브라우저 | 통과: 추가·완료·재로드 유지·삭제·설정·달력 직접 진입 |
| 후속 커밋 재검증 | 통과: 추가·완료·삭제·재로드 유지·한글 IME·딥링크·비활성 안내, 페이지 오류 0 |
| 원본 layout 비교 | 기본 inline CSS 20,639 bytes 및 헤더·오늘·달력 DOM 바이트 일치 |
| PNG 검수 | 로고 600×600, 화면 3장 636×1048, RGB 전체 픽셀 불투명, 전환 종료 후 시각 검수 |
| Devtools Back 이벤트 | 통과: 설정 → 오늘 |
| 360×740 및 636×1048 | 렌더 확인, 앱 JS 오류 0 |
| 앱의 외부 데이터 통신 | 관찰한 요청은 localhost만; production에서 Supabase/OAuth/브라우저 알림 코드 없음 |
| 실제 Toss QR / root close / 실제 safe area·계정 전환 | **미실행** |
| 심사 승인 / 출시 | **미실행** |

`submission/`의 3장 PNG는 AIT Devtools에서 실제 앱을 캡처한 **검토용 초안**입니다. 개발 도구 패널만 캡처 순간 숨겼으며 Toss 네이티브 상단 바를 합성하지 않았습니다. 유한 애니메이션을 종료한 상태로 다시 캡처해 완료 체크와 선택 상태를 확인했습니다. 실제 QR 검증 후 최종 제출용으로 교체하는 편이 좋습니다. 로고는 원본 SVG를 흰 배경에 렌더링한 600×600 opaque PNG입니다. `ARTIFACTS.json`에 파일 크기·해시를 기록합니다.

`output/review/layout-comparison.json`은 원본 DOM/CSS 보존 근거입니다. 전체 화면 픽셀 동일성을 주장하지 않습니다. safe area와 로컬 저장 안내가 추가되었고, 외부 font CDN을 제외해 시스템 폰트 대체가 있으며, 미지원 기능과 설정 일부는 제거했습니다. `output/review/pixel-inspection.json`은 PNG 디코딩·규격·전체 픽셀 불투명도·시각 검수 기록입니다.

## 출시 전 blocker

제작자·문의처·약관·개인정보처리방침과 계정/사업자 자격 미확인입니다. 현재 UI의 준비 중 문구는 출시 전에 승인된 정보로 교체해야 합니다. appName 확정 후 config/딥링크와 스크린샷을 재검증하세요. 콘솔 로그인, 약관 수락, 앱 등록, 인증서 발급, 번들 업로드, 심사 요청, 출시는 각각 별도 승인/사용자 작업입니다.

향후 계정 동기화는 Toss Login + backend mTLS + 검증된 사용자 매핑부터 설계해야 합니다. Smart Message는 템플릿 승인과 사용자 동의가 필요합니다. 현재 준비본에서 서버·인증서·권한·알림 발송 설정을 만들지 않았습니다.
