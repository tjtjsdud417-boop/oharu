const {test}=require('node:test');
const assert=require('node:assert/strict');
const p=require('./protocol.cjs');
const state=()=>({owner:'u1',todoId:'t1',subscriptionId:'s1',revision:1,dueAt:1000,enabled:true,done:false,deleted:false});
test('exact provider allowlist blocks SSRF, credentials and malformed subscription keys',()=>{
 const s={endpoint:'https://push.example.test/send/abc',keys:{p256dh:'a'.repeat(87),auth:'b'.repeat(22)}};
 assert.equal(p.subscription(s,['push.example.test']).endpoint,s.endpoint);
 for(const endpoint of ['http://push.example.test/a','https://push.example.test.attacker.test/a','https://127.0.0.1/a','https://user:pass@push.example.test/a','https://push.example.test:444/a']) assert.throws(()=>p.subscription({...s,endpoint},['push.example.test']));
 assert.throws(()=>p.subscription(s,[]));
});
test('owner, revision, completion, deletion, opt-out and expiry invalidate pending job',()=>{
 const s=state();assert.equal(p.eligible(s,s,1000),true);
 for(const change of [{owner:'u2'},{revision:2},{done:true},{deleted:true},{enabled:false},{dueAt:2000}]) assert.equal(p.eligible(s,{...s,...change},1000),false);
 assert.equal(p.eligible(s,s,301000),false);
});
test('durable claim contract prevents duplicate concurrent dispatch; recheck cancels edit',async()=>{
 let claimed=false,sent=0;const s=state();
 const ports={claimCurrent:async()=>{if(claimed)return null;claimed=true;return {deliveryId:'d1'}},current:async()=>s,send:async(lease,payload)=>{sent++;assert.deepEqual(payload,{v:1,deliveryId:'d1'});return 201},finish:async()=>{}};
 assert.deepEqual((await Promise.all([p.dispatch(s,ports,1000),p.dispatch(s,ports,1000)])).sort(),['accepted','stale-or-claimed']);assert.equal(sent,1);
 claimed=false;ports.current=async()=>({...s,revision:2});assert.equal(await p.dispatch(s,ports,1000),'stale');assert.equal(sent,1);
});
test('invalid subscriptions expire; denial remains configuration failure; provider errors retry',()=>{
 assert.equal(p.providerResult(410),'expire-subscription');assert.equal(p.providerResult(404),'expire-subscription');
 for(const code of [401,403])assert.equal(p.providerResult(code),'configuration-error');
 for(const code of [429,500,503])assert.equal(p.providerResult(code),'retry-with-backoff');
});
test('display revalidates server state, stays private and deduplicates durable delivery ID',async()=>{
 let seen=false,shows=0;const s=state();const ports={resolveCurrent:async()=>s,claimDisplay:async()=>{if(seen)return false;seen=true;return true},show:async(title,options)=>{shows++;assert.equal(options.data.path,'/');assert.equal(options.body.includes('t1'),false)}};
 assert.equal(await p.receive({v:1,deliveryId:'d1'},ports,1000),'shown');
 assert.equal(await p.receive({v:1,deliveryId:'d1'},ports,1000),'stale-or-seen');assert.equal(shows,1);
 ports.resolveCurrent=async()=>({...s,deleted:true});assert.equal(await p.receive({v:1,deliveryId:'d2'},ports,1000),'stale-or-seen');
 ports.resolveCurrent=async()=>{throw Error('offline')};assert.equal(await p.receive({v:1,deliveryId:'d3'},ports,1000),'unavailable');
 assert.equal(await p.receive({v:1,deliveryId:'d4',url:'https://evil.test'},ports,1000),'invalid');assert.equal(shows,1);
});
