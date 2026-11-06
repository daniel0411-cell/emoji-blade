function toggleIframeFullscreen() {
      const container = document.getElementById('gameFrameContainer');
      const iframe = document.getElementById('gameIframe');
      if (!document.fullscreenElement) {
        if (container.requestFullscreen) {
          container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          container.webkitRequestFullscreen();
        }
        iframe.style.height = 'calc(100vh - 45px)';
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
        iframe.style.height = '750px';
      }
    }
    document.addEventListener('fullscreenchange', () => {
      const iframe = document.getElementById('gameIframe');
      if (!document.fullscreenElement) {
        iframe.style.height = '750px';
      }
    });
document.getElementById('fsToggleBtn').addEventListener('click', toggleIframeFullscreen);
