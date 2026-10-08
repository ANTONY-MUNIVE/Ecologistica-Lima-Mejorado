"""Aggregate HTTP and SQL timings without paths, SQL text or personal data."""

from dataclasses import dataclass
from threading import Lock
from time import perf_counter

from sqlalchemy import Engine, event


@dataclass
class Totals:
    count: int = 0
    errors_5xx: int = 0
    errors: int = 0
    seconds_sum: float = 0.0
    seconds_max: float = 0.0

    def add(
        self, elapsed: float, *, status: int | None = None, error: bool = False
    ) -> None:
        self.count += 1
        if status is not None and 500 <= status <= 599:
            self.errors_5xx += 1
        if error:
            self.errors += 1
        self.seconds_sum += elapsed
        self.seconds_max = max(self.seconds_max, elapsed)

    def snapshot(self) -> dict[str, float | int]:
        return {
            "count": self.count,
            "errors_5xx": self.errors_5xx,
            "errors": self.errors,
            "seconds_sum": round(self.seconds_sum, 6),
            "seconds_max": round(self.seconds_max, 6),
        }


class MetricsRegistry:
    def __init__(self) -> None:
        self._lock = Lock()
        self._http: dict[tuple[str, str], Totals] = {}
        self._sql: dict[str, Totals] = {"business": Totals(), "audit": Totals()}
        self._in_flight = 0
        self._peak_in_flight = 0

    def request_started(self) -> float:
        with self._lock:
            self._in_flight += 1
            self._peak_in_flight = max(self._peak_in_flight, self._in_flight)
        return perf_counter()

    def request_finished(
        self, started: float, method: str, route: str, status: int
    ) -> None:
        elapsed = max(0.0, perf_counter() - started)
        with self._lock:
            self._in_flight -= 1
            self._http.setdefault((method, route), Totals()).add(elapsed, status=status)

    def sql_finished(self, kind: str, started: float, *, error: bool = False) -> None:
        elapsed = max(0.0, perf_counter() - started)
        with self._lock:
            self._sql[kind].add(elapsed, error=error)

    def snapshot(self) -> dict:
        with self._lock:
            return {
                "in_flight": self._in_flight,
                "peak_in_flight": self._peak_in_flight,
                "http": [
                    {"method": method, "route": route, **totals.snapshot()}
                    for (method, route), totals in sorted(self._http.items())
                ],
                "database": {
                    kind: totals.snapshot() for kind, totals in self._sql.items()
                },
            }


def instrument_engine(engine: Engine, registry: MetricsRegistry, kind: str) -> None:
    """Attach timing hooks only to engines created for this application instance."""

    @event.listens_for(engine, "before_cursor_execute")
    def before_execute(conn, cursor, statement, parameters, context, executemany):
        context._ecologistica_started = perf_counter()

    @event.listens_for(engine, "after_cursor_execute")
    def after_execute(conn, cursor, statement, parameters, context, executemany):
        started = getattr(context, "_ecologistica_started", None)
        if started is not None:
            registry.sql_finished(kind, started)

    @event.listens_for(engine, "handle_error")
    def on_error(exception_context):
        context = exception_context.execution_context
        started = getattr(context, "_ecologistica_started", None)
        if started is not None:
            registry.sql_finished(kind, started, error=True)
