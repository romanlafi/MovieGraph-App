import unittest

from test_foundation import isolated, LOCAL_CONFIG


class PasswordTests(unittest.TestCase):
    def test_legacy_bcrypt_hash_and_verification(self):
        result = isolated('''
import bcrypt
from app.services.postgres.user_service import get_password_hash
from app.core.security import hash_password, verify_password
assert bcrypt.__version__ == '4.0.1'
for hash_function in (get_password_hash, hash_password):
    hashed = hash_function('short-password')
    assert hashed.startswith('$2b$')
    assert verify_password('short-password', hashed)
    assert not verify_password('wrong-password', hashed)
# Fixed existing bcrypt fixture, independent of the newly generated hashes.
fixture = '$2a$10$WvvTPHKwdBJ3uk0Z37EMR.hLA2W6N9AEBhEgrAOljy2Ae5MtaSIUi'
assert verify_password('abc', fixture)
assert not verify_password('incorrect', fixture)
print('bcrypt: both legacy hash helpers and existing $2a$ fixture PASS')
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
long_hash = hash_password('x' * 72 + 'first suffix')
assert verify_password('x' * 72 + 'second suffix', long_hash)
print('Worker bcrypt helpers preserve legacy hashes and 72-byte bcrypt semantics')
''', LOCAL_CONFIG)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
