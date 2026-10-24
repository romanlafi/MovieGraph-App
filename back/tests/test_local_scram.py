import hashlib
import unittest
from unittest.mock import patch

import scramp.core
from scramp import ScramMechanism

from app.db.local_scram import LocalScramHashlib, install_local_scram_compatibility, pbkdf2_hmac


class LocalScramTests(unittest.TestCase):
    def test_derivation_matches_openssl_for_postgresql_iterations(self):
        for password, salt, iterations in (
            (b"password", b"salt", 1),
            (b"password", b"salt", 4096),
            (b"password\x00long", bytes(range(16)), 4096),
            ("contraseña".encode(), b"salt", 8192),
        ):
            with self.subTest(iterations=iterations, password=password):
                self.assertEqual(pbkdf2_hmac("sha256", password, salt, iterations),
                                 hashlib.pbkdf2_hmac("sha256", password, salt, iterations))

    def test_invalid_parameters_fail_closed(self):
        for hash_name, iterations in (("md5", 4096), ("sha256", 0), ("sha256", -1)):
            with self.assertRaises(ValueError):
                pbkdf2_hmac(hash_name, b"password", b"salt", iterations)

    def test_actual_scramp_derivation_retains_saslprep_and_hash(self):
        mechanism = ScramMechanism("SCRAM-SHA-256")
        expected = mechanism.make_auth_info("contraseña", salt=b"salt", iteration_count=4096)
        with patch.object(scramp.core, "hashlib", LocalScramHashlib()):
            # Soft hyphen is removed by SASLprep. Exercise the public API so a
            # private helper rename in scramp does not break the CI toolchain.
            self.assertEqual(mechanism.make_auth_info(
                "contra\u00adseña", salt=b"salt", iteration_count=4096,
            ), expected)

    def test_supported_native_runtime_is_not_patched(self):
        original = scramp.core.hashlib
        install_local_scram_compatibility()
        self.assertIs(scramp.core.hashlib, original)

    def test_missing_native_function_only_patches_scramp_reference(self):
        original = scramp.core.hashlib
        with patch("app.db.local_scram.hashlib", spec=["sha256"]):
            try:
                install_local_scram_compatibility()
                self.assertIsInstance(scramp.core.hashlib, LocalScramHashlib)
            finally:
                scramp.core.hashlib = original
