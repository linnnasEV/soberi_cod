"""Что присылает браузер и что уходит обратно.

Через эти модели проходит всё, что приходит снаружи: длина, формат, границы
значений. До обработчика сырые данные не доходят — только уже проверенные.

Сообщения об ошибках написаны по-русски, потому что их увидит учитель или
родитель, а не разработчик.
"""

from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from .config import settings


class RegisterIn(BaseModel):
    """Регистрация взрослого. Роль «админ» здесь невозможна: её выдают с сервера."""

    role: Literal['parent', 'teacher']
    email: EmailStr
    password: str
    name: str = Field(min_length=1, max_length=80)

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
    roles: list[str]
    email_verified: bool


class OkOut(BaseModel):
    ok: bool = True
    message: str | None = None
