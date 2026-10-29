/* ===== Курсы, список уроков, экран урока ===== */

function courseCard(c) {
  const p = me();
  const total = LESSONS[c.id].length, done = courseDone(p, c.id);
  const pct = Math.round(done / total * 100);
  return '<article class="course-card c-' + c.color + '">' +
    '<div class="course-top"><span class="lvl">Уровень ' + c.level + '</span><span class="grade">' + c.grade + '</span></div>' +
    '<div class="course-hero">' + HEROES[c.hero].icon + '</div>' +
    '<h3>' + c.title + '</h3>' +
    '<p>' + c.desc + '</p>' +
    '<div class="chips">' + c.skills.map(s => '<span class="chip-s">' + s + '</span>').join('') + '</div>' +
    '<div class="mini-progress"><span style="width:' + pct + '%"></span></div>' +
    '<div class="course-foot"><span>' + done + ' из ' + total + ' уроков · бесплатно</span>' +
    '<button class="btn btn-primary" onclick="go(\'course/' + c.id + '\')">' + (done ? 'Продолжить' : 'Начать') + '</button></div>' +
    '</article>';
}

/* Курсы того уровня сложности, который сейчас выбран.
   Пока уровень не выбран (и у разновозрастной группы) показываем все. */
function visibleCourses() {
  const t = activeTrack();
  return (t === 'junior' || t === 'senior') ? COURSES.filter(c => c.track === t) : COURSES;
}

/* Кнопки «Начать первый урок» на главной ведут в первый курс своего уровня,
   иначе третьеклассник попадал бы в задания для шестилеток. */
function startFirst() {
  const c = visibleCourses()[0] || COURSES[0];
  go('lesson/' + c.id + '/1');
}

/* Выбор уровня сложности: два больших варианта, пока ничего не выбрано,
   и одна строка потом. Подписи — по классу, а не «лёгкий» и «сложный»:
   ребёнок не должен выбирать себе ярлык. */
function trackPickHTML() {
  const t = activeTrack();
  const fixed = lockedTrack();

  if (fixed) {
    return '<div class="track-note"><span>Уровень: <b>' + TRACKS[fixed].title + '</b></span>' +
      '<span class="muted">его выбрал учитель при создании класса</span></div>';
  }
  if (t === 'junior' || t === 'senior') {
    return '<div class="track-note"><span>Уровень: <b>' + TRACKS[t].title + '</b> · ' + TRACKS[t].age + '</span>' +
      '<button class="link-btn" onclick="chooseTrack(null)">Выбрать другой</button></div>';
  }
  return '<div class="track-pick">' + Object.entries(TRACKS).map(([id, tr]) =>
    '<button class="track-card t-' + id + '" onclick="chooseTrack(\'' + id + '\')">' +
      '<span class="tc-hero">' + HEROES[tr.hero].icon + '</span>' +
      '<b>' + tr.title + '</b><span class="tc-age">' + tr.age + '</span>' +
      '<span class="tc-note">' + tr.note + '</span></button>').join('') +
    '</div>';
}

function renderTrackPick(id) {
  const box = document.getElementById(id);
  if (box) box.innerHTML = trackPickHTML();
}

function chooseTrack(t) {
  setTrack(t);
  handleRoute();
}

route('courses', () => {
  renderTrackPick('trackPickCourses');
  document.getElementById('coursesGrid').innerHTML = visibleCourses().map(courseCard).join('');
});

function lessonUnlocked(courseId, l) {
  if (DB.session.role === 'teacher' || l.id === 1) return true;
  return lessonStars(me(), courseId, l.id - 1) > 0;
}

route('course', courseId => {
  const c = COURSES.find(x => x.id === courseId) || COURSES[0];
  const p = me();
  document.getElementById('courseHead').innerHTML =
    '<div class="course-head c-' + c.color + '"><div class="course-hero big">' + HEROES[c.hero].icon + '</div>' +
    '<div><span class="lvl">Уровень ' + c.level + ' · ' + c.grade + '</span><h2>' + c.title + '</h2><p>' + c.desc + '</p></div></div>';
  document.getElementById('lessonsList').innerHTML = LESSONS[c.id].map(l => {
    const st = lessonStars(p, c.id, l.id), open = lessonUnlocked(c.id, l);
    return '<button class="lesson-item' + (st ? ' done' : '') + (open ? '' : ' locked') + '"' +
      (open ? ' onclick="go(\'lesson/' + c.id + '/' + l.id + '\')"' : ' disabled') + '>' +
      '<span class="num">' + (open ? l.id : '🔒') + '</span>' +
      '<span class="li-text"><b>' + l.title + '</b><small>' + (open ? (st ? 'Пройден' : 'Можно начинать') : 'Сначала пройди урок ' + (l.id - 1)) + '</small></span>' +
      starsHTML(st) + '</button>';
  }).join('');
});

/* ---------- Экран урока ---------- */
const L = { courseId: null, lesson: null, hero: 'cat', running: false };

/* Задание цепочкой картинок: герой → что собрать → куда прийти.
   Для шестилетки это читается мгновенно и без букв. */
function picFormula(hero, pic) {
  const cell = ic => '<span class="pf-i">' + ic + '</span>';
  return cell(HEROES[hero].icon) +
    pic.map(name => '<span class="pf-a">→</span>' + cell(ICONS[name] || '')).join('');
}

route('lesson', (courseId, lessonId) => {
  const c = COURSES.find(x => x.id === courseId);
  const lesson = c && LESSONS[courseId].find(l => l.id === +lessonId);
  if (!lesson) return go('courses');
  if (!lessonUnlocked(courseId, lesson)) { toast('Этот урок пока закрыт. Пройди предыдущий!', 'warn'); return go('course/' + courseId); }

  Object.assign(L, { courseId, lesson, course: c, hero: c.hero, running: false });
  document.getElementById('lessonBack').onclick = () => go('course/' + courseId);
  document.getElementById('lessonTitle').textContent = 'Урок ' + lesson.id + '. ' + lesson.title;
  document.getElementById('lessonCourse').textContent = c.title;
  document.getElementById('lessonDots').innerHTML = LESSONS[courseId].map(l =>
    '<span class="dot' + (l.id === lesson.id ? ' cur' : '') + (lessonStars(me(), courseId, l.id) ? ' ok' : '') + '"></span>').join('');
  document.getElementById('taskHero').innerHTML = HEROES[c.hero].icon;
  document.getElementById('lessonTask').textContent = lesson.task;

  // Младший трек: крупная короткая подпись и цепочка картинок вместо абзаца
  document.getElementById('lessonTaskBox').classList.toggle('junior', c.track === 'junior');
  const pic = document.getElementById('taskPic');
  pic.innerHTML = lesson.pic ? picFormula(c.hero, lesson.pic) : '';
  pic.classList.toggle('show', !!lesson.pic);

  const speak = document.getElementById('speakBtn');
  speak.style.display = Speech.available() ? '' : 'none';
  speak.innerHTML = ICONS.speaker;

  document.getElementById('hintBox').classList.remove('show');
  setRunBtn(false);

  window.currentStage = L.stage = L.stage || new Stage(document.getElementById('lessonStage'));
  L.stage.mount(lesson, { hero: c.hero, rel: !!c.rel });
  L.editor = L.editor || new Editor({
    palette: document.getElementById('lessonPalette'),
    workspace: document.getElementById('lessonWs'),
    counter: document.getElementById('lessonCounter'),
    onChange: () => { L.stage.reset(); document.getElementById('hintBox').classList.remove('show'); }
  });
  L.editor.setup({ blocks: lesson.blocks, maxBlocks: lesson.maxBlocks, program: lesson.preset || [], nested: !!c.nested });
});

/* Задание вслух: в `say` лежит та же мысль полным предложением,
   потому что подпись на экране намеренно короткая. */
function speakTask() {
  if (!L.lesson) return;
  Speech.say(L.lesson.say || L.lesson.task);
}

function setRunBtn(running) {
  const b = document.getElementById('runBtn');
  b.innerHTML = running ? '■ Стоп' : '▶ Старт';
  b.classList.toggle('btn-stop', running);
}

async function runLesson() {
  if (L.running) {
    L.stage.stop(); L.stage.reset(); L.editor.setLocked(false); L.editor.clearHighlight();
    L.running = false; setRunBtn(false);
    return;
  }
  const prog = L.editor.program;
  if (!prog.length) return toast('Сначала добавь блоки в программу!', 'warn');
  Speech.stop();
  L.running = true; setRunBtn(true);
  L.editor.setLocked(true);
  const res = await L.stage.run(prog, (n, p) => L.editor.highlight(n, p));
  L.editor.setLocked(false);
  L.running = false; setRunBtn(false);
  if (res.aborted) return;
  setTimeout(() => L.editor.clearHighlight(), 600);

  const chk = checkLesson(L.lesson, prog, L.hero);
  if (chk.ok) {
    L.stage.celebrate();
    Sound.win();
    setTimeout(lessonSuccess, 500);
  } else {
    toast(chk.msg, 'warn');
  }
}

function resetLesson() {
  if (L.running) return runLesson();
  L.stage.reset();
  L.editor.clearHighlight();
}

function clearLesson() {
  if (L.running) return;
  L.editor.clear();
}

function showHint() {
  const box = document.getElementById('hintBox');
  const lesson = L.lesson;
  let extra = '';
  L.editor.clearHighlight();
  if (lesson.solution) {
    const h = findHint(L.editor.program, lesson.solution);
    if (h && h.wrong) {
      L.editor.markWrong(h.wrong);
      extra = h.repN ? 'Проверь число в блоке «Повтор».' : 'Блок, обведённый красным, кажется, не тот.';
    } else if (h && h.extra) {
      L.editor.markWrong(h.extra);
      extra = 'В программе есть лишние блоки — они обведены красным.';
    } else if (h && h.need) {
      L.editor.pulsePalette(h.need);
      extra = 'Попробуй блок «' + BLOCKS[h.need].label + '» — он мигает.';
    }
  }
  box.innerHTML = '<b>Подсказка:</b> ' + esc(lesson.hint) + (extra ? '<br>' + extra : '');
  box.classList.add('show');
  // младшим подсказку тоже проговариваем: её текст длиннее задания
  if (L.course && L.course.track === 'junior') Speech.say(lesson.hint);
}

function lessonSuccess() {
  const { courseId, lesson } = L;
  const p = me();
  const key = lessonKey(courseId, lesson.id);
  const stars = starsFor(lesson, L.editor.program);
  const wasDone = courseDone(p, courseId) === LESSONS[courseId].length;
  p.progress[key] = Math.max(p.progress[key] || 0, stars);
  saveDB();
  renderAuthArea();   // звёзды в шапке должны обновиться сразу после урока

  const list = LESSONS[courseId];
  const next = list.find(l => l.id === lesson.id + 1);
  const course = COURSES.find(c => c.id === courseId);
  const finished = !wasDone && courseDone(p, courseId) === list.length;
  const profId = finished ? course.profession : lesson.profession;
  const prof = profId && PROFESSIONS[profId];
  const best = lesson.solution ? countBlocks(lesson.solution) : null;

  let html = '<div class="success">' + starsHTML(stars) +
    '<h2>' + (stars === 3 ? 'Отлично!' : 'Получилось!') + '</h2>' +
    '<p>' + (stars < 3 && best ? 'А можно ещё короче: хватит ' + best + ' блоков. Попробуешь?' : 'Ты справился с уроком «' + esc(lesson.title) + '».') + '</p>';

  if (prof) {
    html += '<div class="prof-flash p-' + prof.color + '"><small>' + (finished ? 'Курс пройден! Ты попробовал себя как…' : 'Сейчас ты работал как…') + '</small>' +
      '<b>' + prof.title + '</b><span>' + prof.text + '</span></div>';
  }

  html += '<div class="reaction"><p>Как тебе этот урок?</p><div>' +
    [[2, '😀', 'Очень понравился'], [1, '🙂', 'Нормально'], [0, '😐', 'Скучно']].map(([v, e, t]) =>
      '<button class="react' + (p.reactions[key] === v ? ' sel' : '') + '" onclick="setReaction(' + v + ',this)" title="' + t + '"><span>' + e + '</span><small>' + t + '</small></button>').join('') +
    '</div></div>';

  html += '<div class="modal-actions">';
  if (lesson.free) html += '<button class="btn btn-ghost" onclick="saveLessonProject()">Сохранить в галерею</button>';
  if (stars < 3) html += '<button class="btn btn-ghost" onclick="closeModal()">Попробовать короче</button>';
  html += next
    ? '<button class="btn btn-primary" onclick="closeModal();go(\'lesson/' + courseId + '/' + next.id + '\')">Следующий урок →</button>'
    : (finished ? '<button class="btn btn-primary" onclick="closeModal();go(\'profs\')">Узнать о профессиях →</button>'
                : '<button class="btn btn-primary" onclick="closeModal();go(\'courses\')">К курсам</button>');
  html += '</div></div>';
  openModal(html);
}

function setReaction(v, btn) {
  me().reactions[lessonKey(L.courseId, L.lesson.id)] = v;
  saveDB();
  btn.parentElement.querySelectorAll('.react').forEach(b => b.classList.toggle('sel', b === btn));
}

function saveLessonProject() {
  saveProject('Мой мультик', L.hero, 'meadow', L.editor.program);
  closeModal();
  toast('Сохранено! Работа появилась в галерее Мастерской.');
}
