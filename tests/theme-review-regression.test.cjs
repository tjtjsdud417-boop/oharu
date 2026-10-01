// Offline Chromium acceptance for the two independent review findings. The native
// bridge is synthetic; existing SDK/font bytes are read from the reviewer evidence.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {test}=require('node:test'),{chromium}=require('playwright');
const root=path.join(__dirname,'..'),out=path.join(root,'output/playwright/theme-review-fixes');
const review=process.env.OHARU_REVIEW_ASSETS||'';
const realAssets=fs.existsSync(path.join(review,'supabase-pinned.mjs'))&&fs.existsSync(path.join(review,'pretendard.css'))&&fs.existsSync(path.join(review,'fonts'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const sources=new Map(['web/index.html','mobile/assets/web/app.html','web/theme-system.js','web/theme-navigation.js','web/theme-system.css','web/theme-schema.json','web/settings-experience.js','web/reminders.js'].map(p=>[p,Buffer.from(fs.readFileSync(path.join(root,p),'utf8').replace(/\r\n/g,'\n'))]));
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'served-source-hashes.json'),JSON.stringify({fixture:realAssets?'exact source, pinned reviewer SDK and Pretendard bytes':'offline guest: auth configuration disabled, system fonts',sources:Object.fromEntries([...sources].map(([p,b])=>[p,{bytes:b.length,sha256:hash(b)}]))},null,2));
async function fixture(browser,surface){
 const context=await browser.newContext({viewport:{width:surface.width,height:surface.height},reducedMotion:'reduce'});let fontsLoaded=0;
 if(surface.native)await context.addInitScript(()=>{window.ReactNativeWebView={postMessage(){}};});
 await context.route('**/*',route=>{
  const req=route.request(),url=new URL(req.url()),p=url.pathname.slice(1);
  if(req.resourceType()==='document'){let html=sources.get(surface.native?'mobile/assets/web/app.html':'web/index.html').toString();if(!realAssets)html=html.replace(/const SUPABASE_URL = .*?;/,'const SUPABASE_URL = "";').replace(/const SUPABASE_ANON_KEY = .*?;/,'const SUPABASE_ANON_KEY = "";');return route.fulfill({contentType:'text/html',body:html});}
  if(url.hostname==='theme-review.test'&&sources.has('web/'+p))return route.fulfill({contentType:p.endsWith('.css')?'text/css':p.endsWith('.json')?'application/json':'text/javascript',body:sources.get('web/'+p)});
  if(url.href==='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')return realAssets?route.fulfill({contentType:'text/javascript',path:path.join(review,'supabase-pinned.mjs')}):route.fulfill({contentType:'text/javascript',body:'export function createClient(){throw Error("offline fixture")}'});
  if(realAssets&&url.hostname==='cdn.jsdelivr.net'&&p.endsWith('.css'))return route.fulfill({contentType:'text/css',path:path.join(review,'pretendard.css')});
  if(realAssets&&url.hostname==='cdn.jsdelivr.net'&&p.endsWith('.woff2')){fontsLoaded++;return route.fulfill({contentType:'font/woff2',path:path.join(review,'fonts',path.basename(p))});}
  if(url.pathname==='/rest/v1/page_visits')return route.fulfill({status:204});
  return route.abort();
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://theme-review.test/?lang=ko'+(surface.native?'&mobile=1&nativePlatform='+surface.native:''),{waitUntil:'networkidle'});
 if(!await page.locator('#mainView').isVisible())await page.locator('#guestBtn').click();
 await page.locator('#mainView').waitFor({state:'visible'});await page.evaluate(()=>document.fonts.ready);
 if(surface.scale)await page.evaluate(s=>document.documentElement.style.setProperty('--ios-font-scale',String(s)),surface.scale);
 if(realAssets)assert(fontsLoaded>0,'actual Pretendard bytes must load');return {context,page,errors};
}
async function state(page){return page.evaluate(()=>({history:history.state,detail:!document.getElementById('themeDetailView').hidden,settings:!document.getElementById('setView').hidden,today:!document.getElementById('todayView').hidden,scroll:(document.getElementById('iosMainScroll')||document.scrollingElement).scrollTop,mood:document.getElementById('oharu-theme-mood').value,json:document.getElementById('oharu-theme-json').value,tasks:localStorage.getItem('oneul.v3'),theme:localStorage.getItem('oharu.theme.v1.guest'),clicks:window.__reviewClicks}));}
test('repeat Back clicks at the old position stay in settings and preserve draft/tasks, with and without history round trip',async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'}),results=[];
 try{for(const surface of [{name:'desktop',width:1280,height:900},{name:'ios',width:390,height:844,native:'ios'}])for(const mode of [{roundTrip:false,scroll:70},{roundTrip:true,scroll:70},...(surface.native?[{roundTrip:false,scroll:0}]:[])])for(let trial=1;trial<=3;trial++){
  const {roundTrip}=mode;
  const x=await fixture(browser,surface),p=x.page;await p.locator('#input').fill('저녁 산책 20분');await p.locator('#addBtn').click();await p.locator('#setBtn').click();
  await p.evaluate(value=>{const advanced=document.querySelector('.settings-advanced');if(advanced)advanced.open=true;(document.getElementById('iosMainScroll')||document.scrollingElement).scrollTop=value;},mode.scroll);
  const settings=await p.evaluate(()=>({route:history.state,scroll:(document.getElementById('iosMainScroll')||document.scrollingElement).scrollTop}));
  await p.locator('#themeSettingsEntry').click();await p.locator('#themeAITab').click();await p.locator('#oharu-theme-mood').fill('햇살이 드는 조용한 서점');await p.locator('#oharu-theme-json').fill('{draft}');
  await p.evaluate(()=>{(document.getElementById('iosMainScroll')||document.scrollingElement).scrollTop=120;});
  if(roundTrip){await p.goBack();await p.locator('#setAIConnections').waitFor({state:'visible'});await p.goForward();await p.locator('#themeDetailView').waitFor({state:'visible'});}
  await p.evaluate(()=>{window.__reviewClicks=[];window.addEventListener('click',e=>{const row={at:performance.now(),id:e.target.closest('button')?.id,detail:e.detail,x:e.clientX,y:e.clientY,themeOpen:!document.getElementById('themeDetailView').hidden};window.__reviewClicks.push(row);setTimeout(()=>row.prevented=e.defaultPrevented,0);},true);});
  const back=p.locator(surface.native?'#settingsBackBtn':'#themeSettingsBack');await back.scrollIntoViewIfNeeded();const box=await back.boundingBox(),before=await state(p);
  const name=surface.name+'-'+(roundTrip?'history':mode.scroll===0?'direct-zero':'direct')+'-'+trial;
  if(trial===1)await p.screenshot({path:path.join(out,name+'-before.png')});
  await p.mouse.dblclick(box.x+box.width/2,box.y+box.height/2,{delay:25});await p.waitForTimeout(250);const after=await state(p);
  if(trial===1)await p.screenshot({path:path.join(out,name+'-after.png')});
  const result={surface:surface.name,trial,roundTrip,viewport:{width:surface.width,height:surface.height},delay:25,point:{x:box.x+box.width/2,y:box.y+box.height/2},settings,before,after,pass:!after.detail&&after.settings&&!after.today};results.push(result);
  assert(result.pass,name);assert.equal(after.scroll,settings.scroll);assert.equal(after.tasks,before.tasks);assert.equal(after.theme,before.theme);assert.equal(after.mood,before.mood);assert.equal(after.json,before.json);assert.notEqual(after.history?.oharuThemeDetail,true);if(await p.locator('.settings-advanced').count())assert.equal(await p.locator('.settings-advanced').evaluate(e=>e.open),true);
  assert.equal(after.clicks.length,2,'both real pointer clicks must be observed');assert.equal(after.clicks[0].prevented,false);assert.equal(after.clicks[1].prevented,true,'the stale pointer activation must be canceled');
  if(surface.native)assert.equal(after.history.routeId,settings.route.routeId);
  await p.goForward();await p.locator('#themeDetailView').waitFor({state:'visible'});assert.equal(await p.locator('#oharu-theme-json').inputValue(),'{draft}');
  await p.keyboard.press('Escape');await p.locator('#setAIConnections').waitFor({state:'visible'});
  // A fresh keyboard action may immediately reopen; it is not the stale pointer tap.
  await p.locator('#themeSettingsEntry').focus();await p.keyboard.press('Enter');await p.locator('#themeDetailView').waitFor({state:'visible'});
  assert.deepEqual(x.errors,[]);await x.context.close();
 }}finally{fs.writeFileSync(path.join(out,'repeat-back-results.json'),JSON.stringify({renderer:'Chromium',physicalDevice:false,results},null,2));await browser.close();}
 assert.equal(results.length,15);
});
async function surfaces(page){return page.evaluate(()=>{
 const selectors=['body','.list','.item','.nudge','.composer','.progress','.calendar','.set-card','#themeDetailView .oharu-theme-settings','#iosMenu'];const nodes=selectors.flatMap(selector=>[...document.querySelectorAll(selector)].map((e,i)=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {id:selector+':'+i,background:s.backgroundColor,image:s.backgroundImage,font:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,radius:s.borderRadius,padding:s.padding,margin:s.margin,display:s.display,left:r.left,top:r.top,width:r.width,height:r.height};}));
 return {nodes,overflow:document.documentElement.scrollWidth>innerWidth,font:getComputedStyle(document.body).fontFamily};
 });}
test('all ten themes and compatible legacy JSON preserve body/card surfaces, fonts and geometry on browser/native/large text',async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'}),results=[];
 const cases=[{name:'desktop',width:1280,height:900},{name:'web320',width:320,height:568},{name:'windows-small',width:340,height:480},{name:'ios390',width:390,height:844,native:'ios'},{name:'android390',width:390,height:844,native:'android'},...['2','3.1'].map(s=>({name:'ios320-scale'+s,width:320,height:568,native:'ios',scale:Number(s)})),{name:'ios-landscape310',width:568,height:240,native:'ios',scale:3.1}];
 try{for(const surface of cases){const x=await fixture(browser,surface),p=x.page;await p.locator('#input').fill('카드·폰트·배치를 유지할 할 일');await p.locator('#addBtn').click();await p.locator('.item').first().hover();
  const before=await surfaces(p),tasks=await p.evaluate(()=>localStorage.getItem('oneul.v3'));const ids=await p.evaluate(()=>OharuThemes.themes.map(t=>t.id));
  if(['desktop','ios390'].includes(surface.name))await p.screenshot({path:path.join(out,surface.name+'-default.png')});
  for(const id of ids){const applied=await p.evaluate(id=>{OharuThemes.apply({id});return {theme:OharuThemes.exportTheme(),button:getComputedStyle(document.getElementById('addBtn')).backgroundColor,body:getComputedStyle(document.body).backgroundColor,card:getComputedStyle(document.querySelector('.list')).backgroundColor};},id);const after=await surfaces(p);assert.deepEqual(after,before,surface.name+' '+id);assert.equal(await p.evaluate(()=>localStorage.getItem('oneul.v3')),tasks);
   for(const [key,value] of Object.entries({bg:'#F2F4F6',card:'#FFFFFF',soft:'#E8F3FF',line:'#F2F4F6',dangerSoft:'#FEECEE'}))assert.equal(applied.theme.tokens[key],value);
   if(id==='forest'&&['desktop','ios390'].includes(surface.name))await p.screenshot({path:path.join(out,surface.name+'-forest.png')});results.push({surface:surface.name,scale:surface.scale??1,id,applied,before,after,pass:true});
  }
  await p.evaluate(()=>{const theme=OharuThemes.exportTheme();theme.name='기존 색상 테마';Object.assign(theme.tokens,{bg:'#E9F0E8',card:'#F9FCF7',soft:'#DCECDD',line:'#E9F0E8',text:'#203B2C',muted:'#4D6556',accent:'#286440'});OharuThemes.apply({id:'custom',theme});});assert.deepEqual(await surfaces(p),before,surface.name+' legacy custom');assert.equal(await p.evaluate(()=>localStorage.getItem('oneul.v3')),tasks);
  await p.evaluate(()=>OharuThemes.apply({id:'default'}));assert.deepEqual(await surfaces(p),before,surface.name+' restored default');assert.deepEqual(x.errors,[]);await x.context.close();
 }}finally{fs.writeFileSync(path.join(out,'surface-scope-results.json'),JSON.stringify({renderer:'Chromium',physicalDevice:false,cases:cases.length,results},null,2));await browser.close();}
 assert.equal(results.length,80);
});
