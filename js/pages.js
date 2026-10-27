/* ===== Главная, профессии, кабинет ученика, о проекте ===== */

route('home', () => {
  document.getElementById('homeCourses').innerHTML = COURSES.map(courseCard).join('');
  document.getElementById('heroStageIcon').innerHTML = ICONS.cat;
  document.getElementById('hvStar').innerHTML = ICONS.star;
  document.getElementById('hvBlocks').innerHTML = ['right', 'right', 'up', 'jump', 'say']
    .map(t => '<span class="hvb ' + BLOCKS[t].cls + '">' + ICONS[t] + '</span>').join('');
});

route('about', () => {});

/* ---------- Профессии ---------- */
function profTried(id, p) {
  const any = Object.keys(p.progress).length > 0;
  return ({
    programmer: any,
    tester: lessonStars(p, 'steps', 6) > 0 || lessonStars(p, 'loops', 5) > 0,
    robot: courseDone(p, 'steps') > 0,
    gamedev: courseDone(p, 'loops') > 0,
    animator: courseDone(p, 'stories') > 0,
    designer: p.projects.length > 0
  })[id];
}

function profCard(id, p) {
  const pr = PROFESSIONS[id];
  const tried = p && profTried(id, p);
  return '<article class="prof-card p-' + pr.color + (tried ? ' tried' : '') + '">' +
    (tried ? '<span class="tried-badge">Ты уже пробовал!</span>' : '') +
    '<h4>' + pr.title + '</h4><p>' + pr.text + '</p><small>' + pr.lesson + '</small></article>';
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
    '<div class="prof-mini">' + r.profs.map(id => profCard(id, null)).join('') + '</div>' +
    '<p class="small-note">Это не экзамен, а подсказка. Пробуй всё — интересы могут меняться!</p>' +
    '<div class="modal-actions"><button class="btn btn-primary" onclick="closeModal();handleRoute()">Готово</button></div></div>', { wide: true });
}

/* ---------- Кабинет ученика ---------- */
route('profile', () => {
  const p = me();
  const isStudent = DB.session.role === 'student';
  const cls = currentClass();
  const done = Object.keys(p.progress).length;
  const bars = COURSES.map(c => {
    const d = courseDone(p, c.id), t = LESSONS[c.id].length;
    return '<div class="course-progress"><div class="row"><span>' + c.title + '</span><span>' + d + ' из ' + t + '</span></div>' +
      '<div class="bar c-' + c.color + '"><span style="width:' + Math.max(d / t * 100, 2) + '%"></span></div></div>';
  }).join('');
  const tried = Object.keys(PROFESSIONS).filter(id => profTried(id, p));

  document.getElementById('profileArea').innerHTML =
    '<div class="profile-grid"><div class="profile-card">' +
      '<div class="avatar">' + (p.pic || ICONS.cat) + '</div>' +
      '<h3>' + esc(p.name) + '</h3>' +
      '<p class="muted">' + (isStudent && cls ? esc(cls.name) : 'Ты играешь без входа — прогресс сохраняется только на этом устройстве') + '</p>' +
      '<div class="stat-row"><div><b>' + done + '</b><span>уроков</span></div><div><b>' + totalStars(p) + '</b><span>звёзд</span></div><div><b>' + p.projects.length + '</b><span>работ</span></div></div>' +
      (isStudent ? '<button class="btn btn-ghost" onclick="logout()">Выйти</button>' : '<button class="btn btn-primary" onclick="openLogin()">Войти в класс</button>') +
    '</div><div class="progress-list"><h3>Мои курсы</h3>' + bars +
      '<h3>Профессии, которые я попробовал</h3>' +
      (tried.length ? '<div class="chips">' + tried.map(id => '<span class="chip-s p-' + PROFESSIONS[id].color + '">' + PROFESSIONS[id].title + '</span>').join('') + '</div>'
                    : '<p class="muted">Пройди первый урок — и здесь появится первая профессия!</p>') +
      '<h3>Что мне интересно</h3>' +
      (p.quiz ? '<p>' + QUIZ_RESULTS[p.quiz].title + '</p>' : '<p class="muted">Ты ещё не проходил тест.</p>') +
      '<button class="btn btn-ghost" onclick="go(\'profs\')">К профессиям</button>' +
    '</div></div>';
});
