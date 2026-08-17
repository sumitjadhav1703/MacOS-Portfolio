"""Workers AI, reached through the `AI` binding on this Worker.

Chosen because it costs nothing, needs no API key to leak, and runs in the same place as the
request. Everything provider-shaped lives in this file: swapping to a hosted API means writing
a sibling with the same `generate`, not touching retrieval, prompting or safety.

This is the only module in `ai/` that touches the JavaScript runtime, which is why the tests
never import it — they run the rest against a fake.
"""

from __future__ import annotations

import js
from pyodide.ffi import JsProxy, to_js

from config import Config
from models import Message
from providers.base import ProviderError


def _js(value: dict) -> JsProxy:
    """Convert a Python dict to a real JS object.

    Pyodide maps a bare dict to a `Map`, and the bindings expect a plain object, so a call
    made with one silently sees no arguments at all. `Object.fromEntries` is the conversion
    that produces what the runtime is actually looking for.
    """
    return to_js(value, dict_converter=js.Object.fromEntries)


class WorkersAI:
    name = "workers-ai"

    def __init__(self, env: object, config: Config) -> None:
        # The env, not the binding. Reading `env.AI` raises rather than returning None when the
        # binding is absent, and doing that in the constructor would blow up requests that never
        # reach a model at all — a malformed body, or a question the portfolio does not cover.
        # Deferred to the one moment it is actually needed, a missing binding is a 502 like any
        # other model failure instead of a traceback.
        self._env = env
        self._config = config

    async def generate(self, messages: list[Message]) -> str:
        binding = getattr(self._env, "AI", None)
        if binding is None:
            raise ProviderError("no AI binding")

        payload = {
            "messages": [m.as_json() for m in messages],
            "max_tokens": self._config.max_tokens,
            "temperature": self._config.temperature,
        }
        try:
            result = await binding.run(self._config.model, _js(payload))
        except Exception as error:  # noqa: BLE001 — the category is all the caller may know
            raise ProviderError(type(error).__name__) from error

        text = getattr(result, "response", None)
        if not isinstance(text, str) or not text.strip():
            raise ProviderError("empty response")
        return text.strip()
