const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {test}=require('node:test');const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
async function fixture(run){const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 let html=fs.readFileSync(path.join(root,'web/index.html'),'utf8').replace(/const SUPABASE_URL = .*?;/,'const SUPABASE_URL = "";').replace(/const SUPABASE_ANON_KEY = .*?;/,'const SUPABASE_ANON_KEY = "";');
 html=html.replace('function renderAccount(email) {','window.__settingsAccount=()=>{currentUserId="synthetic-account";renderAccount("synthetic@example.invalid");};\nfunction renderAccount(email) {');
 await context.route('**/*',route=>{const name=new URL(route.request().url()).pathname.slice(1);if(route.request().resourceType()==='document')return route.fulfill({contentType:'text/html',body:html});if(/^[a-z-]+\.(js|css)$/.test(name)&&fs.existsSync(path.join(root,'web',name)))return route.fulfill({path:path.join(root,'web',name)});return route.abort();});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://settings.test/?lang=en');await page.locator('#mainView').waitFor({state:'visible'});await page.locator('#setBtn').click();await run(page);assert.deepEqual(errors,[]);
 }finally{await browser.close();}}
test('provider navigation remains preparing; advanced token controls start closed',()=>fixture(async page=>{
 assert.equal(await page.locator('.settings-advanced').evaluate(e=>e.open),false);
 assert.equal(await page.locator('#mcpRows').isVisible(),false);
 await page.locator('[data-provider=chatgpt]').click();assert.equal(await page.evaluate(()=>OharuSettings.connectionState('chatgpt')),'preparing');assert.match(await page.locator('.ai-connection-guide').textContent(),/in preparation/);assert.equal(await page.locator('.ai-connection-guide a').count(),0);
 await page.locator('[data-provider=claude]').click();const url=new URL(await page.locator('.ai-connection-guide a').getAttribute('href'));assert.equal(url.origin,'https://claude.ai');assert.equal(url.searchParams.get('connectorName'),'Oharu');assert.equal(url.searchParams.get('connectorUrl'),'https://tcaghsjndfaxlsgaqrdi.supabase.co/functions/v1/mcp');assert.equal(await page.evaluate(()=>OharuSettings.connectionState('claude')),'preparing');
}));
test('gallery uses loaded images; preview is separate from apply and stale input invalidates it',()=>fixture(async page=>{
 await page.locator('#oharu-theme-panel').evaluate(e=>e.open=true);assert.equal(await page.locator('.theme-card').count(),10);await page.waitForFunction(()=>[...document.querySelectorAll('.theme-card img')].every(img=>img.complete&&img.naturalWidth>0));
 await page.locator('[data-theme-id=forest]').click();assert.equal(await page.evaluate(()=>document.documentElement.dataset.oharuTheme),undefined);await page.locator('[data-action=confirm]').click();assert.equal(await page.evaluate(()=>document.documentElement.dataset.oharuTheme),'forest');
 await page.locator('[data-action=undo]').click();assert.equal(await page.evaluate(()=>document.documentElement.dataset.oharuTheme),undefined);
 await page.locator('#oharu-theme-ai').evaluate(e=>e.open=true);await page.locator('textarea').fill(await page.evaluate(()=>JSON.stringify(OharuThemes.exportTheme())));await page.locator('[data-action=import]').click();assert.equal(await page.locator('[data-action=confirm]').isVisible(),true);await page.locator('textarea').fill('{"script":"alert(1)"}');assert.equal(await page.locator('[data-action=confirm]').isVisible(),false);await page.locator('[data-action=import]').click();assert.match(await page.locator('.oharu-theme-status').textContent(),/Not applied/);assert.equal(await page.evaluate(()=>document.documentElement.dataset.oharuTheme),undefined);
}));
test('account management stays last with visible deletion; reminder descriptions share padding and English limitations',()=>fixture(async page=>{
 await page.evaluate(()=>__settingsAccount());assert.equal(await page.locator('#setView').evaluate(e=>e.lastElementChild.id),'setAccountManagement');assert.equal(await page.locator('#deleteAccountBtn').isVisible(),true);
 const padding=await page.evaluate(()=>{const title=document.getElementById('reminderTitle').getBoundingClientRect(),status=document.getElementById('reminderStatus').getBoundingClientRect(),description=document.getElementById('reminderCapability').getBoundingClientRect();return {title:title.left+parseFloat(getComputedStyle(document.getElementById('reminderTitle')).paddingLeft),status:status.left,description:description.left+parseFloat(getComputedStyle(document.getElementById('reminderCapability')).paddingLeft)}});assert.equal(padding.status,padding.title);assert.equal(padding.description,padding.title);
 assert.match(await page.locator('#reminderCapability').textContent(),/browser is closed/);await page.locator('#reminderDetailTitle').click();assert.match(await page.locator('#reminderDetail').textContent(),/5 minutes/);assert.match(await page.locator('#reminderDetail').textContent(),/Focus mode/);
}));
