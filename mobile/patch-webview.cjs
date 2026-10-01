// react-native-webview 13.16.1 reports opaque file origins as "null" on modern
// Android WebViews. Preserve the exact bundled-document URI gate, and reject
// subframes before forwarding messages to React Native.
const fs = require('node:fs');
const path = require('node:path');
const ORIGINAL = 'RNCWebView.this.onMessage(message.getData(), sourceOrigin.toString());';
const PATCHED = 'if (isMainFrame && "null".equals(sourceOrigin.toString()) && view.getUrl() != null && view.getUrl().startsWith("file://")) { RNCWebView.this.onMessage(message.getData(), view.getUrl()); } // OHARU_PINNED_MAIN_FRAME';
const LEGACY = 'mWebView.post(() -> mWebView.onMessage(message, mWebView.getUrl()));';
const LEGACY_PATCHED = 'mWebView.post(() -> mWebView.onMessage("oharu:unsupported-webview", mWebView.getUrl())); // OHARU_NO_UNPROVEN_FRAME_COMMANDS';
function patch(root) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (pkg.version !== '13.16.1') throw new Error('Review Oharu WebView bridge patch before upgrading react-native-webview');
  const file = path.join(root, 'android/src/main/java/com/reactnativecommunity/webview/RNCWebView.java');
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes(PATCHED) && source.includes(LEGACY_PATCHED) && !source.includes(ORIGINAL) && !source.includes(LEGACY)) return;
  if (source.split(ORIGINAL).length !== 2 || source.includes('OHARU_PINNED_MAIN_FRAME')) throw new Error('Unexpected WebView bridge source; refusing an unreviewed build');
  if (!source.includes('boolean isMainFrame, @NonNull JavaScriptReplyProxy replyProxy)')) throw new Error('WebView main-frame contract changed');
  if (source.split(LEGACY).length !== 2) throw new Error('Unexpected legacy WebView bridge source');
  fs.writeFileSync(file, source.replace(ORIGINAL, PATCHED).replace(LEGACY, LEGACY_PATCHED));
}
if (require.main === module) {
  patch(path.dirname(require.resolve('react-native-webview/package.json')));
  console.log('Verified pinned Android main-frame WebView bridge patch.');
}
module.exports = { patch, ORIGINAL, PATCHED, LEGACY, LEGACY_PATCHED };
