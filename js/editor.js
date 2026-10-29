/* ===== Редактор блоков =====
   Блок добавляется кликом (удобно на телефоне и для малышей) или перетаскиванием.
   Курсор показывает, куда встанет следующий блок: нажми на блок в программе —
   новый встанет сразу после него. Так можно исправлять ошибки в середине программы. */

class Editor {
  constructor({ palette, workspace, counter, onChange }) {
    this.paletteEl = palette;
    this.wsEl = workspace;
    this.counterEl = counter;
    this.onChange = onChange || (() => {});
    this.locked = false;
    this.wsEl.addEventListener('click', e => {
      if (e.target === this.wsEl || e.target.classList.contains('ws-main')) this.cursorToEnd();
    });
    this.wsEl.addEventListener('dragover', e => { e.preventDefault(); this.wsEl.classList.add('over'); });
    this.wsEl.addEventListener('dragleave', () => this.wsEl.classList.remove('over'));
    this.wsEl.addEventListener('drop', e => {
      e.preventDefault();
      this.wsEl.classList.remove('over');
      const type = e.dataTransfer.getData('text/plain');
      if (!BLOCKS[type]) return;
      const body = e.target.closest('.rep-body');
      if (body) {
        const rep = this.nodeOf.get(body.closest('.wblock'));
        if (rep) this.cursor = { list: rep.body, idx: rep.body.length, rep };
      } else this.cursorToEnd(false);
      this.add(type);
    });
  }

  setup({ blocks, maxBlocks = null, program = [], nested = false }) {
    this.blocks = blocks;
    this.maxBlocks = maxBlocks;
    this.nested = nested;
    this.program = JSON.parse(JSON.stringify(program));
    this.cursorToEnd(false);
    this.renderPalette();
    this.render();
  }

  cursorToEnd(render = true) {
    this.cursor = { list: this.program, idx: this.program.length, rep: null };
    if (render) this.render();
  }

  renderPalette() {
    this.paletteEl.innerHTML = '';
    this.blocks.forEach(type => {
      const b = BLOCKS[type];
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'pblock ' + b.cls;
      el.dataset.type = type;
      el.draggable = true;
      el.title = b.label;
      el.innerHTML = '<span class="bi">' + ICONS[type] + '</span><span class="bl">' + b.label + '</span>';
      el.addEventListener('click', () => this.add(type));
      el.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', type));
      this.paletteEl.appendChild(el);
    });
  }

  add(type) {
    if (this.locked) return;
    if (this.maxBlocks && countBlocks(this.program) >= this.maxBlocks) {
      toast('В этом уровне можно взять не больше ' + this.maxBlocks + ' блоков. Попробуй «Повтор»!', 'warn');
      this.counterEl && this.counterEl.classList.add('shake');
      setTimeout(() => this.counterEl && this.counterEl.classList.remove('shake'), 500);
      return;
    }
    const node = { t: type };
    if (type === 'say') node.text = 'Привет!';
    if (type === 'repeat') { node.n = 2; node.body = []; }

    let { list, idx, rep } = this.cursor;
    if (type === 'repeat' && rep && !this.nested) {
      // повтор внутри повтора не нужен детям младшей школы — ставим следом.
      // В курсах старшего трека вложение разрешено флагом nested.
      list = this.program;
      idx = this.program.indexOf(rep) + 1;
    }
    list.splice(idx, 0, node);
    this.cursor = type === 'repeat'
      ? { list: node.body, idx: 0, rep: node }
      : { list, idx: idx + 1, rep: list === this.program ? null : rep };
    this.render();
    this.onChange();
  }

  remove(node, list) {
    if (this.locked) return;
    list.splice(list.indexOf(node), 1);
    this.cursorToEnd(false);
    this.render();
    this.onChange();
  }

  clear() {
    if (this.locked) return;
    this.program.length = 0;
    this.cursorToEnd();
    this.onChange();
  }

  render() {
    this.nodeOf = new WeakMap();
    this.elOf = new Map();
    const main = document.createElement('div');
    main.className = 'ws-main';
    this.renderList(this.program, main, null);
    this.wsEl.innerHTML = '';
    if (this.program.length === 0) {
      main.insertAdjacentHTML('afterbegin', '<div class="empty-hint">Нажми на блок сверху, и он появится здесь</div>');
    }
    this.wsEl.appendChild(main);
    this.updateCounter();
  }

  renderList(list, container, rep) {
    list.forEach((node, i) => {
      if (this.cursor.list === list && this.cursor.idx === i) container.appendChild(this.cursorEl());
      container.appendChild(this.blockEl(node, list, rep, i));
    });
    if (this.cursor.list === list && this.cursor.idx === list.length) container.appendChild(this.cursorEl());
  }

  cursorEl() {
    const c = document.createElement('span');
    c.className = 'ws-cursor';
    c.setAttribute('aria-hidden', 'true');
    return c;
  }

  blockEl(node, list, rep, i) {
    const b = BLOCKS[node.t];
    const el = document.createElement('div');
    el.className = 'wblock ' + b.cls + (node.t === 'repeat' ? ' rep' : '') + (node.t === 'say' ? ' say' : '');
    this.nodeOf.set(el, node);
    this.elOf.set(node, el);

    if (node.t === 'repeat') {
      el.innerHTML =
        '<div class="rep-head"><span class="bi">' + ICONS.repeat + '</span>' +
        '<button type="button" class="rep-n" title="Сколько раз повторить">×' + node.n + '</button>' +
        '<button type="button" class="rm" aria-label="Убрать блок">×</button></div>' +
        '<div class="rep-body"></div>';
      const body = el.querySelector('.rep-body');
      this.renderList(node.body, body, node);
      if (node.body.length === 0) body.insertAdjacentHTML('afterbegin', '<span class="rep-empty">положи блоки сюда</span>');
      if (this.cursor.rep === node) el.classList.add('is-target');
      el.querySelector('.rep-n').onclick = e => {
        e.stopPropagation();
        if (this.locked) return;
        node.n = node.n >= 9 ? 2 : node.n + 1;
        e.target.textContent = '×' + node.n;
        this.onChange();
      };
      body.onclick = e => {
        if (e.target === body || e.target.classList.contains('rep-empty')) {
          e.stopPropagation();
          this.cursor = { list: node.body, idx: node.body.length, rep: node };
          this.render();
        }
      };
      el.querySelector('.rep-head').onclick = e => {
        if (e.target.closest('button')) return;
        e.stopPropagation();
        this.cursor = { list: this.program, idx: this.program.indexOf(node) + 1, rep: null };
        this.render();
      };
    } else {
      const label = node.t === 'say'
        ? '<input class="say-input" maxlength="24" value="' + esc(node.text) + '" aria-label="Что сказать">'
        : '<span class="bl">' + b.label + '</span>';
      el.innerHTML = '<span class="bi">' + ICONS[node.t] + '</span>' + label +
        '<button type="button" class="rm" aria-label="Убрать блок">×</button>';
      if (node.t === 'say') {
        const inp = el.querySelector('input');
        const fit = () => { inp.style.width = Math.max(56, inp.value.length * 7.5 + 14) + 'px'; };
        fit();
        inp.oninput = () => { node.text = inp.value; fit(); this.onChange(); };
        inp.onclick = e => e.stopPropagation();
      }
      el.onclick = e => {
        if (e.target.closest('button') || e.target.tagName === 'INPUT') return;
        e.stopPropagation();
        this.cursor = { list, idx: i + 1, rep };
        this.render();
      };
    }
    el.querySelector('.rm').onclick = e => { e.stopPropagation(); this.remove(node, list); };
    return el;
  }

  updateCounter() {
    if (!this.counterEl) return;
    const n = countBlocks(this.program);
    this.counterEl.innerHTML = this.maxBlocks
      ? 'Блоков: <b>' + n + '</b> из ' + this.maxBlocks
      : 'Блоков: <b>' + n + '</b>';
    this.counterEl.classList.toggle('full', !!this.maxBlocks && n >= this.maxBlocks);
  }

  setLocked(v) {
    this.locked = v;
    this.wsEl.classList.toggle('locked', v);
    this.paletteEl.classList.toggle('locked', v);
  }

  highlight(node, parent) {
    this.clearHighlight();
    const el = this.elOf.get(node);
    el && el.classList.add('running');
    const pel = parent && this.elOf.get(parent);
    pel && pel.classList.add('running-rep');
  }

  clearHighlight() {
    this.wsEl.querySelectorAll('.running,.running-rep,.wrong').forEach(e => e.classList.remove('running', 'running-rep', 'wrong'));
    this.paletteEl.querySelectorAll('.pulse').forEach(e => e.classList.remove('pulse'));
  }

  pulsePalette(type) {
    const p = this.paletteEl.querySelector('[data-type="' + type + '"]');
    if (p) { p.classList.remove('pulse'); void p.offsetWidth; p.classList.add('pulse'); }
  }

  markWrong(node) {
    const el = this.elOf.get(node);
    el && el.classList.add('wrong');
  }
}

/* Сравнивает программу ученика с эталоном и находит первое расхождение */
function findHint(prog, sol) {
  for (let i = 0; i < sol.length; i++) {
    const a = prog[i], b = sol[i];
    if (!a) return { need: b.t };
    if (a.t !== b.t) return { need: b.t, wrong: a };
    if (b.t === 'repeat') {
      if (a.n !== b.n) return { repN: true, wrong: a };
      const inner = findHint(a.body, b.body);
      if (inner) return inner;
    }
  }
  if (prog.length > sol.length) return { extra: prog[sol.length] };
  return null;
}
