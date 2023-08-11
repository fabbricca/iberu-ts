"""empty message

Revision ID: 7375910c356a
Revises: c130e3466560
Create Date: 2023-08-04 23:38:15.674806

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '7375910c356a'
down_revision = 'c130e3466560'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('api', schema=None) as batch_op:
        batch_op.alter_column('name',
               existing_type=mysql.VARCHAR(collation='utf8mb3_bin', length=24),
               type_=sa.String(length=10),
               existing_nullable=True)

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('api', schema=None) as batch_op:
        batch_op.alter_column('name',
               existing_type=sa.String(length=10),
               type_=mysql.VARCHAR(collation='utf8mb3_bin', length=24),
               existing_nullable=True)

    # ### end Alembic commands ###