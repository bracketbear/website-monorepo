// Fails the launch when any built page still carries a [PLACEHOLDER marker.
// Run after `npm run build`. Not part of check:ci: it is expected to fail
// until the project notes' placeholders are filled in.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const MARKER = '[PLACEHOLDER';

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

const found = [];
for (const file of htmlFiles(dist)) {
  const html = readFileSync(file, 'utf8');
  let at = html.indexOf(MARKER);
  while (at !== -1) {
    const end = html.indexOf(']', at);
    found.push({
      file: relative(root, file),
      text: html.slice(at, end === -1 ? at + 80 : end + 1),
    });
    at = html.indexOf(MARKER, at + MARKER.length);
  }
}

if (found.length > 0) {
  console.error(`${found.length} placeholder(s) in dist:`);
  for (const { file, text } of found) console.error(`  ${file}: ${text}`);
  process.exit(1);
}
console.log('no placeholders');
