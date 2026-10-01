const ORIGINS = new Set(['https://oharu.today', 'https://www.oharu.today', 'https://oharu.vercel.app']);
const LIMIT = 4096;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ISSUER = 'https://tcaghsjndfaxlsgaqrdi.supabase.co/auth/v1';
const MAX_AUTH_AGE = 180;
const CLOCK_SKEW = 5;

function validClaims(claims, userId, now) {
  return claims && claims.iss === ISSUER && claims.sub === userId &&
    claims.role === 'authenticated' && claims.is_anonymous === false &&
    (claims.aud === 'authenticated' || (Array.isArray(claims.aud) && claims.aud.length === 1 && claims.aud[0] === 'authenticated')) &&
    Number.isFinite(claims.exp) && claims.exp > now &&
    (claims.nbf === undefined || (Number.isFinite(claims.nbf) && claims.nbf <= now + CLOCK_SKEW)) &&
    typeof claims.session_id === 'string' && UUID.test(claims.session_id) &&
    ['aal1', 'aal2'].includes(claims.aal);
}
function recentMethod(claims, method, now) {
  return Array.isArray(claims.amr) && claims.amr.some(entry => entry?.method === method &&
    Number.isSafeInteger(entry.timestamp) && entry.timestamp >= now - MAX_AUTH_AGE && entry.timestamp <= now + CLOCK_SKEW);
}

async function readBody(req) {
  if (Number(req.headers.get('content-length')) > LIMIT) throw new Error('body_too_large');
  const reader = req.body?.getReader();
  if (!reader) throw new Error('invalid_body');
  let size = 0; const chunks = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > LIMIT) { await reader.cancel(); throw new Error('body_too_large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new Error('invalid_body'); }
}

export function createHandler(createAdapter, clock = () => Math.floor(Date.now() / 1000)) {
  return async req => {
    const origin = req.headers.get('origin');
    // Native requests without Origin use the same bearer + recent reauthentication controls.
    // File-backed WKWebView uses opaque Origin "null"; it is explicitly not allowed.
    const cors = origin && ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {};
    const reply = (status, code, extra = {}) => new Response(JSON.stringify({ deleted: status === 200, code, ...extra }), {
      status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin' },
    });
    if (origin && !ORIGINS.has(origin)) return reply(403, 'origin_denied');
    if (req.method === 'OPTIONS') {
      if (!origin || req.headers.get('access-control-request-method') !== 'POST') return reply(403, 'preflight_denied');
      const headers = (req.headers.get('access-control-request-headers') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
      if (headers.some(h => !['authorization', 'apikey', 'content-type', 'x-client-info'].includes(h))) return reply(403, 'preflight_denied');
      return new Response(null, { status: 204, headers: { ...cors, Vary: 'Origin', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Cache-Control': 'no-store' } });
    }
    if (req.method !== 'POST') return reply(405, 'method_not_allowed');
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers.get('content-type') || '')) return reply(415, 'json_required');
    const bearer = /^Bearer ([^\s,]{1,8192})$/i.exec(req.headers.get('authorization') || '');
    if (!bearer) return reply(401, 'authentication_required');
    let body;
    try { body = await readBody(req); } catch (e) { return reply(e?.message === 'body_too_large' ? 413 : 400, e?.message === 'body_too_large' ? 'body_too_large' : 'invalid_body'); }
    if (!body || Array.isArray(body) || typeof body !== 'object' || body.confirmation !== 'DELETE') return reply(400, 'invalid_body');
    const fields = Object.keys(body).sort().join(',');
    const oauth = fields === 'confirmation,reauthentication' && body.reauthentication === 'oauth';
    const password = fields === 'confirmation,password' && typeof body.password === 'string' && body.password.trim() && body.password.length <= 1024;
    if (!oauth && !password) return reply(400, 'invalid_body');
    let adapter; let user;
    try { adapter = createAdapter(); } catch { return reply(503, 'deletion_not_enabled'); }
    if (adapter.securityPrerequisites !== true) return reply(503, 'deletion_not_enabled');
    try { user = await adapter.getUser(bearer[1]); }
    catch { return reply(401, 'authentication_failed'); }
    if (!user || !UUID.test(user.id) || !user.email || user.is_anonymous) return reply(401, 'authentication_failed');
    const hasMfa = user.factors?.some(f => f.status === 'verified');
    let claims; const now = clock();
    if (oauth || hasMfa) {
      // Only SDK-verified claims, never decode JWT or trust issued-at as reauthentication.
      try { claims = await adapter.getVerifiedClaims(bearer[1]); }
      catch { return reply(403, 'reauthentication_proof_invalid'); }
      if (!validClaims(claims, user.id, now)) return reply(403, 'reauthentication_proof_invalid');
    }
    if (hasMfa && (claims.aal !== 'aal2' || !(recentMethod(claims, 'totp', now) || recentMethod(claims, 'mfa/totp', now)))) return reply(403, 'recent_mfa_required');
    if (oauth) {
      const providers = user.identities?.map(i => i.provider) || [];
      // AMR proves a recent GoTrue OAuth authentication for this same user, not
      // a specific provider password prompt. Linked OAuth identities remain valid.
      if (!providers.includes('google')) return reply(403, 'google_reauthentication_required');
      if (!recentMethod(claims, 'oauth', now)) return reply(403, 'recent_oauth_required');
    } else {
      if (!user.identities?.some(i => i.provider === 'email')) return reply(409, 'password_reauthentication_unsupported');
      try {
        const fresh = await adapter.reauthenticate(user.email, body.password);
        if (!fresh || fresh.id !== user.id) return reply(403, 'reauthentication_failed');
      } catch { return reply(403, 'reauthentication_failed'); }
    }
    try {
      const storage = await adapter.checkStorage(user.id);
      if (storage !== 'clear') return reply(409, storage === 'owned_objects' ? 'storage_objects_block_deletion' : 'storage_verification_required');
    } catch { return reply(503, 'storage_verification_failed'); }
    // Auth deletion must cascade todos atomically through an approved FK.
    // Never delete todos separately: auth failure would irreversibly erase only data.
    try { await adapter.deleteAuthUser(user.id); }
    catch { return reply(503, 'account_deletion_unconfirmed', { accountDeleted: 'unknown', dataDeletion: 'unknown', retryable: true }); }
    return reply(200, 'account_deleted', { accountDeleted: true, dataDeletion: 'completed' });
  };
}
