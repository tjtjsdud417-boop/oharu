-- ═══════════════════════════════════════════════════════════════
-- 오하루 관리자페이지 — Supabase 마이그레이션
-- 실행 전 선영님 확인 필요 (실서비스 DB, 오하루 CLAUDE.md 절대 규칙에 따라
-- todos 테이블/기존 스키마는 전혀 건드리지 않음. 이 파일은 새 테이블/함수 추가만 함)
--
-- 적용 방법: Supabase 대시보드 → SQL Editor → 이 파일 전체 붙여넣고 Run
-- 프로젝트: oharu (ref: tcaghsjndfaxlsgaqrdi)
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────
-- 0) 실행 전 확인: 아래 이메일을 선영님이 오하루에 로그인할 때 쓰는
--    실제 계정 이메일로 바꿔주세요. (구글 로그인이면 그 구글 계정 이메일)
-- ───────────────────────────────────────────
-- 이 값은 "1회성 부트스트랩"에만 쓰입니다. 이후 관리자 판별은
-- 이메일이 아니라 auth.users.id(UUID, 불변값)로 하므로
-- 나중에 이메일이 바뀌어도 이 테이블은 영향받지 않습니다.
-- (persona-security 권고: 이메일 문자열 비교 대신 고정 UUID 비교)

-- ───────────────────────────────────────────
-- 1) 관리자 판별 테이블
-- ───────────────────────────────────────────
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- 의도적으로 select/insert/update/delete 정책을 하나도 만들지 않는다.
-- RLS가 켜져 있고 정책이 없으면 기본 거부 → anon/authenticated 그 누구도
-- 이 테이블을 직접 읽거나 쓸 수 없다. 등록/변경은 Supabase 대시보드에서
-- service_role 권한(SQL Editor)으로만 한다.

insert into public.admins (user_id, note)
select id, '선영님 계정 (2026-09 관리자페이지 구축 시 등록)'
from auth.users
where email = 'tjtjsdud417@gmail.com'
on conflict (user_id) do nothing;

-- ↑ 실행 후 아래 쿼리로 실제 1행이 들어갔는지 반드시 확인:
--   select * from public.admins;
--   0행이면 이메일이 틀렸다는 뜻 — auth.users에서 실제 이메일 확인 후 재실행.

-- ───────────────────────────────────────────
-- 2) 방문 로그 테이블
-- ───────────────────────────────────────────
create table if not exists public.page_visits (
  id bigint generated always as identity primary key,
  visited_at timestamptz not null default now(),
  path text not null default '/',
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  session_id text,
  constraint page_visits_len_chk check (
    char_length(path) <= 500
    and (referrer is null or char_length(referrer) <= 500)
    and (utm_source is null or char_length(utm_source) <= 100)
    and (utm_medium is null or char_length(utm_medium) <= 100)
    and (utm_campaign is null or char_length(utm_campaign) <= 100)
    and (session_id is null or char_length(session_id) <= 100)
  )
);
create index if not exists page_visits_visited_at_idx on public.page_visits (visited_at desc);

-- 클라이언트가 visited_at을 임의 값으로 넣지 못하게 서버가 항상 now()로 덮어씀
-- (persona-security 권고: 타임스탬프 위조 방지)
create or replace function public.page_visits_force_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.visited_at := now();
  return new;
end;
$$;

drop trigger if exists page_visits_force_timestamp_trg on public.page_visits;
create trigger page_visits_force_timestamp_trg
before insert on public.page_visits
for each row execute function public.page_visits_force_timestamp();

alter table public.page_visits enable row level security;

drop policy if exists "anyone can log a visit" on public.page_visits;
create policy "anyone can log a visit" on public.page_visits
  for insert
  with check (true);

drop policy if exists "admin can read visits" on public.page_visits;
create policy "admin can read visits" on public.page_visits
  for select
  using (auth.uid() in (select user_id from public.admins));

-- update/delete 정책 없음 = 관리자 포함 아무도 웹 클라이언트로는 수정/삭제 불가
-- (필요하면 나중에 Supabase 대시보드에서 SQL로 직접 정리)

-- 참고: 이 테이블은 Realtime을 켜지 않는다 (배포 후 Supabase 대시보드
-- Database > Replication에서 page_visits가 목록에 없는지 확인할 것 —
-- 새 테이블은 기본적으로 Realtime publication에 포함되지 않음).

-- ───────────────────────────────────────────
-- 3) 가입자 수 집계 함수 (auth.users는 직접 노출하지 않고 RPC로만 제공)
--    트리거를 auth.users에 걸지 않는다 — 회원가입 흐름에 어떤 영향도 주지 않음
--    (persona-architect/persona-security 공통 권고: 가입 실패 리스크 원천 차단)
-- ───────────────────────────────────────────
create or replace function public.admin_total_users()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'not authorized';
  end if;
  return (select count(*) from auth.users);
end;
$$;
revoke all on function public.admin_total_users() from public, anon;
grant execute on function public.admin_total_users() to authenticated;

create or replace function public.admin_signups_by_day(days_back int default 30)
returns table(day date, signups bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'not authorized';
  end if;
  return query
    select created_at::date as day, count(*)::bigint as signups
    from auth.users
    where created_at >= now() - make_interval(days => greatest(days_back, 1))
    group by 1
    order by 1;
end;
$$;
revoke all on function public.admin_signups_by_day(int) from public, anon;
grant execute on function public.admin_signups_by_day(int) to authenticated;

-- ───────────────────────────────────────────
-- 4) 오늘의 요약 — 자비스가 매일 anon key만으로 curl 조회하기 위한 공개 RPC
--    로그인/관리자 판별 없이 anon도 호출 가능하게 의도적으로 열어둔다.
--    집계된 숫자 2개만 반환하고 개인정보(이메일 등)는 전혀 노출하지 않음
--    (persona-security 검토: 카운트만 공개는 낮은 리스크로 판단)
-- ───────────────────────────────────────────
create or replace function public.admin_today_stats()
returns table(today_visits bigint, today_signups bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select
      -- 대시보드의 "오늘 방문(세션)" 카드와 동일 기준: 세션 단위로 집계
      -- (session_id가 비어있는 예외 행은 각각 별도 방문으로 취급)
      (select count(distinct coalesce(session_id, id::text)) from public.page_visits
         where visited_at >= date_trunc('day', now()))::bigint as today_visits,
      (select count(*) from auth.users
         where created_at >= date_trunc('day', now()))::bigint as today_signups;
end;
$$;
revoke all on function public.admin_today_stats() from public;
grant execute on function public.admin_today_stats() to anon, authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 여기까지 적용 후 admin/index.html에서 로그인하면 바로 데이터가 보여야 함.
-- 안 보이면: (1) admins 테이블에 본인 UUID가 들어갔는지, (2) 로그인한 계정
-- 이메일이 0번 단계에 쓴 이메일과 일치하는지 확인.
-- ═══════════════════════════════════════════════════════════════
