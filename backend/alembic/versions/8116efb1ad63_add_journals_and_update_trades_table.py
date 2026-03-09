"""Add journals and update trades table

Revision ID: 8116efb1ad63
Revises: 
Create Date: 2026-03-09 22:49:53.840634+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql


# revision identifiers, used by Alembic.
revision: str = '8116efb1ad63'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # Add new columns to trades table
    op.add_column('trades', sa.Column('image_url', sa.String(length=512), nullable=True))
    op.add_column('trades', sa.Column('message', sa.Text(), nullable=True))
    op.add_column('trades', sa.Column('tags', mysql.JSON(), nullable=True))
    
    # Create journals table
    op.create_table('journals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('content', sa.String(length=2048), nullable=True),
        sa.Column('owner_id', sa.String(length=128), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.uid'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create journal_trade_summary table
    op.create_table('journal_trade_summary',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('journal_id', sa.Integer(), nullable=False),
        sa.Column('total_pnl', sa.DECIMAL(20, 8), server_default='0', nullable=False),
        sa.Column('winrate', sa.DECIMAL(5, 2), server_default='0', nullable=False),
        sa.Column('total_trades', sa.Integer(), server_default='0', nullable=False),
        sa.Column('sellpercent', sa.DECIMAL(5, 2), server_default='0', nullable=False),
        sa.ForeignKeyConstraint(['journal_id'], ['journals.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add jid column to trades table (nullable first)
    op.add_column('trades', sa.Column('jid', sa.Integer(), nullable=False))
    
    # Create foreign key constraint for jid
    op.create_foreign_key('fk_trades_jid', 'trades', 'journals', ['jid'], ['id'])
    
    # Add index for jid column
    op.create_index(op.f('ix_trades_jid'), 'trades', ['jid'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""



    # Remove index for jid column
    op.drop_index(op.f('ix_trades_jid'), table_name='trades')
    
    # Remove foreign key constraint
    op.drop_constraint('fk_trades_jid', 'trades', type_='foreignkey')
    
    # Remove jid column
    op.drop_column('trades', 'jid')
    
    # Drop journal_trade_summary table
    op.drop_table('journal_trade_summary')
    
    # Drop journals table
    op.drop_table('journals')
    
    # Remove new columns from trades
    op.drop_column('trades', 'tags')
    op.drop_column('trades', 'message')
