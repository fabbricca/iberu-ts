"""empty message

Revision ID: db8a1c3aadc3
Revises: 0ed2c8fe604d
Create Date: 2023-07-31 16:35:13.543187

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'db8a1c3aadc3'
down_revision = '0ed2c8fe604d'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('subscription', schema=None) as batch_op:
        batch_op.add_column(sa.Column('quote_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(None, 'asset', ['quote_id'], ['id'])

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('subscription', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.drop_column('quote_id')

    # ### end Alembic commands ###