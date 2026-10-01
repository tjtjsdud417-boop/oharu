const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const folder = pathToFileURL(path.resolve(__dirname, '../admin/supabase/functions/delete-account/') + path.sep);
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const user = { id: owner, email: 'owner@example.invalid', identities: [{ provider: 'email' }] };
const secret = 'fixture-private-password';
const valid = { password: secret, confirmation: 'DELETE' };
const request = (body = valid, options = {}) => new Request('https://edge.invalid/delete-account', {
  method: 'POST', headers: { authorization: 'Bearer fixture-token', 'content-type': 'application/json', ...options.headers },
  body: typeof body === 'string' ? body : JSON.stringify(body), ...Object.fromEntries(Object.entries(options).filter(([k]) => k !== 'headers')),
});
async function fixture(overrides = {}) {
  const { createHandler } = await import(new URL('handler.mjs', folder));
  const calls = [];
  const rows = [{ user_id: owner }, { user_id: other }];
  const adapter = {
    securityPrerequisites: true,
    getUser: async token => { calls.push(['getUser', token]); return user; },
    reauthenticate: async (email, password) => { calls.push(['reauth', email, password]); return user; },
    checkStorage: async id => { calls.push(['storage', id]); return 'clear'; },
    deleteAuthUser: async id => { calls.push(['authDelete', id]); for (let i = rows.length - 1; i >= 0; i--) if (rows[i].user_id === id) rows.splice(i, 1); },
    ...overrides,
  };
  return { handler: createHandler(() => adapter), calls, rows, adapter };
}

test('normal: verified owner only; email comes from server; other rows survive', async () => {
  const f = await fixture(); const res = await f.handler(request()); const body = await res.json();
  assert.equal(res.status, 200); assert.equal(body.deleted, true);
  assert.deepEqual(f.calls.map(c => c[0]), ['getUser', 'reauth', 'storage', 'authDelete']);
  assert.deepEqual(f.calls[1], ['reauth', user.email, secret]);
  assert.deepEqual(f.rows, [{ user_id: other }]);
  assert.equal(f.calls.at(-1)[1], owner);
});

test('strict body rejects missing/empty password, confirmation, email and owner injection', async () => {
  for (const body of [{ ...valid, userId: other }, { ...valid, ownerId: other }, { ...valid, email: 'other@example.invalid' },
    { ...valid, password: '' }, { ...valid, password: '  ' }, { ...valid, password: {} },
    { ...valid, confirmation: 'delete' }, { confirmation: 'DELETE' }, [], null, '{"password":']) {
    const f = await fixture(); const res = await f.handler(request(body));
    assert.equal(res.status, 400); assert.equal(f.calls.length, 0);
  }
});

test('method/origin/content-type/bearer/body limit reject before adapters', async () => {
  const cases = [
    new Request('https://edge.invalid', { method: 'GET' }),
    request(valid, { headers: { origin: 'https://evil.invalid' } }),
    request(valid, { headers: { origin: 'null' } }),
    request(valid, { headers: { 'content-type': 'text/plain' } }),
    request(valid, { headers: { authorization: '' } }),
    request(' '.repeat(4097)),
  ];
  for (const req of cases) { const f = await fixture(); assert.ok((await f.handler(req)).status >= 400); assert.equal(f.calls.length, 0); }
});

test('CORS is exact allowlist; preflight is non-mutating', async () => {
  const f = await fixture(); const res = await f.handler(new Request('https://edge.invalid', { method: 'OPTIONS', headers: {
    origin: 'https://oharu.today', 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization,content-type',
  } }));
  assert.equal(res.status, 204); assert.equal(res.headers.get('access-control-allow-origin'), 'https://oharu.today'); assert.equal(f.calls.length, 0);
});

test('invalid bearer/password/owner or missing password-identity/MFA proof cannot delete', async () => {
  for (const overrides of [
    { getUser: async () => { throw Error(secret); } },
    { reauthenticate: async () => { throw Error(secret); } },
    { reauthenticate: async () => ({ ...user, id: other }) },
    { getUser: async () => ({ ...user, identities: [{ provider: 'google' }] }) },
    { getUser: async () => ({ ...user, factors: [{ status: 'verified' }] }) },
  ]) {
    const f = await fixture(overrides); const res = await f.handler(request()); const text = await res.text();
    assert.ok(res.status >= 400); assert.ok(!text.includes(secret));
    assert.ok(!f.calls.some(c => ['storage', 'todos', 'authDelete'].includes(c[0])));
  }
});

test('owned storage, unknown storage and storage check failures block before deletion', async () => {
  for (const checkStorage of [async () => 'owned_objects', async () => 'unverified', async () => { throw Error(secret); }]) {
    const f = await fixture({ checkStorage }); const res = await f.handler(request());
    assert.ok(res.status >= 400); assert.ok(!f.calls.some(c => ['todos', 'authDelete'].includes(c[0])));
    assert.ok(!(await res.text()).includes(secret));
  }
});

test('release gate rejects before authentication or mutation, preventing known stale-session race', async () => {
  const f = await fixture({ securityPrerequisites: false });
  const res = await f.handler(request()); const body = await res.json();
  assert.equal(res.status, 503); assert.equal(body.code, 'deletion_not_enabled'); assert.equal(body.deleted, false);
  assert.equal(f.calls.length, 0); assert.equal(f.rows.length, 2);
});

test('cascade transaction failure rolls back; repeat request cannot erase another owner', async () => {
  const f = await fixture(); const real = f.adapter.deleteAuthUser; let attempts = 0;
  f.adapter.deleteAuthUser = async id => { if (++attempts === 1) throw Error(secret); await real(id); };
  const first = await (await f.handler(request())).json();
  assert.equal(first.deleted, false); assert.equal(first.code, 'account_deletion_unconfirmed');
  assert.equal(first.dataDeletion, 'unknown'); assert.equal(first.accountDeleted, 'unknown');
  assert.ok(!JSON.stringify(first).includes(secret)); assert.equal(f.rows.length, 2);
  const second = await (await f.handler(request())).json(); assert.equal(second.deleted, true);
  assert.deepEqual(f.rows, [{ user_id: other }]);
});

test('reviewed FK model forbids re-creating todos with deleted owner from old JWT', async () => {
  const accounts = new Set([owner, other]); const rows = [{ user_id: owner }, { user_id: other }];
  const f = await fixture({ deleteAuthUser: async id => { accounts.delete(id); for (let i = rows.length - 1; i >= 0; i--) if (rows[i].user_id === id) rows.splice(i, 1); } });
  assert.equal((await (await f.handler(request())).json()).deleted, true);
  const insert = row => { if (!accounts.has(row.user_id)) throw Error('foreign_key_violation'); rows.push(row); };
  assert.throws(() => insert({ user_id: owner }), /foreign_key_violation/);
  insert({ user_id: other }); assert.equal(rows.length, 2);
});

test('production adapter is disabled, has no separate data deletion, hard-delete flag is exact', async () => {
  const { createSupabaseAdapter } = await import(new URL('adapter.mjs', folder));
  const calls = []; let buckets = [];
  const service = { auth: { getUser: async () => ({ data: { user } }), admin: { deleteUser: async (...args) => { calls.push(['deleteUser', ...args]); return {}; } } },
    storage: { listBuckets: async () => ({ data: buckets }) },
    from: () => { throw Error('separate table writes forbidden'); },
  };
  const passwordClient = { auth: { signInWithPassword: async args => { calls.push(['password', args.email]); return { data: { user } }; }, signOut: async args => { calls.push(['signOut', args.scope]); return {}; } } };
  const a = createSupabaseAdapter(service, passwordClient);
  assert.equal(await a.checkStorage(owner), 'clear'); buckets = [{ id: 'fixture' }]; assert.equal(await a.checkStorage(owner), 'unverified');
  assert.equal(a.securityPrerequisites, false); assert.equal(a.deleteTodos, undefined);
  await a.reauthenticate(user.email, secret); await a.deleteAuthUser(owner);
  assert.deepEqual(calls, [['password', user.email], ['signOut', 'local'], ['deleteUser', owner, false]]);
});


const now = Math.floor(Date.now() / 1000);
const googleUser = { ...user, identities: [{ provider: 'google' }] };
const oauthBody = { reauthentication: 'oauth', confirmation: 'DELETE' };
const claims = { iss: 'https://tcaghsjndfaxlsgaqrdi.supabase.co/auth/v1', sub: owner, exp: now + 3600,
  aud: 'authenticated', role: 'authenticated', is_anonymous: false, aal: 'aal1',
  session_id: '33333333-3333-4333-8333-333333333333', amr: [{ method: 'oauth', timestamp: now }] };

test('fresh verified Google OAuth is accepted without password and preserves other owners', async () => {
  const f = await fixture({ getUser: async () => googleUser, getVerifiedClaims: async () => claims });
  assert.equal((await (await f.handler(request(oauthBody))).json()).deleted, true);
  assert.ok(!f.calls.some(c => c[0] === 'reauth')); assert.deepEqual(f.rows, [{ user_id: other }]);
});

test('OAuth proof rejects tamper/unverified, wrong issuer/subject/audience/session/expiry and direct Google JWT', async () => {
  for (const proof of [null, { ...claims, iss: 'https://accounts.google.com' }, { ...claims, sub: other },
    { ...claims, aud: 'service_role' }, { ...claims, role: 'service_role' }, { ...claims, session_id: '' },
    { ...claims, exp: now - 1 }, { ...claims, nbf: now + 600 }, { ...claims, is_anonymous: true }]) {
    const f = await fixture({ getUser: async () => googleUser, getVerifiedClaims: async () => proof });
    const res = await f.handler(request(oauthBody)); assert.equal(res.status, 403); assert.equal(f.rows.length, 2);
  }
  const f = await fixture({ getUser: async () => googleUser, getVerifiedClaims: async () => { throw Error('tampered signature ' + secret); } });
  const res = await f.handler(request(oauthBody)); assert.equal(res.status, 403); assert.ok(!(await res.text()).includes(secret));
  assert.equal(f.rows.length, 2);
});

test('refresh recent iat/last_sign_in_at cannot replace old OAuth AMR; future proof is rejected', async () => {
  for (const amr of [[{ method: 'oauth', timestamp: now - 181 }], [{ method: 'oauth', timestamp: now + 60 }],
    [{ method: 'token_refresh', timestamp: now }], [{ method: 'oauth', timestamp: String(now) }], []]) {
    const f = await fixture({ getUser: async () => ({ ...googleUser, last_sign_in_at: new Date().toISOString() }),
      getVerifiedClaims: async () => ({ ...claims, iat: now, amr }) });
    const res = await f.handler(request(oauthBody)); assert.equal(res.status, 403); assert.equal(f.rows.length, 2);
  }
});

test('Google identity is present; another linked provider remains valid same-owner OAuth proof', async () => {
  const denied = await fixture({ getUser: async () => user, getVerifiedClaims: async () => claims });
  assert.equal((await denied.handler(request(oauthBody))).status, 403); assert.equal(denied.rows.length, 2);
  const linked = await fixture({ getUser: async () => ({ ...user, identities: [{ provider: 'google' }, { provider: 'github' }] }), getVerifiedClaims: async () => claims });
  assert.equal((await (await linked.handler(request(oauthBody))).json()).deleted, true);
});

test('cancelled OAuth/nonce assertion cannot authorize deletion or bypass proof', async () => {
  for (const body of [{ ...oauthBody, nonce: 'claimed-client-nonce' }, { ...oauthBody, cancelled: true },
    { ...oauthBody, password: secret }, { ...oauthBody, reauthentication: 'google' }]) {
    const f = await fixture(); assert.equal((await f.handler(request(body))).status, 400); assert.equal(f.calls.length, 0);
  }
  // Cancellation retaining an old token produces old AMR, not fresh reauthentication.
  const f = await fixture({ getUser: async () => googleUser, getVerifiedClaims: async () => ({ ...claims, amr: [{ method: 'oauth', timestamp: now - 3600 }] }) });
  assert.equal((await f.handler(request(oauthBody))).status, 403); assert.equal(f.rows.length, 2);
});

test('verified MFA needs aal2 AND fresh TOTP, not recent OAuth alone or generic otp', async () => {
  for (const proof of [claims, { ...claims, aal: 'aal2' }, { ...claims, aal: 'aal2', amr: [...claims.amr, { method: 'totp', timestamp: now - 181 }] },
    { ...claims, aal: 'aal2', amr: [...claims.amr, { method: 'otp', timestamp: now }] }]) {
    const f = await fixture({ getUser: async () => ({ ...googleUser, factors: [{ status: 'verified' }] }), getVerifiedClaims: async () => proof });
    assert.equal((await f.handler(request(oauthBody))).status, 403); assert.equal(f.rows.length, 2);
  }
  const f = await fixture({ getUser: async () => ({ ...googleUser, factors: [{ status: 'verified' }] }),
    getVerifiedClaims: async () => ({ ...claims, aal: 'aal2', amr: [...claims.amr, { method: 'totp', timestamp: now }] }) });
  assert.equal((await (await f.handler(request(oauthBody))).json()).deleted, true);
});


test('password path with verified MFA accepts only fresh signed aal2 TOTP from current bearer', async () => {
  const f = await fixture({ getUser: async () => ({ ...user, factors: [{ status: 'verified' }] }),
    getVerifiedClaims: async () => ({ ...claims, aal: 'aal2', amr: [{ method: 'mfa/totp', timestamp: now }] }) });
  assert.equal((await (await f.handler(request(valid))).json()).deleted, true);
  assert.ok(f.calls.some(c => c[0] === 'reauth'));
});

test('production verified-claims adapter propagates SDK verification failures without raw decoding', async () => {
  const { createSupabaseAdapter } = await import(new URL('adapter.mjs', folder));
  const tokens = []; const service = { auth: { getClaims: async token => { tokens.push(token); return token === 'valid-fixture' ? { data: { claims } } : { error: Error(secret) }; } } };
  const a = createSupabaseAdapter(service, {});
  assert.deepEqual(await a.getVerifiedClaims('valid-fixture'), claims);
  await assert.rejects(a.getVerifiedClaims('tampered-fixture'), /claims_verification_failed/);
  assert.deepEqual(tokens, ['valid-fixture', 'tampered-fixture']);
});
