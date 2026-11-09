"""Что присылает браузер и что уходит обратно.

Через эти модели проходит всё, что приходит снаружи: длина, формат, границы
значений. До обработчика сырые данные не доходят — только уже проверенные.

Сообщения об ошибках написаны по-русски, потому что их увидит учитель или
родитель, а не разработчик.
"""

import re
import unicodedata
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from .config import settings


class RegisterIn(BaseModel):
    """Регистрация взрослого. Роль «админ» здесь невозможна: её выдают с сервера."""

    role: Literal['parent', 'teacher']
    email: EmailStr
    password: str
    surname: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=80)
    # Кем приходится ребёнку. Спрашиваем у родителя, у учителя не спрашиваем.
    family_role: Literal['mother', 'father'] | None = None

    @field_validator('surname')
    @classmethod
    def check_surname(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError('Напишите фамилию — хотя бы 2 буквы')
        return v

    @field_validator('password')
    @classmethod
    def check_password(cls, v: str) -> str:
        if len(v) < settings.password_min_length:
            raise ValueError(f'Пароль должен быть не короче {settings.password_min_length} знаков')
        if len(v) > 200:
            raise ValueError('Слишком длинный пароль')
        return v

    @field_validator('name')
    @classmethod
    def check_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError('Напишите имя — хотя бы 2 буквы')
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)
    # За школьным или библиотечным компьютером сессию незачем помнить месяц:
    # с этой галочкой cookie живёт до закрытия браузера.
    shared_computer: bool = False


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    password: str

    @field_validator('password')
    @classmethod
    def check_password(cls, v: str) -> str:
        if len(v) < settings.password_min_length:
            raise ValueError(f'Пароль должен быть не короче {settings.password_min_length} знаков')
        return v


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str

    @field_validator('new_password')
    @classmethod
    def check_password(cls, v: str) -> str:
        if len(v) < settings.password_min_length:
            raise ValueError(f'Пароль должен быть не короче {settings.password_min_length} знаков')
        return v


class TokenIn(BaseModel):
    """Одноразовый код из письма: подтверждение адреса."""

    token: str = Field(min_length=10, max_length=200)


class EmailIn(BaseModel):
    email: EmailStr


class MeOut(BaseModel):
    """Кто вошёл. Отдаётся браузеру, поэтому ничего лишнего здесь быть не должно."""

    kind: Literal['user'] = 'user'
    id: str
    email: str
    name: str
    surname: str | None = None
    family_role: str | None = None
    roles: list[str]
    email_verified: bool


class OkOut(BaseModel):
    ok: bool = True
    message: str | None = None


# ===== Дети =====

_LOGIN_ALLOWED = re.compile(r'^[a-zа-яё0-9._-]+$')
_LATIN = re.compile(r'[a-z]')
_CYRILLIC = re.compile(r'[а-яё]')


def clean_child_login(v: str) -> str:
    """Проверяет и приводит к единому виду логин ребёнка.

    Русские буквы разрешены нарочно: логин придумывает родитель, а набирает
    первоклассник, и «аня2017» он напечатает увереннее, чем «anya2017».

    А вот смешивать русские и латинские буквы в одном логине нельзя, и это
    не придирка к красоте. Русская «а» и латинская «a» на экране неотличимы,
    так что «аnya» и «anya» выглядели бы одинаково, оставаясь разными
    логинами. Ребёнок бы не понял, почему не входит, а взрослый мог бы завести
    такую пару нарочно, чтобы выдать себя за другого.
    """
    v = unicodedata.normalize('NFKC', v).strip().lower()
    if not 3 <= len(v) <= 20:
        raise ValueError('Логин — от 3 до 20 знаков')
    if not _LOGIN_ALLOWED.match(v):
        raise ValueError('В логине можно только буквы, цифры, точку, дефис и подчёркивание')
    has_latin, has_cyrillic = bool(_LATIN.search(v)), bool(_CYRILLIC.search(v))
    if not (has_latin or has_cyrillic):
        raise ValueError('В логине должна быть хотя бы одна буква')
    if has_latin and has_cyrillic:
        raise ValueError('Логин должен быть целиком русским или целиком латинским')
    return v


def _check_child_password(v: str) -> str:
    least = settings.child_password_min_length
    if len(v) < least:
        raise ValueError(f'Пароль ребёнка — не короче {least} знаков')
    if len(v) > 100:
        raise ValueError('Слишком длинный пароль')
    return v


class ChildCreateIn(BaseModel):
    display_name: str = Field(min_length=2, max_length=40)
    login: str
    password: str
    # Картинка профиля — тот же значок, что платформа показывает рядом с именем.
    avatar: str | None = Field(default=None, max_length=8)

    @field_validator('login')
    @classmethod
    def check_login(cls, v: str) -> str:
        return clean_child_login(v)

    @field_validator('password')
    @classmethod
    def check_password(cls, v: str) -> str:
        return _check_child_password(v)


class ChildPatchIn(BaseModel):
    display_name: str | None = Field(default=None, min_length=2, max_length=40)
    avatar: str | None = Field(default=None, max_length=8)


class ChildPasswordIn(BaseModel):
    password: str

    @field_validator('password')
    @classmethod
    def check_password(cls, v: str) -> str:
        return _check_child_password(v)


class ConfirmIn(BaseModel):
    """Подтверждение своим паролем для того, что нельзя отменить."""

    password: str = Field(min_length=1, max_length=200)


class ChildLoginIn(BaseModel):
    login: str = Field(min_length=1, max_length=40)
    password: str = Field(min_length=1, max_length=100)
    shared_computer: bool = False


class ChildOut(BaseModel):
    id: str
    display_name: str
    login: str
    avatar: str | None
    quiz_direction: str | None
    stars: int


class ChildMeOut(BaseModel):
    kind: Literal['child'] = 'child'
    id: str
    display_name: str
    avatar: str | None
    quiz_direction: str | None
    stars: int


class SessionOut(BaseModel):
    """Кто сейчас за компьютером — одним запросом.

    Страница при открытии не знает, вошёл ли кто-нибудь и кто именно, а
    спрашивать по очереди «а взрослый?», «а ребёнок?» — лишний повод
    ошибиться. Здесь оба поля пустые, если не вошёл никто.
    """

    user: MeOut | None = None
    child: ChildMeOut | None = None


class LoginFreeOut(BaseModel):
    login: str
    free: bool
    # Если занят — несколько свободных вариантов, чтобы родитель не гадал.
    suggestions: list[str] = []


# ===== Прогресс и работы =====

class ProgressIn(BaseModel):
    course_id: str = Field(min_length=1, max_length=40)
    task_id: str = Field(min_length=1, max_length=40)
    stars: int = Field(ge=0, le=3)
    # Ответ на «Как тебе урок?»: 0 — пока не очень, 1 — нравится, 2 — очень.
    reaction: int | None = Field(default=None, ge=0, le=2)


class ProgressOut(BaseModel):
    """Тот же вид, в котором прогресс всегда лежал в браузере: ключ «курс-задание».

    Сделано так нарочно: странице не придётся перекладывать данные из одного
    вида в другой, а значит и ошибаться при перекладывании.
    """

    progress: dict[str, int] = {}
    reactions: dict[str, int] = {}
    stars: int = 0


class ProjectIn(BaseModel):
    title: str | None = Field(default=None, max_length=60)
    payload: dict


class ProjectOut(BaseModel):
    id: str
    title: str | None
    payload: dict
    created_at: str


class QuizIn(BaseModel):
    direction: Literal['logic', 'create', 'tech']


class StateProject(BaseModel):
    """Работа из Мастерской в том виде, в каком её знает браузер."""

    id: str = Field(min_length=1, max_length=40)
    title: str | None = Field(default=None, max_length=60)
    payload: dict


class StateIn(BaseModel):
    """Всё, что страница знает о ребёнке, одной посылкой.

    Так сделано не от широты душевной, а чтобы не переписывать уроки и
    Мастерскую. Игровой код платформы складывает звёзды и работы в один
    объект профиля, как делал это годом раньше в браузере; отправка целиком
    позволяет оставить его нетронутым. Заодно это переживает отсутствие
    интернета: вернулась сеть — ушло всё накопленное, а не по кусочку.
    """

    progress: dict[str, int] = {}
    reactions: dict[str, int] = {}
    quiz: Literal['logic', 'create', 'tech'] | None = None
    awards: list[str] = []
    projects: list[StateProject] = []


class StateOut(BaseModel):
    progress: dict[str, int] = {}
    reactions: dict[str, int] = {}
    quiz: str | None = None
    awards: list[str] = []
    projects: list[StateProject] = []
    stars: int = 0


class AwardIn(BaseModel):
    code: str = Field(min_length=1, max_length=40)
