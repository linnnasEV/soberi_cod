/* Сервис-воркер: кэширует все файлы платформы, чтобы она открывалась без интернета.
   Стратегия «сначала кэш»: страница открывается мгновенно даже при очень медленном
   интернете, а свежие файлы догружаются в фоне и применяются при следующем открытии. */
const CACHE = 'sobericod-v7';
const FILES = [
  './', 'index.html', 'manifest.json', 'icon.svg', 'css/style.css',
  'js/icons.js', 'js/data.js', 'js/store.js', 'js/sync.js', 'js/engine.js', 'js/ui.js', 'js/editor.js',
  'js/lesson.js', 'js/studio.js', 'js/auth.js', 'js/teacher.js', 'js/pages.js', 'js/main.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

/* Скачивает свежую версию файла и кладёт её в кэш */
function refresh(req) {
  return fetch(req).then(res => {
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
