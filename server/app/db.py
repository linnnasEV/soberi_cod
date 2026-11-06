"""Подключение к базе.

Работа с базой нарочно синхронная. Нагрузка у платформы школьная — десятки
запросов в минуту даже при полном компьютерном классе, — а синхронный код
проще читать и отлаживать. Поэтому обработчики запросов объявляются обычным
def, а не async def: FastAPI выполнит их в отдельном потоке и сервер при этом
не встанет.
"""

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from .config import settings

engine = create_engine(
    settings.database_url,
    # Соединение могло умереть, пока сервер простаивал ночью: проверяем перед выдачей,
    # иначе первый утренний запрос получит ошибку вместо ответа.
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=5,
)

SessionFactory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """Сессия на один запрос: при любой ошибке откатывается, в конце закрывается."""
    db = SessionFactory()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
