/* ===== Вход =====
   Три разных человека приходят на платформу, и вход у них устроен по-разному.

   Ребёнку шести лет нельзя давать форму с почтой: у него её нет. Ему —
   короткий логин и короткий пароль, которые придумал родитель и написал на
   бумажке. Взрослым — обычная почта с паролем.

   Поэтому окно одно, но с тремя вкладками: каждый сразу видит свою. Открыто
   по умолчанию «Я ребёнок» — на кнопку «Войти» чаще всего нажимает он. */

const AUTH_TABS = [
  { id: 'parent', title: 'Я родитель' },
  { id: 'child', title: 'Я ребёнок' },
  { id: 'teacher', title: 'Я учитель' }
];

function openLogin(tab) {
  const active = tab || 'child';
  openModal(
    '<h2>Вход</h2>' +
    '<div class="tabs" role="tablist">' +
    AUTH_TABS.map(t =>
      '<button class="tab' + (t.id === active ? ' sel' : '') + '" role="tab" ' +
      'onclick="openLogin(\'' + t.id + '\')">' + t.title + '</button>').join('') +
    '</div>' +
    (active === 'child' ? childPane() : adultPane(active)) +
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Играть без входа</button></div>' +
    '<p class="small-note"><button class="link-btn" onclick="openGuestSwitch()">За этим компьютером несколько детей →</button></p>'
  );
  const form = document.getElementById('authForm');
  if (form) form.addEventListener('keydown', e => { if (e.key === 'Enter') submitLogin(active); });
}

function childPane() {
  return '<div id="authForm">' +
    '<p class="sub">Логин и пароль тебе дал взрослый</p>' +
    '<div class="form-group"><label>Логин</label>' +
    '<input id="inpLogin" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="например, аня2017"></div>' +
    '<div class="form-group"><label>Пароль</label>' +
    '<input id="inpPass" type="password" autocomplete="current-password" placeholder="••••"></div>' +
    '<label class="check"><input type="checkbox" id="inpShared"> Это общий компьютер</label>' +
    '<button class="btn btn-primary btn-wide" onclick="submitLogin(\'child\')">Войти</button>' +
    '<p class="small-note">Нет логина? Его заводит родитель в своём кабинете.</p>' +
    '</div>';
}

function adultPane(role) {
  const who = role === 'parent' ? 'родителя' : 'учителя';
  return '<div id="authForm">' +
    '<div class="form-group"><label>Почта</label>' +
    '<input id="inpEmail" type="email" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="вы@почта.ру"></div>' +
    '<div class="form-group"><label>Пароль</label>' +
    '<input id="inpPass" type="password" autocomplete="current-password" placeholder="••••••••••"></div>' +
    '<label class="check"><input type="checkbox" id="inpShared"> Это общий компьютер</label>' +
    '<button class="btn btn-primary btn-wide" onclick="submitLogin(\'' + role + '\')">Войти</button>' +
    '<p class="small-note">Нет аккаунта ' + who + '? ' +
    '<button class="link-btn" onclick="openRegister(\'' + role + '\')">Зарегистрироваться</button><br>' +
    '<button class="link-btn" onclick="openForgot()">Забыли пароль?</button></p>' +
    '</div>';
}

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function checked(id) {
  const el = document.getElementById(id);
  return !!(el && el.checked);
}

function busy(on, label) {
  document.querySelectorAll('#authForm .btn-primary, .modal .btn-primary').forEach(b => {
    b.disabled = on;
    if (on) { b.dataset.was = b.textContent; b.textContent = label || 'Минутку…'; }
    else if (b.dataset.was) b.textContent = b.dataset.was;
  });
}

async function submitLogin(role) {
  const shared = checked('inpShared');
  busy(true);
  try {
    if (role === 'child') {
      const data = await API.post('/auth/child/login', {
        login: val('inpLogin'), password: val('inpPass'), shared_computer: shared
      });
      await enterAsChild(data);
    } else {
      const data = await API.post('/auth/login', {
        email: val('inpEmail'), password: val('inpPass'), shared_computer: shared
      });
      enterAsAdult(data);
    }
  } catch (e) {
    busy(false);
    toast(e.message, 'warn');
  }
}

/* ===== Регистрация взрослого ===== */
function openRegister(role) {
  const who = role === 'parent' ? 'родителя' : 'учителя';
  openModal('<h2>Регистрация ' + who + '</h2>' +
    '<div id="authForm">' +
    '<div class="form-group"><label>Как вас зовут</label>' +
    '<input id="regName" maxlength="60" placeholder="Имя и отчество"></div>' +
    '<div class="form-group"><label>Почта</label>' +
    '<input id="regEmail" type="email" autocapitalize="none" spellcheck="false" placeholder="вы@почта.ру"></div>' +
    '<div class="form-group"><label>Пароль (не короче 10 знаков)</label>' +
    '<input id="regPass" type="password" autocomplete="new-password" placeholder="••••••••••"></div>' +
    '<button class="btn btn-primary btn-wide" onclick="submitRegister(\'' + role + '\')">Зарегистрироваться</button>' +
    '</div>' +
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="openLogin(\'' + role + '\')">← Уже есть аккаунт</button></div>' +
    '<p class="small-note">Регистрируясь, вы соглашаетесь, что платформа будет хранить имена и ' +
    'учебный прогресс ваших детей. Удалить аккаунт вместе со всеми данными можно в любой момент.</p>');
}

async function submitRegister(role) {
  busy(true);
  try {
    const data = await API.post('/auth/register', {
      role, name: val('regName'), email: val('regEmail'), password: val('regPass')
    });
    enterAsAdult(data);
    toast('Аккаунт создан. Добро пожаловать!');
  } catch (e) {
    busy(false);
    toast(e.message, 'warn');
  }
}

function openForgot() {
  openModal('<h2>Забыли пароль?</h2>' +
    '<p class="sub">Пришлём ссылку для смены пароля на вашу почту.</p>' +
    '<div id="authForm"><div class="form-group"><label>Почта</label>' +
    '<input id="fgEmail" type="email" autocapitalize="none" spellcheck="false" placeholder="вы@почта.ру"></div>' +
    '<button class="btn btn-primary btn-wide" onclick="submitForgot()">Прислать ссылку</button></div>' +
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="openLogin(\'parent\')">← Назад</button></div>');
}

async function submitForgot() {
  busy(true);
  try {
    const out = await API.post('/auth/password/forgot', { email: val('fgEmail') });
    closeModal();
    toast(out.message || 'Если такой адрес зарегистрирован, письмо уже отправлено.');
  } catch (e) {
    busy(false);
    toast(e.message, 'warn');
  }
}

/* ===== После успешного входа ===== */

async function enterAsChild(data) {
  DB.session = { role: 'child', gid: DB.session.gid };
  DB.cloud = normalizeProfile({ name: data.display_name, pic: data.avatar, quiz: data.quiz_direction });
  saveDB();
  closeModal();
  renderAuthArea();
  await pullState();
  renderAuthArea();
  handleRoute();
  toast('Привет, ' + me().name + '! Твои звёзды теперь сохраняются.');
}

function enterAsAdult(data) {
  const roles = data.roles || [];
  DB.session = { role: roles.includes('teacher') ? 'teacher' : 'parent', gid: DB.session.gid };
  DB.account = { id: data.id, email: data.email, name: data.name, roles, verified: data.email_verified };
  DB.cloud = null;
  saveDB();
  closeModal();
  renderAuthArea();
  go(DB.session.role === 'teacher' ? 'teacher' : 'parent');
}

/* Кто за компьютером — спрашиваем сервер при открытии страницы.
   Без этого после перезагрузки человек видел бы кнопку «Войти», хотя его
   вход на сервере ещё жив. */
async function bootSession() {
  let data;
  try { data = await API.get('/auth/session'); }
  catch (e) { return; }   // нет связи — работаем с тем, что в браузере

  if (data.user) {
    const roles = data.user.roles || [];
    DB.session = { role: roles.includes('teacher') ? 'teacher' : 'parent', gid: DB.session.gid };
    DB.account = { id: data.user.id, email: data.user.email, name: data.user.name, roles, verified: data.user.email_verified };
    DB.cloud = null;
  } else if (data.child) {
    DB.session = { role: 'child', gid: DB.session.gid };
    if (!DB.cloud) DB.cloud = normalizeProfile({});
    DB.cloud.name = data.child.display_name;
    DB.cloud.pic = data.child.avatar;
    await pullState();
  } else if (DB.session.role !== 'guest') {
    // Сессия кончилась или её отозвали — возвращаемся к игре без входа,
    // не теряя того, что ребёнок успел пройти на этом компьютере.
    DB.session = { role: 'guest', gid: DB.session.gid };
    DB.account = null;
    DB.cloud = null;
  }
  saveDB();
  renderAuthArea();
  handleRoute();
}

async function logout() {
  const was = DB.session.role;
  try { await API.post('/auth/logout'); } catch (e) { /* выходим в любом случае */ }
  DB.session = { role: 'guest', gid: DB.session.gid || Object.keys(DB.guests)[0] };
  DB.account = null;
  DB.cloud = null;
  saveDB();
  renderAuthArea();
  go(was === 'child' ? 'home' : 'home');
}

/* ===== Значок в шапке ===== */
function renderAuthArea() {
  if (typeof updateStudioAccess === 'function') updateStudioAccess();
  const area = document.getElementById('authArea');
  if (!area) return;
  const s = DB.session;

  if (s.role === 'child') {
    const p = me();
    area.innerHTML = '<button class="user-badge" onclick="go(\'profile\')"><span class="mini-ava">' +
      (p.pic || '🙂') + '</span><span class="ub-name">' + esc(p.name) + '</span>' +
      '<span class="ub-stars">' + ICONS.star + totalStars(p) + '</span></button>';
    return;
  }

  if (s.role === 'parent' || s.role === 'teacher') {
    const a = DB.account || { name: '' };
    area.innerHTML = '<button class="user-badge" onclick="go(\'' + s.role + '\')">' +
      '<span class="mini-ava">' + (s.role === 'teacher' ? '👩‍🏫' : '👪') + '</span>' +
      '<span class="ub-name">' + esc(a.name || 'Кабинет') + '</span></button>';
    return;
  }

  const p = me();
  // У гостя с прогрессом показываем, чей он: за компьютером может сидеть не один ребёнок
  const badge = totalStars(p) || p.projects.length
    ? '<button class="user-badge" onclick="openGuestSwitch()" title="Кто сейчас играет?"><span class="mini-ava">' +
      (p.pic || '🙂') + '</span><span class="ub-name">' + esc(p.name) + '</span>' +
      '<span class="ub-stars">' + ICONS.star + totalStars(p) + '</span></button>'
    : '';
  // Вход нужен взрослому: учитель за чужим компьютером должен найти кнопку
  // сразу, поэтому она в синем цвете сайта, а не прозрачная.
  area.innerHTML = badge + '<button class="btn btn-login" onclick="openLogin()">Войти</button>';
}

/* ===== Гости одного компьютера =====
   Без входа прогресс всё равно не общий: каждый ребёнок выбирает себя в списке. */
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
    '<p class="small-note">Это имя видно только на этом компьютере, и звёзды тоже останутся здесь. ' +
    'Чтобы прогресс сохранялся и открывался на других устройствах, войди по своему логину.</p>');
}

function pickGuest(gid) {
  if (!DB.guests[gid]) return;
  DB.session = { role: 'guest', gid };
  DB.cloud = null;
  saveDB();
  closeModal();
  renderAuthArea();
  handleRoute();
  toast('Привет, ' + me().name + '! Это твой прогресс.');
}

function addGuestFromInput() {
  const name = val('guestName');
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
