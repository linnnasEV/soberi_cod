"""Сервер синхронизации «СобериКод».

Платформа работает и без него: класс живёт в localStorage браузера, а переносится
файлом. Этот сервер нужен только чтобы один и тот же класс открывался на нескольких
устройствах — школьный компьютер, ноутбук учителя, домашний компьютер ребёнка.

Хранит он ровно то, что платформа уже умеет выгружать в файл: JSON класса. Никакой
логики уроков здесь нет и быть не должно — слияние прогресса делает браузер той же
функцией, что и при загрузке файла.

Запуск:
    pip install -r requirements.txt
    uvicorn app:app --host 0.0.0.0 --port 8000

База данных — файл sync.db рядом со скриптом, менять путь можно переменной
SOBERIKOD_DB. Домены, которым разрешено обращаться к серверу, задаются
переменной SOBERIKOD_ORIGINS (через запятую), по умолчанию разрешены все.
"""

import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time

from fastapi import Body, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

DB_PATH = os.environ.get('SOBERIKOD_DB', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sync.db'))
ORIGINS = [o.strip() for o in os.environ.get('SOBERIKOD_ORIGINS', '*').split(',') if o.strip()]
MAX_BYTES = 1_000_000          # класс на 30 детей весит единицы килобайт
ALPHABET = '23456789abcdefghijkmnpqrstuvwxyz'   # без похожих друг на друга символов

app = FastAPI(title='СобериКод · синхронизация', docs_url=None, redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_methods=['GET', 'PUT', 'POST'],
    allow_headers=['*'],
)


def db():
    con = sqlite3.connect(DB_PATH)
    con.execute('CREATE TABLE IF NOT EXISTS classes ('
                'id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, data TEXT NOT NULL, '
                'version INTEGER NOT NULL, updated REAL NOT NULL)')
    return con


def token_hash(token):
    return hashlib.sha256(('sobericod:' + token).encode()).hexdigest()


def check_payload(data):
    """Пускаем только выгрузку класса: сервер не должен стать свалкой чужого JSON."""
    cls = data.get('class') if isinstance(data, dict) else None
    code = str(cls.get('code', '')) if isinstance(cls, dict) else ''
    if not (len(code) == 4 and code.isdigit()) or not isinstance(cls.get('students'), dict):
        raise HTTPException(400, 'Это не выгрузка класса')
    text = json.dumps(data, ensure_ascii=False)
    if len(text.encode()) > MAX_BYTES:
        raise HTTPException(413, 'Слишком большой класс')
    return text


def load(cid, token):
    row = db().execute('SELECT token_hash, data, version FROM classes WHERE id = ?', (cid,)).fetchone()
    # Один ответ и на неизвестный класс, и на неверный ключ: так ключи не перебрать.
    if not row or not hmac.compare_digest(row[0], token_hash(token or '')):
        raise HTTPException(404, 'Класс не найден или ключ не подходит')
    return row


@app.get('/api/health')
def health():
    return {'ok': True}


@app.post('/api/class')
def create(data=Body(..., embed=True)):
    """Учитель включает синхронизацию: сервер отдаёт ключ, который он переносит на другие устройства."""
    text = check_payload(data)
    cid, token = secrets.token_hex(5), ''.join(secrets.choice(ALPHABET) for _ in range(24))
    with db() as con:
        con.execute('INSERT INTO classes VALUES (?, ?, ?, 1, ?)', (cid, token_hash(token), text, time.time()))
    return {'id': cid, 'token': token, 'key': cid + '.' + token, 'version': 1}


@app.get('/api/class/{cid}')
def read(cid: str, x_sync_token: str = Header(None)):
    row = load(cid, x_sync_token)
    return {'data': json.loads(row[1]), 'version': row[2]}


@app.put('/api/class/{cid}')
def write(cid: str, data=Body(...), version: int = Body(...), x_sync_token: str = Header(None)):
    """Сохраняет класс, если с момента чтения его никто не перезаписал.

    Если перезаписал — отдаём свежую версию: браузер сольёт её со своей
    (лучший результат по каждому уроку) и запишет снова.
    """
    row = load(cid, x_sync_token)
    text = check_payload(data)
    if version != row[2]:
        raise HTTPException(409, {'version': row[2]})
    with db() as con:
        con.execute('UPDATE classes SET data = ?, version = ?, updated = ? WHERE id = ?',
                    (text, row[2] + 1, time.time(), cid))
    return {'version': row[2] + 1}
