// Full HTML runtime checks. All data and native bridges are synthetic and offline.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'output/playwright/header-platforms');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const web = read('web/index.html').replace(/const SUPABASE_URL = .*?;/, 'const SUPABASE_URL = "";').replace(/const SUPABASE_ANON_KEY = .*?;/, 'const SUPABASE_ANON_KEY = "";');
const mobile = read('mobile/assets/web/app.html');
const results = [];
const overlap = (a,b) => Math.min(a.right,b.right)-Math.max(a.left,b.left) > .5 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top) > .5;
(async () => {
  fs.mkdirSync(out, {recursive:true});
  const browser = await chromium.launch({headless:true, channel:'chrome'});
  try {
    for (const platform of ['web','android','ios','windows']) {
      const native = platform === 'android' || platform === 'ios';
      const sizes = platform === 'windows' ? [{width:340,height:480}] : [{width:320,height:568},{width:360,height:800},{width:390,height:844},{width:430,height:900},{width:568,height:240}];
      for (const size of sizes) for (const scale of [1,2,3.1]) for (const lang of ['ko','en']) {
        const context = await browser.newContext({viewport:size});
        await context.route('**/*', r => r.request().resourceType() === 'document' ? r.fulfill({contentType:'text/html', body:native ? mobile : web}) : r.abort());
        if (native) await context.addInitScript(() => {window.ReactNativeWebView={postMessage(){}};});
        const page = await context.newPage();
        const errors=[]; page.on('pageerror', error => errors.push(error.message));
        await page.goto(`http://header-runtime.invalid/?lang=${lang}${native?'&mobile=1&nativePlatform='+platform:platform==='windows'?'&desktop=1':''}`);
        await page.locator('#mainView').waitFor({state:'visible'});
        await page.evaluate(({platform,scale,lang}) => {
          document.querySelector('#loginTopBtn').hidden=false;
          document.querySelector('#loginTopBtn').textContent=lang==='ko'?'로그인':'Sign in to Oharu';
          if (platform==='ios') document.documentElement.style.setProperty('--ios-font-scale',String(scale));
          else {
            const nodes=[...document.querySelectorAll('.head .date,.head h1,.topbtns .textbtn')];
            const sizes=nodes.map(node=>parseFloat(getComputedStyle(node).fontSize));
            nodes.forEach((node,i)=>node.style.fontSize=sizes[i]*scale+'px');
          }
        },{platform,scale,lang});
        for (const screen of ['today','cal','set']) {
          if (screen!=='today') await page.locator(screen==='cal'?'#calBtn':'#setBtn').click();
          if (screen!=='set' || platform!=='ios') await page.locator('#headline').evaluate((node,lang) => node.textContent=lang==='ko'?'오늘은 어떤 하루인가요? 나에게 중요한 일을 하나씩 준비해요':'What kind of day will today be? Let us make room for what matters',lang);
          const bounds=await page.evaluate(() => {
            const visible=node=>node && node.getClientRects().length && !node.closest('[hidden]');
            const box=node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
            const nodes=[...document.querySelectorAll('.head,.head-top,#dateLine,#headline,.topbtns,.topbtns button,.settings-head,.settings-head h1,.settings-back,#iosMenu')].filter(visible);
            return {rectangles:Object.fromEntries(nodes.map(node=>[node.id || node.className,box(node)])), headerOverflow:nodes.filter(node=>node.matches('.head-top,#dateLine,#headline,.topbtns,.topbtns button,.settings-head h1,.settings-back') && (node.getBoundingClientRect().left<-.5 || node.getBoundingClientRect().right>innerWidth+.5 || node.scrollWidth>node.clientWidth+1)).map(node=>node.id||node.className)};
          });
          const r=bounds.rectangles;
          if (r.headline && r.dateLine) assert(!overlap(r.headline,r.dateLine),'date/title overlap');
          for (const id of ['loginTopBtn','calBtn','setBtn']) if (r[id] && r.headline) assert(!overlap(r[id],r.headline),`${platform} ${screen} ${size.width} ${scale} ${id} overlap`);
          if(r.headline && r['head-top']) assert(r.headline.top>=r['head-top'].bottom-.5,'question is below action row');
          assert.deepEqual(bounds.headerOverflow,[],`${platform} ${screen} ${size.width} ${scale} header overflow`);
          assert.deepEqual(errors,[],`${platform} runtime error`);
          const name=`${platform}-${size.width}x${size.height}-${scale}-${lang}-${screen}`;
          results.push({name,...bounds});
          if ((size.width===390 && scale===1 && lang==='ko') || (size.width===340 && scale===3.1 && lang==='en') || (size.width===568 && scale===3.1 && lang==='en' && platform==='ios')) await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});
        }
        await context.close();
      }
    }
    // Nonzero mobile-browser safe areas are simulated in CSS; this is not device verification.
    const context = await browser.newContext({viewport:{width:390,height:844}});
    const safe = web.replaceAll('env(safe-area-inset-top, 0px)','47px').replaceAll('env(safe-area-inset-bottom, 0px)','34px');
    await context.route('**/*',r=>r.request().resourceType()==='document'?r.fulfill({contentType:'text/html',body:safe}):r.abort());
    const page=await context.newPage(); await page.goto('http://safe-area.invalid/');
    await page.locator('#mainView').waitFor({state:'visible'});
    const safeBounds=await page.evaluate(()=>({appTop:document.querySelector('.app').getBoundingClientRect().top,headerTop:document.querySelector('.head').getBoundingClientRect().top,paddingTop:getComputedStyle(document.querySelector('.app')).paddingTop,paddingBottom:getComputedStyle(document.querySelector('.app')).paddingBottom}));
    assert.equal(safeBounds.paddingTop,'47px');assert.equal(safeBounds.paddingBottom,'34px');assert(safeBounds.headerTop>=47);
    results.push({name:'mobile-browser-simulated-safe-area',...safeBounds});
    await page.screenshot({path:path.join(out,'mobile-browser-simulated-safe-area.png'),fullPage:true});
    await context.close();
    console.log(JSON.stringify({passed:true,count:results.length,renderer:'Chromium',physicalIPhone:false,physicalAndroid:false,actualElectron:false}));
  } finally {
    fs.writeFileSync(path.join(out,'bounds.json'),JSON.stringify({at:new Date().toISOString(),count:results.length,results},null,2));
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
