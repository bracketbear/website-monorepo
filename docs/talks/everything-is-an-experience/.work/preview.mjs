// Renders each authored .dc.html directly with the stills inlined, for a look before saving.
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
const require = createRequire('/Users/harrisoncallahan/Projects/federato-front-end/node_modules/');
const { chromium } = require('playwright');
const D = '/Users/harrisoncallahan/Projects/bracketbear/docs/talks/everything-is-an-experience';
const OUT = `${D}/.work/stills`;
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const files = readdirSync(D).filter((f) => f.endsWith('.dc.html') && (!only || only.includes(f.replace('.dc.html', '')))).sort();
for (const f of files) {
  let html = readFileSync(`${D}/${f}`, 'utf8').replace('<script src="./support.js"></script>', '');
  html = html.replace(/src="([a-z-]+)\.jpg"/g, (_, id) => `src="data:image/jpeg;base64,${readFileSync(`${D}/${id}.jpg`).toString('base64')}"`);
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/prev-${f.replace('.dc.html', '')}.png` });
}
await browser.close();
console.log('rendered', files.length);
