"""Exercise the driver migration against an isolated empty test database."""

from datetime import date, datetime, timedelta, timezone

import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from alembic import command
from app.models.conductor import Conductor

pytestmark = pytest.mark.integration


def driver_values(**overrides):
    start = datetime(2026, 10, 9, 13, tzinfo=timezone.utc)
    values = {
        "nombre": "Conductor sintético",
        "dni": "12345678",
        "licencia": "SYN-001",
        "licencia_vigente_hasta": date(2027, 1, 1),
        "experiencia_anios": 2,
        "telefono": "000000000",
        "disponible_desde": start,
        "disponible_hasta": start + timedelta(hours=8),
        "punto_partida": "Depósito de prueba",
    }
    values.update(overrides)
    return values


def test_conductor_migration_and_database_constraints(migration_database):
    engine, config = migration_database
    command.upgrade(config, "0006_create_cliente_pedido")
    with engine.connect() as connection:
        assert not inspect(connection).has_table("conductor")

    command.upgrade(config, "head")
    with Session(engine) as session:
        original = Conductor(**driver_values())
        session.add(original)
        session.commit()
        session.refresh(original)
        assert original.conductor_id is not None
        assert original.dni == "12345678"

        session.add(Conductor(**driver_values(nombre="Otro conductor")))
        with pytest.raises(IntegrityError):
            session.flush()
        session.rollback()

        session.add(
            Conductor(
                **driver_values(
                    dni="87654321",
                    disponible_hasta=driver_values()["disponible_desde"],
                )
            )
        )
        with pytest.raises(IntegrityError):
            session.flush()
        session.rollback()

        assert session.get(Conductor, original.conductor_id) is not None

    command.downgrade(config, "0006_create_cliente_pedido")
    with engine.connect() as connection:
        assert not inspect(connection).has_table("conductor")
