"""Сессии: выдача, проверка, продление, отзыв.

Сессия — это случайный токен в cookie и строка в базе. В базе лежит только
отпечаток токена, поэтому из украденной базы войти нельзя.

Почему не подписанный токен вроде JWT: его нельзя отозвать. А отзывать нужно
немедленно — сменили пароль, удалили профиль, заблокировали аккаунт. Здесь для
этого достаточно проставить дату в одной строке.
"""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .models import AuthSession, Child, User
from .security import new_session_token, token_fingerprint

# Как часто продлевать сессию в базе. Писать при каждом запросе незачем —
# ребёнок, проходящий урок, делает их десятки.
TOUCH_EVERY = timedelta(hours=1)


def now() -> datetime:
    return datetime.now(timezone.utc)


def _agent(request: Request | None) -> str | None:
    if request is None:
        return None
    return (request.headers.get('user-agent') or '')[:300] or None


def _ip(request: Request | None) -> str | None:
    if request is None or request.client is None:
        return None
    return request.client.host


def issue_for_user(
    db: Session, user: User, request: Request | None, *, shared_computer: bool = False
) -> tuple[str, int | None]:
    """Заводит сессию взрослого.

    Возвращает сам токен и срок жизни cookie. На общем компьютере cookie живёт
    до закрытия браузера (срок None), а сама сессия — смену, а не месяц: за
    библиотечным или школьным компьютером следующий человек не должен попасть
    в чужой аккаунт.
    """
    lifetime = (timedelta(hours=settings.session_hours_child) if shared_computer
                else timedelta(days=settings.session_days_adult))
    token = new_session_token()
    db.add(AuthSession(
        user_id=user.id,
        token_hash=token_fingerprint(token),
        expires_at=now() + lifetime,
        last_seen_at=now(),
        ip=_ip(request),
        user_agent=_agent(request),
    ))
    max_age = None if shared_computer else int(lifetime.total_seconds())
    return token, max_age


def issue_for_child(
    db: Session, child: Child, request: Request | None, *, shared_computer: bool = False
) -> tuple[str, int | None]:
    """Заводит сессию ребёнка.

    Срок всегда короткий — смена, а не месяц. За школьным компьютером через
    урок сядет другой ребёнок, и чужой аккаунт не должен остаться открытым.
    В отличие от взрослой, эта сессия не продлевается при работе: двенадцати
    часов хватает на любой учебный день, а дальше пусть входит заново.
    """
    lifetime = timedelta(hours=settings.session_hours_child)
    token = new_session_token()
    db.add(AuthSession(
        child_id=child.id,
        token_hash=token_fingerprint(token),
        expires_at=now() + lifetime,
        last_seen_at=now(),
        ip=_ip(request),
        user_agent=_agent(request),
    ))
    max_age = None if shared_computer else int(lifetime.total_seconds())
    return token, max_age


def set_cookie(response: Response, token: str, max_age: int | None) -> None:
    """Кладёт токен в cookie.

    httponly — страница не может прочитать её из JavaScript, значит подставленный
    на сайт чужой скрипт не уведёт вход. samesite=lax — браузер не приложит её к
    запросу, пришедшему с чужого сайта, и это закрывает подделку запросов.
    """
    response.set_cookie(
        settings.cookie_name,
        token,
        max_age=max_age,
        httponly=True,
        secure=settings.cookie_secure,
        samesite='lax',
        path='/',
    )


def clear_cookie(response: Response) -> None:
    response.delete_cookie(
        settings.cookie_name,
        httponly=True,
        secure=settings.cookie_secure,
        samesite='lax',
        path='/',
    )


def load(db: Session, token: str | None) -> AuthSession | None:
    """Находит живую сессию по токену. Просроченная и отозванная не считаются."""
    if not token:
        return None
    row = db.execute(
        select(AuthSession).where(AuthSession.token_hash == token_fingerprint(token))
    ).scalar_one_or_none()
    if row is None or row.revoked_at is not None or row.expires_at <= now():
        return None
    return row


def touch(db: Session, session: AuthSession) -> None:
    """Продлевает сессию: человек работает — пусть его не выкидывает посреди урока.

    Срок считается от последнего обращения, а не от входа. Запись в базу идёт
    не чаще раза в час, чтобы не писать на каждый запрос.
    """
    if session.last_seen_at and now() - session.last_seen_at < TOUCH_EVERY:
        return
    session.last_seen_at = now()
    # Продлеваем только сессии с длинным сроком: сессию на общем компьютере
    # растягивать нельзя, в том и смысл.
    full = timedelta(days=settings.session_days_adult)
    if session.user_id is not None and session.expires_at - session.last_seen_at < full:
        session.expires_at = session.last_seen_at + full


def revoke(db: Session, session: AuthSession) -> None:
    session.revoked_at = now()


def revoke_all_for_user(db: Session, user_id: uuid.UUID, keep: uuid.UUID | None = None) -> int:
    """Завершает все входы взрослого. keep — сессия, из которой пришёл запрос.

    Вызывается при смене и сбросе пароля: если аккаунтом успел воспользоваться
    чужой, его немедленно выкинет.
    """
    rows = db.execute(
        select(AuthSession).where(
            AuthSession.user_id == user_id,
            AuthSession.revoked_at.is_(None),
        )
    ).scalars().all()
    count = 0
    for row in rows:
        if keep is not None and row.id == keep:
            continue
        row.revoked_at = now()
        count += 1
    return count


def revoke_all_for_child(db: Session, child_id: uuid.UUID) -> int:
    """Выкидывает ребёнка со всех устройств: родитель сменил ему пароль."""
    rows = db.execute(
        select(AuthSession).where(
            AuthSession.child_id == child_id,
            AuthSession.revoked_at.is_(None),
        )
    ).scalars().all()
    for row in rows:
        row.revoked_at = now()
    return len(rows)
