// Build from this isolated allowlist; never let EAS inspect the stale android/.
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
const target=path.join(root,'.expo','eas-release');
fs.mkdirSync(target,{recursive:true});
for(const file of ['.easignore','app.json','eas.json','package.json','package-lock.json','App.js','index.js','metro.config.js','reminders.cjs','widget.cjs','plugins','assets/oharu-icon-1024.png','assets/oharu-icon-512.png','assets/web/app.html']) {
  const dest=path.join(target,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.cpSync(path.join(root,file),dest,{recursive:true});
}
if(fs.existsSync(path.join(target,'android'))||fs.existsSync(path.join(target,'ios')))throw Error('Staging must not contain native folders. Choose a fresh staging location.');
console.log(target);
console.log('Run EAS from this directory with EAS_NO_VCS=1 and EAS_PROJECT_ROOT set to the exact path above.');
