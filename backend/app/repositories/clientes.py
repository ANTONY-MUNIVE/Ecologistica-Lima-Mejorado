"""Client existence lookup for order registration only."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.cliente import Cliente


class ClienteStorageError(RuntimeError):
    """Sanitized client lookup failure."""


class ClienteRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def exists(self, cliente_id: UUID) -> bool:
        try:
            return self._session.get(Cliente, cliente_id) is not None
        except SQLAlchemyError:
            raise ClienteStorageError("Client storage unavailable") from None

    def get(self, cliente_id: UUID, *, for_update: bool = False) -> Cliente | None:
        try:
            query = select(Cliente).where(Cliente.cliente_id == cliente_id)
            if for_update:
                query = query.with_for_update()
            return self._session.scalar(query)
        except SQLAlchemyError:
            raise ClienteStorageError("Client storage unavailable") from None

    def flush(self) -> None:
        try:
            self._session.flush()
        except SQLAlchemyError:
            raise ClienteStorageError("Client storage unavailable") from None
