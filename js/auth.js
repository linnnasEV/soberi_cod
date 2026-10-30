/* ===== Вход ученика: код класса → своё имя → секретная картинка =====
   Ни email, ни пароля: первоклассник может войти сам. */

let loginCtx = {};

function openLogin() {
  loginCtx = {};
  openModal('<h2>Вход в класс</h2><p class="sub">Учитель скажет тебе код класса — это 4 цифры.</p>' +
    '<div class="form-group"><input id="codeInp" class="code-input" inputmode="numeric" maxlength="4" placeholder="• • • •" autocomplete="off"></div>' +
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Играть без входа</button>' +
    '<button class="btn btn-primary" onclick="loginCode()">Дальше →</button></div>' +
    '<p class="small-note">Хочешь посмотреть, как это работает? Код демо-класса: <b>1234</b><br>' +
    '<button class="link-btn" onclick="openGuestSwitch()">За этим компьютером несколько детей →</button><br>' +
    '<a href="#teacher" onclick="closeModal()">Я учитель →</a></p>');
  const inp = document.getElementById('codeInp');
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') loginCode(); });
}

function loginCode(code) {
  code = code || document.getElementById('codeInp').value.trim();
  if (code === '1234') ensureDemoClass();
  const cls = DB.classes[code];
  if (!cls) { toast('Такого класса нет. Проверь цифры или спроси учителя.', 'warn'); return; }
  loginCtx.code = code;
  const names = Object.entries(cls.students).sort((a, b) => a[1].name.localeCompare(b[1].name, 'ru'));
  openModal('<h2>' + esc(cls.name) + '</h2><p class="sub">Найди своё имя</p>' +
    '<div class="name-grid">' + names.map(([id, s]) =>
      '<button class="name-btn" onclick="loginPickName(\'' + id + '\')">' + esc(s.name) + '</button>').join('') + '</div>' +
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="openLogin()">← Назад</button>' +
    '<button class="btn btn-ghost" onclick="loginNew()">Меня нет в списке</button></div>');
}

function picGrid(onPick) {
  return '<div class="pic-grid">' + PICS.map((p, i) =>
    '<button class="pic-btn" onclick="' + onPick + '(' + i + ')">' + p + '</button>').join('') + '</div>';
}

function loginPickName(sid) {
  loginCtx.sid = sid;
  const st = DB.classes[loginCtx.code].students[sid];
  const first = !st.pic;
  openModal('<h2>Привет, ' + esc(st.name) + '!</h2>' +
    '<p class="sub">' + (first ? 'Выбери свою секретную картинку и запомни её. Это твой пароль.' : 'Нажми на свою секретную картинку') + '</p>' +
    picGrid('loginPickPic') +
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="loginCode(\'' + loginCtx.code + '\')">← Назад</button></div>');
}

function loginPickPic(i) {
  const st = DB.classes[loginCtx.code].students[loginCtx.sid];
  if (!st.pic) st.pic = PICS[i];
  else if (st.pic !== PICS[i]) { toast('Не та картинка. Попробуй ещё раз или спроси учителя.', 'warn'); return; }
  finishLogin(loginCtx.code, loginCtx.sid);
}

function loginNew() {
  openModal('<h2>Новый ученик</h2><p class="sub">Напиши своё имя</p>' +
    '<div class="form-group"><input id="newName" maxlength="20" placeholder="Например, Аня"></div>' +
    '<p class="sub">Выбери секретную картинку и запомни её</p>' + picGrid('loginNewPic'));
}

function loginNewPic(i) {
  const name = document.getElementById('newName').value.trim();
  if (name.length < 2) { toast('Напиши имя — хотя бы 2 буквы', 'warn'); return; }
  const cls = DB.classes[loginCtx.code];
  const sid = uid();
  cls.students[sid] = newProfile(name, PICS[i]);
  finishLogin(loginCtx.code, sid);
}

function finishLogin(code, sid) {
  DB.session = { role: 'student', code, sid, gid: DB.session.gid };
  saveDB();
  closeModal();
  renderAuthArea();
  toast('Привет, ' + me().name + '! Твои звёзды теперь видит учитель.');
  handleRoute();
}

function logout() {
  const wasTeacher = DB.session.role === 'teacher';
  DB.session = { role: 'guest', gid: DB.session.gid || Object.keys(DB.guests)[0] };
  saveDB();
  renderAuthArea();
  go(wasTeacher ? 'teacher' : 'home');
}

function renderAuthArea() {
  const area = document.getElementById('authArea');
  const s = DB.session;
  if (s.role === 'student') {
    const p = me();
    area.innerHTML = '<button class="user-badge" onclick="go(\'profile\')"><span class="mini-ava">' + (p.pic || '🙂') + '</span>' +
      '<span class="ub-name">' + esc(p.name) + '</span><span class="ub-stars">' + ICONS.star + totalStars(p) + '</span></button>';
  } else if (s.role === 'teacher') {
    area.innerHTML = '<button class="user-badge" onclick="go(\'teacher\')"><span class="mini-ava">👩‍🏫</span><span class="ub-name">' + esc(currentClass().name) + '</span></button>';
  } else {
    const p = me();
    // У гостя с прогрессом показываем, чей он: за компьютером может сидеть не один ребёнок
    const badge = totalStars(p) || p.projects.length
      ? '<button class="user-badge" onclick="openGuestSwitch()" title="Кто сейчас играет?"><span class="mini-ava">' + (p.pic || '🙂') + '</span>' +
        '<span class="ub-name">' + esc(p.name) + '</span><span class="ub-stars">' + ICONS.star + totalStars(p) + '</span></button>'
      : '';
    // Вход нужен взрослому: учитель за чужим компьютером должен найти кнопку
    // сразу, поэтому она в синем цвете сайта, а не прозрачная.
    area.innerHTML = badge + '<button class="btn btn-login" onclick="openLogin()">Войти</button>';
  }
}

/* ===== Гости одного компьютера =====
   Без входа в класс прогресс всё равно не общий: каждый ребёнок выбирает себя в списке. */
function openGuestSwitch() {
  const cur = DB.session.role === 'guest' ? DB.session.gid : null;
  openModal('<h2>Кто сейчас играет?</h2>' +
    '<p class="sub">За одним компьютером может заниматься несколько детей — у каждого свои звёзды.</p>' +
    '<div class="name-grid">' + guestList().map(([gid, g]) =>
      '<button class="name-btn' + (gid === cur ? ' sel' : '') + '" onclick="pickGuest(\'' + gid + '\')">' +
      esc(g.name) + ' · ' + totalStars(g) + '★</button>').join('') + '</div>' +
    '<p class="sub">Тебя нет в списке?</p>' +
    '<div class="form-group"><input id="guestName" maxlength="20" placeholder="Напиши своё имя"></div>' +
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-primary" onclick="addGuestFromInput()">Начать свой прогресс</button></div>' +
    '<p class="small-note">Это имя видно только на этом компьютере. Чтобы звёзды видел учитель, ' +
    'войди по коду класса.</p>');
}

function pickGuest(gid) {
  if (!DB.guests[gid]) return;
  DB.session = { role: 'guest', gid };
  saveDB();
  closeModal();
  renderAuthArea();
  handleRoute();
  toast('Привет, ' + me().name + '! Это твой прогресс.');
}

function addGuestFromInput() {
  const name = document.getElementById('guestName').value.trim();
  if (name.length < 2) { toast('Напиши имя — хотя бы 2 буквы', 'warn'); return; }
  pickGuest(addGuest(name, null));
}

function removeGuest(gid) {
  if (Object.keys(DB.guests).length < 2) { toast('Это единственный профиль на компьютере.', 'warn'); return; }
  delete DB.guests[gid];
  if (DB.session.gid === gid) DB.session.gid = Object.keys(DB.guests)[0];
  saveDB();
  closeModal();
  renderAuthArea();
  handleRoute();
}
