/* Сервис-воркер: кэширует все файлы платформы, чтобы она открывалась без интернета.
   Стратегия «сначала кэш»: страница открывается мгновенно даже при очень медленном
   интернете, а свежие файлы догружаются в фоне и применяются при следующем открытии. */
const CACHE = 'sobericod-v19';
const FILES = [
  './', 'index.html', 'manifest.json', 'icon.svg', 'css/style.css',
  'js/icons.js', 'js/data.js', 'js/store.js', 'js/sync.js', 'js/engine.js', 'js/ui.js', 'js/editor.js',
  'js/lesson.js', 'js/studio.js', 'js/auth.js', 'js/teacher.js', 'js/pages.js', 'js/tour.js', 'js/main.js'
];

/* cache: 'reload' обязателен: иначе установка берёт файлы из обычного кэша
   браузера (у GitHub Pages он живёт десять минут) и новая версия приезжает
   со старой вёрсткой внутри. */
self.addEventListener('install', e => {
  const fresh = FILES.map(f => new Request(f, { cache: 'reload' }));
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(fresh)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

/* Скачивает свежую версию файла и кладёт её в кэш */
function refresh(req) {
  // no-cache — не «не кэшировать», а «спросить сервер, не изменилось ли»:
  // сервер ответит 304, если файл тот же, и свежим файлом, если другой.
  // Без этого фоновое обновление месяцами кладёт в кэш ту же старую копию.
  return fetch(req, { cache: 'no-cache' }).then(res => {
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
    }
    return res;
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // Синхронизацию класса не кэшируем: учителю нужен свежий журнал, а не вчерашний
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/api/')) return;

  /* Саму страницу берём из сети, если сеть отвечает за две секунды: иначе
     после обновления сайта ребёнок и учитель ещё долго видели вчерашнюю
     версию, и даже Ctrl+Shift+R возвращал её из кэша. Адреса файлов внутри
     страницы помечены версией (?v=…), поэтому свежая страница тянет свежие
     стили и скрипты, а не берёт их из кэша. Нет сети — отдаём кэш. */
  if (req.mode === 'navigate') {
    e.respondWith(
      Promise.race([
        refresh(req).catch(() => null),
        new Promise(res => setTimeout(() => res(null), 2000))
      ]).then(res => res || caches.match('index.html', { ignoreSearch: true }))
    );
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) {
        // Отдаём кэш сразу; если интернета нет, фоновое обновление просто не удастся
        e.waitUntil(refresh(req).catch(() => {}));
        return hit;
      }
      return refresh(req).catch(err => {
        if (req.mode === 'navigate') return caches.match('index.html');
        throw err;
      });
    })
  );
});
