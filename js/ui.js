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
  closeMenu();
  document.body.classList.remove('sheet-open');
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + name));
  document.querySelectorAll('.nav-links a').forEach(a =>
    a.classList.toggle('active', a.dataset.page === name || (a.dataset.also || '').split(',').includes(name)));
  window.scrollTo(0, 0);
  ROUTES[name](...args.map(decodeURIComponent));
}

/* Всплывающая подсказка вместо alert().
   action = { label, fn } добавляет кнопку: так «Сбросить» обходится без
   блокирующего «вы уверены?» — ребёнок просто жмёт «Отменить», если промахнулся. */
let toastTimer;
function toast(msg, kind = 'info', action = null, ms = 3800) {
  const el = document.getElementById('toast');
  el.className = 'toast show ' + kind;
  el.innerHTML = '<span class="toast-hero">' + ICONS.cat + '</span><span>' + esc(msg) + '</span>' +
    (action ? '<button class="toast-act">' + esc(action.label) + '</button>' : '');
  if (action) {
    el.querySelector('.toast-act').onclick = () => {
      el.classList.remove('show');
      clearTimeout(toastTimer);
      action.fn();
    };
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

/* ===== Меню на телефоне =====
   Три пункта в строку не помещаются рядом с логотипом и кнопкой входа,
   поэтому на узком экране они прячутся под бургер. */
function toggleMenu() {
  const open = document.body.classList.toggle('menu-open');
  const b = document.getElementById('burger');
  if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function closeMenu() {
  document.body.classList.remove('menu-open');
  const b = document.getElementById('burger');
  if (b) b.setAttribute('aria-expanded', 'false');
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

/* ===== Звук =====
   Сигнал успеха радует одного ребёнка и мешает классу из двадцати,
   поэтому звук выключается одной кнопкой в подвале. */
function applySound() {
  const t = document.getElementById('soundToggle');
  if (t) t.textContent = DB.settings.sound === false ? 'Звук: выкл' : 'Звук: вкл';
}

function toggleSound() {
  DB.settings.sound = DB.settings.sound === false;
  saveDB();
  applySound();
  if (DB.settings.sound) Sound.note();
  toast(DB.settings.sound ? 'Звук включён' : 'Звук выключен — в классе так тише');
}

/* Короткий салют после решённого урока: полтора десятка бумажек на CSS,
   ни одной картинки и ни одного килобайта. В облегчённом режиме не нужен:
   там анимации выключены намеренно. */
function confetti(host) {
  if (DB.settings.lite || !host) return;
  const box = document.createElement('div');
  box.className = 'confetti';
  box.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('i');
    s.style.left = (5 + Math.random() * 90).toFixed(1) + '%';
    s.style.animationDelay = (Math.random() * 0.4).toFixed(2) + 's';
    s.style.setProperty('--tilt', (Math.random() * 80 - 40).toFixed(0) + 'px');
    box.appendChild(s);
  }
  host.appendChild(box);
  setTimeout(() => box.remove(), 2600);
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
