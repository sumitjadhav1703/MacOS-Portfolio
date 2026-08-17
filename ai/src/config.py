"""Runtime knobs, read from the Worker's environment with working defaults.

The model id is configurable because it is the thing most likely to change without any code
changing — a better small model ships, `AI_MODEL` is set, nothing is redeployed from source.
"""

from __future__ import annotations

from dataclasses import dataclass

#: Workers AI's instruction-tuned default. Fast, free-tier eligible, and adequate at the only
#: job it has here: rewriting supplied context into two or three sentences.
DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"


@dataclass(frozen=True)
class Config:
    model: str = DEFAULT_MODEL
    max_tokens: int = 400
    temperature: float = 0.2


def _get(env: object, name: str) -> str:
    """Read one variable off the Worker env, which is a JS object, not a dict."""
    value = getattr(env, name, None)
    return value if isinstance(value, str) and value else ""


def from_env(env: object) -> Config:
    model = _get(env, "AI_MODEL") or DEFAULT_MODEL
    return Config(model=model)
