const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const source=fs.readFileSync(require.resolve('../web/reminders.js'),'utf8');
async function pageFor(browser,native=false){
  const page=await browser.newPage();
  await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><div id="setDesign"></div>'}));
  await page.goto('http://async-test.invalid/');
  await page.evaluate(native=>{
    window.ticks=[];window.setInterval=fn=>ticks.push(fn);window.items=[];
    if(native){window.calls=[];window.ReactNativeWebView={postMessage:s=>calls.push(JSON.parse(s))};}
    else{
      localStorage.setItem('oharu.reminders.v1','true');window.shown=[];
      window.Notification=class{static permission='granted';constructor(title,options){shown.push(options.body);}};
      window.lookups=0;Object.defineProperty(navigator,'serviceWorker',{value:{getRegistration:()=>++lookups===1?new Promise(resolve=>window.release=()=>resolve(null)):Promise.resolve(null)}});
    }
  },native);
  await page.addScriptTag({content:source});
  await page.evaluate(()=>OharuReminders.mount(()=>items));
  return page;
}
test('permission replies use their own IDs, report denial/errors, and reject stale grants',async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try{
    for(const status of ['denied','unavailable','error']){
      const page=await pageFor(browser,true);
      const result=await page.evaluate(async status=>{
        document.getElementById('reminderEnable').click();
        const id=calls.at(-1).requestId;
        await OharuReminders.sync([]); // concurrent sync must not hide the permission response
        dispatchEvent(new CustomEvent('oharu:native-reminders',{detail:{status,requestId:id}}));
        const message=document.getElementById('reminderStatus').textContent;
        dispatchEvent(new CustomEvent('oharu:native-reminders',{detail:{status:'granted',requestId:id}}));
        return {message,enabled:localStorage.getItem('oharu.reminders.v1')};
      },status);
      assert.match(result.message,status==='denied'?/거부/:/확인하지 못/);assert.notEqual(result.enabled,'true');
      await page.close();
    }
  }finally{await browser.close();}
});
test('delete/complete/reschedule during SW lookup cancels that task but delivers subsequent valid tasks',async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try{
    for(const change of ['delete','complete','reschedule']){
      const page=await pageFor(browser);
      await page.evaluate(async()=>{
        const d=new Date(),pad=n=>String(n).padStart(2,'0');
        const base={todoDate:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,time:`${pad(d.getHours())}:${pad(d.getMinutes())}`,done:false};
        items=[{...base,id:'cancel',text:'cancelled'},{...base,id:'keep',text:'valid'}];
        await OharuReminders.sync(items);ticks[0]();
      });
      await page.waitForFunction(()=>typeof release==='function');
      await page.evaluate(async change=>{
        if(change==='delete')items.shift();
        if(change==='complete')items[0].done=true;
        if(change==='reschedule')items[0].todoDate='2099-10-01';
        await OharuReminders.sync(items);release();
      },change);
      await page.waitForFunction(()=>shown.length>0);
      assert.deepEqual(await page.evaluate(()=>shown),['valid']);
      await page.close();
    }
  }finally{await browser.close();}
});
