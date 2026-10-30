/* ===== Мастерская: свободное творчество + галерея работ =====
   Урок проверяет решение, Мастерская не проверяет ничего. Поэтому здесь
   открыты все блоки, все герои и все фоны, а сцену ребёнок собирает сам:
   ставит яблоки, камни и домики и переносит героя куда хочет. */

const STUDIO_ROWS = 5, STUDIO_COLS = 7;
const ALL_BLOCKS = ['right', 'left', 'up', 'down', 'jump', 'spin', 'grow', 'shrink',
                    'color', 'vanish', 'say', 'sound', 'wait', 'repeat'];
const S = { hero: 'cat', bg: 'meadow', decor: {}, start: { r: 3, c: 1 }, tool: 'a', program: [], running: false };

route('studio', () => {
  window.currentStage = S.stage = S.stage || new Stage(document.getElementById('studioStage'));
  if (!S.editor) {
    S.editor = new Editor({
      palette: document.getElementById('studioPalette'),
      workspace: document.getElementById('studioWs'),
      counter: document.getElementById('studioCounter'),
      onChange: () => S.stage.reset()
    });
    S.editor.setup({ blocks: ALL_BLOCKS, program: S.program });
    // Клик по клетке ставит выбранный предмет. Слушатель один на всю сцену:
    // mount() каждый раз перерисовывает её содержимое.
    S.stage.el.addEventListener('click', studioCellClick);
  }
  renderStudioPickers();
  mountStudioStage();
  renderGallery();
  // Работу открыли с главной, когда Мастерская ещё не была проинициализирована
  if (S.pending) { const id = S.pending; S.pending = null; openProject(id); }
});

/* Сцена Мастерской — такая же карта, как в уроках, только её рисует ребёнок */
function studioMap() {
  const rows = [];
  for (let r = 0; r < STUDIO_ROWS; r++) {
    let row = '';
    for (let c = 0; c < STUDIO_COLS; c++) {
      row += (r === S.start.r && c === S.start.c) ? 'S' : (S.decor[r + ':' + c] || '.');
    }
    rows.push(row);
  }
  return { map: rows };
}

function mountStudioStage() {
  S.stage.mount(studioMap(), { hero: S.hero, bg: S.bg, sandbox: true });
}

function studioCellClick(e) {
  if (S.running) return;
  const cell = e.target.closest('.cell');
  if (!cell) return;
  const i = [...S.stage.el.querySelectorAll('.cells .cell')].indexOf(cell);
  if (i < 0) return;
  placeDecor(Math.floor(i / STUDIO_COLS), i % STUDIO_COLS);
}

function placeDecor(r, c) {
  const k = r + ':' + c;
  if (S.tool === 'S') {
    delete S.decor[k];
    S.start = { r, c };
  } else if (r === S.start.r && c === S.start.c) {
    return toast('Здесь стоит герой. Выбери «Герой» и перенеси его в другую клетку.', 'warn');
  } else if (S.tool === '.') {
    if (!S.decor[k]) return;
    delete S.decor[k];
  } else {
    S.decor[k] = S.tool;
  }
  Sound.tone([720], 0.05);
  mountStudioStage();
}

function clearStudioScene() {
  S.decor = {};
  S.start = { r: 3, c: 1 };
  mountStudioStage();
  toast('Сцена пустая — ставь что хочешь.');
}

function renderStudioPickers() {
  document.getElementById('heroPick').innerHTML = Object.entries(HEROES).map(([id, h]) =>
    '<button class="pick' + (S.hero === id ? ' sel' : '') + '" onclick="S.hero=\'' + id + '\';renderStudioPickers();mountStudioStage()" title="' + h.name + '">' +
    '<span class="pick-ico">' + h.icon + '</span><small>' + h.name + '</small></button>').join('');
  document.getElementById('bgPick').innerHTML = Object.entries(BACKGROUNDS).map(([id, b]) =>
    '<button class="pick' + (S.bg === id ? ' sel' : '') + '" onclick="S.bg=\'' + id + '\';renderStudioPickers();mountStudioStage()">' +
    '<span class="pick-bg bg-' + id + '"></span><small>' + b.name + '</small></button>').join('');
  // «Герой» показывает того героя, который выбран сейчас: так понятнее, что
  // этим инструментом переносят именно его.
  document.getElementById('decorPick').innerHTML = DECOR.map(d =>
    '<button class="pick' + (S.tool === d.ch ? ' sel' : '') + '" onclick="S.tool=\'' + d.ch + '\';renderStudioPickers()" title="' + d.name + '">' +
    '<span class="pick-ico">' + (d.ch === 'S' ? HEROES[S.hero].icon : d.icon) + '</span><small>' + d.name + '</small></button>').join('');
}

async function runStudio() {
  const btn = document.getElementById('studioRun');
  if (S.running) {
    S.stage.stop(); S.stage.reset(); S.editor.setLocked(false); S.editor.clearHighlight();
    S.running = false; btn.innerHTML = '▶ Старт'; btn.classList.remove('btn-stop');
    return;
  }
  if (!S.editor.program.length) return toast('Добавь блоки — и герой оживёт!', 'warn');
  S.running = true; btn.innerHTML = '■ Стоп'; btn.classList.add('btn-stop');
  S.editor.setLocked(true);
  await S.stage.run(S.editor.program, (n, p) => S.editor.highlight(n, p));
  S.editor.setLocked(false);
  S.running = false; btn.innerHTML = '▶ Старт'; btn.classList.remove('btn-stop');
  setTimeout(() => S.editor.clearHighlight(), 600);
}

/* ===== «Удиви меня» =====
   Перед пустой сценой ребёнок иногда застывает: придумать с нуля труднее,
   чем переделать готовое. Кнопка собирает случайную сценку, которую дальше
   можно менять — это не ответ, а первая строчка истории. */
const IDEAS = [
  [{ t: 'say', text: 'Полетели!' }, { t: 'repeat', n: 3, body: [{ t: 'up' }, { t: 'sound' }] }, { t: 'spin' }, { t: 'say', text: 'Я лечу!' }],
  [{ t: 'repeat', n: 4, body: [{ t: 'right' }, { t: 'jump' }] }, { t: 'color' }, { t: 'say', text: 'Догоняй!' }],
  [{ t: 'say', text: 'Фокус!' }, { t: 'repeat', n: 2, body: [{ t: 'color' }, { t: 'spin' }] }, { t: 'grow' }, { t: 'vanish' }],
  [{ t: 'repeat', n: 3, body: [{ t: 'down' }, { t: 'right' }] }, { t: 'shrink' }, { t: 'sound' }, { t: 'say', text: 'Я спрятался' }],
  [{ t: 'say', text: 'Ой!' }, { t: 'jump' }, { t: 'repeat', n: 2, body: [{ t: 'left' }, { t: 'spin' }] }, { t: 'grow' }]
];

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function surpriseStudio() {
  S.hero = pickRandom(Object.keys(HEROES));
  S.bg = pickRandom(Object.keys(BACKGROUNDS));
  S.start = { r: Math.floor(Math.random() * STUDIO_ROWS), c: Math.floor(Math.random() * 3) };
  S.decor = {};
  const things = DECOR.filter(d => d.ch !== 'S' && d.ch !== '.').map(d => d.ch);
  for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
    const r = Math.floor(Math.random() * STUDIO_ROWS), c = Math.floor(Math.random() * STUDIO_COLS);
    if (r === S.start.r && c === S.start.c) continue;
    S.decor[r + ':' + c] = pickRandom(things);
  }
  S.editor.setup({ blocks: ALL_BLOCKS, program: pickRandom(IDEAS) });
  renderStudioPickers();
  mountStudioStage();
  toast('Вот идея! Меняй блоки и сцену как хочешь.');
}

function saveProject(title, hero, bg, program, decor, start) {
  me().projects.unshift({
    id: uid(), title, hero, bg,
    program: JSON.parse(JSON.stringify(program)),
    decor: Object.assign({}, decor),
    start: Object.assign({ r: 3, c: 1 }, start),
    date: Date.now()
  });
  saveDB();
  newAwards(me());
  syncPushSoon();
}

function askSaveStudio() {
  if (!S.editor.program.length) return toast('Пустую программу сохранять не будем 🙂', 'warn');
  openModal('<h2>Сохранить работу</h2><p class="sub">Придумай название — его увидят в галерее.</p>' +
    '<div class="form-group"><input id="projTitle" maxlength="30" placeholder="Например, Котик в космосе"></div>' +
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-primary" onclick="doSaveStudio()">Сохранить</button></div>');
}

function doSaveStudio() {
  const t = document.getElementById('projTitle').value.trim() || 'Без названия';
  saveProject(t, S.hero, S.bg, S.editor.program, S.decor, S.start);
  closeModal();
  toast('Готово! Работа в галерее.');
  renderGallery();
}

function projectCard(p, author, own) {
  return '<article class="proj-card">' +
    '<div class="proj-preview bg-' + p.bg + '"><span>' + HEROES[p.hero].icon + '</span></div>' +
    '<div class="proj-info"><h4>' + esc(p.title) + '</h4><div class="author">' + esc(author) + ' · ' + countBlocks(p.program) + ' блоков</div>' +
    '<div class="proj-actions"><button class="btn btn-primary btn-sm" onclick="openProject(\'' + p.id + '\')">Открыть</button>' +
    (own ? '<button class="btn btn-ghost btn-sm" onclick="deleteProject(\'' + p.id + '\')" aria-label="Удалить">Удалить</button>' : '') +
    '</div></div></article>';
}

function allVisibleProjects() {
  const mine = me().projects.map(p => ({ p, author: 'Я', own: true }));
  const cls = currentClass();
  const classmates = [];
  if (cls) Object.values(cls.students).forEach(st => {
    if (st !== me()) st.projects.forEach(p => classmates.push({ p, author: st.name, own: false }));
  });
  const demos = DEMO_PROJECTS.map(p => ({ p, author: p.author, own: false }));
  return { mine, classmates, demos };
}

function renderGallery() {
  const { mine, classmates, demos } = allVisibleProjects();
  const block = (title, arr, empty) => '<h3 class="gal-title">' + title + '</h3>' +
    (arr.length ? '<div class="gallery-grid">' + arr.map(x => projectCard(x.p, x.author, x.own)).join('') + '</div>'
                : '<p class="muted">' + empty + '</p>');
  document.getElementById('galleryArea').innerHTML =
    block('Мои работы', mine, 'Пока пусто. Собери программу и нажми «Сохранить».') +
    (currentClass() ? block('Работы моего класса', classmates, 'Одноклассники ещё ничего не сохранили.') : '') +
    block('Примеры для вдохновения', demos, '');
}

function findProject(id) {
  const { mine, classmates, demos } = allVisibleProjects();
  const x = [...mine, ...classmates, ...demos].find(x => x.p.id === id);
  return x && x.p;
}

function openProject(id) {
  const p = findProject(id);
  if (!p) return;
  // С главной Мастерская ещё не открывалась: сначала раздел, потом работа
  if (!S.editor) { S.pending = id; return go('studio'); }
  S.hero = p.hero; S.bg = p.bg;
  // Работы, сохранённые до появления декораций, открываются на пустой сцене
  S.decor = Object.assign({}, p.decor);
  S.start = Object.assign({ r: 3, c: 1 }, p.start);
  S.editor.setup({ blocks: ALL_BLOCKS, program: p.program });
  renderStudioPickers();
  mountStudioStage();
  document.getElementById('studioTop').scrollIntoView({ behavior: 'smooth' });
  setTimeout(runStudio, 500);
}

function deleteProject(id) {
  const p = me();
  p.projects = p.projects.filter(x => x.id !== id);
  saveDB();
  renderGallery();
}

/* Вход в Мастерскую с главной: герой или фон выбран ещё до открытия раздела */
function openStudioWith(hero, bg) {
  if (hero) S.hero = hero;
  if (bg) S.bg = bg;
  go('studio');
}
