"""Вход и аккаунты взрослых: администратора, учителя, родителя.

Вход у всех троих одинаковый — почта и пароль, — поэтому и обработчики общие.
Роль решает не то, как человек входит, а что он видит после входа.

Отдельной защиты от подделки запросов с чужого сайта здесь нет, и это не
упущение. Cookie сессии помечена samesite=lax, то есть браузер не приложит её
к запросу, пришедшему со стороны. А обычной формой с чужой страницы сюда не
достучаться: все обработчики принимают только JSON и на форму ответят отказом,
ничего не сделав.
"""

from datetime import timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import audit, mail, progress, ratelimit, sessions
from ..config import settings
from ..db import get_db
from ..deps import current_session, current_user
from ..models import AuthSession, Child, EmailToken, User
from ..schemas import (
    ChangePasswordIn,
    ChildLoginIn,
    ChildMeOut,
    ConfirmIn,
    ForgotIn,
    LoginIn,
    MeOut,
    OkOut,
    RegisterIn,
    ResetIn,
    SessionOut,
    TokenIn,
)
from ..security import normalize_login
from ..security import (
    hash_password,
    needs_rehash,
    new_session_token,
    normalize_email,
    token_fingerprint,
    verify_password,
)

router = APIRouter(prefix='/api/auth', tags=['auth'])

VERIFY_LIFETIME = timedelta(days=1)
RESET_LIFETIME = timedelta(hours=1)

# Один и тот же ответ на неверный пароль и на несуществующий адрес: иначе по
# разнице ответов можно собрать список тех, кто зарегистрирован.
WRONG = 'Неверная почта или пароль'
# Ребёнку шести лет «неверные учётные данные» ничего не говорят, а вот
# «спроси взрослого» — понятный выход из положения.
WRONG_CHILD = 'Что-то не так. Проверь логин и пароль или спроси взрослого.'


def _me(user: User) -> MeOut:
    return MeOut(
        id=str(user.id),
        email=user.email,
        name=user.name,
        surname=user.surname,
        family_role=user.family_role,
        roles=list(user.roles or []),
        email_verified=user.email_verified_at is not None,
    )


def _find(db: Session, email: str) -> User | None:
    return db.execute(select(User).where(User.email == email)).scalar_one_or_none()


def _issue_email_token(db: Session, user: User, kind: str, lifetime: timedelta) -> str:
    """Новая ссылка из письма гасит все прежние неиспользованные того же вида.

    Иначе старое письмо, пролежавшее в почте неделю, осталось бы рабочим ключом
    к аккаунту.
    """
    old = db.execute(
        select(EmailToken).where(
            EmailToken.user_id == user.id,
            EmailToken.kind == kind,
            EmailToken.used_at.is_(None),
        )
    ).scalars().all()
    for row in old:
        row.used_at = sessions.now()

    token = new_session_token()
    db.add(EmailToken(
        user_id=user.id,
        kind=kind,
        token_hash=token_fingerprint(token),
        expires_at=sessions.now() + lifetime,
    ))
    return token


def _take_email_token(db: Session, kind: str, token: str) -> EmailToken:
    """Находит и сразу гасит код из письма: сработать он должен один раз."""
    row = db.execute(
        select(EmailToken).where(
            EmailToken.token_hash == token_fingerprint(token),
            EmailToken.kind == kind,
        )
    ).scalar_one_or_none()
    if row is None or row.used_at is not None or row.expires_at <= sessions.now():
        raise HTTPException(400, 'Ссылка устарела или уже использована. Запросите новую.')
    row.used_at = sessions.now()
    return row


@router.post('/register', response_model=MeOut, status_code=201)
def register(
    data: RegisterIn,
    request: Request,
    response: Response,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Регистрация учителя или родителя.

    О занятости адреса говорим прямо. По-хорошему это подсказывает постороннему,
    что такой человек у нас есть, — но альтернатива означает молчаливый отказ,
    в котором учитель не разберётся и решит, что сайт сломан. Адреса взрослых
    секретом не являются, понятность здесь важнее.
    """
    email = normalize_email(data.email)
    if _find(db, email) is not None:
        raise HTTPException(409, 'Этот адрес уже зарегистрирован. Войдите или восстановите пароль.')

    user = User(
        email=email,
        password_hash=hash_password(data.password),
        name=data.name,
        surname=data.surname,
        # «Мама» или «папа» — только у родителя: учитель приходит к детям
        # в другой роли, и спрашивать его об этом незачем.
        family_role=data.family_role if data.role == 'parent' else None,
        roles=[data.role],
    )
    # Без настроенной почты подтверждать адрес нечем, и аккаунт остался бы
    # навсегда неподтверждённым. Тогда считаем его подтверждённым сразу.
    if not settings.mail_enabled:
        user.email_verified_at = sessions.now()
    db.add(user)
    db.flush()

    if settings.mail_enabled:
        letter = _issue_email_token(db, user, 'verify', VERIFY_LIFETIME)
        background.add_task(mail.send_verification, user.email, user.name, letter)

    audit.log(db, 'register', actor_kind='user', actor_id=user.id, actor_label=user.email,
              meta={'role': data.role}, request=request)

    token, max_age = sessions.issue_for_user(db, user, request)
    sessions.set_cookie(response, token, max_age)
    db.commit()
    return _me(user)


@router.post('/login', response_model=MeOut)
def login(
    data: LoginIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    ratelimit.guard_ip(db, request)
    email = normalize_email(data.email)
    user = _find(db, email)

    if user is None:
        # Записываем попытку и только потом отказываем: выброшенная ошибка
        # откатывает незаписанное, и счётчик попыток пропал бы.
        ratelimit.record(db, 'email', email, False, request)
        db.commit()
        raise HTTPException(401, WRONG)

    ratelimit.ensure_not_locked(user)

    if not verify_password(user.password_hash, data.password):
        ratelimit.note_failure(db, user)
        ratelimit.record(db, 'email', email, False, request)
        audit.log(db, 'login_failed', actor_kind='user', actor_id=user.id,
                  actor_label=user.email, request=request)
        db.commit()
        raise HTTPException(401, WRONG)

    if user.status != 'active':
        ratelimit.record(db, 'email', email, False, request)
        db.commit()
        raise HTTPException(403, 'Аккаунт заблокирован. Напишите администратору платформы.')

    # Argon2 со временем настраивают строже. Пароль подошёл, он у нас в руках —
    # пересчитаем хеш по текущим правилам, другого случая не будет.
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(data.password)

    ratelimit.note_success(db, user)
    ratelimit.record(db, 'email', email, True, request)
    token, max_age = sessions.issue_for_user(
        db, user, request, shared_computer=data.shared_computer)
    sessions.set_cookie(response, token, max_age)
    audit.log(db, 'login', actor_kind='user', actor_id=user.id, actor_label=user.email,
              request=request)
    db.commit()
    return _me(user)


def _child_me(db: Session, child: Child) -> ChildMeOut:
    return ChildMeOut(
        id=str(child.id),
        display_name=child.display_name,
        avatar=child.avatar,
        quiz_direction=child.quiz_direction,
        stars=progress.total_stars(db, child_id=child.id),
    )


@router.post('/child/login', response_model=ChildMeOut)
def child_login(
    data: ChildLoginIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Вход ребёнка: простой логин и простой пароль, которые придумал родитель.

    Почты у ребёнка нет, значит нет и восстановления по письму: забытый
    пароль заново ставит родитель в своём кабинете.
    """
    ratelimit.guard_ip(db, request)
    login = normalize_login(data.login)
    child = db.execute(select(Child).where(Child.login == login)).scalar_one_or_none()

    if child is None:
        ratelimit.record(db, 'child_login', login, False, request)
        db.commit()
        raise HTTPException(401, WRONG_CHILD)

    ratelimit.ensure_not_locked(child)

    if not verify_password(child.password_hash, data.password):
        ratelimit.note_failure(db, child)
        ratelimit.record(db, 'child_login', login, False, request)
        audit.log(db, 'child_login_failed', actor_kind='child', actor_id=child.id,
                  actor_label=child.login, request=request)
        db.commit()
        raise HTTPException(401, WRONG_CHILD)

    if needs_rehash(child.password_hash):
        child.password_hash = hash_password(data.password)

    ratelimit.note_success(db, child)
    ratelimit.record(db, 'child_login', login, True, request)
    token, max_age = sessions.issue_for_child(
        db, child, request, shared_computer=data.shared_computer)
    sessions.set_cookie(response, token, max_age)
    audit.log(db, 'child_login', actor_kind='child', actor_id=child.id,
              actor_label=child.login, request=request)
    db.flush()
    out = _child_me(db, child)
    db.commit()
    return out


@router.get('/session', response_model=SessionOut)
def whoami(request: Request, db: Session = Depends(get_db)):
    """Кто за компьютером. Отвечает всегда, даже если не вошёл никто.

    Этим запросом страница начинает работу: по нему она решает, показывать
    кнопку «Войти» или имя со звёздами.
    """
    found = sessions.load(db, request.cookies.get(settings.cookie_name))
    out = SessionOut()
    if found is not None:
        sessions.touch(db, found)
        if found.user_id is not None:
            user = db.get(User, found.user_id)
            if user is not None and user.status == 'active':
                out.user = _me(user)
        elif found.child_id is not None:
            child = db.get(Child, found.child_id)
            if child is not None:
                out.child = _child_me(db, child)
    db.commit()
    return out


@router.post('/logout', response_model=OkOut)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    """Выход. Намеренно не требует живой сессии.

    Человек нажимает «Выйти», когда сессия уже могла истечь, и получить в этот
    момент «нужно войти» — издевательство. Cookie убираем в любом случае.
    """
    found = sessions.load(db, request.cookies.get(settings.cookie_name))
    if found is not None:
        sessions.revoke(db, found)
        kind = 'user' if found.user_id is not None else 'child'
        audit.log(db, 'logout', actor_kind=kind,
                  actor_id=found.user_id or found.child_id, request=request)
        db.commit()
    sessions.clear_cookie(response)
    return OkOut(message='Вы вышли')


@router.post('/logout-all', response_model=OkOut)
def logout_all(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Завершает входы на всех устройствах — если забыли выйти в чужом месте."""
    count = sessions.revoke_all_for_user(db, user.id)
    audit.log(db, 'logout_all', actor_kind='user', actor_id=user.id, actor_label=user.email,
              meta={'sessions': count}, request=request)
    db.commit()
    sessions.clear_cookie(response)
    return OkOut(message=f'Завершено входов: {count}')


@router.get('/me', response_model=MeOut)
def me(db: Session = Depends(get_db), user: User = Depends(current_user)):
    # Зависимость могла продлить сессию — сохраняем это.
    db.commit()
    return _me(user)


@router.post('/password/change', response_model=OkOut)
def change_password(
    data: ChangePasswordIn,
    request: Request,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    session: AuthSession = Depends(current_session),
):
    if not verify_password(user.password_hash, data.current_password):
        raise HTTPException(403, 'Текущий пароль указан неверно')

    user.password_hash = hash_password(data.new_password)
    # Остальные входы завершаем: если паролем успел воспользоваться чужой, он
    # вылетит немедленно. Текущий оставляем — человек не должен выйти сам из
    # себя, сменив пароль.
    count = sessions.revoke_all_for_user(db, user.id, keep=session.id)
    audit.log(db, 'password_change', actor_kind='user', actor_id=user.id,
              actor_label=user.email, meta={'revoked': count}, request=request)
    db.commit()
    background.add_task(mail.send_password_changed, user.email, user.name)
    return OkOut(message='Пароль изменён')


@router.post('/password/forgot', response_model=OkOut)
def forgot_password(
    data: ForgotIn,
    request: Request,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Ответ всегда одинаковый.

    Здесь, в отличие от регистрации, разницу скрывать обязательно: иначе форму
    восстановления можно превратить в проверялку «есть такой адрес или нет»,
    причём не входя на сайт.
    """
    email = normalize_email(data.email)
    user = _find(db, email)
    if user is not None and user.status == 'active':
        letter = _issue_email_token(db, user, 'reset', RESET_LIFETIME)
        background.add_task(mail.send_password_reset, user.email, user.name, letter)
        audit.log(db, 'password_forgot', actor_kind='user', actor_id=user.id,
                  actor_label=user.email, request=request)
    db.commit()
    return OkOut(message='Если такой адрес зарегистрирован, письмо уже отправлено.')


@router.post('/password/reset', response_model=OkOut)
def reset_password(
    data: ResetIn,
    request: Request,
    db: Session = Depends(get_db),
):
    """Новый пароль по ссылке из письма.

    После сброса завершаются все входы без исключения, и сюда же входит тот,
    кто мог знать старый пароль. Внутрь не пускаем: пусть человек войдёт
    заново и убедится, что новый пароль он действительно запомнил.
    """
    row = _take_email_token(db, 'reset', data.token)
    user = db.get(User, row.user_id)
    if user is None:
        raise HTTPException(400, 'Аккаунт не найден')

    user.password_hash = hash_password(data.password)
    user.failed_logins = 0
    user.locked_until = None
    # Сбросить пароль может только тот, у кого есть доступ к почте, —
    # значит адрес заодно и подтверждён.
    if user.email_verified_at is None:
        user.email_verified_at = sessions.now()
    count = sessions.revoke_all_for_user(db, user.id)
    audit.log(db, 'password_reset', actor_kind='user', actor_id=user.id,
              actor_label=user.email, meta={'revoked': count}, request=request)
    db.commit()
    return OkOut(message='Пароль изменён. Теперь войдите с новым паролем.')


@router.delete('/account', response_model=OkOut)
def delete_account(
    data: ConfirmIn,
    request: Request,
    response: Response,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Удаление своего аккаунта. Сразу и безвозвратно.

    У родителя вместе с аккаунтом уходят профили детей со всеми звёздами,
    работами и наградами — так устроены связи в базе. У учителя уходят его
    занятия; прогресс детей с аккаунтом при этом остаётся, он принадлежит
    им, а не ему.

    Пароль спрашиваем потому, что до открытого кабинета может добраться кто
    угодно, включая самого ребёнка, а отменить это уже нельзя. Письмо
    отправляем следом: если аккаунт удалил не хозяин, он хотя бы узнает.
    """
    if not verify_password(user.password_hash, data.password):
        raise HTTPException(403, 'Пароль указан неверно')

    email, name, roles = user.email, user.name, list(user.roles or [])
    children = len(user.children)

    db.delete(user)
    # В журнале запись переживёт удаление: внешних ключей на аккаунт у него нет.
    audit.log(db, 'account_delete', actor_kind='user', actor_id=user.id, actor_label=email,
              meta={'roles': roles, 'children': children}, request=request)
    db.commit()

    sessions.clear_cookie(response)
    background.add_task(mail.send_account_deleted, email, name)
    return OkOut(message='Аккаунт и все связанные данные удалены')


@router.post('/verify-email', response_model=OkOut)
def verify_email(data: TokenIn, request: Request, db: Session = Depends(get_db)):
    row = _take_email_token(db, 'verify', data.token)
    user = db.get(User, row.user_id)
    if user is None:
        raise HTTPException(400, 'Аккаунт не найден')
    if user.email_verified_at is None:
        user.email_verified_at = sessions.now()
    audit.log(db, 'email_verified', actor_kind='user', actor_id=user.id,
              actor_label=user.email, request=request)
    db.commit()
    return OkOut(message='Адрес подтверждён')


@router.post('/verify-email/resend', response_model=OkOut)
def resend_verification(
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if user.email_verified_at is not None:
        return OkOut(message='Адрес уже подтверждён')
    if not settings.mail_enabled:
        raise HTTPException(503, 'Почта на сервере не настроена')
    letter = _issue_email_token(db, user, 'verify', VERIFY_LIFETIME)
    db.commit()
    background.add_task(mail.send_verification, user.email, user.name, letter)
    return OkOut(message='Письмо отправлено')
