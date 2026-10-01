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
test('exactly ten distinct button palettes keep every brand surface and pass contrast',()=>{
  assert.equal(api.themes.length,10); assert.equal(new Set(api.themes.map(t=>t.tokens.accent)).size,10);
  for(const theme of api.themes)assert.deepEqual(Object.fromEntries(['bg','card','soft','line','dangerSoft'].map(k=>[k,theme.tokens[k]])),{bg:'#F2F4F6',card:'#FFFFFF',soft:'#E8F3FF',line:'#F2F4F6',dangerSoft:'#FEECEE'});
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
test('editing exported JSON data cannot mutate the default or selected palette',()=>{const before=sample(),exported=api.exportTheme();exported.tokens.bg='#000000';exported.tokens.accent='#FFFFFF';assert.deepEqual(api.exportTheme(),before);});
test('requires every token and rejects extra nested data',()=>{const t=sample();delete t.tokens.line;assert.throws(()=>api.validate(t));t.tokens.line='#FFFFFF';t.tokens.layout={width:0};assert.throws(()=>api.validate(t));});
function browser(seed={}) {
  const data=new Map(Object.entries(seed)), styles=new Map(), listeners={};
  const window={localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},document:{readyState:'loading',documentElement:{dataset:{},style:{setProperty:(k,v)=>styles.set(k,v),removeProperty:k=>styles.delete(k)}},addEventListener:()=>{}},addEventListener:(k,v)=>listeners[k]=v,setTimeout:fn=>fn()};
  vm.runInNewContext(fs.readFileSync(require.resolve('../web/theme-system.js'),'utf8'),{window}); return {api:window.OharuThemes,window,data,styles,listeners};
}
test('local persistence, corrupt storage recovery and default CSS restoration',async()=>{
  const b=browser({'oharu.theme.v1.guest':'{bad'});assert.equal(b.styles.size,0);
  await b.api.save({id:'forest'});assert.equal(b.styles.get('--blue'),'#286440');assert.equal(b.styles.has('--bg'),false);assert.equal(b.styles.has('--card'),false);
  const reload=browser(Object.fromEntries(b.data));assert.equal(reload.styles.get('--blue'),'#286440');
  await b.api.save({id:'default'});assert.equal(b.styles.size,0);assert.equal(b.window.document.documentElement.dataset.oharuTheme,undefined);
});
test('storage denial does not prevent application',async()=>{const b=browser();b.window.localStorage.setItem=()=>{throw Error('denied')};await assert.doesNotReject(b.api.save({id:'mint'}));assert.equal(b.styles.get('--blue'),'#176C57');});
test('account metadata sync isolates users and signout restores guest',async()=>{
  const b=browser(); await b.api.save({id:'rose'});let authListener;const writes=[];
  const client={auth:{onAuthStateChange:fn=>authListener=fn,getUser:async()=>({data:{user:{id:'account-a',user_metadata:{oharu_theme_v1:{id:'ocean'}}}}}),updateUser:async x=>{writes.push(x);return {error:null}}}};
  b.api.connect(client); await new Promise(r=>setImmediate(r));assert.equal(b.styles.get('--blue'),'#126782');
  await b.api.save({id:'mint'});assert.equal(writes[0].data.oharu_theme_v1.id,'mint');
  authListener('SIGNED_OUT',null);assert.equal(b.styles.get('--blue'),'#994460');assert.ok(b.data.has('oharu.theme.v1.account-a'));
});
test('failed cloud write retains local choice and reports no rejection',async()=>{
  const b=browser();b.api.connect({auth:{onAuthStateChange:()=>{},getUser:async()=>({data:{user:{id:'u',user_metadata:{}}}}),updateUser:async()=>({error:Error('offline')})}});await new Promise(r=>setImmediate(r));await assert.doesNotReject(b.api.save({id:'sand'}));assert.equal(JSON.parse(b.data.get('oharu.theme.v1.u')).id,'sand');
});
test('legacy colored surfaces normalize before preview/export without mutating input or unrelated data',()=>{
 const legacy=sample();legacy.name='기존 사용자 테마';Object.assign(legacy.tokens,{bg:'#E9F0E8',card:'#F9FCF7',soft:'#DCECDD',line:'#E9F0E8',text:'#203B2C',muted:'#4D6556',accent:'#286440'});const original=JSON.stringify(legacy);
 const theme=api.validate(legacy);assert.equal(JSON.stringify(legacy),original);assert.equal(theme.name,legacy.name);assert.equal(theme.tokens.text,legacy.tokens.text);assert.equal(theme.tokens.accent,legacy.tokens.accent);
 for(const k of ['bg','card','soft','line','dangerSoft'])assert.equal(theme.tokens[k],sample().tokens[k]);
 const raw=JSON.stringify({id:'custom',theme:legacy}),todo='{"syntheticTask":"preserve exact bytes"}';const b=browser({'oharu.theme.v1.guest':raw,'oneul.v3':todo});assert.equal(b.api.exportTheme().name,legacy.name);assert.equal(b.styles.get('--blue'),'#286440');assert.equal(b.data.get('oharu.theme.v1.guest'),raw);assert.equal(b.data.get('oneul.v3'),todo);
 assert.equal(b.styles.has('--bg'),false);assert.equal(b.styles.has('--card'),false);assert.equal(b.styles.has('--blue-soft'),false);assert.equal(b.styles.has('--line'),false);assert.equal(b.styles.has('--danger-soft'),false);
 const schema=JSON.parse(fs.readFileSync(require.resolve('../web/theme-schema.json'),'utf8'));for(const k of ['bg','card','soft','line','dangerSoft']){assert.equal(schema.properties.tokens.properties[k].readOnly,true);assert.equal(schema.properties.tokens.properties[k].default,theme.tokens[k]);}
 assert.match(api.prompt,/bg=#F2F4F6, card=#FFFFFF/);assert.deepEqual(api.validate(JSON.stringify(theme)),theme);
});
test('readable legacy dark themes keep their identity and recover only incompatible foregrounds on restore',()=>{
 const dark=sample();dark.name='기존 어두운 테마';Object.assign(dark.tokens,{bg:'#000000',card:'#000000',soft:'#000000',line:'#000000',dangerSoft:'#000000',text:'#FFFFFF',muted:'#BBBBBB',accent:'#757575',danger:'#F04452'});const value={id:'custom',theme:dark},before=JSON.stringify(value);
 const normalized=api.normalize(value);assert.deepEqual(api.validate(JSON.stringify(dark)),normalized.theme);assert.equal(normalized.id,'custom');assert.equal(normalized.theme.name,dark.name);assert.equal(JSON.stringify(value),before);assert.deepEqual(normalized.theme.tokens,sample().tokens);
 const raw=JSON.stringify(value),b=browser({'oharu.theme.v1.guest':raw});assert.equal(b.api.exportTheme().name,dark.name);assert.equal(b.data.get('oharu.theme.v1.guest'),raw);assert.equal(b.window.document.documentElement.dataset.oharuTheme,'custom');
 const illegible=JSON.parse(before);illegible.theme.tokens.text='#000000';assert.throws(()=>api.normalize(illegible));
});
test('restoring legacy account metadata does not upload a migration or alter other metadata/tasks',async()=>{
 const legacy=sample();legacy.tokens.bg='#E9F0E8';legacy.tokens.card='#F9FCF7';legacy.name='Saved custom';const user={id:'owner',user_metadata:{oharu_theme_v1:{id:'custom',theme:legacy},other_setting:'keep'}};const before=JSON.stringify(user),writes=[];const b=browser({'oneul.v3':'unchanged fixture'});
 b.api.connect({auth:{onAuthStateChange(){},getUser:async()=>({data:{user}}),updateUser:async x=>{writes.push(x);return {error:null}}}});await new Promise(r=>setImmediate(r));assert.equal(b.api.exportTheme().name,'Saved custom');assert.deepEqual(writes,[]);assert.equal(JSON.stringify(user),before);assert.equal(b.data.get('oneul.v3'),'unchanged fixture');
});
