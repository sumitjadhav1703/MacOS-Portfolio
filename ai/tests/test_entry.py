"""The runtime boundary, exercised without the runtime.

`entry.py` and `providers/workers_ai.py` are the only modules that import `workers`, `js` and
`pyodide` — so they are the only ones a plain pytest run would otherwise never load, and the
only place a typo survives until deploy. Stubbing those three modules is enough to prove the
import graph resolves, the handler wires the provider up, and — the part actually worth
checking — that the payload reaches the binding as a JS object rather than as a Map.

What this cannot prove is that Cloudflare's `AI.run` accepts the object it is given. That needs
`pywrangler dev` against the real binding, and is the first thing to try at deploy time.
"""

from __future__ import annotations

import sys
import types

import pytest


# --- the three modules that only exist inside a Python Worker -----------------------------


class _Response:
    """Stands in for `workers.Response`, recording what the handler tried to return."""

    def __init__(self, payload, status):
        self.payload = payload
        self.status = status

    @staticmethod
    def json(payload, status=200):
        return _Response(payload, status)


class _WorkerEntrypoint:
    def __init__(self, env=None):
        self.env = env


_workers = types.ModuleType("workers")
_workers.Response = _Response
_workers.WorkerEntrypoint = _WorkerEntrypoint

_js = types.ModuleType("js")
_js.Object = types.SimpleNamespace(fromEntries="Object.fromEntries")

_conversions: list[tuple[dict, object]] = []


def _to_js(value, dict_converter=None):
    _conversions.append((value, dict_converter))
    return {"converted": value}


_ffi = types.ModuleType("pyodide.ffi")
_ffi.to_js = _to_js
_ffi.JsProxy = dict
_pyodide = types.ModuleType("pyodide")
_pyodide.ffi = _ffi

for name, module in (("workers", _workers), ("js", _js), ("pyodide", _pyodide), ("pyodide.ffi", _ffi)):
    sys.modules.setdefault(name, module)

from entry import Default  # noqa: E402
from providers.workers_ai import WorkersAI  # noqa: E402

from config import Config  # noqa: E402
from models import Message  # noqa: E402
from providers.base import ProviderError  # noqa: E402


# --- fakes for the request and the binding ------------------------------------------------


class FakeRequest:
    def __init__(self, body, method="POST", explode=False):
        self.method = method
        self._body = body
        self._explode = explode

    async def json(self):
        if self._explode:
            raise ValueError("not json")
        return self._body


class FakeBinding:
    def __init__(self, response="An answer.", explode=False):
        self.response = response
        self.explode = explode
        self.calls: list[tuple[str, object]] = []

    async def run(self, model, payload):
        self.calls.append((model, payload))
        if self.explode:
            raise RuntimeError("binding down")
        return types.SimpleNamespace(response=self.response)


def worker(binding) -> Default:
    return Default(env=types.SimpleNamespace(AI=binding))


def env_with(binding) -> types.SimpleNamespace:
    return types.SimpleNamespace(AI=binding)


# --- the provider --------------------------------------------------------------------------


async def test_the_payload_reaches_the_binding_as_a_js_object():
    """A bare dict becomes a JS Map, which the binding reads as no arguments at all."""
    _conversions.clear()
    binding = FakeBinding()
    await WorkersAI(env_with(binding), Config()).generate([Message("user", "hi")])

    payload, converter = _conversions[-1]
    assert converter == "Object.fromEntries"
    assert payload["messages"] == [{"role": "user", "content": "hi"}]
    assert payload["max_tokens"] == Config().max_tokens


async def test_the_configured_model_is_the_one_called():
    binding = FakeBinding()
    await WorkersAI(env_with(binding), Config(model="@cf/some/other-model")).generate([Message("user", "hi")])
    assert binding.calls[-1][0] == "@cf/some/other-model"


async def test_a_binding_failure_becomes_a_provider_error():
    with pytest.raises(ProviderError):
        await WorkersAI(env_with(FakeBinding(explode=True)), Config()).generate([Message("user", "hi")])


@pytest.mark.parametrize("response", ["", "   ", None])
async def test_an_empty_completion_is_a_provider_error_not_an_empty_answer(response):
    with pytest.raises(ProviderError):
        await WorkersAI(env_with(FakeBinding(response=response)), Config()).generate([Message("user", "hi")])


# --- the handler ---------------------------------------------------------------------------


async def test_a_question_is_answered_through_the_binding(content):
    binding = FakeBinding(response="PM2.5 Forecasting uses PyTorch.")
    got = await worker(binding).fetch(
        FakeRequest({"message": "Which projects use PyTorch?", "content": content})
    )

    assert got.status == 200
    assert got.payload["answer"] == "PM2.5 Forecasting uses PyTorch."
    assert got.payload["sources"][0]["slug"] == "pm25-forecasting"


async def test_the_bundle_is_separated_from_the_visitor_input_before_validation(content):
    """`content` is the caller's field, `message` is the visitor's, and only one is validated.

    If the bundle were left in the body, the size rules meant for a question would be applied
    to a whole portfolio and every ask would 400.
    """
    binding = FakeBinding()
    ok = await worker(binding).fetch(FakeRequest({"message": "Which projects use PyTorch?", "content": content}))
    assert ok.status == 200

    too_long = await worker(binding).fetch(FakeRequest({"message": "a" * 601, "content": content}))
    assert too_long.status == 400


async def test_a_non_post_is_refused():
    got = await worker(FakeBinding()).fetch(FakeRequest({}, method="GET"))
    assert got.status == 405


async def test_an_unparseable_body_is_400():
    got = await worker(FakeBinding()).fetch(FakeRequest(None, explode=True))
    assert got.status == 400
    assert set(got.payload) == {"error"}


async def test_a_missing_bundle_still_answers_rather_than_crashing():
    got = await worker(FakeBinding()).fetch(FakeRequest({"message": "Which projects use PyTorch?"}))
    assert got.status == 200
    assert got.payload["sources"] == []


async def test_a_binding_failure_surfaces_as_502(content):
    got = await worker(FakeBinding(explode=True)).fetch(
        FakeRequest({"message": "Which projects use PyTorch?", "content": content})
    )
    assert got.status == 502
    assert got.payload == {"error": "The assistant is unavailable."}


async def test_a_missing_ai_binding_is_a_502_and_not_a_traceback(content):
    """Reading an absent binding raises, and the runtime returns the traceback as the body.

    Found by running this against `pywrangler dev` with no AI binding: the response carried a
    Python stack with `/session/metadata/entry.py` paths in it. The binding is now read at the
    moment it is used, so its absence is an ordinary model failure.
    """
    bare = Default(env=types.SimpleNamespace())
    got = await bare.fetch(FakeRequest({"message": "Which projects use PyTorch?", "content": content}))

    assert got.status == 502
    assert got.payload == {"error": "The assistant is unavailable."}


async def test_validation_still_answers_when_there_is_no_binding_at_all():
    """A malformed question never needs a model, so it must not depend on one being present."""
    bare = Default(env=types.SimpleNamespace())
    assert (await bare.fetch(FakeRequest({"message": "   "}))).status == 400
    assert (await bare.fetch(FakeRequest({"message": "a" * 601}))).status == 400
    assert (await bare.fetch(FakeRequest({}, method="GET"))).status == 405


async def test_an_unexpected_failure_is_one_sentence_not_an_exception(content, monkeypatch):
    """Whatever else breaks, the body stays a fixed string with no internals in it."""
    import entry

    async def boom(*_args, **_kwargs):
        raise RuntimeError("/session/metadata/entry.py line 41, secret in scope")

    monkeypatch.setattr(entry, "handle", boom)
    got = await worker(FakeBinding()).fetch(FakeRequest({"message": "hi", "content": content}))

    assert got.status == 500
    assert got.payload == {"error": "The assistant is unavailable."}
