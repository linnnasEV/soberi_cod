"""Защита от перебора паролей.

Линий защиты две. Первая — в nginx: он отсекает шквал запросов с одного адреса
раньше, чем до сервера дойдёт дело. Вторая здесь: счётчик на конкретный
аккаунт. Он лежит в базе, а не в памяти процесса, и поэтому переживает
перезапуск сервера и работает одинаково при любом числе рабочих процессов.

Для детей это не формальность. Пароль у ребёнка простой по определению, а его
логин знает сосед по парте — ограничение попыток оказывается единственным, что
стоит между чужим аккаунтом и настойчивым третьеклассником.
"""

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .audit import client_ip
from .config import settings
from .models import LoginAttempt

# Запас поверх ограничения nginx: если кто-то пробился мимо него, здесь он
# упрётся в предел по адресу, общий на все аккаунты сразу.
IP_WINDOW = timedelta(minutes=15)
IP_MAX_FAILURES = 50


def _now() -> datetime:
    return datetime.now(timezone.utc)


def record(db: Session, scope: str, key: str, ok: bool, request: Request | None) -> None:
    db.add(LoginAttempt(scope=scope, key=key[:200], ok=ok, ip=client_ip(request)))


def guard_ip(db: Session, request: Request | None) -> None:
    """Не даёт одному адресу перебирать разные аккаунты подряд."""
    ip = client_ip(request)
    if not ip:
        return
    failures = db.execute(
        select(func.count()).select_from(LoginAttempt).where(
            LoginAttempt.ip == ip,
            LoginAttempt.ok.is_(False),
            LoginAttempt.at > _now() - IP_WINDOW,
        )
    ).scalar_one()
    if failures >= IP_MAX_FAILURES:
        raise HTTPException(429, 'Слишком много попыток входа. Попробуйте через 15 минут.')


def ensure_not_locked(holder) -> None:
    """holder — строка аккаунта: взрослого или ребёнка, у обоих есть эти поля."""
    if holder.locked_until and holder.locked_until > _now():
        left = int((holder.locked_until - _now()).total_seconds() // 60) + 1
        raise HTTPException(429, f'Слишком много неудачных попыток. Подождите {left} мин.')


def note_failure(db: Session, holder) -> None:
    holder.failed_logins = (holder.failed_logins or 0) + 1
    if holder.failed_logins >= settings.login_max_failures:
        holder.locked_until = _now() + timedelta(minutes=settings.login_lock_minutes)
        holder.failed_logins = 0


def note_success(db: Session, holder) -> None:
    holder.failed_logins = 0
    holder.locked_until = None
