"""Driver persistence operations within caller owned transactions."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.conductor import Conductor
from app.models.usuario import Usuario


class DriverStorageError(RuntimeError):
    pass


class DuplicateDriverError(DriverStorageError):
    pass


class ConductorRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, driver: Conductor) -> None:
        self._session.add(driver)
        self.flush()

    def flush(self) -> None:
        try:
            self._session.flush()
        except IntegrityError as error:
            constraint = getattr(
                getattr(error.orig, "diag", None), "constraint_name", None
            )
            if constraint in {"uq_conductor_dni", "uq_conductor_usuario_id"}:
                raise DuplicateDriverError("Driver already exists") from None
            raise DriverStorageError("Driver storage unavailable") from None
        except SQLAlchemyError:
            raise DriverStorageError("Driver storage unavailable") from None

    def get(self, driver_id: UUID, *, for_update: bool = False) -> Conductor | None:
        try:
            query = select(Conductor).where(Conductor.conductor_id == driver_id)
            if for_update:
                query = query.with_for_update()
            return self._session.scalar(query)
        except SQLAlchemyError:
            raise DriverStorageError("Driver storage unavailable") from None

    def get_by_user(self, user_id: UUID) -> Conductor | None:
        try:
            return self._session.scalar(
                select(Conductor).where(Conductor.usuario_id == user_id)
            )
        except SQLAlchemyError:
            raise DriverStorageError("Driver storage unavailable") from None

    def list_all(self) -> list[Conductor]:
        try:
            return list(
                self._session.scalars(
                    select(Conductor).order_by(Conductor.nombre)
                ).all()
            )
        except SQLAlchemyError:
            raise DriverStorageError("Driver storage unavailable") from None

    def user_is_driver(self, user_id: UUID) -> bool:
        try:
            user = self._session.get(Usuario, user_id)
            return (
                user is not None and user.rol == "CONDUCTOR" and user.estado == "ACTIVO"
            )
        except SQLAlchemyError:
            raise DriverStorageError("Driver storage unavailable") from None
