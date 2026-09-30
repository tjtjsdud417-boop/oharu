const { test } = require('node:test');
const assert = require('node:assert/strict');
const { snapshot, due, GRACE_MS } = require('../web/reminders.js');
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
