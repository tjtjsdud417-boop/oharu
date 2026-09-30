const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {widgetSnapshot,createWidgetService}=require('./widget.cjs');
const {registerPackage,registerReceiver,writeWidgetFiles}=require('./plugins/withOharuWidget');
const task=(id='a',dueAt=2000)=>({id,title:'제목',dueAt,done:false});
const msg=(tasks,enabled=true)=>JSON.stringify({type:'oharu:widgets:sync',version:1,requestId:'w1',enabled,tasks});
test('widget sanitizes titles and only exposes upcoming incomplete fields',()=>{
 const result=widgetSnapshot(msg([{...task(),title:'A\n\u202eB',secret:'never'},task('past',999),{...task('done'),done:true}]),1000);
 assert.deepEqual(result,[{id:'a',title:'A  B',dueAt:2000}]);
 assert.deepEqual(widgetSnapshot(msg([task()],false),1000),[]);
 assert.throws(()=>widgetSnapshot(msg([task(),task()]),1000));
});
test('widget keeps nearest 60 and rejects reminder/permission commands',()=>{
 const result=widgetSnapshot(msg(Array.from({length:70},(_,i)=>task('a'+i,3000-i))),1000);assert.equal(result.length,60);assert.equal(result[0].dueAt,2931);
 assert.throws(()=>widgetSnapshot(JSON.stringify({type:'oharu:reminders:permission',version:1,requestId:'a'})));
});
test('logout snapshots remain last despite rapid updates and native failure recovers',async()=>{
 const seen=[];let fail=true;
 const service=createWidgetService({async updateSnapshot(raw){if(fail){fail=false;throw Error()}seen.push(JSON.parse(raw));}});
 assert.equal((await service.handle(msg([]))).status,'unavailable');
 await Promise.all([service.handle(msg([task('a',Date.now()+60000)])),service.handle(msg([],false))]);
 assert.deepEqual(seen.at(-1),[]);
});
test('CNG package/receiver registration is idempotent and fails unsupported template',()=>{
 const original='PackageList(this).packages.apply {\n }';const changed=registerPackage(original);assert.equal(registerPackage(changed),changed);assert.throws(()=>registerPackage('class Other {}'));
 const manifest={manifest:{application:[{}]}};registerReceiver(manifest);registerReceiver(manifest);const r=manifest.manifest.application[0].receiver;assert.equal(r.length,1);assert.equal(r[0].$['android:exported'],'false');
});
test('CNG writes all native resources into supplied Android package',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'oharu-widget-test-'));
 await writeWidgetFiles(dir,'com.oharu.today');
 const kotlin=await fs.readFile(path.join(dir,'app/src/main/java/com/oharu/today/OharuWidget.kt'),'utf8');
 assert.ok(kotlin.startsWith('package com.oharu.today'));assert.ok(!kotlin.includes('__PACKAGE__'));
 for(const f of ['layout/oharu_widget.xml','xml/oharu_widget_info.xml','drawable/oharu_widget_background.xml','values/oharu_widget_strings.xml'])assert.ok((await fs.stat(path.join(dir,'app/src/main/res',f))).size>100);
 await assert.rejects(writeWidgetFiles(dir,'../escape'));
});
