import unittest
from unittest.mock import Mock, patch

from app.social.passwords import hash_password_in_database, verify_password_in_database

from test_foundation import isolated, LOCAL_CONFIG


class PasswordTests(unittest.TestCase):
    def test_postgres_hash_uses_bound_parameters_and_cost_twelve_without_python_bcrypt(self):
        database = Mock()
        database.execute.return_value.scalar_one.return_value = "database-hash"
        with patch("bcrypt.hashpw", side_effect=AssertionError("Worker must not compute bcrypt")):
            self.assertEqual(hash_password_in_database(database, "a-long-enough-password"), "database-hash")
        statement, parameters = database.execute.call_args.args
        self.assertIn("public.gen_salt('bf', 12)", str(statement))
        self.assertNotIn("a-long-enough-password", str(statement))
        self.assertEqual(parameters, {"password": "a-long-enough-password"})

    def test_postgres_verification_preserves_legacy_bcrypt_payloads(self):
        database = Mock()
        database.execute.return_value.scalar_one.return_value = True
        payload = "10$WvvTPHKwdBJ3uk0Z37EMR.hLA2W6N9AEBhEgrAOljy2Ae5MtaSIUi"
        for variant in ("a", "b", "y"):
            with self.subTest(variant=variant), patch("bcrypt.checkpw", side_effect=AssertionError("No Worker bcrypt")):
                self.assertTrue(verify_password_in_database(database, "abc", f"$2{variant}${payload}"))
                self.assertEqual(database.execute.call_args.args[1]["password_hash"], f"$2a${payload}")
        database.execute.return_value.scalar_one.return_value = False
        self.assertFalse(verify_password_in_database(database, "wrong", f"$2b${payload}"))

    def test_postgres_rejects_invalid_inputs_without_queries_or_truncation(self):
        database = Mock()
        valid_hash = "$2b$12$" + "a" * 53
        for password, password_hash in (("x" * 73, valid_hash), ("é" * 37, valid_hash),
                                        ("abc\x00suffix", valid_hash), ("abc", "unused"),
                                        ("abc", "$1$unsupported"), ("abc", None)):
            self.assertFalse(verify_password_in_database(database, password, password_hash))
        for password in ("x" * 73, "é" * 37, "abc\x00suffix"):
            with self.assertRaises(ValueError):
                hash_password_in_database(database, password)
        database.execute.assert_not_called()

    def test_existing_bcrypt_hash_verification(self):
        result = isolated('''
from app.social.passwords import hash_password, verify_password
# Fixed existing bcrypt fixture, independent of the newly generated hashes.
fixture = '$2a$10$WvvTPHKwdBJ3uk0Z37EMR.hLA2W6N9AEBhEgrAOljy2Ae5MtaSIUi'
assert verify_password('abc', fixture)
assert not verify_password('incorrect', fixture)
print('Existing $2a$ password fixture PASS')
''', LOCAL_CONFIG)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_worker_bcrypt_helpers_verify_legacy_hashes(self):
        result = isolated('''
from app.social.passwords import hash_password, verify_password
existing = '$2a$10$WvvTPHKwdBJ3uk0Z37EMR.hLA2W6N9AEBhEgrAOljy2Ae5MtaSIUi'
assert verify_password('abc', existing)
assert not verify_password('wrong', existing)
hashed = hash_password('worker-password')
assert hashed.startswith('$2b$12$')
assert verify_password('worker-password', hashed)
assert not verify_password('other-password', hashed)
try:
    hash_password('x' * 72 + 'suffix')
except ValueError:
    pass
else:
    raise AssertionError('Passwords longer than 72 UTF-8 bytes must be rejected')
assert not verify_password('x' * 72 + 'different suffix', hash_password('x' * 72))
print('Worker bcrypt helpers preserve legacy hashes and reject inputs beyond 72 bytes')
''', LOCAL_CONFIG)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
