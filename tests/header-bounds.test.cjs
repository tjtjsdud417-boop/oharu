const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const sources={web:fs.readFileSync(path.join(root,'web/index.html'),'utf8'),mobile:fs.readFileSync(path.join(root,'mobile/assets/web/app.html'),'utf8')};
const output=path.join(root,'output/playwright/header-bounds');
function fixture(source){
  const css=source.match(/<style>([\s\S]*?)<\/style>/)[1];
  const header=source.match(/<header class="head"[\s\S]*?<\/header>/)[0];
  const settings=source.match(/<header class="settings-head"[\s\S]*?<\/header>/)?.[0]||'';
  return '<!doctype html><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>'+css+'</style><div class="app"><div id="authView" hidden><h2 id="authH2">Login</h2><div id="backLine"><a id="backLink">Back</a></div></div><div id="mainView" style="display:flex;flex-direction:column;flex:1;min-width:0">'+header+settings+'<div id="todayView"><div class="composer"><span>오늘 할 일 · Today</span></div></div><div id="calView" hidden><div class="cal"><div class="cal-head"><span>2026년 10월 · October</span></div></div></div><div id="setView" hidden><div class="set-card"><div class="set-row account-with-deletion" id="setAccount"><span id="accountLabel" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span><button class="set-btn" id="accountAction">로그아웃</button><button class="set-btn danger" id="deleteAccountBtn">계정 삭제</button></div></div></div></div></div>';
}
test('reported 390px guest title overlap reproduces with old absolute controls and clears with normal flow',async()=>{
  fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({headless:true,channel:'chrome'});
  try{
    const page=await browser.newPage({viewport:{width:390,height:600}});
    await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:fixture(sources.web)}));
    for(const before of [true,false]){
      await page.goto('http://header-fixture.invalid/');
      await page.evaluate(()=>{document.querySelector('#dateLine').textContent='10월 1일 목요일';document.querySelector('#headline').textContent='오늘은 어떤 하루인가요?';document.querySelector('#loginTopBtn').hidden=false;});
      if(before)await page.addStyleTag({content:'.head-top{display:block}.topbtns{position:absolute;top:2px;right:0}'});
      const overlap=await page.evaluate(()=>{const a=document.querySelector('#headline').getBoundingClientRect(),b=document.querySelector('.topbtns').getBoundingClientRect();return Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top);});
      assert.equal(overlap,before);
      await page.screenshot({path:path.join(output,before?'reported-before-390.png':'reported-after-390.png'),fullPage:true});
    }
  }finally{await browser.close();}
});
test('header normal flow prevents text/control overlap across web, Android and iOS text scaling',async()=>{
  fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({headless:true,channel:'chrome'});const results=[];
  try{
    for(const platform of ['web','android','ios']){
      const source=sources[platform==='web'?'web':'mobile'];
      const context=await browser.newContext();await context.route('**/*',route=>route.fulfill({contentType:'text/html',body:fixture(source)}));
      const page=await context.newPage();
      for(const viewport of [{width:320,height:700},{width:360,height:800},{width:390,height:844},{width:430,height:900},{width:568,height:240}]){
        await page.setViewportSize(viewport);
        for(const scale of [1,2,3.1])for(const signedIn of [false,true])for(const language of ['ko','en'])for(const screen of ['today','cal','set']){
          await page.goto('http://header-fixture.invalid/');
          if(platform==='ios'){
            const start=source.indexOf('function setupIOSMenu()'),end=source.indexOf('\nconst dstr',start);
            await page.addScriptTag({content:'const IS_IOS_APP=true,$=id=>document.getElementById(id),restoreIOSRoute=()=>{},closeIOSScreen=()=>{};let deletionDialog=null,view="today";'+source.slice(start,end)+'\nsetupIOSMenu();'});
          }
          await page.evaluate(({scale,signedIn,language,screen,platform})=>{
            const $=id=>document.getElementById(id);
            $('dateLine').textContent=language==='ko'?'2026년 10월 1일 목요일':'Thursday, October 1, 2026';
            $('headline').textContent=language==='ko'?'오늘은 어떤 하루인가요? 오늘 할 일을 차근차근 준비해요':'What kind of day will today be? Let’s make room for what matters';
            $('loginTopBtn').hidden=signedIn;$('loginTopBtn').textContent=language==='ko'?'로그인':'Sign in to Oharu';
            $('accountLabel').textContent=signedIn?'a-very-long-account-name.with-more.words@example-with-a-long-domain.invalid':language==='ko'?'게스트 모드 · 이 기기에만 저장':'Guest mode · Saved on this device';
            $('accountAction').textContent=language==='ko'?(signedIn?'로그아웃':'로그인'):(signedIn?'Sign out':'Sign in');
            $('deleteAccountBtn').textContent=language==='ko'?'계정 삭제':'Delete account';$('deleteAccountBtn').hidden=!signedIn;
            if($('settingsTitle'))$('settingsTitle').textContent=language==='ko'?'계정과 알림 및 화면 설정':'Account, notification and appearance settings';
            if($('settingsBackText'))$('settingsBackText').textContent=language==='ko'?'뒤로 돌아가기':'Go back to your day';
            for(const id of ['today','cal','set'])$(id+'View').hidden=id!==screen;
            if(platform==='ios'){$('homeHeader').hidden=screen==='set';$('settingsHeader').hidden=screen!=='set';}
            // Text-only scaling: preserve physical viewport/button/icon geometry, enlarge text.
            const nodes=[...document.querySelectorAll('.head .date,.head h1,.textbtn,.settings-head h1,.settings-back,.ios-menu .iconbtn,.set-row')];
            const sizes=nodes.map(node=>parseFloat(getComputedStyle(node).fontSize));
            nodes.forEach((node,i)=>node.style.fontSize=sizes[i]*scale+'px');
          },{scale,signedIn,language,screen,platform});
          const bounds=await page.evaluate(()=>{
            const visible=node=>node&&node.getClientRects().length&&!node.closest('[hidden]');
            const rect=node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
            const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>.5&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>.5;
            const pairs=[];const head=document.querySelector('.head');
            if(visible(head)){
              const date=head.querySelector('.date'),title=head.querySelector('h1'),actions=[...head.querySelectorAll('.topbtns button')].filter(visible);
              for(const action of actions){pairs.push([date,action],[title,action]);}
              for(let i=0;i<actions.length;i++)for(let j=i+1;j<actions.length;j++)pairs.push([actions[i],actions[j]]);
              pairs.push([date,title]);
              const body=[...document.querySelectorAll('#todayView,#calView,#setView')].find(visible);if(body)pairs.push([head,body]);
            }
            const settings=document.querySelector('.settings-head');if(visible(settings))pairs.push([settings.querySelector('h1'),settings.querySelector('button')]);
            const account=document.querySelector('#setAccount');if(visible(account)){const children=[...account.children].filter(visible);for(let i=0;i<children.length;i++)for(let j=i+1;j<children.length;j++)pairs.push([children[i],children[j]]);}
            const collisions=pairs.filter(([a,b])=>overlap(rect(a),rect(b))).map(([a,b])=>[a.id||a.className,b.id||b.className]);
            const headerNodes=[...document.querySelectorAll('.head-top,.head h1,.head .date,.topbtns,.topbtns button,.settings-head,.settings-head h1,.settings-back,#setAccount')].filter(visible);
            const outside=headerNodes.filter(node=>{const r=rect(node);return r.left<-.5||r.right>innerWidth+.5||node.scrollWidth>node.clientWidth+1;}).map(node=>node.id||node.className);
            const clipping=[...document.querySelectorAll('.topbtns .textbtn')].filter(visible).some(node=>node.scrollHeight>node.clientHeight+1);
            return {collisions,outside,clipping,documentOverflow:document.documentElement.scrollWidth>innerWidth,topButtonsPosition:document.querySelector('.topbtns')?getComputedStyle(document.querySelector('.topbtns')).position:null};
          });
          const name=`${platform}-${viewport.width}x${viewport.height}-${scale}-${signedIn?'signedin':'guest'}-${language}-${screen}`;
          results.push({name,...bounds});
          assert.deepEqual(bounds.collisions,[],name+' overlaps');assert.deepEqual(bounds.outside,[],name+' overflow');assert.equal(bounds.clipping,false,name+' clipped login');assert.equal(bounds.documentOverflow,false,name+' document overflow');
          if(platform!=='ios')assert.equal(bounds.topButtonsPosition,'static',name+' normal flow');
          if((viewport.width===390&&scale===1&&!signedIn&&language==='ko'&&screen==='today')||(viewport.width===320&&scale===3.1&&!signedIn&&language==='en'&&screen==='today')||(viewport.height===240&&scale===3.1&&signedIn&&language==='ko'&&screen==='set'))await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});
        }
      }
      await context.close();
    }
  }finally{fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({at:new Date().toISOString(),count:results.length,results},null,2));await browser.close();}
});
