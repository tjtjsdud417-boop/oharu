-- ═══════════════════════════════════════════════════════════════
-- 오하루 daily-report Edge Function 스케줄링 (SAI daily-cron 패턴과 동일)
-- 2026-09-01, 자비스(dev-assistant) 적용
-- 매일 23:00 UTC = 08:00 KST에 daily-report Edge Function 호출
-- ═══════════════════════════════════════════════════════════════

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('oharu-daily-report') where exists (
  select 1 from cron.job where jobname = 'oharu-daily-report'
);

select cron.schedule(
  'oharu-daily-report',
  '0 23 * * *',
  $$
  select net.http_post(
    url := 'https://tcaghsjndfaxlsgaqrdi.supabase.co/functions/v1/daily-report',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
