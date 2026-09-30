import test from 'node:test';
import assert from 'node:assert/strict';
import { createRepository } from '../src/repository.mjs';
const identity = { type: 'HASH', hash: 'test-owner' };
const today = () => '2026-09-30';
const todo = (id, done = false) => ({ id, text: '할 일', done, todoDate: '2026-09-29', time: '09:00' });
function memory() { const values = new Map(); return { values, getItem: async k => values.get(k) ?? null, setItem: async (k, v) => { values.set(k, v); } }; }
test('optimistic UI append never duplicates persisted IDs after reload', async () => {
  const storage=memory(), repo=await createRepository(storage,identity,today);
  const ui=await repo.load();
  for(const id of ['A','B']) { const item=todo(id); ui.push(item); await repo.add(item); }
  const stored=JSON.parse(await storage.getItem('oharu.toss.v1:test-owner:todos')).todos;
  assert.equal(stored.length,2);assert.equal(new Set(stored.map(x=>x.id)).size,2);
  const reloaded=await createRepository(storage,identity,today);
  assert.equal((await reloaded.load()).length,2);
});
test('concurrent writes, reload, completion, carryover and deletion persist', async () => {
  const storage = memory(), repo = await createRepository(storage, identity, today);
  await Promise.all([repo.add(todo('a')), repo.add(todo('b', true))]);
  await repo.carryOver();
  const reloaded = await createRepository(storage, identity, today);
  const items = await reloaded.load();
  assert.equal(items[0].todoDate, today()); assert.equal(items[0].time, null);
  assert.equal(items[1].todoDate, '2026-09-29'); assert.equal(items[1].done, true);
  await reloaded.update({ ...items[0], done: true });
  await reloaded.remove('b'); assert.equal((await reloaded.load()).length, 1);
});
test('different identity cannot read another local namespace', async () => {
  const storage = memory(), repo = await createRepository(storage, identity, today);
  await repo.add(todo('a'));
  assert.deepEqual(await (await createRepository(storage, { type: 'HASH', hash: 'other' }, today)).load(), []);
});
test('failed write preserves committed data and queue can recover', async () => {
  const storage = memory(), repo = await createRepository(storage, identity, today);
  const write = storage.setItem;
  storage.setItem = async () => { throw new Error('disk full'); };
  await assert.rejects(repo.add(todo('a'))); assert.deepEqual(await repo.load(), []);
  storage.setItem = write; await repo.add(todo('b')); assert.equal((await repo.load())[0].id, 'b');
});
test('invalid identity and corrupted storage never silently reset data', async () => {
  await assert.rejects(createRepository(memory(), { type: 'NOT_AVAILABLE' }, today));
  const storage = memory(); await storage.setItem('oharu.toss.v1:test-owner:todos', '{broken');
  await assert.rejects(createRepository(storage, identity, today));
  assert.equal(await storage.getItem('oharu.toss.v1:test-owner:todos'), '{broken');
});
