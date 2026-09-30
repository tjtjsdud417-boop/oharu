import fs from 'node:fs';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const source = fileURLToPath(new URL('../../', import.meta.url));
const commit = '8c58b86f12ff0bb02c935bdcfc0f87d6bc256ae5';
const previous = JSON.parse(fs.readFileSync('SNAPSHOT.json', 'utf8'));
if (previous.commit === commit) { console.log('Already synchronized to pinned commit'); process.exit(0); }
const git = args => cp.execFileSync('git', ['-C', source, ...args], { maxBuffer: 4e6 });
if (git(['rev-parse', commit]).toString().trim() !== commit) throw new Error('Pinned revision mismatch');
fs.mkdirSync('output/review', { recursive: true });
fs.writeFileSync('output/review/previous-snapshot.json', JSON.stringify(previous, null, 2));
fs.writeFileSync('output/review/upstream-8c58b86.patch', git(['diff', previous.commit, commit, '--', 'web/index.html', 'web/theme-system.js', 'web/reminders.js']));
const sha256 = {};
for (const file of Object.keys(previous.sha256)) {
  const bytes = git(['show', `${commit}:${file}`]);
  fs.writeFileSync(`snapshot/${file.split('/').pop()}`, bytes);
  sha256[file] = crypto.createHash('sha256').update(bytes).digest('hex');
}
fs.writeFileSync('SNAPSHOT.json', JSON.stringify({ source, commit, capturedAt: new Date().toISOString(), method: 'git show explicit immutable commit, no working-tree file reads or source writes', previousCommit: previous.commit, sha256 }, null, 2));
console.log(`Pinned snapshot synchronized: ${commit}`);
