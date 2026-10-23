// Capture the actual local game, not a mockup. Requires the existing Playwright browser.
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.join(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 });
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'https://local.test') return route.abort();
      const file = url.pathname.endsWith('/') ? `${url.pathname}index.html` : url.pathname;
      const type = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
      await route.fulfill({ body: await fs.readFile(path.join(root, file)), contentType: type[path.extname(file)] || 'text/html' });
    });
    await fs.mkdir(path.join(root, 'images'), { recursive: true });
    for (const [name, query] of [['launch-controls', ''], ['local-duel', '?mode=2p&emoji=%F0%9F%94%A5&rival=%F0%9F%94%A5']]) {
      await page.goto(`https://local.test/${query}`);
      await page.locator('#player-tier').filter({ hasText: /TIER/ }).waitFor();
      if (query) {
        await page.locator('#main-launch-btn').click();
        await page.locator('#arena-status').filter({ hasText: /PLAYER 2 TURN/ }).waitFor();
      }
      const output = path.join(root, `images/${name}.png`);
      await page.locator('.battle-station').screenshot({ path: output });
      const png = await fs.readFile(output);
      console.log(`${name}: ${png.readUInt32BE(16)} x ${png.readUInt32BE(20)}`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
