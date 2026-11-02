/* ===== Мастерская: свободное творчество + галерея работ =====
   Урок проверяет решение, Мастерская не проверяет ничего. Поэтому здесь
   открыты все блоки, все герои и все фоны, а сцену ребёнок собирает сам:
   ставит яблоки, камни и домики и переносит героя куда хочет. */

const STUDIO_ROWS = 5, STUDIO_COLS = 7;
/* Порядок блоков — от самого понятного к самому редкому: сначала шаги,
   потом фокусы, потом управление программой. */
const ALL_BLOCKS = ['right', 'left', 'up', 'down', 'jump', 'spin', 'grow', 'shrink',
                    'color', 'vanish', 'sound', 'say', 'wait', 'repeat'];
const S = { hero: 'cat', bg: 'forest', decor: {}, start: { r: 2, c: 0 }, tool: 'h', program: [], running: false };

/* Мастерская — это и есть главная страница: ребёнок открыл сайт и сразу
   собирает программу, без промежуточных экранов. */
route('home', () => {
  window.currentStage = S.stage = S.stage || new Stage(document.getElementById('studioStage'));
  if (!S.editor) {
    S.editor = new Editor({
      palette: document.getElementById('studioPalette'),
      workspace: document.getElementById('studioWs'),
      counter: document.getElementById('studioCounter'),
      onChange: () => { S.stage.reset(); saveStudioSession(); Tour.onProgram(); }
    });
    restoreStudioSession();
    S.editor.setup({ blocks: ALL_BLOCKS, program: S.program });
    // Клик по клетке ставит выбранный предмет. Слушатель один на всю сцену:
    // mount() каждый раз перерисовывает её содержимое.
    S.stage.el.addEventListener('click', studioCellClick);
  }
  renderStudioPickers();
  mountStudioStage();
  Tour.start();   // галерея рисуется при открытии панели, а не на первом экране
});

/* Старые ссылки на #studio и кнопки «Открыть Мастерскую» ведут на главную */
route('studio', () => go('home'));

/* ===== Сцена живёт, пока открыта вкладка =====
   Ребёнок ушёл в «Уроки» и вернулся — сборка на месте. Закрыл вкладку —
   сцена чистая: это песочница, а не сохранённый профиль. */
const SESSION_KEY = 'sobericod_studio';

function saveStudioSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      hero: S.hero, bg: S.bg, decor: S.decor, start: S.start,
      program: S.editor ? S.editor.program : S.program
    }));
  } catch (e) { /* приватный режим — просто не сохраняем */ }
}

function restoreStudioSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s.hero) S.hero = heroId(s.hero);
    if (s.bg) S.bg = bgId(s.bg);
    if (s.decor) S.decor = s.decor;
    if (s.start) S.start = s.start;
    if (Array.isArray(s.program)) S.program = s.program;
  } catch (e) {}
}

function dropStudioSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
}

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
  fitStage();
}

/* ===== Сцена по размеру окна =====
   На главной мастерская занимает ровно экран, поэтому сцена берёт тот
   остаток, который ей достался, и сохраняет пропорцию 7:5: если по высоте
   влезает больше, чем по ширине, уменьшается высота, а не растягиваются
   клетки. Одной строкой CSS это не выражается — считаем сами. */
function fitStage() {
  const wrap = document.querySelector('#page-home .stage-wrap');
  const st = document.getElementById('studioStage');
  if (!wrap || !st) return;
  if (window.innerWidth < 768) {    // на телефоне ширину задаёт CSS
    st.style.width = ''; st.style.height = '';
    return;
  }
  const w = Math.min(wrap.clientWidth, wrap.clientHeight * STUDIO_COLS / STUDIO_ROWS);
  st.style.width = Math.floor(w) + 'px';
  st.style.height = Math.floor(w * STUDIO_ROWS / STUDIO_COLS) + 'px';
}

window.addEventListener('resize', fitStage);

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
  saveStudioSession();
}

/* ===== Сброс сцены =====
   Без диалога «вы уверены?»: для семилетки лишний вопрос — помеха, а собрать
   заново — часть игры. Но если программа была не из двух блоков, пять секунд
   висит «Отменить»: это защита от случайного нажатия без блокирующего окна. */
function resetScene() {
  const had = S.editor ? countBlocks(S.editor.program) : 0;
  const snapshot = {
    program: JSON.parse(JSON.stringify(S.editor ? S.editor.program : [])),
    decor: Object.assign({}, S.decor),
    start: Object.assign({}, S.start)
  };
  if (S.running) runStudio();            // идущую программу сначала останавливаем
  S.decor = {};
  S.start = { r: 2, c: 0 };
  S.editor.setup({ blocks: ALL_BLOCKS, program: [] });
  mountStudioStage();
  dropStudioSession();
  Sound.tone([440, 330], 0.08);

  sayAloud('Очистила сцену');
  if (had > 3) {
    toast('Сцена очищена.', 'info', { label: 'Отменить', fn: () => undoReset(snapshot) }, 5000);
  } else {
    toast('Сцена очищена — собирай заново!');
  }
}

function undoReset(snapshot) {
  S.decor = snapshot.decor;
  S.start = snapshot.start;
  S.editor.setup({ blocks: ALL_BLOCKS, program: snapshot.program });
  mountStudioStage();
  saveStudioSession();
  toast('Вернули как было.');
}

function renderStudioPickers() {
  document.getElementById('heroPick').innerHTML = Object.entries(HEROES).map(([id, h]) =>
    '<button class="pick' + (S.hero === id ? ' sel' : '') + '" onclick="pickHero(\'' + id + '\')" title="' + h.name + '">' +
    '<span class="pick-ico">' + h.icon + '</span><small>' + h.name + '</small></button>').join('');
  // В кнопке фона показываем сам рисунок, а не цветной квадрат: «Лес» и
  // «Сказка» ребёнок выбирает глазами, а не читая подпись.
  document.getElementById('bgPick').innerHTML = Object.entries(BACKGROUNDS).map(([id, b]) =>
    '<button class="pick' + (S.bg === id ? ' sel' : '') + '" onclick="pickBg(\'' + id + '\')" title="' + b.name + '">' +
    '<span class="pick-bg bg-' + id + '"><svg viewBox="0 0 140 100" preserveAspectRatio="xMidYMid slice">' + b.art + '</svg></span>' +
    '<small>' + b.name + '</small></button>').join('');
  // «Герой» показывает того героя, который выбран сейчас: так понятнее, что
  // этим инструментом переносят именно его.
  document.getElementById('decorPick').innerHTML = DECOR.map(d =>
    '<button class="pick' + (S.tool === d.ch ? ' sel' : '') + '" onclick="pickTool(\'' + d.ch + '\')" title="' + d.name + '">' +
    '<span class="pick-ico">' + (d.ch === 'S' ? HEROES[S.hero].icon : d.icon) + '</span><small>' + d.name + '</small></button>').join('');
}

/* Всё, что ребёнок нажал, проговаривается вслух: подписи читают не все,
   а услышать «Старт» может каждый. Молчим, если звук в классе выключен. */
function sayAloud(text) {
  if (DB.settings.sound === false) return;
  Speech.say(text);
}

const sayPick = sayAloud;

function pickHero(id) {
  S.hero = id; renderStudioPickers(); mountStudioStage(); saveStudioSession();
  sayPick(HEROES[id].name);
}

function pickBg(id) {
  S.bg = id; renderStudioPickers(); mountStudioStage(); saveStudioSession();
  sayPick(BACKGROUNDS[id].name);
}

/* Выбран предмет — дальше нужно нажать на клетку. Это единственный
   неочевидный шаг в Мастерской, поэтому о нём говорим вслух. */
function pickTool(ch) {
  S.tool = ch;
  renderStudioPickers();
  const d = DECOR.find(x => x.ch === ch);
  if (d) sayPick(d.ch === 'S' ? 'Герой. Нажми на клетку' : d.name + '. Нажми на клетку');
}

/* Список предметов на телефоне раскрывается кнопкой «Поставь на сцену»:
   восемь иконок заняли бы первый экран вместо сцены. */
function toggleDecor() {
  const open = document.body.classList.toggle('dec-open');
  const btn = document.getElementById('decBtn');
  if (btn) btn.textContent = open ? '✕ Закрыть детали' : '+ Добавь детали на фон';
  if (open) sayAloud('Выбери деталь и нажми на клетку');
}

/* Галерея работ — панель поверх мастерской: вместе со сценой в один экран
   она не влезает, а нужна не постоянно. */
function toggleGallery() {
  if (document.body.classList.contains('gal-open')) return closeGallery();
  renderGallery();
  document.body.classList.add('gal-open');
}

function closeGallery() {
  document.body.classList.remove('gal-open');
}

/* ===== Пример и озвучка =====
   Первоклассник часто ещё читает по слогам, поэтому объяснение можно
   послушать, а пример — посмотреть в деле: три блока, запуск, герой пошёл. */
function showExample() {
  Tour.example();
}

/* Галерея и список предметов открываются и голосом тоже */
function openGalleryBtn() {
  sayAloud('Галерея работ');
  toggleGallery();
}

/* Шторка с блоками на телефоне */
function toggleSheet() {
  const open = document.body.classList.toggle('sheet-open');
  const b = document.getElementById('sheetBtn');
  if (b) b.textContent = open ? '✕ Закрыть' : '🧩 Блоки';
}

async function runStudio() {
  Tour.onRun();
  const btn = document.getElementById('studioRun');
  if (S.running) {
    S.stage.stop(); S.stage.reset(); S.editor.setLocked(false); S.editor.clearHighlight();
    S.running = false; btn.innerHTML = '▶ Старт'; btn.classList.remove('btn-stop');
    sayAloud('Стоп');
    return;
  }
  if (!S.editor.program.length) {
    sayAloud('Сначала добавь блоки');
    return toast('Добавь блоки — и герой оживёт!', 'warn');
  }
  sayAloud('Старт');
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
/* Истории с целью: герой идёт куда-то и за чем-то. Случайный набор блоков
   ребёнку ничего не объясняет, а «иду за сундуком — дошёл — радуюсь» он
   понимает сразу и начинает переделывать под себя. */
const SURPRISE = [
  { goal: 'x', go: 'Иду за сундуком!',  done: 'Нашёл сокровище!' },
  { goal: 'k', go: 'Где моя корона?',   done: 'Я нашёл корону!' },
  { goal: '*', go: 'Хочу эту звезду!',  done: 'Поймал звезду!' },
  { goal: 'l', go: 'Поищу ракушку',     done: 'Какая красивая!' },
  { goal: 'z', go: 'Нужно волшебное зелье', done: 'Теперь колдую!' },
  { goal: 'h', go: 'Пора домой',        done: 'Я дома!' }
];

/* Чем украшаем сцену вокруг дороги героя */
const PROPS = ['t', 'c', 'g', 'o', 'u', 'b', 'n', 'e', 'm', '#'];

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function surpriseStudio() {
  const idea = pickRandom(SURPRISE);
  S.hero = pickRandom(Object.keys(HEROES));
  S.bg = pickRandom(Object.keys(BACKGROUNDS));

  const row = 1 + Math.floor(Math.random() * (STUDIO_ROWS - 2));   // не у самого края
  const steps = 3 + Math.floor(Math.random() * 3);                 // 3–5 шагов вправо
  const turn = Math.random() < 0.6 ? (Math.random() < 0.5 ? -1 : 1) : 0;
  const goal = { r: row + turn, c: steps };

  S.start = { r: row, c: 0 };
  S.decor = {};
  S.decor[goal.r + ':' + goal.c] = idea.goal;

  // дорогу героя не загораживаем: программа должна дойти до цели
  const path = new Set([goal.r + ':' + goal.c]);
  for (let c = 0; c <= steps; c++) path.add(row + ':' + c);
  for (let i = 0; i < 5; i++) {
    const r = Math.floor(Math.random() * STUDIO_ROWS), c = Math.floor(Math.random() * STUDIO_COLS);
    const key = r + ':' + c;
    if (path.has(key) || S.decor[key]) continue;
    S.decor[key] = pickRandom(PROPS);
  }

  const prog = [{ t: 'say', text: idea.go }, { t: 'repeat', n: steps, body: [{ t: 'right' }] }];
  if (turn) prog.push({ t: turn < 0 ? 'up' : 'down' });
  prog.push({ t: 'say', text: idea.done }, { t: 'sound' }, { t: 'spin' });

  S.editor.setup({ blocks: ALL_BLOCKS, program: prog });
  renderStudioPickers();
  mountStudioStage();
  saveStudioSession();
  sayAloud('Вот история. Нажми Старт');
  toast('Вот история! Нажми «Старт», а потом меняй её как хочешь.');
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

/* Сохранение без вопросов: придумывать название семилетке долго и скучно,
   поэтому работа сама называется по герою и месту — «Котик · Лес». */
function askSaveStudio() {
  if (!S.editor.program.length) return toast('Сначала собери программу из блоков 🙂', 'warn');
  const title = heroOf(S.hero).name + ' · ' + bgOf(S.bg).name;
  saveProject(title, S.hero, S.bg, S.editor.program, S.decor, S.start);
  sayAloud('Сохранила в галерею');
  toast('Сохранено в галерею: «' + title + '»');
  if (document.body.classList.contains('gal-open')) renderGallery();
}

function projectCard(p, author, own) {
  return '<article class="proj-card">' +
    '<div class="proj-preview bg-' + bgId(p.bg) + '">' +
    '<svg class="pp-art" viewBox="0 0 140 100" preserveAspectRatio="xMidYMid slice">' + bgOf(p.bg).art + '</svg>' +
    '<span>' + heroOf(p.hero).icon + '</span></div>' +
    '<div class="proj-info"><h4>' + esc(p.title) + '</h4><div class="author">' + esc(author) + ' · ' + countBlocks(p.program) + ' блоков</div>' +
    '<div class="proj-actions"><button class="btn btn-primary btn-sm" onclick="openProject(\'' + p.id + '\')">Открыть</button>' +
    (own ? '<button class="btn btn-ghost btn-sm" onclick="deleteProject(\'' + p.id + '\')" aria-label="Удалить">Удалить</button>' : '') +
    '</div></div></article>';
}

/* В галерее только то, что сделали сами: чужие примеры ребёнок пролистывал,
   а свою работу искал глазами среди них. */
function allVisibleProjects() {
  const mine = me().projects.map(p => ({ p, author: 'Я', own: true }));
  const cls = currentClass();
  const classmates = [];
  if (cls) Object.values(cls.students).forEach(st => {
    if (st !== me()) st.projects.forEach(p => classmates.push({ p, author: st.name, own: false }));
  });
  return { mine, classmates };
}

function renderGallery() {
  const { mine, classmates } = allVisibleProjects();
  const block = (title, arr, empty) => '<h3 class="gal-title">' + title + '</h3>' +
    (arr.length ? '<div class="gallery-grid">' + arr.map(x => projectCard(x.p, x.author, x.own)).join('') + '</div>'
                : '<p class="muted">' + empty + '</p>');
  document.getElementById('galleryArea').innerHTML =
    block('Мои работы', mine, 'Пока пусто. Собери программу и нажми «Сохранить».') +
    (currentClass() ? block('Работы моего класса', classmates, 'Одноклассники ещё ничего не сохранили.') : '');
}

function findProject(id) {
  const { mine, classmates } = allVisibleProjects();
  const x = [...mine, ...classmates].find(x => x.p.id === id);
  return x && x.p;
}

function openProject(id) {
  const p = findProject(id);
  if (!p) return;
  closeGallery();
  S.hero = heroId(p.hero); S.bg = bgId(p.bg);
  // Работы, сохранённые до появления декораций, открываются на пустой сцене
  S.decor = Object.assign({}, p.decor);
  S.start = Object.assign({ r: 3, c: 1 }, p.start);
  S.editor.setup({ blocks: ALL_BLOCKS, program: p.program });
  renderStudioPickers();
  mountStudioStage();
  saveStudioSession();
  document.getElementById('studioTop').scrollIntoView({ behavior: 'smooth' });
  setTimeout(runStudio, 500);
}

/* Удаление спрашивает: работа — это полчаса труда, и случайное нажатие
   не должно её стирать. */
function deleteProject(id) {
  const w = findProject(id);
  if (!w) return;
  openModal('<h2>Удалить работу?</h2>' +
    '<p class="sub">«' + esc(w.title) + '» исчезнет насовсем. Вернуть не получится.</p>' +
    '<div class="modal-actions"><button class="btn btn-primary" onclick="closeModal()">Оставить</button>' +
    '<button class="btn btn-danger" onclick="doDeleteProject(\'' + id + '\')">Удалить</button></div>');
}

function doDeleteProject(id) {
  const p = me();
  p.projects = p.projects.filter(x => x.id !== id);
  saveDB();
  closeModal();
  renderGallery();
  toast('Работа удалена.');
}

/* Ссылки «Открыть Мастерскую» из других разделов ведут на главную */
function openStudioWith(hero, bg) {
  if (hero) S.hero = hero;
  if (bg) S.bg = bg;
  go('home');
}
