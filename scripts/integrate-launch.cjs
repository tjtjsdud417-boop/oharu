// Idempotent, narrow additions; retain independent native HTML fixes.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
for (const name of ['web/index.html', 'mobile/assets/web/app.html']) {
  const filename = path.join(root, name);
  let html = fs.readFileSync(filename, 'utf8');
  const mobile = name.startsWith('mobile/');
  const start = '<!-- oharu-launch-assets:start -->';
  const end = '<!-- oharu-launch-assets:end -->';
  const assets = mobile
    ? `<style>${fs.readFileSync(path.join(root, 'web/theme-system.css'), 'utf8')}</style>\n<script>${fs.readFileSync(path.join(root, 'web/theme-system.js'), 'utf8')}</script>\n<script>${fs.readFileSync(path.join(root, 'web/reminders.js'), 'utf8')}</script>`
    : '<link rel="stylesheet" href="./theme-system.css">\n<script src="./theme-system.js"></script>\n<script src="./reminders.js"></script>';
  const block = `${start}\n${assets}\n${end}`;
  if (html.includes(start)) html = html.slice(0, html.indexOf(start)) + block + html.slice(html.indexOf(end) + end.length);
  else html = html.replace('<script type="module">', `${block}\n<script type="module">`);
  html = html.replace(/(?:\r?\nwindow\.OharuReminders\?\.mount\(\(\) => todos\);)+/g, '');
  html = html.replace('let lastLoadedDate = "";', 'let lastLoadedDate = "";\nwindow.OharuReminders?.mount(() => todos);');
  if (!html.includes('function render() {\n  window.OharuReminders')) html = html.replace(/function render\(\) \{\r?\n/, 'function render() {\n  window.OharuReminders?.sync(todos, currentUserId);\n');
  if (!html.includes('function rememberLoadedState() {\n  window.OharuReminders')) html = html.replace(/function rememberLoadedState\(\) \{\r?\n/, 'function rememberLoadedState() {\n  window.OharuReminders?.sync(todos, currentUserId);\n');
  html = html.replace(/(?:await window\.OharuReminders\?\.clear\(\); )*await supabase.auth.signOut\(\); location.reload\(\);/, 'await window.OharuReminders?.clear(); await supabase.auth.signOut(); location.reload();');
  html = html.replace(/(?:\r?\n  window\.OharuThemes\?\.connect\(supabase\);)+/g, '');
  html = html.replace(/(supabase = createClient\([^;]+;)/, '$1\n  window.OharuThemes?.connect(supabase);');
  html = html.replace(/const APP_VERSION = "[^"]+";/, 'const APP_VERSION = "1.8.0";');
  fs.writeFileSync(filename, html);
  console.log(`Integrated ${name}`);
}
