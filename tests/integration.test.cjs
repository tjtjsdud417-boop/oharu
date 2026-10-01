const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const assert = require('node:assert/strict');
const {test} = require('node:test');
const os = require('node:os');
test('integration is idempotent and preserves a single hook at every boundary', () => {
  const sourceRoot=path.join(__dirname,'..');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'oharu-integration-'));
  for(const name of ['scripts/integrate-launch.cjs','web/index.html','mobile/assets/web/app.html','web/theme-system.css','web/theme-system.js','web/reminders.js']){
    const destination=path.join(root,name);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(path.join(sourceRoot,name),destination);
  }
  execFileSync(process.execPath,['scripts/integrate-launch.cjs'],{cwd:root});
  const files=['web/index.html','mobile/assets/web/app.html'];
  const before=files.map(f=>fs.readFileSync(path.join(root,f),'utf8'));
  execFileSync(process.execPath,['scripts/integrate-launch.cjs'],{cwd:root});
  files.forEach((f,i)=>{
    const html=fs.readFileSync(path.join(root,f),'utf8');
    assert.equal(html,before[i],f);
    assert.equal(html.split('window.OharuReminders?.mount(() => reminderDataReady ? todos : null);').length,2);
    assert.match(html,/await window\.OharuReminders\?\.clear\(\); await supabase\.auth\.signOut\(\); location\.reload\(\);/);
    assert.equal(html.split('window.OharuThemes?.connect(supabase);').length,2);
    assert.ok(html.includes('e.isComposing'));
    assert.ok(html.includes('"oneul.v3"'));
    assert.ok(html.includes('if (!loaded) return;'));
    assert.ok(html.includes('if (error) { console.error(error); return null; }'));
  });
});
