"""create_valuations_table

Revision ID: 222b685b02b1
Revises: 111a574a01a0
Create Date: 2026-10-15 12:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '222b685b02b1'
down_revision: str | Sequence[str] | None = '111a574a01a0'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema: create valuations table for Module 3 Pricing Engine."""
    op.create_table(
        'valuations',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('valuation_id', sa.String(length=50), nullable=False),
        sa.Column('contract_id', sa.String(length=50), nullable=False),
        sa.Column('contract_version', sa.Integer(), nullable=False),
        sa.Column('instrument_type', sa.String(length=50), nullable=False),
        sa.Column('model_id', sa.String(length=50), nullable=False),
        sa.Column('valuation_date', sa.Date(), nullable=False),
        sa.Column('present_value', sa.Numeric(precision=24, scale=4), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('greeks', sa.JSON(), nullable=True),
        sa.Column('market_snapshot', sa.JSON(), nullable=True),
        sa.Column('assumptions', sa.JSON(), nullable=True),
        sa.Column('warnings', sa.JSON(), nullable=True),
        sa.Column('cashflows', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='Completed'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_valuations_valuation_id'), 'valuations', ['valuation_id'], unique=True)
    op.create_index(op.f('ix_valuations_contract_id'), 'valuations', ['contract_id'], unique=False)
    op.create_index(op.f('ix_valuations_instrument_type'), 'valuations', ['instrument_type'], unique=False)
    op.create_index(op.f('ix_valuations_model_id'), 'valuations', ['model_id'], unique=False)
    op.create_index('ix_valuations_contract_date', 'valuations', ['contract_id', 'valuation_date'], unique=False)
    op.create_index('ix_valuations_model_status', 'valuations', ['model_id', 'status'], unique=False)


def downgrade() -> None:
    """Downgrade schema: drop valuations table."""
    op.drop_index('ix_valuations_model_status', table_name='valuations')
    op.drop_index('ix_valuations_contract_date', table_name='valuations')
    op.drop_index(op.f('ix_valuations_model_id'), table_name='valuations')
    op.drop_index(op.f('ix_valuations_instrument_type'), table_name='valuations')
    op.drop_index(op.f('ix_valuations_contract_id'), table_name='valuations')
    op.drop_index(op.f('ix_valuations_valuation_id'), table_name='valuations')
    op.drop_table('valuations')
