"""Таблицы базы.

Устройство данных держится на двух правилах.

Первое: прогресс принадлежит ребёнку, а не занятию. Поэтому учитель, уходя из
школы и удаляя аккаунт, не стирает звёзды у тридцати детей.

Второе: ребёнок, зашедший на занятие по коду без аккаунта, живёт только внутри
этого занятия. Его записи привязаны к строке участника и уходят вместе с ней,
когда занятие или аккаунт учителя удаляются.

Отсюда следует вещь, которая при первом чтении выглядит странно: прогресс,
работы и награды ссылаются либо на ребёнка с аккаунтом, либо на участника
занятия — ровно на одного из двух. Это проверяет сама база ограничениями
с именами на _subject, а не код: забыть такую проверку в коде легко, обойти
её в базе нельзя.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    """Взрослый: администратор, учитель или родитель.

    Одна таблица на все три роли, потому что вход у них одинаковый — почта и
    пароль. Роль при этом набор, а не одно значение: учитель вполне может быть
    ещё и родителем своего ребёнка, и заводить ради этого второй аккаунт на тот
    же адрес незачем.

    Администратор не регистрируется сам: роль ему выдаёт консольная команда на
    сервере.
    """

    __tablename__ = 'users'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    surname: Mapped[str | None] = mapped_column(Text)
    # Кем взрослый приходится ребёнку: mother или father. У учителя пусто —
    # он приходит к детям в другой роли.
    family_role: Mapped[str | None] = mapped_column(Text)
    roles: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, server_default=text("'{}'::text[]"))
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'active'"))
    # Двухфакторка. Для администратора обязательна: один его пароль открывает
    # данные всех детей платформы.
    totp_secret: Mapped[str | None] = mapped_column(Text)
    failed_logins: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    children: Mapped[list['Child']] = relationship(
        back_populates='parent', cascade='all, delete-orphan', passive_deletes=True)
    workshops: Mapped[list['Workshop']] = relationship(
        back_populates='teacher', cascade='all, delete-orphan', passive_deletes=True)

    __table_args__ = (
        CheckConstraint("status in ('active', 'blocked')", name='users_status_known'),
        CheckConstraint("roles <@ ARRAY['admin', 'teacher', 'parent']::text[]", name='users_roles_known'),
        # Адрес всегда хранится в нижнем регистре: иначе Ivan@mail.ru и ivan@mail.ru
        # станут двумя разными аккаунтами.
        CheckConstraint('email = lower(email)', name='users_email_lower'),
        CheckConstraint("family_role is null or family_role in ('mother', 'father')",
                        name='users_family_role_known'),
    )


class Child(Base):
    """Ребёнок с аккаунтом: профиль ему создаёт родитель.

    Почты у ребёнка нет, значит опознаётся он только логином — поэтому логин
    уникален на всю платформу, а забытый пароль сбрасывает родитель, не почта.
    """

    __tablename__ = 'children'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    login: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    # Та же картинка, что платформа показывает в значке профиля.
    avatar: Mapped[str | None] = mapped_column(Text)
    # Ответ теста «Что мне интересно»: logic, create или tech.
    quiz_direction: Mapped[str | None] = mapped_column(Text)
    failed_logins: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    parent: Mapped['User'] = relationship(back_populates='children')

    __table_args__ = (
        CheckConstraint('login = lower(login)', name='children_login_lower'),
        Index('children_parent', 'parent_id'),
    )


class Workshop(Base):
    """Занятие учителя: то, что в интерфейсе называется «Урок».

    В коде это workshop, а не lesson, потому что «уроком» в платформе уже
    называется учебное задание внутри курса — steps-1, loops-2. Держать два
    смысла одного слова в одном файле — верный способ однажды списать звёзды
    не туда.

    Удаление аккаунта учителя уносит его занятия, а вместе с ними и записи
    гостей, заходивших по коду. Прогресс детей с аккаунтом при этом остаётся:
    в progress ссылка на занятие просто обнуляется.
    """

    __tablename__ = 'workshops'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    # «2 класс», «Разновозрастная группа» — отсюда берётся уровень сложности.
    grade: Mapped[str | None] = mapped_column(Text)
    join_code: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'draft'"))
    opened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    teacher: Mapped['User'] = relationship(back_populates='workshops')
    participants: Mapped[list['WorkshopParticipant']] = relationship(
        back_populates='workshop', cascade='all, delete-orphan', passive_deletes=True)

    __table_args__ = (
        CheckConstraint("status in ('draft', 'open', 'closed')", name='workshops_status_known'),
        # Код уникален только среди открытых занятий: иначе шестизначные коды
        # кончатся за год, а закрытое занятие всё равно никого не впускает.
        Index('workshops_open_code', 'join_code', unique=True,
              postgresql_where=text("status = 'open' and join_code is not null")),
        Index('workshops_teacher', 'teacher_id'),
    )


class WorkshopParticipant(Base):
    """Кто был на занятии: ребёнок с аккаунтом или гость, вписавший имя по коду.

    Гостю эта строка заменяет профиль — его звёзды, работы и награды ссылаются
    на неё. Поэтому у гостя ничего не остаётся после занятия, и это сознательно:
    родитель его не регистрировал и согласия на хранение данных не давал.
    """

    __tablename__ = 'workshop_participants'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workshop_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey('workshops.id', ondelete='CASCADE'), nullable=False)
    child_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey('children.id', ondelete='CASCADE'))
    guest_name: Mapped[str | None] = mapped_column(Text)
    guest_quiz_direction: Mapped[str | None] = mapped_column(Text)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    left_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    workshop: Mapped['Workshop'] = relationship(back_populates='participants')

    __table_args__ = (
        CheckConstraint('(child_id is null) <> (guest_name is null)', name='participants_subject'),
        # Один ребёнок с аккаунтом — одна строка на занятии. Гостей с пустым
        # child_id это не ограничивает: в PostgreSQL пустые значения считаются
        # разными, и два Миши на одном занятии уживутся.
        UniqueConstraint('workshop_id', 'child_id', name='participants_child_once'),
        Index('participants_workshop', 'workshop_id'),
        Index('participants_child', 'child_id'),
    )


class Progress(Base):
    """Звёзды и реакция по одному заданию.

    Запись идёт «лучший результат побеждает» — так же, как раньше работало
    слияние классов в браузере: прошёл урок на две звезды, потом на три —
    остаётся три, наоборот не бывает.
    """

    __tablename__ = 'progress'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    child_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey('children.id', ondelete='CASCADE'))
    participant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey('workshop_participants.id', ondelete='CASCADE'))
    course_id: Mapped[str] = mapped_column(Text, nullable=False)
    task_id: Mapped[str] = mapped_column(Text, nullable=False)
    stars: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default=text('0'))
    # Ответ на «Как тебе урок?»: 0 — пока не очень, 1 — нравится, 2 — очень.
    reaction: Mapped[int | None] = mapped_column(SmallInteger)
    # Где заработано: нужно для журнала учителя. Занятие удалили — звёзды
    # остались у ребёнка, ссылка обнулилась.
    workshop_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey('workshops.id', ondelete='SET NULL'))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        CheckConstraint('(child_id is null) <> (participant_id is null)', name='progress_subject'),
        CheckConstraint('stars between 0 and 3', name='progress_stars_range'),
        CheckConstraint('reaction is null or reaction between 0 and 2', name='progress_reaction_range'),
        Index('progress_child_task', 'child_id', 'course_id', 'task_id', unique=True,
              postgresql_where=text('child_id is not null')),
        Index('progress_guest_task', 'participant_id', 'course_id', 'task_id', unique=True,
              postgresql_where=text('participant_id is not null')),
        Index('progress_workshop', 'workshop_id'),
    )


class Project(Base):
    """Работа из Мастерской: собранная ребёнком программа."""

    __tablename__ = 'projects'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    child_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey('children.id', ondelete='CASCADE'))
    participant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey('workshop_participants.id', ondelete='CASCADE'))
    workshop_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey('workshops.id', ondelete='SET NULL'))
    title: Mapped[str | None] = mapped_column(Text)
    # Сама программа: тот же вид, в котором её хранит Мастерская в браузере.
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    # Номер, под которым работу знает браузер ребёнка. Нужен, чтобы повторная
    # отправка того же состояния не плодила копии одной и той же работы.
    local_id: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint('(child_id is null) <> (participant_id is null)', name='projects_subject'),
        Index('projects_child', 'child_id'),
        Index('projects_participant', 'participant_id'),
        Index('projects_child_local', 'child_id', 'local_id', unique=True,
              postgresql_where=text('child_id is not null and local_id is not null')),
        Index('projects_guest_local', 'participant_id', 'local_id', unique=True,
              postgresql_where=text('participant_id is not null and local_id is not null')),
    )


class Award(Base):
    """Награда за пройденный курс или особое достижение."""

    __tablename__ = 'awards'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    child_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey('children.id', ondelete='CASCADE'))
    participant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey('workshop_participants.id', ondelete='CASCADE'))
    code: Mapped[str] = mapped_column(Text, nullable=False)
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint('(child_id is null) <> (participant_id is null)', name='awards_subject'),
        Index('awards_child_code', 'child_id', 'code', unique=True,
              postgresql_where=text('child_id is not null')),
        Index('awards_guest_code', 'participant_id', 'code', unique=True,
              postgresql_where=text('participant_id is not null')),
    )


class AuthSession(Base):
    """Живая сессия. В базе лежит отпечаток токена, сам токен — только в cookie.

    Сессии хранятся в базе, а не подписанным токеном вроде JWT, по одной
    причине: подписанный токен нельзя отозвать. А отзывать нужно немедленно —
    родитель удалил профиль ребёнка, учитель сменил пароль, администратор
    заблокировал аккаунт. Здесь для этого достаточно одной строки.
    """

    __tablename__ = 'auth_sessions'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'))
    child_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey('children.id', ondelete='CASCADE'))
    # Сессия гостя, зашедшего на занятие по коду: живёт, пока живёт занятие.
    participant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey('workshop_participants.id', ondelete='CASCADE'))
    token_hash: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Адрес и браузер — чтобы человек видел в настройках, откуда он входил.
    ip: Mapped[str | None] = mapped_column(Text)
    user_agent: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        CheckConstraint(
            '(user_id is not null)::int + (child_id is not null)::int '
            '+ (participant_id is not null)::int = 1',
            name='sessions_subject'),
        Index('sessions_expires', 'expires_at'),
        Index('sessions_user', 'user_id'),
        Index('sessions_child', 'child_id'),
    )


class EmailToken(Base):
    """Одноразовая ссылка из письма: подтверждение почты или сброс пароля.

    В базе снова только отпечаток: даже заглянув в неё, письмо подделать нельзя.
    """

    __tablename__ = 'email_tokens'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    token_hash: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint("kind in ('verify', 'reset')", name='email_tokens_kind_known'),
        Index('email_tokens_user', 'user_id'),
    )


class LoginAttempt(Base):
    """Журнал попыток входа: по нему работает защита от перебора.

    У ребёнка пароль простой, а его логин знает сосед по классу. Так что
    ограничение попыток здесь не формальность, а единственное, что стоит между
    чужим аккаунтом и настойчивым третьеклассником.
    """

    __tablename__ = 'login_attempts'

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    # Что перебирают: email, child_login, join_code или ip.
    scope: Mapped[str] = mapped_column(Text, nullable=False)
    key: Mapped[str] = mapped_column(Text, nullable=False)
    ok: Mapped[bool] = mapped_column(Boolean, nullable=False)
    ip: Mapped[str | None] = mapped_column(Text)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        Index('login_attempts_lookup', 'scope', 'key', 'at'),
        Index('login_attempts_at', 'at'),
    )


class AuditEntry(Base):
    """Что делали с аккаунтами, занятиями и профилями детей.

    Ссылок на другие таблицы здесь нет нарочно. Запись «родитель удалил
    аккаунт» должна пережить само удаление аккаунта, иначе журнал исчезнет
    ровно в тот момент, когда он нужен. Поэтому вместо внешнего ключа —
    идентификатор и адрес в открытом виде.
    """

    __tablename__ = 'audit_log'

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    # user, child, guest или system
    actor_kind: Mapped[str | None] = mapped_column(Text)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    actor_label: Mapped[str | None] = mapped_column(Text)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    target_kind: Mapped[str | None] = mapped_column(Text)
    target_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    meta: Mapped[dict | None] = mapped_column(JSONB)
    ip: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        Index('audit_at', 'at'),
        Index('audit_target', 'target_kind', 'target_id'),
    )
