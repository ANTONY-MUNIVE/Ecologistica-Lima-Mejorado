from datetime import datetime
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from alembic import command
from app.db.session import session_factory
from app.models import Cliente, Pedido
from app.repositories.pedidos import PedidoStorageError
from app.schemas.pedido import PedidoCreate
from app.services.pedidos import PedidoService, PedidoUnavailable

pytestmark = pytest.mark.integration


def request(client_id, **changes):
    data = {
        "cliente_id": client_id,
        "direccion": "Av. Principal 123",
        "latitud": -11.987654,
        "longitud": -76.987654,
        "peso_kg": Decimal("12.50"),
        "volumen_m3": Decimal("0.080"),
        "ventana_inicio": "2026-10-01T09:00:00-05:00",
        "ventana_fin": "2026-10-01T11:00:00-05:00",
        "prioridad": "ESTANDAR",
        "tipo_producto": "Libre",
    }
    data.update(changes)
    return PedidoCreate.model_validate(data)


def create_client(factory):
    with factory.begin() as session:
        client = Cliente(nombre="Cliente de prueba")
        session.add(client)
        session.flush()
        return client.cliente_id


def test_spatial_reference_and_default_persistence(migration_database):
    engine, config = migration_database
    command.upgrade(config, "head")
    factory = session_factory(engine)
    client_id = create_client(factory)
    service = PedidoService(factory)

    spatial = service.create(request(client_id))
    assert spatial.estado == "PENDIENTE"
    assert spatial.peso_kg == Decimal("12.50")
    assert spatial.volumen_m3 == Decimal("0.080")
    assert spatial.latitud == pytest.approx(-11.987654)
    assert spatial.longitud == pytest.approx(-76.987654)

    reference = service.create(
        request(client_id, latitud=None, longitud=None, referencia="Frente al parque")
    )
    both = service.create(request(client_id, referencia="Cerca al colegio"))
    assert (reference.latitud, reference.longitud) == (None, None)
    assert both.referencia == "Cerca al colegio"

    with Session(engine) as session:
        rows = list(session.scalars(select(Pedido).order_by(Pedido.pedido_id)))
        assert len(rows) == 3
        location = session.execute(
            text(
                """
                SELECT ST_X(ubicacion::geometry), ST_Y(ubicacion::geometry),
                       ST_SRID(ubicacion::geometry)
                FROM pedido WHERE pedido_id = :pedido_id
                """
            ),
            {"pedido_id": spatial.pedido_id},
        ).one()
        assert location[0] == pytest.approx(-76.987654)
        assert location[1] == pytest.approx(-11.987654)
        assert location[2] == 4326
        assert session.get(Pedido, reference.pedido_id).ubicacion is None
        assert session.get(Pedido, both.pedido_id).referencia == "Cerca al colegio"
        assert all(row.estado == "PENDIENTE" for row in rows)


def test_database_constraints_and_transaction_rollback(migration_database, monkeypatch):
    engine, config = migration_database
    command.upgrade(config, "head")
    factory = session_factory(engine)
    client_id = create_client(factory)
    valid = request(client_id, latitud=None, longitud=None, referencia="Parque")

    with Session(engine) as session:
        invalid_fk = Pedido(
            **valid.model_dump(
                include={
                    "direccion",
                    "referencia",
                    "peso_kg",
                    "volumen_m3",
                    "ventana_inicio",
                    "ventana_fin",
                    "tipo_producto",
                },
                mode="python",
            ),
            cliente_id=uuid4(),
            prioridad=valid.prioridad.value,
        )
        session.add(invalid_fk)
        with pytest.raises(IntegrityError):
            session.flush()
        session.rollback()
        assert session.scalar(select(func.count()).select_from(Pedido)) == 0

        invalid_window = Pedido(
            cliente_id=client_id,
            direccion="Av. Principal",
            referencia="Parque",
            peso_kg=Decimal("1.00"),
            volumen_m3=Decimal("0.100"),
            ventana_inicio=valid.ventana_fin,
            ventana_fin=valid.ventana_inicio,
            prioridad="ESTANDAR",
            tipo_producto="Libre",
        )
        session.add(invalid_window)
        with pytest.raises(IntegrityError):
            session.flush()
        session.rollback()
        assert session.scalar(select(func.count()).select_from(Pedido)) == 0

    from app.repositories.pedidos import PedidoRepository

    def fail_after_flush(self, pedido_id):
        raise PedidoStorageError("private")

    monkeypatch.setattr(PedidoRepository, "coordinates", fail_after_flush)
    with pytest.raises(PedidoUnavailable):
        PedidoService(factory).create(valid)
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(Pedido)) == 0


@pytest.mark.parametrize(
    ("field", "whitespace"),
    [
        ("referencia", "\t"),
        ("referencia", "\n"),
        ("referencia", " \t \n "),
        ("direccion", "\t"),
        ("direccion", " \t \n "),
        ("tipo_producto", "\n"),
        ("tipo_producto", " \t \n "),
    ],
)
def test_database_rejects_whitespace_only_text(migration_database, field, whitespace):
    engine, config = migration_database
    command.upgrade(config, "head")
    client_id = create_client(session_factory(engine))
    values = {
        "cliente_id": client_id,
        "direccion": "Av. Principal 123",
        "referencia": "Parque",
        "ubicacion": None,
        "peso_kg": Decimal("12.50"),
        "volumen_m3": Decimal("0.080"),
        "ventana_inicio": datetime.fromisoformat("2026-10-01T09:00:00-05:00"),
        "ventana_fin": datetime.fromisoformat("2026-10-01T11:00:00-05:00"),
        "prioridad": "ESTANDAR",
        "tipo_producto": "Libre",
    }
    values[field] = whitespace

    with Session(engine) as session:
        session.add(Pedido(**values))
        with pytest.raises(IntegrityError):
            session.flush()
        session.rollback()
        assert session.scalar(select(func.count()).select_from(Pedido)) == 0
