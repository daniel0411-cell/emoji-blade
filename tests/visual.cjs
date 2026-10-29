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
      for (const language of ['', 'zh-hans/', 'zh-hant/', 'ja/']) {
        await page.goto(`https://local.test/${language}`);
        await page.locator('#player-tier').filter({ hasText: /TIER/ }).waitFor();
        assert.equal(await page.locator('.holo-rpm-badge').textContent(),
          language === 'zh-hans/' ? '陀螺预览' : language === 'zh-hant/' ? '陀螺預覽' : language === 'ja/' ? 'コマプレビュー' : 'TOP PREVIEW');
        const lowContrast = await page.evaluate(() => {
          const luminance = rgb => {
            const values = rgb.map(value => value / 255)
              .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
            return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
          };
          return [...document.querySelectorAll('.arena-eyebrow, .arena-status-msg, .streak-badge, '
            + '.vs-text, #battle-phase, .card-title-row h3, .holo-rpm-badge, .stat-info strong, .slider-label strong')]
            .filter(element => {
              const foreground = luminance(getComputedStyle(element).color.match(/\d+/g).slice(0, 3).map(Number));
              // Use the darkest background stop behind these light-theme labels.
              const background = luminance(element.matches('.holo-rpm-badge') ? [224, 242, 254] : [248, 250, 252]);
              return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05) < 4.5;
            }).map(element => element.className || element.id);
        });
        assert.deepEqual(lowContrast, [], `${language || 'en'}: small accent text must reach 4.5:1`);
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
        await page.waitForFunction(() => {
          const canvas = document.getElementById('battleCanvas');
          if (!canvas || !canvas.width || !canvas.height) return false;
          const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
          const colors = new Set();
          for (let i = 0; i < pixels.length; i += 64) {
            colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]},${pixels[i + 3]}`);
            if (colors.size > 32) return true;
          }
          return false;
        });
        await page.goto(`https://local.test/${language}guide/`);
        assert.equal(await page.locator('.prose-card h1').evaluate(element =>
          getComputedStyle(element).color === getComputedStyle(element.parentElement).backgroundColor
        ), false, 'Heading must contrast with its background');
      }
    }
    for (const width of [390, 1061, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const language of ['', 'zh-hans/', 'zh-hant/', 'ja/']) {
        await page.goto(`https://local.test/${language}?mode=2p`);
        await page.locator('#player-tier').filter({ hasText: /TIER/ }).waitFor();
        await page.locator('#rival-mode-select').selectOption('custom');
        for (const phase of ['ready', 'battling']) {
          if (phase === 'battling') {
            await page.evaluate(() => {
              const game = window.emojiBladeApp;
              game.playerTop.launch(0, 85); game.enemyTop.launch(180, 85);
              game.battleState = 'battling';
            });
          }
          await page.waitForFunction(expected =>
            document.querySelector('.battle-station').dataset.phase === expected, phase);
          await page.waitForFunction(() => {
            const canvas = document.getElementById('battleCanvas');
            const rect = canvas.parentElement.getBoundingClientRect();
            return Math.abs(canvas.height / devicePixelRatio - rect.height) < 1;
          });
          const layout = await page.evaluate(() => {
            const rect = selector => document.querySelector(selector).getBoundingClientRect();
            const sides = [rect('.player-config'), rect('.launch-config')];
            const arena = rect('.arena-viewport-wrapper');
            const dash = rect('.dash-controls');
            return { sides: sides.map(r => ({ top: r.top, bottom: r.bottom })),
              top: arena.top, bottom: dash.height ? dash.bottom : arena.bottom,
              overflow: document.documentElement.scrollWidth > innerWidth,
              mobileMinHeight: getComputedStyle(document.querySelector('.launch-config')).minHeight };
          });
          assert.equal(layout.overflow, false);
          if (width > 1060) {
            for (const side of layout.sides) {
              assert.ok(Math.abs(side.top - layout.top) < 1 && Math.abs(side.bottom - layout.bottom) < 1,
                `${language || 'en'} ${width}px ${phase}: deck edges must align`);
            }
          } else {
            assert.equal(layout.mobileMinHeight, '0px');
          }
        }
      }
    }
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['2-player-duel', 'spinning-top-simulator', 'guide']) {
        await page.goto(`https://local.test/${route}/`);
        const image = page.locator('.game-screenshot img');
        await image.waitFor();
        const loaded = await image.evaluate(element => ({
          loaded: element.complete && element.naturalWidth === 1200,
          ratio: element.naturalHeight === Number(element.getAttribute('height')),
          fits: element.getBoundingClientRect().right <= window.innerWidth,
        }));
        assert.deepEqual(loaded, { loaded: true, ratio: true, fits: true }, `${route} screenshot at ${width}px`);
      }
    }
    for (const [prefix, countdown, finished] of [['', 'COUNTDOWN', 'FINISHED'],
      ['zh-hans/', '发射倒计时', '对战结束'], ['zh-hant/', '發射倒數', '對戰結束'], ['ja/', 'カウントダウン', 'バトル終了']]) {
      await page.goto(`https://local.test/${prefix}`);
      await page.locator('#main-launch-btn').click();
      await page.waitForFunction(expected => document.getElementById('battle-phase').textContent === expected, countdown);
      await page.locator('#cancel-launch-btn').click();
      await page.evaluate(() => { window.emojiBladeApp.battleState = 'finished'; });
      await page.waitForFunction(expected => document.getElementById('battle-phase').textContent === expected, finished);
    }
    await page.goto('https://local.test/zh-hant/?mode=2p');
    await page.waitForFunction(() => document.getElementById('battle-phase').textContent === '玩家 1 就緒');
    assert.match(await page.locator('#player-dash-btn').getAttribute('aria-label'), /玩家 1 衝刺：目前無法使用/);
    await page.evaluate(() => {
      const game = window.emojiBladeApp;
      game.playerTop.isSpinning = true;
      game.playerTop.energy = 50;
      game.enemyTop.energy = 0;
      game.battleState = 'battling';
      game.checkBattleOutcome();
    });
    await page.locator('#result-modal').waitFor({ state: 'visible' });
    assert.match(await page.locator('#result-summary').textContent(), /獲勝！/);
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
        await page.waitForFunction(() => document.getElementById('player-energy-bar')
          .getAnimations().some(animation => animation.animationName === 'energy-alert'));
        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(await page.locator('#player-energy-bar').evaluate(element =>
          element.getAnimations().some(animation => animation.animationName === 'energy-alert')
        ), false, 'Reduced motion must disable the low-energy animation');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.evaluate(() => {
          const game = window.emojiBladeApp;
          game.playerTop.launch(0, 85);
          game.enemyTop.launch(180, 85);
          game.battleState = 'battling';
          game.battleStartTime = performance.now();
          document.activeElement.blur();
        });
        await page.keyboard.press('Space');
        assert.ok(await page.evaluate(() => window.emojiBladeApp.playerTop.dashCooldown > 0));
        assert.equal(await page.evaluate(() => {
          const game = window.emojiBladeApp;
          const before = game.playerTop.energy;
          return !game.requestDash() && before === game.playerTop.energy;
        }), true, 'Blocked repeat must not spend energy');
        if (mode) {
          await page.keyboard.press('Enter');
          assert.ok(await page.evaluate(() => window.emojiBladeApp.enemyTop.dashCooldown > 0));
        } else {
          assert.equal(await page.locator('#enemy-dash-btn').isVisible(), false);
        }
        await page.evaluate(() => {
          const game = window.emojiBladeApp;
          game.playerTop.x = game.arenaCenterX - 25;
          game.enemyTop.x = game.arenaCenterX + 25;
          game.playerTop.y = game.enemyTop.y = game.arenaCenterY;
          game.playerTop.vx = 5; game.enemyTop.vx = -5;
          game.playerTop.vy = game.enemyTop.vy = 0;
          game.handleTopCollisions();
        });
        await page.locator('#smash-feedback').waitFor({ state: 'visible' });
        assert.equal(await page.evaluate(() => window.emojiBladeApp.playerTop.dashTicks), 0);
        await page.evaluate(() => window.emojiBladeApp.setupStage());
        await page.locator('#smash-feedback').waitFor({ state: 'hidden' });
      }
    }
    for (const key of ['Space', 'Enter']) {
      await page.goto('https://local.test/?mode=2p');
      await page.waitForFunction(() => !!window.emojiBladeApp);
      await page.keyboard.down(key);
      assert.equal(await page.evaluate(() => window.emojiBladeApp.turn2P), 2);
      await page.keyboard.down(key);
      assert.equal(await page.evaluate(() => window.emojiBladeApp.battleState), 'ready', 'Held launch must not submit P2');
      await page.keyboard.up(key);
      await page.keyboard.press(key);
      assert.equal(await page.evaluate(() => window.emojiBladeApp.battleState), 'countdown');
      await page.keyboard.press('Escape');
      await page.locator('#sound-toggle-btn').focus();
      const soundBefore = await page.locator('#sound-icon').textContent();
      await page.keyboard.press(key);
      assert.notEqual(await page.locator('#sound-icon').textContent(), soundBefore, 'Focused button keeps native activation');
      assert.equal(await page.evaluate(() => window.emojiBladeApp.turn2P), 1);
    }
    for (const [prefix, normal, xtreme] of [
      ['', 'CRITICAL SMASH!', '⚡ XTREME SMASH!'],
      ['zh-hans/', '暴击冲撞！', '⚡ 极限暴击！'],
      ['zh-hant/', '暴擊衝撞！', '⚡ 極限暴擊！'],
      ['ja/', 'クリティカルスマッシュ！', '⚡ エクストリームスマッシュ！'],
    ]) {
      await page.goto(`https://local.test/${prefix}`);
      await page.waitForFunction(() => !!window.emojiBladeApp);
      for (const isXtreme of [true, false]) {
        await page.evaluate(xtreme => {
          const game = window.emojiBladeApp;
          game.battleState = 'battling';
          Object.assign(game.playerTop, { x: 200, y: 200, vx: 5, vy: 0, isSpinning: true, dashTicks: 8, xtremeTicks: xtreme ? 16 : 0 });
          Object.assign(game.enemyTop, { x: 240, y: 200, vx: -5, vy: 0, isSpinning: true, xtremeTicks: 0 });
          game.handleTopCollisions();
        }, isXtreme);
        assert.equal(await page.locator('#smash-feedback strong').textContent(), isXtreme ? xtreme : normal);
      }
    }
    if (process.env.SCREENSHOT_PATH) {
      await page.setViewportSize({ width: 390, height: 900 });
      await page.goto('https://local.test/');
      await page.screenshot({ path: process.env.SCREENSHOT_PATH });
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto('https://local.test/zh-hant/');
        await page.locator('#player-tier').filter({ hasText: /TIER/ }).waitFor();
        await page.screenshot({ path: process.env.SCREENSHOT_PATH.replace('.png', `-zh-hant-${width}.png`), fullPage: true });
      }
    }
    assert.deepEqual(errors, [], 'Browser runtime errors');
    console.log('PASS: HUD and guide headings in four languages at five viewport widths; localized phases/results; solo/2P launch cancellation');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
