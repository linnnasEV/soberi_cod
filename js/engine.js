/* ===== Движок: карта, выполнение программы, анимация сцены ===== */

const DIRS = { right: [0, 1], left: [0, -1], up: [-1, 0], down: [1, 0] };

/* Стороны по кругу для относительных команд «вперёд» и «поворот».
   Порядок важен: поворот направо — это следующий элемент, налево — предыдущий. */
const COMPASS = [[0, 1], [1, 0], [0, -1], [-1, 0]];

/* Что может лежать на клетке.
   goal — до этого надо дойти, collect — это надо собрать по дороге.
   В младших уроках цель не абстрактная звезда, а домик или рыбка: шестилетке
   понятнее «отведи котика домой», чем «дойди до цели». */
const CELLS = {
  '#': { icon: 'stone',  cls: 'stone' },
  '*': { icon: 'star',   cls: 'goal', goal: true },
  'h': { icon: 'home',   cls: 'goal', goal: true },
  'f': { icon: 'fish',   cls: 'goal', goal: true },
  'a': { icon: 'apple',  cls: 'pick', collect: true, many: 'все яблоки' },
  'c': { icon: 'flower', cls: 'pick', collect: true, many: 'все цветы' }
};

function isGoal(ch) { return !!(CELLS[ch] && CELLS[ch].goal); }
function isCollect(ch) { return !!(CELLS[ch] && CELLS[ch].collect); }

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

/* Куда шагнёт герой: стрелки задают сторону сами, «вперёд» — туда, куда он смотрит */
function stepDir(type, dir) {
  return type === 'forward' ? COMPASS[dir] : DIRS[type];
}

function turned(type, dir) {
  if (type === 'turnRight') return (dir + 1) % 4;
  if (type === 'turnLeft') return (dir + 3) % 4;
  return dir;
}

/* Чистая проверка без анимации — для проверки решения и тестов.
   sandbox: в Мастерской край и камни не останавливают программу. */
function simulate(level, prog, sandbox = false) {
  const m = parseMap(level.map);
  let pos = { ...m.start };
  let dir = 0;
  const collected = new Set();
  let crash = null;
  for (const { node } of flatten(prog)) {
    if (node.t === 'turnLeft' || node.t === 'turnRight') { dir = turned(node.t, dir); continue; }
    const d = stepDir(node.t, dir);
    if (!d) continue;
    const nr = pos.r + d[0], nc = pos.c + d[1];
    if (nr < 0 || nc < 0 || nr >= m.rows || nc >= m.cols) { if (sandbox) continue; crash = 'edge'; break; }
    if (m.grid[nr][nc] === '#') { if (sandbox) continue; crash = 'stone'; break; }
    pos = { r: nr, c: nc };
    if (isCollect(m.grid[nr][nc])) collected.add(nr + ':' + nc);
  }
  const flat = m.grid.flat();
  const total = flat.filter(isCollect).length;
  const hasGoal = flat.some(isGoal);
  return {
    pos, crash, left: total - collected.size, hasGoal,
    onGoal: hasGoal && isGoal(m.grid[pos.r][pos.c]),
    pickWord: (CELLS[flat.find(isCollect)] || {}).many || 'всё'
  };
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
  if (res.left > 0) return { ok: false, msg: 'Собери ' + res.pickWord + ' по дороге!' };
  if (res.hasGoal && !res.onGoal) return { ok: false, msg: name + ' не дошёл до цели. Посмотри, где он остановился.' };
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

  /* rel: показать, куда смотрит герой. Нужно только там, где есть «вперёд»
     и повороты: без стрелки ребёнок не понимает, почему герой пошёл вбок. */
  mount(level, { hero = 'cat', bg = 'meadow', sandbox = false, rel = false } = {}) {
    this.level = level; this.hero = hero; this.bg = bg; this.sandbox = sandbox;
    this.m = parseMap(level.map);
    const { rows, cols, grid } = this.m;
    this.el.className = 'stage bg-' + bg + (rel ? ' rel' : '');
    this.el.style.setProperty('--cols', cols);
    this.el.style.setProperty('--rows', rows);
    this.el.style.aspectRatio = cols + ' / ' + rows;
    let cells = '';
    grid.forEach((row, r) => row.forEach((ch, c) => {
      const def = CELLS[ch];
      const item = def ? ICONS[def.icon] : '';
      const cls = def ? def.cls : '';
      cells += '<div class="cell"><div class="item ' + cls + '" data-cell="' + r + ':' + c + '">' + item + '</div></div>';
    }));
    this.el.innerHTML = '<div class="cells">' + cells + '</div>' +
      '<div class="actor"><div class="bubble"></div><div class="facing">' + ICONS.facing + '</div>' +
      '<div class="sprite">' + HEROES[hero].icon + '</div></div>';
    this.heroEl = this.el.querySelector('.actor');
    this.sprite = this.el.querySelector('.sprite');
    this.bubble = this.el.querySelector('.bubble');
    this.facingEl = this.el.querySelector('.facing');
    this.reset();
  }

  reset() {
    this.token++;
    this.pos = { ...this.m.start };
    this.collected = new Set();
    this.dir = 0;
    this.scale = 1;
    this.hue = 0;
    this.rot = 0;
    this.heroEl.classList.add('no-anim');
    this.place();
    void this.heroEl.offsetWidth;
    this.heroEl.classList.remove('no-anim');
    this.sprite.className = 'sprite';
    this.applyLook();
    this.bubble.classList.remove('show');
    this.el.querySelectorAll('.item.pick').forEach(a => a.classList.remove('gone'));
    this.el.classList.remove('won');
  }

  place() {
    this.heroEl.style.setProperty('--r', this.pos.r);
    this.heroEl.style.setProperty('--c', this.pos.c);
  }

  /* Внешний вид героя: разворот, размер и цвет живут в CSS-переменных,
     чтобы не затирать друг друга при наложении нескольких блоков. */
  applyLook() {
    this.sprite.style.setProperty('--flip', this.dir === 2 ? -1 : 1);
    this.sprite.style.setProperty('--sc', this.scale);
    this.sprite.style.setProperty('--rot', this.rot + 'deg');
    this.sprite.style.filter = this.hue ? 'hue-rotate(' + this.hue + 'deg)' : '';
    this.sprite.style.opacity = '';
    if (this.facingEl) this.facingEl.style.setProperty('--deg', this.dir * 90);
  }

  get delay() { return document.body.classList.contains('lite') ? 260 : 480; }
  wait(ms) { return new Promise(res => setTimeout(res, ms)); }

  /* Проигрывает одноразовую CSS-анимацию: класс снимается и ставится заново,
     иначе второй подряд одинаковый блок не сработает. */
  async pulse(cls, ms) {
    this.sprite.classList.remove(cls);
    void this.sprite.offsetWidth;
    this.sprite.classList.add(cls);
    await this.wait(ms);
    this.sprite.classList.remove(cls);
  }

  async bump(d) {
    this.sprite.style.setProperty('--dx', d[1]);
    this.sprite.style.setProperty('--dy', d[0]);
    Sound.oops();
    await this.pulse('bump', this.delay);
  }

  /* Выполняет программу с анимацией. onStep(node, parent) — подсветка блока. */
  async run(prog, onStep) {
    this.reset();
    const my = this.token;
    await this.wait(120);
    for (const { node, parent } of flatten(prog)) {
      if (my !== this.token) return { aborted: true };
      onStep && onStep(node, parent);
      const res = await this.step(node);
      if (my !== this.token) return { aborted: true };
      if (res) return res;
    }
    return { crash: null };
  }

  async step(node) {
    const t = node.t;

    if (t === 'turnLeft' || t === 'turnRight') {
      this.dir = turned(t, this.dir);
      this.applyLook();
      Sound.tone([520], 0.07);
      await this.wait(this.delay * 0.7);
      return null;
    }

    const d = stepDir(t, this.dir);
    if (d) {
      if (t === 'left') this.dir = 2;
      if (t === 'right') this.dir = 0;
      if (t === 'up') this.dir = 3;
      if (t === 'down') this.dir = 1;
      this.applyLook();
      const nr = this.pos.r + d[0], nc = this.pos.c + d[1];
      const out = nr < 0 || nc < 0 || nr >= this.m.rows || nc >= this.m.cols;
      if (out || this.m.grid[nr][nc] === '#') {
        await this.bump(d);
        if (!this.sandbox) return { crash: out ? 'edge' : 'stone' };
        return null;
      }
      this.pos = { r: nr, c: nc };
      this.place();
      if (isCollect(this.m.grid[nr][nc]) && !this.collected.has(nr + ':' + nc)) {
        this.collected.add(nr + ':' + nc);
        const a = this.el.querySelector('[data-cell="' + nr + ':' + nc + '"]');
        a && a.classList.add('gone');
        Sound.tone([880], 0.08);
      }
      await this.wait(this.delay);
      return null;
    }

    if (t === 'jump') { await this.pulse('hop', this.delay + 100); return null; }

    if (t === 'say') {
      this.bubble.textContent = node.text || 'Привет!';
      this.bubble.classList.add('show');
      await this.wait(1300);
      this.bubble.classList.remove('show');
      await this.wait(150);
      return null;
    }

    if (t === 'sound') {
      Sound.note();
      await this.pulse('wiggle', this.delay);
      return null;
    }

    if (t === 'wait') { await this.wait(1000); return null; }

    /* ===== Блоки анимации: для старшего трека ===== */
    /* Поворот и исчезновение сделаны переходами, а не ключевыми кадрами:
       в облегчённом режиме анимации выключены глобально, и ребёнок бы нажал
       блок, а на экране ничего не произошло. Переходы там продолжают работать. */
    if (t === 'spin') {
      this.rot += 360;
      this.applyLook();
      Sound.tone([700, 900], 0.08);
      await this.wait(this.delay + 120);
      return null;
    }

    if (t === 'grow' || t === 'shrink') {
      // пределы, чтобы герой не исчез совсем и не вылез за клетку
      this.scale = Math.min(1.8, Math.max(0.4, this.scale * (t === 'grow' ? 1.35 : 0.74)));
      this.applyLook();
      Sound.tone([t === 'grow' ? 760 : 400], 0.1);
      await this.wait(this.delay);
      return null;
    }

    if (t === 'color') {
      this.hue = (this.hue + 72) % 360;
      this.applyLook();
      Sound.tone([620, 780], 0.07);
      await this.wait(this.delay);
      return null;
    }

    if (t === 'vanish') {
      Sound.tone([500, 300], 0.1);
      this.sprite.style.opacity = '0';
      await this.wait(this.delay * 0.9);
      this.sprite.style.opacity = '1';
      await this.wait(this.delay * 0.6);
      return null;
    }

    return null;
  }

  celebrate() { this.el.classList.add('won'); }
  stop() { this.token++; }
}
