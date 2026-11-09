"""Фамилия взрослого и кем он приходится ребёнку

Ревизия: 0003
Предыдущая: 0002
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '0003'
down_revision: str | None = '0002'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('users', sa.Column('surname', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('family_role', sa.Text(), nullable=True))
    op.create_check_constraint(
        'users_family_role_known', 'users',
        "family_role is null or family_role in ('mother', 'father')")


def downgrade() -> None:
    op.drop_constraint('users_family_role_known', 'users', type_='check')
    op.drop_column('users', 'family_role')
    op.drop_column('users', 'surname')
