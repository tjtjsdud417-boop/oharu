const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {prepareIntegration}=require('./prepare-integration.cjs');
const input={hostBundleIdentifier:'com.oharu.today',approvedAppGroupIdentifier:'group.example.oharu',version:'1.0.0',buildNumber:'10'};
test('preparation rejects unresolved group, unrelated host and invalid versions',()=>{
 for(const bad of [{approvedAppGroupIdentifier:'__APP_GROUP_ID__'},{approvedAppGroupIdentifier:'group../x'},{hostBundleIdentifier:'com.other.app'},{version:'$(INJECT)'},{buildNumber:'x'}])assert.throws(()=>prepareIntegration({...input,...bad}));
});
test('host and extension compile separate sources and share precise group metadata',()=>{
 const p=prepareIntegration(input);assert.equal(p.status,'prepared-not-applied');assert.deepEqual(p.host.entitlements,p.extension.entitlements);assert.deepEqual(p.host.infoPlist,p.extension.infoPlist);
 assert(!p.host.sourceFiles.some(f=>f.includes('UpcomingWidget')));assert(!p.extension.sourceFiles.some(f=>f.includes('Module')));
 for(const f of [...p.host.sourceFiles,...p.extension.sourceFiles])assert(fs.existsSync(path.join(__dirname,f)));
 assert.equal(p.extension.buildSettings.APPLICATION_EXTENSION_API_ONLY,'YES');assert.equal(p.extension.buildSettings.CURRENT_PROJECT_VERSION,'10');assert.equal(p.embed.destination,'PlugIns');
});
test('preparing plan never mutates release config or shared draft',()=>{
 const files=['integration.json','../app.json','../eas.json'];const before=files.map(f=>fs.readFileSync(path.join(__dirname,f),'utf8'));
 const p=prepareIntegration(input);p.host.entitlements['com.apple.security.application-groups'].push('group.other.test');p.host.sourceFiles.length=0;
 const again=prepareIntegration(input);assert.equal(again.extension.entitlements['com.apple.security.application-groups'].length,1);assert.equal(again.host.sourceFiles.length,2);
 assert.deepEqual(files.map(f=>fs.readFileSync(path.join(__dirname,f),'utf8')),before);
});
test('template retains unresolved placeholders and WidgetKit extension identity',()=>{
 const plist=fs.readFileSync(path.join(__dirname,'extension/Info.plist'),'utf8');assert(plist.includes('__APP_GROUP_ID__'));assert(plist.includes('com.apple.widgetkit-extension'));
 assert.equal(require('./integration.json').enabled,false);
});
