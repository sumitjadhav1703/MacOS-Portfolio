"""The one thing a model has to do, and the one way it is allowed to fail.

Kept to a single method on purpose. A provider layer earns its place by making the model
swappable; anything beyond `generate` would be a framework for a problem nobody has yet.
"""

from __future__ import annotations

from typing import Protocol

from models import Message


class ProviderError(Exception):
    """The model could not answer. Raised instead of returning a placeholder string, so a
    failure surfaces as a 502 and the browser falls back to the deterministic answers rather
    than showing the visitor an apology written by nobody."""


class AIProvider(Protocol):
    #: Short identifier for logs. Never includes a key, endpoint or account id.
    name: str

    async def generate(self, messages: list[Message]) -> str: ...
