const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');

test('account switching clears preview/undo immediately and ignores old async completions',async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try {
    const context=await browser.newContext();
    await context.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><div id="setDesign"></div>'}));
    const page=await context.newPage();
    await page.goto('http://theme-test.invalid/');
    await page.addScriptTag({content:fs.readFileSync(require.resolve('../web/theme-system.js'),'utf8')});
    await page.evaluate(()=>{
      window.user={id:'A',user_metadata:{oharu_theme_v1:{id:'forest'}}};window.writes=[];
      OharuThemes.connect({auth:{
        getUser:async()=>({data:{user}}),onAuthStateChange:fn=>window.authChanged=fn,
        updateUser:async data=>{writes.push({owner:user.id,theme:data.data.oharu_theme_v1});if(window.delayWrite) await new Promise(resolve=>window.finishWrite=resolve);return {error:null};}
      }});
    });
    await page.waitForFunction(()=>document.querySelector('select').value==='forest');
    const preview=async()=>{
      await page.locator('#oharu-theme-ai').evaluate(el=>el.open=true);
      await page.locator('textarea').fill(await page.evaluate(()=>JSON.stringify(OharuThemes.exportTheme())));
      await page.locator('[data-action="import"]').click();
    };
    await preview();await page.locator('[data-action="confirm"]').click();
    await page.waitForFunction(()=>!document.querySelector('[data-action="undo"]').hidden);
    await page.evaluate(()=>{user={id:'B',user_metadata:{oharu_theme_v1:{id:'ocean'}}};authChanged('SIGNED_IN',{user});document.querySelector('[data-action="undo"]').click();});
    await page.waitForFunction(()=>document.querySelector('select').value==='ocean');
    assert.equal(await page.locator('[data-action="undo"]').isVisible(),false);
    assert.equal(await page.locator('textarea').inputValue(),'');
    assert.deepEqual(await page.evaluate(()=>writes.filter(w=>w.owner==='B')),[]);

    // A validated B draft cannot be applied in C, even before getUser resolves.
    await preview();
    await page.evaluate(()=>{user={id:'C',user_metadata:{oharu_theme_v1:{id:'mint'}}};authChanged('SIGNED_IN',{user});document.querySelector('[data-action="confirm"]').click();});
    await page.waitForFunction(()=>document.querySelector('select').value==='mint');
    assert.deepEqual(await page.evaluate(()=>writes.filter(w=>w.owner==='C')),[]);

    // The old async confirm continuation must not re-show undo in a new account.
    await preview();await page.evaluate(()=>window.delayWrite=true);
    await page.locator('[data-action="confirm"]').click();
    await page.waitForFunction(()=>typeof finishWrite==='function');
    await page.evaluate(()=>{user={id:'D',user_metadata:{oharu_theme_v1:{id:'sand'}}};authChanged('SIGNED_IN',{user});finishWrite();});
    await page.waitForFunction(()=>document.querySelector('select').value==='sand');
    assert.equal(await page.locator('[data-action="undo"]').isVisible(),false);
    assert.equal(await page.locator('textarea').inputValue(),'');
    assert.deepEqual(await page.evaluate(()=>writes.filter(w=>w.owner==='D')),[]);

    // Logout clears a draft too; a later login to the same ID is a new ownership epoch.
    await preview();
    await page.evaluate(()=>{authChanged('SIGNED_OUT',null);document.querySelector('[data-action="confirm"]').click();});
    assert.equal(await page.locator('[data-action="confirm"]').isVisible(),false);
    assert.equal(await page.locator('textarea').inputValue(),'');
    assert.equal(await page.locator('select').inputValue(),'default');
    await context.close();
  } finally {await browser.close();}
});
