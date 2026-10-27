/* ===== Кабинет учителя =====
   Учитель без IT-опыта: создаёт класс, раздаёт детям код и видит,
   кто что прошёл и кому программирование по-настоящему нравится. */

route('teacher', () => {
  const box = document.getElementById('teacherArea');
  if (DB.session.role === 'teacher' && currentClass()) box.innerHTML = teacherDashboard();
  else box.innerHTML = teacherEntry();
});

function teacherEntry() {
  return '<div class="teacher-entry">' +
    '<div class="card"><h3>Создать класс</h3><p class="muted">Получите код из 4 цифр, по нему дети войдут сами.</p>' +
      '<div class="form-group"><label>Название</label><input id="tName" placeholder="Например, 2 «А»" maxlength="30"></div>' +
      '<div class="form-group"><label>Класс</label><select id="tGrade"><option>1 класс</option><option selected>2 класс</option><option>3 класс</option><option>4 класс</option><option>Разновозрастная группа</option></select></div>' +
      '<div class="form-group"><label>ПИН учителя (4 цифры, чтобы дети не зашли в кабинет)</label><input id="tPin" inputmode="numeric" maxlength="4" placeholder="••••"></div>' +
      '<button class="btn btn-primary" onclick="createClass()">Создать класс</button></div>' +
    '<div class="card"><h3>Войти в свой класс</h3>' +
      '<div class="form-group"><label>Код класса</label><input id="tCode" inputmode="numeric" maxlength="4" placeholder="1234"></div>' +
      '<div class="form-group"><label>ПИН учителя</label><input id="tPin2" inputmode="numeric" maxlength="4" type="password" placeholder="••••"></div>' +
      '<button class="btn btn-primary" onclick="teacherLogin()">Войти</button>' +
      '<div class="demo-box"><b>Хотите посмотреть?</b><p class="muted">Откройте демо-класс с готовой статистикой.</p>' +
      '<button class="btn btn-ghost" onclick="openDemoClass()">Открыть демо-класс</button></div></div>' +
    '</div>' + teacherGuide();
}

function teacherGuide() {
  return '<details class="guide" open><summary>Памятка: как провести урок за 30 минут</summary><ol>' +
    '<li><b>5 минут — разминка без компьютера.</b> Один ребёнок — «робот», остальные дают ему команды: «шаг вперёд», «поворот». Так дети понимают, что такое алгоритм.</li>' +
    '<li><b>2 минуты — вход.</b> Напишите на доске код класса. Каждый находит своё имя и нажимает секретную картинку.</li>' +
    '<li><b>18 минут — уроки.</b> Дети проходят задания в своём темпе. Если кто-то застрял, пусть нажмёт «Подсказка», а потом спросит соседа.</li>' +
    '<li><b>5 минут — разговор.</b> Откройте раздел «Профессии»: «Сегодня вы искали ошибки — так работают тестировщики».</li>' +
    '</ol><p class="muted">Один компьютер на несколько детей — тоже нормально: работайте парами, один «водитель», другой «штурман», потом меняйтесь. ' +
    'Платформе не нужен быстрый интернет: после первого открытия она работает и без него.</p></details>';
}

function createClass() {
  const name = document.getElementById('tName').value.trim();
  const pin = document.getElementById('tPin').value.trim();
  if (name.length < 1) return toast('Введите название класса', 'warn');
  if (!/^\d{4}$/.test(pin)) return toast('ПИН — это 4 цифры', 'warn');
  const code = genCode();
  DB.classes[code] = { code, name, grade: document.getElementById('tGrade').value, pin, students: {} };
  DB.session = { role: 'teacher', code };
  saveDB();
  renderAuthArea();
  handleRoute();
  openModal('<h2>Класс создан!</h2><p class="sub">Код для детей:</p><div class="big-code">' + code + '</div>' +
    '<p class="muted">Добавьте список учеников или пусть дети впишут имя сами при первом входе.</p>' +
    '<div class="modal-actions"><button class="btn btn-primary" onclick="closeModal()">Понятно</button></div>');
}

function teacherLogin() {
  const code = document.getElementById('tCode').value.trim();
  const pin = document.getElementById('tPin2').value.trim();
  if (code === '1234') ensureDemoClass();
  const cls = DB.classes[code];
  if (!cls || cls.pin !== pin) return toast('Неверный код класса или ПИН', 'warn');
  DB.session = { role: 'teacher', code };
  saveDB(); renderAuthArea(); handleRoute();
}

function openDemoClass() {
  ensureDemoClass();
  DB.session = { role: 'teacher', code: '1234' };
  saveDB(); renderAuthArea(); handleRoute();
}

/* Интерес к урокам по реакциям ребёнка (😀=2, 🙂=1, 😐=0) */
function interestOf(st) {
  const vals = Object.values(st.reactions);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function interestLabel(v) {
  if (v === null) return '<span class="muted">нет данных</span>';
  if (v >= 1.5) return '<span class="int int-hi">😀 очень нравится</span>';
  if (v >= 0.75) return '<span class="int int-mid">🙂 нравится</span>';
  return '<span class="int int-lo">😐 пока не очень</span>';
}

const DIR_NAMES = { logic: 'Исследователь', create: 'Творец', tech: 'Инженер' };

function teacherDashboard() {
  const cls = currentClass();
  const studs = Object.entries(cls.students).sort((a, b) => a[1].name.localeCompare(b[1].name, 'ru'));
  const totalLessons = studs.reduce((s, [, st]) => s + Object.keys(st.progress).length, 0);
  const ints = studs.map(([, st]) => interestOf(st)).filter(v => v !== null);
  const avgInt = ints.length ? ints.reduce((a, b) => a + b, 0) / ints.length : null;
  const active = studs.filter(([, st]) => Object.keys(st.progress).length > 0).length;

  const rows = studs.map(([id, st]) =>
    '<tr><td><b>' + esc(st.name) + '</b>' + (st.pic ? '' : ' <small class="muted">(ещё не входил)</small>') + '</td>' +
    COURSES.map(c => {
      const d = courseDone(st, c.id), t = LESSONS[c.id].length;
      return '<td><div class="cell-prog"><span style="width:' + Math.round(d / t * 100) + '%"></span></div><small>' + d + '/' + t + '</small></td>';
    }).join('') +
    '<td>' + totalStars(st) + '</td>' +
    '<td>' + interestLabel(interestOf(st)) + '</td>' +
    '<td>' + (st.quiz ? DIR_NAMES[st.quiz] : '<span class="muted">—</span>') + '</td>' +
    '<td class="row-actions"><button class="btn btn-ghost btn-sm" onclick="resetPic(\'' + id + '\')" title="Если ребёнок забыл картинку">Сбросить картинку</button>' +
    '<button class="btn btn-ghost btn-sm" onclick="askRemoveStudent(\'' + id + '\')">Удалить</button></td></tr>').join('');

  return '<div class="t-head card"><div><span class="lvl">' + esc(cls.grade) + (cls.demo ? ' · демо' : '') + '</span><h2>' + esc(cls.name) + '</h2>' +
      '<p class="muted">Код для входа детей</p><div class="big-code">' + cls.code + '</div></div>' +
      '<div class="t-head-actions"><button class="btn btn-ghost" onclick="printCards()">Распечатать карточки входа</button>' +
      '<button class="btn btn-ghost" onclick="logout()">Выйти</button></div></div>' +

    '<div class="stat-grid">' +
      '<div class="stat"><b>' + studs.length + '</b><span>учеников</span></div>' +
      '<div class="stat"><b>' + active + '</b><span>начали заниматься</span></div>' +
      '<div class="stat"><b>' + totalLessons + '</b><span>уроков пройдено</span></div>' +
      '<div class="stat"><b>' + (avgInt === null ? '—' : Math.round(avgInt / 2 * 100) + '%') + '</b><span>интерес к урокам</span></div>' +
    '</div>' +

    '<div class="card"><h3>Ученики</h3>' +
      (studs.length ? '<div class="table-wrap"><table class="t-table"><thead><tr><th>Имя</th>' +
        COURSES.map(c => '<th>' + c.title + '</th>').join('') +
        '<th>Звёзды</th><th>Интерес</th><th>Тест «Что мне интересно»</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<p class="muted">Пока никого нет. Добавьте имена ниже или пусть дети впишут себя сами при входе.</p>') +
      '<div class="add-students"><label>Добавить учеников (каждое имя с новой строки или через запятую)</label>' +
      '<textarea id="newStudents" rows="3" placeholder="Аня&#10;Миша&#10;Даша"></textarea>' +
      '<button class="btn btn-primary" onclick="addStudents()">Добавить</button></div>' +
      '<p class="small-note">«Интерес» считается по ответам ребёнка «Как тебе урок?» после каждого задания. ' +
      'Так видно, кому стоит предложить кружок по программированию или робототехнике.</p></div>' +
    teacherGuide() +
    '<p class="small-note">В этой версии данные класса хранятся в браузере этого компьютера.</p>';
}

function addStudents() {
  const names = document.getElementById('newStudents').value.split(/[\n,]/).map(s => s.trim()).filter(s => s.length > 1);
  if (!names.length) return toast('Впишите хотя бы одно имя', 'warn');
  const cls = currentClass();
  names.forEach(n => { cls.students[uid()] = newProfile(n, null); });
  saveDB();
  handleRoute();
  toast('Добавлено учеников: ' + names.length);
}

function resetPic(id) {
  currentClass().students[id].pic = null;
  saveDB();
  toast('Картинка сброшена. При входе ребёнок выберет новую.');
  handleRoute();
}

function askRemoveStudent(id) {
  const st = currentClass().students[id];
  openModal('<h2>Удалить ученика?</h2><p class="sub">' + esc(st.name) + ' и все его звёзды и работы будут удалены.</p>' +
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-danger" onclick="removeStudent(\'' + id + '\')">Удалить</button></div>');
}

function removeStudent(id) {
  delete currentClass().students[id];
  saveDB();
  closeModal();
  handleRoute();
}

function printCards() {
  const cls = currentClass();
  const studs = Object.values(cls.students);
  const area = document.getElementById('printArea');
  area.innerHTML = (studs.length ? studs : [{ name: '________________' }]).map(st =>
    '<div class="print-card"><div class="pc-logo">' + ICONS.logo + ' СобериКод</div>' +
    '<div class="pc-name">' + esc(st.name) + '</div>' +
    '<div class="pc-code">Код класса: <b>' + cls.code + '</b></div>' +
    '<div class="pc-note">1. Нажми «Войти»  2. Введи код  3. Найди своё имя  4. Нажми свою секретную картинку</div></div>').join('');
  window.print();
}
