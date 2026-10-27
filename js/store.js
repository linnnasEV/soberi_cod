/* ===== Хранилище =====
   В прототипе всё хранится в localStorage этого устройства.
   Так в школе с одним компьютерным классом всё работает даже без интернета.
   Для синхронизации между устройствами позже добавляется сервер с тем же форматом данных. */

const STORE_KEY = 'sobericod_v2';

function newProfile(name, pic) {
  return { name: name || 'Гость', pic: pic || null, progress: {}, reactions: {}, projects: [], quiz: null };
}

function defaultDB() {
  return { classes: {}, guest: newProfile('Гость'), session: { role: 'guest' }, settings: { lite: false } };
}

let DB = loadDB();

function loadDB() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return Object.assign(defaultDB(), JSON.parse(raw));
  } catch (e) { /* приватный режим или запрет хранилища — работаем в памяти */ }
  return defaultDB();
}

function saveDB() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); } catch (e) {}
}

/* Текущий ученик (или гость) */
function me() {
  const s = DB.session;
  if (s.role === 'student' && DB.classes[s.code] && DB.classes[s.code].students[s.sid]) {
    return DB.classes[s.code].students[s.sid];
  }
  return DB.guest;
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

/* Демо-класс для показа кабинета учителя на защите проекта */
function ensureDemoClass() {
  if (DB.classes['1234']) return;
  const mk = (name, pic, progress, reactions, quiz) =>
    Object.assign(newProfile(name, pic), { progress, reactions, quiz });
  DB.classes['1234'] = {
    code: '1234', name: 'Демо-класс', grade: '2 класс', pin: '0000', demo: true,
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
