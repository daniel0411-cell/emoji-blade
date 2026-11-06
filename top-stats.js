(function () {
  'use strict';
  function normalizeEmoji(value) {
    const text = String(value || '').trim().slice(0, 128);
    if (!text) return '🔥';
    if (typeof Intl.Segmenter === 'function') {
      return new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)[Symbol.iterator]().next().value.segment;
    }
    return Array.from(text)[0];
  }

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

  window.EmojiBladeStats = { normalizeEmoji, computeEmojiStats, EMOJI_PRESETS };
})();
