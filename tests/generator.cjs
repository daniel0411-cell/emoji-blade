const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && /Content Security Policy/.test(message.text())) errors.push(message.text());
    });
    const root = path.join(__dirname, '..');
    const base = process.env.TEST_BASE_URL || 'https://local.test';
    if (!process.env.TEST_BASE_URL) {
      const csp = fs.readFileSync(path.join(root, '_headers'), 'utf8')
        .split('\n').find(line => line.includes('Content-Security-Policy:')).split('Content-Security-Policy: ')[1];
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== base) return route.abort();
        const file = url.pathname.endsWith('/') ? `${url.pathname}index.html` : url.pathname;
        await route.fulfill({ body: fs.readFileSync(path.join(root, file)),
          headers: { 'Content-Security-Policy': csp },
          contentType: { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(file)] || 'text/html' });
      });
    }
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const locale of ['', 'zh-hans/', 'zh-hant/', 'ja/']) {
        await page.goto(`${base}/${locale}generator/`);
        await page.waitForFunction(() => !!window.EmojiBladeStats);
        const emojis = await page.evaluate(() => Object.keys(window.EmojiBladeStats.EMOJI_PRESETS));
        for (const emoji of [...emojis, '🦄', '👩‍🚀', '🔥💎']) {
          await page.locator('#calcEmojiInput').fill(emoji);
          const expected = await page.evaluate(value => {
            const api = window.EmojiBladeStats;
            const normalized = api.normalizeEmoji(value);
            return { emoji: normalized, stats: api.computeEmojiStats(normalized) };
          }, emoji);
          assert.equal(await page.locator('#topAvatar').textContent(), expected.emoji);
          for (const key of ['mass', 'attack', 'speed', 'endurance']) {
            assert.equal(await page.locator(`#${key}Val`).textContent(), `${expected.stats[key]} / 100`);
          }
          assert.equal(new URL(await page.locator('#launchArenaBtn').getAttribute('href'), base).searchParams.get('emoji'), expected.emoji);
        }
        await page.locator('[data-emoji]').first().click();
        assert.equal(await page.locator('#topAvatar').textContent(), '🦄');
        for (const clipboard of ['success', 'denied', 'unavailable']) {
          await page.evaluate(mode => {
            window.copiedBuild = null;
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: mode === 'unavailable' ? undefined : {
              writeText: async value => { if (mode === 'denied') throw Error('Denied'); window.copiedBuild = value; },
            } });
          }, clipboard);
          if (clipboard === 'success') {
            await page.locator('#copyShareBtn').click();
            await page.locator('#toastNotify').waitFor({ state: 'visible' });
            assert.equal(new URL(await page.evaluate(() => window.copiedBuild)).pathname, `/${locale}generator/`);
          } else {
            const handled = new Promise(resolve => page.once('dialog', async prompt => {
              const value = prompt.defaultValue();
              await prompt.dismiss();
              resolve(value);
            }));
            await page.locator('#copyShareBtn').click();
            assert.equal(new URL(await handled).pathname, `/${locale}generator/`);
            assert.equal(await page.locator('#toastNotify').isVisible(), false);
          }
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if (!locale) {
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({ path: `/private/tmp/emoji-generator-${width}.png` });
        }
      }
    }
    await page.goto(`${base}/unblocked/`);
    await page.locator('#fsToggleBtn').click();
    await page.waitForFunction(() => document.fullscreenElement?.id === 'gameFrameContainer');
    await page.evaluate(() => document.exitFullscreen());
    assert.deepEqual(errors, []);
    console.log('PASS: production CSP, four-language generator stats, graphemes, clipboard branches, responsive layout and fullscreen');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
