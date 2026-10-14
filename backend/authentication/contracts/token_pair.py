from typing import TypedDict


class TokenPair(TypedDict):
    access: str
    refresh: str | None