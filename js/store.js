/* ===== Хранилище =====
   У платформы два режима, и оба настоящие.

   Без входа всё лежит в localStorage этого компьютера: в школе со слабым
   интернетом ребёнок открывает сайт и занимается, ничего не спрашивая.
   За одним компьютером может сидеть несколько детей — у каждого свой
   профиль в списке.

   После входа прогресс живёт на сервере, а в браузере остаётся его копия.
   Копия не для красоты: пропал интернет посреди урока — звёзды всё равно
   сохранились и уйдут на сервер, когда связь вернётся. */

const STORE_KEY = 'sobericod_v3';
const OLD_STORE_KEY = 'sobericod_v2';

function newProfile(name, pic) {
  return { name: name || 'Гость', pic: pic || null, progress: {}, reactions: {}, projects: [], quiz: null, awards: [] };
}

function defaultDB() {
  return {
    guests: {},
    // role: guest | child | parent | teacher
    session: { role: 'guest' },
    // Профиль вошедшего ребёнка — копия того, что на сервере
    cloud: null,
    // Аккаунт вошедшего взрослого: кто он и что ему можно
    account: null,
    settings: { track: null, sound: true }
  };
}

let DB = loadDB();

function loadDB() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return migrate(Object.assign(defaultDB(), JSON.parse(raw)));
    const old = localStorage.getItem(OLD_STORE_KEY);
    if (old) return migrate(fromOldVersion(JSON.parse(old)));
  } catch (e) { /* приватный режим или запрет хранилища — работаем в памяти */ }
  return migrate(defaultDB());
}

function saveDB() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); } catch (e) {}
}

/* Переезд с прежней версии.
   Раньше класс целиком лежал в браузере: код из четырёх цифр, ПИН учителя,
   картинка вместо пароля. Теперь всё это на сервере, и переносить оттуда
   нечего. А вот профили тех, кто играл без входа, забираем: ребёнок не
   должен потерять свои звёзды из-за того, что мы переделали вход. */
function fromOldVersion(old) {
  const db = defaultDB();
  if (old.settings) db.settings = Object.assign(db.settings, old.settings);
  if (old.guests) Object.entries(old.guests).forEach(([gid, g]) => { db.guests[gid] = normalizeProfile(g); });
  if (old.guest) db.guests.g1 = normalizeProfile(old.guest);
  return db;
}

function migrate(db) {
  if (!db.guests) db.guests = {};
  if (!Object.keys(db.guests).length) db.guests.g1 = newProfile('Гость');
  if (!db.session || !db.session.role) db.session = { role: 'guest' };
  if (db.session.role === 'guest' && !db.guests[db.session.gid]) {
    db.session.gid = Object.keys(db.guests)[0];
  }
  if (db.cloud) db.cloud = normalizeProfile(db.cloud);
  return db;
}

/* Достраивает профиль до полного вида: он мог прийти с сервера без части полей */
function normalizeProfile(p) {
  p = p || {};
  return Object.assign(newProfile(p.name, p.pic), {
    progress: p.progress || {},
    reactions: p.reactions || {},
    projects: p.projects || [],
    quiz: p.quiz || null,
    awards: p.awards || []
  });
}

/* ===== Кто сейчас играет =====
   Без входа у каждого ребёнка за компьютером свой профиль и свои звёзды. */
function guestList() {
  return Object.entries(DB.guests).sort((a, b) => a[1].name.localeCompare(b[1].name, 'ru'));
}

function currentGuest() {
  const s = DB.session;
  let gid = s.gid;
  if (!gid || !DB.guests[gid]) {
    gid = Object.keys(DB.guests)[0] || addGuest('Гость');
    s.gid = gid;
  }
  return DB.guests[gid];
}

function addGuest(name, pic) {
  const gid = uid();
  DB.guests[gid] = newProfile(name, pic);
  saveDB();
  return gid;
}

/* Чей прогресс сейчас на экране: вошедшего ребёнка или гостя этого компьютера.
   Уроки и Мастерская работают с тем, что вернёт эта функция, и про сервер
   не знают вовсе. */
function me() {
  if (DB.session.role === 'child' && DB.cloud) return DB.cloud;
  return currentGuest();
}

/* Занятие, на котором сейчас ребёнок. Появится вместе с кабинетом учителя;
   пока его нет, уровень сложности ребёнок выбирает сам. */
function currentClass() {
  return null;
}

/* ===== Уровень сложности ===== */
const GRADE_TRACK = { '1 класс': 'junior', '2 класс': 'junior', '3 класс': 'senior', '4 класс': 'senior' };

/* Уровень, навязанный занятием: сменить его ребёнок не может */
function lockedTrack() {
  const cls = currentClass();
  return (cls && GRADE_TRACK[cls.grade]) || null;
}

function activeTrack() {
  return lockedTrack() || DB.settings.track || null;
}

function setTrack(t) {
  DB.settings.track = t;
  saveDB();
}

function lessonKey(courseId, lessonId) { return courseId + '-' + lessonId; }

function lessonStars(profile, courseId, lessonId) {
  return profile.progress[lessonKey(courseId, lessonId)] || 0;
}

function courseDone(profile, courseId) {
  return LESSONS[courseId].filter(l => lessonStars(profile, courseId, l.id) > 0).length;
}

function totalStars(profile) {
  return Object.values(profile.progress).reduce((s, v) => s + v, 0);
}

function uid() { return Math.random().toString(36).slice(2, 9); }

/* ===== Обмен с сервером =====
   Страница отправляет всё, что знает о ребёнке, и получает обратно слитое:
   по каждому уроку остаётся лучший результат. Посылкой целиком, а не по
   кусочку на каждое событие, — так переживается пропажа интернета, обычная
   для сельской школы: вернулась связь, ушло всё накопленное разом. */

function stateToSend(p) {
  return {
    progress: p.progress || {},
    reactions: p.reactions || {},
    quiz: p.quiz || null,
    awards: p.awards || [],
    // Работа уходит целиком, как есть: так ничего не теряется, даже если
    // в Мастерской появится новое поле, о котором обмен не знает.
    projects: (p.projects || []).map(x => ({
      id: String(x.id), title: x.title || null, payload: x
    }))
  };
}

function stateFromServer(out) {
  const p = DB.cloud;
  if (!p) return;
  p.progress = out.progress || {};
  p.reactions = out.reactions || {};
  p.quiz = out.quiz || null;
  p.awards = out.awards || [];
  p.projects = (out.projects || []).map(x => x.payload);
  saveDB();
}

let pushTimer = null;
let pushing = false;
let pushPending = false;

/* Прогресс уходит на сервер сам: ребёнок прошёл урок — нажимать ничего не надо.
   Отправка отложена на полторы секунды, чтобы три события подряд
   (звёзды, значок, отношение к уроку) ушли одной посылкой. */
function syncPushSoon() {
  if (DB.session.role !== 'child' || !DB.cloud) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushState, 1500);
}

async function pushState() {
  if (DB.session.role !== 'child' || !DB.cloud) return;
  if (pushing) { pushPending = true; return; }
  pushing = true;
  try {
    const out = await API.put('/child/state', stateToSend(DB.cloud));
    stateFromServer(out);
    if (typeof renderAuthArea === 'function') renderAuthArea();
  } catch (e) {
    // Интернета нет или сервер молчит — всё уже сохранено в браузере,
    // уйдёт при следующем событии или когда связь вернётся.
  } finally {
    pushing = false;
    if (pushPending) { pushPending = false; syncPushSoon(); }
  }
}

/* Забрать прогресс с сервера и слить с тем, что накопилось в браузере */
async function pullState() {
  if (DB.session.role !== 'child' || !DB.cloud) return;
  try {
    const out = await API.put('/child/state', stateToSend(DB.cloud));
    stateFromServer(out);
  } catch (e) { /* без связи работаем с местной копией */ }
}
