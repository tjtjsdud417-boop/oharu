const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {validateIdentity,renderManifest,preflight}=require('./prepare.cjs');
// Synthetic in-memory test data only. Never written as a real package identity.
const identity=()=>({source:'partner-center-product-identity',confirmedFromPartnerCenter:true,
  name:'UnitOnly.Oharu',publisher:'CN=8da6cc10-8832-4124-8419-09997c1455fd',publisherDisplayName:'Unit & Only',displayName:'Oharu',version:'1.8.0.0',maxVersionTested:'10.0.26200.0',runtimeChecks:{}});
test('missing, blank and unconfirmed identity never produces a manifest',()=>{
  for(const input of [null,{},JSON.parse(fs.readFileSync(path.join(__dirname,'identity.example.json'),'utf8')),{...identity(),confirmedFromPartnerCenter:false}]) assert.throws(()=>renderManifest(input));
});
test('placeholder or malformed identity is rejected instead of defaulted',()=>{
  for(const change of [{name:'__STORE_NAME__'},{publisher:'CN=your publisher'},{name:'../../Oharu'},{publisher:'fake'},{publisherDisplayName:'   '},{displayName:'<injected/>'}]) assert.ok(validateIdentity({...identity(),...change}).length);
});
test('version and tested OS build bounds are enforced',()=>{
  for(const version of ['0.8.0.0','1.8.0.1','1.8.0','1.65536.0.0','1.8.x.0']) assert.ok(validateIdentity({...identity(),version}).length);
  for(const maxVersionTested of ['10.0.10240.0','10.0.999999.0','unknown']) assert.ok(validateIdentity({...identity(),maxVersionTested}).length);
});
test('manifest XML escapes explicit identities and leaves no template markers',()=>{
  const out=renderManifest(identity());assert.match(out,/Unit &amp; Only/);assert.doesNotMatch(out,/\{\{/);
  assert.match(out,/ProcessorArchitecture="x64"/);assert.match(out,/packagedClassicApp/);
});
test('preflight stays blocked without SDK, assets and packaged runtime verification',()=>{
  const report=preflight(identity(),{makeAppx:null,assetDir:path.join(__dirname,'missing-assets'),payload:path.join(__dirname,'missing-payload')});
  assert.equal(report.status,'blocked');assert.equal(report.identityVerifiedByTool,false);
  assert.ok(report.blockers.some(x=>x.includes('MakeAppx')));assert.ok(report.blockers.some(x=>x.includes('packagedIdentityAndNotifications')));
  assert.equal(report.signing,'not-performed');assert.equal(report.publishing,'not-performed');
});
test('verified Windows icon source is reused byte-for-byte',()=>{
  assert.ok(fs.readFileSync(path.join(__dirname,'Assets/source-icon.ico')).equals(fs.readFileSync(path.join(__dirname,'../build/icon.ico'))));
});
