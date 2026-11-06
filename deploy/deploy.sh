#!/usr/bin/env bash
# Обновление платформы на сервере:
#   sudo bash /srv/soberikod/deploy/deploy.sh
#
# Через bash, а не напрямую: проект правится на Windows, где права на запуск
# не сохраняются, и файл приезжает на сервер без признака исполняемого.
#
# Делает четыре вещи: забирает новый код, доводит базу до текущей схемы,
# раскладывает сайт и перезапускает сервер. Повторный запуск ничего не портит,
# поэтому гонять можно сколько угодно раз.
#
# Первоначальная установка здесь не описана — она в server/README.md.

set -euo pipefail

REPO=/srv/soberikod
WWW=/var/www/soberikod
VENV="$REPO/server/.venv"
ENV_FILE=/etc/soberikod/api.env

if [ ! -x "$VENV/bin/pip" ]; then
    echo "Нет окружения $VENV — сначала установка по server/README.md" >&2
    exit 1
fi

echo '→ код'
git -C "$REPO" pull --ff-only

echo '→ зависимости'
"$VENV/bin/pip" install --quiet --upgrade pip
"$VENV/bin/pip" install --quiet -r "$REPO/server/requirements.txt"

echo '→ схема базы'
# Берём из файла настроек одну строку — адрес базы. Читать весь файл оболочкой
# нельзя: systemd и bash понимают кавычки по-разному, и пароль со знаком $
# или пробелом превратился бы в кашу.
SOBERIKOD_DATABASE_URL="$(grep -m1 '^SOBERIKOD_DATABASE_URL=' "$ENV_FILE" | cut -d= -f2-)"
export SOBERIKOD_DATABASE_URL
cd "$REPO/server"
"$VENV/bin/alembic" upgrade head
# Сверяем таблицы с тем, что описано в models.py: расхождение здесь означает,
# что миграцию забыли написать, и лучше узнать об этом сейчас.
"$VENV/bin/alembic" check

echo '→ сайт'
install -d -m 755 "$WWW"
# Наружу уезжает только список публичных файлов. Всё прочее — .git, server/,
# инструкции — остаётся в репозитории: иначе код сервера и история проекта
# скачивались бы по прямой ссылке.
rsync -a --delete \
    --include='/index.html' \
    --include='/sw.js' \
    --include='/manifest.json' \
    --include='/icon.svg' \
    --include='/css/***' \
    --include='/js/***' \
    --exclude='*' \
    "$REPO/" "$WWW/"

echo '→ перезапуск'
systemctl restart soberikod-api
nginx -t
systemctl reload nginx

echo '→ проверка'
sleep 2
curl -fsS http://127.0.0.1:8000/api/health && echo
echo 'Готово.'
