(function init() {
  applyLite();
  applySound();
  renderAuthArea();
  document.getElementById('logoIcon').innerHTML = ICONS.logo;

  window.addEventListener('hashchange', handleRoute);
  handleRoute();

  const modal = document.getElementById('modal');
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // Офлайн-режим: после первого открытия сайт работает без интернета.
  // Сервис-воркер работает только на http(s), при открытии файла с диска просто пропускается.
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  const net = document.getElementById('netStatus');
  const upd = () => { net.textContent = navigator.onLine ? 'Работает и без интернета' : 'Сейчас без интернета — всё работает'; };
  window.addEventListener('online', upd);
  window.addEventListener('offline', upd);
  upd();
})();
