/**
 * EMOJI BLADE - Spin Top Battle Physics Engine 2.0 (Full Edition)
 * Features:
 * - "3, 2, 1, GO SHOOT!" Launch countdown ceremony
 * - Enhanced 3D top graphics with 4 dynamic armor rings and neon glow trails
 * - Heavy physical collision impact, gravity sparks, and critical screen shake
 * - True 2P Turn-based local multiplayer mode (P1 launch -> P2 launch -> CLASH)
 * - Stage Boss battles every 5th stage (Titan 👹, Giant 👾, Void 💀)
 * - Interactive Sound Synthesizer via Web Audio API (metallic clashes, whoosh, fanfare)
 * - Local storage achievements & trophies system
 * - Deep linking support (e.g. ?emoji=💣)
 */

(function () {
  'use strict';

  function readStored(key, fallback) {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  }
  function writeStored(key, value) {
    try { localStorage.setItem(key, value); } catch { /* Storage is optional. */ }
  }
  function normalizeEmoji(value) {
    const text = String(value || '').trim().slice(0, 128);
    if (!text) return '🔥';
    if (typeof Intl.Segmenter === 'function') {
      return new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)[Symbol.iterator]().next().value.segment;
    }
    return Array.from(text)[0];
  }

  function translate(text) {
    const lang = document.documentElement?.lang;
    const messages = {
      'Drag player top or set angle & launch!': ['拖动陀螺，或设置角度后发射！', 'コマをドラッグするか、角度を設定して発射！'],
      '⚠️ WARNING: BOSS APPROACHING!': ['⚠️ Boss 来袭！', '⚠️ ボスが登場！'],
      '👉 PLAYER 2 TURN: Aim Rival & Launch!': ['👉 玩家二：设置角度和力度后发射！', '👉 プレイヤー2：角度とパワーを設定して発射！'],
      '⚡ CLASH IN PROGRESS!': ['⚡ 对战进行中！', '⚡ 対戦中！'],
      'VICTORY! 🏆': ['胜利！🏆', '勝利！🏆'], 'DEFEAT 💥': ['落败 💥', '敗北 💥'],
      'PLAYER 1 WINS!': ['玩家一获胜！', 'プレイヤー1の勝利！'],
      'PLAYER 2 WINS!': ['玩家二获胜！', 'プレイヤー2の勝利！'],
      'DRAW': ['平局', '引き分け'], 'Both tops stopped together. Play again!': ['双方同时停止，再来一场！', '両方のコマが止まりました。もう一度！'],
      'Outspun': ['耐力获胜', '持久力勝利'], 'Spin Depleted': ['能量耗尽', 'エネルギー切れ'],
      'Play Again ⚡': ['再来一局 ⚡', 'もう一度対戦 ⚡'],
      'Next Stage ⚡': ['下一关 ⚡', '次のステージ ⚡'],
      'Retry Stage ⚡': ['重试本关 ⚡', 'このステージを再挑戦 ⚡'],
    };
    return messages[text]?.[lang === 'zh-Hans' ? 0 : lang === 'ja' ? 1 : 2] || text;
  }

  // --- AUDIO SYNTHESIZER ---
  class SoundFX {
    constructor() {
      this.ctx = null;
      this.enabled = true;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    playClash(intensity = 1, isCritical = false) {
      if (!this.enabled || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = isCritical ? 'triangle' : 'square';
        osc.frequency.setValueAtTime(isCritical ? 120 : 260, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.16);

        gain.gain.setValueAtTime(Math.min(0.45 * intensity, 0.85), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.17);

        // Metallic clink / Noise spark
        const bufferSize = this.ctx.sampleRate * 0.06;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime((isCritical ? 0.3 : 0.15) * intensity, now);
        nGain.gain.linearRampToValueAtTime(0.001, now + 0.06);
        noise.connect(nGain);
        nGain.connect(this.ctx.destination);
        noise.start(now);
      } catch (e) { }
    }

    playLaunch() {
      if (!this.enabled || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.32);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.36);
      } catch (e) { }
    }

    playCountdown(pitch = 440) {
      if (!this.enabled || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitch, now);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      } catch (e) { }
    }

    playWin() {
      if (!this.enabled || !this.ctx) return;
      try {
        const notes = [261.6, 329.6, 392.0, 523.2, 659.2];
        notes.forEach((freq, idx) => {
          const now = this.ctx.currentTime + idx * 0.08;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.26);
        });
      } catch (e) { }
    }
  }

  const sfx = new SoundFX();

  // --- EMOJI ATTRIBUTE CALCULATION SYSTEM ---
  const EMOJI_PRESETS = {
    '🔥': { mass: 76, attack: 95, speed: 88, endurance: 68, tier: 'A', name: 'Inferno Fire', desc: 'Explosive blaze momentum' },
    '💣': { mass: 90, attack: 98, speed: 70, endurance: 65, tier: 'A', name: 'Heavy Bomb', desc: 'Devastating shockwave clash' },
    '⚡': { mass: 60, attack: 88, speed: 99, endurance: 74, tier: 'S', name: 'Lightning Volt', desc: 'Max RPM speed, electric cuts' },
    '💎': { mass: 96, attack: 72, speed: 65, endurance: 98, tier: 'S', name: 'Diamond Core', desc: 'Extreme defensive mass density' },
    '🚀': { mass: 78, attack: 92, speed: 96, endurance: 64, tier: 'A', name: 'Cosmic Rocket', desc: 'Piercing linear velocity' },
    '🥊': { mass: 84, attack: 91, speed: 82, endurance: 76, tier: 'A', name: 'Brawler Punch', desc: 'Heavy knockout punch recoil' },
    '🤡': { mass: 70, attack: 76, speed: 84, endurance: 82, tier: 'B', name: 'Chaos Clown', desc: 'Unpredictable wobble bounce' },
    '💀': { mass: 74, attack: 94, speed: 84, endurance: 70, tier: 'A', name: 'Grim Skull', desc: 'Lethal sharp edge attacks' },
    '🗿': { mass: 100, attack: 68, speed: 52, endurance: 100, tier: 'S', name: 'Moai Fortress', desc: 'Immovable ancient rock armor' },
    '🍕': { mass: 74, attack: 70, speed: 78, endurance: 86, tier: 'B', name: 'Pizza Wheel', desc: 'Balanced circular distribution' },
    '👑': { mass: 86, attack: 88, speed: 86, endurance: 88, tier: 'S', name: 'Royal Crown', desc: 'Emperor all-round stat line' },
    '🌪️': { mass: 65, attack: 78, speed: 94, endurance: 94, tier: 'B', name: 'Vortex Tornado', desc: 'Stamina siphon & outspinning' },
    '🥑': { mass: 75, attack: 68, speed: 75, endurance: 82, tier: 'B', name: 'Avocado Seed', desc: 'Dense organic weighted core' },
    '👾': { mass: 72, attack: 86, speed: 90, endurance: 78, tier: 'A', name: 'Retro Invader', desc: 'Cyber geometry kinetic strike' },
    '👹': { mass: 110, attack: 100, speed: 75, endurance: 90, tier: 'BOSS', name: 'Oni Demon Boss', desc: 'Colossal titan boss brute' },
    '🐉': { mass: 92, attack: 96, speed: 90, endurance: 84, tier: 'S', name: 'Mythic Dragon', desc: 'Supreme elemental power' }
  };

  function computeEmojiStats(emoji) {
    if (EMOJI_PRESETS[emoji]) return { ...EMOJI_PRESETS[emoji] };
    
    // Hash-based deterministic computation for ANY emoji/character
    let hash = 0;
    for (let i = 0; i < emoji.length; i++) {
      hash = (hash << 5) - hash + emoji.charCodeAt(i);
      hash |= 0;
    }
    const absH = Math.abs(hash);
    const mass = 55 + (absH % 45);
    const attack = 60 + ((absH >>> 3) % 40);
    const speed = 60 + ((absH >>> 5) % 40);
    const endurance = 55 + ((absH >>> 7) % 45);

    const score = mass + attack + speed + endurance;
    let tier = 'B';
    if (score > 340) tier = 'S';
    else if (score > 300) tier = 'A';
    else if (score < 260) tier = 'C';

    return { mass, attack, speed, endurance, tier, name: `Custom ${emoji}`, desc: 'Dynamic Unicode Physics Top' };
  }

  // --- OPPONENT ROSTER ---
  const ENEMY_ROSTER = [
    { emoji: '🍕', style: 'gold' },
    { emoji: '🤡', style: 'cyber' },
    { emoji: '🥊', style: 'blaze' },
    { emoji: '💣', style: 'obsidian' },
    { emoji: '👹', style: 'blaze', isBoss: true }, // Stage 5 Boss
    { emoji: '⚡', style: 'cyber' },
    { emoji: '🚀', style: 'blaze' },
    { emoji: '💀', style: 'obsidian' },
    { emoji: '💎', style: 'gold' },
    { emoji: '👾', style: 'cyber', isBoss: true }  // Stage 10 Boss
  ];

  // --- PARTICLE FX ENGINE WITH GRAVITY SPARKS ---
  class ParticlePool {
    constructor() {
      this.particles = [];
    }

    emitSparks(x, y, color = '#00f0ff', count = 18, power = 6) {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = (Math.random() * 0.8 + 0.3) * power;
        this.particles.push({
          x, y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 1.0,
          decay: 0.02 + Math.random() * 0.03,
          size: Math.random() * 3.5 + 1.5,
          color,
          gravity: 0.12
        });
      }
    }

    emitShockwave(x, y, color = '#ffffff') {
      this.particles.push({
        x, y,
        isRing: true,
        radius: 10,
        maxRadius: 65,
        life: 1.0,
        decay: 0.045,
        color
      });
    }

    updateAndDraw(ctx) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= p.decay;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }

        ctx.save();
        if (p.isRing) {
          p.radius += (p.maxRadius - p.radius) * 0.2;
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = p.life * 0.75;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          p.x += p.vx;
          p.y += p.vy;
          if (p.gravity) p.vy += p.gravity;
          p.vx *= 0.96;
          p.vy *= 0.96;
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    clear() {
      this.particles = [];
    }
  }

  // --- EMOJI SPINNING TOP CLASS ---
  class EmojiTop {
    constructor(isPlayer = true) {
      this.isPlayer = isPlayer;
      this.emoji = isPlayer ? '🔥' : '💎';
      this.style = isPlayer ? 'blaze' : 'cyber';
      this.stats = computeEmojiStats(this.emoji);

      this.x = 0;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
      this.radius = 34;

      this.angle = 0;
      this.rpm = 0;
      this.wobblePhase = Math.random() * Math.PI * 2;
      this.wobbleAmount = 0;

      this.energy = 100;
      this.maxEnergy = 100;
      this.isAlive = true;
      this.isLaunched = false;
      this.isSpinning = false;
      this.isBoss = false;
    }

    configure(emoji, style = 'blaze', isBoss = false) {
      emoji = normalizeEmoji(emoji);
      this.emoji = emoji;
      this.style = style;
      this.isBoss = isBoss;
      this.stats = computeEmojiStats(emoji);
      this.radius = isBoss ? 44 : 34;
      if (isBoss) {
        this.stats.mass = Math.round(this.stats.mass * 1.35);
        this.stats.attack = Math.round(this.stats.attack * 1.25);
      }
    }

    reset(x, y) {
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
      this.angle = 0;
      this.rpm = 0;
      this.energy = 100;
      this.isAlive = true;
      this.isLaunched = false;
      this.isSpinning = false;
      this.wobbleAmount = 0;
    }

    launch(angleDeg, powerPercent) {
      this.isLaunched = true;
      this.isSpinning = true;
      this.energy = 100;
      const rad = (angleDeg * Math.PI) / 180;
      const spdFactor = (this.stats.speed / 100) * 14 * (powerPercent / 100);
      this.vx = Math.cos(rad) * spdFactor;
      this.vy = Math.sin(rad) * spdFactor;
      this.rpm = 25 + (this.stats.speed / 100) * 25;
      sfx.playLaunch();
    }

    update(arenaCenterX, arenaCenterY, arenaRadius) {
      if (!this.isLaunched) return;

      // Spin energy dissipation
      const drainBase = 0.048 + (100 - this.stats.endurance) * 0.00055;
      this.energy -= drainBase;
      if (this.energy < 0) this.energy = 0;

      // Update positions
      this.x += this.vx;
      this.y += this.vy;

      // Linear speed damping
      this.vx *= 0.986;
      this.vy *= 0.986;

      // Arena Bowl Gravity pull toward center
      const dx = arenaCenterX - this.x;
      const dy = arenaCenterY - this.y;
      const distFromCenter = Math.hypot(dx, dy);
      const bowlForce = 0.085 * (distFromCenter / arenaRadius);
      this.vx += (dx / (distFromCenter || 1)) * bowlForce;
      this.vy += (dy / (distFromCenter || 1)) * bowlForce;

      // Arena outer ring boundary bounce
      const maxDist = arenaRadius - this.radius;
      if (distFromCenter > maxDist) {
        const nx = (this.x - arenaCenterX) / distFromCenter;
        const ny = (this.y - arenaCenterY) / distFromCenter;

        this.x = arenaCenterX + nx * maxDist;
        this.y = arenaCenterY + ny * maxDist;

        const dot = this.vx * nx + this.vy * ny;
        if (dot > 0) {
          this.vx = (this.vx - 1.7 * dot * nx) * 0.8;
          this.vy = (this.vy - 1.7 * dot * ny) * 0.8;
          this.energy -= 1.1; // wall friction
          sfx.playClash(0.35, false);
        }
      }

      // Rotation & Wobble
      this.rpm = (this.energy / 100) * (20 + (this.stats.speed / 100) * 20);
      this.angle += (this.rpm * Math.PI) / 180;

      // Low energy wobble
      const lowEnergyThreshold = 35;
      if (this.energy < lowEnergyThreshold) {
        this.wobbleAmount = (1 - this.energy / lowEnergyThreshold) * 0.4;
        this.wobblePhase += 0.22;
      } else {
        this.wobbleAmount = 0.04;
        this.wobblePhase += 0.08;
      }

      if (this.energy <= 0.4) {
        this.isSpinning = false;
        this.isAlive = false;
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      // Precession tilt & defeat wobble
      const tiltX = Math.cos(this.wobblePhase) * this.wobbleAmount;

      // Shadow
      ctx.save();
      ctx.scale(1 + tiltX * 0.3, 0.45);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.arc(0, 52, this.radius * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Top Body with gyroscopic tilt
      if (tiltX !== 0 || !this.isSpinning) {
        ctx.transform(1, 0, tiltX * 0.18, 1 - Math.abs(tiltX * 0.12) - (!this.isSpinning ? 0.15 : 0), 0, 0);
      }
      ctx.rotate(this.angle);

      let ringColor1 = '#00f0ff';
      let ringColor2 = '#3b82f6';
      if (this.style === 'blaze') { ringColor1 = '#ff4757'; ringColor2 = '#ffa502'; }
      if (this.style === 'gold') { ringColor1 = '#ffd32a'; ringColor2 = '#ff9f1a'; }
      if (this.style === 'obsidian') { ringColor1 = '#8b5cf6'; ringColor2 = '#4b0082'; }
      if (this.isBoss) { ringColor1 = '#ff0033'; ringColor2 = '#660000'; }

      // Outer glow and spinning teeth
      ctx.strokeStyle = ringColor1;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Battle Ring Claws (4 or 6 teeth for Boss)
      const teeth = this.isBoss ? 6 : 4;
      for (let i = 0; i < teeth; i++) {
        const thAngle = (i * Math.PI * 2) / teeth;
        ctx.save();
        ctx.rotate(thAngle);
        ctx.fillStyle = ringColor2;
        ctx.beginPath();
        ctx.moveTo(this.radius - 2, -7);
        ctx.lineTo(this.radius + 8, 0);
        ctx.lineTo(this.radius - 2, 7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Metallic Core Disc
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, this.radius - 4);
      grad.addColorStop(0, '#334155');
      grad.addColorStop(0.7, '#1e293b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius - 4, 0, Math.PI * 2);
      ctx.fill();

      // Central Emoji
      ctx.save();
      ctx.font = `${this.isBoss ? 42 : 32}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = ringColor1;
      ctx.shadowBlur = 12;
      ctx.fillText(this.emoji, 0, 2);
      ctx.restore();

      ctx.restore();
    }
  }

  // --- MAIN BATTLE SIMULATOR & CONTROLLER ---
  class EmojiBladeGame {
    constructor() {
      this.canvas = document.getElementById('battleCanvas');
      this.ctx = this.canvas.getContext('2d');
      this.particles = new ParticlePool();

      this.playerTop = new EmojiTop(true);
      this.enemyTop = new EmojiTop(false);

      this.stage = 1;
      this.winStreak = 0;
      this.bestStreak = Math.max(0, Math.min(1000000, parseInt(readStored('emojiblade_best_streak', '0'), 10) || 0));
      this.unlockedBadges = ['🔥'];
      try {
        const badges = JSON.parse(readStored('emojiblade_badges', '[]'));
        if (Array.isArray(badges)) this.unlockedBadges = [...new Set(['🔥', ...badges.filter(x => typeof x === 'string').slice(0, 100).map(normalizeEmoji)])];
      } catch { /* Keep defaults when an old save is invalid. */ }

      this.battleState = 'ready'; // 'ready', 'aiming', 'countdown', 'battling', 'finished'
      this.battleStartTime = 0;
      this.battleHits = 0;

      // 2P Local Mode Turn State
      this.is2PMode = false;
      this.turn2P = 1; // 1 = P1 turn, 2 = P2 turn
      this.p1LaunchConfig = { angle: -35, power: 85 };
      this.p2LaunchConfig = { angle: -145, power: 85 };

      this.isPullAiming = false;
      this.dragStartX = 0;
      this.dragStartY = 0;
      this.dragCurrentX = 0;
      this.dragCurrentY = 0;

      this.countdownValue = 3;
      this.countdownTimer = null;

      this.arenaCenterX = 400;
      this.arenaCenterY = 300;
      this.arenaRadius = 250;

      this.initDom();
      this.initEvents();
      this.checkUrlDeepLink();
      this.resizeCanvas();
      this.setupStage();
      this.updateStatsUI();
      this.renderBadges();

      requestAnimationFrame(this.loop.bind(this));
    }

    initDom() {
      this.playerInput = document.getElementById('player-emoji-input');
      this.bladeStyleSelect = document.getElementById('blade-style-select');
      this.randomPlayerBtn = document.getElementById('random-player-btn');
      this.powerSlider = document.getElementById('power-slider');
      this.powerDisplay = document.getElementById('power-display');
      this.angleSlider = document.getElementById('angle-slider');
      this.angleDisplay = document.getElementById('angle-display');
      this.launchBtn = document.getElementById('main-launch-btn');
      this.rivalModeSelect = document.getElementById('rival-mode-select');
      this.customEnemyInput = document.getElementById('custom-enemy-input');
      this.modeStreakBtn = document.getElementById('mode-single-btn');
      this.mode2PBtn = document.getElementById('mode-2p-btn');
      this.resultModal = document.getElementById('result-modal');
      this.nextBattleBtn = document.getElementById('next-battle-btn');
      this.shareCardBtn = document.getElementById('share-card-btn');
      this.streakCounter = document.getElementById('streak-counter');
      this.bestStreakEl = document.getElementById('best-streak');
      this.stageNumEl = document.getElementById('stage-num');
      this.statusMsg = document.getElementById('arena-status');
      this.countdownOverlay = document.getElementById('countdown-overlay');
      this.demoStation = document.querySelector('.battle-station');

      this.bestStreakEl.textContent = this.bestStreak;
    }

    checkUrlDeepLink() {
      const params = new URLSearchParams(window.location.search);
      const urlEmoji = params.get('emoji');
      if (urlEmoji) {
        this.playerInput.value = normalizeEmoji(urlEmoji);
        this.playerTop.configure(urlEmoji, 'blaze');
      }
      if (params.get('mode') === '2p') {
        this.is2PMode = true;
        this.mode2PBtn.classList.add('active');
        this.modeStreakBtn.classList.remove('active');
        this.rivalModeSelect.value = 'custom';
        this.customEnemyInput.style.display = 'inline-block';
        this.customEnemyInput.value = normalizeEmoji(params.get('rival') || '💎');
      }
    }

    resizeCanvas() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.ctx.scale(dpr, dpr);

      this.arenaCenterX = rect.width / 2;
      const hudSpace = this.demoStation ? 70 : 0;
      const footerSpace = this.demoStation ? 40 : 0;
      this.arenaCenterY = (rect.height + hudSpace - footerSpace) / 2;
      this.arenaRadius = Math.min(rect.width, rect.height - hudSpace - footerSpace) * (this.demoStation ? 0.43 : 0.44);

      if (this.battleState === 'ready') {
        this.resetPositions();
      }
    }

    resetPositions() {
      const offset = this.arenaRadius * 0.52;
      this.playerTop.reset(this.arenaCenterX - offset, this.arenaCenterY);
      this.enemyTop.reset(this.arenaCenterX + offset, this.arenaCenterY);
    }

    setupStage() {
      this.hitStopUntil = 0;
      this.physicsAccumulator = 0;
      clearInterval(this.countdownTimer);
      clearTimeout(this.resultTimer);
      this.countdownTimer = null;
      this.isPullAiming = false;
      this.countdownOverlay.style.display = 'none';
      this.countdownOverlay.classList.remove('go-shoot');
      this.setConfigurationLocked(false);
      this.stageNumEl.textContent = String(this.stage).padStart(2, '0');
      this.streakCounter.textContent = this.winStreak;

      // Select enemy based on stage
      let enemyConfig;
      if (this.rivalModeSelect.value === 'custom') {
        const customEmoji = this.customEnemyInput.value.trim() || '💎';
        enemyConfig = { emoji: customEmoji, style: 'gold' };
      } else if (this.rivalModeSelect.value === 'random') {
        const randItem = ENEMY_ROSTER[Math.floor(Math.random() * ENEMY_ROSTER.length)];
        enemyConfig = randItem;
      } else {
        const idx = (this.stage - 1) % ENEMY_ROSTER.length;
        enemyConfig = ENEMY_ROSTER[idx];
      }

      this.enemyTop.configure(enemyConfig.emoji, enemyConfig.style, !!enemyConfig.isBoss);
      if (this.is2PMode) this.enemyTop.configure(enemyConfig.emoji, enemyConfig.style, false);
      this.resetPositions();
      this.battleState = 'ready';
      this.battleHits = 0;
      this.turn2P = 1;
      this.particles.clear();
      this.resultModal.style.display = 'none';

      document.getElementById('hud-player-emoji').textContent = this.playerTop.emoji;
      document.getElementById('hud-enemy-emoji').textContent = this.enemyTop.emoji;
      document.getElementById('player-tier').textContent = `${this.playerTop.stats.tier}-TIER`;
      document.getElementById('enemy-tier').textContent = this.enemyTop.isBoss ? '🔥 BOSS' : `${this.enemyTop.stats.tier}-TIER`;

      this.updateHudBars();
      this.statusMsg.textContent = translate(this.enemyTop.isBoss ? '⚠️ WARNING: BOSS APPROACHING!' : 'Drag player top or set angle & launch!');
      this.nextBattleBtn.textContent = translate(!this.is2PMode && this.rivalModeSelect.value === 'progression' ? 'Next Stage ⚡' : 'Play Again ⚡');
    }

    setConfigurationLocked(locked) {
      document.querySelectorAll('.emoji-chip, #player-emoji-input, #random-player-btn, #blade-style-select, #rival-mode-select, #custom-enemy-input, #mode-streak-btn, #mode-2p-btn').forEach(el => { el.disabled = locked; });
      [this.playerInput, this.randomPlayerBtn, this.bladeStyleSelect, this.rivalModeSelect, this.customEnemyInput, this.modeStreakBtn, this.mode2PBtn].forEach(el => { if (el) el.disabled = locked; });
      this.powerSlider.disabled = locked;
      this.angleSlider.disabled = locked;
      this.launchBtn.disabled = locked;
    }

    updateStatsUI() {
      const stats = this.playerTop.stats;
      document.getElementById('stat-weight-val').textContent = stats.mass;
      document.getElementById('stat-attack-val').textContent = stats.attack;
      document.getElementById('stat-speed-val').textContent = stats.speed;
      document.getElementById('stat-endurance-val').textContent = stats.endurance;

      document.getElementById('meter-weight').style.width = `${Math.min(stats.mass, 100)}%`;
      document.getElementById('meter-attack').style.width = `${Math.min(stats.attack, 100)}%`;
      document.getElementById('meter-speed').style.width = `${Math.min(stats.speed, 100)}%`;
      document.getElementById('meter-endurance').style.width = `${Math.min(stats.endurance, 100)}%`;

      document.getElementById('hud-player-emoji').textContent = this.playerTop.emoji;
      document.getElementById('player-tier').textContent = `${stats.tier}-TIER`;
    }

    renderBadges() {
      const container = document.getElementById('trophies-shelf');
      if (!container) return;
      container.innerHTML = '';
      this.unlockedBadges.forEach(emoji => {
        const span = document.createElement('span');
        span.className = 'trophy-item';
        span.textContent = emoji;
        span.title = `Unlocked with ${emoji}`;
        container.appendChild(span);
      });
    }

    initEvents() {
      window.addEventListener('resize', () => this.resizeCanvas());
      const cancelLaunch = () => {
        if (this.battleState === 'countdown' || (this.is2PMode && this.turn2P === 2 && this.battleState === 'ready')) this.setupStage();
      };
      document.getElementById('cancel-launch-btn')?.addEventListener('click', cancelLaunch);
      window.addEventListener('keydown', event => { if (event.key === 'Escape') cancelLaunch(); });

      // Sound toggle
      const soundBtn = document.getElementById('sound-toggle-btn');
      soundBtn.addEventListener('click', () => {
        sfx.init();
        sfx.enabled = !sfx.enabled;
        document.getElementById('sound-icon').textContent = sfx.enabled ? '🔊' : '🔇';
      });

      // Fullscreen Toggle
      const fsBtn = document.getElementById('fullscreen-btn');
      if (fsBtn) {
        fsBtn.addEventListener('click', () => {
          const container = document.querySelector('.arena-viewport-wrapper');
          if (!document.fullscreenElement) {
            container.requestFullscreen?.().catch(() => {});
          } else {
            document.exitFullscreen?.().catch(() => {});
          }
        });
      }

      // Quick Emoji chips
      const chips = document.querySelectorAll('.emoji-chip');
      chips.forEach(chip => {
        chip.addEventListener('click', () => {
          chips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          const emo = chip.dataset.emoji;
          this.playerInput.value = emo;
          this.playerTop.configure(emo, this.bladeStyleSelect.value);
          this.updateStatsUI();
          sfx.init();
        });
      });

      // Player emoji input typing
      this.playerInput.addEventListener('input', (e) => {
        const val = e.target.value.trim() || '🔥';
        this.playerTop.configure(val, this.bladeStyleSelect.value);
        this.updateStatsUI();
      });

      this.bladeStyleSelect.addEventListener('change', () => {
        this.playerTop.configure(this.playerInput.value, this.bladeStyleSelect.value);
      });

      // Random Player Button
      this.randomPlayerBtn.addEventListener('click', () => {
        sfx.init();
        const keys = Object.keys(EMOJI_PRESETS);
        const rand = keys[Math.floor(Math.random() * keys.length)];
        this.playerInput.value = rand;
        this.playerTop.configure(rand, this.bladeStyleSelect.value);
        this.updateStatsUI();
      });

      // Sliders
      this.powerSlider.addEventListener('input', (e) => {
        this.powerDisplay.textContent = `${e.target.value}%`;
      });
      this.angleSlider.addEventListener('input', (e) => {
        this.angleDisplay.textContent = `${e.target.value}°`;
      });

      // Rival Mode Select
      this.rivalModeSelect.addEventListener('change', (e) => {
        this.customEnemyInput.style.display = e.target.value === 'custom' ? 'inline-block' : 'none';
        this.setupStage();
      });
      this.customEnemyInput.addEventListener('input', () => this.setupStage());

      // 1P / 2P Toggles
      this.modeStreakBtn.addEventListener('click', () => {
        this.is2PMode = false;
        this.modeStreakBtn.classList.add('active');
        this.mode2PBtn.classList.remove('active');
        this.setupStage();
      });
      this.mode2PBtn.addEventListener('click', () => {
        this.is2PMode = true;
        this.mode2PBtn.classList.add('active');
        this.modeStreakBtn.classList.remove('active');
        this.setupStage();
      });

      // Launch Click
      this.launchBtn.addEventListener('click', () => {
        sfx.init();
        this.startLaunchSequence();
      });

      // Modal Next Stage
      this.nextBattleBtn.addEventListener('click', () => {
        this.setupStage();
      });

      // Share Card Generator
      this.shareCardBtn.addEventListener('click', () => {
        this.generateShareCard();
      });

      // Slingshot Pull Drag Events on Arena Canvas
      const getPos = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
          x: clientX - rect.left,
          y: clientY - rect.top
        };
      };

      const startPull = (e) => {
        if (this.battleState !== 'ready') return;
        sfx.init();
        const pos = getPos(e);
        const targetTop = (this.is2PMode && this.turn2P === 2) ? this.enemyTop : this.playerTop;
        const dist = Math.hypot(pos.x - targetTop.x, pos.y - targetTop.y);
        if (dist < 80) {
          this.isPullAiming = true;
          this.dragStartX = targetTop.x;
          this.dragStartY = targetTop.y;
          this.dragCurrentX = pos.x;
          this.dragCurrentY = pos.y;
          e.preventDefault();
        }
      };

      const movePull = (e) => {
        if (!this.isPullAiming) return;
        const pos = getPos(e);
        this.dragCurrentX = pos.x;
        this.dragCurrentY = pos.y;

        const dx = this.dragStartX - this.dragCurrentX;
        const dy = this.dragStartY - this.dragCurrentY;
        const pullLen = Math.min(Math.hypot(dx, dy), 160);
        const pwr = Math.round(30 + (pullLen / 160) * 70);
        let ang = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);

        this.powerSlider.value = pwr;
        this.powerDisplay.textContent = `${pwr}%`;
        this.angleSlider.value = ang;
        this.angleDisplay.textContent = `${ang}°`;

        e.preventDefault();
      };

      const endPull = () => {
        if (!this.isPullAiming) return;
        this.isPullAiming = false;
        this.startLaunchSequence();
      };

      window.addEventListener('touchcancel', () => { this.isPullAiming = false; if (this.battleState === 'aiming') this.battleState = 'ready'; });
      window.addEventListener('blur', () => { this.isPullAiming = false; if (this.battleState === 'aiming') this.battleState = 'ready'; });

      this.canvas.addEventListener('mousedown', startPull);
      window.addEventListener('mousemove', movePull);
      window.addEventListener('mouseup', endPull);

      this.canvas.addEventListener('touchstart', startPull, { passive: false });
      window.addEventListener('touchmove', movePull, { passive: false });
      window.addEventListener('touchend', endPull);

    }

    startLaunchSequence() {
      if (this.battleState !== 'ready') return;

      // In 2P Mode: If Player 1 launches, queue P1 and prompt Player 2
      if (this.is2PMode && this.turn2P === 1) {
        [this.playerInput, this.randomPlayerBtn, this.bladeStyleSelect, this.rivalModeSelect, this.customEnemyInput, this.modeStreakBtn, this.mode2PBtn].forEach(el => { if (el) el.disabled = true; });
        document.querySelectorAll('.emoji-chip').forEach(el => { el.disabled = true; });
        this.p1LaunchConfig = {
          power: parseInt(this.powerSlider.value, 10),
          angle: parseInt(this.angleSlider.value, 10)
        };
        this.turn2P = 2;
        this.statusMsg.textContent = translate('👉 PLAYER 2 TURN: Aim Rival & Launch!');
        this.angleSlider.value = -145;
        this.angleDisplay.textContent = '-145°';
        return;
      }

      if (this.is2PMode && this.turn2P === 2) {
        this.p2LaunchConfig = {
          power: parseInt(this.powerSlider.value, 10),
          angle: parseInt(this.angleSlider.value, 10)
        };
      }

      // Start "3, 2, 1, GO SHOOT!" Countdown Ceremony
      this.singleLaunchConfig = { power: Number(this.powerSlider.value), angle: Number(this.angleSlider.value) };
      this.setConfigurationLocked(true);
      this.battleState = 'countdown';
      this.countdownValue = 3;
      const overlay = this.countdownOverlay;
      overlay.style.display = 'flex';
      overlay.textContent = '3';
      sfx.playCountdown(440);

      clearInterval(this.countdownTimer);
      const timer = setInterval(() => {
        if (this.battleState !== 'countdown') { clearInterval(timer); return; }
        this.countdownValue--;
        if (this.countdownValue === 2) {
          overlay.textContent = '2';
          sfx.playCountdown(440);
        } else if (this.countdownValue === 1) {
          overlay.textContent = '1';
          sfx.playCountdown(440);
        } else if (this.countdownValue === 0) {
          overlay.textContent = 'GO SHOOT! 🚀';
          overlay.classList.add('go-shoot');
          sfx.playCountdown(880);
        } else {
          clearInterval(timer);
          this.countdownTimer = null;
          overlay.style.display = 'none';
          overlay.classList.remove('go-shoot');
          this.executeLaunch();
        }
      }, 700);
      this.countdownTimer = timer;
    }

    executeLaunch() {
      if (this.battleState !== 'countdown') return;
      this.battleState = 'battling';
      this.battleStartTime = performance.now();
      this.battleHits = 0;

      if (this.is2PMode) {
        this.playerTop.launch(this.p1LaunchConfig.angle, this.p1LaunchConfig.power);
        this.enemyTop.launch(this.p2LaunchConfig.angle, this.p2LaunchConfig.power);
      } else {
        const pPower = this.singleLaunchConfig.power;
        const pAngle = this.singleLaunchConfig.angle;
        this.playerTop.launch(pAngle, pPower);

        // Intelligent AI launch
        let eAngle = -145 + (Math.random() * 40 - 20);
        let ePower = 76 + Math.min(this.stage * 3, 24);
        if (this.enemyTop.isBoss) ePower = 100;
        this.enemyTop.launch(eAngle, ePower);
      }

      this.statusMsg.textContent = translate('⚡ CLASH IN PROGRESS!');
    }

    handleTopCollisions() {
      if (!this.playerTop.isSpinning || !this.enemyTop.isSpinning) return;

      const dx = this.enemyTop.x - this.playerTop.x;
      const dy = this.enemyTop.y - this.playerTop.y;
      const dist = Math.hypot(dx, dy);
      const minDist = this.playerTop.radius + this.enemyTop.radius;

      if (dist < minDist && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;

        // Separate overlaps
        const overlap = (minDist - dist) * 0.5;
        this.playerTop.x -= nx * overlap;
        this.playerTop.y -= ny * overlap;
        this.enemyTop.x += nx * overlap;
        this.enemyTop.y += ny * overlap;

        // Relative velocity
        const kx = this.playerTop.vx - this.enemyTop.vx;
        const ky = this.playerTop.vy - this.enemyTop.vy;
        if (nx * kx + ny * ky <= 0) return;
        this.battleHits++;
        const p = 2 * (nx * kx + ny * ky) / (this.playerTop.stats.mass + this.enemyTop.stats.mass);

        this.playerTop.vx -= p * this.enemyTop.stats.mass * nx * 1.3;
        this.playerTop.vy -= p * this.enemyTop.stats.mass * ny * 1.3;
        this.enemyTop.vx += p * this.playerTop.stats.mass * nx * 1.3;
        this.enemyTop.vy += p * this.playerTop.stats.mass * ny * 1.3;

        // Critical Hit evaluation
        const clashImpact = Math.hypot(kx, ky);
        const isCrit = Math.random() < 0.28 || clashImpact > 7.5;
        const critMultiplier = isCrit ? 1.5 : 1.0;

        const playerDamage = (clashImpact * 1.8 + (this.enemyTop.stats.attack / 10)) * (100 / this.playerTop.stats.mass) * critMultiplier * 0.35;
        const enemyDamage = (clashImpact * 1.8 + (this.playerTop.stats.attack / 10)) * (100 / this.enemyTop.stats.mass) * critMultiplier * 0.35;

        this.playerTop.energy -= playerDamage;
        this.enemyTop.energy -= enemyDamage;

        // FX Sparks & Sound
        const midX = (this.playerTop.x + this.enemyTop.x) / 2;
        const midY = (this.playerTop.y + this.enemyTop.y) / 2;
        this.particles.emitSparks(midX, midY, isCrit ? '#f59e0b' : '#00f0ff', isCrit ? 32 : 14, isCrit ? Math.max(4, clashImpact * 0.85) : clashImpact * 0.85);
        if (isCrit) {
          this.particles.emitShockwave(midX, midY, '#f97316');
          if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            this.particles.emitSparks(midX, midY, '#f97316', 8, Math.max(3, clashImpact * 0.45));
          }
        }
        sfx.playClash(Math.min(clashImpact * 0.22, 1), isCrit);

        if (isCrit) {
          this.applyScreenShake(8);
          if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            this.hitStopUntil = performance.now() + 45;
          }
        }
      }
    }

    applyScreenShake(intensity) {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      const container = document.getElementById('arena-container');
      container.style.transform = `translate(${(Math.random() - 0.5) * intensity}px, ${(Math.random() - 0.5) * intensity}px)`;
      setTimeout(() => { container.style.transform = 'translate(0, 0)'; }, 90);
    }

    updateHudBars() {
      const pEnergy = Math.max(0, Math.round(this.playerTop.energy));
      const eEnergy = Math.max(0, Math.round(this.enemyTop.energy));

      document.getElementById('player-energy-val').textContent = `${pEnergy}%`;
      document.getElementById('player-energy-bar').style.width = `${pEnergy}%`;

      document.getElementById('enemy-energy-val').textContent = `${eEnergy}%`;
      document.getElementById('enemy-energy-bar').style.width = `${eEnergy}%`;
    }

    checkBattleOutcome() {
      if (this.battleState !== 'battling') return;

      const playerStopped = !this.playerTop.isSpinning || this.playerTop.energy <= 0;
      const enemyStopped = !this.enemyTop.isSpinning || this.enemyTop.energy <= 0;

      if (playerStopped || enemyStopped) {
        this.battleState = 'finished';
        const battleDuration = ((performance.now() - this.battleStartTime) / 1000).toFixed(1);
        const playerWon = this.playerTop.energy > this.enemyTop.energy;
        const draw = Math.max(0, this.playerTop.energy) === Math.max(0, this.enemyTop.energy);
        const progression = !this.is2PMode && this.rivalModeSelect.value === 'progression';
        this.nextBattleBtn.textContent = translate(progression
          ? (playerWon && !draw ? 'Next Stage ⚡' : 'Retry Stage ⚡')
          : 'Play Again ⚡');

        const banner = document.getElementById('result-banner');
        const summary = document.getElementById('result-summary');
        document.getElementById('res-hit-count').textContent = this.battleHits;
        document.getElementById('res-time-val').textContent = `${battleDuration}s`;
        document.getElementById('res-type-val').textContent = playerWon ? 'Outspun' : 'Spin Depleted';

        if (draw) {
          banner.textContent = 'DRAW';
          banner.className = 'result-banner';
          summary.textContent = translate('Both tops stopped together. Play again!');
        } else if (playerWon) {
          banner.textContent = this.is2PMode ? 'PLAYER 1 WINS!' : 'VICTORY! 🏆';
          banner.className = 'result-banner';
          summary.textContent = `${this.playerTop.emoji} crushed ${this.enemyTop.emoji}'s stamina!`;
          if (!this.is2PMode && this.rivalModeSelect.value === 'progression') this.winStreak++;
          if (!this.is2PMode && this.rivalModeSelect.value === 'progression' && this.winStreak > this.bestStreak) {
            this.bestStreak = this.winStreak;
            writeStored('emojiblade_best_streak', String(this.bestStreak));
            this.bestStreakEl.textContent = this.bestStreak;
          }

          // Unlock trophy badge
          if (!this.is2PMode && this.rivalModeSelect.value === 'progression' && !this.unlockedBadges.includes(this.playerTop.emoji)) {
            this.unlockedBadges.push(this.playerTop.emoji);
            writeStored('emojiblade_badges', JSON.stringify(this.unlockedBadges));
            this.renderBadges();
          }

          if (!this.is2PMode && this.rivalModeSelect.value === 'progression') this.stage++;
          sfx.playWin();
          this.particles.emitSparks(this.playerTop.x, this.playerTop.y, '#ffd32a', 36, 9);
        } else {
          banner.textContent = this.is2PMode ? 'PLAYER 2 WINS!' : 'DEFEAT 💥';
          banner.className = 'result-banner defeat';
          summary.textContent = `${this.enemyTop.emoji} outlasted your blade in the final clash!`;
          if (!this.is2PMode && this.rivalModeSelect.value === 'progression') this.winStreak = 0;
        }

        this.streakCounter.textContent = this.winStreak;
        banner.textContent = translate(banner.textContent);
        document.getElementById('res-type-val').textContent = translate(draw ? 'DRAW' : playerWon ? 'Outspun' : 'Spin Depleted');
        if (document.documentElement.lang !== 'en' && !draw) {
          summary.textContent = `${playerWon ? this.playerTop.emoji : this.enemyTop.emoji} ${document.documentElement.lang === 'ja' ? 'の勝利！' : '获胜！'}`;
        } else if (draw) {
          summary.textContent = translate(summary.textContent);
        }
        this.setConfigurationLocked(false);
        this.resultTimer = setTimeout(() => {
          if (this.battleState !== 'finished') return;
          this.resultModal.style.display = 'flex';
        }, 600);
      }
    }

    drawArena() {
      const ctx = this.ctx;
      const cx = this.arenaCenterX;
      const cy = this.arenaCenterY;
      const r = this.arenaRadius;

      if (this.demoStation) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = '#d9e2e5';
        ctx.beginPath(); ctx.arc(0, 0, r + 16, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#7b929d'; ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#f8faf9';
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#344f5c'; ctx.lineWidth = 3; ctx.stroke();
        for (let i = 0; i < 60; i++) {
          const angle = i * Math.PI / 30;
          const inner = r + (i % 5 === 0 ? 5 : 9);
          ctx.strokeStyle = i % 5 === 0 ? '#344f5c' : '#8da2aa';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
          ctx.lineTo(Math.cos(angle) * (r + 13), Math.sin(angle) * (r + 13));
          ctx.stroke();
        }
        ctx.strokeStyle = '#d7e0e1'; ctx.lineWidth = 1;
        for (const size of [0.35, 0.7]) {
          ctx.beginPath(); ctx.arc(0, 0, r * size, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
        ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
        ctx.setLineDash([]);
        for (const [start, color] of [[Math.PI * .85, '#1676e8'], [-Math.PI * .15, '#ed583d']]) {
          ctx.strokeStyle = color; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.arc(0, 0, r + 3, start, start + Math.PI * .3); ctx.stroke();
        }
        ctx.fillStyle = '#9aadb3'; ctx.textAlign = 'center';
        ctx.font = '700 12px monospace'; ctx.fillText('EB / 01', 0, 4);
        ctx.restore();
        return;
      }

      // Outer Bevel (Clean stadium rim)
      ctx.save();
      const outerGrad = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r + 24);
      outerGrad.addColorStop(0, '#eaf0fa');
      outerGrad.addColorStop(0.7, '#d2e0f4');
      outerGrad.addColorStop(1, '#b9cde8');
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 20, 0, Math.PI * 2);
      ctx.fill();

      // Outer Vibrant Ring
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Concave Bowl Floor (Bright, glossy toy-stadium floor)
      const bowlGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
      bowlGrad.addColorStop(0, '#ffffff');
      bowlGrad.addColorStop(0.65, '#f0f5fc');
      bowlGrad.addColorStop(1, '#d8e5f7');
      ctx.fillStyle = bowlGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Radial Guidelines (Clean soft blue)
      ctx.strokeStyle = 'rgba(2, 132, 199, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
      ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
      ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
      ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
      ctx.stroke();

      // Center Arena Symbol
      ctx.font = '36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(2, 132, 199, 0.12)';
      ctx.fillText('🌀', cx, cy);

      ctx.restore();
    }

    drawSlingshotGuide() {
      if (!this.isPullAiming) return;
      const ctx = this.ctx;

      const dx = this.dragStartX - this.dragCurrentX;
      const dy = this.dragStartY - this.dragCurrentY;

      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = 'rgba(2, 132, 199, 0.35)';
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.moveTo(this.dragStartX, this.dragStartY);
      ctx.lineTo(this.dragStartX + dx * 1.4, this.dragStartY + dy * 1.4);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(this.dragStartX, this.dragStartY);
      ctx.lineTo(this.dragCurrentX, this.dragCurrentY);
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(this.dragCurrentX, this.dragCurrentY, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    generateShareCard() {
      const shareCanvas = document.createElement('canvas');
      shareCanvas.width = 800;
      shareCanvas.height = 450;
      const sCtx = shareCanvas.getContext('2d');

      const bgGrad = sCtx.createLinearGradient(0, 0, 800, 450);
      bgGrad.addColorStop(0, '#090e18');
      bgGrad.addColorStop(1, '#15203a');
      sCtx.fillStyle = bgGrad;
      sCtx.fillRect(0, 0, 800, 450);

      sCtx.fillStyle = '#00f0ff';
      sCtx.font = 'bold 36px Outfit, sans-serif';
      sCtx.fillText('EMOJI BLADE ONLINE', 50, 70);

      sCtx.fillStyle = '#94a3b8';
      sCtx.font = '18px Outfit, sans-serif';
      sCtx.fillText('Spinning Top Physics Arena Clash', 50, 100);

      sCtx.font = '72px sans-serif';
      sCtx.textAlign = 'center';
      sCtx.fillText(this.playerTop.emoji, 250, 240);
      sCtx.fillText(this.enemyTop.emoji, 550, 240);

      sCtx.fillStyle = '#ff4757';
      sCtx.font = 'bold 32px JetBrains Mono, monospace';
      sCtx.fillText('VS', 400, 230);

      sCtx.fillStyle = '#ffd32a';
      sCtx.font = 'bold 24px Outfit, sans-serif';
      sCtx.fillText(`🔥 WIN STREAK: ${this.winStreak}  |  STAGE: ${this.stage}`, 400, 320);

      sCtx.fillStyle = '#64748b';
      sCtx.font = '16px monospace';
      sCtx.fillText('Play free in browser 👉 emojiblade.online', 400, 400);

      const link = document.createElement('a');
      link.download = `emoji-blade-streak-${this.winStreak}.png`;
      link.href = shareCanvas.toDataURL('image/png');
      link.click();
    }

    loop(timestamp = performance.now()) {
      // Keep physics at 60 Hz; cap catch-up after a suspended browser tab.
      // Exclude paused time, including the partial frame when hit-stop ends.
      const elapsed = this.lastFrameTime === undefined ? 0
        : Math.min(100, Math.max(0, timestamp - Math.max(this.lastFrameTime, this.hitStopUntil || 0)));
      this.lastFrameTime = timestamp;
      this.physicsAccumulator = timestamp < this.hitStopUntil ? 0 : (this.physicsAccumulator || 0) + elapsed;
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.ctx.clearRect(0, 0, rect.width, rect.height);

      this.drawArena();

      while (this.physicsAccumulator >= 1000 / 60) {
        this.physicsAccumulator -= 1000 / 60;
        if (this.battleState !== 'battling') continue;
        this.playerTop.update(this.arenaCenterX, this.arenaCenterY, this.arenaRadius);
        this.enemyTop.update(this.arenaCenterX, this.arenaCenterY, this.arenaRadius);
        this.handleTopCollisions();
        this.updateHudBars();
        this.checkBattleOutcome();
        if (timestamp < this.hitStopUntil) {
          this.physicsAccumulator = 0;
          break;
        }
      }

      this.playerTop.draw(this.ctx);
      this.enemyTop.draw(this.ctx);

      this.particles.updateAndDraw(this.ctx);
      this.drawSlingshotGuide();

      if (this.demoStation) {
        const phase = this.isPullAiming ? 'aiming' : this.battleState;
        this.demoStation.dataset.phase = phase;
        const lang = document.documentElement.lang;
        const isZh = lang === 'zh-Hans';
        const isJa = lang === 'ja';
        const readyText = isZh
          ? (this.is2PMode ? `玩家 ${this.turn2P} 就绪` : '准备发射')
          : isJa
          ? (this.is2PMode ? `プレイヤー ${this.turn2P} 準備完了` : '発射準備完了')
          : (this.is2PMode ? `PLAYER ${this.turn2P} READY` : 'READY TO LAUNCH');
        const phaseText = phase === 'ready'
          ? readyText
          : phase === 'battling'
          ? (isZh ? '战斗中' : isJa ? 'バトル中' : 'BATTLING')
          : phase === 'aiming'
          ? (isZh ? '瞄准中' : isJa ? '照準中' : 'AIMING')
          : phase === 'countdown'
          ? (isZh ? '发射倒计时' : isJa ? 'カウントダウン' : 'COUNTDOWN')
          : phase === 'finished'
          ? (isZh ? '对战结束' : isJa ? 'バトル終了' : 'FINISHED')
          : phase.toUpperCase();
        document.getElementById('battle-phase').textContent = phaseText;
        if (this.battleState === 'ready') document.getElementById('battle-clock').textContent = '00.0';
        if (this.battleState === 'battling') document.getElementById('battle-clock').textContent = ((timestamp - this.battleStartTime) / 1000).toFixed(1).padStart(4, '0');
        document.getElementById('battle-hit-count').textContent = String(this.battleHits).padStart(2, '0');
        document.getElementById('player-energy-bar').dataset.low = this.playerTop.energy < 25;
        document.getElementById('enemy-energy-bar').dataset.low = this.enemyTop.energy < 25;
      }

      requestAnimationFrame(this.loop.bind(this));
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    window.emojiBladeApp = new EmojiBladeGame();
  });

})();
