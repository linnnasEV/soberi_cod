"""Обмен состоянием ребёнка целиком.

Страница отправляет всё, что знает о ребёнке — звёзды, отношение к урокам,
работы, награды, результат теста, — и получает обратно слитое. Одной
посылкой, а не по кусочку на каждое событие.

Так сделано по двум причинам.

Первая: игровой код платформы — уроки и Мастерская — складывает всё в один
объект профиля, как делал это и раньше, когда сервера не было вовсе. Обмен
целиком позволяет не трогать ни строки в этом коде, а значит и не внести
туда ошибку.

Вторая: это переживает пропажу интернета. В сельской школе связь отваливается
посреди урока; вернулась — ушло всё накопленное разом, а не половина.

Слияние устроено так же, как когда-то слияние классов из файла: по каждому
заданию остаётся лучший результат, награды складываются. Работы — исключение:
их список берётся от страницы целиком, иначе удалённая ребёнком работа
возвращалась бы при следующем обмене.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Award, Child, Progress, Project, WorkshopParticipant
from .schemas import StateIn, StateOut, StateProject

MAX_PROJECTS = 60
MAX_PROJECT_BYTES = 200_000


def _ids(child: Child | None, participant: WorkshopParticipant | None):
    if (child is None) == (participant is None):
        raise ValueError('Нужен ровно один владелец состояния')
    return (child.id if child else None), (participant.id if participant else None)


def _owner(child_id, participant_id, model):
    return (model.child_id == child_id) if child_id else (model.participant_id == participant_id)


def read(
    db: Session,
    *,
    child: Child | None = None,
    participant: WorkshopParticipant | None = None,
) -> StateOut:
    child_id, participant_id = _ids(child, participant)
    out = StateOut(quiz=child.quiz_direction if child else participant.guest_quiz_direction)

    for row in db.execute(
        select(Progress).where(_owner(child_id, participant_id, Progress))
    ).scalars():
        key = f'{row.course_id}-{row.task_id}'
        out.progress[key] = row.stars
        if row.reaction is not None:
            out.reactions[key] = row.reaction
        out.stars += row.stars

    out.awards = list(db.execute(
        select(Award.code).where(_owner(child_id, participant_id, Award))
    ).scalars())

    out.projects = [
        StateProject(id=row.local_id or str(row.id), title=row.title, payload=row.payload)
        for row in db.execute(
            select(Project)
            .where(_owner(child_id, participant_id, Project))
            .order_by(Project.created_at.desc())
        ).scalars()
    ]
    return out


def merge(
    db: Session,
    data: StateIn,
    *,
    child: Child | None = None,
    participant: WorkshopParticipant | None = None,
    workshop_id: uuid.UUID | None = None,
) -> StateOut:
    child_id, participant_id = _ids(child, participant)

    # ===== Звёзды и отношение к урокам: лучший результат побеждает =====
    have = {
        f'{row.course_id}-{row.task_id}': row
        for row in db.execute(
            select(Progress).where(_owner(child_id, participant_id, Progress))
        ).scalars()
    }
    keys = set(data.progress) | set(data.reactions)
    for key in keys:
        if '-' not in key:
            continue
        course_id, _, task_id = key.partition('-')
        stars = max(0, min(3, int(data.progress.get(key, 0))))
        reaction = data.reactions.get(key)
        if reaction is not None:
            reaction = max(0, min(2, int(reaction)))

        row = have.get(key)
        if row is None:
            db.add(Progress(
                child_id=child_id, participant_id=participant_id,
                course_id=course_id[:40], task_id=task_id[:40],
                stars=stars, reaction=reaction, workshop_id=workshop_id,
            ))
            continue
        if stars > row.stars:
            row.stars = stars
        if reaction is not None:
            row.reaction = reaction
        if workshop_id is not None:
            row.workshop_id = workshop_id

    # ===== Награды складываются =====
    known = set(db.execute(
        select(Award.code).where(_owner(child_id, participant_id, Award))
    ).scalars())
    for code in data.awards:
        if code and code not in known:
            db.add(Award(child_id=child_id, participant_id=participant_id, code=code[:40]))
            known.add(code)

    # ===== Результат теста: берём присланный, если он есть =====
    if data.quiz:
        if child is not None:
            child.quiz_direction = data.quiz
        else:
            participant.guest_quiz_direction = data.quiz

    # ===== Работы: список страницы считается полным =====
    # Иначе удалённая ребёнком работа возвращалась бы при следующем обмене.
    sent = {p.id: p for p in data.projects[:MAX_PROJECTS]}
    for row in db.execute(
        select(Project).where(_owner(child_id, participant_id, Project))
    ).scalars().all():
        key = row.local_id or str(row.id)
        fresh = sent.pop(key, None)
        if fresh is None:
            db.delete(row)
            continue
        row.title = fresh.title
        row.payload = fresh.payload

    for key, fresh in sent.items():
        db.add(Project(
            child_id=child_id, participant_id=participant_id, workshop_id=workshop_id,
            local_id=key, title=fresh.title, payload=fresh.payload,
        ))

    db.flush()
    return read(db, child=child, participant=participant)
