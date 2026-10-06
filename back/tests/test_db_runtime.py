"""Binding/lifecycle mocks and real local SQLite transactions, never Neon."""

from contextlib import contextmanager
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.engine import URL
from sqlalchemy.exc import OperationalError
from sqlalchemy.pool import NullPool

from app.application import create_app
from app.db.database import create_database_engine, engine_scope, session_context, session_scope, get_db
from app.db.diagnostics import install_diagnostics
from app.db.probe import run_probe, setup_probe_table
from app.db.runtime import DatabaseConfig, DatabaseConfigurationError, request_database_config
from test_foundation import isolated, LOCAL_CONFIG


HD = {"host": "hyperdrive.test", "port": "5432", "user": "test-user",
      "password": "private:@/password", "database": "test-db"}
DEV = {"APP_ENV": "development", "DB_PROBE_ENABLED": "true",
       "DB_PROBE_DEVELOPMENT_DATABASE": "true", "DB_PROBE_TOKEN": "test-token"}


class DatabaseRuntimeTests(unittest.TestCase):
    def test_import_no_engine_driver_or_legacy_config(self):
        result = isolated('''
import sys
from unittest.mock import patch
with patch('sqlalchemy.create_engine', side_effect=AssertionError('Eager engine')):
    import app.db.database
    import app.models.movie
assert not any(m in sys.modules for m in ('app.core.config','psycopg2','pg8000'))
assert not hasattr(app.db.database, 'engine')
''')
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_local_url_retains_driver_and_tls_with_safe_errors(self):
        with patch.dict("os.environ", {"DATABASE_URL": "postgresql://user:secret@localhost/db?sslmode=require"}):
            config = DatabaseConfig.local()
        self.assertFalse(config.worker)
        self.assertEqual(config.url.drivername, "postgresql")
        self.assertEqual(config.url.query["sslmode"], "require")
        self.assertNotIn("secret", repr(config))
        for value in ("", "private-invalid", "sqlite:///private.db", "postgresql://user@host"):
            with self.subTest(value=value), self.assertRaises(DatabaseConfigurationError) as exc:
                DatabaseConfig.local(value)
            self.assertNotIn("private", str(exc.exception))

    def test_hyperdrive_parsing_and_request_precedence(self):
        for hd in (HD, SimpleNamespace(**HD)):
            config = DatabaseConfig.hyperdrive(SimpleNamespace(HYPERDRIVE=hd))
            self.assertTrue(config.worker)
            self.assertEqual(config.url.drivername, "postgresql+pg8000")
            self.assertEqual(config.url.password, HD["password"])
            self.assertEqual(config.url.port, 5432)
            self.assertNotIn(HD["password"], repr(config))
        with patch.dict("os.environ", {"DATABASE_URL": "postgresql://user:secret@localhost/db"}):
            with self.assertRaises(DatabaseConfigurationError):
                request_database_config(SimpleNamespace(scope={"env": {}}))
            self.assertFalse(request_database_config(SimpleNamespace(scope={})).worker)

    def test_invalid_binding_safe_errors(self):
        for env in ({}, {"HYPERDRIVE": {}}, {"HYPERDRIVE": {**HD, "port": "bad"}},
                    {"HYPERDRIVE": {**HD, "port": 0}}, {"HYPERDRIVE": {**HD, "password": None}}):
            with self.subTest(env=env), self.assertRaises(DatabaseConfigurationError) as exc:
                DatabaseConfig.hyperdrive(env)
            self.assertNotIn(HD["password"], str(exc.exception))
            self.assertNotIn(HD["host"], str(exc.exception))

    def test_worker_engine_uses_pg8000_nullpool_without_connecting(self):
        config = DatabaseConfig.hyperdrive({"HYPERDRIVE": HD})
        with patch("pg8000.dbapi.connect", side_effect=AssertionError("Eager connection")):
            engine = create_database_engine(config)
            self.assertIsInstance(engine.pool, NullPool)
            self.assertEqual(engine.dialect.driver, "pg8000")
            engine.dispose()
        with patch("app.db.database.create_engine") as factory:
            create_database_engine(config)
            self.assertEqual(factory.call_args.kwargs["connect_args"], {"ssl_context": False, "timeout": 10})

    def test_session_close_rollback_dispose_on_failure(self):
        config = DatabaseConfig.local("postgresql://user:secret@localhost/db")
        engine, session = Mock(), Mock()
        with patch("app.db.database.create_database_engine", return_value=engine), patch("app.db.database.Session", return_value=session):
            with self.assertRaisesRegex(RuntimeError, "deliberate"):
                with session_scope(config) as actual:
                    self.assertIs(actual, session)
                    raise RuntimeError("deliberate")
        session.rollback.assert_called_once()
        session.close.assert_called_once()
        engine.dispose.assert_called_once()

    def test_cleanup_even_when_rollback_fails_or_session_creation_fails(self):
        engine, session = Mock(), Mock()
        session.rollback.side_effect = RuntimeError("rollback failed")
        with patch("app.db.database.Session", return_value=session):
            with self.assertRaises(RuntimeError):
                with session_context(engine):
                    raise ValueError("transaction failure")
        session.close.assert_called_once()
        with patch("app.db.database.create_database_engine", return_value=engine), patch("app.db.database.Session", side_effect=RuntimeError):
            with self.assertRaises(RuntimeError):
                with session_scope(DatabaseConfig.local("postgresql://user:secret@localhost/db")):
                    pass
        engine.dispose.assert_called_once()

    def test_success_does_not_automatically_commit(self):
        engine, session = Mock(), Mock()
        with patch("app.db.database.Session", return_value=session):
            with session_context(engine):
                pass
        session.commit.assert_not_called()
        session.close.assert_called_once()

    def test_dependency_cleanup_and_configuration_failure(self):
        request = SimpleNamespace(scope={})
        with patch.dict("os.environ", {}, clear=True):
            dependency = get_db(request)
            with self.assertRaises(Exception) as caught:
                next(dependency)
            self.assertEqual(caught.exception.status_code, 503)
        with patch("app.db.database.request_database_config") as config, patch("app.db.database.session_scope") as scope:
            session = scope.return_value.__enter__.return_value
            dependency = get_db(request)
            self.assertIs(next(dependency), session)
            dependency.close()
            scope.return_value.__exit__.assert_called_once()

    def test_legacy_app_starts_without_database_url(self):
        result = isolated('''
from fastapi.testclient import TestClient
from app.main import app
with TestClient(app) as client:
    assert client.get('/api/health').status_code == 200
    assert client.get('/api/v1/movies/genres').status_code == 503
''', {k: v for k, v in LOCAL_CONFIG.items() if k != "DATABASE_URL"})
        self.assertEqual(result.returncode, 0, result.stderr)

    def diagnostic_client(self, env):
        app = create_app(include_legacy_api=False)
        install_diagnostics(app)
        @app.middleware("http")
        async def bind(request, call_next):
            request.scope["env"] = env
            return await call_next(request)
        return TestClient(app)

    def test_diagnostic_routes_fail_closed_and_no_secrets(self):
        with TestClient(create_app(include_legacy_api=False)) as client:
            self.assertEqual(client.get("/api/internal/db-health").status_code, 404)
            self.assertEqual(client.post("/api/internal/db-probe").status_code, 404)
        for env in ({}, {**DEV, "APP_ENV": "production"}, {**DEV, "DB_PROBE_ENABLED": "false"},
                    {**DEV, "DB_PROBE_DEVELOPMENT_DATABASE": "false"}):
            with self.diagnostic_client(env) as client:
                self.assertEqual(client.post("/api/internal/db-probe", headers={"Authorization": "Bearer test-token"}).status_code, 404)
        with self.diagnostic_client(DEV) as client:
            self.assertEqual(client.post("/api/internal/db-probe").status_code, 401)
            response = client.get("/api/internal/db-health", headers={"Authorization": "Bearer test-token"})
            self.assertEqual(response.status_code, 503)
            self.assertNotIn("test-token", response.text)

    def test_diagnostic_health_with_mocked_session(self):
        session = Mock()
        session.execute.return_value.scalar_one.return_value = 1
        @contextmanager
        def mock_scope(config):
            yield session
        with self.diagnostic_client({**DEV, "HYPERDRIVE": HD}) as client, patch("app.db.diagnostics.session_scope", mock_scope):
            response = client.get("/api/internal/db-health", headers={"Authorization": "Bearer test-token"})
            self.assertEqual(response.json(), {"database": "ok"})

    def test_diagnostic_post_with_real_sqlite_and_mocked_configuration(self):
        with tempfile.TemporaryDirectory() as folder:
            config = DatabaseConfig(URL.create("sqlite", database=str(Path(folder) / "probe.db")))
            with engine_scope(config) as engine:
                setup_probe_table(engine)
            with self.diagnostic_client(DEV) as client, patch("app.db.diagnostics.request_database_config", return_value=config):
                response = client.post("/api/internal/db-probe", headers={"Authorization": "Bearer test-token"})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json(), {k: "PASS" for k in ("select", "insert", "update", "rollback", "delete", "session_cleanup")})
                with patch("app.db.diagnostics.run_probe", side_effect=OperationalError("private-host", {}, Exception("private-password"))):
                    response = client.post("/api/internal/db-probe", headers={"Authorization": "Bearer test-token"})
                    self.assertEqual(response.status_code, 503)
                    self.assertNotIn("private", response.text)

    def test_probe_worker_entrypoint_does_not_import_legacy_or_connect(self):
        result = isolated('''
import runpy, sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
sys.modules['workers'] = SimpleNamespace(asgi=SimpleNamespace(entrypoint=lambda app: app))
sys.path.insert(0, str(Path('app').resolve()))
with patch('sqlalchemy.create_engine', side_effect=AssertionError('Eager engine')):
    worker = runpy.run_path('app/db_probe_worker.py')
    from fastapi.testclient import TestClient
    with TestClient(worker['app']) as client:
        assert client.get('/api/health').status_code == 200
        assert client.get('/api/internal/db-health').status_code == 404
        assert client.get('/api/v1/users/me').status_code == 404
assert not any(m.startswith(('models', 'app.models', 'passlib', 'bcrypt',
                             'core.config', 'services.postgres', 'psycopg2')) for m in sys.modules)
''')
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_real_sqlite_transactions_probe_and_cleanup(self):
        # Real SQLAlchemy transactions against a temporary SQLite FILE, not
        # pg8000/PostgreSQL/Hyperdrive. NullPool forces independent connections.
        with tempfile.TemporaryDirectory() as folder:
            config = DatabaseConfig(URL.create("sqlite", database=str(Path(folder) / "probe.db")))
            with engine_scope(config) as engine:
                setup_probe_table(engine)
                with engine.begin() as connection:
                    connection.execute(text("INSERT INTO moviegraph_runtime_probe (id,value) VALUES ('existing','preserve')"))
            self.assertEqual(run_probe(config), {k: "PASS" for k in ("select", "insert", "update", "rollback", "delete", "session_cleanup")})
            with engine_scope(config) as engine:
                with engine.connect() as connection:
                    self.assertEqual(connection.execute(text("SELECT id,value FROM moviegraph_runtime_probe")).all(), [("existing", "preserve")])

    def test_real_sqlite_uncommitted_work_is_rolled_back_at_close(self):
        with tempfile.TemporaryDirectory() as folder:
            config = DatabaseConfig(URL.create("sqlite", database=str(Path(folder) / "probe.db")))
            with engine_scope(config) as engine:
                setup_probe_table(engine)
                with session_context(engine) as session:
                    session.execute(text("INSERT INTO moviegraph_runtime_probe (id,value) VALUES ('uncommitted','test')"))
                with session_context(engine) as session:
                    self.assertEqual(session.execute(text("SELECT count(*) FROM moviegraph_runtime_probe")).scalar_one(), 0)


if __name__ == "__main__":
    unittest.main()
