import unittest

from test_foundation import isolated, LOCAL_CONFIG


class PasswordTests(unittest.TestCase):
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
