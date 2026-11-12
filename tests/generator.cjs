const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  });
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
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const locale of ['', 'zh-hans/', 'zh-hant/', 'ja/']) {
        await page.goto(`${base}/${locale}generator/`);
        await page.waitForFunction(() => !!window.EmojiBladeStats);
        const labels = {
          '': ['Custom', 'TIER'], 'zh-hans/': ['自定义', '级'],
          'zh-hant/': ['自訂', '級'], 'ja/': ['カスタム', 'ランク'],
        }[locale];
        const emojis = await page.evaluate(() => Object.keys(window.EmojiBladeStats.EMOJI_PRESETS));
        const publishedNames = Object.fromEntries([...fs.readFileSync(path.join(root, locale, 'characters/index.html'), 'utf8')
          .matchAll(/data-preset="([^"]+)".*?<a[^>]*>(.*?)<\/a>/g)]
          .map(match => [match[1], match[2].slice(match[1].length).trim()]));
        for (const emoji of [...emojis, '🦄', '👩‍🚀', '🔥💎']) {
          await page.locator('#calcEmojiInput').fill(emoji);
          const expected = await page.evaluate(value => {
            const api = window.EmojiBladeStats;
            const normalized = api.normalizeEmoji(value);
            return { emoji: normalized, stats: api.computeEmojiStats(normalized) };
          }, emoji);
          assert.equal(await page.locator('#topAvatar').textContent(), expected.emoji);
          const name = await page.locator('#topName').textContent();
          assert.ok(name && (!locale || !name.startsWith('Custom ')));
          if (publishedNames[expected.emoji]) assert.equal(name, publishedNames[expected.emoji]);
          if (expected.emoji === '🦄' || expected.emoji === '👩‍🚀') {
            assert.equal(name, `${labels[0]} ${expected.emoji}`);
          }
          assert.equal(await page.locator('#tierPill').textContent(), `${expected.stats.tier} ${labels[1]}`);
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
        assert.equal(await page.locator('#massVal').evaluate(element => getComputedStyle(element).whiteSpace), 'nowrap');
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `/private/tmp/emoji-generator-${locale.replace('/', '') || 'en'}-${width}.png`, fullPage: true });
        await page.locator('#compareToggle').check();
        assert.equal(await page.locator('#singlePreview').isVisible(), false);
        assert.equal(await page.locator('#comparePanel').isVisible(), true);
        await page.locator('#calcEmojiInput').fill('👩‍🚀');
        // Cover preset, custom, multi-grapheme and empty opponent inputs.
        for (const value of ['👹', '👩‍🚀', '⚡💎', '']) {
          await page.locator('#rivalEmojiInput').fill(value);
          const expected = await page.evaluate(input => {
            const api = window.EmojiBladeStats;
            const emoji = api.normalizeEmoji(input.trim() || '💎');
            return { emoji, stats: api.computeEmojiStats(emoji) };
          }, value);
          assert.equal(await page.locator('#compare-right-avatar').textContent(), expected.emoji);
          for (const key of ['mass', 'attack', 'speed', 'endurance']) {
            assert.equal(await page.locator(`#compare-${key}-right`).textContent(), String(expected.stats[key]));
          }
        }
        await page.locator('#rivalPicker [data-emoji="👹"]').click();
        assert.equal(await page.locator('#calcEmojiInput').inputValue(), '👩‍🚀');
        assert.equal(await page.locator('#compare-mass-right').textContent(), '110');
        assert.equal(await page.locator('#compare-mass-right-bar').evaluate(element => element.style.width), '100%');
        await page.locator('#swapTopsBtn').click();
        assert.equal(await page.locator('#calcEmojiInput').inputValue(), '👹');
        assert.equal(await page.locator('#rivalEmojiInput').inputValue(), '👩‍🚀');
        assert.equal(await page.locator('#compare-mass-left').textContent(), '110');
        await page.locator('#rivalEmojiInput').fill('💎');
        assert.equal(await page.locator('#compare-right-tier').evaluate(element => getComputedStyle(element, '::after').content), 'none');
        await page.locator('#rivalEmojiInput').fill('👩‍🚀');
        for (const clipboard of ['success', 'denied', 'unavailable']) {
          await page.evaluate(mode => {
            window.copiedBuild = null;
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: mode === 'unavailable' ? undefined : {
              writeText: async value => { if (mode === 'denied') throw Error('Denied'); window.copiedBuild = value; },
            } });
          }, clipboard);
          let share;
          if (clipboard === 'success') {
            await page.locator('#copyShareBtn').click();
            await page.locator('#toastNotify').waitFor({ state: 'visible' });
            share = await page.evaluate(() => window.copiedBuild);
          } else {
            const handled = new Promise(resolve => page.once('dialog', async prompt => {
              const value = prompt.defaultValue();
              await prompt.dismiss();
              resolve(value);
            }));
            await page.locator('#copyShareBtn').click();
            share = await handled;
          }
          const shared = new URL(share);
          assert.equal(shared.searchParams.get('emoji'), '👹');
          assert.equal(shared.searchParams.get('rival'), '👩‍🚀');
          if (clipboard === 'unavailable') {
            await page.goto(share);
            assert.equal(await page.locator('#compareToggle').isChecked(), true);
            assert.equal(await page.locator('#compare-left-avatar').textContent(), '👹');
            assert.equal(await page.locator('#compare-right-avatar').textContent(), '👩‍🚀');
          }
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        const overlap = await page.locator('.comparison-table').evaluate(table => {
          const cells = [...table.querySelectorAll('th, td')];
          return cells.some(cell => cell.scrollWidth > cell.clientWidth + 1);
        });
        assert.equal(overlap, false, `${locale} comparison table at ${width}px`);
        await page.screenshot({ path: `/private/tmp/emoji-comparison-${locale.replace('/', '') || 'en'}-${width}.png`, fullPage: true });
        const launch = new URL(await page.locator('#launchArenaBtn').getAttribute('href'), base);
        assert.equal(launch.pathname, `/${locale}`);
        assert.equal(launch.searchParams.get('mode'), '2p');
        assert.equal(launch.searchParams.get('emoji'), '👹');
        assert.equal(launch.searchParams.get('rival'), '👩‍🚀');
        await page.locator('#compareToggle').uncheck();
        const single = new URL(await page.locator('#launchArenaBtn').getAttribute('href'), base);
        assert.equal(single.searchParams.has('mode'), false);
        assert.equal(single.searchParams.has('rival'), false);
        assert.equal(await page.locator('#singlePreview').isVisible(), true);
        await page.locator('#compareToggle').check();
        await page.locator('#launchArenaBtn').click();
        await page.waitForFunction(() => window.emojiBladeApp?.is2PMode === true);
        assert.equal(await page.locator('#player-emoji-input').inputValue(), '👹');
        assert.equal(await page.locator('#custom-enemy-input').inputValue(), '👩‍🚀');
        assert.equal(await page.evaluate(() => window.emojiBladeApp.playerTop.isLaunched), false);
      }
    }
    await page.goto(`${base}/unblocked/`);
    await page.locator('#fsToggleBtn').click();
    await page.waitForFunction(() => document.fullscreenElement?.id === 'gameFrameContainer');
    await page.evaluate(() => document.exitFullscreen());
    assert.deepEqual(errors, []);
    console.log('PASS: production CSP, four-language single/comparison stats, swapping, share round trips, local duel handoff, clipboard fallbacks, responsive layout and fullscreen');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
