/* ===== Главная, профессии, кабинет ученика, о проекте ===== */

/* Три профессии на главной — приманка, а не справочник: иконка, название
   и одна забавная строчка. Весь список и тест живут в разделе «Профессии». */
const HOME_PROFS = ['robot', 'gamedev', 'animator'];

route('home', () => {
  document.getElementById('homeStart').innerHTML = homeStartHTML();
  // Список курсов имеет смысл только после выбора уровня: иначе на главной
  // вперемешку лежали бы задания для шести- и для десятилетних.
  const box = document.getElementById('homeCoursesBox');
  box.hidden = !activeTrack();
  if (!box.hidden) document.getElementById('homeCourses').innerHTML = visibleCourses().map(courseCard).join('');
  document.getElementById('heroStageIcon').innerHTML = ICONS.cat;
  document.getElementById('hvStar').innerHTML = ICONS.star;
  document.getElementById('hvBlocks').innerHTML = ['right', 'right', 'up', 'jump', 'say']
    .map(t => '<span class="hvb ' + BLOCKS[t].cls + '">' + ICONS[t] + '</span>').join('');
  document.getElementById('homeProfs').innerHTML = HOME_PROFS.map(id => {
    const pr = PROFESSIONS[id];
    return '<button class="pt-card p-' + pr.color + '" onclick="go(\'profs\')">' +
      '<span class="pt-ico">' + ICONS[pr.ico] + '</span><b>' + pr.title + '</b>' +
      '<span>' + pr.fun + '</span></button>';
  }).join('');
  renderHomeStudio();
  document.getElementById('ctaHero').innerHTML = ICONS.cat;
});

/* Мастерская на главной: герой и фон выбираются здесь же, а работа из галереи
   открывается в один клик. Это вход в раздел, а не рассказ о нём. */
function renderHomeStudio() {
  document.getElementById('homeHeroes').innerHTML = Object.entries(HEROES).map(([id, h]) =>
    '<button class="sp-pick" onclick="openStudioWith(\'' + id + '\')" title="' + h.name + '">' +
    '<span class="sp-ico">' + h.icon + '</span><small>' + h.name + '</small></button>').join('');
  document.getElementById('homeBgs').innerHTML = Object.entries(BACKGROUNDS).map(([id, b]) =>
    '<button class="sp-pick" onclick="openStudioWith(null, \'' + id + '\')">' +
    '<span class="sp-swatch bg-' + id + '"></span><small>' + b.name + '</small></button>').join('');
  document.getElementById('homeDemos').innerHTML = DEMO_PROJECTS.slice(0, 4).map(p =>
    '<button class="sp-demo" onclick="openProject(\'' + p.id + '\')">' +
    '<span class="sd-prev bg-' + p.bg + '">' + HEROES[p.hero].icon + '</span>' +
    '<span class="sd-text"><b>' + esc(p.title) + '</b><small>' + countBlocks(p.program) + ' блоков</small></span></button>').join('');
}

route('about', () => {});

/* ---------- Профессии ---------- */
function profTried(id, p) {
  const any = Object.keys(p.progress).length > 0;
  return ({
    programmer: any,
    tester: lessonStars(p, 'steps', 6) > 0 || lessonStars(p, 'loops', 5) > 0 || lessonStars(p, 'moves', 5) > 0,
    robot: courseDone(p, 'steps') > 0 || courseDone(p, 'moves') > 0,
    gamedev: courseDone(p, 'loops') > 0,
    animator: courseDone(p, 'stories') > 0,
    designer: p.projects.length > 0
  })[id];
}

/* Карточка профессии: сначала картинка и забавный пример, а длинное описание
   раскрывается по кнопке. Абзац текста ребёнок пролистывает, одну строчку —
   читает. В окне теста карточки показываются без кнопки, компактно. */
function profCard(id, p, compact) {
  const pr = PROFESSIONS[id];
  const tried = p && profTried(id, p);
  return '<article class="prof-card p-' + pr.color + (tried ? ' tried' : '') + (compact ? ' compact' : '') + '">' +
    '<span class="pc-ico" aria-hidden="true">' + (ICONS[pr.ico] || '') + '</span>' +
    (tried ? '<span class="tried-badge">Ты уже пробовал!</span>' : '') +
    '<h4>' + pr.title + '</h4>' +
    '<p class="pc-fun">' + pr.fun + '</p>' +
    (compact ? '' :
      '<div class="pc-more"><div><p>' + pr.text + '</p><small>' + pr.lesson + '</small></div></div>' +
      '<button class="link-btn pc-toggle" aria-expanded="false" onclick="toggleProf(this)">Подробнее</button>') +
    '</article>';
}

function toggleProf(btn) {
  const open = btn.closest('.prof-card').classList.toggle('open');
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  btn.textContent = open ? 'Свернуть' : 'Подробнее';
}

/* ===== Достижения =====
   Значок выдаётся один раз и запоминается в профиле: так его можно показать
   сразу после урока, а не ждать, пока ребёнок зайдёт в кабинет. */
function newAwards(p) {
  p.awards = p.awards || [];
  const fresh = AWARDS.filter(a => !p.awards.includes(a.id) && a.has(p));
  if (fresh.length) {
    fresh.forEach(a => p.awards.push(a.id));
    saveDB();
    syncPushSoon();
  }
  return fresh;
}

function awardBadgeHTML(a, locked) {
  return '<span class="award' + (locked ? ' locked' : '') + '">' +
    '<span class="aw-ico">' + (locked ? '🔒' : a.ico) + '</span>' +
    '<b>' + a.title + '</b><small>' + a.note + '</small></span>';
}

route('profs', () => {
  const p = me();
  document.getElementById('profGrid').innerHTML = Object.keys(PROFESSIONS).map(id => profCard(id, p)).join('');
  const q = p.quiz && QUIZ_RESULTS[p.quiz];
  document.getElementById('quizResultBox').innerHTML = q
    ? '<div class="card quiz-res"><b>Твой результат: ' + q.title + '</b><p>' + q.text + ' ' + q.profs.map(x => PROFESSIONS[x].title).join(' и ') + '.</p>' +
      '<button class="btn btn-ghost" onclick="startQuiz()">Пройти ещё раз</button></div>'
    : '';
});

let quizState;
function startQuiz() {
  quizState = { i: 0, score: { logic: 0, create: 0, tech: 0 } };
  showQuizQ();
}

function showQuizQ() {
  const q = QUIZ[quizState.i];
  openModal('<div class="quiz"><div class="quiz-step">Вопрос ' + (quizState.i + 1) + ' из ' + QUIZ.length + '</div>' +
    '<h2>' + q.q + '</h2><div class="quiz-opts">' +
    q.a.map(([text, dir]) => '<button class="quiz-opt" onclick="quizAnswer(\'' + dir + '\')">' + text + '</button>').join('') +
    '</div></div>');
}

function quizAnswer(dir) {
  quizState.score[dir]++;
  quizState.i++;
  if (quizState.i < QUIZ.length) return showQuizQ();
  const top = Object.entries(quizState.score).sort((a, b) => b[1] - a[1])[0][0];
  me().quiz = top;
  saveDB();
  const r = QUIZ_RESULTS[top];
  openModal('<div class="success"><h2>' + r.title + '</h2><p>' + r.text + '</p>' +
    '<div class="prof-mini">' + r.profs.map(id => profCard(id, null, true)).join('') + '</div>' +
    '<p class="small-note">Это не экзамен, а подсказка. Пробуй всё — интересы могут меняться!</p>' +
    '<div class="modal-actions"><button class="btn btn-primary" onclick="closeModal();handleRoute()">Готово</button></div></div>', { wide: true });
}

/* ---------- Кабинет ученика ---------- */
route('profile', () => {
  const p = me();
  const isStudent = DB.session.role === 'student';
  const cls = currentClass();
  const done = Object.keys(p.progress).length;
  const bars = visibleCourses().map(c => {
    const d = courseDone(p, c.id), t = LESSONS[c.id].length;
    return '<div class="course-progress"><div class="row"><span>' + c.title + '</span><span>' + d + ' из ' + t + '</span></div>' +
      '<div class="bar c-' + c.color + '"><span style="width:' + Math.max(d / t * 100, 2) + '%"></span></div></div>';
  }).join('');
  const tried = Object.keys(PROFESSIONS).filter(id => profTried(id, p));
  newAwards(p);   // значки могли появиться за мастерскую или тест, а не за урок
  const got = new Set(p.awards || []);

  document.getElementById('profileArea').innerHTML =
    '<div class="profile-grid"><div class="profile-card">' +
      '<div class="avatar">' + (p.pic || ICONS.cat) + '</div>' +
      '<h3>' + esc(p.name) + '</h3>' +
      '<p class="muted">' + (isStudent && cls ? esc(cls.name) : 'Ты играешь без входа — прогресс сохраняется только на этом компьютере') + '</p>' +
      '<div class="stat-row"><div><b>' + done + '</b><span>уроков</span></div><div><b>' + totalStars(p) + '</b><span>звёзд</span></div><div><b>' + p.projects.length + '</b><span>работ</span></div></div>' +
      (isStudent
        ? '<button class="btn btn-ghost" onclick="logout()">Выйти</button>'
        : '<button class="btn btn-primary" onclick="openLogin()">Войти в класс</button>' +
          '<button class="btn btn-ghost" onclick="openGuestSwitch()">Это не мой прогресс</button>' +
          (Object.keys(DB.guests).length > 1
            ? '<button class="btn btn-ghost" onclick="removeGuest(DB.session.gid)">Удалить этот профиль</button>' : '')) +
    '</div><div class="progress-list">' +
      '<h3>Мои достижения</h3>' +
      '<div class="award-grid">' + AWARDS.map(a => awardBadgeHTML(a, !got.has(a.id))).join('') + '</div>' +
      '<h3>Мои курсы</h3>' + bars +
      '<h3>Профессии, которые я попробовал</h3>' +
      (tried.length ? '<div class="chips">' + tried.map(id => '<span class="chip-s p-' + PROFESSIONS[id].color + '">' + PROFESSIONS[id].title + '</span>').join('') + '</div>'
                    : '<p class="muted">Пройди первый урок — и здесь появится первая профессия!</p>') +
      '<h3>Что мне интересно</h3>' +
      (p.quiz ? '<p>' + QUIZ_RESULTS[p.quiz].title + '</p>' : '<p class="muted">Ты ещё не проходил тест.</p>') +
      '<button class="btn btn-ghost" onclick="go(\'profs\')">К профессиям</button>' +
    '</div></div>';
});
