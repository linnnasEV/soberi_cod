"""Журнал действий с аккаунтами.

Пишется всё, что меняет доступ: регистрация, вход, неудачный вход, выход, смена
и сброс пароля, а дальше — удаление аккаунтов и действия администратора.

Записи не ссылаются на таблицы внешними ключами: строка «родитель удалил
аккаунт» должна пережить само удаление аккаунта, иначе журнал исчезнет ровно
тогда, когда понадобится. Поэтому рядом с идентификатором хранится подпись
в открытом виде.
"""

import uuid

from fastapi import Request
from sqlalchemy.orm import Session

from .models import AuditEntry


def client_ip(request: Request | None) -> str | None:
    """Настоящий адрес посетителя.

    Сервер слушает только localhost и стоит за nginx, поэтому uvicorn запущен
    с --proxy-headers: он подставляет сюда адрес из X-Forwarded-For, а не адрес
    самого nginx.
    """
    if request is None or request.client is None:
        return None
    return request.client.host


def log(
    db: Session,
    action: str,
    *,
    actor_kind: str | None = None,
    actor_id: uuid.UUID | None = None,
    actor_label: str | None = None,
    target_kind: str | None = None,
    target_id: uuid.UUID | None = None,
    meta: dict | None = None,
    request: Request | None = None,
) -> None:
    db.add(AuditEntry(
        action=action,
        actor_kind=actor_kind,
        actor_id=actor_id,
        actor_label=actor_label,
        target_kind=target_kind,
        target_id=target_id,
        meta=meta,
        ip=client_ip(request),
    ))
