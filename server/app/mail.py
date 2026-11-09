"""Отправка писем.

Письмо уходит фоновой задачей: медленный почтовый сервер не должен задерживать
ответ браузеру. Если почта не настроена, письма просто не отправляются — сервер
при этом работает, но «забыл пароль» перестаёт работать сам по себе.

Код из письма попадает в ссылку после решётки: https://адрес/#verify=КОД.
Это не мелочь — то, что идёт после решётки, браузер на сервер не отправляет.
Значит код не окажется ни в журнале обращений nginx, ни в заголовке Referer
при переходе на чужой сайт. Читает его страница сама и отправляет обратно
отдельным запросом.
"""

import logging
import smtplib
import ssl
from email.message import EmailMessage

from .config import settings

log = logging.getLogger('soberikod.mail')


def send(to: str, subject: str, body: str) -> None:
    if not settings.mail_enabled:
        log.warning('Почта не настроена, письмо «%s» для %s не отправлено', subject, to)
        return

    msg = EmailMessage()
    msg['From'] = f'{settings.smtp_from_name} <{settings.smtp_from}>'
    msg['To'] = to
    msg['Subject'] = subject
    msg.set_content(body)

    try:
        with smtplib.SMTP_SSL(
            settings.smtp_host,
            settings.smtp_port,
            context=ssl.create_default_context(),
            timeout=20,
        ) as server:
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password.get_secret_value())
            server.send_message(msg)
    except Exception:
        # Письмо не ушло — это повод для записи в журнал сервера, но не повод
        # показывать посетителю ошибку: он всё равно ничего с ней не сделает,
        # а по разнице в ответах можно было бы выяснять, есть ли такой адрес.
        log.exception('Не удалось отправить письмо на %s', to)


def send_verification(to: str, name: str, token: str) -> None:
    send(to, 'СобериКод: подтвердите адрес почты',
         f'Здравствуйте, {name}!\n\n'
         f'Вы зарегистрировались на платформе «СобериКод». Чтобы подтвердить адрес, '
         f'откройте ссылку:\n\n'
         f'{settings.site_origin}/#verify={token}\n\n'
         f'Ссылка действует сутки. Если вы не регистрировались, просто удалите это письмо.\n')


def send_password_reset(to: str, name: str, token: str) -> None:
    send(to, 'СобериКод: восстановление пароля',
         f'Здравствуйте, {name}!\n\n'
         f'Кто-то попросил сбросить пароль для этого адреса. Если это были вы, '
         f'откройте ссылку и задайте новый пароль:\n\n'
         f'{settings.site_origin}/#reset={token}\n\n'
         f'Ссылка действует час и срабатывает один раз. Если это были не вы — '
         f'ничего делать не нужно, пароль останется прежним.\n')


def send_password_changed(to: str, name: str) -> None:
    """Уведомление постфактум: если пароль сменил не хозяин аккаунта, он узнает об этом."""
    send(to, 'СобериКод: пароль изменён',
         f'Здравствуйте, {name}!\n\n'
         f'Пароль от вашего аккаунта только что изменили, и все входы на других '
         f'устройствах завершены.\n\n'
         f'Если это были не вы — немедленно восстановите пароль на '
         f'{settings.site_origin} и напишите нам.\n')
