"""Expected account failures, with no HTTP dependencies."""

from typing import Literal


AccountConflictCode = Literal["email_conflict", "user_conflict"]


class DuplicateAccountError(Exception):
    def __init__(self, code: AccountConflictCode):
        self.code = code
        super().__init__(code)


class AccountCreationError(Exception):
    pass
