import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const source = fs.readFileSync('snapshot/index.html', 'utf8');
const generated = fs.readFileSync('index.html', 'utf8');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const section = (s, from, to) => {
  const a = s.indexOf(from), b = s.indexOf(to, a);
  assert.ok(a >= 0 && b > a, `Missing ${from}`);
  return s.slice(a, b);
};
const styles = s => [...s.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
const pairs = [
  ['base-inline-css', styles(source), styles(generated)],
  ['header-dom', section(source, '<header class="head">', '</header>'), section(generated, '<header class="head">', '</header>')],
  ['today-dom', section(source, '<div id="todayView">', '<div id="calView"'), section(generated, '<div id="todayView">', '<div id="calView"')],
  ['calendar-dom', section(source, '<div id="calView"', '<div id="setView"'), section(generated, '<div id="calView"', '<div id="setView"')],
];
const sections = pairs.map(([name, before, after]) => {
  assert.equal(after, before, `${name}: unintended layout change`);
  return { name, byteIdentical: true, sha256: hash(before), bytes: Buffer.byteLength(before) };
});
const report = {
  checkedAt: new Date().toISOString(), sourceCommit: JSON.parse(fs.readFileSync('SNAPSHOT.json', 'utf8')).commit,
  sections,
  intentionalDifferences: ['Native safe-area padding and light color-scheme', 'Device-only storage notice above header', 'Unsupported auth/install/MCP/theme controls removed', 'Settings privacy/support pending and sync/notifications/payments unavailable text', 'External font CDN omitted; system font fallback used'],
  scope: 'DOM/CSS byte comparison of original static markup and generated Toss markup; not a claim of pixel-identical whole-page rendering',
};
fs.writeFileSync('output/review/layout-comparison.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
