/* ===== Первое знакомство с Мастерской =====
   Ребёнок 6 лет не читает инструкцию, но повторяет увиденное. Поэтому при
   первом визите платформа один раз показывает сама: блок попал в программу,
   нажата кнопка, герой пошёл. Дальше — две подсказки-стрелки, и всё.

   Подсказки учат нажимать, а не перетаскивать: перетаскивание в редакторе
   работает, но пальцем на дешёвом планшете оно получается не у всех,
   а нажатие — у всех. */

const Tour = {
  KEY: 'sobericod_onboarded',
  token: 0,
  playing: false,
  armed: false,      // подсказки включены (только при первом визите)
  addedOnce: false,
  ranOnce: false,

  seen() {
    try { return localStorage.getItem(this.KEY) === '1'; }
    catch (e) { return true; }   // приватный режим: не навязываемся
  },

  remember() {
    try { localStorage.setItem(this.KEY, '1'); } catch (e) {}
  },

  /* Вызывается при каждом открытии главной */
  start() {
    if (this.seen() || this.playing || this.armed) return;
    this.armed = true;
    setTimeout(() => { if (!this.seen()) this.play(true); }, 700);
  },

  /* Кнопка «Показать пример» — доступна всегда, программу ребёнка не теряет */
  example() {
    if (this.playing) return;
    this.play(false);
  },

  layer() { return document.getElementById('tourLayer'); },

  say(text, skip) {
    const el = this.layer();
    el.hidden = false;
    el.innerHTML = '<div class="tour-box"><span>' + esc(text) + '</span>' +
      (skip ? '<button class="tour-skip" onclick="Tour.skip()">Пропустить</button>' : '') + '</div>';
  },

  hide() {
    const el = this.layer();
    el.hidden = true;
    el.innerHTML = '';
  },

  wait(ms) {
    return new Promise(res => setTimeout(res, ms));
  },

  async play(first) {
    if (!S.editor) return;
    this.playing = true;
    const my = ++this.token;
    const saved = JSON.parse(JSON.stringify(S.editor.program));
    this.clearHints();
    S.editor.setup({ blocks: ALL_BLOCKS, program: [] });
    S.editor.setLocked(true);

    const step = async (text, fn, ms) => {
      if (my !== this.token) return false;
      this.say(text, first);
      fn && fn();
      await this.wait(ms);
      return my === this.token;
    };

    try {
      if (!await step('Смотри: нажимаю на блок — он попадает в программу', () => {
        S.editor.pulsePalette('right');
        S.editor.setLocked(false); S.editor.add('right'); S.editor.setLocked(true);
      }, 1300)) return this.stop(saved, first);

      if (!await step('Ещё один — и получилась программа из двух шагов', () => {
        S.editor.pulsePalette('jump');
        S.editor.setLocked(false); S.editor.add('jump'); S.editor.setLocked(true);
      }, 1200)) return this.stop(saved, first);

      if (!await step('Теперь нажимаю зелёную кнопку «Запустить»', () => {
        const b = document.getElementById('studioRun');
        b && b.classList.add('pulse');
      }, 1200)) return this.stop(saved, first);

      const b = document.getElementById('studioRun');
      b && b.classList.remove('pulse');
      this.say('Герой выполняет команды по очереди', first);
      await S.stage.run(S.editor.program, (n, p) => S.editor.highlight(n, p));
      if (my !== this.token) return this.stop(saved, first);
      S.editor.clearHighlight();

      this.say('Теперь попробуй сам!', false);
      await this.wait(1200);
    } finally {
      if (my === this.token) this.stop(saved, first);
    }
  },

  stop(saved, first) {
    this.playing = false;
    const b = document.getElementById('studioRun');
    b && b.classList.remove('pulse');
    S.editor.setLocked(false);
    S.editor.clearHighlight();
    // Программу ребёнка возвращаем: «Показать пример» не должно стирать работу
    S.editor.setup({ blocks: ALL_BLOCKS, program: saved || [] });
    S.stage.reset();
    this.hide();
    if (first) {
      this.remember();
      this.addedOnce = (saved || []).length > 0;
      this.hint();
    }
  },

  skip() {
    this.token++;          // прерывает текущий показ
    this.playing = false;
    this.stop([], true);
  },

  /* ===== Стрелки-подсказки =====
     Живут только до первого действия и только при первом визите. */
  hint() {
    if (!this.armed) return;
    this.clearHints();
    if (!this.addedOnce) this.tip('studioPalette', 'Нажми на блок');
    else if (!this.ranOnce) this.tip('studioRun', 'Нажми, чтобы запустить');
    else this.armed = false;
  },

  tip(id, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('ghost-tip');
    el.dataset.tip = text;
  },

  clearHints() {
    document.querySelectorAll('.ghost-tip').forEach(el => {
      el.classList.remove('ghost-tip');
      delete el.dataset.tip;
    });
  },

  onProgram() {
    if (this.playing || !this.armed) return;
    this.addedOnce = true;
    this.hint();
  },

  onRun() {
    if (this.playing || !this.armed) return;
    this.ranOnce = true;
    this.armed = false;
    this.clearHints();
  }
};
