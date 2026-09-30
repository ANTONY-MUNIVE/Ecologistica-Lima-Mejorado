"""Create documented client storage and orders in one revision."""

import sqlalchemy as sa
from geoalchemy2 import Geography

from alembic import op

revision = "0006_create_cliente_pedido"
down_revision = "0005_extend_vehicle_audit_events"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cliente",
        sa.Column(
            "cliente_id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("nombre", sa.String(160), nullable=False),
        sa.Column("horario_preferido", sa.String(120), nullable=True),
        sa.Column("referencia", sa.String(255), nullable=True),
        sa.Column("restriccion_acceso", sa.String(255), nullable=True),
        sa.PrimaryKeyConstraint("cliente_id"),
    )
    op.create_table(
        "pedido",
        sa.Column(
            "pedido_id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("cliente_id", sa.UUID(), nullable=False),
        sa.Column("direccion", sa.String(255), nullable=False),
        sa.Column("referencia", sa.String(255), nullable=True),
        sa.Column(
            "ubicacion",
            Geography(geometry_type="POINT", srid=4326, spatial_index=False),
            nullable=True,
        ),
        sa.Column("peso_kg", sa.Numeric(10, 2), nullable=False),
        sa.Column("volumen_m3", sa.Numeric(10, 3), nullable=False),
        sa.Column("ventana_inicio", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ventana_fin", sa.DateTime(timezone=True), nullable=False),
        sa.Column("prioridad", sa.String(12), nullable=False),
        sa.Column("tipo_producto", sa.String(20), nullable=False),
        sa.Column(
            "estado",
            sa.String(15),
            server_default=sa.text("'PENDIENTE'"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("pedido_id"),
        sa.ForeignKeyConstraint(
            ["cliente_id"], ["cliente.cliente_id"], name="fk_pedido_cliente_id_cliente"
        ),
        sa.CheckConstraint("direccion ~ '[^[:space:]]'", name="ck_pedido_direccion"),
        sa.CheckConstraint(
            "referencia IS NULL OR referencia ~ '[^[:space:]]'",
            name="ck_pedido_referencia",
        ),
        sa.CheckConstraint(
            "ubicacion IS NOT NULL OR coalesce(referencia ~ '[^[:space:]]', false)",
            name="ck_pedido_ubicacion_o_referencia",
        ),
        sa.CheckConstraint(
            "peso_kg <> 'NaN'::numeric AND peso_kg > 0", name="ck_pedido_peso_kg"
        ),
        sa.CheckConstraint(
            "volumen_m3 <> 'NaN'::numeric AND volumen_m3 > 0",
            name="ck_pedido_volumen_m3",
        ),
        sa.CheckConstraint("ventana_inicio < ventana_fin", name="ck_pedido_ventana"),
        sa.CheckConstraint(
            "prioridad IN ('EXPRESS','ESTANDAR','ECONOMICO')",
            name="ck_pedido_prioridad",
        ),
        sa.CheckConstraint(
            "tipo_producto ~ '[^[:space:]]'", name="ck_pedido_tipo_producto"
        ),
    )
    op.create_index(
        "idx_pedido_pendiente_ventana", "pedido", ["estado", "ventana_inicio"]
    )
    op.create_index(
        "idx_pedido_ubicacion", "pedido", ["ubicacion"], postgresql_using="gist"
    )


def downgrade() -> None:
    op.drop_index("idx_pedido_ubicacion", table_name="pedido")
    op.drop_index("idx_pedido_pendiente_ventana", table_name="pedido")
    op.drop_table("pedido")
    op.drop_table("cliente")
