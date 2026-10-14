'use strict';

document.getElementById('copy-embed-btn').addEventListener('click', async () => {
  const code = document.getElementById('embed-code-text');
  const status = document.getElementById('embed-copy-status');
  code.focus();
  code.select();
  try {
    await navigator.clipboard.writeText(code.value);
    status.textContent = 'Embed code copied.';
  } catch {
    status.textContent = 'Copy is unavailable. The code is selected; press Ctrl+C or Command+C, or use your device copy menu.';
  }
});
