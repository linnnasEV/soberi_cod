/* Сервис-воркер: кэширует все файлы платформы, чтобы она открывалась без интернета */
const CACHE = 'sobericod-v2';
const FILES = [
  './', 'index.html', 'manifest.json', 'icon.svg', 'css/style.css',
  'js/icons.js', 'js/data.js', 'js/store.js', 'js/engine.js', 'js/ui.js', 'js/editor.js',
  'js/lesson.js', 'js/studio.js', 'js/auth.js', 'js/teacher.js', 'js/pages.js', 'js/main.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

/* Сначала сеть (чтобы обновления доходили), при её отсутствии — кэш */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
