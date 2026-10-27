/* ===== Хранилище =====
   Прогресс детей и данные класса лежат в localStorage этого устройства:
   в школе с одним компьютерным классом всё работает даже без интернета.
   Класс можно перенести на другой компьютер файлом (кабинет учителя),
   а позже к тому же формату данных подключается сервер. */

const STORE_KEY = 'sobericod_v2';

function newProfile(name, pic) {
  return { name: name || 'Гость', pic: pic || null, progress: {}, reactions: {}, projects: [], quiz: null };
}

function defaultDB() {
  return { classes: {}, guests: {}, session: { role: 'guest' }, settings: { lite: false } };
}

let DB = loadDB();

function loadDB() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return migrate(Object.assign(defaultDB(), JSON.parse(raw)));
  } catch (e) { /* приватный режим или запрет хранилища — работаем в памяти */ }
  return migrate(defaultDB());
}

function saveDB() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); } catch (e) {}
}

/* Приводит сохранения прошлых версий к текущему формату:
   раньше гость на устройстве был один, а ПИН учителя хранился открытым текстом. */
function migrate(db) {
  if (!db.guests) db.guests = {};
  if (db.guest) {
    db.guests.g1 = normalizeProfile(db.guest);
    if (db.session.role === 'guest' && !db.session.gid) db.session.gid = 'g1';
    delete db.guest;
  }
  if (!Object.keys(db.guests).length) db.guests.g1 = newProfile('Гость');
  if (db.session.role === 'guest' && !db.guests[db.session.gid]) db.session.gid = Object.keys(db.guests)[0];
  Object.values(db.classes).forEach(cls => {
    if (cls.pin) { cls.pinHash = pinHash(cls.pin, cls.code); delete cls.pin; }
  });
  return db;
}

/* Достраивает профиль до полного вида: файл класса могли сохранить старой версией */
function normalizeProfile(p) {
  p = p || {};
  return Object.assign(newProfile(p.name, p.pic), {
    progress: p.progress || {},
    reactions: p.reactions || {},
    projects: p.projects || [],
    quiz: p.quiz || null
  });
}

/* ===== Кто сейчас играет =====
   За одним школьным компьютером занимается несколько детей, поэтому
   даже без входа в класс у каждого свой профиль и свои звёзды. */
function guestList() {
  return Object.entries(DB.guests).sort((a, b) => a[1].name.localeCompare(b[1].name, 'ru'));
}

function currentGuest() {
  const s = DB.session;
  let gid = s.role === 'guest' ? s.gid : null;
  if (!gid || !DB.guests[gid]) {
    gid = Object.keys(DB.guests)[0] || addGuest('Гость');
    if (s.role === 'guest') s.gid = gid;
  }
  return DB.guests[gid];
}

function addGuest(name, pic) {
  const gid = uid();
  DB.guests[gid] = newProfile(name, pic);
  saveDB();
  return gid;
}

/* Текущий ученик (или гость этого компьютера) */
function me() {
  const s = DB.session;
  if (s.role === 'student' && DB.classes[s.code] && DB.classes[s.code].students[s.sid]) {
    return DB.classes[s.code].students[s.sid];
  }
  return currentGuest();
}

function currentClass() {
  const s = DB.session;
  return (s.role === 'student' || s.role === 'teacher') ? DB.classes[s.code] : null;
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

function genCode() {
  let code;
  do { code = String(Math.floor(1000 + Math.random() * 9000)); } while (DB.classes[code]);
  return code;
}

function uid() { return Math.random().toString(36).slice(2, 9); }

/* ===== ПИН учителя =====
   Сам ПИН не храним: в localStorage попадает только его отпечаток.
   Это не защита от взлома — все данные и так в браузере — а защита от ребёнка,
   который заглянет в хранилище, чтобы зайти в кабинет учителя. */
function pinHash(pin, salt) {
  let h = 2166136261;
  const src = 'sobericod:' + salt + ':' + pin;
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function pinOk(cls, pin) {
  return !!cls && cls.pinHash === pinHash(pin, cls.code);
}

/* ===== Перенос класса между компьютерами =====
   Кабинет учителя сохраняет класс в файл, на другом компьютере файл загружается обратно.
   Повторная загрузка не затирает прогресс, а объединяет: берётся лучший результат. */
function classToJSON(cls) {
  return JSON.stringify({ app: 'sobericod', format: 2, saved: new Date().toISOString(), class: cls }, null, 1);
}

function mergeProfile(into, from) {
  Object.entries(from.progress || {}).forEach(([k, v]) => {
    into.progress[k] = Math.max(into.progress[k] || 0, v);
  });
  Object.assign(into.reactions, from.reactions || {});
  const have = new Set(into.projects.map(p => p.id));
  (from.projects || []).forEach(p => { if (!have.has(p.id)) into.projects.push(p); });
  if (!into.pic) into.pic = from.pic || null;
  if (!into.quiz) into.quiz = from.quiz || null;
}

function importClassJSON(text) {
  let data;
  try { data = JSON.parse(text); }
  catch (e) { return { ok: false, msg: 'Файл не читается. Выберите файл, который сохранила платформа.' }; }

  const cls = data && data.class;
  if (!cls || !/^\d{4}$/.test(String(cls.code || '')) || !cls.students) {
    return { ok: false, msg: 'В этом файле нет данных класса.' };
  }

  const students = {};
  Object.entries(cls.students).forEach(([sid, st]) => { students[sid] = normalizeProfile(st); });

  const old = DB.classes[cls.code];
  if (old) {
    Object.entries(students).forEach(([sid, st]) => {
      if (old.students[sid]) mergeProfile(old.students[sid], st);
      else old.students[sid] = st;
    });
    if (cls.pinHash) old.pinHash = cls.pinHash;
  } else {
    DB.classes[cls.code] = Object.assign({}, cls, { students });
  }
  saveDB();
  return { ok: true, code: cls.code, merged: !!old, name: DB.classes[cls.code].name || 'Класс' };
}

/* Демо-класс для показа кабинета учителя на защите проекта */
function ensureDemoClass() {
  if (DB.classes['1234']) return;
  const mk = (name, pic, progress, reactions, quiz) =>
    Object.assign(newProfile(name, pic), { progress, reactions, quiz });
  DB.classes['1234'] = {
    code: '1234', name: 'Демо-класс', grade: '2 класс', pinHash: pinHash('0000', '1234'), demo: true,
    students: {
      s1: mk('Аня', '🌸', { 'steps-1': 3, 'steps-2': 3, 'steps-3': 2, 'steps-4': 3, 'steps-5': 2, 'steps-6': 3, 'loops-1': 3 },
             { 'steps-1': 2, 'steps-2': 2, 'steps-3': 2, 'steps-4': 1, 'steps-5': 2, 'steps-6': 2, 'loops-1': 2 }, 'logic'),
      s2: mk('Миша', '🚗', { 'steps-1': 3, 'steps-2': 2, 'steps-3': 1 },
             { 'steps-1': 1, 'steps-2': 0, 'steps-3': 0 }, null),
      s3: mk('Даша', '🐶', { 'steps-1': 3, 'steps-2': 3, 'steps-3': 3, 'steps-4': 2, 'stories-1': 3, 'stories-2': 3 },
             { 'steps-1': 2, 'steps-2': 1, 'steps-3': 1, 'steps-4': 1, 'stories-1': 2, 'stories-2': 2 }, 'create'),
      s4: mk('Тимур', '⭐', {}, {}, null)
    }
  };
  saveDB();
}
