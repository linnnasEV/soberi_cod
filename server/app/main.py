"""Сервер платформы «СобериКод».

Отвечает за три вещи: кто вошёл, прогресс детей и занятия учителей. Самих
уроков и заданий здесь нет — вся учебная часть живёт в браузере, и это
сознательно: школа со слабым интернетом должна заниматься даже когда сервер
недоступен.

На сервере запускается через systemd, см. deploy/soberikod-api.service.
Для проверки на своём компьютере:
    uvicorn app.main:app --reload --port 8000
"""

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text as sql_text
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware

from .config import settings
from .db import get_db
from .routers import auth


class SecurityHeaders(BaseHTTPMiddleware):
    """Заголовки, которые нужны на каждом ответе API.

    no-store важнее, чем кажется: в ответах лежат имена детей и их прогресс, и
    задерживаться в кэше браузера или промежуточного прокси им незачем.
    """

    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'same-origin'
        return response


def create_app() -> FastAPI:
    # Документация и схема отключены: сервер не должен рассказывать о себе
    # больше, чем нужно сайту для работы.
    app = FastAPI(title='СобериКод', docs_url=None, redoc_url=None, openapi_url=None)
    app.add_middleware(SecurityHeaders)

    # Разрешение на запросы с другого домена нужно только при локальной
    # проверке: на сервере сайт и API живут на одном домене, и список пуст.
    if settings.cors_list:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_list,
            allow_credentials=True,
            allow_methods=['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
            allow_headers=['Content-Type', 'X-Requested-With'],
        )

    @app.get('/api/health')
    def health(db: Session = Depends(get_db)):
        """Живость сервера вместе с базой: без базы отвечать «ок» нечестно."""
        db.execute(sql_text('select 1'))
        return {'ok': True}

    app.include_router(auth.router)
    return app


app = create_app()
