const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {normalizeSnapshot,createIOSWidgetBridge} = require('./snapshot.cjs');
const now = 1800000000000;
const task = (extra={}) => ({id:'a-1',title:'회의 준비',dueAt:now+60000,...extra});
const input = (extra={}) => ({schemaVersion:1,enabled:true,tasks:[task()],...extra});
test('default contract removes titles and all unrelated private fields',()=>{
  const result=normalizeSnapshot(input({apiKey:'secret',userEmail:'private',tasks:[task({session:'secret'})]}),now);
  assert.equal(result.tasks[0].title,'');
  assert.equal(JSON.stringify(result).includes('secret'),false);
  assert.deepEqual(Object.keys(result.tasks[0]),['id','title','dueAt']);
});
test('home title opt-in sanitizes control and bidirectional text and limits length',()=>{
  const result=normalizeSnapshot(input({showTitlesOnHome:true,tasks:[task({title:'\u202e\u0000'+ '가'.repeat(200)})]}),now);
  assert.equal(result.tasks[0].title.length,140);
  assert.equal(/[\u202e\u0000]/.test(result.tasks[0].title),false);
});
test('disabled or logout clears tasks and resets title sharing',()=>{
  assert.deepEqual(normalizeSnapshot(input({enabled:false,showTitlesOnHome:true}),now),{schemaVersion:1,enabled:false,showTitlesOnHome:false,tasks:[]});
});
test('completed, past and beyond seven day items are removed; future items sorted',()=>{
  const result=normalizeSnapshot(input({tasks:[task({id:'later',dueAt:now+120000}),task({id:'past',dueAt:now}),task({id:'done',done:true}),task({id:'far',dueAt:now+8*86400000}),task()]}),now);
  assert.deepEqual(result.tasks.map(t=>t.id),['a-1','later']);
});
test('rejects duplicate ids, nonnumeric times, malicious ids and oversized batches',()=>{
  for (const tasks of [[task(),task()],[task({dueAt:'tomorrow'})],[task({id:'../file'})],Array(61).fill(task())]) assert.throws(()=>normalizeSnapshot(input({tasks}),now));
});
test('three-byte UTF8 task payload cannot exceed native 32KB limit',()=>{
  assert.throws(()=>normalizeSnapshot(input({showTitlesOnHome:true,tasks:Array.from({length:60},(_,i)=>task({id:'x'.repeat(126)+i,title:'가'.repeat(140)}))}),now));
});
test('bridge serializes clear after write and survives a native rejection',async()=>{
  const seen=[];
  const native={async updateSnapshot(json){const data=JSON.parse(json);seen.push(data.enabled);if(data.enabled)throw Error('locked');return {status:'cleared'};}};
  const bridge=createIOSWidgetBridge(native);
  const first=bridge.update({schemaVersion:1,enabled:true,tasks:[]});
  const second=bridge.update({schemaVersion:1,enabled:false,tasks:[]});
  assert.deepEqual(await first,{status:'unavailable'});
  assert.deepEqual(await second,{status:'cleared'});
  assert.deepEqual(seen,[true,false]);
});
test('missing native module reports unavailable without pretending to register a widget',async()=>{
  assert.deepEqual(await createIOSWidgetBridge(null).update({schemaVersion:1,enabled:false}),{status:'unavailable'});
});
test('integration remains opt-in and absent from the release configuration',()=>{
  const draft=JSON.parse(fs.readFileSync(path.join(__dirname,'integration.json'),'utf8'));
  const app=JSON.parse(fs.readFileSync(path.join(__dirname,'../app.json'),'utf8'));
  assert.equal(draft.enabled,false);
  assert.equal(draft.appGroupIdentifier,'__APP_GROUP_ID__');
  assert.equal(JSON.stringify(app.expo.plugins).includes('ios-widget-draft'),false);
  assert.equal(JSON.stringify(app).includes('com.oharu.today.widgets'),false);
});
