/* ===== Разговор с сервером =====
   Сайт и сервер живут на одном домене, поэтому адрес здесь короткий, а вход
   хранится в cookie, которую браузер прикладывает сам. Из JavaScript эта
   cookie не видна вовсе — так задумано: подставленный на страницу чужой
   скрипт не сможет её украсть и войти под ребёнком.

   Платформа работает и без сервера: без интернета уроки открываются из кэша,
   прогресс копится в браузере и уходит на сервер, когда связь вернётся.
   Поэтому ошибка обращения здесь — обычное дело, а не поломка. */

const API = {
  /* Текст ошибки сервера, годный для показа человеку.
     FastAPI отвечает по-разному: понятной строкой при отказе и списком
     разобранных полей при неверно заполненной форме. Здесь оба случая
     сводятся к одной фразе. */
  message(status, body) {
    if (body && typeof body.detail === 'string') return body.detail;
    if (body && Array.isArray(body.detail) && body.detail.length) {
      const first = body.detail[0];
      if (first && first.msg) return String(first.msg).replace(/^Value error,\s*/, '');
    }
    if (status === 0) return 'Нет связи с сервером. Проверьте интернет.';
    if (status === 429) return 'Слишком много попыток. Подождите немного.';
    if (status >= 500) return 'Сервер сейчас не отвечает. Попробуйте позже.';
    return 'Не получилось. Попробуйте ещё раз.';
  },

  async call(path, { method = 'GET', body = null } = {}) {
    let res;
    const headers = { 'X-Requested-With': 'fetch' };
    if (body !== null) headers['Content-Type'] = 'application/json';
    try {
      res = await fetch('/api' + path, {
        method,
        headers,
        // Без этого браузер не приложит cookie входа, и сервер не узнает,
        // кто пришёл.
        credentials: 'same-origin',
        body: body === null ? undefined : JSON.stringify(body)
      });
    } catch (e) {
      const err = new Error(this.message(0));
      err.status = 0;
      throw err;
    }

    let data = null;
    try { data = await res.json(); } catch (e) { /* пустой ответ — это нормально */ }

    if (!res.ok) {
      const err = new Error(this.message(res.status, data));
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data;
  },

  get(path) { return this.call(path); },
  post(path, body) { return this.call(path, { method: 'POST', body: body || {} }); },
  put(path, body) { return this.call(path, { method: 'PUT', body: body || {} }); },
  patch(path, body) { return this.call(path, { method: 'PATCH', body: body || {} }); },
  del(path, body) { return this.call(path, { method: 'DELETE', body: body || {} }); }
};
