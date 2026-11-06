# Сервер платформы

Хранит аккаунты, профили детей, занятия учителей и прогресс. Учебной части —
курсов, заданий, Мастерской — здесь нет: она целиком в браузере, и это
сознательно. Школа со слабым интернетом должна заниматься даже когда сервер
недоступен.

- Python 3.12, FastAPI, PostgreSQL 16
- миграции — Alembic, схема описана в [`app/models.py`](app/models.py)
- запуск на сервере — systemd, конфиги в папке [`deploy`](../deploy)

## Устройство

| Файл | Зачем |
|---|---|
| `app/config.py` | настройки из переменных окружения |
| `app/db.py` | подключение к базе, сессия на один запрос |
| `app/models.py` | таблицы и правила целостности |
| `app/security.py` | хеширование паролей, токены сессий, коды занятий |
| `app/main.py` | сборка приложения, защитные заголовки, `/api/health` |
| `alembic/` | миграции базы |

Работа с базой синхронная, обработчики объявляются обычным `def`. Нагрузка
школьная — десятки запросов в минуту даже при полном компьютерном классе, —
а синхронный код проще читать и отлаживать.

## Первая установка на Ubuntu 24.04

Дальше считается, что репозиторий лежит в `/srv/soberikod`. Если он у вас в
другом месте — либо перенесите, либо поправьте путь в двух файлах:
`deploy/soberikod-api.service` и `deploy/deploy.sh`.

### 1. Пакеты

```bash
sudo apt update
sudo apt install -y nginx postgresql python3-venv python3-full rsync certbot python3-certbot-nginx
```

### 2. База

```bash
sudo -u postgres createuser soberikod --pwprompt
sudo -u postgres createdb soberikod --owner=soberikod
```

Пароль, который спросит первая команда, понадобится в файле настроек. Придумайте
длинный — вводить его руками никому не придётся.

### 3. Код и права

```bash
sudo mv /путь/куда/клонировали /srv/soberikod
sudo chown -R root:root /srv/soberikod
sudo chmod -R a+rX /srv/soberikod
sudo useradd --system --shell /usr/sbin/nologin --home-dir /srv/soberikod soberikod
```

Код принадлежит root, а служба работает под `soberikod` и читать его может,
а менять — нет. Это не перестраховка: если в сервере однажды найдут дырку,
через неё нельзя будет подменить ни файлы сайта, ни сам сервер.

### 4. Окружение Python

```bash
sudo python3 -m venv /srv/soberikod/server/.venv
sudo /srv/soberikod/server/.venv/bin/pip install -r /srv/soberikod/server/requirements.txt
```

В Ubuntu 24.04 установка пакетов Python прямо в систему запрещена
(`externally-managed-environment`) — поэтому всё живёт в `.venv`, и это
правильно: версии проекта не пересекаются с системными.

### 5. Настройки

```bash
sudo install -d -m 755 /etc/soberikod
sudo install -m 600 /dev/null /etc/soberikod/api.env
sudo nano /etc/soberikod/api.env
```

Что вписать — в [`api.env.example`](api.env.example). Файл доступен только root,
а systemd читает его до того, как сбросит права, так что служба настройки
получит, а посторонние — нет. В репозиторий этот файл не попадает никогда:
репозиторий открытый.

### 6. Схема базы

```bash
cd /srv/soberikod/server
sudo SOBERIKOD_DATABASE_URL='postgresql+psycopg://soberikod:ПАРОЛЬ@localhost:5432/soberikod' .venv/bin/alembic upgrade head
```

Проверить, что таблицы совпадают с описанием в `models.py`:

```bash
sudo SOBERIKOD_DATABASE_URL='...' .venv/bin/alembic check
```

### 7. Служба

```bash
sudo cp /srv/soberikod/deploy/soberikod-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now soberikod-api
curl -s http://127.0.0.1:8000/api/health
```

Ответ `{"ok":true}` означает, что сервер поднялся и база отвечает. Если нет —
`journalctl -u soberikod-api -n 50`.

### 8. nginx

```bash
sudo install -d -m 755 /etc/nginx/snippets
sudo cp /srv/soberikod/deploy/nginx-headers.conf /etc/nginx/snippets/soberikod-headers.conf
sudo cp /srv/soberikod/deploy/nginx-soberikod.conf /etc/nginx/sites-available/soberikod
sudo ln -s /etc/nginx/sites-available/soberikod /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### 9. Сертификат

A-запись домена должна уже указывать на сервер, иначе проверку пройти нельзя.

```bash
sudo certbot --nginx -d xn--90agcmkuenf.xn--p1ai -d www.xn--90agcmkuenf.xn--p1ai
```

`xn--90agcmkuenf.xn--p1ai` — это соберикод.рф в ASCII-виде. Кириллицу ни nginx,
ни Let's Encrypt не принимают; в адресной строке её подставит сам браузер.
Адрес почты, который спросит certbot, нужен для одного письма: «сертификат
истекает, а продлить не удалось». Продление дальше идёт само.

### 10. Сеть и обновления

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo apt install -y unattended-upgrades
```

### 11. Первое обновление сайта

```bash
sudo bash /srv/soberikod/deploy/deploy.sh
```

Дальше все обновления — только этой командой, см. [`../DEPLOY.md`](../DEPLOY.md).

## Бэкапы

В базе лежат имена детей. Потерять её нельзя, и утечь она тоже не должна.

```bash
sudo install -d -m 700 /var/backups/soberikod
sudo -u postgres pg_dump soberikod | gzip > /var/backups/soberikod/$(date +%F).sql.gz
```

Поставить это в расписание, хранить копии ограниченный срок и — обязательно —
один раз восстановиться из бэкапа на пустой базе. Бэкап, из которого ни разу не
восстанавливались, существует только на бумаге.

Копию стоит держать не только на этом же VPS: диск умирает вместе со всем,
что на нём лежит.

## Переменные окружения

| Переменная | По умолчанию | Зачем |
|---|---|---|
| `SOBERIKOD_DATABASE_URL` | локальная база `soberikod` | подключение к PostgreSQL |
| `SOBERIKOD_SITE_ORIGIN` | `https://xn--90agcmkuenf.xn--p1ai` | адрес для ссылок в письмах |
| `SOBERIKOD_CORS_ORIGINS` | пусто | чужие домены, которым разрешены запросы; на сервере не нужно |
| `SOBERIKOD_COOKIE_SECURE` | `true` | `false` только для проверки без HTTPS |
| `SOBERIKOD_SESSION_DAYS_ADULT` | `30` | срок сессии взрослого |
| `SOBERIKOD_SESSION_HOURS_CHILD` | `12` | срок сессии ребёнка |
| `SOBERIKOD_SMTP_HOST` и далее | пусто | почта для подтверждения адреса и сброса пароля |

Без настроенной почты сервер работает, но забытый пароль взрослого придётся
сбрасывать руками в базе.

## Что сервер знает о детях

Имя (то, которое ввёл родитель или сам ребёнок при входе на занятие), логин,
звёзды, реакции на уроки и сохранённые работы. Ни адреса, ни телефона, ни даты
рождения — они не нужны, а значит и храниться не должны.

Пароли не хранятся вовсе: в базе лежат только хеши Argon2id. Токены сессий —
тоже только отпечатки. Из украденной базы нельзя ни войти, ни узнать пароль.

Данные ребёнка без аккаунта, зашедшего на занятие по коду, живут только пока
живёт занятие: родитель его не регистрировал и согласия не давал.

## Проверка на своём компьютере

Нужен локальный PostgreSQL. Дальше:

```bash
cd server
python -m venv .venv
.venv/Scripts/activate          # Linux и macOS: source .venv/bin/activate
pip install -r requirements.txt
set SOBERIKOD_DATABASE_URL=postgresql+psycopg://postgres:ПАРОЛЬ@localhost:5432/soberikod
set SOBERIKOD_COOKIE_SECURE=false
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Проверка: <http://localhost:8000/api/health> → `{"ok":true}`
