/* ===== Синхронизация класса между устройствами =====
   Необязательная надстройка: без сервера платформа работает как раньше —
   класс лежит в localStorage, а переносится файлом.

   На сервер уходит ровно то, что кнопка «Сохранить класс в файл» кладёт в файл,
   и слияние делает та же функция importClassJSON: по каждому уроку остаётся
   лучший результат. Поэтому сервер ничего не знает об уроках и звёздах —
   он только хранит и выдаёт JSON класса. Код сервера лежит в server/app.py. */

/* Адрес сервера для всех школ сразу: впишите его здесь после публикации,
   чтобы учителю не пришлось вводить адрес руками. Пусто — синхронизация
   выключена, пока учитель не укажет адрес в кабинете. */
const SYNC_SERVER = '';

function syncUrl() {
  return String(DB.settings.syncUrl || SYNC_SERVER || '').trim().replace(/\/+$/, '');
}

function syncSetUrl(u) {
  DB.settings.syncUrl = String(u || '').trim().replace(/\/+$/, '');
  saveDB();
}

/* Класс синхронизируется, если у него есть ключ: идентификатор слота и секрет */
function syncOn(cls) {
  return !!(cls && cls.sync && cls.sync.id && cls.sync.token);
}

function syncKeyOf(cls) {
  return cls.sync.id + '.' + cls.sync.token;
}

function parseSyncKey(key) {
  const m = String(key || '').trim().replace(/\s+/g, '').match(/^([0-9a-f]{6,})\.([0-9a-z]{8,})$/i);
  return m ? { id: m[1], token: m[2] } : null;
}

/* Выгрузка класса для сервера: ключ синхронизации в неё не попадает */
function syncPayload(cls) {
  const copy = Object.assign({}, cls);
  delete copy.sync;
  return JSON.parse(classToJSON(copy));
}

/* Запрос к серверу с понятными учителю ошибками вместо кодов состояния */
function syncFetch(path, opts) {
  const base = syncUrl();
  if (!base) return Promise.reject(new Error('Не указан адрес сервера синхронизации'));
  return fetch(base + path, opts).then(
    res => res.json().catch(() => ({})).then(body => {
      if (res.ok) return body;
      const err = new Error(
        res.status === 404 ? 'Класс не найден на сервере или ключ не подходит' :
        res.status === 409 ? 'Класс уже изменили на другом устройстве' :
        (typeof body.detail === 'string' ? body.detail : 'Сервер ответил ошибкой ' + res.status));
      err.status = res.status;
      err.body = body;
      throw err;
    }),
    () => { throw new Error('Сервер не отвечает. Проверьте адрес и интернет.'); }
  );
}

/* Один цикл обмена: прочитать серверную копию, слить её с местной, записать обратно.
   Если между чтением и записью класс успели изменить с другого устройства,
   сервер отвечает 409 — тогда цикл повторяется уже со свежей версией. */
function syncRun(cls, tries = 3) {
  const s = cls.sync;
  return syncFetch('/api/class/' + s.id, { headers: { 'X-Sync-Token': s.token } })
    .then(got => {
      const remote = got.data && got.data.class;
      if (!remote || String(remote.code) !== String(cls.code)) {
        throw new Error('Этот ключ принадлежит другому классу');
      }
      const res = importClassJSON(JSON.stringify(got.data));
      if (!res.ok) throw new Error(res.msg);
      const local = DB.classes[cls.code];
      return syncFetch('/api/class/' + s.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Sync-Token': s.token },
        body: JSON.stringify({ data: syncPayload(local), version: got.version })
      }).then(put => {
        local.sync.version = put.version;
        local.sync.at = new Date().toISOString();
        saveDB();
        return local;
      });
    })
    .catch(err => {
      if (err.status === 409 && tries > 1) return syncRun(cls, tries - 1);
      throw err;
    });
}

/* ===== Действия учителя ===== */

/* Включить синхронизацию: сервер заводит слот и отдаёт ключ для других устройств */
function syncEnable() {
  const cls = currentClass();
  if (!cls) return;
  const url = document.getElementById('syncUrl');
  if (url) syncSetUrl(url.value);
  if (!syncUrl()) return toast('Впишите адрес сервера синхронизации', 'warn');
  if (syncOn(cls)) return toast('Синхронизация уже включена');

  toast('Включаем синхронизацию…');
  syncFetch('/api/class', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: syncPayload(cls) })
  }).then(res => {
    cls.sync = { id: res.id, token: res.token, version: res.version, at: new Date().toISOString() };
    saveDB();
    handleRoute();
    syncKeyModal(cls);
  }).catch(err => toast(err.message, 'warn'));
}

function syncKeyModal(cls) {
  openModal('<h2>Синхронизация включена</h2>' +
    '<p class="sub">Ключ класса — введите его на других устройствах:</p>' +
    '<div class="sync-key">' + esc(syncKeyOf(cls)) + '</div>' +
    '<p class="muted">На школьном компьютере или домашнем компьютере ребёнка откройте «Войти в класс» → ' +
    '«Подключить устройство к классу» и вставьте этот ключ. После этого прогресс будет сходиться сам.</p>' +
    '<p class="small-note">Ключ открывает журнал класса с именами детей — не выкладывайте его в общий чат. ' +
    'Если ключ потерялся, восстановить его нельзя: выключите синхронизацию и включите заново.</p>' +
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="syncCopyKey()">Скопировать ключ</button>' +
    '<button class="btn btn-primary" onclick="closeModal()">Готово</button></div>');
}

function syncCopyKey() {
  const cls = currentClass();
  if (!cls || !syncOn(cls)) return;
  const key = syncKeyOf(cls);
  const done = () => toast('Ключ скопирован');
  if (navigator.clipboard) navigator.clipboard.writeText(key).then(done, () => toast('Скопируйте ключ вручную', 'warn'));
  else done();
}

/* Обмен по кнопке: показываем результат, чтобы учитель видел, что всё сошлось */
function syncNow() {
  const cls = currentClass();
  if (!syncOn(cls)) return;
  toast('Синхронизируем…');
  syncRun(cls).then(() => {
    handleRoute();
    toast('Готово: прогресс со всех устройств собран.');
  }).catch(err => toast(err.message, 'warn'));
}

/* Подключить это устройство к уже синхронизируемому классу */
function syncJoin() {
  const keyEl = document.getElementById('syncJoinKey');
  const urlEl = document.getElementById('syncJoinUrl');
  if (urlEl && urlEl.value.trim()) syncSetUrl(urlEl.value);
  if (!syncUrl()) return toast('Впишите адрес сервера синхронизации', 'warn');
  const key = parseSyncKey(keyEl && keyEl.value);
  if (!key) return toast('Ключ выглядит так: 1a2b3c4d5e.xxxxxxxxxxxx', 'warn');

  toast('Подключаемся…');
  syncFetch('/api/class/' + key.id, { headers: { 'X-Sync-Token': key.token } }).then(got => {
    const res = importClassJSON(JSON.stringify(got.data));
    if (!res.ok) return toast(res.msg, 'warn');
    const cls = DB.classes[res.code];
    cls.sync = { id: key.id, token: key.token, version: got.version, at: new Date().toISOString() };
    DB.session = { role: 'teacher', code: res.code, gid: DB.session.gid };
    saveDB();
    renderAuthArea();
    closeModal();
    handleRoute();
    toast('Класс «' + res.name + '» подключён. Код для детей: ' + res.code);
  }).catch(err => toast(err.message, 'warn'));
}

function syncJoinModal() {
  openModal('<h2>Подключить устройство к классу</h2>' +
    '<p class="sub">Ключ берётся в кабинете учителя на том компьютере, где класс уже есть.</p>' +
    (SYNC_SERVER ? '' :
      '<div class="form-group"><label>Адрес сервера</label>' +
      '<input id="syncJoinUrl" placeholder="https://адрес-сервера" value="' + esc(syncUrl()) + '"></div>') +
    '<div class="form-group"><label>Ключ класса</label>' +
    '<input id="syncJoinKey" placeholder="1a2b3c4d5e.xxxxxxxxxxxx" autocomplete="off"></div>' +
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-primary" onclick="syncJoin()">Подключить</button></div>');
}

function askSyncOff() {
  openModal('<h2>Выключить синхронизацию?</h2>' +
    '<p class="sub">Класс и весь прогресс останутся на этом устройстве, но перестанут сходиться с другими.</p>' +
    '<p class="muted">Серверная копия не удаляется: по старому ключу её ещё можно открыть. ' +
    'Если ключ попал не в те руки, включите синхронизацию заново — вы получите новый ключ, ' +
    'а прежний будет вести на копию, которая больше не обновляется.</p>' +
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-danger" onclick="syncOff()">Выключить</button></div>');
}

function syncOff() {
  const cls = currentClass();
  if (cls) delete cls.sync;
  saveDB();
  closeModal();
  handleRoute();
  toast('Синхронизация выключена');
}

/* ===== Фоновая отправка =====
   Ребёнок прошёл урок — звёзды уходят на сервер сами, учителю не нужно
   ничего нажимать. Без интернета и без ключа просто ничего не происходит:
   данные уже сохранены в браузере и уйдут при следующем обмене. */
let syncTimer;
function syncPushSoon() {
  const cls = currentClass();
  if (!syncOn(cls) || !syncUrl() || !navigator.onLine) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { syncRun(cls).catch(() => {}); }, 2000);
}

/* ===== Карточка в кабинете учителя ===== */
function syncCard(cls) {
  const head = '<div class="card sync-card"><h3>Синхронизация между устройствами</h3>';

  if (syncOn(cls)) {
    return head +
      '<p class="muted">Включена: ' + syncWhen(cls) + '. Звёзды детей уходят на сервер сами, ' +
      'кнопка «Синхронизировать» нужна, только если хочется увидеть результат сразу.</p>' +
      '<div class="form-group"><label>Ключ класса для других устройств</label>' +
      '<div class="sync-key">' + esc(syncKeyOf(cls)) + '</div></div>' +
      '<div class="sync-actions"><button class="btn btn-primary" onclick="syncNow()">Синхронизировать сейчас</button>' +
      '<button class="btn btn-ghost" onclick="syncCopyKey()">Скопировать ключ</button>' +
      '<button class="btn btn-ghost" onclick="askSyncOff()">Выключить</button></div>' +
      '<p class="small-note">Ключ открывает журнал класса с именами детей — давайте его только тем устройствам, ' +
      'на которых занимаются ваши ученики. Удаление ученика на одном устройстве не удаляет его на других: ' +
      'обмен только добавляет данные и выбирает лучший результат.</p></div>';
  }

  return head +
    '<p class="muted">Нужна, если класс занимается в нескольких кабинетах или ребёнок продолжает дома: ' +
    'прогресс со всех устройств сходится сам, файл переносить не нужно. Без неё платформа работает как обычно.</p>' +
    (SYNC_SERVER ? '' :
      '<div class="form-group"><label>Адрес сервера синхронизации</label>' +
      '<input id="syncUrl" placeholder="https://адрес-сервера" value="' + esc(syncUrl()) + '">' +
      '<small class="muted">Адрес даёт тот, кто поднял сервер школы. Инструкция — в папке server.</small></div>') +
    '<div class="sync-actions"><button class="btn btn-primary" onclick="syncEnable()">Включить синхронизацию</button>' +
    '<button class="btn btn-ghost" onclick="syncJoinModal()">Этот класс уже на сервере — подключить</button></div>' +
    '<p class="small-note">На сервер уйдёт журнал класса: имена детей, звёзды и реакции на уроки. ' +
    'Это персональные данные — используйте сервер своей школы, а не чужой.</p></div>';
}

/* Строка состояния для кабинета учителя */
function syncWhen(cls) {
  if (!cls.sync || !cls.sync.at) return 'ещё не синхронизировался';
  const d = new Date(cls.sync.at);
  const today = new Date().toDateString() === d.toDateString();
  const time = d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  return 'последний обмен ' + (today ? 'сегодня в ' + time : d.toLocaleDateString('ru') + ' в ' + time);
}
