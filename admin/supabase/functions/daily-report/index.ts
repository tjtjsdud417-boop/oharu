import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * daily-report (2026-09-01 v1)
 * 오하루 관리자 대시보드 일일 리포트 이메일 발송 (Resend)
 * - SAI daily-report(functions/daily-report/index.ts)와 동일 패턴
 * - 전일 00:00~24:00 KST 구간 집계 (admin_range_stats RPC)
 * - 방문자·가입자 둘 다 0이면 발송 생략(침묵) — pg_cron이 매일 08:00 KST 호출
 * - ?test=1 로 활동 0이어도 강제 발송 가능 (동작 확인용)
 */

const TO = 'tjtjsdud417@gmail.com';
const FROM = 'Oharu Report <onboarding@resend.dev>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function kstDayWindow(offsetDays = 1) {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 3600 * 1000);
  const y = kstNow.getUTCFullYear();
  const m = kstNow.getUTCMonth();
  const d = kstNow.getUTCDate();
  const startKst = Date.UTC(y, m, d - offsetDays);
  const endKst = Date.UTC(y, m, d - offsetDays + 1);
  return {
    start: new Date(startKst - 9 * 3600 * 1000).toISOString(),
    end: new Date(endKst - 9 * 3600 * 1000).toISOString(),
    label: new Date(startKst).toISOString().slice(0, 10),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const force = url.searchParams.get('test') === '1';

    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) return json({ error: 'no_api_key', message: 'RESEND_API_KEY 미설정' }, 500);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { start, end, label } = kstDayWindow(1);

    const { data: stats, error: statsErr } = await supabase.rpc('admin_range_stats', {
      range_start: start,
      range_end: end,
    });
    if (statsErr) {
      console.error('[daily-report] admin_range_stats failed', statsErr);
      return json({ error: 'stats_query_failed', message: statsErr.message }, 500);
    }

    const row = Array.isArray(stats) ? stats[0] : stats;
    const visits = Number(row?.visits ?? 0);
    const signups = Number(row?.signups ?? 0);

    // ---------- 활동 0이면 침묵 ----------
    if (visits === 0 && signups === 0 && !force) {
      return json({ success: true, data: { skipped: true, reason: 'no_activity', date: label } });
    }

    const rowHtml = (k: string, v: string) =>
      `<tr><td style="padding:7px 12px;border-bottom:1px solid #eee;color:#666">${k}</td>` +
      `<td style="padding:7px 12px;border-bottom:1px solid #eee;font-weight:700;text-align:right">${v}</td></tr>`;

    const html = `
<div style="font-family:-apple-system,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;color:#1A1A1A">
  <div style="padding:20px 0;border-bottom:2px solid #1A1A1A">
    <div style="font-size:19px;font-weight:800">오하루 운영 리포트</div>
    <div style="font-size:13px;color:#888;margin-top:4px">${label} (KST)</div>
  </div>

  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:18px">
    ${rowHtml('방문자', `${visits}명`)}
    ${rowHtml('가입자', `${signups}명`)}
  </table>

  <div style="margin-top:26px;padding-top:14px;border-top:1px solid #eee;font-size:11px;color:#aaa">
    오하루 자동 리포트 · 활동이 없는 날은 발송되지 않습니다.
  </div>
</div>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        subject: `[오하루] ${label} 리포트 · 방문 ${visits} · 가입 ${signups}`,
        html,
      }),
    });

    const body = await res.text();
    if (!res.ok) {
      console.error('[daily-report] resend failed', res.status, body);
      return json({ error: 'send_failed', message: body }, 502);
    }

    return json({ success: true, data: { sent: true, date: label, visits, signups } });
  } catch (err) {
    console.error('[daily-report] internal', err);
    return json({ error: 'internal_error', message: err instanceof Error ? err.message : 'server error' }, 500);
  }
});
