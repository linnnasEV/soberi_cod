"""Номер работы, под которым её знает браузер ребёнка

Ревизия: 0002
Предыдущая: 0001
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '0002'
down_revision: str | None = '0001'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('projects', sa.Column('local_id', sa.Text(), nullable=True))
    # Уникальность на владельца: страница может отправить своё состояние
    # дважды подряд, и вторая отправка не должна удваивать работы.
    op.create_index('projects_child_local', 'projects', ['child_id', 'local_id'], unique=True,
                    postgresql_where=sa.text('child_id is not null and local_id is not null'))
    op.create_index('projects_guest_local', 'projects', ['participant_id', 'local_id'], unique=True,
                    postgresql_where=sa.text('participant_id is not null and local_id is not null'))


def downgrade() -> None:
    op.drop_index('projects_guest_local', table_name='projects')
    op.drop_index('projects_child_local', table_name='projects')
    op.drop_column('projects', 'local_id')
