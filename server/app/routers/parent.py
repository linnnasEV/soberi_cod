"""Родитель: профили своих детей.

Правило здесь одно: родитель видит и меняет только своих детей. Проверка
стоит не отдельной строчкой в каждом обработчике, где её легко забыть, а в
функции _child_of, через которую проходят все.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import audit, progress, sessions
from ..db import get_db
from ..deps import require_role
from ..models import Child, User
from ..schemas import (
    ChildCreateIn,
    ChildOut,
    ChildPasswordIn,
    ChildPatchIn,
    ConfirmIn,
    LoginFreeOut,
    OkOut,
    ProgressOut,
    clean_child_login,
)
from ..security import hash_password, verify_password

router = APIRouter(prefix='/api/parent', tags=['parent'])

# Предел на число детей в одном аккаунте. Он не про семьи — это защита от
# того, чтобы одной регистрацией не наделали тысячу профилей.
MAX_CHILDREN = 20


def _out(db: Session, child: Child) -> ChildOut:
    return ChildOut(
        id=str(child.id),
        display_name=child.display_name,
        login=child.login,
        avatar=child.avatar,
        quiz_direction=child.quiz_direction,
        stars=progress.total_stars(db, child_id=child.id),
    )


def _child_of(db: Session, parent: User, child_id: uuid.UUID) -> Child:
    child = db.get(Child, child_id)
    if child is None or child.parent_id != parent.id:
        # Один ответ и на «нет такого», и на «чужой ребёнок»: иначе по разнице
        # ответов можно нащупать чужие профили, перебирая идентификаторы.
        raise HTTPException(404, 'Профиль не найден')
    return child


def _login_taken(db: Session, login: str) -> bool:
    return db.execute(select(Child.id).where(Child.login == login)).first() is not None


def _suggest(db: Session, login: str, count: int = 3) -> list[str]:
    """Свободные варианты занятого логина, чтобы родитель не гадал наугад."""
    found: list[str] = []
    number = 2
    while len(found) < count and number < 60:
        candidate = f'{login[:17]}{number}'
        if not _login_taken(db, candidate):
            found.append(candidate)
        number += 1
    return found


@router.get('/children', response_model=list[ChildOut])
def list_children(
    db: Session = Depends(get_db),
    parent: User = Depends(require_role('parent')),
):
    rows = db.execute(
        select(Child).where(Child.parent_id == parent.id).order_by(Child.display_name)
    ).scalars().all()
    db.commit()
    return [_out(db, child) for child in rows]


@router.get('/children/login-free', response_model=LoginFreeOut)
def login_free(
    login: str,
    db: Session = Depends(get_db),
    parent: User = Depends(require_role('parent')),
):
    """Проверка логина до создания профиля: придумывать вслепую неудобно."""
    try:
        cleaned = clean_child_login(login)
    except ValueError as err:
        raise HTTPException(400, str(err)) from err
    taken = _login_taken(db, cleaned)
    db.commit()
    return LoginFreeOut(
        login=cleaned,
        free=not taken,
        suggestions=_suggest(db, cleaned) if taken else [],
    )


@router.post('/children', response_model=ChildOut, status_code=201)
def create_child(
    data: ChildCreateIn,
    request: Request,
    db: Session = Depends(get_db),
    parent: User = Depends(require_role('parent')),
):
    count = len(db.execute(
        select(Child.id).where(Child.parent_id == parent.id)
    ).all())
    if count >= MAX_CHILDREN:
        raise HTTPException(400, f'Больше {MAX_CHILDREN} профилей в одном аккаунте не бывает')

    if _login_taken(db, data.login):
        raise HTTPException(409, 'Такой логин уже занят. Выберите другой.')

    child = Child(
        parent_id=parent.id,
        display_name=data.display_name,
        login=data.login,
        password_hash=hash_password(data.password),
        avatar=data.avatar,
    )
    db.add(child)
    db.flush()
    audit.log(db, 'child_create', actor_kind='user', actor_id=parent.id,
              actor_label=parent.email, target_kind='child', target_id=child.id,
              request=request)
    db.commit()
    return _out(db, child)


@router.patch('/children/{child_id}', response_model=ChildOut)
def update_child(
    child_id: uuid.UUID,
    data: ChildPatchIn,
    db: Session = Depends(get_db),
    parent: User = Depends(require_role('parent')),
):
    """Меняется имя и картинка. Логин не меняется: по нему ребёнок входит,
    и менять его взрослому «на ходу» значит однажды запереть ребёнка снаружи."""
    child = _child_of(db, parent, child_id)
    if data.display_name is not None:
        child.display_name = data.display_name
    if data.avatar is not None:
        child.avatar = data.avatar
    db.commit()
    return _out(db, child)


@router.post('/children/{child_id}/password', response_model=OkOut)
def set_child_password(
    child_id: uuid.UUID,
    data: ChildPasswordIn,
    request: Request,
    db: Session = Depends(get_db),
    parent: User = Depends(require_role('parent')),
):
    """Ребёнок забыл пароль — новый ставит родитель. Почты у ребёнка нет,
    поэтому других способов восстановления здесь быть не может."""
    child = _child_of(db, parent, child_id)
    child.password_hash = hash_password(data.password)
    child.failed_logins = 0
    child.locked_until = None
    count = sessions.revoke_all_for_child(db, child.id)
    audit.log(db, 'child_password', actor_kind='user', actor_id=parent.id,
              actor_label=parent.email, target_kind='child', target_id=child.id,
              meta={'revoked': count}, request=request)
    db.commit()
    return OkOut(message='Новый пароль задан')


@router.get('/children/{child_id}/progress', response_model=ProgressOut)
def child_progress(
    child_id: uuid.UUID,
    db: Session = Depends(get_db),
    parent: User = Depends(require_role('parent')),
):
    child = _child_of(db, parent, child_id)
    out = progress.view(db, child_id=child.id)
    db.commit()
    return out


@router.delete('/children/{child_id}', response_model=OkOut)
def delete_child(
    child_id: uuid.UUID,
    data: ConfirmIn,
    request: Request,
    db: Session = Depends(get_db),
    parent: User = Depends(require_role('parent')),
):
    """Удаление профиля ребёнка. Сразу и безвозвратно.

    Вместе с профилем уходят звёзды, работы из Мастерской, награды и записи
    об участии в занятиях — так устроены связи в базе. Поэтому требуем пароль
    родителя: нажать не туда может и ребёнок, добравшийся до открытого
    родительского кабинета, а восстановить будет нечего.
    """
    child = _child_of(db, parent, child_id)
    if not verify_password(parent.password_hash, data.password):
        raise HTTPException(403, 'Пароль указан неверно')

    name, login = child.display_name, child.login
    db.delete(child)
    audit.log(db, 'child_delete', actor_kind='user', actor_id=parent.id,
              actor_label=parent.email, target_kind='child', target_id=child_id,
              meta={'name': name, 'login': login}, request=request)
    db.commit()
    return OkOut(message=f'Профиль «{name}» удалён')
