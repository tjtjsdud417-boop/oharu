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
    ? `<style>${fs.readFileSync(path.join(root, 'web/theme-system.css'), 'utf8')}</style>\n<script>${fs.readFileSync(path.join(root, 'web/theme-system.js'), 'utf8')}</script>\n<script>${fs.readFileSync(path.join(root, 'web/settings-experience.js'), 'utf8')}</script>\n<script>${fs.readFileSync(path.join(root, 'web/reminders.js'), 'utf8')}</script>`
    : '<link rel="stylesheet" href="./theme-system.css">\n<script src="./theme-system.js"></script>\n<script src="./settings-experience.js"></script>\n<script src="./reminders.js"></script>';
  const block = `${start}\n${assets}\n${end}`;
  if (html.includes(start)) html = html.slice(0, html.indexOf(start)) + block + html.slice(html.indexOf(end) + end.length);
  else html = html.replace('<script type="module">', `${block}\n<script type="module">`);
  html = html.replace(/(?:\r?\nlet reminderDataReady = false;)?\r?\nwindow\.OharuReminders\?\.mount\([^\n]+\);/g, '');
  html = html.replace('let lastLoadedDate = "";', 'let lastLoadedDate = "";\nlet reminderDataReady = false;\nwindow.OharuReminders?.mount(() => reminderDataReady ? todos : null);');
  if (!html.includes('function render() {\n  window.OharuReminders')) html = html.replace(/function render\(\) \{\r?\n/, 'function render() {\n  window.OharuReminders?.sync(todos, currentUserId);\n');
  if (!html.includes('function rememberLoadedState() {\n  window.OharuReminders')) html = html.replace(/function rememberLoadedState\(\) \{\r?\n/, 'function rememberLoadedState() {\n  window.OharuReminders?.sync(todos, currentUserId);\n');
  html = html.replaceAll('window.OharuReminders?.sync(todos, currentUserId);', 'window.OharuReminders?.sync(reminderDataReady ? todos : null, currentUserId);');
  html = html.replace('if (error) { console.error(error); return []; }', 'if (error) { console.error(error); return null; }');
  if (!html.includes('// Clear old-owner reminders on every auth boundary')) html = html.replace('supabase.auth.onAuthStateChange((_e, sess) => {\n    if (!sess) return;', `supabase.auth.onAuthStateChange((_e, sess) => {
    // Clear old-owner reminders on every auth boundary, including other tabs.
    if (_e === "SIGNED_OUT" || (currentUserId && sess?.user?.id && sess.user.id !== currentUserId)) {
      window.OharuReminders?.clear();
      setTimeout(() => { todos = []; reminderDataReady = false; location.reload(); }, 0);
      return;
    }
    if (!sess) return;`);
  if (!html.includes('// Clear old-owner reminders on every auth boundary')) html = html.replace('supabase.auth.onAuthStateChange((_e, sess) => {\r\n    if (!sess) return;', `supabase.auth.onAuthStateChange((_e, sess) => {
    // Clear old-owner reminders on every auth boundary, including other tabs.
    if (_e === "SIGNED_OUT" || (currentUserId && sess?.user?.id && sess.user.id !== currentUserId)) {
      window.OharuReminders?.clear();
      setTimeout(() => { todos = []; reminderDataReady = false; location.reload(); }, 0);
      return;
    }
    if (!sess) return;`);
  html = html.replace(/  todos = await repo.load\(\);\r?\n  render\(\);/, '  const carried = await repo.load();\n  if (!carried) return;\n  todos = carried; reminderDataReady = true;\n  render();');
  html = html.replace(/  todos = await repo.load\(\);\r?\n  await backfillTodaySortOrder\(\);/, '  const initialTodos = await repo.load();\n  if (initialTodos) { todos = initialTodos; reminderDataReady = true; }\n  await backfillTodaySortOrder();');
  if (!html.includes('if (!loaded) return;')) html = html.replace(/    const loaded = await repo.load\(\);\r?\n/, '    const loaded = await repo.load();\n    if (!loaded) return;\n    reminderDataReady = true;\n');
  html = html.replace(/(?:await window\.OharuReminders\?\.clear\(\); )*await supabase.auth.signOut\(\); location.reload\(\);/, 'await window.OharuReminders?.clear(); await supabase.auth.signOut(); location.reload();');
  html = html.replace(/(?:\r?\n  window\.OharuThemes\?\.connect\(supabase\);)+/g, '');
  if (html.includes('await verifyDeletionOAuthReturn();')) html = html.replace('await verifyDeletionOAuthReturn();', 'await verifyDeletionOAuthReturn();\n  window.OharuThemes?.connect(supabase);');
  else html = html.replace(/(supabase = createClient\([^;]+;)/, '$1\n  window.OharuThemes?.connect(supabase);');
  html = html.replace(/const APP_VERSION = "[^"]+";/, 'const APP_VERSION = "1.8.0";');
  fs.writeFileSync(filename, html);
  console.log(`Integrated ${name}`);
}
