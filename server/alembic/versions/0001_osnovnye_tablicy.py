"""Основные таблицы: взрослые, дети, занятия, прогресс, сессии

Ревизия: 0001
Предыдущая: нет
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '0001'
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.Text(), nullable=False),
        sa.Column('password_hash', sa.Text(), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('roles', postgresql.ARRAY(sa.Text()), nullable=False,
                  server_default=sa.text("'{}'::text[]")),
        sa.Column('email_verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.Text(), nullable=False, server_default=sa.text("'active'")),
        sa.Column('totp_secret', sa.Text(), nullable=True),
        sa.Column('failed_logins', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.CheckConstraint("status in ('active', 'blocked')", name='users_status_known'),
        sa.CheckConstraint("roles <@ ARRAY['admin', 'teacher', 'parent']::text[]", name='users_roles_known'),
        sa.CheckConstraint('email = lower(email)', name='users_email_lower'),
    )

    op.create_table(
        'children',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('parent_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('display_name', sa.Text(), nullable=False),
        sa.Column('login', sa.Text(), nullable=False),
        sa.Column('password_hash', sa.Text(), nullable=False),
        sa.Column('avatar', sa.Text(), nullable=True),
        sa.Column('quiz_direction', sa.Text(), nullable=True),
        sa.Column('failed_logins', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['parent_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('login'),
        sa.CheckConstraint('login = lower(login)', name='children_login_lower'),
    )
    op.create_index('children_parent', 'children', ['parent_id'])

    op.create_table(
        'workshops',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('teacher_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('grade', sa.Text(), nullable=True),
        sa.Column('join_code', sa.Text(), nullable=True),
        sa.Column('status', sa.Text(), nullable=False, server_default=sa.text("'draft'")),
        sa.Column('opened_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("status in ('draft', 'open', 'closed')", name='workshops_status_known'),
    )
    op.create_index('workshops_teacher', 'workshops', ['teacher_id'])
    # Код уникален только среди открытых занятий, иначе короткие коды кончатся.
    op.create_index('workshops_open_code', 'workshops', ['join_code'], unique=True,
                    postgresql_where=sa.text("status = 'open' and join_code is not null"))

    op.create_table(
        'workshop_participants',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('workshop_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('child_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('guest_name', sa.Text(), nullable=True),
        sa.Column('guest_quiz_direction', sa.Text(), nullable=True),
        sa.Column('joined_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('left_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['workshop_id'], ['workshops.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['child_id'], ['children.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('workshop_id', 'child_id', name='participants_child_once'),
        sa.CheckConstraint('(child_id is null) <> (guest_name is null)', name='participants_subject'),
    )
    op.create_index('participants_workshop', 'workshop_participants', ['workshop_id'])
    op.create_index('participants_child', 'workshop_participants', ['child_id'])

    op.create_table(
        'progress',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('child_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('participant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('course_id', sa.Text(), nullable=False),
        sa.Column('task_id', sa.Text(), nullable=False),
        sa.Column('stars', sa.SmallInteger(), nullable=False, server_default=sa.text('0')),
        sa.Column('reaction', sa.SmallInteger(), nullable=True),
        sa.Column('workshop_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['child_id'], ['children.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['participant_id'], ['workshop_participants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workshop_id'], ['workshops.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('(child_id is null) <> (participant_id is null)', name='progress_subject'),
        sa.CheckConstraint('stars between 0 and 3', name='progress_stars_range'),
        sa.CheckConstraint('reaction is null or reaction between 0 and 2', name='progress_reaction_range'),
    )
    op.create_index('progress_child_task', 'progress', ['child_id', 'course_id', 'task_id'],
                    unique=True, postgresql_where=sa.text('child_id is not null'))
    op.create_index('progress_guest_task', 'progress', ['participant_id', 'course_id', 'task_id'],
                    unique=True, postgresql_where=sa.text('participant_id is not null'))
    op.create_index('progress_workshop', 'progress', ['workshop_id'])

    op.create_table(
        'projects',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('child_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('participant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('workshop_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('title', sa.Text(), nullable=True),
        sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['child_id'], ['children.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['participant_id'], ['workshop_participants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workshop_id'], ['workshops.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('(child_id is null) <> (participant_id is null)', name='projects_subject'),
    )
    op.create_index('projects_child', 'projects', ['child_id'])
    op.create_index('projects_participant', 'projects', ['participant_id'])

    op.create_table(
        'awards',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('child_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('participant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('code', sa.Text(), nullable=False),
        sa.Column('granted_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['child_id'], ['children.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['participant_id'], ['workshop_participants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('(child_id is null) <> (participant_id is null)', name='awards_subject'),
    )
    op.create_index('awards_child_code', 'awards', ['child_id', 'code'], unique=True,
                    postgresql_where=sa.text('child_id is not null'))
    op.create_index('awards_guest_code', 'awards', ['participant_id', 'code'], unique=True,
                    postgresql_where=sa.text('participant_id is not null'))

    op.create_table(
        'auth_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('child_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('participant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('token_hash', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ip', sa.Text(), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['child_id'], ['children.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['participant_id'], ['workshop_participants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token_hash'),
        sa.CheckConstraint(
            '(user_id is not null)::int + (child_id is not null)::int '
            '+ (participant_id is not null)::int = 1',
            name='sessions_subject'),
    )
    op.create_index('sessions_expires', 'auth_sessions', ['expires_at'])
    op.create_index('sessions_user', 'auth_sessions', ['user_id'])
    op.create_index('sessions_child', 'auth_sessions', ['child_id'])

    op.create_table(
        'email_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('kind', sa.Text(), nullable=False),
        sa.Column('token_hash', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token_hash'),
        sa.CheckConstraint("kind in ('verify', 'reset')", name='email_tokens_kind_known'),
    )
    op.create_index('email_tokens_user', 'email_tokens', ['user_id'])

    op.create_table(
        'login_attempts',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('scope', sa.Text(), nullable=False),
        sa.Column('key', sa.Text(), nullable=False),
        sa.Column('ok', sa.Boolean(), nullable=False),
        sa.Column('ip', sa.Text(), nullable=True),
        sa.Column('at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('login_attempts_lookup', 'login_attempts', ['scope', 'key', 'at'])
    op.create_index('login_attempts_at', 'login_attempts', ['at'])

    op.create_table(
        'audit_log',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('actor_kind', sa.Text(), nullable=True),
        sa.Column('actor_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('actor_label', sa.Text(), nullable=True),
        sa.Column('action', sa.Text(), nullable=False),
        sa.Column('target_kind', sa.Text(), nullable=True),
        sa.Column('target_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('meta', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('ip', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('audit_at', 'audit_log', ['at'])
    op.create_index('audit_target', 'audit_log', ['target_kind', 'target_id'])


def downgrade() -> None:
    op.drop_table('audit_log')
    op.drop_table('login_attempts')
    op.drop_table('email_tokens')
    op.drop_table('auth_sessions')
    op.drop_table('awards')
    op.drop_table('projects')
    op.drop_table('progress')
    op.drop_table('workshop_participants')
    op.drop_table('workshops')
    op.drop_table('children')
    op.drop_table('users')
