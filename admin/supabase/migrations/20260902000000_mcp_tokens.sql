-- ═══════════════════════════════════════════════════════════════
-- 오하루 MCP 연동 — 개인 토큰 발급 테이블
-- 실행 전 선영님 확인 필요 (실서비스 DB, 오하루 CLAUDE.md 절대 규칙에 따라
-- public.todos 테이블/RLS/컬럼은 전혀 건드리지 않음. 이 파일은 새 테이블
-- public.mcp_tokens 하나만 추가한다.)
--
-- 적용 방법: Supabase 대시보드 → SQL Editor → 이 파일 전체 붙여넣고 Run
-- 프로젝트: oharu (ref: tcaghsjndfaxlsgaqrdi)
--
-- 이 테이블은 "클로드/챗지피티/제미나이 같은 AI가 MCP로 오하루에 할 일을
-- 추가할 때 쓰는 개인 토큰"을 저장한다. 평문 토큰은 절대 저장하지 않고
-- SHA-256 해시만 저장한다 (평문은 발급 시 사용자 화면에 1회만 노출됨).
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'AI 연동',
  token_hash text not null,
  token_prefix text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  constraint mcp_tokens_name_len_chk check (char_length(name) <= 60),
  constraint mcp_tokens_hash_len_chk check (char_length(token_hash) = 64),
  constraint mcp_tokens_prefix_len_chk check (char_length(token_prefix) <= 24)
);

create unique index if not exists mcp_tokens_hash_idx on public.mcp_tokens (token_hash);
create index if not exists mcp_tokens_user_idx on public.mcp_tokens (user_id);

alter table public.mcp_tokens enable row level security;

drop policy if exists "own tokens select" on public.mcp_tokens;
create policy "own tokens select" on public.mcp_tokens
  for select using (auth.uid() = user_id);

drop policy if exists "own tokens insert" on public.mcp_tokens;
create policy "own tokens insert" on public.mcp_tokens
  for insert with check (auth.uid() = user_id);

drop policy if exists "own tokens update" on public.mcp_tokens;
create policy "own tokens update" on public.mcp_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- delete 정책 없음(의도적) — 폐기는 update로 revoked_at을 세팅하는 방식으로만
-- 하고, 행 자체는 감사 기록으로 남긴다. admin/schema.sql의 다른 테이블과
-- 동일한 사상(정책 없음 = 그 작업 자체가 항상 거부됨).

-- 클라이언트가 임의 값으로 created_at/revoked_at/last_used_at을 채워 넣지
-- 못하게 서버가 insert 시 항상 정상값으로 덮어씀
-- (persona-security 권고 반영: page_visits_force_timestamp와 동일 패턴)
create or replace function public.mcp_tokens_force_insert_defaults()
returns trigger
language plpgsql
as $$
begin
  new.created_at := now();
  new.revoked_at := null;
  new.last_used_at := null;
  return new;
end;
$$;

drop trigger if exists mcp_tokens_force_insert_defaults_trg on public.mcp_tokens;
create trigger mcp_tokens_force_insert_defaults_trg
before insert on public.mcp_tokens
for each row execute function public.mcp_tokens_force_insert_defaults();

-- 소유자 본인이라도 update로 바꿀 수 있는 건 name과 "폐기(revoked_at 세팅)"뿐.
-- user_id/token_hash/token_prefix/created_at은 항상 기존 값 유지, 그리고
-- 한 번 폐기된 토큰은 다시 되돌릴 수 없게 강제한다.
create or replace function public.mcp_tokens_guard_update()
returns trigger
language plpgsql
as $$
begin
  new.user_id := old.user_id;
  new.token_hash := old.token_hash;
  new.token_prefix := old.token_prefix;
  new.created_at := old.created_at;
  if old.revoked_at is not null then
    new.revoked_at := old.revoked_at;
  end if;
  return new;
end;
$$;

drop trigger if exists mcp_tokens_guard_update_trg on public.mcp_tokens;
create trigger mcp_tokens_guard_update_trg
before update on public.mcp_tokens
for each row execute function public.mcp_tokens_guard_update();

-- 참고: 이 테이블도 배포 후 Supabase 대시보드 Database > Replication에서
-- Realtime publication에 포함되지 않았는지 확인할 것 (기본적으로 안 포함됨).
