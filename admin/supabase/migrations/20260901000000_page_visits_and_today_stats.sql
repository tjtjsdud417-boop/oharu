-- ═══════════════════════════════════════════════════════════════
-- 오하루 관리자 대시보드 — 일일 리포트용 최소 마이그레이션
-- 2026-09-01, 자비스(dev-assistant) 적용
--
-- admin/schema.sql 전체(1.admins, 3.admin_total_users/admin_signups_by_day)는
-- 별도 진단 작업(로그인/관리자 판별)이 다루고 있어 이 마이그레이션에서 건드리지 않는다.
-- 여기서는 daily-report Edge Function이 필요로 하는 최소 구성만 만든다:
--   - public.page_visits (web/index.html이 이미 이 테이블에 방문 로그를 POST하고 있음 —
--     테이블이 없어서 지금까지 그 요청은 전부 실패해왔다)
--   - public.admin_today_stats() RPC (admin/schema.sql 섹션 4와 동일, admins 테이블에
--     의존하지 않는 공개 RPC — anon 키로 자비스가 curl/edge function에서 호출)
--
-- admins 테이블에 의존하는 "admin can read visits" SELECT 정책은 만들지 않는다
-- (admins 테이블이 아직 없음 — 그 테이블은 별도 진단 작업에서 다룰 것).
-- admin_today_stats()는 SECURITY DEFINER라 RLS와 무관하게 카운트를 반환한다.
-- ═══════════════════════════════════════════════════════════════

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

-- update/delete 정책 없음 = 아무도 웹 클라이언트로는 수정/삭제 불가

create or replace function public.admin_today_stats()
returns table(today_visits bigint, today_signups bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select
      (select count(distinct coalesce(session_id, id::text)) from public.page_visits
         where visited_at >= date_trunc('day', now()))::bigint as today_visits,
      (select count(*) from auth.users
         where created_at >= date_trunc('day', now()))::bigint as today_signups;
end;
$$;
revoke all on function public.admin_today_stats() from public;
grant execute on function public.admin_today_stats() to anon, authenticated;

-- admin_today_stats()는 date_trunc('day', now())가 서버 세션 타임존(기본 UTC) 기준이라
-- "한국시간 자정~자정" 경계와 어긋난다 (08:00 KST 실행 시 UTC 하루가 아직 안 바뀐 상태).
-- daily-report Edge Function은 정확한 KST 전날 집계가 필요해서 범위를 직접 넘기는
-- 동등 함수를 하나 더 둔다 (admin_today_stats()와 완전히 같은 패턴, 범위만 파라미터화).
create or replace function public.admin_range_stats(range_start timestamptz, range_end timestamptz)
returns table(visits bigint, signups bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select
      (select count(distinct coalesce(session_id, id::text)) from public.page_visits
         where visited_at >= range_start and visited_at < range_end)::bigint as visits,
      (select count(*) from auth.users
         where created_at >= range_start and created_at < range_end)::bigint as signups;
end;
$$;
revoke all on function public.admin_range_stats(timestamptz, timestamptz) from public;
grant execute on function public.admin_range_stats(timestamptz, timestamptz) to anon, authenticated;
