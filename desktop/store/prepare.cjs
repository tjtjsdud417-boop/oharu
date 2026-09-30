// Read-only by default. Emits ONLY a review manifest when --emit-review is explicit.
// Never installs, signs, self-signs, registers an identity or publishes a package.
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const REQUIRED_ASSETS = { 'StoreLogo.png':50, 'Square44x44Logo.png':44, 'Square150x150Logo.png':150 };
const RUNTIME_CHECKS = ['packagedIdentityAndNotifications','startupAndProtocolActivation','existingUserDataPreserved','installUpgradeUninstall'];
const placeholder = /(__|<|>|\{\{|placeholder|your[- _]|example|testfixture)/i;

function validateIdentity(input) {
  const errors = [];
  if (!input || input.source !== 'partner-center-product-identity' || input.confirmedFromPartnerCenter !== true) errors.push('Partner Center product identity must be explicitly confirmed');
  for (const field of ['name','publisher','publisherDisplayName','displayName']) {
    if (typeof input?.[field] !== 'string' || !input[field].trim() || input[field] !== input[field].trim() || placeholder.test(input[field]) || /[\x00-\x1f\x7f]/.test(input[field])) errors.push(`Missing or placeholder identity field: ${field}`);
  }
  if (!/^[A-Za-z0-9.-]{3,50}$/.test(input?.name || '')) errors.push('Package name must match the Store identity format');
  if (!/^CN=.{1,250}$/.test(input?.publisher || '')) errors.push('Publisher must be the exact Partner Center distinguished name');
  if ((input?.publisherDisplayName?.length || 0) > 256 || (input?.displayName?.length || 0) > 256) errors.push('Display name is too long');
  const parts = String(input?.version || '').split('.');
  if (parts.length !== 4 || parts.some(n => !/^\d+$/.test(n) || Number(n)>65535) || Number(parts[0])<1 || Number(parts[3])!==0) errors.push('Store version must be major.minor.patch.0, with valid components');
  if (!/^10\.0\.\d+\.\d+$/.test(input?.maxVersionTested || '') || Number(input.maxVersionTested.split('.')[2])<19041 || input.maxVersionTested.split('.').some(n=>Number(n)>65535)) errors.push('Provide the actually tested Windows build (10.0.build.revision)');
  return errors;
}
function xml(value) { return value.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])); }
function renderManifest(input, template = fs.readFileSync(path.join(root,'AppxManifest.xml.template'),'utf8')) {
  const errors = validateIdentity(input);
  if (errors.length) throw Error(errors.join('; '));
  const values = {NAME:input.name,PUBLISHER:input.publisher,PUBLISHER_DISPLAY_NAME:input.publisherDisplayName,DISPLAY_NAME:input.displayName,VERSION:input.version,MAX_VERSION_TESTED:input.maxVersionTested};
  const result = template.replace(/\{\{([A-Z_]+)\}\}/g, (_,key)=>{
    if (!(key in values)) throw Error('Unknown manifest placeholder');
    return xml(values[key]);
  });
  if (/\{\{|\}\}/.test(result)) throw Error('Unresolved manifest placeholder');
  return result;
}
function pngDimensions(file) {
  const data = fs.readFileSync(file);
  if (data.length<33 || !data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || data.toString('ascii',12,16)!=='IHDR') throw Error('Invalid PNG header');
  return [data.readUInt32BE(16),data.readUInt32BE(20)];
}
function findMakeAppx() {
  const candidates = (process.env.PATH || '').split(path.delimiter).filter(Boolean).map(p=>path.join(p,'makeappx.exe'));
  for (const base of ['C:\\Program Files (x86)\\Windows Kits\\10\\bin','C:\\Program Files\\Windows Kits\\10\\bin']) {
    if (!fs.existsSync(base)) continue;
    for (const dir of fs.readdirSync(base).filter(n=>/^10\.0\.\d+\.\d+$/.test(n)).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}))) candidates.push(path.join(base,dir,'x64','makeappx.exe'));
  }
  return candidates.find(p=>fs.existsSync(p)) || null;
}
function preflight(identity, {assetDir=path.join(root,'Assets'), payload=path.join(root,'..','dist','win-unpacked'), makeAppx=findMakeAppx()}={}) {
  const blockers = validateIdentity(identity);
  if (!makeAppx) blockers.push('Windows SDK MakeAppx.exe not found');
  if (!fs.existsSync(path.join(payload,'Oharu.exe')) || !fs.existsSync(path.join(payload,'resources','app.asar'))) blockers.push('Verified Windows x64 unpacked payload is missing');
  for (const [name,size] of Object.entries(REQUIRED_ASSETS)) {
    try { const [w,h]=pngDimensions(path.join(assetDir,name)); if(w!==size || h!==size) blockers.push(`Asset ${name} must be ${size}x${size}`); }
    catch { blockers.push(`Missing or invalid PNG asset: ${name}`); }
  }
  for (const key of RUNTIME_CHECKS) if (identity?.runtimeChecks?.[key] !== true) blockers.push(`Unverified packaged runtime: ${key}`);
  return {status:blockers.length?'blocked':'ready-for-local-packaging-review', makeAppx, blockers,
    signing:'not-performed', publishing:'not-performed', identityVerifiedByTool:false};
}
if (require.main === module) {
  try {
    const args=process.argv.slice(2);
    const idAt=args.indexOf('--identity');
    const file=idAt>=0?args[idAt+1]:path.join(root,'identity.local.json');
    const identity=file && fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')):null;
    const report=preflight(identity);
    if(args.includes('--emit-review')) {
      // A review manifest enables later local validation; it is not a package
      // nor evidence that runtime checks have passed. Identity is never guessed.
      const identityErrors=validateIdentity(identity);
      if (identityErrors.length) throw Error('Real Store identity is missing; no review manifest emitted');
      const output=path.join(root,'output'); fs.mkdirSync(output,{recursive:true});
      // Exclusive creation: never silently overwrite a reviewed manifest.
      fs.writeFileSync(path.join(output,'AppxManifest.review.xml'),renderManifest(identity),{flag:'wx'});
    }
    console.log(JSON.stringify(report,null,2));
    if(report.blockers.length) process.exitCode=1;
  } catch(error) {console.error(error.message);process.exitCode=1;}
}
module.exports={validateIdentity,renderManifest,pngDimensions,preflight,REQUIRED_ASSETS};
