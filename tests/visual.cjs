// Requires Playwright and an installed browser; CHROME_PATH can select local Chrome.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'https://local.test') return route.abort();
      const file = url.pathname.endsWith('/') ? `${url.pathname}index.html` : url.pathname;
      const contentType = file.endsWith('.css') ? 'text/css'
        : file.endsWith('.js') ? 'text/javascript' : 'text/html';
      await route.fulfill({
        body: await fs.readFile(path.join(__dirname, '..', file)), contentType,
      });
    });
    for (const width of [320, 390, 480, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const language of ['', 'zh-hans/', 'ja/']) {
        await page.goto(`https://local.test/${language}`);
        await page.locator('#player-tier').filter({ hasText: /TIER/ }).waitFor();
        const issues = await page.evaluate(() => {
          const arena = document.querySelector('#arena-container').getBoundingClientRect();
          return [...document.querySelectorAll(
            '.hud-fighter, .hud-vs-badge, .hud-player-stats, #player-energy-bar, #enemy-energy-bar'
          )].filter(element => {
            const rect = element.getBoundingClientRect();
            return rect.width <= 0 || rect.height <= 0
              || rect.left < arena.left || rect.right > arena.right;
          }).map(element => element.id || element.className);
        });
        assert.deepEqual(issues, [], `${language || 'en'} at ${width}px: clipped or hidden HUD`);
        await page.goto(`https://local.test/${language}guide/`);
        assert.equal(await page.locator('.prose-card h1').evaluate(element =>
          getComputedStyle(element).color === getComputedStyle(element.parentElement).backgroundColor
        ), false, 'Heading must contrast with its background');
      }
    }
    for (const mode of ['', '?mode=2p']) {
      await page.goto(`https://local.test/${mode}`);
      await page.locator('#main-launch-btn').click();
      if (mode) await page.locator('#main-launch-btn').click();
      await page.locator('#countdown-overlay').waitFor({ state: 'visible' });
      await page.locator('#cancel-launch-btn').click();
      await page.locator('#countdown-overlay').waitFor({ state: 'hidden' });
      assert.equal(await page.locator('#main-launch-btn').isEnabled(), true);
    }
    if (process.env.SCREENSHOT_PATH) {
      await page.setViewportSize({ width: 390, height: 900 });
      await page.goto('https://local.test/');
      await page.screenshot({ path: process.env.SCREENSHOT_PATH });
    }
    assert.deepEqual(errors, [], 'Browser runtime errors');
    console.log('PASS: HUD and guide headings in three languages at five viewport widths; solo/2P launch cancellation');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
