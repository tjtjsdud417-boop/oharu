const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/playwright/header-reported');
const original=execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'show','64d0fd157e3f9c6822e8d4e2d7d1c01fa150abc5:web/index.html'],{cwd:root,encoding:'utf8'});
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,channel:'chrome'}),results=[];try{
  for(const before of [true,false]){
    const html=(before?original:fs.readFileSync(path.join(root,'web/index.html'),'utf8')).replace(/const SUPABASE_URL = .*?;/,'const SUPABASE_URL = "";').replace(/const SUPABASE_ANON_KEY = .*?;/,'const SUPABASE_ANON_KEY = "";');
    const context=await browser.newContext({viewport:{width:390,height:844}});
    await context.route('**/*',r=>r.request().resourceType()==='document'?r.fulfill({contentType:'text/html',body:html}):r.abort());
    const page=await context.newPage();await page.goto('http://reported-header.invalid/');await page.locator('#mainView').waitFor({state:'visible'});
    await page.locator('#loginTopBtn').evaluate(node=>node.hidden=false);
    const boxes=await page.evaluate(()=>Object.fromEntries(['.head','#dateLine','#headline','.topbtns','#loginTopBtn','#calBtn','#setBtn','.composer'].map(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return [selector,{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}];})));
    const a=boxes['#headline'],b=boxes['.topbtns'],overlap=Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top);
    assert.equal(overlap,before);
    const name=before?'before':'after';results.push({name,overlap,boxes});await page.screenshot({path:path.join(out,name+'-390.png'),fullPage:true});await context.close();
  }
  fs.writeFileSync(path.join(out,'bounds.json'),JSON.stringify({count:2,sourceBaseCommit:'64d0fd157e3f9c6822e8d4e2d7d1c01fa150abc5',syntheticGuest:true,externalNetwork:false,results},null,2));console.log('PASS: full-source 390px overlap reproduces and clears');
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exitCode=1});
