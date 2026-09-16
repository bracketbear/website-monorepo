// Smoke: the talk route mounts a canvas, the arrow key advances, the URL
// follows. Run with a dev server on 4321:
//   PLAYWRIGHT_NODE_MODULES=~/Projects/federato-front-end/node_modules/ \
//     node apps/bracketbear-website/scripts/talk-smoke.mjs
// Set TALK_SHOTS=<dir> to also save a screenshot of each slide there.
import { createRequire } from 'node:module';

const from = process.env.PLAYWRIGHT_NODE_MODULES;
if (!from) {
  console.error(
    'set PLAYWRIGHT_NODE_MODULES to a node_modules/ that has playwright'
  );
  process.exit(2);
}
const require = createRequire(from.endsWith('/') ? from : `${from}/`);
const { chromium } = require('playwright');

const url = 'http://localhost:4321/talks/everything-is-an-experience';
const shots = process.env.TALK_SHOTS;
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.error('pageerror', e.message));
const failures = [];
const check = (ok, msg) => (ok ? console.log('ok  ', msg) : failures.push(msg));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForSelector('canvas', { timeout: 20000 }).catch(() => null);
check((await page.locator('canvas').count()) > 0, 'a canvas mounts');
check(await page.getByText('01 / 14').isVisible(), 'counter reads 01 / 14');

await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);
check(
  await page.getByText('02 / 14').isVisible(),
  'ArrowRight advances to 02 / 14'
);
check(page.url().includes('slide=ux'), 'URL carries ?slide=ux');

await page.keyboard.press('n');
await page.waitForTimeout(100);
check(
  (await page.locator('.bb-talk-notes').count()) === 1,
  'N opens the notes drawer'
);
await page.keyboard.press('n');

await page.keyboard.press('t');
await page.waitForTimeout(300);
check(
  (await page.locator('.bb-talk-toggle').innerText()) === 'SHOW TEXT',
  'T hides the text and the toggle flips'
);
if (shots) await page.screenshot({ path: `${shots}/slide-02-hidden.png` });
await page.keyboard.press('t');

if (shots) {
  await page.keyboard.press('Home');
  for (let i = 1; i <= 14; i++) {
    await page.waitForTimeout(i === 1 ? 3500 : 1800);
    await page.screenshot({
      path: `${shots}/slide-${String(i).padStart(2, '0')}.png`,
    });
    await page.keyboard.press('ArrowRight');
  }
}

await page.keyboard.press('End');
await page.waitForTimeout(400);
check(
  await page.getByText('14 / 14').isVisible(),
  'End lands on the last slide'
);
check(page.url().includes('slide=thanks'), 'URL carries ?slide=thanks');

await browser.close();
if (failures.length) {
  for (const f of failures) console.error('FAIL', f);
  process.exit(1);
}
