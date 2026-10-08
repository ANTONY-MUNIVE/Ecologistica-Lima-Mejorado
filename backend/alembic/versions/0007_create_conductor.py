"""Create conductor master data without modifying historical revisions."""

import sqlalchemy as sa

from alembic import op

revision = "0007_create_conductor"
down_revision = "0006_create_cliente_pedido"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "conductor",
        sa.Column(
            "conductor_id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("usuario_id", sa.UUID(), nullable=True),
        sa.Column("nombre", sa.String(160), nullable=False),
        sa.Column("dni", sa.String(8), nullable=False),
        sa.Column("licencia", sa.String(40), nullable=False),
        sa.Column("licencia_vigente_hasta", sa.Date(), nullable=False),
        sa.Column("experiencia_anios", sa.SmallInteger(), nullable=False),
        sa.Column("telefono", sa.String(30), nullable=False),
        sa.Column("disponible_desde", sa.DateTime(timezone=True), nullable=False),
        sa.Column("disponible_hasta", sa.DateTime(timezone=True), nullable=False),
        sa.Column("punto_partida", sa.String(255), nullable=False),
        sa.PrimaryKeyConstraint("conductor_id"),
        sa.ForeignKeyConstraint(
            ["usuario_id"], ["usuario.usuario_id"], name="fk_conductor_usuario"
        ),
        sa.UniqueConstraint("dni", name="uq_conductor_dni"),
        sa.UniqueConstraint("usuario_id", name="uq_conductor_usuario_id"),
        sa.CheckConstraint("dni ~ '^[0-9]{8}$'", name="ck_conductor_dni"),
        sa.CheckConstraint("nombre ~ '[^[:space:]]'", name="ck_conductor_nombre"),
        sa.CheckConstraint("licencia ~ '[^[:space:]]'", name="ck_conductor_licencia"),
        sa.CheckConstraint("telefono ~ '[^[:space:]]'", name="ck_conductor_telefono"),
        sa.CheckConstraint(
            "punto_partida ~ '[^[:space:]]'", name="ck_conductor_punto_partida"
        ),
        sa.CheckConstraint("experiencia_anios >= 0", name="ck_conductor_experiencia"),
        sa.CheckConstraint(
            "disponible_desde < disponible_hasta", name="ck_conductor_disponibilidad"
        ),
    )


def downgrade() -> None:
    op.drop_table("conductor")
