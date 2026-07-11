# 오하루 (Oharu)

오늘 할 일에만 집중하는 토스 스타일 투두리스트. 두 가지 형태로 배포한다:
(A) 웹 서비스 — Vercel 정적 배포, (B) 윈도우 바탕화면 위젯 — Electron.

사용자는 전문 개발자가 아니다. 모든 설명은 한국어로, 실행 결과는 증거와 함께 보고한다.

## 절대 규칙 (최우선)

- `web/index.html`은 완성·검증된 단일 파일 앱이다. **전체 재작성 금지. 리팩토링 금지.**
  수정은 아래 [허용된 수정]만 부분 치환으로 하고, 반드시 변경 전후 diff를 보여준다.
- 한글 IME Enter 중복 등록 방지 가드(`isComposing` 체크) **제거 금지.**
- 쿠팡 파트너스 공정위 문구(`.disclosure`) **제거 금지.**
- localStorage 키 `"oneul.v3"` **변경 금지** (변경 시 기존 사용자 로컬 데이터 소실).
- Supabase 데이터 모델(아래) **변경 금지.**
- 게스트 데이터 이전 함수 `migrateLocalIfAny`의 **'이전 성공 시에만 로컬 삭제'** 로직 변경 금지.
- "완료"는 증거가 있어야 완료다. 파일 트리 / 실행 출력 / diff / 생성 파일 경로 중
  하나 이상을 항상 함께 보고한다.
- 문제 발생 시 **진단(원인 분석)과 수정을 한 턴에 섞지 않는다.** 원인 보고 → 승인 → 수정.

## 허용된 수정 — web/index.html

1. 상단 상수 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 값 입력 (사용자가 값을 줄 때)
2. URL 쿼리 `?desktop=1`일 때 구글 로그인 버튼 숨김 처리 (최소 분기만) — **완료됨**
   - 이유: Electron 내장 브라우저에서 Google OAuth가 disallowed_useragent로 차단될 수 있음.
     데스크톱에서는 이메일 로그인만 노출.

이 외의 index.html 변경은 먼저 변경 범위를 설명하고 승인을 받은 뒤 진행한다.

## 프로젝트 구조

```
투두리스트/
├── CLAUDE.md        ← 이 파일
├── README.md        ← 사람이 직접 하는 배포 체크리스트
├── web/
│   ├── index.html   ← 앱 전체 (수정 제한 대상)
│   └── vercel.json
└── desktop/         ← Electron 앱
```

## 배포 (Vercel)

- 재배포 방법: `cd web && npx vercel --prod`
- 프로덕션 URL: https://oharu.vercel.app
- 연결 정보: `web/.vercel/` (삭제 금지)
- **배포 직전 반드시 git 커밋** (`git add -A && git commit -m "..."`) — 배포 전 상태를 기록해 잘못된 배포 시 복구 가능하게 한다.
- **`web/` 폴더에는 오하루 파일만** 존재해야 한다. 다른 프로젝트(SAI 등) 파일을 두지 않는다.
- **Vercel 배포는 반드시 `web/` 안에서만** 실행한다 (`cd web` 후 `npx vercel --prod`). 다른 프로젝트 폴더에서 `--cwd` 없이 배포하면 oharu 도메인에 잘못된 내용이 올라갈 수 있다.

## 데이터 모델 (확정, 변경 금지)

```sql
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  text text not null,
  time text,
  done boolean not null default false,
  todo_date date not null,
  created_at timestamptz not null default now()
);
alter table public.todos enable row level security;
create policy "own rows only" on public.todos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

자정 이월 규칙: 완료 항목은 자기 날짜에 보존(캘린더 기록용), 미완료만 오늘 날짜로
이동하며 이동 시 `time`은 `null`.

## Electron 앱 요구사항 (desktop/)

- 제품명: 오하루 / exe 파일명: Oharu
- `APP_URL` 상수 = 배포된 Vercel URL + `"?desktop=1"`. 미설정 시 로컬 `web/index.html` 로드
- frameless, 기본 크기 420x640, 배경색 `#F2F4F6`
- always-on-top 토글 (트레이 메뉴)
- 트레이 메뉴: 열기 / 항상 위 고정 / 시작 시 자동 실행 / 종료
- 창 위치·크기 저장 및 재시작 시 복원
- frameless 창 드래그 이동은 Electron preload/CSS 주입으로 해결. `web/index.html` 수정 금지
- electron-builder로 Windows portable exe 빌드. 스크립트: `npm run dist`
- 빌드 방법: `cd desktop && npm run dist` → `desktop/dist/Oharu-1.2.0.exe`
- v1.1.0: `transparent: true` + `backgroundColor: "#00000000"` (Windows 투명창 — 크기 조절 불안정 가능)
- v1.2.0: 설정 화면 앱 섹션(항상 위·자동 실행·종료) + `desktopBridge` prefs API + 시작 시 캐시 정리

## Electron 완료 기준 (전부 증거로 보고)

- [x] `npm start`로 위젯이 뜨고 앱이 로드됨
- [x] 항상 위 고정 토글이 실제로 동작
- [x] 앱 재시작 후 창 위치가 복원됨
- [x] `npm run dist`로 exe 생성 (산출물 경로 출력)

## 현재 상태 / 남은 작업

- [x] 리포 구조 생성, web/index.html 배치
- [x] 브랜드명 "오하루" 반영 (title, 로그인 화면 h2 — 2곳)
  - 반영본 SHA256: 0CAFDB9E97CFB6CB6B4CD0391DB11B61AC930F832FF104430796668F418C963C
- [x] 게스트 모드(웹) + 데스크톱 로그인 게이트(`?desktop=1`) + 로그인 시 게스트 데이터 이전 구현됨
  - 반영본 SHA256: 9ABDDC20B5E3E870767223813DB1C0464E82F7C26AC8FFD0A3D82839D73D28B6 (+ Supabase 키 이식)
- [x] onAuthStateChange 교착 버그 수정(setTimeout 패턴)
- [x] v1.1.0 — 설정 화면(배경 투명도 슬라이더 `bgAlphaRange`, 설정 버튼 `setBtn`) 추가
  - 반영본 SHA256: 04F0FFBE6036F21A7F574B26E4701EDC3B2C73151D68CE416ED241764C6EAF78 (+ Supabase 키 이식)
- [x] v1.1.0 — Electron 투명창 전환 (`transparent: true`, `backgroundColor: "#00000000"`)
- [x] v1.2.0 — 설정 앱 섹션 + desktopBridge(getPrefs/setAlwaysOnTop/setAutoLaunch/quitApp/onPrefs) + 캐시 정리
  - 웹 반영본 SHA256(키 비움): 051CBDC741089E9175068816BD300F30BD328DB28FBE68E05410328FF92C215B (+ Supabase 키 이식)
- [x] Vercel 배포 → https://oharu.vercel.app
- [x] SAI 잘못 배포 복구 (2026-07-11) — web/에서 오하루 v1.1.0 재배포
- [ ] Supabase 프로젝트 생성 → SQL 실행 → URL/anon key를 index.html에 입력
- [x] Supabase Auth URL Configuration에 배포 URL 등록
- [ ] Google OAuth (Cloud Console → Supabase provider 연결)
- [x] Electron 앱 구현 → npm start 검증 → npm run dist 빌드
- [ ] 쿠팡 파트너스 채널 등록 → 배너 코드로 ad-slot 교체
