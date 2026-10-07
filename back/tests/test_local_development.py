import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

from resources.migration_target import validate_migration_target


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
spec = importlib.util.spec_from_file_location("moviegraph_run_local", ROOT / "scripts" / "run_local.py")
local = importlib.util.module_from_spec(spec)
spec.loader.exec_module(local)


class LocalDevelopmentTests(unittest.TestCase):
    def test_local_migration_target_cannot_select_remote_or_other_databases(self):
        valid = "postgresql+pg8000://moviegraph_local:private@127.0.0.1:5442/moviegraph_local"
        validate_migration_target(valid, "local-development", "1")
        for url, target, authorized in (
            (valid.replace("127.0.0.1", "ep-prod.eu.neon.tech"), "local-development", "1"),
            (valid.replace("5442", "5432"), "local-development", "1"),
            (valid.replace("moviegraph_local", "other_project"), "local-development", "1"),
            (valid, "production", "1"), (valid, "local-development", ""),
            (valid, "neon-development", "1"),
        ):
            with self.subTest(url=url, target=target):
                with self.assertRaises(RuntimeError) as caught:
                    validate_migration_target(url, target, authorized)
                self.assertNotIn("private", str(caught.exception))

    def test_neon_development_still_requires_direct_endpoint_and_tls(self):
        valid = "postgresql://test:private@ep-dev.eu.neon.tech/moviegraph?sslmode=require"
        validate_migration_target(valid, "neon-development", "1")
        for url in (valid.replace("?sslmode=require", ""), valid.replace("ep-dev.", "ep-dev-pooler."),
                    valid.replace("neon.tech", "neon.tech.attacker.test")):
            with self.assertRaises(RuntimeError):
                validate_migration_target(url, "neon-development", "1")

    def test_local_secrets_are_generated_stable_and_do_not_reuse_neon_or_jwt_secrets(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / ".dev.vars"
            source.write_text('TMDB_READ_ACCESS_TOKEN="tmdb-fixture"\nSECRET_KEY="pre-secret"\nDATABASE_URL="remote-fixture"\n', encoding="utf-8")
            with patch.object(local, "ROOT", root), patch.object(local, "LOCAL_CONFIG", root / ".local.env"), \
                    patch.object(local, "LOCAL_WORKER_SECRETS", root / ".dev.vars.local"):
                password = local.read_local_password()
                self.assertEqual(password, local.read_local_password())
                self.assertEqual(len(password), 64)
                local.prepare_worker_secrets()
                values = local.dotenv_values(root / ".dev.vars.local", interpolate=False)
                self.assertEqual(values["TMDB_READ_ACCESS_TOKEN"], "tmdb-fixture")
                self.assertNotEqual(values["SECRET_KEY"], "pre-secret")
                self.assertNotIn("DATABASE_URL", values)
                local.prepare_worker_secrets()
                self.assertEqual(values, local.dotenv_values(root / ".dev.vars.local", interpolate=False))
                self.assertIn("pre-secret", source.read_text())

    def test_migration_is_an_explicit_admin_command_with_isolated_url(self):
        with patch.object(local.subprocess, "run", return_value=Mock(returncode=0)) as run:
            local.apply_local_migrations(local.local_database_url("a" * 64), {"ALEMBIC_TARGET": "production"})
        arguments = run.call_args
        self.assertEqual(arguments.args[0], [sys.executable, "-m", "alembic", "upgrade", "head"])
        self.assertEqual(arguments.kwargs["env"]["ALEMBIC_TARGET"], "local-development")
        self.assertEqual(arguments.kwargs["env"]["ALEMBIC_ALLOW_DATA_MIGRATION"], "1")
        self.assertIn("@127.0.0.1:5442/moviegraph_local", arguments.kwargs["env"]["ALEMBIC_DATABASE_URL"])
        self.assertTrue(arguments.kwargs["capture_output"])

    def test_normal_run_checks_head_but_does_not_apply_migrations(self):
        with patch.object(sys, "argv", ["run_local.py"]), \
                patch.object(local, "read_local_password", return_value="a" * 64), \
                patch.object(local, "prepare_worker_secrets"), patch.object(local, "start_database"), \
                patch.object(local, "check_local_schema", return_value={}), \
                patch.object(local, "apply_local_migrations") as migrate, \
                patch.object(local, "run_application") as launch:
            self.assertEqual(local.main(), 0)
            migrate.assert_not_called()
            launch.assert_called_once()
            environment = launch.call_args.args[0]
            self.assertIn("@127.0.0.1:5442/moviegraph_local", environment["CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE"])

    def test_wranger_local_never_contains_a_remote_hyperdrive_id(self):
        config = json.loads((ROOT / "wrangler.local.jsonc").read_text())
        self.assertEqual(config["env"]["local"]["hyperdrive"], [
            {"binding": "HYPERDRIVE", "id": "0" * 32},
        ])
        compose = (ROOT / "compose.local.yaml").read_text()
        self.assertIn('"127.0.0.1:5442:5432"', compose)
        self.assertNotIn("pg_data:", compose)

    def test_worker_and_frontend_are_cleaned_when_startup_fails(self):
        worker = Mock()
        with patch.object(local.shutil, "which", return_value="npm"), \
                patch.object(local, "port_is_open", return_value=False), \
                patch.object(local.subprocess, "Popen", return_value=worker), \
                patch.object(local, "wait_for_port", side_effect=RuntimeError("startup failed")), \
                patch.object(local, "stop_process_tree") as cleanup:
            with self.assertRaises(RuntimeError):
                local.run_application({})
            cleanup.assert_called_once_with(worker)
