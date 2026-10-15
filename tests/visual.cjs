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
      const contentType = { '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
        '.png': 'image/png', '.webmanifest': 'application/manifest+json' }[path.extname(file)] || 'text/html';
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
    for (const [prefix, countdown, finished] of [['', 'COUNTDOWN', 'FINISHED'],
      ['zh-hans/', '发射倒计时', '对战结束'], ['ja/', 'カウントダウン', 'バトル終了']]) {
      await page.goto(`https://local.test/${prefix}`);
      await page.locator('#main-launch-btn').click();
      await page.waitForFunction(expected => document.getElementById('battle-phase').textContent === expected, countdown);
      await page.locator('#cancel-launch-btn').click();
      await page.evaluate(() => { window.emojiBladeApp.battleState = 'finished'; });
      await page.waitForFunction(expected => document.getElementById('battle-phase').textContent === expected, finished);
    }
    await page.goto('https://local.test/');
    if (await page.locator('.battle-station').count()) {
      const button = page.locator('#main-launch-btn');
      await button.hover();
      await page.mouse.down();
      await page.waitForFunction(() => getComputedStyle(document.getElementById('main-launch-btn')).transform === 'matrix(1, 0, 0, 1, 0, 3)');
      await page.mouse.move(0, 0);
      await page.mouse.up();
      await page.waitForFunction(() => getComputedStyle(document.getElementById('main-launch-btn')).transform === 'none');
      const sparks = await page.evaluate(() => {
        const game = window.emojiBladeApp;
        game.playerTop.x = 100; game.playerTop.y = 200;
        game.enemyTop.x = 150; game.enemyTop.y = 200;
        game.playerTop.vx = 5; game.enemyTop.vx = -5;
        game.playerTop.vy = game.enemyTop.vy = 0;
        game.playerTop.isSpinning = game.enemyTop.isSpinning = true;
        game.handleTopCollisions();
        const particles = game.particles.particles;
        const result = { sparks: particles.filter(p => !p.isRing).length,
          ring: particles.some(p => p.isRing && p.color === '#f97316'),
          damage: game.playerTop.energy < 100 && game.enemyTop.energy < 100 };
        game.setupStage();
        return result;
      });
      assert.deepEqual(sparks, { sparks: 40, ring: true, damage: true });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await button.evaluate(element => getComputedStyle(element).transitionDuration), '0s');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    }
    for (const mode of ['', '?mode=2p']) {
      await page.goto(`https://local.test/${mode}`);
      await page.locator('#main-launch-btn').click();
      if (mode) await page.locator('#main-launch-btn').click();
      await page.locator('#countdown-overlay').waitFor({ state: 'visible' });
      await page.locator('#cancel-launch-btn').click();
      await page.locator('#countdown-overlay').waitFor({ state: 'hidden' });
      assert.equal(await page.locator('#main-launch-btn').isEnabled(), true);
      if (await page.locator('.battle-station').count()) {
        await page.waitForFunction(() => document.getElementById('battle-phase').textContent.includes('READY'));
        assert.equal(await page.locator('#battle-clock').textContent(), '00.0');
        await page.evaluate(() => { window.emojiBladeApp.playerTop.energy = 20; });
        await page.waitForFunction(() => document.getElementById('player-energy-bar').dataset.low === 'true');
      }
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
