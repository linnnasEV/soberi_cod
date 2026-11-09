"""Ребёнок: свой прогресс, работы из Мастерской и награды.

Ничего чужого отсюда не видно и не меняется: все запросы работают только с
тем профилем, под которым вошли. Идентификатор ребёнка в адресе нигде не
передаётся — именно чтобы не было соблазна подставить чужой.
"""

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import progress, state
from ..db import get_db
from ..deps import current_child
from ..models import Award, Child, Project
from ..schemas import (
    AwardIn,
    ChildMeOut,
    OkOut,
    ProgressIn,
    ProgressOut,
    ProjectIn,
    ProjectOut,
    QuizIn,
    StateIn,
    StateOut,
)

router = APIRouter(prefix='/api/child', tags=['child'])

# Пределы на хранимое. Они не про жадность, а про то, что одна сломавшаяся
# страница не должна за ночь забить базу тысячей пустых работ.
MAX_PROJECTS = 60
MAX_PROJECT_BYTES = 200_000


def _me(db: Session, child: Child) -> ChildMeOut:
    return ChildMeOut(
        id=str(child.id),
        display_name=child.display_name,
        avatar=child.avatar,
        quiz_direction=child.quiz_direction,
        stars=progress.total_stars(db, child_id=child.id),
    )


def _project_out(row: Project) -> ProjectOut:
    return ProjectOut(
        id=str(row.id),
        title=row.title,
        payload=row.payload,
        created_at=row.created_at.isoformat(),
    )


@router.get('/me', response_model=ChildMeOut)
def me(db: Session = Depends(get_db), child: Child = Depends(current_child)):
    out = _me(db, child)
    db.commit()
    return out


@router.get('/state', response_model=StateOut)
def get_state(db: Session = Depends(get_db), child: Child = Depends(current_child)):
    """Всё о ребёнке одним запросом — этим страница начинает работу после входа."""
    out = state.read(db, child=child)
    db.commit()
    return out


@router.put('/state', response_model=StateOut)
def put_state(
    data: StateIn,
    db: Session = Depends(get_db),
    child: Child = Depends(current_child),
):
    """Страница отправляет всё, что знает, и получает обратно слитое.

    Подробности слияния — в app/state.py. Коротко: по каждому заданию
    остаётся лучший результат, награды складываются, список работ берётся
    от страницы целиком.
    """
    out = state.merge(db, data, child=child)
    db.commit()
    return out


@router.get('/progress', response_model=ProgressOut)
def get_progress(db: Session = Depends(get_db), child: Child = Depends(current_child)):
    out = progress.view(db, child_id=child.id)
    db.commit()
    return out


@router.put('/progress', response_model=ProgressOut)
def put_progress(
    data: ProgressIn,
    db: Session = Depends(get_db),
    child: Child = Depends(current_child),
):
    """Результат по одному заданию. Лучший побеждает — подробности в progress.put."""
    progress.put(
        db,
        child_id=child.id,
        course_id=data.course_id,
        task_id=data.task_id,
        stars=data.stars,
        reaction=data.reaction,
    )
    db.flush()
    out = progress.view(db, child_id=child.id)
    db.commit()
    return out


@router.get('/projects', response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db), child: Child = Depends(current_child)):
    rows = db.execute(
        select(Project).where(Project.child_id == child.id).order_by(Project.created_at.desc())
    ).scalars().all()
    db.commit()
    return [_project_out(row) for row in rows]


@router.post('/projects', response_model=ProjectOut, status_code=201)
def save_project(
    data: ProjectIn,
    db: Session = Depends(get_db),
    child: Child = Depends(current_child),
):
    size = len(json.dumps(data.payload, ensure_ascii=False).encode())
    if size > MAX_PROJECT_BYTES:
        raise HTTPException(413, 'Работа слишком большая')

    count = len(db.execute(select(Project.id).where(Project.child_id == child.id)).all())
    if count >= MAX_PROJECTS:
        raise HTTPException(
            400, f'Сохранено уже {MAX_PROJECTS} работ. Удали ненужные, чтобы сохранить новую.')

    row = Project(child_id=child.id, title=data.title, payload=data.payload)
    db.add(row)
    db.commit()
    return _project_out(row)


@router.delete('/projects/{project_id}', response_model=OkOut)
def delete_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    child: Child = Depends(current_child),
):
    row = db.get(Project, project_id)
    # Один ответ и на «нет такой», и на «чужая»: перебирать идентификаторы
    # чужих работ смысла не будет.
    if row is None or row.child_id != child.id:
        raise HTTPException(404, 'Работа не найдена')
    db.delete(row)
    db.commit()
    return OkOut(message='Работа удалена')


@router.post('/quiz', response_model=ChildMeOut)
def save_quiz(
    data: QuizIn,
    db: Session = Depends(get_db),
    child: Child = Depends(current_child),
):
    """Ответ теста «Что мне интересно»: исследователь, творец или инженер."""
    child.quiz_direction = data.direction
    db.flush()
    out = _me(db, child)
    db.commit()
    return out


@router.get('/awards', response_model=list[str])
def list_awards(db: Session = Depends(get_db), child: Child = Depends(current_child)):
    rows = db.execute(
        select(Award.code).where(Award.child_id == child.id)
    ).scalars().all()
    db.commit()
    return list(rows)


@router.post('/awards', response_model=list[str])
def add_award(
    data: AwardIn,
    db: Session = Depends(get_db),
    child: Child = Depends(current_child),
):
    """Награда выдаётся один раз. Повторный запрос ничего не ломает и не
    жалуется: страница может прислать его дважды, и ребёнку это неинтересно."""
    exists = db.execute(
        select(Award.id).where(Award.child_id == child.id, Award.code == data.code)
    ).first()
    if exists is None:
        db.add(Award(child_id=child.id, code=data.code))
    db.flush()
    rows = db.execute(select(Award.code).where(Award.child_id == child.id)).scalars().all()
    db.commit()
    return list(rows)
