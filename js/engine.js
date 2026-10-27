/* ===== Движок: карта, выполнение программы, анимация сцены ===== */

const DIRS = { right: [0, 1], left: [0, -1], up: [-1, 0], down: [1, 0] };

function parseMap(map) {
  let start = { r: 0, c: 0 };
  const grid = map.map((row, r) => [...row].map((ch, c) => {
    if (ch === 'S') { start = { r, c }; return '.'; }
    return ch;
  }));
  return { rows: grid.length, cols: grid[0].length, grid, start };
}

/* Разворачивает повторы в плоский список шагов */
function flatten(prog, out = [], parent = null) {
  for (const node of prog) {
    if (node.t === 'repeat') {
      for (let i = 0; i < node.n; i++) flatten(node.body, out, node);
    } else out.push({ node, parent });
  }
  return out;
}

function countBlocks(prog) {
  return prog.reduce((s, n) => s + 1 + (n.t === 'repeat' ? countBlocks(n.body) : 0), 0);
}

function usedTypes(prog, set = new Set()) {
  prog.forEach(n => { set.add(n.t); if (n.t === 'repeat') usedTypes(n.body, set); });
  return set;
}

/* Чистая проверка без анимации — для проверки решения и тестов.
   sandbox: в Мастерской край и камни не останавливают программу. */
function simulate(level, prog, sandbox = false) {
  const m = parseMap(level.map);
  let pos = { ...m.start };
  const collected = new Set();
  let crash = null;
  for (const { node } of flatten(prog)) {
    const d = DIRS[node.t];
    if (!d) continue;
    const nr = pos.r + d[0], nc = pos.c + d[1];
    if (nr < 0 || nc < 0 || nr >= m.rows || nc >= m.cols) { if (sandbox) continue; crash = 'edge'; break; }
    if (m.grid[nr][nc] === '#') { if (sandbox) continue; crash = 'stone'; break; }
    pos = { r: nr, c: nc };
    if (m.grid[nr][nc] === 'a') collected.add(nr + ':' + nc);
  }
  const apples = m.grid.flat().filter(ch => ch === 'a').length;
  const hasGoal = m.grid.flat().includes('*');
  return { pos, crash, applesLeft: apples - collected.size, hasGoal, onGoal: hasGoal && m.grid[pos.r][pos.c] === '*' };
}

/* Итоговая проверка урока: возвращает {ok, msg} */
function checkLesson(lesson, prog, hero) {
  const name = HEROES[hero].name;
  if (prog.length === 0) return { ok: false, msg: 'Программа пустая. Добавь блоки!' };
  const res = simulate(lesson, prog);
  if (res.crash === 'stone') return { ok: false, msg: 'Ой, камень! ' + name + ' не может пройти сквозь камни.' };
  if (res.crash === 'edge') return { ok: false, msg: name + ' дошёл до края поля. Дальше идти некуда.' };
  if (lesson.free) {
    if (countBlocks(prog) < lesson.free.minBlocks) return { ok: false, msg: 'Добавь ещё блоков: нужно хотя бы ' + lesson.free.minBlocks + '.' };
    if (usedTypes(prog).size < lesson.free.minTypes) return { ok: false, msg: 'Используй хотя бы ' + lesson.free.minTypes + ' разных блока.' };
    return { ok: true };
  }
  if (res.applesLeft > 0) return { ok: false, msg: 'Собери все яблоки по дороге!' };
  if (res.hasGoal && !res.onGoal) return { ok: false, msg: name + ' не дошёл до звёздочки. Посмотри, где он остановился.' };
  if (lesson.mustUse) {
    const used = usedTypes(prog);
    const miss = lesson.mustUse.find(t => !used.has(t));
    if (miss) return { ok: false, msg: 'Используй блок «' + BLOCKS[miss].label + '».' };
  }
  return { ok: true };
}

function starsFor(lesson, prog) {
  if (!lesson.solution) return 3;
  const best = countBlocks(lesson.solution), mine = countBlocks(prog);
  if (mine <= best) return 3;
  if (mine <= best + 2) return 2;
  return 1;
}

/* ===== Звук без файлов: синтез через Web Audio ===== */
const Sound = {
  ctx: null,
  tone(freqs, dur = 0.14) {
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = this.ctx.currentTime;
      freqs.forEach((f, i) => {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = f;
        const t = t0 + i * dur;
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.95);
        o.connect(g); g.connect(this.ctx.destination);
        o.start(t); o.stop(t + dur);
      });
    } catch (e) {}
  },
  note() { this.tone([660, 880]); },
  win() { this.tone([523, 659, 784, 1047], 0.12); },
  oops() { this.tone([330, 247], 0.16); }
};

/* ===== Сцена ===== */
class Stage {
  constructor(el) { this.el = el; this.token = 0; }

  mount(level, { hero = 'cat', bg = 'meadow', sandbox = false } = {}) {
    this.level = level; this.hero = hero; this.bg = bg; this.sandbox = sandbox;
    this.m = parseMap(level.map);
    const { rows, cols, grid } = this.m;
    this.el.className = 'stage bg-' + bg;
    this.el.style.setProperty('--cols', cols);
    this.el.style.setProperty('--rows', rows);
    let cells = '';
    grid.forEach((row, r) => row.forEach((ch, c) => {
      const item = ch === '#' ? ICONS.stone : ch === '*' ? ICONS.star : ch === 'a' ? ICONS.apple : '';
      const cls = ch === '#' ? 'stone' : ch === '*' ? 'goal' : ch === 'a' ? 'apple' : '';
      cells += '<div class="cell"><div class="item ' + cls + '" data-cell="' + r + ':' + c + '">' + item + '</div></div>';
    }));
    this.el.innerHTML = '<div class="cells">' + cells + '</div>' +
      '<div class="actor"><div class="bubble"></div><div class="sprite">' + HEROES[hero].icon + '</div></div>';
    this.heroEl = this.el.querySelector('.actor');
    this.sprite = this.el.querySelector('.sprite');
    this.bubble = this.el.querySelector('.bubble');
    this.reset();
  }

  reset() {
    this.token++;
    this.pos = { ...this.m.start };
    this.collected = new Set();
    this.facing = 1;
    this.heroEl.classList.add('no-anim');
    this.place();
    void this.heroEl.offsetWidth;
    this.heroEl.classList.remove('no-anim');
    this.sprite.className = 'sprite';
    this.sprite.firstElementChild.style.transform = '';
    this.bubble.classList.remove('show');
    this.el.querySelectorAll('.item.apple').forEach(a => a.classList.remove('gone'));
    this.el.classList.remove('won');
  }

  place() {
    this.heroEl.style.setProperty('--r', this.pos.r);
    this.heroEl.style.setProperty('--c', this.pos.c);
  }

  get delay() { return document.body.classList.contains('lite') ? 260 : 480; }
  wait(ms) { return new Promise(res => setTimeout(res, ms)); }

  async bump(d) {
    this.sprite.style.setProperty('--dx', d[1]);
    this.sprite.style.setProperty('--dy', d[0]);
    this.sprite.classList.remove('bump'); void this.sprite.offsetWidth;
    this.sprite.classList.add('bump');
    Sound.oops();
    await this.wait(this.delay);
  }

  /* Выполняет программу с анимацией. onStep(node, parent) — подсветка блока. */
  async run(prog, onStep) {
    this.reset();
    const my = this.token;
    await this.wait(120);
    for (const { node, parent } of flatten(prog)) {
      if (my !== this.token) return { aborted: true };
      onStep && onStep(node, parent);
      const d = DIRS[node.t];
      if (d) {
        if (node.t === 'left') this.facing = -1;
        if (node.t === 'right') this.facing = 1;
        this.sprite.firstElementChild.style.transform = 'scaleX(' + this.facing + ')';
        const nr = this.pos.r + d[0], nc = this.pos.c + d[1];
        const out = nr < 0 || nc < 0 || nr >= this.m.rows || nc >= this.m.cols;
        if (out || this.m.grid[nr][nc] === '#') {
          await this.bump(d);
          if (!this.sandbox) return { crash: out ? 'edge' : 'stone' };
          continue;
        }
        this.pos = { r: nr, c: nc };
        this.place();
        if (this.m.grid[nr][nc] === 'a' && !this.collected.has(nr + ':' + nc)) {
          this.collected.add(nr + ':' + nc);
          const a = this.el.querySelector('[data-cell="' + nr + ':' + nc + '"]');
          a && a.classList.add('gone');
          Sound.tone([880], 0.08);
        }
        await this.wait(this.delay);
      } else if (node.t === 'jump') {
        this.sprite.classList.remove('hop'); void this.sprite.offsetWidth;
        this.sprite.classList.add('hop');
        await this.wait(this.delay + 100);
      } else if (node.t === 'say') {
        this.bubble.textContent = node.text || 'Привет!';
        this.bubble.classList.add('show');
        await this.wait(1300);
        this.bubble.classList.remove('show');
        await this.wait(150);
      } else if (node.t === 'sound') {
        Sound.note();
        this.sprite.classList.remove('wiggle'); void this.sprite.offsetWidth;
        this.sprite.classList.add('wiggle');
        await this.wait(this.delay);
      } else if (node.t === 'wait') {
        await this.wait(1000);
      }
    }
    if (my !== this.token) return { aborted: true };
    return { crash: null };
  }

  celebrate() { this.el.classList.add('won'); }
  stop() { this.token++; }
}
