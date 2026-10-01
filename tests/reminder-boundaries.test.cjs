const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {chromium}=require('playwright');

test('remote logout and account replacement clear reminders independently of the logout button',()=>{
  for(const file of ['../web/index.html','../mobile/assets/web/app.html']){
    const html=fs.readFileSync(require.resolve(file),'utf8');
    const body=html.match(/supabase\.auth\.onAuthStateChange\(\(_e, sess\) => \{([\s\S]*?)\n  \}\);/)[1];
    for(const [event,session] of [['SIGNED_OUT',null],['SIGNED_IN',{user:{id:'B'}}]]){
      let cleared=0,deferred=0;
      const context={event,session,currentUserId:'A',todos:[{text:'old owner'}],reminderDataReady:true,deletionCleanupActive:false,invalidateAccountDeletion:()=>{},$:()=>({hidden:false}),window:{OharuReminders:{clear:()=>cleared++}},setTimeout:()=>deferred++};
      vm.runInNewContext(`(function(_e,sess){${body}})(event,session)`,context);
      assert.equal(cleared,1);assert.equal(deferred,1);
      if(file.startsWith('../web/')){assert.equal(context.todos.length,0);assert.equal(context.reminderDataReady,false);assert.equal(context.currentUserId,null);}
    }
  }
});

test('corrupt ledgers deduplicate, failed native scheduling retries with backoff, and Windows errors reach UI',async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try{
    const context=await browser.newContext();
    await context.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><div id="setDesign"></div>'}));
    const open=async setup=>{
      const page=await context.newPage();await page.goto('http://reminders-test.invalid/');
      await page.evaluate(()=>{localStorage.clear();localStorage.setItem('oharu.reminders.v1','true');window.ticks=[];window.setInterval=fn=>ticks.push(fn);});
      await page.evaluate(setup);await page.addScriptTag({content:fs.readFileSync(require.resolve('../web/reminders.js'),'utf8')});return page;
    };
    const corrupt=await open(()=>{
      localStorage.setItem('oharu.reminders.v1.delivered.guest','true');
      window.notifies=0;window.Notification=class{static permission='granted';constructor(){notifies++;}};
      Object.defineProperty(navigator,'serviceWorker',{value:undefined});
    });
    await corrupt.evaluate(async()=>{
      const d=new Date(),pad=n=>String(n).padStart(2,'0');
      window.todo={id:'corrupt',text:'test',todoDate:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,time:`${pad(d.getHours())}:${pad(d.getMinutes())}`,done:false};
      OharuReminders.mount(()=>[todo]);await OharuReminders.sync([todo]);ticks[0]();
    });
    await corrupt.waitForFunction(()=>notifies===1);
    await corrupt.evaluate(()=>ticks[0]());await corrupt.waitForTimeout(50);
    assert.equal(await corrupt.evaluate(()=>notifies),1);
    assert.equal(await corrupt.evaluate(()=>typeof JSON.parse(localStorage.getItem('oharu.reminders.v1.delivered.guest'))),'object');
    await corrupt.close();
    const native=await open(()=>{window.calls=[];window.ReactNativeWebView={postMessage:s=>calls.push(JSON.parse(s))};window.now=Date.now();Date.now=()=>now;});
    const retry=await native.evaluate(async()=>{
      const todo={id:'future',text:'test',todoDate:'2099-10-01',time:'14:30',done:false};
      OharuReminders.mount(()=>[todo]);await OharuReminders.sync([todo]);
      const respond=status=>dispatchEvent(new CustomEvent('oharu:native-reminders',{detail:{status,requestId:calls.filter(c=>c.type==='oharu:reminders:sync').at(-1).requestId}}));
      const first=calls.length;respond('schedule-error');await OharuReminders.sync([todo]);const retried=calls.length;
      respond('schedule-error');await OharuReminders.sync([todo]);const backedOff=calls.length;
      now+=10000;await OharuReminders.sync([todo]);const afterBackoff=calls.length;
      respond('scheduled');await OharuReminders.sync([todo]);return {first,retried,backedOff,afterBackoff,confirmed:calls.length};
    });
    assert.ok(retry.retried>retry.first);assert.equal(retry.backedOff,retry.retried);assert.ok(retry.afterBackoff>retry.backedOff);assert.equal(retry.confirmed,retry.afterBackoff);
    await native.close();
    const desktop=await open(()=>{window.desktopBridge={syncReminders:async()=>({supported:true}),getNotificationStatus:async()=>({supported:true,error:'os-display-failed'})};});
    await desktop.evaluate(()=>{OharuReminders.mount(()=>[]);ticks[0]();});
    await desktop.waitForFunction(()=>document.getElementById('reminderStatus').textContent.includes('Windows 알림을 표시할 수 없어요'));
    await desktop.close();await context.close();
  }finally{await browser.close();}
});
