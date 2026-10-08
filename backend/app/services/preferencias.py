"""Transactional delivery preference use cases."""

from uuid import UUID

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from app.models.cliente import Cliente
from app.repositories.clientes import ClienteRepository, ClienteStorageError
from app.schemas.preferencias import PreferenciasUpdate


class ClienteNoEncontrado(LookupError):
    pass


class PreferenciasNoDisponibles(RuntimeError):
    pass


class PreferenciasService:
    def __init__(self, factory: sessionmaker[Session]) -> None:
        self._factory = factory

    def get(self, cliente_id: UUID) -> Cliente:
        try:
            with self._factory() as session:
                cliente = ClienteRepository(session).get(cliente_id)
                if cliente is None:
                    raise ClienteNoEncontrado("Cliente no encontrado")
                return cliente
        except ClienteNoEncontrado:
            raise
        except (ClienteStorageError, SQLAlchemyError):
            raise PreferenciasNoDisponibles("Servicio no disponible") from None

    def update(self, cliente_id: UUID, payload: PreferenciasUpdate) -> Cliente:
        try:
            with self._factory.begin() as session:
                repository = ClienteRepository(session)
                cliente = repository.get(cliente_id, for_update=True)
                if cliente is None:
                    raise ClienteNoEncontrado("Cliente no encontrado")
                for field, value in payload.model_dump(exclude_unset=True).items():
                    setattr(cliente, field, value)
                repository.flush()
                return cliente
        except ClienteNoEncontrado:
            raise
        except (ClienteStorageError, SQLAlchemyError):
            raise PreferenciasNoDisponibles("Servicio no disponible") from None
