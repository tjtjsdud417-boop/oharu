# 오하루 (Oharu)

오늘 할 일에만 집중하는 가장 단순한 투두리스트.

- 웹: https://oharu.today
- 윈도우 위젯: Releases에서 exe 다운로드

## 사람이 직접 해야 하는 배포 체크리스트

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
