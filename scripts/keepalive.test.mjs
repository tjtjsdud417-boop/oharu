import test from 'node:test';
import assert from 'node:assert/strict';
import { frontendProject, checkProject } from './keepalive.mjs';

const origin = 'https://tcaghsjndfaxlsgaqrdi.supabase.co';
const html = `const SUPABASE_URL = "${origin}";`;
const defaults = { html, key: 'test-only', dns: async () => ['192.0.2.1'], pause: async () => {}, log: () => {} };

test('accepts repeated consistent public URL; rejects divergent or unsafe origins', () => {
  assert.equal(frontendProject(html + html, origin + '/').origin, origin);
  assert.throws(() => frontendProject(html, 'https://another-project.supabase.co'), /differs/);
  assert.throws(() => frontendProject(html + 'const SUPABASE_URL="https://other.test";'), /consistent/);
  for (const bad of ['http://tcaghsjndfaxlsgaqrdi.supabase.co', 'https://example.com', origin + '/path', origin + '?key=private']) {
    assert.throws(() => frontendProject(`SUPABASE_URL="${bad}";`), /expected/);
  }
});

test('missing key or mismatched project fails before sending a request', async () => {
  let requests = 0;
  const request = async () => { requests++; return { status: 200 }; };
  await assert.rejects(checkProject({ ...defaults, key: '', request }), /missing/);
  await assert.rejects(checkProject({ ...defaults, configuredUrl: 'https://other.test', request }), /differs/);
  assert.equal(requests, 0);
});

test('DNS retries three times and never sends credentials when resolution fails', async () => {
  let calls = 0;
  let requests = 0;
  await assert.rejects(checkProject({ ...defaults, dns: async () => { calls++; throw new Error('private details'); }, request: async () => { requests++; } }), /DNS resolution failed/);
  assert.equal(calls, 3);
  assert.equal(requests, 0);
});

test('HEAD request has bounded timeout, rejects redirects and does not log key', async () => {
  const logs = [];
  await checkProject({ ...defaults, log: line => logs.push(line), request: async (url, options) => {
    assert.equal(url, origin + '/rest/v1/todos?select=id&limit=1');
    assert.equal(options.method, 'HEAD');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.apikey, 'test-only');
    assert.ok(options.signal instanceof AbortSignal);
    return { status: 200 };
  } });
  assert.ok(!logs.join('').includes('test-only'));
});

test('retries transient network/server/rate-limit failures; fails auth without retries', async () => {
  for (const failure of ['network', 503, 429]) {
    let calls = 0;
    await checkProject({ ...defaults, request: async () => {
      calls++;
      if (calls === 3) return { status: 200 };
      if (failure === 'network') throw new Error('private details');
      return { status: failure };
    } });
    assert.equal(calls, 3);
  }
  let calls = 0;
  await assert.rejects(checkProject({ ...defaults, request: async () => { calls++; return { status: 401 }; } }), /HTTP 401/);
  assert.equal(calls, 1);
});
