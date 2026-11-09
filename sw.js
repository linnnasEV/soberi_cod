/* Сервис-воркер: кэширует все файлы платформы, чтобы она открывалась без интернета.
   Стратегия «сначала кэш»: страница открывается мгновенно даже при очень медленном
   интернете, а свежие файлы догружаются в фоне и применяются при следующем открытии. */
/* V — единственное место, где меняется версия. Это же число стоит в адресах
   стилей и скриптов в index.html (?v=…): при их несовпадении страница будет
   брать файлы из сети каждый раз, но ничего не сломается. */
const V = '34';
const CACHE = 'sobericod-v' + V;
const ASSETS = [
  'css/style.css',
  'js/icons.js', 'js/data.js', 'js/api.js', 'js/store.js', 'js/engine.js', 'js/ui.js', 'js/editor.js',
  'js/lesson.js', 'js/studio.js', 'js/auth.js', 'js/teacher.js', 'js/parent.js', 'js/pages.js',
  'js/tour.js', 'js/main.js'
].map(f => f + '?v=' + V);
const FILES = ['./', 'index.html', 'manifest.json', 'icon.svg'].concat(ASSETS);

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
    // Совпадение точное, вместе с ?v=…: иначе новая версия файла доставала бы
    // из кэша старую — ровно то, из-за чего правки не доезжали.
    caches.match(req).then(hit => {
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
