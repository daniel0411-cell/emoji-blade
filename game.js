/**
 * EMOJI BLADE - Spin Top Battle Physics Engine
 * Complete interactive canvas game with particle FX, Web Audio synth, i18n, and progressive streak AI.
 */

(function () {
  'use strict';

  // --- AUDIO SYNTHESIZER (Zero external asset dependency) ---
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
    }

    playClash(intensity = 1, isCritical = false) {
      if (!this.enabled || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = isCritical ? 'triangle' : 'square';
        osc.frequency.setValueAtTime(isCritical ? 140 : 280, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

        gain.gain.setValueAtTime(Math.min(0.4 * intensity, 0.8), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.16);

        // Add noise spark burst on heavy clash
        if (intensity > 0.6) {
          const bufferSize = this.ctx.sampleRate * 0.05;
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
          const noise = this.ctx.createBufferSource();
          noise.buffer = buffer;
          const nGain = this.ctx.createGain();
          nGain.gain.setValueAtTime(0.15 * intensity, now);
          nGain.gain.linearRampToValueAtTime(0.001, now + 0.05);
          noise.connect(nGain);
          nGain.connect(this.ctx.destination);
          noise.start(now);
        }
      } catch (e) { }
    }

    playLaunch() {
      if (!this.enabled || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.25);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } catch (e) { }
    }

    playWin() {
      if (!this.enabled || !this.ctx) return;
      try {
        const notes = [261.6, 329.6, 392.0, 523.2];
        notes.forEach((freq, idx) => {
          const now = this.ctx.currentTime + idx * 0.09;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
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
    '🔥': { mass: 76, attack: 94, speed: 86, endurance: 68, tier: 'A', desc: 'Explosive blaze momentum' },
    '💣': { mass: 88, attack: 96, speed: 70, endurance: 65, tier: 'A', desc: 'Heavy kinetic impact shock' },
    '⚡': { mass: 60, attack: 88, speed: 98, endurance: 72, tier: 'S', desc: 'Max RPM, rapid cutting' },
    '💎': { mass: 95, attack: 72, speed: 65, endurance: 96, tier: 'S', desc: 'Diamond density defense' },
    '🚀': { mass: 78, attack: 90, speed: 94, endurance: 64, tier: 'A', desc: 'High velocity piercing thrust' },
    '🥊': { mass: 82, attack: 89, speed: 80, endurance: 75, tier: 'A', desc: 'Heavy punch recoil' },
    '🤡': { mass: 70, attack: 75, speed: 84, endurance: 82, tier: 'B', desc: 'Erratic spin wobble pattern' },
    '💀': { mass: 72, attack: 91, speed: 82, endurance: 70, tier: 'A', desc: 'Sharp strike, high crit rate' },
    '🗿': { mass: 98, attack: 68, speed: 55, endurance: 98, tier: 'S', desc: 'Immovable fortress mass' },
    '🍕': { mass: 74, attack: 70, speed: 78, endurance: 85, tier: 'B', desc: 'Uniform balance perimeter' },
    '👑': { mass: 85, attack: 85, speed: 85, endurance: 85, tier: 'S', desc: 'Royal all-rounder balance' },
    '🌪️': { mass: 65, attack: 76, speed: 92, endurance: 92, tier: 'B', desc: 'Vortex stamina specialist' },
    '🐢': { mass: 92, attack: 55, speed: 50, endurance: 99, tier: 'A', desc: 'Iron shell ultra stamina' },
    '🗡️': { mass: 68, attack: 97, speed: 90, endurance: 60, tier: 'S', desc: 'Lethal blade sharpness' },
    '🥑': { mass: 75, attack: 68, speed: 75, endurance: 80, tier: 'B', desc: 'Organic dense core' },
    '👾': { mass: 70, attack: 85, speed: 88, endurance: 76, tier: 'A', desc: 'Alien cyber kinetic strike' }
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
    const attack = 60 + ((absH >> 3) % 40);
    const speed = 60 + ((absH >> 5) % 40);
    const endurance = 55 + ((absH >> 7) % 45);

    const score = mass + attack + speed + endurance;
    let tier = 'B';
    if (score > 340) tier = 'S';
    else if (score > 300) tier = 'A';
    else if (score < 260) tier = 'C';

    return { mass, attack, speed, endurance, tier, desc: 'Dynamic Unicode Geometry' };
  }

  // --- OPPONENT ROSTER FOR PROGRESSION ---
  const ENEMY_ROSTER = [
    { emoji: '🍕', style: 'gold' },
    { emoji: '🤡', style: 'cyber' },
    { emoji: '🥊', style: 'blaze' },
    { emoji: '💣', style: 'obsidian' },
    { emoji: '⚡', style: 'cyber' },
    { emoji: '🚀', style: 'blaze' },
    { emoji: '💀', style: 'obsidian' },
    { emoji: '💎', style: 'gold' },
    { emoji: '🗿', style: 'obsidian' }
  ];

  // --- PARTICLE FX ENGINE ---
  class ParticlePool {
    constructor() {
      this.particles = [];
    }

    emitSparks(x, y, color = '#00f0ff', count = 16, power = 6) {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = (Math.random() * 0.8 + 0.2) * power;
        this.particles.push({
          x, y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 1.0,
          decay: 0.02 + Math.random() * 0.03,
          size: Math.random() * 3 + 1.5,
          color
        });
      }
    }

    emitShockwave(x, y, color = '#ffffff') {
      this.particles.push({
        x, y,
        isRing: true,
        radius: 8,
        maxRadius: 55,
        life: 1.0,
        decay: 0.05,
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
          p.radius += (p.maxRadius - p.radius) * 0.18;
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = p.life * 0.7;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.95;
          p.vy *= 0.95;
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
    }

    configure(emoji, style = 'blaze') {
      this.emoji = emoji;
      this.style = style;
      this.stats = computeEmojiStats(emoji);
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

      // Friction & natural spin drain
      const drainBase = 0.05 + (100 - this.stats.endurance) * 0.0006;
      this.energy -= drainBase;
      if (this.energy < 0) this.energy = 0;

      // Update positions
      this.x += this.vx;
      this.y += this.vy;

      // Linear speed damping
      this.vx *= 0.985;
      this.vy *= 0.985;

      // Arena Bowl Gravity pull toward center
      const dx = arenaCenterX - this.x;
      const dy = arenaCenterY - this.y;
      const distFromCenter = Math.hypot(dx, dy);
      const bowlForce = 0.08 * (distFromCenter / arenaRadius);
      this.vx += (dx / (distFromCenter || 1)) * bowlForce;
      this.vy += (dy / (distFromCenter || 1)) * bowlForce;

      // Arena outer ring boundary bounce
      const maxDist = arenaRadius - this.radius;
      if (distFromCenter > maxDist) {
        const nx = (this.x - arenaCenterX) / distFromCenter;
        const ny = (this.y - arenaCenterY) / distFromCenter;

        // Push back
        this.x = arenaCenterX + nx * maxDist;
        this.y = arenaCenterY + ny * maxDist;

        // Reflect velocity with bounce damping
        const dot = this.vx * nx + this.vy * ny;
        if (dot > 0) {
          this.vx = (this.vx - 1.7 * dot * nx) * 0.8;
          this.vy = (this.vy - 1.7 * dot * ny) * 0.8;
          this.energy -= 1.2; // wall collision penalty
          sfx.playClash(0.4, false);
        }
      }

      // Rotation & Wobble
      this.rpm = (this.energy / 100) * (20 + (this.stats.speed / 100) * 20);
      this.angle += (this.rpm * Math.PI) / 180;

      // Wobble increases as energy diminishes
      const lowEnergyThreshold = 35;
      if (this.energy < lowEnergyThreshold) {
        this.wobbleAmount = (1 - this.energy / lowEnergyThreshold) * 0.35;
        this.wobblePhase += 0.2;
      } else {
        this.wobbleAmount = 0.04;
        this.wobblePhase += 0.08;
      }

      // Out of spin condition
      if (this.energy <= 0.5) {
        this.isSpinning = false;
        this.isAlive = false;
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      // Precession Tilt (3D illusion tilt)
      const tiltX = Math.cos(this.wobblePhase) * this.wobbleAmount;
      const tiltY = Math.sin(this.wobblePhase) * this.wobbleAmount;

      // Shadow underneath
      ctx.save();
      ctx.scale(1 + tiltX * 0.3, 0.45);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.arc(0, 50, this.radius * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Top Body Container
      ctx.rotate(this.angle);

      // 1. Blade Armor Ring
      let ringColor1 = '#00f0ff';
      let ringColor2 = '#3b82f6';
      if (this.style === 'blaze') { ringColor1 = '#ff4757'; ringColor2 = '#ffa502'; }
      if (this.style === 'gold') { ringColor1 = '#ffd32a'; ringColor2 = '#ff9f1a'; }
      if (this.style === 'obsidian') { ringColor1 = '#8b5cf6'; ringColor2 = '#4b0082'; }

      // Outer glow and spinning teeth
      ctx.strokeStyle = ringColor1;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.stroke();

      // 4 Battle Ring Claws/Teeth
      const teeth = 4;
      for (let i = 0; i < teeth; i++) {
        const thAngle = (i * Math.PI * 2) / teeth;
        ctx.save();
        ctx.rotate(thAngle);
        ctx.fillStyle = ringColor2;
        ctx.beginPath();
        ctx.moveTo(this.radius - 2, -6);
        ctx.lineTo(this.radius + 7, 0);
        ctx.lineTo(this.radius - 2, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 2. Metallic Core Disc
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, this.radius - 4);
      grad.addColorStop(0, '#2d3748');
      grad.addColorStop(0.7, '#1a202c');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius - 4, 0, Math.PI * 2);
      ctx.fill();

      // 3. Central Emoji Symbol
      ctx.save();
      // Counter-rotate or rotate with blade? Rotating with blade gives high-speed blur feeling!
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = ringColor1;
      ctx.shadowBlur = 10;
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
      this.bestStreak = parseInt(localStorage.getItem('emojiblade_best_streak') || '0', 10);
      this.battleState = 'ready'; // 'ready', 'aiming', 'battling', 'finished'
      this.battleStartTime = 0;
      this.battleHits = 0;

      this.is2PMode = false;
      this.isPullAiming = false;
      this.dragStartX = 0;
      this.dragStartY = 0;
      this.dragCurrentX = 0;
      this.dragCurrentY = 0;

      this.arenaCenterX = 400;
      this.arenaCenterY = 300;
      this.arenaRadius = 250;

      this.initDom();
      this.initEvents();
      this.resizeCanvas();
      this.setupStage();
      this.updateStatsUI();

      // Main Loop
      requestAnimationFrame(this.loop.bind(this));
    }

    initDom() {
      // Inputs & Buttons
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

      this.bestStreakEl.textContent = this.bestStreak;
    }

    resizeCanvas() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.ctx.scale(dpr, dpr);

      this.arenaCenterX = rect.width / 2;
      this.arenaCenterY = rect.height / 2;
      this.arenaRadius = Math.min(rect.width, rect.height) * 0.44;

      if (this.battleState === 'ready') {
        this.resetPositions();
      }
    }

    resetPositions() {
      // Player on left, Enemy on right
      const offset = this.arenaRadius * 0.52;
      this.playerTop.reset(this.arenaCenterX - offset, this.arenaCenterY);
      this.enemyTop.reset(this.arenaCenterX + offset, this.arenaCenterY);
    }

    setupStage() {
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

      this.enemyTop.configure(enemyConfig.emoji, enemyConfig.style);
      this.resetPositions();
      this.battleState = 'ready';
      this.battleHits = 0;
      this.particles.clear();
      this.resultModal.style.display = 'none';

      document.getElementById('hud-player-emoji').textContent = this.playerTop.emoji;
      document.getElementById('hud-enemy-emoji').textContent = this.enemyTop.emoji;
      document.getElementById('player-tier').textContent = `${this.playerTop.stats.tier}-TIER`;
      document.getElementById('enemy-tier').textContent = `${this.enemyTop.stats.tier}-TIER`;

      this.updateHudBars();
      this.statusMsg.textContent = i18n[currentLang].statusReady || 'Ready to launch!';
    }

    updateStatsUI() {
      const stats = this.playerTop.stats;
      document.getElementById('stat-weight-val').textContent = stats.mass;
      document.getElementById('stat-attack-val').textContent = stats.attack;
      document.getElementById('stat-speed-val').textContent = stats.speed;
      document.getElementById('stat-endurance-val').textContent = stats.endurance;

      document.getElementById('meter-weight').style.width = `${stats.mass}%`;
      document.getElementById('meter-attack').style.width = `${stats.attack}%`;
      document.getElementById('meter-speed').style.width = `${stats.speed}%`;
      document.getElementById('meter-endurance').style.width = `${stats.endurance}%`;

      document.getElementById('hud-player-emoji').textContent = this.playerTop.emoji;
      document.getElementById('player-tier').textContent = `${stats.tier}-TIER`;
    }

    initEvents() {
      window.addEventListener('resize', () => this.resizeCanvas());

      // Sound toggle
      const soundBtn = document.getElementById('sound-toggle-btn');
      soundBtn.addEventListener('click', () => {
        sfx.init();
        sfx.enabled = !sfx.enabled;
        document.getElementById('sound-icon').textContent = sfx.enabled ? '🔊' : '🔇';
      });

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
        this.triggerLaunch();
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
        const dist = Math.hypot(pos.x - this.playerTop.x, pos.y - this.playerTop.y);
        if (dist < 80) {
          this.isPullAiming = true;
          this.dragStartX = this.playerTop.x;
          this.dragStartY = this.playerTop.y;
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

        // Sync with power/angle sliders
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
        this.triggerLaunch();
      };

      this.canvas.addEventListener('mousedown', startPull);
      window.addEventListener('mousemove', movePull);
      window.addEventListener('mouseup', endPull);

      this.canvas.addEventListener('touchstart', startPull, { passive: false });
      window.addEventListener('touchmove', movePull, { passive: false });
      window.addEventListener('touchend', endPull);

      // Copy Embed Code Button
      const copyBtn = document.getElementById('copy-embed-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          const text = document.getElementById('embed-code-text');
          text.select();
          navigator.clipboard.writeText(text.value).then(() => {
            copyBtn.textContent = '✅ Copied to Clipboard!';
            setTimeout(() => { copyBtn.textContent = '📋 Copy Embed Code'; }, 2000);
          });
        });
      }
    }

    triggerLaunch() {
      if (this.battleState !== 'ready') return;
      this.battleState = 'battling';
      this.battleStartTime = performance.now();
      this.battleHits = 0;

      const pPower = parseInt(this.powerSlider.value, 10);
      const pAngle = parseInt(this.angleSlider.value, 10);

      this.playerTop.launch(pAngle, pPower);

      // Enemy AI launch calculation
      // AI targets player starting position with variance
      let eAngle = -145 + (Math.random() * 40 - 20);
      let ePower = 75 + Math.min(this.stage * 3, 25);
      if (this.is2PMode) {
        eAngle = 180 - pAngle; // mirror
        ePower = pPower;
      }
      this.enemyTop.launch(eAngle, ePower);

      this.statusMsg.textContent = '⚡ CLASH IN PROGRESS!';
    }

    handleTopCollisions() {
      if (!this.playerTop.isSpinning || !this.enemyTop.isSpinning) return;

      const dx = this.enemyTop.x - this.playerTop.x;
      const dy = this.enemyTop.y - this.playerTop.y;
      const dist = Math.hypot(dx, dy);
      const minDist = this.playerTop.radius + this.enemyTop.radius;

      if (dist < minDist && dist > 0) {
        this.battleHits++;
        const nx = dx / dist;
        const ny = dy / dist;

        // Separate overlaps
        const overlap = (minDist - dist) * 0.5;
        this.playerTop.x -= nx * overlap;
        this.playerTop.y -= ny * overlap;
        this.enemyTop.x += nx * overlap;
        this.enemyTop.y += ny * overlap;

        // Relative velocity along collision normal
        const kx = this.playerTop.vx - this.enemyTop.vx;
        const ky = this.playerTop.vy - this.enemyTop.vy;
        const p = 2 * (nx * kx + ny * ky) / (this.playerTop.stats.mass + this.enemyTop.stats.mass);

        // Apply impulse
        this.playerTop.vx -= p * this.enemyTop.stats.mass * nx * 1.25;
        this.playerTop.vy -= p * this.enemyTop.stats.mass * ny * 1.25;
        this.enemyTop.vx += p * this.playerTop.stats.mass * nx * 1.25;
        this.enemyTop.vy += p * this.playerTop.stats.mass * ny * 1.25;

        // Damage & Critical Hit evaluation
        const clashImpact = Math.hypot(kx, ky);
        const isCrit = Math.random() < 0.25 || clashImpact > 8;
        const critMultiplier = isCrit ? 1.45 : 1.0;

        const playerDamage = (clashImpact * 1.8 + (this.enemyTop.stats.attack / 10)) * (100 / this.playerTop.stats.mass) * critMultiplier * 0.35;
        const enemyDamage = (clashImpact * 1.8 + (this.playerTop.stats.attack / 10)) * (100 / this.enemyTop.stats.mass) * critMultiplier * 0.35;

        this.playerTop.energy -= playerDamage;
        this.enemyTop.energy -= enemyDamage;

        // FX Sparks & Sound
        const midX = (this.playerTop.x + this.enemyTop.x) / 2;
        const midY = (this.playerTop.y + this.enemyTop.y) / 2;
        this.particles.emitSparks(midX, midY, isCrit ? '#ffd32a' : '#00f0ff', isCrit ? 24 : 14, clashImpact * 0.8);
        if (isCrit) this.particles.emitShockwave(midX, midY, '#ffd32a');
        sfx.playClash(Math.min(clashImpact * 0.2, 1), isCrit);

        // Screen Shake
        if (isCrit) this.applyScreenShake(6);
      }
    }

    applyScreenShake(intensity) {
      const container = document.getElementById('arena-container');
      container.style.transform = `translate(${(Math.random() - 0.5) * intensity}px, ${(Math.random() - 0.5) * intensity}px)`;
      setTimeout(() => { container.style.transform = 'translate(0, 0)'; }, 80);
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

      const playerStopped = !this.playerTop.isSpinning;
      const enemyStopped = !this.enemyTop.isSpinning;

      if (playerStopped || enemyStopped) {
        this.battleState = 'finished';
        const battleDuration = ((performance.now() - this.battleStartTime) / 1000).toFixed(1);
        const playerWon = this.playerTop.energy > this.enemyTop.energy;

        const banner = document.getElementById('result-banner');
        const summary = document.getElementById('result-summary');
        document.getElementById('res-hit-count').textContent = this.battleHits;
        document.getElementById('res-time-val').textContent = `${battleDuration}s`;
        document.getElementById('res-type-val').textContent = playerWon ? 'Outspun' : 'Spin Depleted';

        if (playerWon) {
          banner.textContent = 'VICTORY! 🏆';
          banner.className = 'result-banner';
          summary.textContent = `${this.playerTop.emoji} successfully shattered ${this.enemyTop.emoji}'s stamina!`;
          this.winStreak++;
          if (this.winStreak > this.bestStreak) {
            this.bestStreak = this.winStreak;
            localStorage.setItem('emojiblade_best_streak', String(this.bestStreak));
            this.bestStreakEl.textContent = this.bestStreak;
          }
          this.stage++;
          sfx.playWin();
          this.particles.emitSparks(this.playerTop.x, this.playerTop.y, '#ffd32a', 30, 8);
        } else {
          banner.textContent = 'DEFEAT 💥';
          banner.className = 'result-banner defeat';
          summary.textContent = `${this.enemyTop.emoji} outlasted your blade in the final clash!`;
          this.winStreak = 0;
        }

        this.streakCounter.textContent = this.winStreak;
        setTimeout(() => {
          this.resultModal.style.display = 'flex';
        }, 600);
      }
    }

    drawArena() {
      const ctx = this.ctx;
      const cx = this.arenaCenterX;
      const cy = this.arenaCenterY;
      const r = this.arenaRadius;

      // Arena Outer Rim (Metallic Bevel)
      ctx.save();
      const outerGrad = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r + 24);
      outerGrad.addColorStop(0, '#101726');
      outerGrad.addColorStop(0.7, '#1b2742');
      outerGrad.addColorStop(1, '#080d18');
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 20, 0, Math.PI * 2);
      ctx.fill();

      // Outer Neon Ring
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Floor Dish (Concave Bowl Texture)
      const bowlGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
      bowlGrad.addColorStop(0, '#131e36');
      bowlGrad.addColorStop(0.65, '#0b1220');
      bowlGrad.addColorStop(1, '#050912');
      ctx.fillStyle = bowlGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Radial Grid Guidelines & Center Cross
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
      ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
      ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
      ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
      ctx.stroke();

      // Center glowing logo
      ctx.font = '36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillText('🌀', cx, cy);

      ctx.restore();
    }

    drawSlingshotGuide() {
      if (!this.isPullAiming) return;
      const ctx = this.ctx;

      const dx = this.dragStartX - this.dragCurrentX;
      const dy = this.dragStartY - this.dragCurrentY;

      // Trajectory vector line (opposite to pull)
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(this.dragStartX, this.dragStartY);
      ctx.lineTo(this.dragStartX + dx * 1.4, this.dragStartY + dy * 1.4);
      ctx.stroke();

      // Pull elastic band
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255, 71, 87, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.dragStartX, this.dragStartY);
      ctx.lineTo(this.dragCurrentX, this.dragCurrentY);
      ctx.stroke();

      // Drag cursor handle
      ctx.fillStyle = '#ff4757';
      ctx.beginPath();
      ctx.arc(this.dragCurrentX, this.dragCurrentY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    generateShareCard() {
      const shareCanvas = document.createElement('canvas');
      shareCanvas.width = 800;
      shareCanvas.height = 450;
      const sCtx = shareCanvas.getContext('2d');

      // Background
      const bgGrad = sCtx.createLinearGradient(0, 0, 800, 450);
      bgGrad.addColorStop(0, '#090e18');
      bgGrad.addColorStop(1, '#15203a');
      sCtx.fillStyle = bgGrad;
      sCtx.fillRect(0, 0, 800, 450);

      // Card Header
      sCtx.fillStyle = '#00f0ff';
      sCtx.font = 'bold 36px Outfit, sans-serif';
      sCtx.fillText('EMOJI BLADE ONLINE', 50, 70);

      sCtx.fillStyle = '#94a3b8';
      sCtx.font = '18px Outfit, sans-serif';
      sCtx.fillText('Spinning Top Physics Arena Clash', 50, 100);

      // Duel Display
      sCtx.font = '72px sans-serif';
      sCtx.textAlign = 'center';
      sCtx.fillText(this.playerTop.emoji, 250, 240);
      sCtx.fillText(this.enemyTop.emoji, 550, 240);

      sCtx.fillStyle = '#ff4757';
      sCtx.font = 'bold 32px JetBrains Mono, monospace';
      sCtx.fillText('VS', 400, 230);

      // Stats
      sCtx.fillStyle = '#ffd32a';
      sCtx.font = 'bold 24px Outfit, sans-serif';
      sCtx.fillText(`🔥 WIN STREAK: ${this.winStreak}  |  STAGE: ${this.stage}`, 400, 320);

      sCtx.fillStyle = '#64748b';
      sCtx.font = '16px monospace';
      sCtx.fillText('Play free in browser 👉 emojiblade.online', 400, 400);

      // Download Trigger
      const link = document.createElement('a');
      link.download = `emoji-blade-streak-${this.winStreak}.png`;
      link.href = shareCanvas.toDataURL('image/png');
      link.click();
    }

    loop() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.ctx.clearRect(0, 0, rect.width, rect.height);

      this.drawArena();

      if (this.battleState === 'battling') {
        this.playerTop.update(this.arenaCenterX, this.arenaCenterY, this.arenaRadius);
        this.enemyTop.update(this.arenaCenterX, this.arenaCenterY, this.arenaRadius);
        this.handleTopCollisions();
        this.updateHudBars();
        this.checkBattleOutcome();
      }

      this.playerTop.draw(this.ctx);
      this.enemyTop.draw(this.ctx);

      this.particles.updateAndDraw(this.ctx);
      this.drawSlingshotGuide();

      requestAnimationFrame(this.loop.bind(this));
    }
  }

  // --- MULTILINGUAL i18n SYSTEM ---
  const i18n = {
    en: {
      navPlay: 'Play Now',
      navTier: 'Tier List',
      navGuide: 'How to Play',
      navFaq: 'FAQ',
      streakLabel: 'Win Streak:',
      stageLabel: 'STAGE',
      statusReady: 'Drag player top or set angle & launch!',
      playerTag: 'YOU',
      enemyTag: 'RIVAL',
      spinEnergy: 'Spin Energy',
      slingshotHint: '👈 Drag & Pull back to launch',
      customPlayerTitle: 'Your Emoji Blade',
      quickPick: 'Quick Picks:',
      statWeight: 'Weight (Mass)',
      statAttack: 'Attack (Clash)',
      statSpeed: 'Speed (RPM)',
      statEndurance: 'Endurance (Spin)',
      launchConfigTitle: 'Launch Cannon & Rival',
      modeStreak: 'Streak AI',
      mode2P: '2P Local',
      rivalLabel: 'Opponent:',
      launchPower: 'Launch Power:',
      launchAngle: 'Launch Angle:',
      btnLaunch: 'LET IT RIP! 🚀',
      launchTipText: '💡 Tip: Click & drag directly on your spinning top in the arena to pull and slingshot!',
      metaTierBadge: 'EMOJI META ANALYSIS',
      metaTierTitle: 'Emoji Blade Power Rankings (Tier List)',
      metaTierDesc: 'Discover the most competitive spinning top emojis, their weight distributions, and hidden collision mechanics.',
      guideBadge: 'GAMEPLAY MANUAL',
      guideTitle: 'Mastering the Emoji Blade Arena',
      step1Title: 'Choose & Customize Your Emoji',
      step1Desc: 'Type any Unicode emoji, letter or symbol into the input dock. The game algorithm computes its collision geometry in real time.',
      step2Title: 'Slingshot & Angle Mechanics',
      step2Desc: 'Use mouse drag or finger swipe directly in the arena to pull back the slingshot. Pulling further increases RPM launch speed.',
      step3Title: 'Collisions, Recoil & Ring Outs',
      step3Desc: 'Blades lose spin energy during collisions. Landing sharp impacts triggers a Critical Clash with 1.45x knockback.',
      embedBadge: 'FREE FOR WEBMASTERS',
      embedTitle: 'Embed Emoji Blade on Your Website',
      embedDesc: 'Boost your gaming blog, school portal, or unblocked games hub with this instant, lightweight interactive widget.',
      copyEmbedBtn: '📋 Copy Embed Code',
      faqTitle: 'Frequently Asked Questions',
      faq1Q: 'Can I use any emoji from my mobile keyboard?',
      faq1A: 'Yes! Simply open your mobile keyboard or copy-paste any emoji (such as 👾, 🦄, ⚽, 🐉, 🥑).',
      faq2Q: 'What determines a Critical Clash?',
      faq2A: 'A Critical Clash happens when your spinning tip collides with an opponent at high relative velocity.',
      faq3Q: 'Is there an offline or mobile app version?',
      faq3A: 'Emoji Blade is built as a lightweight Progressive Web App (PWA). You can tap "Add to Home Screen" in Safari or Chrome.',
      btnNextStage: 'Next Stage ⚡',
      btnShareCard: '📸 Share Card'
    },
    'zh-Hans': {
      navPlay: '即刻开玩',
      navTier: '强度天梯榜',
      navGuide: '玩法攻略',
      navFaq: '常见问答',
      streakLabel: '连胜纪录:',
      stageLabel: '关卡',
      statusReady: '在场内拖拽陀螺蓄力，或调整角度发射！',
      playerTag: '玩家',
      enemyTag: '对手',
      spinEnergy: '自旋能量',
      slingshotHint: '👈 拖拽陀螺后拉蓄力弹射',
      customPlayerTitle: '配置你的 Emoji 陀螺',
      quickPick: '快速选择:',
      statWeight: '重量 (质量)',
      statAttack: '攻击 (冲撞力)',
      statSpeed: '转速 (RPM)',
      statEndurance: '耐力 (旋转持久)',
      launchConfigTitle: '发射装置与对手',
      modeStreak: '闯关连胜',
      mode2P: '双人同屏',
      rivalLabel: '对手设定:',
      launchPower: '发射力度:',
      launchAngle: '发射角度:',
      btnLaunch: '陀螺发射！LET IT RIP! 🚀',
      launchTipText: '💡 提示：在竞技场直接点击并拖动你的陀螺，即可像弹弓一样后拉弹射！',
      metaTierBadge: 'EMOJI 竞技环境分析',
      metaTierTitle: 'Emoji 陀螺强度天梯榜 (Tier List)',
      metaTierDesc: '探索最具竞争力的 Emoji 陀螺组合、质量分布与隐藏碰撞物理机制。',
      guideBadge: '竞技场操作指南',
      guideTitle: '精通 Emoji Blade 竞技场法则',
      step1Title: '自选输入任意 Emoji',
      step1Desc: '输入任意 Unicode 表情符号或文字，物理算法将根据字符特征动态生成质量、锋利度与转速。',
      step2Title: '弹弓蓄力与切入角度',
      step2Desc: '在竞技场内拖拽陀螺拉弓，拉伸距离越长，初速度和转矩越大。',
      step3Title: '剧烈撞击与暴击击退',
      step3Desc: '高速碰撞将削减双方旋转能量。以刁钻角度切入命中弱点将触发 1.45 倍暴击击退！',
      embedBadge: '站长免费接入',
      embedTitle: '将 Emoji Blade 嵌入你的网站',
      embedDesc: '通过免安装的轻量级 H5 Widget 为你的游戏博客、导航站增加用户停留时长。',
      copyEmbedBtn: '📋 复制代码',
      faqTitle: '常见问题解答 (FAQ)',
      faq1Q: '可以用手机输入法里的任何表情符号吗？',
      faq1A: '完全可以！无论是 👾、🦄、⚽、🐉 还是 🥑，系统都会实时计算其专属物理属性。',
      faq2Q: '如何触发暴击（Critical Clash）？',
      faq2A: '当你的陀螺高速突进并切入对手侧翼薄弱点时，将伴随全屏震颤与金黄火花触发暴击。',
      faq3Q: '需要下载安装吗？',
      faq3A: '无需下载任何安装包，所有现代浏览器（PC/手机）即点即玩，支持添加到主屏幕。',
      btnNextStage: '进入下一关 ⚡',
      btnShareCard: '📸 生成战绩海报'
    },
    ja: {
      navPlay: '今すぐプレイ',
      navTier: 'Tier表（強さ順）',
      navGuide: '遊び方',
      navFaq: 'FAQ',
      streakLabel: '連勝記録:',
      stageLabel: 'ステージ',
      statusReady: 'コマを引っ張って狙いを定めて発射！',
      playerTag: '自分',
      enemyTag: 'ライバル',
      spinEnergy: '回転エネルギー',
      slingshotHint: '👈 コマを引っ張ってリリース',
      customPlayerTitle: '絵文字ブレード設定',
      quickPick: 'クイック選択:',
      statWeight: '重量 (マス)',
      statAttack: '攻撃 (衝突力)',
      statSpeed: 'スピード (回転数)',
      statEndurance: 'スタミナ (持続)',
      launchConfigTitle: '発射設定 & 対戦相手',
      modeStreak: '連勝チャレンジ',
      mode2P: '2人対戦',
      rivalLabel: '対戦相手:',
      launchPower: '発射パワー:',
      launchAngle: '発射角度:',
      btnLaunch: 'ゴーシュート！🚀',
      launchTipText: '💡 ヒント: アリーナ内のコマを指やマウスで直接引っ張って発射できます！',
      metaTierBadge: 'メタ環境分析',
      metaTierTitle: 'Emoji Blade 最強Tier表',
      metaTierDesc: '競技性の高い絵文字コマのステータスと物理衝突の秘密をチェック。',
      guideBadge: 'プレイガイド',
      guideTitle: 'アリーナを制する3つの極意',
      step1Title: '絵文字を選んでカスタム',
      step1Desc: '好きな絵文字を入力。形や画数から自動で重量・攻撃力・スタミナをリアルタイム計算。',
      step2Title: '引っ張り操作と角度調整',
      step2Desc: '指やマウスで後ろに引っ張って離すだけ。強く引くほど強烈なスピンで突撃します。',
      step3Title: 'クリティカルヒットと場外弾き',
      step3Desc: '回転チップが相手の急所に当たると1.45倍のクリティカルヒットが発生！',
      embedBadge: 'ウェブマスター向け',
      embedTitle: 'あなたのサイトに埋め込む',
      embedDesc: 'HTMLコードをコピーするだけで、ブログやポータルにゲームを導入できます。',
      copyEmbedBtn: '📋 埋め込みコードをコピー',
      faqTitle: 'よくある質問',
      faq1Q: 'どんな絵文字でも戦えますか？',
      faq1A: 'はい！スマホの絵文字キーボードにあるあらゆる文字に対応しています。',
      faq2Q: 'クリティカルヒットの条件は？',
      faq2A: '高い相対速度で相手の側面をとらえた瞬間に強力な衝撃波とともに発動します。',
      faq3Q: 'アプリのダウンロードは必要ですか？',
      faq3A: '不要です。ブラウザ上で完全無料でスムーズに動作します。',
      btnNextStage: '次のステージへ ⚡',
      btnShareCard: '📸 結果画像を保存'
    }
  };

  let currentLang = 'en';

  function applyLanguage(lang) {
    if (!i18n[lang]) lang = 'en';
    currentLang = lang;
    document.documentElement.setAttribute('data-lang', lang);

    const labels = {
      en: 'English',
      'zh-Hans': '简体中文',
      'zh-Hant': '繁體中文',
      ja: '日本語',
      ko: '한국어',
      es: 'Español'
    };
    document.getElementById('current-lang-label').textContent = labels[lang] || 'English';

    const dict = i18n[lang] || i18n['en'];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) el.textContent = dict[key];
    });
  }

  // Language Dropdown setup
  const langBtn = document.getElementById('lang-btn');
  const langDropdown = langBtn.parentElement;
  langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    langDropdown.classList.toggle('open');
  });
  window.addEventListener('click', () => langDropdown.classList.remove('open'));

  document.querySelectorAll('[data-set-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      applyLanguage(btn.getAttribute('data-set-lang'));
      langDropdown.classList.remove('open');
    });
  });

  // Start the game instance
  window.addEventListener('DOMContentLoaded', () => {
    window.emojiBladeApp = new EmojiBladeGame();
  });

})();
