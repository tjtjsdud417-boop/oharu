const { test } = require('node:test');
const assert = require('node:assert/strict');
const { snapshot: makeSnapshot, due, cleanLedger, GRACE_MS } = require('../web/reminders.js');
const snapshot = items => makeSnapshot(items, new Date(2026,8,30).getTime());
const todo = { id: 'one', text: '알림', time: '14:30', todoDate: '2026-10-01', done: false };
test('wall time conversion, completion, deletion, editing and duplicates', () => {
  const first = snapshot([todo]);
  assert.equal(first[0].dueAt, new Date(2026, 9, 1, 14, 30).getTime());
  assert.equal(snapshot([todo, todo]).length, 1);
  assert.equal(snapshot([{ ...todo, done: true }]).length, 0);
  assert.equal(snapshot([]).length, 0);
  assert.notEqual(snapshot([{ ...todo, time: '15:00' }])[0].dueAt, first[0].dueAt);
});
test('invalid dates/times rejected; no untimed alerts', () => {
  for (const time of [null, '', '25:30', '14:90', '1:00']) assert.equal(snapshot([{ ...todo, time }]).length, 0);
  assert.equal(snapshot([{ ...todo, todoDate: '2026-02-30' }]).length, 0);
});
test('fires once, only in five minute grace; changed schedule gets a new identity', () => {
  const tasks = snapshot([todo]), when = tasks[0].dueAt;
  assert.equal(due(tasks, {}, when - 1).length, 0);
  assert.equal(due(tasks, {}, when).length, 1);
  assert.equal(due(tasks, { [`one:${when}`]: when }, when).length, 0);
  assert.equal(due(tasks, {}, when + GRACE_MS).length, 0);
});
test('unknown offline/startup snapshot preserves native reservations; valid empty snapshot clears', async () => {
  const vm=require('node:vm'),fs=require('node:fs');
  const calls=[];
  const window={document:{},ReactNativeWebView:{postMessage:value=>calls.push(JSON.parse(value))}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../web/reminders.js'),'utf8'),{window,localStorage:{getItem:()=>null}});
  await window.OharuReminders.sync(null);
  await window.OharuReminders.sync(undefined);
  assert.equal(calls.length,0);
  await window.OharuReminders.sync([]);
  assert.equal(calls.length,2);
  assert.equal(calls[0].tasks.length,0);
});
test('historical rows cannot consume the 500 notification budget', () => {
  const historical=Array.from({length:500},(_,i)=>({...todo,id:`old-${i}`,todoDate:'2000-01-01'}));
  assert.equal(snapshot([...historical,todo]).length,1);
  assert.equal(snapshot([...historical,todo])[0].id,todo.id);
});
test('delivered ledger accepts only bounded numeric timestamps in a plain record', () => {
  for(const value of [true,123,'text',[],null]) assert.equal(Object.keys(cleanLedger(value)).length,0);
  const now=Date.now();
  assert.deepEqual(Object.keys(cleanLedger({good:now,bad:'x',old:now-86400001,future:Infinity},now)),['good']);
});
