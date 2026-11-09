"""Подсчёт прогресса.

Вынесено в одно место нарочно: звёзды ребёнка видят он сам, его родитель и
учитель на занятии. Если считать их в трёх местах, однажды они разойдутся, и
объяснять ребёнку, почему у мамы в кабинете на две звезды меньше, будет
нечем.

Записи прогресса принадлежат либо ребёнку с аккаунтом (child_id), либо
участнику занятия без аккаунта (participant_id) — ровно одному из двух, это
проверяет сама база. Поэтому все функции здесь принимают то или другое.
"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Progress
from .schemas import ProgressOut


def _owner(child_id: uuid.UUID | None, participant_id: uuid.UUID | None):
    if (child_id is None) == (participant_id is None):
        raise ValueError('Нужен ровно один владелец прогресса')
    return (Progress.child_id == child_id) if child_id else (Progress.participant_id == participant_id)


def total_stars(
    db: Session,
    *,
    child_id: uuid.UUID | None = None,
    participant_id: uuid.UUID | None = None,
) -> int:
    return db.execute(
        select(func.coalesce(func.sum(Progress.stars), 0))
        .where(_owner(child_id, participant_id))
    ).scalar_one()


def view(
    db: Session,
    *,
    child_id: uuid.UUID | None = None,
    participant_id: uuid.UUID | None = None,
) -> ProgressOut:
    """Прогресс в том виде, в котором он всегда лежал в браузере.

    Ключ — «курс-задание», как в lessonKey на странице. Странице не придётся
    перекладывать данные из одного вида в другой, а значит и ошибаться при
    перекладывании.
    """
    rows = db.execute(
        select(Progress).where(_owner(child_id, participant_id))
    ).scalars().all()

    out = ProgressOut()
    for row in rows:
        key = f'{row.course_id}-{row.task_id}'
        out.progress[key] = row.stars
        if row.reaction is not None:
            out.reactions[key] = row.reaction
        out.stars += row.stars
    return out


def put(
    db: Session,
    *,
    course_id: str,
    task_id: str,
    stars: int,
    reaction: int | None,
    child_id: uuid.UUID | None = None,
    participant_id: uuid.UUID | None = None,
    workshop_id: uuid.UUID | None = None,
) -> None:
    """Записывает результат по заданию: лучший побеждает.

    Прошёл урок на две звезды, потом на три — остаётся три. Прошёл на три,
    потом кое-как на одну — остаётся три. Иначе ребёнок, вернувшийся к
    пройденному уроку просто поиграть, терял бы заработанное.

    Отношение к уроку, наоборот, всегда берётся последнее: это ответ на
    вопрос «как тебе урок?», и свежий честнее давнего.
    """
    row = db.execute(
        select(Progress).where(
            _owner(child_id, participant_id),
            Progress.course_id == course_id,
            Progress.task_id == task_id,
        )
    ).scalar_one_or_none()

    if row is None:
        db.add(Progress(
            child_id=child_id,
            participant_id=participant_id,
            course_id=course_id,
            task_id=task_id,
            stars=stars,
            reaction=reaction,
            workshop_id=workshop_id,
        ))
        return

    if stars > row.stars:
        row.stars = stars
    if reaction is not None:
        row.reaction = reaction
    if workshop_id is not None:
        row.workshop_id = workshop_id
