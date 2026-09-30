const { test } = require("node:test");
const assert = require("node:assert/strict");
const { ReminderQueue, normalizeReminders, GRACE_MS } = require("../reminders");
const { isAllowedExternalUrl, isTrustedAppUrl, externalUrlForAppLink } = require("../security");
const at = Date.parse("2026-09-30T10:00:00Z");
const item = (extra = {}) => ({ id: "todo1", title: "할 일", dueAt: new Date(at).toISOString(), ...extra });
function setup() { let time=at-1000; const calls=[]; const q=new ReminderQueue({notify:x=>calls.push(x),now:()=>time}); return {q,calls,clock:t=>time=t}; }
test("fires at due time once across repeated snapshots",()=>{const {q,calls,clock}=setup();q.sync([item()]);assert.equal(calls.length,0);clock(at);q.tick();q.sync([item()]);q.tick();assert.equal(calls.length,1);});
test("deleting or completing cancels pending reminder",()=>{for(const snapshot of [[],[item({done:true})]]) {const {q,calls,clock}=setup();q.sync([item()]);q.sync(snapshot);clock(at);q.tick();assert.equal(calls.length,0);}});
test("reschedule replaces old time and uses latest title",()=>{const {q,calls,clock}=setup();q.sync([item()]);q.sync([item({title:'수정',dueAt:new Date(at+60000).toISOString()})]);clock(at);q.tick();assert.equal(calls.length,0);clock(at+60000);q.tick();assert.equal(calls[0].title,'수정');});
test("resume recovers recent due time but skips stale reminders",()=>{for(const [delay,count] of [[GRACE_MS,1],[GRACE_MS+1,0]]) {const {q,calls,clock}=setup();q.sync([item()]);clock(at+delay);q.tick();assert.equal(calls.length,count);}});
test("offsets normalize to the same instant",()=>assert.equal(normalizeReminders([item({dueAt:'2026-09-30T19:00:00+09:00'})]).get('todo1').due,at));
test("timezone-less or invalid date is rejected",()=>{for(const dueAt of ['2026-09-30T10:00:00','invalidZ']) assert.throws(()=>normalizeReminders([item({dueAt})]));});
test("rejects oversized and duplicate snapshots without replacing valid state",()=>{const {q}=setup();q.sync([item()]);assert.throws(()=>q.sync(Array(501).fill(item())));assert.throws(()=>q.sync([item(),item()]));assert.equal(q.items.size,1);});
test("delivered ledger suppresses duplicate after restart",()=>{const q=new ReminderQueue({now:()=>at,notify:()=>assert.fail('duplicate'),delivered:[`todo1:${at}`]});q.sync([item()]);});
test("auth links reject hostname prefix spoofing, credentials and insecure URLs",()=>{assert.equal(isAllowedExternalUrl('https://accounts.google.com/o/oauth2'),true);for(const url of ['https://accounts.google.com.evil.test','https://accounts.google.com@evil.test','http://accounts.google.com','javascript:alert(1)']) assert.equal(isAllowedExternalUrl(url),false);});
test("desktop bridge trusts app origin and exact fallback only",()=>{const fallback='C:\\app\\web\\index.html';assert.equal(isTrustedAppUrl('https://oharu.today/?desktop=1',fallback),true);assert.equal(isTrustedAppUrl('https://oharu.today.evil.test',fallback),false);assert.equal(isTrustedAppUrl('file:///C:/other/index.html',fallback),false);});
test("AI theme onboarding, privacy, contact and repository downloads are allowed",()=>{
  for(const url of ['https://chatgpt.com/','https://claude.ai/new','https://oharu.today/privacy','https://oharu.today','mailto:ceo@moodweb.co.kr','https://github.com/tjtjsdud417-boop/oharu/releases/latest/download/Oharu-Setup.exe','https://tcaghsjndfaxlsgaqrdi.supabase.co/auth/v1/authorize?provider=google']) assert.equal(isAllowedExternalUrl(url),true,url);
});
test("external link spoofing, foreign projects/repos, credentials, ports and extra mail recipients fail",()=>{
  for(const url of ['https://chatgpt.com.evil.test/','https://claude.ai@evil.test/','https://user:password@chatgpt.com/','https://chatgpt.com:8443/','http://claude.ai/','https://other.supabase.co/auth/v1/authorize','https://github.com/tjtjsdud417-boop/oharu-evil/','https://github.com/evil/oharu','https://github.com/tjtjsdud417-boop/oharu/%2F..%2Fevil','mailto:ceo@moodweb.co.kr,evil@example.com','mailto:ceo@moodweb.co.kr?bcc=evil@example.com','file:///C:/Windows/System32/cmd.exe']) assert.equal(isAllowedExternalUrl(url),false,url);
});
test("offline privacy mapping is exact and only available from the bundled document",()=>{
  const {pathToFileURL}=require('url');const fallback=require('path').resolve('web/index.html');const base=pathToFileURL(fallback).href;
  assert.equal(externalUrlForAppLink(new URL('/privacy',base).href,fallback,base+'?desktop=1'),'https://oharu.today/privacy');
  assert.equal(externalUrlForAppLink(new URL('/privacy',base).href,fallback,'https://evil.test'),null);
  assert.equal(externalUrlForAppLink(new URL('/secret.txt',base).href,fallback,base),null);
});
