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


if __name__ == "__main__":
    unittest.main()
