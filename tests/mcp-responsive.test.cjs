const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'web/index.html'),'utf8');
const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
const start=html.indexOf('async function renderMcp('),end=html.indexOf('const clock = $("clock")',start);
assert(start>=0&&end>start,'renderMcp boundaries exist');
const code=html.slice(start,end);
test('signed-in English MCP token controls wrap within a 320px settings screen without issuing tokens',async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'}),out=path.join(root,'output/playwright/mcp-responsive'),results=[];fs.mkdirSync(out,{recursive:true});
  try{const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><style>${css}</style><div class="app"><div class="set-card" id="setMcp"><div class="set-title" id="setMcpTitle">AI connection</div><div id="mcpRows"></div></div></div>`}));
    for(const width of [320])for(const scale of [1]){
      await page.setViewportSize({width,height:700});await page.goto('http://mcp-settings.invalid/');
      await page.addScriptTag({content:`const $=id=>document.getElementById(id),supabase={},t=k=>({mcpTitle:'AI connection',mcpDesc:'Connect Oharu to a compatible AI client.',mcpOptOther:'Compatible MCP client',mcpCreateBtn:'Issue token',mcpNamePh:'MCP client'})[k]||k;let currentUserId='synthetic-user';const mcpLoadTokens=async()=>[],mcpGenToken=()=>{throw Error('token generation is forbidden in this layout check')};${code};renderMcp(true);`});
      assert.deepEqual(errors,[],'fixture must initialize without errors');
      await page.locator('#mcpRows select').waitFor({timeout:3000});
      await page.evaluate(scale=>{const nodes=[...document.querySelectorAll('#mcpRows select,#mcpRows button')],sizes=nodes.map(node=>parseFloat(getComputedStyle(node).fontSize));nodes.forEach((node,i)=>node.style.fontSize=sizes[i]*scale+'px');},scale);
      const bounds=await page.evaluate(()=>{const box=node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}};const select=document.querySelector('#mcpRows select'),button=document.querySelector('#mcpRows button');return {select:box(select),button:box(button),buttonClipped:button.scrollHeight>button.clientHeight+1,overflow:document.documentElement.scrollWidth>innerWidth};});
      assert(bounds.select.left>=0&&bounds.select.right<=width+.5);assert(bounds.button.left>=0&&bounds.button.right<=width+.5);assert.equal(bounds.overflow,false);assert.equal(bounds.buttonClipped,false);assert(!(Math.min(bounds.select.right,bounds.button.right)>Math.max(bounds.select.left,bounds.button.left)&&Math.min(bounds.select.bottom,bounds.button.bottom)>Math.max(bounds.select.top,bounds.button.top)));
      results.push({width,scale,...bounds});if(width===320&&scale===1)await page.screenshot({path:path.join(out,'signedin-en-320.png'),fullPage:true});
    }
  }finally{fs.writeFileSync(path.join(out,'bounds.json'),JSON.stringify({count:results.length,results},null,2));await browser.close();}
});
