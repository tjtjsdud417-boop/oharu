const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const assert = require('node:assert/strict');
const {test} = require('node:test');
test('integration is idempotent and preserves a single hook at every boundary', () => {
  const root=path.join(__dirname,'..');
  execFileSync(process.execPath,['scripts/integrate-launch.cjs'],{cwd:root});
  const files=['web/index.html','mobile/assets/web/app.html'];
  const before=files.map(f=>fs.readFileSync(path.join(root,f),'utf8'));
  execFileSync(process.execPath,['scripts/integrate-launch.cjs'],{cwd:root});
  files.forEach((f,i)=>{
    const html=fs.readFileSync(path.join(root,f),'utf8');
    assert.equal(html,before[i],f);
    assert.equal(html.split('window.OharuReminders?.mount(() => todos);').length,2);
    assert.equal(html.split('await window.OharuReminders?.clear();').length,2);
    assert.equal(html.split('window.OharuThemes?.connect(supabase);').length,2);
    assert.ok(html.includes('e.isComposing'));
    assert.ok(html.includes('"oneul.v3"'));
  });
});
