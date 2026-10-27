/* ===== Мастерская: свободное творчество + галерея работ ===== */

const STUDIO_MAP = { map: ['.......', '.......', '.......', '.S.....', '.......'] };
const ALL_BLOCKS = ['right', 'left', 'up', 'down', 'jump', 'say', 'sound', 'wait', 'repeat'];
const S = { hero: 'cat', bg: 'meadow', program: [], running: false };

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
  }
  renderStudioPickers();
  mountStudioStage();
  renderGallery();
});

function mountStudioStage() {
  S.stage.mount(STUDIO_MAP, { hero: S.hero, bg: S.bg, sandbox: true });
}

function renderStudioPickers() {
  document.getElementById('heroPick').innerHTML = Object.entries(HEROES).map(([id, h]) =>
    '<button class="pick' + (S.hero === id ? ' sel' : '') + '" onclick="S.hero=\'' + id + '\';renderStudioPickers();mountStudioStage()" title="' + h.name + '">' +
    '<span class="pick-ico">' + h.icon + '</span><small>' + h.name + '</small></button>').join('');
  document.getElementById('bgPick').innerHTML = Object.entries(BACKGROUNDS).map(([id, b]) =>
    '<button class="pick' + (S.bg === id ? ' sel' : '') + '" onclick="S.bg=\'' + id + '\';renderStudioPickers();mountStudioStage()">' +
    '<span class="pick-bg bg-' + id + '"></span><small>' + b.name + '</small></button>').join('');
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

function saveProject(title, hero, bg, program) {
  me().projects.unshift({ id: uid(), title, hero, bg, program: JSON.parse(JSON.stringify(program)), date: Date.now() });
  saveDB();
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
  saveProject(t, S.hero, S.bg, S.editor.program);
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
  S.hero = p.hero; S.bg = p.bg;
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
