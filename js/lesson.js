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

/* Сколько всего заданий на уровне — число на карточке выбора честное,
   считается по содержанию, а не проставлено руками. */
function trackLessons(t) {
  return COURSES.filter(c => c.track === t).reduce((n, c) => n + LESSONS[c.id].length, 0);
}

/* Первое незакрытое задание своего уровня: вернувшийся ребёнок продолжает
   одной кнопкой, а не ищет, где остановился. */
function nextLesson() {
  const p = me();
  const list = visibleCourses();
  for (const c of list) {
    const l = LESSONS[c.id].find(x => lessonStars(p, c.id, x.id) === 0);
    if (l) return { course: c, lesson: l };
  }
  const c = list[0] || COURSES[0];
  return { course: c, lesson: LESSONS[c.id][0] };
}

/* Кнопки «Начать» ведут в первое незакрытое задание своего уровня. Пока
   уровень не выбран, бросать ребёнка в случайное задание нельзя: третьеклассник
   попал бы в задания для шестилеток, поэтому возвращаем к выбору. */
function startFirst() {
  if (!activeTrack()) {
    go('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  const { course, lesson } = nextLesson();
  go('lesson/' + course.id + '/' + lesson.id);
}

/* ===== Выбор уровня на главной =====
   Карточка показывает не описание, а сами блоки, которые ребёнок получит:
   «у меня будут вот такие кнопки» понятно и тому, кто ещё не читает. */
const TRACK_BLOCKS = {
  junior: ['right', 'up', 'jump', 'say'],
  senior: ['forward', 'turnRight', 'repeat', 'spin']
};

/* Два портала вместо таблицы сравнения: герой, его блоки и большая кнопка.
   Подробности («сколько минут задание», «какие блоки») раскрываются по
   наведению, а на телефоне — кнопкой «Что внутри?»: взрослому они нужны,
   ребёнку мешают. */
function levelCardsHTML() {
  return '<div class="level-grid">' + Object.entries(TRACKS).map(([id, tr]) =>
    '<div class="portal t-' + id + '">' +
      '<span class="p-glow" aria-hidden="true"></span>' +
      '<span class="p-hero">' + HEROES[tr.hero].icon + '</span>' +
      '<b>' + tr.title + '</b><span class="p-age">' + tr.age + '</span>' +
      '<span class="p-blocks" aria-hidden="true">' + TRACK_BLOCKS[id].map(t =>
        '<span class="hvb ' + BLOCKS[t].cls + '">' + ICONS[t] + '</span>').join('') + '</span>' +
      '<span class="p-note">' + tr.note + '</span>' +
      '<button class="btn btn-lg p-start" onclick="chooseTrack(\'' + id + '\')">Играть · ' +
        trackLessons(id) + ' заданий</button>' +
      '<div class="p-details"><div class="p-det-in">' + tr.details.map(([k, v]) =>
        '<span class="p-row"><i>' + k + '</i>' + v + '</span>').join('') + '</div></div>' +
      '<button class="link-btn p-more" aria-expanded="false" onclick="togglePortal(this)">Что внутри?</button>' +
    '</div>').join('') + '</div>';
}

function togglePortal(btn) {
  const open = btn.closest('.portal').classList.toggle('open');
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  btn.textContent = open ? 'Свернуть' : 'Что внутри?';
}

/* Уровень уже выбран — вместо карточек одна кнопка «Продолжить» с тем самым
   заданием, на котором остановились. */
function startPanelHTML() {
  const t = activeTrack();
  const tr = TRACKS[t];
  const { course, lesson } = nextLesson();
  const started = totalStars(me()) > 0;
  return '<div class="start-panel t-' + t + '">' +
    '<span class="sp-hero">' + HEROES[tr.hero].icon + '</span>' +
    '<span class="sp-text"><span class="sp-level">' + tr.title + ' · ' + tr.age + '</span>' +
      '<b>' + lesson.title + '</b>' +
      '<span class="muted">' + course.title + ' · задание ' + lesson.id + '</span></span>' +
    '<span class="sp-act">' +
      '<button class="btn btn-primary btn-lg" onclick="go(\'lesson/' + course.id + '/' + lesson.id + '\')">' +
        (started ? 'Продолжить' : 'Начать') + '</button>' +
      (lockedTrack()
        ? '<span class="muted">уровень выбрал учитель</span>'
        : '<button class="link-btn" onclick="chooseTrack(null)">Сменить уровень</button>') +
    '</span></div>';
}

function homeStartHTML() {
  return activeTrack() ? startPanelHTML() : levelCardsHTML();
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
  syncPushSoon();     // если класс синхронизируется, звёзды уйдут учителю сами
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
    '<p>' + (stars < 3 && best ? 'А можно ещё короче: хватит ' + best + ' блоков. Попробуешь?' : 'Ты справился с уроком «' + esc(lesson.title) + '».') + '</p>' +
    coursePathHTML(courseId, p, lesson.id);

  // Новые значки показываем сразу: иначе ребёнок увидит их, только если
  // случайно заглянет в кабинет.
  const fresh = newAwards(p);
  if (fresh.length) {
    html += '<div class="award-flash"><small>Новое достижение!</small>' +
      '<div class="award-row">' + fresh.map(awardBadgeHTML).join('') + '</div></div>';
  }

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
  confetti(document.querySelector('#modal .modal'));
}

/* «Путь» по курсу прямо в окне успеха: ребёнок видит не только звёзды за урок,
   но и сколько осталось до конца. Без этого прогресс ощущается списком галочек. */
function coursePathHTML(courseId, p, currentId) {
  const list = LESSONS[courseId];
  const done = courseDone(p, courseId);
  return '<div class="path"><div class="path-row">' + list.map(l => {
    const st = lessonStars(p, courseId, l.id);
    return '<span class="pt' + (st ? ' ok' : '') + (l.id === currentId ? ' cur' : '') + '">' +
      (st ? ICONS.star : l.id) + '</span>';
  }).join('') + '</div>' +
    '<div class="path-bar"><span style="width:' + Math.round(done / list.length * 100) + '%"></span></div>' +
    '<small>Пройдено ' + done + ' из ' + list.length + ' в этом курсе</small></div>';
}

function setReaction(v, btn) {
  me().reactions[lessonKey(L.courseId, L.lesson.id)] = v;
  saveDB();
  syncPushSoon();
  btn.parentElement.querySelectorAll('.react').forEach(b => b.classList.toggle('sel', b === btn));
}

function saveLessonProject() {
  saveProject('Мой мультик', L.hero, 'meadow', L.editor.program);
  closeModal();
  toast('Сохранено! Работа появилась в галерее Мастерской.');
}
