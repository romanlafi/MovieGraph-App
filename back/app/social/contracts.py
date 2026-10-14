"""Internal identities and credentials; public contracts live in schemas."""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class SocialUser:
    id: int
    email: str
    username: str


@dataclass(frozen=True)
class AccountCredentials:
    id: int
    email: str
    username: str
    password_hash: str = field(repr=False)
