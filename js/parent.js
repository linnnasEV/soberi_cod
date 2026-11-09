/* ===== Кабинет родителя =====
   Родитель приходит сюда за двумя вещами: завести ребёнку профиль и
   посмотреть, чем тот занимается. Больше здесь ничего и не должно быть. */

route('parent', () => {
  const box = document.getElementById('parentArea');
  if (DB.session.role !== 'parent' && !(DB.account && (DB.account.roles || []).includes('parent'))) {
    box.innerHTML = '<div class="card"><h3>Кабинет родителя</h3>' +
      '<p class="muted">Войдите как родитель, чтобы заводить профили детям и видеть их прогресс.</p>' +
      '<button class="btn btn-primary" onclick="openLogin(\'parent\')">Войти</button></div>';
    return;
  }
  box.innerHTML = '<p class="muted">Загружаем…</p>';
  loadChildren();
});

async function loadChildren() {
  const box = document.getElementById('parentArea');
  let kids;
  try { kids = await API.get('/parent/children'); }
  catch (e) {
    box.innerHTML = '<div class="card"><p class="muted">' + esc(e.message) + '</p>' +
      '<button class="btn btn-ghost" onclick="loadChildren()">Попробовать снова</button></div>';
    return;
  }

  const a = DB.account || {};
  const status = a.family === 'father' ? 'Папа' : a.family === 'mother' ? 'Мама' : 'Родитель';
  box.innerHTML =
    '<div class="t-head card"><div><span class="lvl">' + status + '</span>' +
      '<h2>' + esc(fullName(a)) + '</h2><p class="muted">' + esc(a.email || '') + '</p></div>' +
      '<div class="t-head-actions">' +
      '<button class="btn btn-ghost" onclick="logout()">Выйти</button></div></div>' +

    '<div class="card"><h3>Мои дети</h3>' +
    (kids.length
      ? '<div class="kid-grid">' + kids.map(kidCard).join('') + '</div>'
      : '<p class="muted">Пока никого. Заведите ребёнку профиль — он войдёт по своему логину, ' +
        'и его звёзды будут сохраняться, на каком бы компьютере он ни занимался.</p>') +
    '<button class="btn btn-primary" onclick="openAddChild()">Добавить ребёнка</button>' +
    // Пояснение стоит внутри карточки, а не между карточками: висящий в
    // пустоте абзац глаз принимает за вступление к следующему блоку —
    // в данном случае к красной кнопке удаления, к которой он не относится.
    '<p class="small-note">У ребёнка нет почты, поэтому забытый пароль задаёте вы: ' +
    'кнопка «Сменить пароль» в его карточке. Удаление профиля убирает звёзды и работы ' +
    'без возможности вернуть.</p></div>' +

    '<div class="card danger-card"><h3>Удалить аккаунт</h3>' +
    '<p class="muted">Вместе с аккаунтом удалятся профили всех ваших детей, их звёзды, ' +
    'работы и награды. Сразу и без возможности восстановить.</p>' +
    '<button class="btn btn-danger" onclick="askDeleteAccount()">Удалить аккаунт</button></div>';
}

function kidCard(k) {
  return '<div class="kid-card"><div class="kid-top">' +
    '<span class="mini-ava big">' + (k.avatar || '🙂') + '</span>' +
    '<div><b>' + esc(k.display_name) + '</b>' +
    '<div class="muted">логин: ' + esc(k.login) + '</div></div></div>' +
    '<div class="kid-stars">' + ICONS.star + ' ' + k.stars + '</div>' +
    '<div class="kid-actions">' +
    '<button class="btn btn-ghost btn-sm" onclick="showChildProgress(\'' + k.id + '\',\'' + esc(k.display_name) + '\')">Прогресс</button>' +
    '<button class="btn btn-ghost btn-sm" onclick="openChildPassword(\'' + k.id + '\',\'' + esc(k.display_name) + '\')">Сменить пароль</button>' +
    '<button class="btn btn-ghost btn-sm" onclick="askDeleteChild(\'' + k.id + '\',\'' + esc(k.display_name) + '\')">Удалить</button>' +
    '</div></div>';
}

/* ===== Новый профиль ребёнка ===== */
function openAddChild() {
  openModal('<h2>Профиль ребёнка</h2>' +
    '<p class="sub">Логин и пароль придумываете вы — и записываете ребёнку на бумажке.</p>' +
    '<div id="authForm">' +
    '<div class="form-group"><label>Как зовут</label>' +
    '<input id="kidName" maxlength="40" placeholder="Аня"></div>' +
    '<div class="form-group"><label>Логин</label>' +
    '<input id="kidLogin" autocapitalize="none" spellcheck="false" placeholder="аня2017" oninput="checkKidLogin()">' +
    '<small class="muted" id="kidLoginNote">От 3 до 20 знаков. Можно русскими буквами — так первокласснику проще набрать.</small></div>' +
    '<div class="form-group"><label>Пароль (от 4 знаков)</label>' +
    '<input id="kidPass" maxlength="100" placeholder="кошка"></div>' +
    '<div class="form-group"><label>Картинка</label>' +
    '<div class="pic-grid two" id="kidPics">' + KID_AVATARS.map((p, i) =>
      '<button type="button" class="pic-btn' + (i === 0 ? ' sel' : '') + '" onclick="pickKidPic(this)">' + p + '</button>').join('') +
    '</div></div>' +
    '<button class="btn btn-primary btn-wide" onclick="submitAddChild()">Создать профиль</button>' +
    '</div>' +
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Отмена</button></div>');
}

function pickKidPic(btn) {
  document.querySelectorAll('#kidPics .pic-btn').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
}

let kidLoginTimer;
function checkKidLogin() {
  clearTimeout(kidLoginTimer);
  kidLoginTimer = setTimeout(async () => {
    const login = val('kidLogin');
    const note = document.getElementById('kidLoginNote');
    if (!note || login.length < 3) return;
    try {
      const out = await API.get('/parent/children/login-free?login=' + encodeURIComponent(login));
      note.className = out.free ? 'muted ok' : 'muted warn';
      note.textContent = out.free
        ? 'Логин свободен'
        : 'Занят. Свободны: ' + (out.suggestions.join(', ') || 'попробуйте другой');
    } catch (e) {
      note.className = 'muted warn';
      note.textContent = e.message;
    }
  }, 400);
}

async function submitAddChild() {
  const pic = document.querySelector('#kidPics .pic-btn.sel');
  busy(true);
  try {
    await API.post('/parent/children', {
      display_name: val('kidName'),
      login: val('kidLogin'),
      password: val('kidPass'),
      avatar: pic ? pic.textContent : null
    });
    closeModal();
    toast('Профиль создан. Логин и пароль лучше записать и отдать ребёнку.');
    loadChildren();
  } catch (e) {
    busy(false);
    toast(e.message, 'warn');
  }
}

/* ===== Прогресс ребёнка ===== */
async function showChildProgress(id, name) {
  openModal('<h2>' + esc(name) + '</h2><p class="muted">Загружаем…</p>');
  let out;
  try { out = await API.get('/parent/children/' + id + '/progress'); }
  catch (e) { return toast(e.message, 'warn'); }

  const bars = COURSES.map(c => {
    const total = LESSONS[c.id].length;
    const done = LESSONS[c.id].filter(l => (out.progress[c.id + '-' + l.id] || 0) > 0).length;
    return '<div class="course-progress"><div class="row"><span>' + c.title + '</span>' +
      '<span>' + done + ' из ' + total + '</span></div>' +
      '<div class="bar c-' + c.color + '"><span style="width:' + Math.max(done / total * 100, 2) + '%"></span></div></div>';
  }).join('');

  const marks = Object.values(out.reactions);
  const interest = marks.length ? Math.round(marks.reduce((a, b) => a + b, 0) / marks.length / 2 * 100) : null;

  openModal('<h2>' + esc(name) + '</h2>' +
    '<div class="stat-grid"><div class="stat"><b>' + out.stars + '</b><span>звёзд</span></div>' +
    '<div class="stat"><b>' + Object.keys(out.progress).length + '</b><span>уроков пройдено</span></div>' +
    '<div class="stat"><b>' + (interest === null ? '—' : interest + '%') + '</b><span>интерес к урокам</span></div></div>' +
    bars +
    '<p class="small-note">«Интерес» считается по ответам ребёнка на вопрос «Как тебе урок?» после ' +
    'каждого задания. Это не оценка, а подсказка, что ему заходит.</p>' +
    '<div class="modal-actions"><button class="btn btn-primary" onclick="closeModal()">Закрыть</button></div>',
    { wide: true });
}

/* ===== Пароль и удаление ===== */
function openChildPassword(id, name) {
  openModal('<h2>Новый пароль для ' + esc(name) + '</h2>' +
    '<p class="sub">Старый пароль знать не нужно. Ребёнок выйдет со всех устройств.</p>' +
    '<div id="authForm"><div class="form-group"><label>Пароль (от 4 знаков)</label>' +
    '<input id="newKidPass" maxlength="100" placeholder="кошка"></div>' +
    '<button class="btn btn-primary btn-wide" onclick="submitChildPassword(\'' + id + '\')">Задать</button></div>' +
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Отмена</button></div>');
}

async function submitChildPassword(id) {
  busy(true);
  try {
    await API.post('/parent/children/' + id + '/password', { password: val('newKidPass') });
    closeModal();
    toast('Пароль изменён');
  } catch (e) {
    busy(false);
    toast(e.message, 'warn');
  }
}

function askDeleteChild(id, name) {
  openModal('<h2>Удалить профиль?</h2>' +
    '<p class="sub">У ' + esc(name) + ' пропадут все звёзды, работы и награды. Вернуть их будет нельзя.</p>' +
    '<div id="authForm"><div class="form-group"><label>Введите свой пароль, чтобы подтвердить</label>' +
    '<input id="delPass" type="password" autocomplete="current-password"></div></div>' +
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-danger" onclick="submitDeleteChild(\'' + id + '\')">Удалить</button></div>');
}

async function submitDeleteChild(id) {
  try {
    const out = await API.del('/parent/children/' + id, { password: val('delPass') });
    closeModal();
    toast(out.message || 'Профиль удалён');
    loadChildren();
  } catch (e) {
    toast(e.message, 'warn');
  }
}

/* ===== Удаление аккаунта =====
   Подтверждение — пароль. Его знает только взрослый, и этого довольно:
   ребёнок, добравшийся до открытого кабинета, пароля не введёт. */
function askDeleteAccount() {
  openModal('<h2>Удалить аккаунт?</h2>' +
    '<p class="sub">Удалятся профили всех ваших детей, их звёзды, работы и награды. ' +
    'Вернуть это будет нельзя — ни вам, ни нам.</p>' +
    '<div id="authForm">' +
    '<div class="form-group"><label>Введите свой пароль, чтобы подтвердить</label>' +
    '<input id="accPass" type="password" autocomplete="current-password"></div></div>' +
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-danger" onclick="submitDeleteAccount()">Удалить навсегда</button></div>');
}

async function submitDeleteAccount() {
  try {
    await API.del('/auth/account', { password: val('accPass') });
    DB.session = { role: 'guest', gid: DB.session.gid };
    DB.account = null;
    DB.cloud = null;
    saveDB();
    closeModal();
    renderAuthArea();
    go('home');
    toast('Аккаунт и все данные удалены');
  } catch (e) {
    toast(e.message, 'warn');
  }
}
