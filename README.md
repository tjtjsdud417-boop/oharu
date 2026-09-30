# 오하루 (Oharu)

오늘 할 일에만 집중하는 가장 단순한 투두리스트.

- 웹: https://oharu.today
- 윈도우 위젯: Releases에서 exe 다운로드

### 설치 시 "Windows PC 보호" 경고가 뜨는 경우

현재 Windows 산출물은 코드 서명이 없습니다. SmartScreen의 배포자·평판 경고와
Defender의 악성코드 탐지 경고는 서로 다르므로 실제 메시지를 확인해야 합니다.
이 문서는 경고 무시나 보안 기능 해제를 안내하지 않습니다. 정식 서명 또는
Microsoft Store 배포를 준비해야 하며, 서명만으로 평판 경고 제거가 보장되지는 않습니다.
현재 구현·검증·승인 필요 단계는 [출시 점검표](docs/launch-readiness.md)와
[Windows 검증 기록](docs/windows-release.md)을 확인하세요.

## 초기 구축 기록 (기존 운영 프로젝트에 재실행하지 않음)

아래는 최초 구축 당시 기록입니다. 운영 Supabase 프로젝트를 새로 만들거나 기존
테이블을 재생성하지 마세요. 2026-09-30 기존 프로젝트의 비활성 상태를 복구했으며
URL/키/기존 데이터를 유지합니다. 최신 절차는 [운영 문서](docs/operations.md)를 따릅니다.

1. Supabase에서 새 무료 프로젝트를 생성합니다.

2. Supabase SQL Editor에서 아래 쿼리를 그대로 실행합니다.

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

3. Supabase Project Settings > API에서 URL과 anon key를 확인합니다.

4. `web/index.html` 상단의 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 상수에 값을 입력합니다.

5. Vercel에 `web/` 폴더를 배포합니다 (`cd web && npx vercel --prod`).

6. Supabase Authentication > URL Configuration에 https://oharu.today 을 등록합니다.

7. Google Cloud Console에서 OAuth 클라이언트를 생성합니다.

8. 생성한 Google OAuth 정보를 Supabase Google provider에 연결합니다.

9. Google OAuth 리디렉션 URI는 Supabase Google provider 설정 화면에 표시된 값을 사용합니다.
