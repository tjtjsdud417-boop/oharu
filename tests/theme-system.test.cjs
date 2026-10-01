const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const api=require('../web/theme-system.js');
const sample=()=>JSON.parse(JSON.stringify(api.exportTheme()));
test('published schema fields and runtime validator allow exactly the same ThemeV1 tokens',()=>{
  const schema=JSON.parse(fs.readFileSync(require.resolve('../web/theme-schema.json'),'utf8'));
  const draft=sample();
  assert.equal(schema.additionalProperties,false);
  assert.equal(schema.properties.tokens.additionalProperties,false);
  assert.deepEqual(schema.required.slice().sort(),Object.keys(draft).sort());
  assert.deepEqual(Object.keys(schema.properties).sort(),Object.keys(draft).concat('visual').sort());
  assert.deepEqual(schema.properties.tokens.required.slice().sort(),Object.keys(draft.tokens).sort());
  assert.deepEqual(Object.keys(schema.properties.tokens.properties).sort(),Object.keys(draft.tokens).sort());
  assert.equal(schema.properties.version.const,1);
  const colorPattern=new RegExp(schema.$defs.color.pattern);
  for(const theme of api.themes) for(const color of Object.values(theme.tokens)) assert.match(color,colorPattern);
  for(const invalid of ['#fff','url(x)','#GGFFFF','#12345678','red']) assert.equal(colorPattern.test(invalid),false);
  const namePattern=new RegExp(schema.properties.name.pattern);
  assert.equal(namePattern.test('나의 숲 🌿'),true);
  for(const invalid of ['','<b>','a\u0000b','a\nb']) assert.equal(namePattern.test(invalid),false);
  for(const extra of ['css','image','script','url']) { const value=sample();value[extra]='bad';assert.throws(()=>api.validate(value)); }
});
test('declarative visual data rejects unapproved assets, URLs, executable fields and motion',()=>{
  const value=sample();value.visual={scene:'none',pattern:'none',pet:'none',motion:'off'};
  assert.deepEqual(api.validate(value).visual,value.visual);
  for(const [key,bad] of [['scene','https://evil.test/a.svg'],['scene','cloud-post'],['pattern','url(x)'],['pet','cat'],['motion','gentle']]){const candidate=JSON.parse(JSON.stringify(value));candidate.visual[key]=bad;assert.throws(()=>api.validate(candidate));}
  const extra=JSON.parse(JSON.stringify(value));extra.visual.script='alert(1)';assert.throws(()=>api.validate(extra));
});
test('exactly ten distinct built-ins pass all foreground/background contrast pairs',()=>{
  assert.equal(api.themes.length,10); assert.equal(new Set(api.themes.map(t=>t.tokens.bg)).size,10);
  for(const t of api.themes) assert.doesNotThrow(()=>api.validate({version:1,name:t.name,tokens:t.tokens}));
});
test('contrast uses WCAG relative luminance',()=>{assert.equal(api.contrast('#000000','#FFFFFF'),21);assert.equal(api.contrast('#FFFFFF','#FFFFFF'),1);});
test('actionable boundaries and focus/selected indicators clear 3:1 on both surfaces',()=>{
  for(const theme of api.themes.filter(t=>t.id!=='default')) {
    for(const surface of ['bg','card']) for(const indicator of ['muted','accent','text']) {
      assert.ok(api.contrast(theme.tokens[indicator],theme.tokens[surface])>=3,`${theme.id}: ${indicator} on ${surface}`);
    }
    assert.ok(api.contrast('#FFFFFF',theme.tokens.muted)>=3,`${theme.id}: toggle thumb`);
  }
  const css=fs.readFileSync(require.resolve('../web/theme-system.css'),'utf8');
  assert.match(css,/html\[data-oharu-theme\] \.check,/);
  assert.match(css,/\.oharu-theme-settings a \{ border-color: var\(--text-sub\); \}/);
  assert.match(css,/html\[data-oharu-theme\] \.item\.done \.check,/);
  assert.match(css,/\.tog input:focus-visible \+ i \{ outline: 3px solid var\(--text\)/);
});
test('import rejects executable colors and extra fields',()=>{
  for(const payload of ['url(https://evil.test/a)','red;display:none','expression(alert(1))','#fff','<script>']) { const t=sample(); t.tokens.bg=payload; assert.throws(()=>api.validate(t)); }
  for(const key of ['css','script','image','url','__proto__']) { const t=sample(); Object.defineProperty(t,key,{value:'evil',enumerable:true}); assert.throws(()=>api.validate(t)); }
});
test('reject invalid shape, future schema, oversize and illegible themes without applying',()=>{
  for(const value of [null,[],{},'{',' '.repeat(8193)]) assert.throws(()=>api.validate(value));
  const t=sample();t.version=2;assert.throws(()=>api.validate(t));t.version=1;t.tokens.text=t.tokens.card;assert.throws(()=>api.validate(t));
  const before=api.exportTheme();assert.throws(()=>api.apply({id:'custom',theme:t}));assert.deepEqual(api.exportTheme(),before);
});
test('export/import round trip strips no tokens and supports Unicode names',()=>{const t=sample();t.name='나의 숲 🌿';assert.deepEqual(api.validate(JSON.stringify(t)),t);});
test('requires every token and rejects extra nested data',()=>{const t=sample();delete t.tokens.line;assert.throws(()=>api.validate(t));t.tokens.line='#FFFFFF';t.tokens.layout={width:0};assert.throws(()=>api.validate(t));});
function browser(seed={}) {
  const data=new Map(Object.entries(seed)), styles=new Map(), listeners={};
  const window={localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},document:{readyState:'loading',documentElement:{dataset:{},style:{setProperty:(k,v)=>styles.set(k,v),removeProperty:k=>styles.delete(k)}},addEventListener:()=>{}},addEventListener:(k,v)=>listeners[k]=v,setTimeout:fn=>fn()};
  vm.runInNewContext(fs.readFileSync(require.resolve('../web/theme-system.js'),'utf8'),{window}); return {api:window.OharuThemes,window,data,styles,listeners};
}
test('local persistence, corrupt storage recovery and default CSS restoration',async()=>{
  const b=browser({'oharu.theme.v1.guest':'{bad'});assert.equal(b.styles.size,0);
  await b.api.save({id:'forest'});assert.equal(b.styles.get('--bg'),'#E9F0E8');
  const reload=browser(Object.fromEntries(b.data));assert.equal(reload.styles.get('--bg'),'#E9F0E8');
  await b.api.save({id:'default'});assert.equal(b.styles.size,0);assert.equal(b.window.document.documentElement.dataset.oharuTheme,undefined);
});
test('storage denial does not prevent application',async()=>{const b=browser();b.window.localStorage.setItem=()=>{throw Error('denied')};await assert.doesNotReject(b.api.save({id:'mint'}));assert.equal(b.styles.get('--bg'),'#E4F3EE');});
test('account metadata sync isolates users and signout restores guest',async()=>{
  const b=browser(); await b.api.save({id:'rose'});let authListener;const writes=[];
  const client={auth:{onAuthStateChange:fn=>authListener=fn,getUser:async()=>({data:{user:{id:'account-a',user_metadata:{oharu_theme_v1:{id:'ocean'}}}}}),updateUser:async x=>{writes.push(x);return {error:null}}}};
  b.api.connect(client); await new Promise(r=>setImmediate(r));assert.equal(b.styles.get('--bg'),'#E5F0F5');
  await b.api.save({id:'mint'});assert.equal(writes[0].data.oharu_theme_v1.id,'mint');
  authListener('SIGNED_OUT',null);assert.equal(b.styles.get('--bg'),'#F7E9ED');assert.ok(b.data.has('oharu.theme.v1.account-a'));
});
test('failed cloud write retains local choice and reports no rejection',async()=>{
  const b=browser();b.api.connect({auth:{onAuthStateChange:()=>{},getUser:async()=>({data:{user:{id:'u',user_metadata:{}}}}),updateUser:async()=>({error:Error('offline')})}});await new Promise(r=>setImmediate(r));await assert.doesNotReject(b.api.save({id:'sand'}));assert.equal(JSON.parse(b.data.get('oharu.theme.v1.u')).id,'sand');
});
