const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {chromium}=require('playwright');
const html=fs.readFileSync(require.resolve('../web/index.html'),'utf8');
const block=html.slice(html.indexOf('// ACCOUNT_DELETION_BEGIN'),html.indexOf('// ACCOUNT_DELETION_END'));
const css=html.slice(html.indexOf('  .account-with-deletion'),html.indexOf('</style>'));
const owner='00000000-0000-4000-8000-000000000001';
const other='00000000-0000-4000-8000-000000000002';
const intent=(ownerID=owner,age=0)=>({ownerID,nonce:'synthetic-nonce-123456789',startedAt:Date.now()-age});
async function fixture(browser,options={}){
  const context=await browser.newContext({viewport:{width:options.width||390,height:700}});
  await context.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><style>:root{--card:white;--text:#191F28;--line:#eee;--text-sub:#556677;--danger:#AF2434;--blue:#205fc1}*{box-sizing:border-box}'+css+'</style><div id="setAccount"></div><button id="deleteAccountBtn">Delete</button>'}));
  const page=await context.newPage();await page.goto('https://oharu.test/'+(options.query||''));
  await page.evaluate(({options,owner})=>{
    window.fixtureOptions=options;window.fixtureOwner=owner;
    localStorage.setItem('oneul.v3','guest-preserve');localStorage.setItem('oharu.theme.v1.'+owner,'owner-theme');localStorage.setItem('oharu.theme.v1.other','other-theme');
    if(options.intent)sessionStorage.setItem('oharu.account-deletion.intent.v1',JSON.stringify(options.intent));
    window.calls={posts:[],signouts:[],clears:0,oauth:[],mfa:[],exchanges:[],claims:[]};
  },{options,owner});
  await page.addScriptTag({content:`
    const LANG=fixtureOptions.lang||'en',IS_DESKTOP=!!fixtureOptions.desktop;
    let currentUserId=fixtureOptions.guest?null:fixtureOptions.owner||fixtureOwner;
    let todos=[{text:'synthetic'}],reminderDataReady=true;
    const SUPABASE_URL='https://backend.invalid',SUPABASE_ANON_KEY='fixture-public-key';
    const $=id=>document.getElementById(id),t=x=>x,switchView=()=>{};
    const user=()=>({id:currentUserId,identities:[{provider:fixtureOptions.provider||'email'}],app_metadata:{providers:[fixtureOptions.provider||'email']}});
    const supabase={auth:{
      getUser:async()=>({data:{user:user()}}),getSession:async()=>({data:{session:currentUserId?{user:user(),access_token:window.newBearer||'synthetic-bearer'}:null}}),
      exchangeCodeForSession:async code=>{calls.exchanges.push(code);if(fixtureOptions.exchangeError||code==='forged')return {data:{session:null,user:null},error:{message:'invalid_grant'}};window.newBearer='synthetic-pkce-bearer';return {data:{session:{user:user(),access_token:window.newBearer},user:user()},error:null};},
      getClaims:async token=>{calls.claims.push(token);if(fixtureOptions.claimsError)return {data:null,error:{message:'invalid signature'}};const claims={iss:SUPABASE_URL+'/auth/v1',sub:currentUserId,aud:'authenticated',role:'authenticated',session_id:'00000000-0000-4000-8000-000000000099',exp:Math.floor(Date.now()/1000)+3600,amr:[{method:'oauth',timestamp:Math.floor(Date.now()/1000)-(fixtureOptions.amrAge||0)}],...(fixtureOptions.claims||{})};if(fixtureOptions.callbackOwnerRace)currentUserId='raced-owner';if(fixtureOptions.callbackSessionRace)window.newBearer='raced-token';return {data:{claims},error:null};},
      signInWithOAuth:async value=>{calls.oauth.push(value);return fixtureOptions.oauthError?{error:{message:'cancelled'}}:{data:{url:'https://accounts.google.invalid'}};},
      signOut:async value=>{calls.signouts.push(value);return {error:null};},
      mfa:{listFactors:async()=>({data:{all:fixtureOptions.factor?[{id:'factor-1',factor_type:'totp',status:'verified'}]:[]}}),challengeAndVerify:async value=>{calls.mfa.push(value);window.newBearer='synthetic-aal2-bearer';return fixtureOptions.otpError?{error:{message:'invalid'}}:{error:null};}}
    }};
    window.OharuReminders={clear:async()=>{calls.clears++;}};
    window.fetch=async(url,request)=>{calls.posts.push({url,body:JSON.parse(request.body),authorization:request.headers.Authorization});if(fixtureOptions.changeDuringPost){currentUserId='other-user';invalidateAccountDeletion(currentUserId);}return {ok:!fixtureOptions.failure,status:fixtureOptions.failure?401:200,json:async()=>fixtureOptions.failure?{code:fixtureOptions.failure}:{deleted:true}};};
    ${block}
    window.accountTest={open:()=>openDeleteAccount('synthetic@example.invalid'),entry:async()=>{await verifyDeletionOAuthReturn();handleDeletionEntry('synthetic@example.invalid');},verify:()=>verifyDeletionOAuthReturn(),change:id=>{currentUserId=id;invalidateAccountDeletion(id);},expire:()=>{if(deletionOAuthProof)deletionOAuthProof.startedAt=Date.now()-180001;},translations:()=>Object.fromEntries(['ko','en','ja','zh','es'].map(l=>[l,l])),state:()=>({busy:deletionBusy,confirmed:deletionConfirmed,owner:currentUserId,deletionEntryRequested,proof:!!deletionOAuthProof})};
  `});
  return {page,context};
}
async function open(page){await page.evaluate(()=>accountTest.open());await page.waitForFunction(()=>document.querySelector('#accountDeleteStatus').textContent!=='Checking your sign-in method.');}
async function submit(page){await page.locator('[name=confirmation]').fill('DELETE');await page.locator('button[type=submit]').click();await page.waitForFunction(()=>!accountTest.state().busy);}
test('web password deletion uses explicit confirmation, exact owner cleanup and preserves guest/other data',async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});try{
    const {page,context}=await fixture(browser);await open(page);
    await page.locator('[name=password]').fill('synthetic-password');await page.locator('button[type=submit]').click();assert.equal(await page.evaluate(()=>calls.posts.length),0);
    await submit(page);const result=await page.evaluate(()=>({calls,guest:localStorage.getItem('oneul.v3'),owner:localStorage.getItem('oharu.theme.v1.'+fixtureOwner),other:localStorage.getItem('oharu.theme.v1.other')}));
    assert.deepEqual(result.calls.posts[0].body,{password:'synthetic-password',confirmation:'DELETE'});assert.equal(result.calls.signouts.length,1);assert.equal(result.calls.clears,1);assert.equal(result.guest,'guest-preserve');assert.equal(result.other,'other-theme');assert.equal(result.owner,null);await context.close();
  }finally{await browser.close();}
});
test('Google starts existing PKCE redirect with chooser and stores only ownerID/nonce/startedAt, never POSTs',async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});try{
    for(const oauthError of [false,true]){
      const {page,context}=await fixture(browser,{provider:'google',oauthError});await open(page);assert.equal(await page.locator('[name=password]').isVisible(),false);
      await page.locator('#deleteGoogleReauth').click();const value=await page.evaluate(()=>({calls,pending:sessionStorage.getItem('oharu.account-deletion.intent.v1')}));
      assert.deepEqual(value.calls.oauth[0],{provider:'google',options:{redirectTo:'https://oharu.test/',queryParams:{prompt:'select_account'}}});assert.equal(value.calls.posts.length,0);assert.equal(value.calls.signouts.length,0);
      if(oauthError)assert.equal(value.pending,null);else assert.deepEqual(Object.keys(JSON.parse(value.pending)).sort(),['nonce','ownerID','startedAt']);await context.close();
    }
  }finally{await browser.close();}
});
test('Google return requires same owner and a separate final DELETE, TOTP sends refreshed bearer only',async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});try{
    const {page,context}=await fixture(browser,{provider:'google',intent:intent(),query:'?code=synthetic',factor:true});await page.evaluate(()=>accountTest.entry());await page.waitForFunction(()=>!document.querySelector('button[type=submit]').hidden);
    assert.equal(await page.evaluate(()=>calls.posts.length),0);assert.equal(await page.evaluate(()=>sessionStorage.getItem('oharu.account-deletion.intent.v1')),null);
    await page.evaluate(()=>Promise.all([accountTest.verify(),accountTest.verify()]));assert.equal(await page.evaluate(()=>calls.exchanges.length),1);
    await page.locator('[name=otp]').fill('123456');await submit(page);const calls=await page.evaluate(()=>window.calls);
    assert.deepEqual(calls.posts[0].body,{reauthentication:'oauth',confirmation:'DELETE'});assert.equal(calls.posts[0].authorization,'Bearer synthetic-aal2-bearer');assert.deepEqual(calls.mfa,[{factorId:'factor-1',code:'123456'}]);await context.close();
  }finally{await browser.close();}
});
test('forged code, exchange failure with existing session and unverified/stale OAuth claims never create UI proof',async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});try{
    const cases=[
      {query:'?code=forged'},
      {exchangeError:true},
      {claimsError:true},
      {amrAge:181},
      {amrAge:60}, // Recent overall, but predates this deletion transaction.
      {claims:{amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)}]}},
      {claims:{iss:'https://another-project.invalid/auth/v1'}},
      {claims:{sub:other}},
      {claims:{aud:'anon'}},
      {claims:{role:'service_role'}},
      {claims:{session_id:''}},
      {claims:{exp:Math.floor(Date.now()/1000)-1}},
      {callbackOwnerRace:true},
      {callbackSessionRace:true}
    ];
    for(const options of cases){
      const {page,context}=await fixture(browser,{provider:'google',intent:intent(),query:'?code=synthetic',...options});
      await page.evaluate(()=>accountTest.entry());
      const result=await page.evaluate(()=>({proof:accountTest.state().proof,calls,pending:sessionStorage.getItem('oharu.account-deletion.intent.v1'),guest:localStorage.getItem('oneul.v3')}));
      assert.equal(result.proof,false,JSON.stringify(options));assert.equal(await page.locator('dialog[open]').count(),0);assert.equal(result.calls.posts.length,0);assert.equal(result.calls.signouts.length,0);assert.equal(result.calls.clears,0);assert.equal(result.pending,null);assert.equal(result.guest,'guest-preserve');assert.equal(result.calls.exchanges.length,1);await context.close();
    }
  }finally{await browser.close();}
});
test('normal sign-in retains SDK automatic callback detection and never enters deletion exchange',async()=>{
  const initializer=html.match(/supabase = (createClient\(SUPABASE_URL, SUPABASE_ANON_KEY, \{ auth: \{[^\n]+\}\s*\}\));/)[1];
  for(const deletionHadIntent of [false,true]){
    let configuration;
    vm.runInNewContext(initializer,{SUPABASE_URL:'https://fixture.invalid',SUPABASE_ANON_KEY:'public-fixture',deletionHadIntent,createClient:(_url,_key,options)=>{configuration=options;}});
    assert.equal(configuration.auth.flowType,'pkce');assert.equal(configuration.auth.detectSessionInUrl,!deletionHadIntent);
  }
  const browser=await chromium.launch({headless:true,channel:'chrome'});try{
    for(const query of ['', '?code=normal-sign-in']){
      const {page,context}=await fixture(browser,{provider:'google',query});await page.evaluate(()=>accountTest.entry());
      const result=await page.evaluate(()=>({calls,state:accountTest.state()}));assert.equal(result.calls.exchanges.length,0);assert.equal(result.calls.claims.length,0);assert.equal(result.calls.signouts.length,0);assert.equal(result.calls.posts.length,0);assert.equal(result.state.proof,false);assert.equal(result.state.deletionEntryRequested,false);await context.close();
    }
  }finally{await browser.close();}
});
test('different owner, cancelled or expired OAuth return cannot delete or sign out',async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});try{
    for(const options of [{intent:intent(),owner:other,query:'?code=x'},{intent:intent(),query:'?error=access_denied'},{intent:intent(owner,180001),query:'?code=x'},{intent:intent(),query:''}]){
      const {page,context}=await fixture(browser,{provider:'google',...options});await page.evaluate(()=>accountTest.entry());assert.equal(await page.locator('dialog[open]').count(),0);
      const result=await page.evaluate(()=>({calls,pending:sessionStorage.getItem('oharu.account-deletion.intent.v1'),guest:localStorage.getItem('oneul.v3'),deletionEntryRequested:accountTest.state().deletionEntryRequested}));assert.equal(result.deletionEntryRequested,true);assert.equal(result.calls.posts.length,0);assert.equal(result.calls.signouts.length,0);assert.equal(result.calls.clears,0);assert.equal(result.pending,null);assert.equal(result.guest,'guest-preserve');await context.close();
    }
  }finally{await browser.close();}
});
test('proof expiry after dialog, failed MFA, backend rejection and owner race leave device data/session',async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});try{
    for(const options of [{expire:true},{factor:true,otpError:true},{failure:'recent_oauth_required'},{changeDuringPost:true}]){
      const {page,context}=await fixture(browser,{provider:'google',intent:intent(),query:'?code=x',...options});await page.evaluate(()=>accountTest.entry());await page.waitForFunction(()=>!document.querySelector('button[type=submit]').hidden);
      if(options.factor)await page.locator('[name=otp]').fill('123456');if(options.expire)await page.evaluate(()=>accountTest.expire());await submit(page);
      const result=await page.evaluate(()=>({calls,owner:localStorage.getItem('oharu.theme.v1.'+fixtureOwner)}));assert.equal(result.calls.signouts.length,0);assert.equal(result.calls.clears,0);assert.equal(result.owner,'owner-theme');if(options.expire||options.otpError)assert.equal(result.calls.posts.length,0);await context.close();
    }
  }finally{await browser.close();}
});
test('five-language dialog fits narrow screens; guest entry and desktop Google route stay non-destructive',async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});try{
    for(const lang of ['ko','en','ja','zh','es']){
      const {page,context}=await fixture(browser,{provider:'google',lang,width:320});await open(page);
      const size=await page.locator('dialog').evaluate(el=>({width:el.getBoundingClientRect().width,scroll:el.scrollWidth,client:el.clientWidth,title:el.querySelector('h2').textContent}));assert.ok(size.width<=320);assert.ok(size.scroll<=size.client+1);assert.ok(size.title.length>0);await context.close();
    }
    const guest=await fixture(browser,{guest:true,query:'?account=delete'});await guest.page.evaluate(()=>accountTest.entry());assert.equal(await guest.page.locator('dialog').count(),0);assert.match(await guest.page.locator('#setAccount').innerText(),/Sign in first/);await guest.context.close();
    const desktop=await fixture(browser,{provider:'google',desktop:true});await open(desktop.page);assert.equal(await desktop.page.locator('a.account-delete-web').getAttribute('href'),'https://oharu.today/?account=delete');assert.equal(await desktop.page.locator('#deleteGoogleReauth').isVisible(),false);await desktop.context.close();
  }finally{await browser.close();}
});
test('integration keeps IME guard, original guest storage key and guards only deletion-specific migration',()=>{
  assert.match(html,/if \(deletionEntryRequested\) return Promise\.resolve\(\)/);assert.match(html,/localStorage\.getItem\("oneul\.v3"\)/);assert.match(html,/!e\.isComposing/);
  assert.match(html,/if \(deletionCleanupActive && _e === "SIGNED_OUT"\) return/);assert.match(html,/invalidateAccountDeletion\(sess\?\.user\?\.id \|\| null\)/);
  assert.match(html,/detectSessionInUrl: !deletionHadIntent/);assert.match(html,/await verifyDeletionOAuthReturn\(\);\s*window\.OharuThemes/);
  assert.equal(block.includes('IS_IOS_APP'),false);assert.equal(block.includes('last_sign_in_at'),false);assert.equal(block.includes('atob('),false);assert.equal(block.includes('localStorage.clear'),false);
});
test('auth account boundary clears old tasks immediately before any deferred reload',()=>{
  const authBody=html.match(/supabase\.auth\.onAuthStateChange\(\(_e, sess\) => \{([\s\S]*?)\n  \}\);/)[1];
  for(const event of ['SIGNED_IN','SIGNED_OUT']){
    const view={hidden:false},callbacks=[];
    const context=vm.createContext({currentUserId:owner,todos:[{text:'owner A task'}],reminderDataReady:true,deletionCleanupActive:false,invalidateAccountDeletion:()=>{},$:()=>view,window:{OharuReminders:{clear:()=>{}}},setTimeout:fn=>callbacks.push(fn),location:{reload:()=>{}},sess:event==='SIGNED_IN'?{user:{id:other}}:null,event});
    vm.runInContext(`(function(_e,sess){${authBody}})(event,sess)`,context);
    assert.equal(context.currentUserId,null);assert.equal(context.todos.length,0);assert.equal(context.reminderDataReady,false);assert.equal(view.hidden,true);assert.equal(callbacks.length,1);
  }
});
test('old account async load cannot restore todos after owner changes',async()=>{
  const start=html.indexOf('async function startApp('),end=html.indexOf('\nif (!CLOUD)',start);
  const source=html.slice(start,end);let finishLoad;const renderCalls=[];
  const context=vm.createContext({appStarted:false,guestMode:false,repo:null,currentUserId:null,deletionConfirmed:false,todos:[],reminderDataReady:false,$:()=>({}),renderAccount:()=>{},handleDeletionEntry:()=>{},renderMcp:()=>{},t:x=>x,backfillTodaySortOrder:async()=>{},render:()=>renderCalls.push('render'),rememberLoadedState:()=>{},setInterval:()=>{},fakeRepo:{rollover:async()=>{},load:()=>new Promise(resolve=>finishLoad=resolve)}});
  vm.runInContext(source,context);const boot=vm.runInContext(`startApp(fakeRepo,{canLogout:true,userId:'${owner}'})`,context);
  await new Promise(resolve=>setImmediate(resolve));context.currentUserId=null;finishLoad([{text:'old-owner-private'}]);await boot;
  assert.equal(context.todos.length,0);assert.equal(renderCalls.length,0);
});
