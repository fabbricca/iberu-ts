"""empty message

Revision ID: 7051d8ff7a0c
Revises: 7375910c356a
Create Date: 2023-08-19 16:48:16.435443

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '7051d8ff7a0c'
down_revision = '7375910c356a'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('backtest', schema=None) as batch_op:
        batch_op.drop_constraint('backtest_ibfk_2', type_='foreignkey')
        batch_op.drop_column('user_id')

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('backtest', schema=None) as batch_op:
        batch_op.add_column(sa.Column('user_id', mysql.INTEGER(), autoincrement=False, nullable=True))
        batch_op.create_foreign_key('backtest_ibfk_2', 'user', ['user_id'], ['id'])

    # ### end Alembic commands ###