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

  /* Жёлтая рамка на том месте, о котором сейчас речь */
  glow(id) {
    this.unglow();
    const el = document.getElementById(id);
    if (el) el.classList.add('tour-glow');
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

    const house = { r: STUDIO_ROWS - 2, c: 3 };

    try {
      if (!await step('Сначала выбираю героя. Пусть будет собачка', () => {
        this.glow('heroPick');
        pickHero('dog');
      }, 800)) return this.stop(first);

      if (!await step('Теперь выбираю место. Пусть будет лес', () => {
        this.glow('bgPick');
        pickBg('forest');
      }, 800)) return this.stop(first);

      if (!await step('Ставлю домик на землю. Туда собачка и пойдёт', () => {
        this.glow('decorPick');
        pickTool('h');
        placeDecor(house.r, house.c);
      }, 900)) return this.stop(first);

      this.unglow();

      if (!await step('Беру блок «Вправо». Это один шаг', () => {
        this.glow('studioPalette');
        S.editor.pulsePalette('right');
        S.editor.setLocked(false); S.editor.add('right'); S.editor.setLocked(true);
      }, 800)) return this.stop(first);

      if (!await step('Нажимаю ещё два раза: до домика три шага', async () => {
        for (let i = 0; i < 2; i++) {
          S.editor.pulsePalette('right');
          S.editor.setLocked(false); S.editor.add('right'); S.editor.setLocked(true);
          await this.wait(500);
        }
      }, 1100)) return this.stop(first);

      if (!await step('Нажимаю зелёную кнопку «Старт»', () => {
        this.glow('studioRun');
        const btn = document.getElementById('studioRun');
        btn && btn.classList.add('pulse');
      }, 800)) return this.stop(first);

      this.unglow();
      const btn = document.getElementById('studioRun');
      btn && btn.classList.remove('pulse');

      const walking = this.say('Собачка идёт. Она слушается блоков', first);
      await S.stage.run(S.editor.program, (n, p) => S.editor.highlight(n, p));
      await walking;
      if (my !== this.token) return this.stop(first);
      S.editor.clearHighlight();

      await Promise.all([this.say('Дошла до домика! Теперь попробуй сам', false), this.wait(1200)]);
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
