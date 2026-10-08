"""Transactional driver use cases and eligibility checks."""

from datetime import datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from app.models.conductor import Conductor
from app.repositories.conductores import (
    ConductorRepository,
    DriverStorageError,
    DuplicateDriverError,
)
from app.schemas.conductor import DriverCreate, DriverUpdate


class DriverNotFound(LookupError):
    pass


class DriverInvalid(ValueError):
    pass


class DriverDuplicate(ValueError):
    pass


class DriverUnavailable(RuntimeError):
    pass


class ConductorService:
    def __init__(self, factory: sessionmaker[Session]) -> None:
        self._factory = factory

    @staticmethod
    def _validate(driver: Conductor, repository: ConductorRepository) -> None:
        if (
            driver.licencia_vigente_hasta
            < datetime.now(ZoneInfo("America/Lima")).date()
        ):
            raise DriverInvalid("La licencia está vencida")
        if driver.disponible_desde >= driver.disponible_hasta:
            raise DriverInvalid("La disponibilidad debe terminar después de su inicio")
        if driver.usuario_id is not None and not repository.user_is_driver(
            driver.usuario_id
        ):
            raise DriverInvalid("El usuario debe ser un conductor activo")

    def create(self, payload: DriverCreate) -> Conductor:
        try:
            with self._factory.begin() as session:
                repository = ConductorRepository(session)
                driver = Conductor(**payload.model_dump(mode="python"))
                self._validate(driver, repository)
                repository.add(driver)
                return driver
        except (DriverInvalid, DriverDuplicate):
            raise
        except DuplicateDriverError:
            raise DriverDuplicate("El DNI o usuario ya está registrado") from None
        except (DriverStorageError, SQLAlchemyError):
            raise DriverUnavailable("Servicio no disponible") from None

    def list_all(self) -> list[Conductor]:
        try:
            with self._factory() as session:
                return ConductorRepository(session).list_all()
        except (DriverStorageError, SQLAlchemyError):
            raise DriverUnavailable("Servicio no disponible") from None

    def get(self, driver_id: UUID) -> Conductor:
        try:
            with self._factory() as session:
                driver = ConductorRepository(session).get(driver_id)
                if driver is None:
                    raise DriverNotFound("Conductor no encontrado")
                return driver
        except DriverNotFound:
            raise
        except (DriverStorageError, SQLAlchemyError):
            raise DriverUnavailable("Servicio no disponible") from None

    def get_by_user(self, user_id: UUID) -> Conductor:
        try:
            with self._factory() as session:
                driver = ConductorRepository(session).get_by_user(user_id)
                if driver is None:
                    raise DriverNotFound("Conductor no encontrado")
                return driver
        except DriverNotFound:
            raise
        except (DriverStorageError, SQLAlchemyError):
            raise DriverUnavailable("Servicio no disponible") from None

    def update(self, driver_id: UUID, payload: DriverUpdate) -> Conductor:
        try:
            with self._factory.begin() as session:
                repository = ConductorRepository(session)
                driver = repository.get(driver_id, for_update=True)
                if driver is None:
                    raise DriverNotFound("Conductor no encontrado")
                for field, value in payload.model_dump(
                    exclude_unset=True, mode="python"
                ).items():
                    setattr(driver, field, value)
                self._validate(driver, repository)
                repository.flush()
                return driver
        except (DriverNotFound, DriverInvalid):
            raise
        except DuplicateDriverError:
            raise DriverDuplicate("El DNI o usuario ya está registrado") from None
        except (DriverStorageError, SQLAlchemyError):
            raise DriverUnavailable("Servicio no disponible") from None
