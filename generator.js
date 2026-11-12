(function () {
  'use strict';
  const { normalizeEmoji, computeEmojiStats } = window.EmojiBladeStats;
  const input = document.getElementById('calcEmojiInput');
  const rivalInput = document.getElementById('rivalEmojiInput');
  const compareToggle = document.getElementById('compareToggle');
  const toast = document.getElementById('toastNotify');
  const prefix = location.pathname.replace(/generator\/$/, '');
  const lang = document.documentElement.lang;
  const messages = {
    en: ['Battle with', 'in Arena', 'Copy this build link:', 'Build link copied to clipboard!'],
    'zh-Hans': ['带着', '进入竞技场', '请复制此配装链接：', '配装链接已复制！'],
    'zh-Hant': ['帶著', '進入競技場', '請複製此配裝連結：', '配裝連結已複製！'],
    ja: ['', 'でアリーナへ', 'このビルドリンクをコピー：', 'リンクをコピーしました！'],
  };
  const text = messages[lang] || messages.en;
  const comparisonText = {
    en: ['Start Local Duel', 'Copy Comparison Link', 'Copy Build Link'],
    'zh-Hans': ['开始本地双人对战', '复制对比链接', '复制配置链接'],
    'zh-Hant': ['開始本地雙人對戰', '複製對比連結', '複製配置連結'],
    ja: ['ローカル2人対戦へ', '比較リンクをコピー', '構成リンクをコピー'],
  }[lang] || ['Start Local Duel', 'Copy Comparison Link', 'Copy Build Link'];
  const presetNames = {
    '🔥': ['烈焰', '烈焰', '炎'], '💣': ['炸弹', '炸彈', '爆弾'],
    '⚡': ['闪电', '閃電', '稲妻'], '💎': ['钻石', '鑽石', 'ダイヤ'],
    '🚀': ['火箭', '火箭', 'ロケット'], '🥊': ['拳套', '拳套', 'グローブ'],
    '🤡': ['小丑', '小丑', 'ピエロ'], '💀': ['骷髅', '骷髏', 'ドクロ'],
    '🗿': ['摩艾', '摩艾', 'モアイ'], '🍕': ['披萨', '披薩', 'ピザ'],
    '👑': ['王冠', '王冠', '王冠'], '🌪️': ['龙卷风', '龍捲風', '竜巻'],
    '🥑': ['牛油果', '酪梨', 'アボカド'], '👾': ['像素入侵者', '畫素入侵者', 'レトロインベーダー'],
    '👹': ['鬼怪', '鬼怪', '鬼'], '🐉': ['巨龙', '巨龍', 'ドラゴン'],
  };
  const nameIndex = ['zh-Hans', 'zh-Hant', 'ja'].indexOf(lang);
  const customLabel = { en: 'Custom', 'zh-Hans': '自定义', 'zh-Hant': '自訂', ja: 'カスタム' }[lang] || 'Custom';
  const tierLabel = { en: 'TIER', 'zh-Hans': '级', 'zh-Hant': '級', ja: 'ランク' }[lang] || 'TIER';
  let toastTimer;
  function topName(emoji, stats) {
    return presetNames[emoji]?.[nameIndex]
      || (stats.name.startsWith('Custom ') ? `${customLabel} ${emoji}` : stats.name);
  }
  function update() {
    const emoji = normalizeEmoji(input.value.trim() || '🦄');
    const rival = normalizeEmoji(rivalInput.value.trim() || '💎');
    const stats = computeEmojiStats(emoji);
    const rivalStats = computeEmojiStats(rival);
    const comparing = compareToggle.checked;
    document.getElementById('genPickers').classList.toggle('is-comparing', comparing);
    document.getElementById('rivalPicker').hidden = !comparing;
    document.getElementById('swapTopsBtn').hidden = !comparing;
    document.getElementById('singlePreview').hidden = comparing;
    document.getElementById('comparePanel').hidden = !comparing;
    document.getElementById('topAvatar').textContent = emoji;
    document.getElementById('topName').textContent = topName(emoji, stats);
    const pill = document.getElementById('tierPill');
    pill.className = `tier-pill tier-${stats.tier.toLowerCase()}`;
    pill.textContent = `${stats.tier} ${tierLabel}`;
    for (const key of ['mass', 'attack', 'speed', 'endurance']) {
      document.getElementById(`${key}Val`).textContent = `${stats[key]} / 100`;
      document.getElementById(`${key}Bar`).style.width = `${Math.min(100, stats[key])}%`;
      for (const [side, values] of [['left', stats], ['right', rivalStats]]) {
        document.getElementById(`compare-${key}-${side}`).textContent = values[key];
        document.getElementById(`compare-${key}-${side}-bar`).style.width = `${Math.min(100, values[key])}%`;
      }
    }
    for (const [side, value, values] of [['left', emoji, stats], ['right', rival, rivalStats]]) {
      document.getElementById(`compare-${side}-avatar`).textContent = value;
      document.getElementById(`compare-${side}-name`).textContent = topName(value, values);
      const tier = document.getElementById(`compare-${side}-tier`);
      tier.textContent = `${values.tier} ${tierLabel}`;
      tier.className = `tier-pill tier-${values.tier.toLowerCase()}`;
    }
    const launch = document.getElementById('launchArenaBtn');
    const launchParams = new URLSearchParams({ emoji });
    if (comparing) {
      launchParams.set('mode', '2p');
      launchParams.set('rival', rival);
    }
    launch.href = `${prefix}?${launchParams}`;
    launch.textContent = comparing ? comparisonText[0] : `${text[0]} ${emoji} ${text[1]}`.trim();
    document.getElementById('copyShareLabel').textContent = comparisonText[comparing ? 1 : 2];
    return { emoji, rival, comparing };
  }
  input.addEventListener('input', update);
  rivalInput.addEventListener('input', update);
  compareToggle.addEventListener('change', update);
  document.getElementById('swapTopsBtn').addEventListener('click', () => {
    const { emoji, rival } = update();
    input.value = rival;
    rivalInput.value = emoji;
    update();
  });
  document.querySelectorAll('[data-emoji]').forEach(button => button.addEventListener('click', () => {
    const target = button.closest('#rivalPicker') ? rivalInput : input;
    target.value = button.dataset.emoji;
    update();
  }));
  document.getElementById('copyShareBtn').addEventListener('click', async () => {
    clearTimeout(toastTimer);
    toast.style.display = 'none';
    const url = new URL(location.pathname, location.origin);
    const { emoji, rival, comparing } = update();
    url.searchParams.set('emoji', emoji);
    if (comparing) url.searchParams.set('rival', rival);
    try {
      await navigator.clipboard.writeText(url.href);
      toast.textContent = text[3];
      toast.setAttribute('role', 'status');
      toast.style.display = 'block';
      toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 2500);
    } catch {
      window.prompt(text[2], url.href);
    }
  });
  const params = new URLSearchParams(location.search);
  const emoji = params.get('emoji');
  if (emoji) input.value = emoji;
  if (params.has('rival')) {
    rivalInput.value = params.get('rival');
    compareToggle.checked = true;
  }
  update();
})();
