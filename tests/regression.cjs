const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
let nextTimer = 0;
const timers = new Map();
const context = {
  window: { addEventListener() {} }, performance: { now: () => 0 },
  document: { querySelectorAll: () => [] }, requestAnimationFrame() {},
  localStorage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } },
  setInterval(fn) { timers.set(++nextTimer, fn); return nextTimer; },
  clearInterval(id) { timers.delete(id); }, clearTimeout() {}, Intl, URLSearchParams,
};
vm.createContext(context);
vm.runInContext(source.replace("  window.addEventListener('DOMContentLoaded'", "  window.audit = { EmojiTop, EmojiBladeGame, readStored, writeStored, normalizeEmoji, computeEmojiStats, dashButtonLabel };\n  window.addEventListener('DOMContentLoaded'"), context);
const { EmojiTop, EmojiBladeGame, readStored, writeStored, normalizeEmoji, computeEmojiStats, dashButtonLabel } = context.window.audit;
assert.equal(readStored('test', 'fallback'), 'fallback');
assert.doesNotThrow(() => writeStored('test', 'value'));
assert.equal(normalizeEmoji('👩‍🚀extra'), '👩‍🚀');
const element = () => ({ value: '50', style: {}, classList: { add() {}, remove() {} } });
function game() {
  const g = Object.create(EmojiBladeGame.prototype);
  Object.assign(g, { battleState: 'ready', is2PMode: false, countdownOverlay: element(),
    powerSlider: element(), angleSlider: element(), launchBtn: element(), statusMsg: element() });
  return g;
}
const countdown = game();
let launches = 0;
countdown.executeLaunch = () => { launches++; countdown.battleState = 'battling'; };
countdown.startLaunchSequence();
countdown.battleState = 'ready';
countdown.startLaunchSequence();
for (let i = 0; i < 8; i++) for (const [id, fn] of [...timers]) if (timers.has(id)) fn();
assert.equal(launches, 1);
assert.equal(timers.size, 0);
function simulate(fps) {
  const g = game();
  const top = new EmojiTop(true);
  top.reset(10, 10); top.launch(0, 50); top.draw = () => {};
  Object.assign(g, { battleState: 'battling', playerTop: top, enemyTop: { update() {}, draw() {} },
    canvas: { parentElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) } },
    ctx: { clearRect() {} }, arenaCenterX: 0, arenaCenterY: 0, arenaRadius: 1000,
    particles: { updateAndDraw() {} }, drawArena() {}, handleTopCollisions() {},
    updateHudBars() {}, checkBattleOutcome() {}, drawSlingshotGuide() {} });
  for (let i = 0; i <= fps * 10; i++) g.loop(i * 1000 / fps);
  return top;
}
const slow = simulate(60), fast = simulate(120);
assert.ok(Math.abs(slow.energy - fast.energy) < 0.07);
assert.ok(Math.abs(slow.x - fast.x) < 1);
const dashTop = new EmojiTop(true);
dashTop.reset(0, 0);
assert.equal(dashTop.dash(), false, 'Cannot dash before launch');
dashTop.launch(0, 85);
const beforeDash = Math.hypot(dashTop.vx, dashTop.vy);
assert.equal(dashTop.dash(), true);
assert.equal(dashTop.energy, 94);
assert.ok(Math.hypot(dashTop.vx, dashTop.vy) > beforeDash);
assert.ok(Math.hypot(dashTop.vx, dashTop.vy) <= 18);
assert.equal(dashTop.dash(), false, 'Rapid repeat must not consume more energy');
assert.equal(dashTop.energy, 94);
for (let i = 0; i < 59; i++) dashTop.update(0, 0, 10000);
assert.equal(dashTop.dash(), false, 'Cooldown lasts a full second of simulation');
dashTop.update(0, 0, 10000);
assert.equal(dashTop.dash(), true);
dashTop.dashCooldown = 0; dashTop.energy = 6;
assert.equal(dashTop.dash(), false, 'Cannot spend the last energy');
dashTop.reset(0, 0);
assert.equal(dashTop.dashCooldown, 0);
assert.equal(dashTop.dashTicks, 0);
assert.equal(dashTop.trail.length, 0);
dashTop.launch(0, 85);
dashTop.vx = 25;
assert.equal(dashTop.dash(), true);
assert.equal(dashTop.vx, 25, 'Dash must not slow a top already above the boost cap');
const dashGame = game();
assert.equal(dashGame.requestDash(), false, 'Cannot dash during setup');
dashGame.battleState = 'battling';
assert.equal(dashGame.requestDash(true), false, 'Solo player cannot control the AI top');
context.document.documentElement = { lang: 'en' };
assert.equal(dashButtonLabel(1, { isSpinning: false }, 'ready'), 'Player 1 dash: unavailable');
context.document.documentElement.lang = 'zh-Hans';
assert.equal(dashButtonLabel(1, { isSpinning: true, dashCooldown: 30, energy: 100 }, 'battling'), '玩家 1 冲刺：冷却 0.5 秒');
context.document.documentElement.lang = 'ja';
assert.equal(dashButtonLabel(2, { isSpinning: true, dashCooldown: 0, energy: 100 }, 'battling'), 'プレイヤー2 ダッシュ：使用可能、エネルギーを6消費します');
console.log('PASS: dash launch guard, energy cost, cooldown, speed limit, reset and mode guards');
// A critical hit must stop catch-up immediately and discard only paused time.
let stoppedUpdates = 0;
const hitStop = game();
Object.assign(hitStop, {
  battleState: 'battling', lastFrameTime: 900, physicsAccumulator: 50, hitStopUntil: 1045,
  canvas: { parentElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) } },
  ctx: { clearRect() {} }, playerTop: { update() { stoppedUpdates++; }, draw() {} },
  enemyTop: { update() {}, draw() {} }, particles: { updateAndDraw() {} },
  drawArena() {}, handleTopCollisions() {}, updateHudBars() {}, checkBattleOutcome() {}, drawSlingshotGuide() {},
});
hitStop.loop(1000);
assert.equal(stoppedUpdates, 0, 'No physics updates during hit-stop');
hitStop.loop(1046);
assert.equal(stoppedUpdates, 0, 'Do not catch up the paused portion of the resume frame');
hitStop.loop(1063);
assert.equal(stoppedUpdates, 1, 'Resume physics after enough unpaused time');
hitStop.lastFrameTime = 1900;
hitStop.hitStopUntil = 0;
hitStop.handleTopCollisions = () => { hitStop.hitStopUntil = 2045; };
hitStop.loop(2000);
assert.equal(stoppedUpdates, 2, 'Critical hit must interrupt the current catch-up batch');
assert.equal(hitStop.physicsAccumulator, 0, 'Discard the interrupted catch-up backlog');
console.log('PASS: hit-stop freezes physics, interrupts catch-up and excludes paused time on resume');
const collision = game();
collision.playerTop = new EmojiTop(true); collision.enemyTop = new EmojiTop(false);
Object.assign(collision.playerTop, { x: 0, y: 0, vx: -1, vy: 0, isSpinning: true });
Object.assign(collision.enemyTop, { x: 50, y: 0, vx: 1, vy: 0, isSpinning: true });
collision.battleHits = 0;
collision.handleTopCollisions();
assert.equal(collision.battleHits, 0);
assert.equal(collision.playerTop.energy, 100);
assert.equal(collision.playerTop.vx, -1);
const methods = ['initDom', 'initEvents', 'checkUrlDeepLink', 'resizeCanvas', 'setupStage', 'updateStatsUI', 'renderBadges'];
const originals = methods.map(name => EmojiBladeGame.prototype[name]);
context.document.getElementById = () => ({ getContext: () => ({}) });
for (const name of methods) EmojiBladeGame.prototype[name] = () => {};
for (const value of ['{broken', '{}', 'null', '42', '["👩‍🚀",7,null]']) {
  context.localStorage.getItem = key => key === 'emojiblade_badges' ? value : 'NaN';
  const g = new EmojiBladeGame();
  assert.equal(g.bestStreak, 0);
  assert.ok(Array.isArray(g.unlockedBadges));
  assert.ok(g.unlockedBadges.every(x => typeof x === 'string'));
}
methods.forEach((name, index) => { EmojiBladeGame.prototype[name] = originals[index]; });
context.document.documentElement = { lang: 'en' };
context.document.getElementById = () => ({ style: {}, textContent: '' });
context.setTimeout = () => 0;
for (const [twoPlayers, mode, expected] of [[true, 'progression', 4], [false, 'custom', 4], [false, 'progression', 5]]) {
  const g = game();
  Object.assign(g, { battleState: 'battling', is2PMode: twoPlayers, rivalModeSelect: { value: mode },
    playerTop: new EmojiTop(true), enemyTop: new EmojiTop(false),
    winStreak: 4, bestStreak: 4, stage: 4, battleHits: 0, battleStartTime: 0,
    unlockedBadges: ['🔥'], bestStreakEl: {}, streakCounter: {}, nextBattleBtn: element(), particles: { emitSparks() {} } });
  g.playerTop.isSpinning = true;
  g.enemyTop.energy = 0;
  g.checkBattleOutcome();
  assert.equal(g.winStreak, expected);
  assert.equal(g.stage, expected);
  assert.equal(g.bestStreak, expected);
}
for (const [lang, next, retry, again] of [
  ['en', 'Next Stage ⚡', 'Retry Stage ⚡', 'Play Again ⚡'],
  ['zh-Hans', '下一关 ⚡', '重试本关 ⚡', '再来一局 ⚡'],
  ['zh-Hant', '下一關 ⚡', '重試本關 ⚡', '再來一局 ⚡'],
  ['ja', '次のステージ ⚡', 'このステージを再挑戦 ⚡', 'もう一度対戦 ⚡']
]) {
  context.document.documentElement.lang = lang;
  for (const [twoPlayers, mode] of [[false, 'progression'], [false, 'custom'], [false, 'random'], [true, 'progression']]) {
    for (const outcome of ['win', 'loss', 'draw']) {
      const g = game();
      Object.assign(g, { battleState: 'battling', is2PMode: twoPlayers, rivalModeSelect: { value: mode },
        playerTop: new EmojiTop(true), enemyTop: new EmojiTop(false),
        winStreak: 4, bestStreak: 4, stage: 4, battleHits: 0, battleStartTime: 0,
        unlockedBadges: ['🔥'], bestStreakEl: {}, streakCounter: {}, nextBattleBtn: element(),
        particles: { emitSparks() {} } });
      g.playerTop.isSpinning = g.enemyTop.isSpinning = true;
      g.playerTop.energy = outcome === 'win' ? 50 : 0;
      g.enemyTop.energy = outcome === 'loss' ? 50 : 0;
      g.checkBattleOutcome();
      const progression = !twoPlayers && mode === 'progression';
      assert.equal(g.nextBattleBtn.textContent, progression ? (outcome === 'win' ? next : retry) : again);
      assert.equal(g.stage, progression && outcome === 'win' ? 5 : 4);
      assert.equal(g.winStreak, progression ? (outcome === 'win' ? 5 : outcome === 'loss' ? 0 : 4) : 4);
    }
  }
}
context.document.documentElement.lang = 'en';
for (const [slug, emoji] of Object.entries({ fire: '🔥', bomb: '💣', lightning: '⚡', diamond: '💎', moai: '🗿', rocket: '🚀', skull: '💀', clown: '🤡', pizza: '🍕', tornado: '🌪️' })) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'characters', slug, 'index.html'), 'utf8');
  const stats = computeEmojiStats(emoji);
  const printed = [...html.matchAll(/<strong>(\d+) \/ 100<\/strong>/g)].map(m => Number(m[1]));
  assert.deepEqual(printed, [stats.mass, stats.attack, stats.speed, stats.endurance], `${slug} content must match engine`);
}
// These published FAQ numbers must be revised if the underlying presets change.
const faq = fs.readFileSync(path.join(__dirname, '..', 'faq', 'index.html'), 'utf8');
assert.equal(computeEmojiStats('🗿').mass, 100);
assert.equal(computeEmojiStats('👹').mass, 110);
const boss = new EmojiTop(false);
boss.configure('👹', 'blaze', true);
assert.equal(boss.stats.mass, 149);
assert.ok(faq.includes('raises that to 149'));
assert.ok(faq.includes('28% random chance'));
for (const search of ['?mode=2p', '?mode=2p&emoji=%F0%9F%94%A5&rival=%F0%9F%94%A5', '?mode=remote']) {
  context.window.location = { search };
  const g = game();
  const active = new Set(['single']);
  Object.assign(g, { playerInput: element(), playerTop: new EmojiTop(true),
    rivalModeSelect: { value: 'progression' }, customEnemyInput: element(),
    mode2PBtn: { classList: { add() { active.add('2p'); } } },
    modeStreakBtn: { classList: { remove() { active.delete('single'); } } } });
  g.checkUrlDeepLink();
  const local = search.includes('mode=2p');
  assert.equal(g.is2PMode, local);
  assert.equal(active.has('2p'), local);
  assert.equal(active.has('single'), !local);
  assert.equal(g.rivalModeSelect.value, local ? 'custom' : 'progression');
  if (local) {
    assert.equal(g.customEnemyInput.style.display, 'inline-block');
    assert.equal(g.customEnemyInput.value, search.includes('rival=') ? '🔥' : '💎');
  }
  if (search.includes('emoji=')) assert.equal(g.playerTop.emoji, '🔥');
}
const library = fs.readFileSync(path.join(__dirname, '..', 'characters', 'index.html'), 'utf8');
const rows = [...library.matchAll(/<tr data-preset="([^"]+)">.*?<td>([^<]+)<\/td><td>(\d+)<\/td><td>(\d+)<\/td><td>(\d+)<\/td><td>(\d+)<\/td><\/tr>/g)];
assert.equal(rows.length, 16);
assert.equal(new Set(rows.map(row => row[1])).size, 16);
for (const [, emoji, tier, ...numbers] of rows) {
  const stats = computeEmojiStats(emoji);
  assert.equal(tier, stats.tier);
  assert.deepEqual(numbers.map(Number), [stats.mass, stats.attack, stats.speed, stats.endurance]);
}
for (const twoPlayers of [false, true]) {
  const g = game();
  Object.assign(g, { stage: 5, winStreak: 0, stageNumEl: element(), streakCounter: element(),
    rivalModeSelect: { value: 'progression' }, playerTop: new EmojiTop(true), enemyTop: new EmojiTop(false),
    particles: { clear() {} }, resultModal: element(), nextBattleBtn: element(),
    resetPositions() {}, updateHudBars() {}, is2PMode: twoPlayers });
  g.setupStage();
  assert.equal(g.enemyTop.stats.mass, twoPlayers ? 110 : 149);
  assert.equal(g.enemyTop.isBoss, !twoPlayers);
  assert.equal(g.statusMsg.textContent.includes('BOSS APPROACHING'), !twoPlayers);
  assert.equal(g.nextBattleBtn.textContent, twoPlayers ? 'Play Again ⚡' : 'Next Stage ⚡');
}
console.log('PASS: blocked/corrupt storage, emoji graphemes, countdown cleanup, refresh-rate physics, separating collisions, character stats, FAQ mass values');
console.log('PASS: local 2P deep links, unknown-mode fallback, all 16 published preset ratings, local Boss labels');

// Published matchup links must select the promised presets, not a random/progression opponent.
const expandedPresets = { crown: '👑', dragon: '🐉', oni: '👹', invader: '👾', diamond: '💎', bomb: '💣', lightning: '⚡', moai: '🗿', fire: '🔥' };
for (const locale of ['', 'zh-hans/', 'zh-hant/', 'ja/']) {
  for (const slug of ['crown', 'dragon', 'oni', 'invader']) {
    const html = fs.readFileSync(path.join(__dirname, '..', locale, 'characters', slug, 'index.html'), 'utf8');
    const row = html.match(new RegExp(`<tr data-preset="${slug}">([\\s\\S]*?)</tr>`));
    const numbers = [...row[1].matchAll(/<td>(\d+)<\/td>/g)].map(m => Number(m[1]));
    const stats = computeEmojiStats(expandedPresets[slug]);
    assert.deepEqual(numbers, [stats.mass, stats.attack, stats.speed, stats.endurance]);
  }
  for (const slug of ['diamond-vs-bomb', 'lightning-vs-moai', 'fire-vs-diamond']) {
    const html = fs.readFileSync(path.join(__dirname, '..', locale, 'vs', slug, 'index.html'), 'utf8');
    const [left, right] = slug.split('-vs-');
    for (const preset of [left, right]) {
      const row = html.match(new RegExp(`<tr data-preset="${preset}">([\\s\\S]*?)</tr>`));
      const numbers = [...row[1].matchAll(/<td>(\d+)<\/td>/g)].map(m => Number(m[1]));
      const stats = computeEmojiStats(expandedPresets[preset]);
      assert.deepEqual(numbers, [stats.mass, stats.attack, stats.speed, stats.endurance]);
    }
    const href = html.match(/href="([^"]*\?mode=2p[^"]*)"/)[1].replaceAll('&amp;', '&');
    const target = new URL(href, 'https://emojiblade.online');
    assert.equal(target.pathname, '/' + locale);
    context.window.location = { search: target.search };
    const g = game();
    Object.assign(g, { playerInput: element(), playerTop: new EmojiTop(true),
      rivalModeSelect: { value: 'progression' }, customEnemyInput: element(),
      mode2PBtn: element(), modeStreakBtn: element() });
    g.checkUrlDeepLink();
    assert.equal(g.is2PMode, true);
    assert.equal(g.playerTop.emoji, expandedPresets[left]);
    assert.equal(g.customEnemyInput.value, expandedPresets[right]);
    assert.equal(g.rivalModeSelect.value, 'custom');
  }
}
const invaderBoss = new EmojiTop(false);
invaderBoss.configure('👾', 'blaze', true);
assert.equal(invaderBoss.stats.mass, 97);
assert.equal(invaderBoss.stats.attack, 108);
console.log('PASS: four-language expansion ratings, all twelve matchup launch links, stage 10 Boss ratings');
console.log('PASS: 48 result-button cases across languages, modes and outcomes; stage and streak preservation');
for (const locale of ['zh-hans', 'zh-hant', 'ja']) {
  for (const route of ['characters', 'tier-list']) {
    const html = fs.readFileSync(path.join(__dirname, '..', locale, route, 'index.html'), 'utf8');
    const rows = [...html.matchAll(/<tr data-preset="([^"]+)">.*?<td>([^<]+)<\/td><td>(\d+)<\/td><td>(\d+)<\/td><td>(\d+)<\/td><td>(\d+)<\/td><\/tr>/g)];
    assert.equal(rows.length, 16);
    assert.equal(new Set(rows.map(row => row[1])).size, 16);
    for (const [, emoji, tier, ...numbers] of rows) {
      const stats = computeEmojiStats(emoji);
      assert.equal(tier, stats.tier);
      assert.deepEqual(numbers.map(Number), [stats.mass, stats.attack, stats.speed, stats.endurance]);
    }
  }
  const faq = fs.readFileSync(path.join(__dirname, '..', locale, 'faq', 'index.html'), 'utf8');
  for (const number of ['28%', '7.5', '1.5', '110', '149', '35%', '25%']) assert.ok(faq.includes(number));
}
console.log('PASS: localized character/tier tables and FAQ numeric mechanics');
(async () => {
  const embedSource = fs.readFileSync(path.join(__dirname, '..', 'embed.js'), 'utf8');
  for (const result of ['success', 'denied', 'missing']) {
    let click, selected = false, copied = '';
    const code = { value: '<iframe></iframe>', focus() {}, select() { selected = true; } };
    const status = {};
    const button = { addEventListener(name, handler) { click = handler; } };
    const clipboard = result === 'missing' ? undefined : { async writeText(value) {
      if (result === 'denied') throw Error('denied');
      copied = value;
    } };
    vm.runInNewContext(embedSource, { navigator: { clipboard }, document: { getElementById(id) {
      return id === 'copy-embed-btn' ? button : id === 'embed-code-text' ? code : status;
    } } });
    await click();
    assert.equal(selected, true);
    assert.equal(copied, result === 'success' ? code.value : '');
    assert.ok(status.textContent.includes(result === 'success' ? 'copied' : 'unavailable'));
  }
  console.log('PASS: embed clipboard success, denial and unavailable fallback');
})().catch(error => { console.error(error); process.exitCode = 1; });
