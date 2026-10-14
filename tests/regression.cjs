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
  clearInterval(id) { timers.delete(id); }, clearTimeout() {}, Intl,
};
vm.createContext(context);
vm.runInContext(source.replace("  window.addEventListener('DOMContentLoaded'", "  window.audit = { EmojiTop, EmojiBladeGame, readStored, writeStored, normalizeEmoji, computeEmojiStats };\n  window.addEventListener('DOMContentLoaded'"), context);
const { EmojiTop, EmojiBladeGame, readStored, writeStored, normalizeEmoji, computeEmojiStats } = context.window.audit;
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
    unlockedBadges: ['🔥'], bestStreakEl: {}, streakCounter: {}, particles: { emitSparks() {} } });
  g.playerTop.isSpinning = true;
  g.enemyTop.energy = 0;
  g.checkBattleOutcome();
  assert.equal(g.winStreak, expected);
  assert.equal(g.stage, expected);
  assert.equal(g.bestStreak, expected);
}
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
console.log('PASS: blocked/corrupt storage, emoji graphemes, countdown cleanup, refresh-rate physics, separating collisions, character stats, FAQ mass values');
