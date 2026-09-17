// Stills for the canvas, taken from the runner itself so colors match the projector.
// OUT=<dir> JOBS='[["slideId", waitMs], ...]' node capture-runner.mjs
import { createRequire } from 'node:module';
const require = createRequire('/Users/harrisoncallahan/Projects/federato-front-end/node_modules/');
const { chromium } = require('playwright');
const OUT = process.env.OUT;
const jobs = JSON.parse(process.env.JOBS);
const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('pageerror', e.message));
for (const [id, wait] of jobs) {
  await page.goto(`http://localhost:4321/talks/everything-is-an-experience?slide=${id}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { timeout: 20000 });
  await page.mouse.move(1200, 600);
  await page.waitForTimeout(wait);
  await page.keyboard.press('t');
  await page.evaluate(() => { const b = document.querySelector('.bb-talk-toggle'); if (b) b.style.display = 'none'; });
  await page.waitForTimeout(350);
  await page.locator('.bb-talk-stage').screenshot({ path: `${OUT}/${id}.png` });
  console.log('shot', id);
}
await browser.close();
