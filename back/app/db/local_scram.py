"""Local Wrangler SCRAM compatibility for runtimes without OpenSSL PBKDF2.

Only the local Worker entrypoint installs this adapter. PostgreSQL continues
to verify SCRAM-SHA-256; neither authentication nor its iteration count changes.
The standard hashlib module and deployed Hyperdrive entrypoints are untouched.
"""

import hashlib
import hmac


def pbkdf2_hmac(hash_name: str, password: bytes, salt: bytes, iterations: int) -> bytes:
    if hash_name != "sha256":
        raise ValueError("The local PostgreSQL adapter supports SCRAM-SHA-256 only")
    if iterations < 1:
        raise ValueError("PBKDF2 iterations must be positive")
    template = hmac.new(password, digestmod=hashlib.sha256)

    def digest(message: bytes) -> bytes:
        calculation = template.copy()
        calculation.update(message)
        return calculation.digest()

    current = digest(salt + b"\x00\x00\x00\x01")
    derived = int.from_bytes(current, "big")
    for iteration in range(1, iterations):
        current = digest(current)
        derived ^= int.from_bytes(current, "big")
    return derived.to_bytes(32, "big")


class LocalScramHashlib:
    pbkdf2_hmac = staticmethod(pbkdf2_hmac)

    def __getattr__(self, name: str):
        return getattr(hashlib, name)


def install_local_scram_compatibility() -> None:
    if not hasattr(hashlib, "pbkdf2_hmac"):
        import scramp.core

        scramp.core.hashlib = LocalScramHashlib()
