import fs from 'node:fs';
import crypto from 'node:crypto';
const source = fs.readFileSync('snapshot/index.html', 'utf8');
const manifest = JSON.parse(fs.readFileSync('SNAPSHOT.json', 'utf8'));
if (crypto.createHash('sha256').update(source).digest('hex') !== manifest.sha256['web/index.html']) throw new Error('Snapshot changed; review and recapture explicitly');
let code = source.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
function cut(from, to, replacement) {
  const a = code.indexOf(from), b = code.indexOf(to, a + from.length);
  if (a < 0 || b < 0) throw new Error(`Snapshot anchor missing: ${from}`);
  code = code.slice(0, a) + replacement + '\n' + code.slice(b);
}
code = code.replace(/const SUPABASE_URL = .*?;/, 'const SUPABASE_URL = "";').replace(/const SUPABASE_ANON_KEY = .*?;/, 'const SUPABASE_ANON_KEY = "";');
cut('function localRepo()', '// ── 앱 상태', '');
cut('function renderAccount(email)', 'function applyBgAlpha', `function renderAccount() {
  $("setAccountTitle").textContent = "저장 방식";
  $("setAccount").textContent = "이 기기에만 저장 · 기기 간 동기화 안 됨";
}`);
// Eliminate backend/token management implementation entirely.
cut('const MCP_BASE_URL', 'async function renderMcp', '');
cut('async function renderMcp', 'async function startApp', '');
// The source section between MCP and startApp also contains core helpers; restored below.
const middle = source.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const mcpStart = middle.indexOf('async function renderMcp');
const startApp = middle.indexOf('async function startApp');
const mcpEnd = middle.indexOf('\n}', mcpStart) + 2;
code = code.replace('async function startApp', middle.slice(mcpEnd, startApp) + '\nasync function startApp');
code = code.replace(/  renderMcp\(!!canLogout\);[^\n]*/, '');
code = code.slice(0, code.lastIndexOf('if (!CLOUD)')) + `
try {
  const tossRepo = await initialize(todayStr, () => {
    if (view !== 'today') { switchView('today'); return true; }
    return false;
  });
  await startApp(tossRepo);
  $("setPrivacyLink").textContent = '확인 준비 중';
  ['authView', 'loginTopBtn', 'nudge', 'setMcp', 'setApp', 'dlCard', 'seoLine', 'setPcWidgetRow', 'setDesign'].forEach(id => $(id)?.remove());
  const route = location.pathname.replace(/\\/$/, '');
  if (route === '/calendar') switchView('cal');
  if (route === '/settings') switchView('set');
} catch (_) { reportFailure(); }
`;
code = `import { initialize, reportFailure } from './adapter.js';\n` + code;
// Keep language preferences separate from task data. This draft is Korean-only.
code = code.replace(/const loadUI = .*?;(?=\n)/, 'const loadUI = () => ({ lang: "ko" });');
code = code.replace(/const saveUI = .*?;(?=\n)/, 'const saveUI = () => {};');
let html = source.replace(/<script\b[\s\S]*?<\/script>/g, '');
html = html.replace(/<meta[^>]+(?:description|keywords|verification|og:|twitter:)[^>]*>/g, '')
  .replace(/<link[^>]+(?:https:|manifest|canonical|theme-system|icon-192)[^>]*>/g, '');
html = html.replace('initial-scale=1.0', 'initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
html = html.replace('</head>', '<link rel="icon" href="data:,"><link rel="stylesheet" href="./src/toss.css"></head>');
html = html.replace('<div class="app">', '<div class="app"><p id="tossStatus" role="status">이 기기에만 저장돼요. 토스 앱을 삭제하면 기록도 삭제될 수 있어요.</p>');
html = html.replace(/<div class="set-row"><span id="setPrivacyLabel"[\s\S]*?<\/div>/, '<div class="set-row"><span id="setPrivacyLabel">개인정보처리방침</span><span id="setPrivacyLink">확인 준비 중</span></div>');
html = html.replace(/<div class="set-row"><span id="setWebLabel"[\s\S]*?<\/div>/, '<span id="setWebLabel" hidden></span>');
html = html.replace(/<div class="set-row"><span data-i18n="contact"[\s\S]*?<\/div>/, '<p class="toss-note">문의처 · 약관 · 개인정보 안내 확인 준비 중<br>계정 동기화 · 알림 · 결제는 제공하지 않아요.</p>');
html = html.replace(/href="https:[^"]*"/g, '');
html = html.replace('</body>', '<script type="module" src="./src/app.js"></script></body>');
fs.writeFileSync('index.html', html);
fs.writeFileSync('src/app.js', code);
console.log('Prepared preserved snapshot + isolated Toss adapter');
