const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createReminderService,validateMessage,permitted} = require('./reminders.cjs');
const task = (id='a',dueAt=2000) => ({id,title:'할 일',dueAt,done:false});
const msg = (tasks,enabled=true) => JSON.stringify({type:'oharu:reminders:sync',version:1,requestId:'test',enabled,tasks});
function fixture(permission={granted:true}) {
  const pending = new Map(), calls=[], shown=[];
  const api={getPermissionsAsync:async()=>permission, requestPermissionsAsync:async()=>{calls.push('prompt');return permission}, setNotificationChannelAsync:async()=>{},getAllScheduledNotificationsAsync:async()=>[...pending.values()],cancelScheduledNotificationAsync:async id=>{calls.push('cancel');pending.delete(id)},scheduleNotificationAsync:async n=>{calls.push('schedule');pending.set(n.identifier,n)},getPresentedNotificationsAsync:async()=>shown,dismissNotificationAsync:async id=>calls.push('dismiss:'+id)};
  return {service:createReminderService(api,'ios',()=>1000),api,pending,calls,shown};
}
test('rejects malicious/malformed/duplicate snapshots atomically',()=>{
 for(const raw of ['{}', msg([task(),task()]),msg([{...task(),dueAt:'tomorrow'}]),msg([{...task(),id:'../x'}]),msg([{...task(),title:'x'.repeat(501)}])]) assert.throws(()=>validateMessage(raw));
});
test('edit replaces; unchanged sync deduplicates; complete/delete cancel',async()=>{
 const f=fixture();await f.service.handle(msg([task()]));await f.service.handle(msg([task()]));assert.equal(f.calls.filter(x=>x==='schedule').length,1);
 await f.service.handle(msg([task('a',3000)]));assert.deepEqual(f.calls,['schedule','cancel','schedule']);
 await f.service.handle(msg([{...task(),done:true}]));assert.equal(f.pending.size,0);
 await f.service.handle(msg([task()]));await f.service.handle(msg([]));assert.equal(f.pending.size,0);
});
test('denial never prompts automatically, disabled clears pending and visible',async()=>{
 const f=fixture({granted:false,canAskAgain:true});assert.equal((await f.service.handle(msg([task()]))).status,'denied');assert.deepEqual(f.calls,[]);
 await f.service.handle(JSON.stringify({type:'oharu:reminders:permission',version:1,requestId:'p'}));assert.deepEqual(f.calls,['prompt']);
 const g=fixture();await g.service.handle(msg([task()]));g.shown.push({request:{identifier:'oharu.todo.a'}});await g.service.handle(msg([],false));assert.equal(g.pending.size,0);assert.ok(g.calls.includes('dismiss:oharu.todo.a'));
});
test('past reminders never replay; capacity reports omitted and schedules nearest',async()=>{
 const f=fixture();const r=await f.service.handle(msg([task('past',999),...Array.from({length:70},(_,i)=>task('x'+i,2000+i))]));assert.equal(r.scheduled,60);assert.equal(r.omitted,10);assert.equal(f.pending.has('oharu.todo.past'),false);
});
test('serialized rapid snapshots preserve final state',async()=>{
 const f=fixture();await Promise.all([f.service.handle(msg([task()])),f.service.handle(msg([task('a',4000)])),f.service.handle(msg([]))]);assert.equal(f.pending.size,0);
});
test('iOS granular permissions and schedule failure are explicit',async()=>{
 assert.equal(permitted({ios:{status:3}}),true);assert.equal(permitted({granted:true,ios:{status:1}}),false);
 const f=fixture();f.api.scheduleNotificationAsync=async()=>{throw Error('denied exact alarm')};assert.equal((await f.service.handle(msg([task()]))).status,'schedule-error');
});
test('invalid snapshots preserve pending reservations and unrelated notifications',async()=>{
 const f=fixture();await f.service.handle(msg([task()]));f.pending.set('other.feature',{identifier:'other.feature',content:{}});
 assert.equal((await f.service.handle(msg([task(),task()]))).status,'invalid-message');assert.equal(f.pending.size,2);
 await f.service.handle(msg([]));assert.equal(f.pending.has('other.feature'),true);
});
test('UTC epoch is scheduled unchanged and timezone recalculation replaces it',async()=>{
 const f=fixture();const utc=Date.parse('2026-10-01T09:00:00+09:00');await f.service.handle(msg([task('tz',utc)]));assert.equal(f.pending.get('oharu.todo.tz').trigger.date.getTime(),utc);
 const changed=Date.parse('2026-10-01T09:00:00-04:00');await f.service.handle(msg([task('tz',changed)]));assert.equal(f.pending.get('oharu.todo.tz').trigger.date.getTime(),changed);
});
test('one failure does not block other schedules and later sync retries it',async()=>{
 const f=fixture();const original=f.api.scheduleNotificationAsync;let fail=true;
 f.api.scheduleNotificationAsync=async n=>{if(fail&&n.identifier==='oharu.todo.a')throw Error();return original(n)};
 assert.equal((await f.service.handle(msg([task('a'),task('b')]))).failed,1);assert.equal(f.pending.size,1);
 fail=false;assert.equal((await f.service.handle(msg([task('a'),task('b')]))).scheduled,2);
});
