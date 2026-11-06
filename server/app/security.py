"""Пароли, токены сессий и коды подключения к занятию.

Ни один секрет здесь не хранится в открытом виде: пароль превращается в хеш
Argon2id, токен сессии — в отпечаток SHA-256. Если база однажды утечёт, по ней
нельзя будет ни войти, ни узнать чей-то пароль.
"""

import hashlib
import hmac
import secrets
import unicodedata

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

# Параметры подобраны под небольшой VPS: 64 МБ памяти и три прохода на одну
# проверку. Вход человека от этого занимает доли секунды, а перебор на
# видеокартах дорожает в тысячи раз.
_hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=2, hash_len=32, salt_len=16)

# Алфавит без похожих друг на друга знаков: код занятия учитель пишет на доске,
# и «0» против «O» или «1» против «l» там недопустимы.
CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'


def hash_password(plain: str) -> str:
    return _hasher.hash(plain)


def verify_password(stored_hash: str, plain: str) -> bool:
    try:
        return _hasher.verify(stored_hash, plain)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(stored_hash: str) -> bool:
    """Параметры Argon2 со временем усиливаются — старый хеш пересчитываем при входе."""
    try:
        return _hasher.check_needs_rehash(stored_hash)
    except InvalidHashError:
        return False


def new_session_token() -> str:
    """Секрет сессии: 32 случайных байта. В базу он не попадает, только отпечаток."""
    return secrets.token_urlsafe(32)


def token_fingerprint(token: str) -> str:
    """Отпечаток токена для базы.

    Хеш здесь без соли и без Argon2 нарочно: токен и так случайный, перебирать
    его бессмысленно, а проверять отпечаток нужно на каждом запросе — медленный
    хеш превратил бы это в тормоз на ровном месте.
    """
    return hashlib.sha256(('soberikod:' + token).encode()).hexdigest()


def fingerprints_equal(a: str, b: str) -> bool:
    """Сравнение за постоянное время: по скорости ответа ничего не узнать."""
    return hmac.compare_digest(a, b)


def new_join_code(length: int = 6) -> str:
    return ''.join(secrets.choice(CODE_ALPHABET) for _ in range(length))


def normalize_email(email: str) -> str:
    """Адрес пишут то с заглавной, то с пробелом в конце — приводим к одному виду,
    иначе один человек заведёт себе два аккаунта и не поймёт, почему не входит."""
    return email.strip().lower()


def normalize_login(login: str) -> str:
    """Логин ребёнка: без регистра и без разных форм записи одних и тех же знаков."""
    return unicodedata.normalize('NFKC', login).strip().lower()
