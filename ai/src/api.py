"""Ask Sumit, end to end: validate, retrieve, prompt, generate, guard.

Everything here is pure apart from the provider call, so the whole path is testable against a
fake model with no runtime involved. `entry.py` does nothing but decode a request and encode
what this returns.
"""

from __future__ import annotations

from models import Answer
from prompting import SYSTEM, build_messages
from providers.base import AIProvider, ProviderError
from retrieval import flatten, retrieve, sources
from safety import Rejected, leaks, read_request

#: Used only if the CMS has not set `os.aiFallback`. The real one is editable in /admin.
DEFAULT_UNAVAILABLE = "I don't have that information in Sumit's portfolio."


def unavailable_text(content: object) -> str:
    if isinstance(content, dict):
        os_content = content.get("os")
        if isinstance(os_content, dict):
            text = os_content.get("aiFallback")
            if isinstance(text, str) and text.strip():
                return text.strip()
    return DEFAULT_UNAVAILABLE


async def answer(body: object, content: object, provider: AIProvider) -> Answer:
    """One question against one published bundle.

    Two of the three exits never reach the model. Retrieving nothing means the portfolio does
    not cover the question, and a leaking answer means the reply cannot be shown — in both
    cases the honest response is the portfolio's own "I don't know", not a generated one.
    """
    request = read_request(body)
    unavailable = unavailable_text(content)

    docs = retrieve(request.message, flatten(content))
    if not docs:
        return Answer(text=unavailable, sources=())

    text = await provider.generate(build_messages(request.message, request.history, docs))
    if leaks(text, SYSTEM):
        return Answer(text=unavailable, sources=())

    return Answer(text=text, sources=sources(docs))


async def handle(body: object, content: object, provider: AIProvider) -> tuple[int, dict]:
    """The status/body pair for one request. The only place failures become HTTP.

    Error bodies carry a fixed sentence and nothing else: no exception text, no provider name,
    no model id. The detail belongs in the Worker log, not in a public response.
    """
    try:
        return 200, (await answer(body, content, provider)).as_json()
    except Rejected as rejected:
        return rejected.status, {"error": rejected.message}
    except ProviderError:
        return 502, {"error": "The assistant is unavailable."}
