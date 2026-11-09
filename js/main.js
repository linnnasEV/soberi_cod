(function init() {
  applySound();
  renderAuthArea();
  // Кто за компьютером, знает сервер: вход живёт в cookie, которую страница
  // прочитать не может. Спрашиваем сразу, но не ждём ответа — без интернета
  // платформа должна открыться так же быстро, как с ним.
  bootSession();
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
  // Вернулась связь — отправляем то, что ребёнок прошёл без интернета.
  window.addEventListener('online', () => { if (typeof syncPushSoon === 'function') syncPushSoon(); });

  // Звук и голос на телефоне включаются только после того, как человек
  // что-то нажал: сами по себе браузер их не пускает. Будим оба при первом
  // касании — одного раза хватает на всё время работы.
  const wake = () => { Sound.unlock(); Speech.unlock(); };
  ['pointerdown', 'touchstart', 'keydown'].forEach(ev =>
    window.addEventListener(ev, wake, { once: true, passive: true }));

  // Список голосов приходит с задержкой, особенно на Android. Дождавшись
  // его, перерисовываем ничего — просто даём Speech подхватить русский голос.
  if (Speech.available() && typeof speechSynthesis.addEventListener === 'function') {
    speechSynthesis.addEventListener('voiceschanged', () => {});
  }
})();
