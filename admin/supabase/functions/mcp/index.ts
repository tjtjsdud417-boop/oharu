import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * mcp (2026-09-02 v1)
 * 오하루 개인 MCP 서버 — 클로드/챗지피티/제미나이 같은 AI 클라이언트가
 * 사용자 개인 토큰으로 오하루 투두리스트에 할 일을 추가할 수 있게 하는
 * 원격 MCP(Model Context Protocol) 엔드포인트.
 *
 * - 세션 관리 없는 단일 POST 완결형(Streamable HTTP, SSE 미사용) —
 *   add_todo 하나짜리 짧은 DB insert라 스트리밍이 필요 없음.
 * - 인증은 Supabase Auth JWT가 아니라 오하루 자체 발급 개인 토큰(해시 저장,
 *   web 설정 화면에서 발급/폐기). supabase/config.toml에서 이 함수는
 *   verify_jwt=false로 배포한다 — Supabase 게이트웨이 단계의 JWT 검증을
 *   끄고, 이 파일 안에서 우리 토큰을 직접 검증한다.
 * - public.todos 테이블/RLS/컬럼은 전혀 건드리지 않는다. 이 함수는 서비스
 *   롤로 그 테이블에 새로 쓰는 경로 하나가 추가되는 것뿐이며, insert 시
 *   user_id는 항상 "토큰 조회로 확인된 값"만 쓴다(클라이언트가 보낸 값은
 *   절대 신뢰하지 않음).
 */

const PROTOCOL_VERSION = '2025-06-18';
const MAX_TEXT_LEN = 200;
const RATE_LIMIT_PER_MIN = 20;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, mcp-protocol-version, mcp-session-id',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function rpcResult(id: unknown, result: unknown) {
  return jsonResponse({ jsonrpc: '2.0', id: id ?? null, result });
}

function rpcError(id: unknown, code: number, message: string, status = 200) {
  return jsonResponse({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, status);
}

function toolText(text: string, isError = false) {
  return { content: [{ type: 'text', text }], isError };
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 토큰 추출: (1) Authorization: Bearer 헤더 우선 → (2) ?token= 쿼리 →
// (3) URL 마지막 path segment(함수 슬러그 자체가 아닌 경우만).
// 세 플랫폼(클로드/챗지피티/제미나이)의 커스텀 커넥터 인증 UI가 서로 달라
// 3중으로 지원한다 — 단, 헤더 방식이 로그에 안 남으므로 안내 문구에서
// 헤더/URL-내장 두 방식을 모두 제공하되 우선순위만 둔다.
function extractToken(req: Request, url: URL): string | null {
  const auth = req.headers.get('authorization');
  if (auth && /^bearer\s+/i.test(auth)) {
    const t = auth.replace(/^bearer\s+/i, '').trim();
    if (t) return t;
  }
  const apiKeyHeader = req.headers.get('x-api-key');
  if (apiKeyHeader) return apiKeyHeader.trim();
  const qp = url.searchParams.get('token');
  if (qp) return qp;
  const segs = url.pathname.split('/').filter(Boolean);
  const last = segs[segs.length - 1];
  if (last && last !== 'mcp') return last;
  return null;
}

// 토큰 → user_id 확인. 재사용되는 유일한 지점 — v2에서 툴이 늘어나도
// 이 함수 하나만 부르면 되게 분리해둔다(복붙 방지).
async function resolveTokenUser(
  admin: ReturnType<typeof createClient>,
  token: string,
): Promise<string | null> {
  const hash = await sha256Hex(token);
  const { data, error } = await admin
    .from('mcp_tokens')
    .select('id, user_id, revoked_at')
    .eq('token_hash', hash)
    .is('revoked_at', null)
    .maybeSingle();
  if (error || !data) return null;

  // best-effort 최근 사용 시각 갱신(실패해도 요청 흐름은 막지 않음) —
  // 나중에 "이 토큰이 이상하게 자주 쓰인다" 같은 이상 탐지의 최소 단서.
  admin
    .from('mcp_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', (data as { id: string }).id)
    .then(
      () => {},
      () => {},
    );

  return (data as { user_id: string }).user_id;
}

function kstTodayStr(): string {
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  return kst.toISOString().slice(0, 10);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const TOOLS = [
  {
    name: 'add_todo',
    title: '오하루에 할 일 추가',
    description:
      '오하루(Oharu) 투두리스트에 할 일을 추가합니다. 사용자가 "이거 해야 해", ' +
      '"오늘 할 일에 추가해줘"처럼 할 일/태스크/리마인더를 이야기하면 이 도구로 등록하세요. ' +
      'Adds a to-do item to the user\'s Oharu to-do list.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: '할 일 내용 (최대 200자)',
          minLength: 1,
          maxLength: MAX_TEXT_LEN,
        },
        todo_date: {
          type: 'string',
          description: '날짜 YYYY-MM-DD. 생략하면 오늘(한국 시간 기준)로 등록됩니다.',
        },
        time: {
          type: 'string',
          description: '시간 HH:MM(24시간제), 선택 항목.',
        },
      },
      required: ['text'],
    },
  },
];

async function handleToolsCall(
  admin: ReturnType<typeof createClient>,
  userId: string,
  name: string,
  args: Record<string, unknown>,
) {
  if (name !== 'add_todo') {
    return toolText(`알 수 없는 도구예요: ${name}`, true);
  }

  const rawText = typeof args?.text === 'string' ? args.text.trim() : '';
  if (!rawText) return toolText('할 일 내용이 비어있어요.', true);
  if (rawText.length > MAX_TEXT_LEN) {
    return toolText(`할 일 내용은 ${MAX_TEXT_LEN}자 이내로 적어주세요.`, true);
  }

  let todoDate = kstTodayStr();
  if (typeof args?.todo_date === 'string' && args.todo_date.trim()) {
    const v = args.todo_date.trim();
    if (!DATE_RE.test(v) || Number.isNaN(Date.parse(v))) {
      return toolText('날짜 형식이 올바르지 않아요. YYYY-MM-DD로 보내주세요.', true);
    }
    todoDate = v;
  }

  let time: string | null = null;
  if (typeof args?.time === 'string' && args.time.trim()) {
    const v = args.time.trim();
    if (!TIME_RE.test(v)) {
      return toolText('시간 형식이 올바르지 않아요. HH:MM(24시간제)로 보내주세요.', true);
    }
    time = v;
  }

  // 최소 rate limit — 브루트포스 방어가 아니라 토큰 유출/오작동 시
  // 무제한 insert로 인한 저장 공간 낭비·비용 증가를 막기 위한 안전장치.
  const oneMinAgo = new Date(Date.now() - 60_000).toISOString();
  const { count, error: countErr } = await admin
    .from('todos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneMinAgo);
  if (!countErr && typeof count === 'number' && count >= RATE_LIMIT_PER_MIN) {
    return toolText('요청이 너무 많아요. 잠시 후 다시 시도해주세요.', true);
  }

  const { error: insErr } = await admin.from('todos').insert({
    user_id: userId,
    text: rawText,
    time,
    todo_date: todoDate,
    done: false,
  });
  if (insErr) {
    console.error('[mcp] add_todo insert failed', insErr.message);
    return toolText('할 일을 추가하지 못했어요. 잠시 후 다시 시도해주세요.', true);
  }

  return toolText(`"${rawText}"을(를) ${todoDate}에 추가했어요.`, false);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method === 'GET') {
    return jsonResponse({ error: 'method_not_allowed', message: 'GET을 지원하지 않아요. POST로 호출하세요.' }, 405);
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const url = new URL(req.url);
  let body: any;
  try {
    body = await req.json();
  } catch {
    return rpcError(null, -32700, 'Parse error: invalid JSON', 400);
  }

  const id = body?.id;
  const method = body?.method;

  // notifications/* 는 JSON-RPC 알림(응답 불필요) — 스펙대로 202만 반환
  if (typeof method === 'string' && method.startsWith('notifications/')) {
    return new Response(null, { status: 202, headers: corsHeaders });
  }

  if (typeof method !== 'string') {
    return rpcError(id, -32600, 'Invalid Request');
  }

  // initialize는 프로토콜 핸드셰이크라 토큰 없이도 응답은 하되,
  // 실제 도구 사용(tools/list, tools/call)부터 토큰을 요구한다.
  if (method === 'initialize') {
    return rpcResult(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'oharu-mcp', version: '1.0.0' },
    });
  }

  if (method !== 'tools/list' && method !== 'tools/call') {
    return rpcError(id, -32601, `Method not found: ${method}`);
  }

  const token = extractToken(req, url);
  if (!token) {
    return rpcError(id, -32001, '토큰이 없어요. 오하루 설정 화면에서 발급한 연결 정보를 확인하세요.', 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  const userId = await resolveTokenUser(admin, token);
  if (!userId) {
    return rpcError(id, -32001, '토큰이 유효하지 않거나 폐기됐어요. 오하루 설정 화면에서 새로 발급하세요.', 401);
  }

  if (method === 'tools/list') {
    return rpcResult(id, { tools: TOOLS });
  }

  // tools/call
  const params = body?.params ?? {};
  const toolName = typeof params?.name === 'string' ? params.name : '';
  const args = (params?.arguments && typeof params.arguments === 'object') ? params.arguments : {};

  try {
    const result = await handleToolsCall(admin, userId, toolName, args);
    return rpcResult(id, result);
  } catch (err) {
    console.error('[mcp] tools/call internal error', err instanceof Error ? err.message : err);
    return rpcResult(id, toolText('서버 오류로 처리하지 못했어요.', true));
  }
});
