"""Настройки сервера.

Всё, что отличается от машины к машине, читается из переменных окружения, а не
из файлов репозитория: репозиторий открытый, и пароль базы или почты в нём
оказаться не должен. На сервере переменные лежат в /etc/soberikod/api.env —
его читает systemd, а доступ к нему есть только служебному пользователю.

Имена начинаются с SOBERIKOD_, как у прежнего сервера синхронизации: незачем
плодить соглашения там, где одно уже есть.
"""

from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix='SOBERIKOD_', extra='ignore')

    # ===== База =====
    database_url: str = 'postgresql+psycopg://soberikod@localhost:5432/soberikod'

    # ===== Сайт =====
    # По этому адресу собираются ссылки в письмах («подтвердите почту»).
    site_origin: str = 'https://xn--90agcmkuenf.xn--p1ai'
    # Домены, которым разрешено обращаться к API из браузера. Пусто означает,
    # что сайт и API на одном домене и разрешение не нужно: это рабочий случай.
    cors_origins: str = ''

    # ===== Сессии =====
    # Переключатель нужен только для проверки на своём компьютере без TLS:
    # на сервере cookie обязана быть secure, иначе её можно подслушать.
    cookie_secure: bool = True
    cookie_name: str = 'soberikod_session'
    # Взрослому неудобно входить каждый день — месяц со скользящим продлением.
    session_days_adult: int = 30
    # Ребёнку — смена, не больше: за школьным компьютером через урок сядет другой,
    # и чужой аккаунт не должен остаться открытым.
    session_hours_child: int = 12

    # ===== Пароли =====
    password_min_length: int = 10
    # У ребёнка пароль простой по определению, поэтому его защищает не длина,
    # а ограничение числа попыток входа.
    child_password_min_length: int = 4
    login_max_failures: int = 10
    login_lock_minutes: int = 15

    # ===== Почта =====
    smtp_host: str = ''
    smtp_port: int = 465
    smtp_user: str = ''
    smtp_password: SecretStr = SecretStr('')
    smtp_from: str = ''
    smtp_from_name: str = 'СобериКод'

    @property
    def mail_enabled(self) -> bool:
        """Без настроенной почты сервер работает, но не умеет сбрасывать пароли."""
        return bool(self.smtp_host and self.smtp_from)

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(',') if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
