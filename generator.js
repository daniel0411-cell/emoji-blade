(function () {
  'use strict';
  const { normalizeEmoji, computeEmojiStats } = window.EmojiBladeStats;
  const input = document.getElementById('calcEmojiInput');
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
  let toastTimer;
  function update() {
    const emoji = normalizeEmoji(input.value.trim() || '🦄');
    const stats = computeEmojiStats(emoji);
    document.getElementById('topAvatar').textContent = emoji;
    document.getElementById('topName').textContent = stats.name;
    const pill = document.getElementById('tierPill');
    pill.className = `tier-pill tier-${stats.tier.toLowerCase()}`;
    pill.textContent = `${stats.tier} ${lang.startsWith('zh') ? '级' : 'TIER'}`;
    for (const key of ['mass', 'attack', 'speed', 'endurance']) {
      document.getElementById(`${key}Val`).textContent = `${stats[key]} / 100`;
      document.getElementById(`${key}Bar`).style.width = `${Math.min(100, stats[key])}%`;
    }
    const launch = document.getElementById('launchArenaBtn');
    launch.href = `${prefix}?emoji=${encodeURIComponent(emoji)}`;
    launch.textContent = `${text[0]} ${emoji} ${text[1]}`;
    return emoji;
  }
  input.addEventListener('input', update);
  document.querySelectorAll('[data-emoji]').forEach(button => button.addEventListener('click', () => {
    input.value = button.dataset.emoji;
    update();
  }));
  document.getElementById('copyShareBtn').addEventListener('click', async () => {
    clearTimeout(toastTimer);
    toast.style.display = 'none';
    const url = new URL(location.pathname, location.origin);
    url.searchParams.set('emoji', update());
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
  const emoji = new URLSearchParams(location.search).get('emoji');
  if (emoji) input.value = emoji;
  update();
})();
