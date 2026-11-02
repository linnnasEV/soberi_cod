/* ===== Первое знакомство с Мастерской =====
   Ребёнок 6 лет не читает инструкцию, но повторяет увиденное. Поэтому
   платформа один раз проходит весь путь сама, по шагам и в том же порядке,
   в каком его пройдёт он: выбрать героя → выбрать место → поставить деталь →
   собрать программу → нажать «Старт». Дальше — две подсказки-стрелки.

   Каждый шаг ждёт, пока договорит голос: иначе фраза обрывается на половине
   и ребёнок слышит обрывки вместо объяснения.

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
  saved: null,       // сцена ребёнка, которую вернём после показа

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

  /* Кнопка «Показать пример» — доступна всегда, работу ребёнка не теряет */
  example() {
    if (this.playing) return;
    this.play(false);
  },

  layer() { return document.getElementById('tourLayer'); },

  /* Реплику видно на сцене и слышно вслух. Возвращает обещание: шаг
     закончится не раньше, чем договорит голос. */
  say(text, skip) {
    const el = this.layer();
    el.hidden = false;
    el.innerHTML = '<div class="tour-box"><span>' + esc(text) + '</span>' +
      (skip ? '<button class="tour-skip" onclick="Tour.skip()">Пропустить</button>' : '') + '</div>';
    return DB.settings.sound === false ? Promise.resolve() : Speech.speak(text);
  },

  hide() {
    const el = this.layer();
    el.hidden = true;
    el.innerHTML = '';
  },

  /* Жёлтая рамка на том месте, о котором сейчас речь. Обводим не ряд
     иконок, а всю карточку вместе с заголовком: ребёнок должен понять,
     что речь про «ГЕРОЙ», а не про одну кнопку. */
  glow(id, exact) {
    this.unglow();
    const el = document.getElementById(id);
    if (!el) return;
    ((exact ? null : el.closest('.pk')) || el).classList.add('tour-glow');
  },

  unglow() {
    document.querySelectorAll('.tour-glow').forEach(el => el.classList.remove('tour-glow'));
  },

  wait(ms) {
    return new Promise(res => setTimeout(res, ms));
  },

  async play(first) {
    if (!S.editor) return;
    this.playing = true;
    const my = ++this.token;
    // Запоминаем всё, что собрал ребёнок: показ не должен стирать его работу
    this.saved = {
      hero: S.hero, bg: S.bg,
      decor: Object.assign({}, S.decor),
      start: Object.assign({}, S.start),
      program: JSON.parse(JSON.stringify(S.editor.program))
    };
    this.clearHints();
    S.editor.setup({ blocks: ALL_BLOCKS, program: [] });
    S.editor.setLocked(true);

    // Чистая сцена: герой слева на земле, остальное появится на глазах
    S.decor = {};
    S.start = { r: STUDIO_ROWS - 2, c: 0 };
    mountStudioStage();

    const step = async (text, fn, pause) => {
      if (my !== this.token) return false;
      const said = this.say(text, first);
      fn && fn();
      await Promise.all([said, this.wait(pause)]);
      return my === this.token;
    };

    // Сценарий ровно тот, что ребёнок повторит сам: герой, место, предметы,
    // блоки, «Старт». Фразы короткие и совпадают с тем, что в этот момент
    // происходит на экране.
    const row = STUDIO_ROWS - 2;
    const flower = { r: row, c: 2 }, house = { r: row, c: 4 }, extra = { r: row, c: 6 };

    try {
      if (!await step('Первый шаг — выбираем героя. Пусть будет котик', () => {
        this.glow('heroPick');
        pickHero('cat');
      }, 700)) return this.stop(first);

      if (!await step('Теперь выбираем, где он будет гулять. Пусть будет день', () => {
        this.glow('bgPick');
        pickBg('day');
      }, 700)) return this.stop(first);

      if (!await step('Добавим травку, цветочек и домик', async () => {
        this.glow('decorPick');
        pickTool('g'); placeDecor(row + 1, 1); placeDecor(row + 1, 5);
        await this.wait(400);
        pickTool('c'); placeDecor(flower.r, flower.c);
        await this.wait(400);
        pickTool('h'); placeDecor(house.r, house.c);
      }, 1000)) return this.stop(first);

      if (!await step('Поставил лишнее? Нажми «Убрать» и на эту клетку', async () => {
        pickTool('t'); placeDecor(extra.r, extra.c);
        await this.wait(900);
        this.glow('decorFixed', true);
        pickTool('.'); placeDecor(extra.r, extra.c);
      }, 900)) return this.stop(first);

      this.unglow();

      if (!await step('Теперь котик соберёт цветочек и пойдёт к домику', null, 500)) return this.stop(first);

      if (!await step('Два шага вправо — и котик у цветочка', async () => {
        this.glow('studioPalette');
        for (let i = 0; i < 2; i++) {
          S.editor.pulsePalette('right');
          S.editor.setLocked(false); S.editor.add('right'); S.editor.setLocked(true);
          await this.wait(450);
        }
      }, 700)) return this.stop(first);

      if (!await step('Цветочек под ногами — берём блок «Собрать»', () => {
        S.editor.pulsePalette('take');
        S.editor.setLocked(false); S.editor.add('take'); S.editor.setLocked(true);
      }, 700)) return this.stop(first);

      if (!await step('И ещё два шага — до домика', async () => {
        for (let i = 0; i < 2; i++) {
          S.editor.pulsePalette('right');
          S.editor.setLocked(false); S.editor.add('right'); S.editor.setLocked(true);
          await this.wait(450);
        }
      }, 700)) return this.stop(first);

      if (!await step('Нажимаем зелёную кнопку «Старт»', () => {
        this.glow('studioRun', true);
        const btn = document.getElementById('studioRun');
        btn && btn.classList.add('pulse');
      }, 700)) return this.stop(first);

      this.unglow();
      const btn = document.getElementById('studioRun');
      btn && btn.classList.remove('pulse');

      const walking = this.say('Смотри, котик пошёл', first);
      await S.stage.run(S.editor.program, (n, p) => S.editor.highlight(n, p));
      await walking;
      if (my !== this.token) return this.stop(first);
      S.editor.clearHighlight();

      await Promise.all([this.say('Цветочек собран, котик у домика. Теперь попробуй сам', false), this.wait(1200)]);
    } finally {
      if (my === this.token) this.stop(first);
    }
  },

  stop(first) {
    this.playing = false;
    this.unglow();
    const btn = document.getElementById('studioRun');
    btn && btn.classList.remove('pulse');
    S.editor.setLocked(false);
    S.editor.clearHighlight();

    // Возвращаем сцену ребёнка целиком: героя, место, предметы и программу
    const was = this.saved;
    this.saved = null;
    if (was) {
      S.hero = was.hero;
      S.bg = was.bg;
      S.decor = was.decor;
      S.start = was.start;
      S.editor.setup({ blocks: ALL_BLOCKS, program: was.program || [] });
      renderStudioPickers();
      mountStudioStage();
      saveStudioSession();
    }
    this.hide();
    if (first) {
      this.remember();
      this.addedOnce = !!(was && was.program && was.program.length);
      this.hint();
    }
  },

  skip() {
    this.token++;          // прерывает текущий показ
    this.playing = false;
    Speech.stop();
    this.stop(true);
  },

  /* ===== Стрелки-подсказки =====
     Живут только до первого действия и только при первом визите. */
  hint() {
    if (!this.armed) return;
    this.clearHints();
    if (!this.addedOnce) this.tip('studioPalette', 'Нажми на блок');
    else if (!this.ranOnce) this.tip('studioRun', 'Нажми «Старт»');
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
