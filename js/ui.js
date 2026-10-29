/* ===== Общие элементы интерфейса: навигация, уведомления, окна ===== */

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

/* Навигация через адрес (#courses, #lesson/steps/2) — работает кнопка «Назад»
   и учитель может дать ссылку сразу на нужный урок. */
const ROUTES = {};
function route(name, fn) { ROUTES[name] = fn; }

function go(path) {
  if (location.hash === '#' + path) handleRoute();
  else location.hash = path;
}

function handleRoute() {
  const [page, ...args] = (location.hash.slice(1) || 'home').split('/');
  const name = ROUTES[page] ? page : 'home';
  if (window.currentStage) window.currentStage.stop();
  Speech.stop();   // голос не должен договаривать задание на другой странице
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + name));
  document.querySelectorAll('.nav-links a').forEach(a =>
    a.classList.toggle('active', a.dataset.page === name || (a.dataset.also || '').split(',').includes(name)));
  window.scrollTo(0, 0);
  ROUTES[name](...args.map(decodeURIComponent));
}

/* Всплывающая подсказка вместо alert() */
let toastTimer;
function toast(msg, kind = 'info') {
  const el = document.getElementById('toast');
  el.className = 'toast show ' + kind;
  el.innerHTML = '<span class="toast-hero">' + ICONS.cat + '</span><span>' + esc(msg) + '</span>';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3800);
}

function openModal(html, { wide = false } = {}) {
  const ov = document.getElementById('modal');
  ov.querySelector('.modal').className = 'modal' + (wide ? ' wide' : '');
  ov.querySelector('.modal-body').innerHTML = html;
  ov.classList.add('show');
  const first = ov.querySelector('input,button.btn');
  first && setTimeout(() => first.focus(), 50);
}

function closeModal() {
  document.getElementById('modal').classList.remove('show');
}

function starsHTML(n, max = 3) {
  let s = '';
  for (let i = 0; i < max; i++) s += '<span class="st">' + (i < n ? ICONS.star : ICONS.starEmpty) + '</span>';
  return '<span class="stars">' + s + '</span>';
}

/* Облегчённый режим: без анимаций и теней — для очень слабых компьютеров */
function applyLite() {
  document.body.classList.toggle('lite', !!DB.settings.lite);
  const t = document.getElementById('liteToggle');
  if (t) t.textContent = DB.settings.lite ? 'Облегчённый режим: вкл' : 'Облегчённый режим: выкл';
}

function toggleLite() {
  DB.settings.lite = !DB.settings.lite;
  saveDB();
  applyLite();
  toast(DB.settings.lite ? 'Анимации выключены: так быстрее на слабых компьютерах' : 'Анимации включены');
}

/* ===== Чтение задания вслух =====
   Первоклассник часто ещё читает по слогам, поэтому задание можно послушать.
   Речь синтезирует сам браузер — ни одного скачанного байта, ровно как звук
   в уроках синтезируется через Web Audio. Если голоса в системе нет,
   ничего не произносится и ничего не ломается. */
const Speech = {
  available() {
    return typeof window.speechSynthesis !== 'undefined' &&
           typeof window.SpeechSynthesisUtterance !== 'undefined';
  },

  /* Русский голос, если он есть в системе. Список голосов браузер отдаёт
     не сразу, поэтому отсутствие голоса здесь не повод молчать: без явного
     выбора браузер сам подберёт подходящий по lang. */
  ruVoice() {
    try { return (speechSynthesis.getVoices() || []).find(v => /^ru/i.test(v.lang)) || null; }
    catch (e) { return null; }
  },

  say(text) {
    if (!this.available() || !text) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ru-RU';
      u.rate = 0.9;     // младшим школьникам нужно помедленнее
      const v = this.ruVoice();
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) {}
  },

  stop() {
    if (!this.available()) return;
    try { speechSynthesis.cancel(); } catch (e) {}
  }
};
