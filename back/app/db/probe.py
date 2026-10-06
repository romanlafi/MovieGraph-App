"""Development-only SQL verification; only moviegraph_runtime_probe is used."""

from uuid import uuid4

from sqlalchemy import event, text
from sqlalchemy.engine import Engine

from .database import engine_scope, session_context
from .runtime import DatabaseConfig


SETUP_SQL = """
CREATE TABLE IF NOT EXISTS moviegraph_runtime_probe (
    id TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""


class ProbeVerificationError(RuntimeError):
    """A safe failure without SQL parameters or connection details."""


def verify(condition: bool) -> None:
    if not condition:
        raise ProbeVerificationError("Database verification failed")


def setup_probe_table(engine: Engine) -> None:
    """Trusted CLI/admin setup only; never called from HTTP routes."""
    with engine.begin() as connection:
        connection.execute(text(SETUP_SQL))


def run_probe(config: DatabaseConfig) -> dict[str, str]:
    result: dict[str, str] = {}
    rows = {"id": f"probe-{uuid4()}", "rolled_back_id": f"probe-{uuid4()}"}
    opened = closed = 0

    def connected(*args):
        nonlocal opened
        opened += 1

    def disconnected(*args):
        nonlocal closed
        closed += 1

    with engine_scope(config) as engine:
        event.listen(engine, "connect", connected)
        event.listen(engine, "close", disconnected)
        with session_context(engine) as session:
            verify(session.execute(text("SELECT 1")).scalar_one() == 1)
            result["select"] = "PASS"
        try:
            with session_context(engine) as session:
                session.execute(text("INSERT INTO moviegraph_runtime_probe (id, value) VALUES (:id, 'inserted')"), rows)
                session.commit()
            with session_context(engine) as session:
                verify(session.execute(text("SELECT value FROM moviegraph_runtime_probe WHERE id=:id"), rows).scalar_one() == "inserted")
                result["insert"] = "PASS"
                session.execute(text("UPDATE moviegraph_runtime_probe SET value='updated' WHERE id=:id"), rows)
                session.commit()
            with session_context(engine) as session:
                verify(session.execute(text("SELECT value FROM moviegraph_runtime_probe WHERE id=:id"), rows).scalar_one() == "updated")
                result["update"] = "PASS"
            class DeliberateRollback(Exception):
                pass
            try:
                with session_context(engine) as session:
                    session.execute(text("INSERT INTO moviegraph_runtime_probe (id, value) VALUES (:rolled_back_id, 'rolled back')"), rows)
                    session.execute(text("UPDATE moviegraph_runtime_probe SET value='rolled back' WHERE id=:id"), rows)
                    raise DeliberateRollback()
            except DeliberateRollback:
                pass
            with session_context(engine) as session:
                verify(session.execute(text("SELECT count(*) FROM moviegraph_runtime_probe WHERE id=:rolled_back_id"), rows).scalar_one() == 0)
                verify(session.execute(text("SELECT value FROM moviegraph_runtime_probe WHERE id=:id"), rows).scalar_one() == "updated")
                result["rollback"] = "PASS"
                session.execute(text("DELETE FROM moviegraph_runtime_probe WHERE id=:id"), rows)
                session.commit()
            with session_context(engine) as session:
                verify(session.execute(text("SELECT count(*) FROM moviegraph_runtime_probe WHERE id=:id"), rows).scalar_one() == 0)
                result["delete"] = "PASS"
        finally:
            # Delete only this invocation's UUID rows; never truncate/drop.
            with session_context(engine) as session:
                session.execute(text("DELETE FROM moviegraph_runtime_probe WHERE id IN (:id, :rolled_back_id)"), rows)
                session.commit()
    verify(opened > 0 and opened == closed)
    result["session_cleanup"] = "PASS"
    return result
