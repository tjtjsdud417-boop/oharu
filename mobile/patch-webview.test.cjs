const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { patch, ORIGINAL, PATCHED } = require('./patch-webview.cjs');
test('pinned Android bridge patch requires main frame and exact document URL, is idempotent and fails closed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oharu-webview-patch-'));
  try {
    const file = path.join(dir, 'android/src/main/java/com/reactnativecommunity/webview/RNCWebView.java');
    fs.mkdirSync(path.dirname(file), {recursive:true});
    fs.writeFileSync(path.join(dir,'package.json'), JSON.stringify({version:'13.16.1'}));
    fs.writeFileSync(file, `boolean isMainFrame, @NonNull JavaScriptReplyProxy replyProxy) { ${ORIGINAL} }`);
    patch(dir); const once=fs.readFileSync(file,'utf8'); patch(dir);
    assert.equal(fs.readFileSync(file,'utf8'),once);
    assert.ok(once.includes(PATCHED)); assert.ok(!once.includes(ORIGINAL));
    fs.writeFileSync(file,'changed upstream'); assert.throws(()=>patch(dir),/Unexpected/);
    fs.writeFileSync(path.join(dir,'package.json'), JSON.stringify({version:'13.17.0'}));
    assert.throws(()=>patch(dir),/upgrading/);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});
