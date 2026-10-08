import importlib.util
import os
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch
from urllib.error import HTTPError
from xml.etree import ElementTree

from resources.migration_target import validate_migration_target
from test_foundation import isolated


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
spec = importlib.util.spec_from_file_location("moviegraph_run_local", ROOT / "scripts" / "run_local.py")
local = importlib.util.module_from_spec(spec)
spec.loader.exec_module(local)
import local_processes
import deploy_worker


class LocalDevelopmentTests(unittest.TestCase):
    def test_pycharm_has_one_local_run_with_explicit_local_setup_before_launch(self):
        names = {}
        for path in (ROOT / ".run").glob("*.run.xml"):
            configuration = ElementTree.parse(path).getroot().find("configuration")
            names[configuration.attrib["name"]] = configuration
        self.assertEqual(set(names), {
            "MovieGraph Local", "MovieGraph Setup Local DB",
            "MovieGraph Migrate Neon PRE", "MovieGraph Verify Neon PRE",
        })
        before_launch = names["MovieGraph Local"].find("method/option")
        self.assertEqual(before_launch.attrib["run_configuration_name"], "MovieGraph Setup Local DB")
        self.assertEqual(before_launch.attrib["enabled"], "true")
        self.assertEqual(names["MovieGraph Setup Local DB"].find("option[@name='PARAMETERS']").attrib["value"], "--setup-db")

    def test_deployment_commands_reject_wrong_git_branches(self):
        for target, branch in (("staging", "main"), ("staging", "cloudflare-refactor"),
                               ("production", "staging"), ("production", "")):
            with self.subTest(target=target, branch=branch), self.assertRaises(RuntimeError):
                deploy_worker.deployment_command(target, branch)
        staging = deploy_worker.deployment_command("staging", "staging")
        production = deploy_worker.deployment_command("production", "main")
        self.assertIn("preview", staging)
        self.assertIn("wrangler.preview.jsonc", staging)
        self.assertIn("deploy", production)
        self.assertIn("wrangler.jsonc", production)

    def test_deployed_configs_use_distinct_hyperdrive_bindings(self):
        production = json.loads((ROOT / "wrangler.jsonc").read_text())
        staging = json.loads((ROOT / "wrangler.preview.jsonc").read_text())
        self.assertEqual(production["name"], staging["name"])
        self.assertEqual(production["main"], staging["main"])
        self.assertEqual(production["hyperdrive"][0]["id"], "4cbe52bd629d47c8b2b69a3529691f78")
        self.assertEqual(production["previews"]["hyperdrive"][0]["id"], "24054140a3aa418ba1bd24b015f3d04b")
        self.assertEqual(production["previews"]["vars"]["APP_ENV"], "pre")
        self.assertNotIn("hyperdrive", staging)
        self.assertEqual(staging["previews"]["hyperdrive"][0]["id"], "24054140a3aa418ba1bd24b015f3d04b")
        for config in (production, staging):
            self.assertTrue((ROOT / config["main"]).is_file())
            self.assertTrue(config["assets"]["run_worker_first"])
            self.assertNotIn("SECRET_KEY", config.get("vars", {}))
        for path in (ROOT / "tools" / "diagnostics").glob("wrangler*.jsonc"):
            config = json.loads(path.read_text())
            self.assertTrue((path.parent / config["main"]).resolve().is_file())
            self.assertEqual(config["hyperdrive"][0]["id"], "24054140a3aa418ba1bd24b015f3d04b")

    def test_docker_timeout_gives_an_actionable_message_without_credentials(self):
        with patch.object(local.shutil, "which", return_value="docker"), \
                patch.object(local.subprocess, "run", side_effect=local.subprocess.TimeoutExpired("docker info", 60)):
            with self.assertRaisesRegex(RuntimeError, "Docker Desktop is not responding"):
                local.start_database({})

    def test_local_readiness_requires_protected_account_route_not_only_open_port(self):
        worker = Mock()
        worker.poll.return_value = None
        health = Mock()
        health.__enter__ = Mock(return_value=Mock(status=200))
        health.__exit__ = Mock(return_value=False)
        for status, succeeds in ((401, True), (404, False), (500, False)):
            with self.subTest(status=status), patch.object(local_processes, "urlopen", side_effect=[
                health, HTTPError("http://localhost/api/v1/users/me", status, "fixture", {}, None),
            ]):
                if succeeds:
                    local_processes.wait_for_local_api(worker, 8787)
                else:
                    with self.assertRaises(RuntimeError):
                        local_processes.wait_for_local_api(worker, 8787)

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

    def test_local_worker_mounts_account_and_follow_routes(self):
        application_path = ROOT / "back" / "app"
        backend_path = ROOT / "back"
        python_path = os.pathsep.join((str(application_path), str(backend_path)))
        result = isolated("""
import sys, types
workers = types.ModuleType('workers')
workers.asgi = types.SimpleNamespace(entrypoint=lambda app: app)
sys.modules['workers'] = workers
import local_worker
paths = {route.path for route in local_worker.app.routes}
assert '/api/v1/users/' in paths
assert '/api/v1/users/login' in paths
assert '/api/v1/users/me' in paths
assert '/api/v1/follows/movie-likes' in paths
""", {"PYTHONPATH": python_path})
        self.assertEqual(result.returncode, 0, result.stderr)

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
