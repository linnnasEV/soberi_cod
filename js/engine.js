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
  'c': { icon: 'flower', cls: 'pick', collect: true, many: 'все цветы' },

  /* Предметы Мастерской. Часть из них можно подобрать (сундук, корона,
     ракушка, зелье) — за ними герой и отправляется в путь; остальное стоит
     на сцене как украшение. */
  't': { icon: 'tree',     cls: 'deco', solid: true },
  'm': { icon: 'car',      cls: 'deco', solid: true },
  'n': { icon: 'fountain', cls: 'deco', solid: true },
  'b': { icon: 'bench',    cls: 'deco', solid: true },
  'r': { icon: 'rocket',   cls: 'deco', solid: true },
  'e': { icon: 'fence',    cls: 'deco', solid: true },
  'q': { icon: 'crab',     cls: 'deco' },
  'u': { icon: 'sun',      cls: 'deco' },
  'o': { icon: 'cloud',    cls: 'deco' },
  'g': { icon: 'grass',    cls: 'deco' },
  'w': { icon: 'moon',     cls: 'deco' },
  'k': { icon: 'crown',  cls: 'pick', collect: true, many: 'короны' },
  'x': { icon: 'chest',  cls: 'pick', collect: true, many: 'сундуки' },
  'l': { icon: 'shell',  cls: 'pick', collect: true, many: 'ракушки' },
  'z': { icon: 'potion', cls: 'pick', collect: true, many: 'зелья' }
};

function isGoal(ch) { return !!(CELLS[ch] && CELLS[ch].goal); }
function isCollect(ch) { return !!(CELLS[ch] && CELLS[ch].collect); }
/* Сквозь дерево, забор и машину не пройти — их обходят или перепрыгивают.
   Солнце, облако и трава не мешают: по ним герой проходит. */
function isSolid(ch) { return ch === '#' || !!(CELLS[ch] && CELLS[ch].solid); }

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

/* Куда приземлится прыжок: на соседнюю клетку, а если там камень или край —
   через неё. Так блок «Прыжок» значит ровно то, что говорит: перепрыгнуть
   препятствие. Вернёт null, если прыгать некуда. */
function jumpTarget(m, pos, dir) {
  const d = COMPASS[dir];
  const free = p => p.r >= 0 && p.c >= 0 && p.r < m.rows && p.c < m.cols && !isSolid(m.grid[p.r][p.c]);
  const one = { r: pos.r + d[0], c: pos.c + d[1] };
  if (free(one)) return one;
  const two = { r: pos.r + d[0] * 2, c: pos.c + d[1] * 2 };
  if (free(two)) return two;
  return null;
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
    if (node.t === 'jump') {
      const to = jumpTarget(m, pos, dir);
      if (to) {
        pos = to;
        if (isCollect(m.grid[pos.r][pos.c])) collected.add(pos.r + ':' + pos.c);
      }
      continue;
    }
    if (node.t === 'take') {
      if (isCollect(m.grid[pos.r][pos.c])) collected.add(pos.r + ':' + pos.c);
      continue;
    }
    const d = stepDir(node.t, dir);
    if (!d) continue;
    const nr = pos.r + d[0], nc = pos.c + d[1];
    if (nr < 0 || nc < 0 || nr >= m.rows || nc >= m.cols) { if (sandbox) continue; crash = 'edge'; break; }
    if (isSolid(m.grid[nr][nc])) { if (sandbox) continue; crash = 'stone'; break; }
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
  const name = heroOf(hero).name;
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
  /* Звук можно выключить в подвале: в классе за двадцатью компьютерами
     двадцать «та-да» одновременно — это не радость, а шум. */
  off() { return DB.settings.sound === false; },

  /* Разблокировка звука первым касанием экрана.
     На телефонах браузер не даёт сайту зазвучать сам по себе: пока человек
     ничего не нажал, звуковой движок спит. На iPhone он так и остаётся
     спящим навсегда, если его не разбудить вручную, — отсюда и жалоба, что
     «звук автоматически выключен». Будим при первом касании, одно на всю
     страницу. */
  unlock() {
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) {}
  },

  tone(freqs, dur = 0.14) {
    if (this.off()) return;
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      // Телефон мог усыпить движок, пока ребёнок читал задание.
      if (this.ctx.state === 'suspended') this.ctx.resume();
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
    this.el.className = 'stage bg-' + bgId(bg) + (rel ? ' rel' : '');
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
    // Фон — не заливка, а нарисованное место: лес, город, пляж. Рисунок лежит
    // под клетками, поэтому предметы и герой остаются читаемыми.
    const art = bgOf(bg).art || '';
    this.el.innerHTML =
      '<div class="scene-art" aria-hidden="true"><svg viewBox="0 0 140 100" preserveAspectRatio="xMidYMid slice">' + art + '</svg></div>' +
      '<div class="cells">' + cells + '</div>' +
      '<div class="actor"><div class="bubble"></div><div class="facing">' + ICONS.facing + '</div>' +
      '<div class="sprite">' + heroOf(hero).icon + '</div></div>';
    this.scale = 1;
    this.hue = 0;
    this.rot = 0;
    this.heroEl = this.el.querySelector('.actor');
    this.sprite = this.el.querySelector('.sprite');
    this.bubble = this.el.querySelector('.bubble');
    this.facingEl = this.el.querySelector('.facing');
    this.reset();
  }

  /* Размер, цвет и поворот героя при перезапуске НЕ сбрасываются: ребёнок
     сделал героя большим — он и остаётся большим, пока не уменьшит его или
     не очистит сцену. Начальные значения задаются в mount(). */
  reset() {
    this.token++;
    this.pos = { ...this.m.start };
    this.collected = new Set();
    this.dir = 0;
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

  get delay() { return 480; }
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

  /* Подобрать то, что лежит на клетке: сундук, корону, ракушку, зелье */
  collect(r, c) {
    if (!isCollect(this.m.grid[r][c]) || this.collected.has(r + ':' + c)) return;
    this.collected.add(r + ':' + c);
    const a = this.el.querySelector('[data-cell="' + r + ':' + c + '"]');
    a && a.classList.add('gone');
    Sound.tone([880], 0.08);
  }

  /* Реплика должна быть видна целиком: у верхнего ряда облачко уходило за край
     сцены, у крайних столбцов — вбок. Разворачиваем его внутрь поля. */
  placeBubble() {
    const b = this.bubble;
    b.className = 'bubble';
    if (this.pos.r === 0) b.classList.add('b-down');
    if (this.pos.c === 0) b.classList.add('b-left');
    else if (this.pos.c === this.m.cols - 1) b.classList.add('b-right');
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
      if (out || isSolid(this.m.grid[nr][nc])) {
        await this.bump(d);
        if (!this.sandbox) return { crash: out ? 'edge' : 'stone' };
        return null;
      }
      this.pos = { r: nr, c: nc };
      this.place();
      // В уроке предметы подбираются по дороге, в Мастерской — только блоком
      // «Собрать»: там это осознанное действие, а не побочный эффект шага.
      if (!this.sandbox) this.collect(nr, nc);
      await this.wait(this.delay);
      return null;
    }

    /* Прыжок должен читаться именно как прыжок: герой взлетает дугой,
       перелетает клетку и мягко приземляется. Раньше он просто перескакивал,
       и ребёнок не понимал, чем это отличается от шага. */
    if (t === 'jump') {
      const to = jumpTarget(this.m, this.pos, this.dir);
      if (!to) { await this.bump(COMPASS[this.dir]); return null; }
      // Подъём сделан переходом, а не ключевыми кадрами: в системе может быть
      // включено «уменьшить движение» (Windows: «Показывать анимацию»), и тогда
      // браузер обрывает любые animation, а герой просто телепортировался.
      // Переходы это не затрагивает, и прыжок виден у всех.
      Sound.tone([560, 820], 0.09);
      this.heroEl.classList.add('jumping');
      this.sprite.classList.add('lift');
      await this.wait(170);
      this.pos = to;
      this.place();
      await this.wait(430);
      this.sprite.classList.remove('lift');
      await this.wait(170);
      this.heroEl.classList.remove('jumping');
      if (!this.sandbox) this.collect(to.r, to.c);
      return null;
    }

    /* «Собрать» — то, ради чего герой шёл: цветок, звезда, сундук, корона,
       ракушка, зелье. На пустой клетке герой разводит руками. */
    if (t === 'take') {
      const here = this.m.grid[this.pos.r][this.pos.c];
      const key = this.pos.r + ':' + this.pos.c;
      if (isCollect(here) && !this.collected.has(key)) {
        this.collect(this.pos.r, this.pos.c);
        Sound.tone([760, 1040], 0.09);
        await this.pulse('wiggle', this.delay);
      } else {
        Sound.oops();
        await this.pulse('wiggle', this.delay * 0.8);
      }
      return null;
    }

    if (t === 'say') {
      const text = node.text || 'Привет!';
      this.bubble.textContent = text;
      this.placeBubble();
      this.bubble.classList.add('show');
      Speech.say(text);        // блок «Сказать» теперь и правда говорит
      await this.wait(1500);
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
      // Три заметных шага в каждую сторону и стоп: больше — герой вылезает
      // за клетку, меньше — его уже не видно. Размер сохраняется до тех пор,
      // пока ребёнок не уменьшит героя или не очистит сцену.
      this.scale = Math.min(1.6, Math.max(0.5, this.scale * (t === 'grow' ? 1.25 : 0.8)));
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
