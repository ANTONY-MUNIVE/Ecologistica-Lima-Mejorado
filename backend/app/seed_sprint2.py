"""Synthetic local demo data. Refuses production, other DB names and existing data."""

import os
from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.engine import make_url

from app.core.config import Settings
from app.db.session import build_engine, session_factory
from app.models import Cliente, Conductor, Usuario
from app.repositories.usuarios import UsuarioRepository
from app.services.credenciales import CredentialService

DEMO_CLIENT_ID = UUID("00000000-0000-4000-8000-000000000052")


def seed(settings: Settings, password: str) -> None:
    if settings.app_env != "development" or settings.database_url is None:
        raise ValueError("La semilla requiere un entorno de desarrollo explícito")
    url = make_url(settings.database_url.get_secret_value())
    if url.database != "ecl_sprint2_dev" or url.host not in {"127.0.0.1", "localhost"}:
        raise ValueError("La semilla requiere la base local ecl_sprint2_dev aislada")
    if len(password) < 12:
        raise ValueError("Define DEMO_PASSWORD con al menos 12 caracteres")
    engine = build_engine(settings)
    try:
        with session_factory(engine).begin() as session:
            if any(
                session.scalar(select(model).limit(1)) is not None
                for model in (Usuario, Cliente, Conductor)
            ):
                raise ValueError("La base ya contiene datos; no se sobrescribe nada")
            users = {}
            credentials = CredentialService(UsuarioRepository(session))
            for email, role in (
                ("admin@example.test", "ADMINISTRADOR"),
                ("operador@example.test", "OPERADOR"),
                ("conductor@example.test", "CONDUCTOR"),
                ("auditor@example.test", "AUDITOR"),
            ):
                users[role] = credentials.create(email, password, role).usuario_id
            session.add(
                Cliente(
                    cliente_id=DEMO_CLIENT_ID,
                    nombre="DEMO Cliente sintético",
                    horario_preferido="DEMO Mañana; confirmar ventana del pedido",
                    referencia="DEMO Portón azul del depósito sintético",
                    restriccion_acceso="DEMO Avisar antes del ingreso",
                )
            )
            start = datetime(2026, 10, 9, 13, tzinfo=timezone.utc)
            session.add(
                Conductor(
                    usuario_id=users["CONDUCTOR"],
                    nombre="DEMO Conductor sintético 01",
                    dni="90000001",
                    licencia="DEMO-LIC-001",
                    licencia_vigente_hasta=date.today() + timedelta(days=365),
                    experiencia_anios=2,
                    telefono="000000000",
                    disponible_desde=start,
                    disponible_hasta=start + timedelta(hours=8),
                    punto_partida="DEMO Depósito sintético Lima",
                )
            )
    finally:
        engine.dispose()


if __name__ == "__main__":
    seed(Settings(), os.environ.get("DEMO_PASSWORD", ""))
    print(f"Datos sintéticos creados. Cliente de demostración: {DEMO_CLIENT_ID}")
