/* ===== Кабинет учителя =====
   Пока здесь только аккаунт и памятка. Занятия — то, ради чего учитель сюда
   приходит, — делаются следующим шагом: учитель открывает занятие, получает
   код, дети подключаются по нему и попадают в его журнал. */

route('teacher', () => {
  const box = document.getElementById('teacherArea');
  if (DB.session.role !== 'teacher') {
    box.innerHTML = '<div class="card"><h3>Кабинет учителя</h3>' +
      '<p class="muted">Войдите, чтобы проводить занятия и видеть, как идут дела у детей.</p>' +
      '<button class="btn btn-primary" onclick="openLogin(\'teacher\')">Войти</button>' +
      '<p class="small-note">Нет аккаунта? Его можно завести в том же окне.</p></div>' +
      teacherGuide();
    return;
  }

  const a = DB.account || {};
  box.innerHTML =
    '<div class="t-head card"><div><span class="lvl">Учитель</span>' +
      '<h2>' + esc(fullName(a)) + '</h2><p class="muted">' + esc(a.email || '') + '</p></div>' +
      '<div class="t-head-actions">' +
      '<button class="btn btn-ghost" onclick="logout()">Выйти</button></div></div>' +

    '<div class="card"><h3>Занятия</h3>' +
      '<p class="muted">Здесь появится список занятий: вы открываете занятие, платформа ' +
      'выдаёт короткий код, дети вводят его и попадают в ваш журнал — вместе с теми, ' +
      'у кого ещё нет своего профиля.</p>' +
      '<p class="muted">Этот раздел делается сейчас. Пока уроки можно проводить и без него: ' +
      'дети занимаются сами, а прогресс тех, у кого есть профиль, видят родители.</p></div>' +

    teacherGuide() +

    '<div class="card danger-card"><h3>Удалить аккаунт</h3>' +
    '<p class="muted">Удалится аккаунт и ваши занятия. Звёзды детей останутся при них: ' +
    'прогресс принадлежит ребёнку и его родителю, а не учителю.</p>' +
    '<button class="btn btn-danger" onclick="askDeleteAccount()">Удалить аккаунт</button></div>';
});

function teacherGuide() {
  return '<details class="guide" open><summary>Памятка: как провести урок за 30 минут</summary><ol>' +
    '<li><b>5 минут — разминка без компьютера.</b> Один ребёнок — «робот», остальные дают ему команды: «шаг вперёд», «поворот». Так дети понимают, что такое алгоритм.</li>' +
    '<li><b>2 минуты — вход.</b> У кого есть логин — входит; остальные жмут «Играть без входа» и выбирают своё имя в списке.</li>' +
    '<li><b>18 минут — уроки.</b> Дети проходят задания в своём темпе. Если кто-то застрял, пусть нажмёт «Подсказка», а потом спросит соседа.</li>' +
    '<li><b>5 минут — разговор.</b> Откройте раздел «Профессии»: «Сегодня вы искали ошибки — так работают тестировщики».</li>' +
    '</ol><p class="muted">Один компьютер на несколько детей — тоже нормально: работайте парами, один «водитель», другой «штурман», потом меняйтесь. ' +
    'Платформе не нужен быстрый интернет: после первого открытия она работает и без него.</p></details>';
}

/* Интерес к урокам по реакциям ребёнка (😀=2, 🙂=1, 😐=0).
   Пригодится в журнале занятия, когда он появится. */
function interestOf(reactions) {
  const vals = Object.values(reactions || {});
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
