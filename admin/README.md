# 오하루 관리자페이지

방문자 통계 · 가입 인원 · 유입 경로 · UTM 홍보 링크 생성을 한 곳에서 보는 선영님 전용 대시보드.

- 배포 주소: https://admin.oharu.today (Vercel 프로젝트: `moodweb/admin`)
- 로그인: 오하루(oharu.today)에 로그인할 때 쓰는 것과 **같은 계정**(구글 또는 이메일/비밀번호)
- 접근 통제: Supabase RLS로 잠금 (관리자 계정 UUID가 `public.admins` 테이블에 등록된 사람만 데이터 조회 가능)

## 최초 설정 (사람이 직접 해야 함)

1. **DB 마이그레이션 실행** — `schema.sql`을 Supabase 대시보드 → SQL Editor에 붙여넣고 실행.
   실행 전 파일 0번 섹션의 `여기에_선영님_실제_로그인_이메일_입력` 부분을 실제 로그인 이메일로 바꿀 것.
   실행 후 `select * from public.admins;`로 1행 들어갔는지 꼭 확인.
2. **DNS는 이미 연결되어 있음** — oharu.today 네임서버가 이미 Vercel로 위임돼 있어서
   admin.oharu.today는 별도 DNS 설정 없이 바로 작동함 (2026-09-01 배포 시 확인 완료).
3. (선택, 권장) Vercel 대시보드 → `admin` 프로젝트 → Settings → Deployment Protection에서
   "Vercel Authentication" 켜기. 이미 Pro 플랜이라 추가 비용 없음. RLS 위에 한 겹 더 두는 것.

## 구조

- `index.html` — 단일 파일 대시보드 (web/index.html과 같은 스타일, 프레임워크 없음)
- `schema.sql` — Supabase 마이그레이션 (admins, page_visits 테이블 + admin_total_users, admin_signups_by_day 함수)
- 홍보 링크는 DB에 저장하지 않음 — 생성 즉시 URL 형태로 나오고, 이 브라우저의 localStorage에만 최근 목록을 남김.

## 데이터가 안 보일 때

1. 로그인한 계정 이메일이 `public.admins`에 등록된 이메일과 같은지 확인
2. `schema.sql`을 아직 안 돌렸는지 확인 (안 돌렸으면 대시보드가 "관리자 권한 없음"으로 뜸)
3. web/index.html의 방문 로깅 스니펫이 배포됐는지 확인 (없으면 page_visits가 계속 0)
