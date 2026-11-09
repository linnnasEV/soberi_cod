"""Кто сейчас вошёл.

Эти зависимости подставляются в обработчики запросов. Смысл в том, чтобы
проверка доступа была не строчкой внутри обработчика, которую легко забыть
написать, а условием попадания в него.
"""

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from . import sessions
from .config import settings
from .db import get_db
from .models import AuthSession, Child, User


def current_session(request: Request, db: Session = Depends(get_db)) -> AuthSession:
    token = request.cookies.get(settings.cookie_name)
    found = sessions.load(db, token)
    if found is None:
        raise HTTPException(401, 'Нужно войти')
    sessions.touch(db, found)
    return found


def current_user(
    db: Session = Depends(get_db),
    session: AuthSession = Depends(current_session),
) -> User:
    if session.user_id is None:
        raise HTTPException(403, 'Это действие доступно только взрослому аккаунту')
    user = db.get(User, session.user_id)
    if user is None:
        raise HTTPException(401, 'Нужно войти')
    if user.status != 'active':
        raise HTTPException(403, 'Аккаунт заблокирован')
    return user


def current_child(
    db: Session = Depends(get_db),
    session: AuthSession = Depends(current_session),
) -> Child:
    if session.child_id is None:
        raise HTTPException(403, 'Это действие для профиля ребёнка')
    child = db.get(Child, session.child_id)
    if child is None:
        raise HTTPException(401, 'Нужно войти')
    return child


def require_role(*roles: str):
    """Пускает только обладателя одной из перечисленных ролей.

    Администратор отдельно нигде не перечисляется: если нужно дать ему доступ,
    роль 'admin' указывается в списке явно. Молчаливого «админу можно всё»
    здесь нет нарочно — такие правила потом невозможно проверить глазами.
    """

    def dependency(user: User = Depends(current_user)) -> User:
        if not set(roles) & set(user.roles or []):
            raise HTTPException(403, 'Недостаточно прав')
        return user

    return dependency
