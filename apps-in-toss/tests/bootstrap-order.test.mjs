import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRepository } from '../src/repository.mjs';
const adapter = fs.readFileSync(new URL('../src/adapter.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replaceAll('import.meta.env.DEV', 'false').replaceAll('export ', '');
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
function harness(identity, read) {
  const calls = [];
  const context = {
    User: { getAnonymousKey: () => { calls.push('identity'); return identity; } },
    Storage: { getItem: key => { calls.push('read:' + key); return read; }, setItem: async () => {} },
    createRepository, URLSearchParams, location: { search: '' },
    SafeArea: { get: () => ({}), subscribe: () => () => {} },
    graniteEvent: { addEventListener: () => () => {} }, Screen: { close: async () => {} },
    window: { addEventListener: () => {} }, document: { documentElement: { style: { setProperty: () => {} } } },
    setTimeout: () => 0,
  };
  vm.createContext(context); vm.runInContext(adapter, context);
  return { calls, initialize: context.initialize };
}
test('cold startup waits for anonymous identity, then storage, before exposing repository', async () => {
  const id = deferred(), read = deferred(), h = harness(id.promise, read.promise);
  let ready = false;
  const pending = h.initialize(() => '2026-09-30', () => false).then(repo => { ready = true; return repo; });
  await Promise.resolve(); assert.deepEqual(h.calls, ['identity']); assert.equal(ready, false);
  id.resolve({ type: 'HASH', hash: 'cold-owner' });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(h.calls, ['identity', 'read:oharu.toss.v1:cold-owner:todos']); assert.equal(ready, false);
  read.resolve(null);
  const repo = await pending; assert.deepEqual(await repo.load(), []); assert.equal(ready, true);
});
test('identity failure never reads another namespace or creates guest data', async () => {
  const h = harness(Promise.reject(new Error('SDK unavailable')), Promise.resolve(null));
  await assert.rejects(h.initialize(() => '', () => false), /SDK unavailable/);
  assert.deepEqual(h.calls, ['identity']);
});
test('storage failure never returns an empty replacement repository', async () => {
  const read = deferred(), h = harness(Promise.resolve({ type: 'HASH', hash: 'owner' }), read.promise);
  const pending = h.initialize(() => '', () => false);
  await new Promise(resolve => setImmediate(resolve)); read.reject(new Error('storage unavailable'));
  await assert.rejects(pending, /storage unavailable/);
});
