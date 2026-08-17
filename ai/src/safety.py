"""Input validation and output guards for a public, unauthenticated endpoint.

Two jobs, kept apart:

* `read_request` decides whether a body is allowed in at all. It is the trust boundary, so it
  is strict and total — every branch either returns a `Request` or raises `Rejected`.
* `leaks` decides whether an answer is allowed out. It cannot catch a determined
  exfiltration and is not the primary defence — the prompt and the fact that the process only
  ever holds published rows are. It is the last, cheap net.
"""

from __future__ import annotations

import re
import unicodedata

from models import Message, Request

#: Longest question accepted. Long enough for a real recruiter question, short enough that no
#: single request can push a wall of injected instructions past the portfolio context.
MAX_MESSAGE = 600

#: How many prior turns the browser may replay. Each is capped at MAX_MESSAGE too.
MAX_HISTORY = 6

ROLES = ("user", "assistant")


class Rejected(Exception):
    """A body that must not be processed. Carries the status the caller should return."""

    def __init__(self, status: int, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.message = message


def clean(text: str) -> str:
    """Strip control characters and collapse whitespace.

    Format characters (category Cf) matter here specifically: zero-width joiners and
    bidirectional overrides are how a message hides one instruction inside another. Normalising
    to NFKC first also folds the full-width and mathematical alphabets that get used to slip
    past literal string checks.
    """
    text = unicodedata.normalize("NFKC", text)
    # Newlines and tabs become spaces; every other control or format character is deleted
    # outright. The distinction matters both ways: dropping a newline would weld two words
    # together, and replacing a zero-width joiner with a space would split one apart.
    text = "".join(
        " " if c.isspace() else c
        for c in text
        if c.isspace() or unicodedata.category(c) not in ("Cc", "Cf", "Co", "Cs")
    )
    return re.sub(r"\s+", " ", text).strip()


def _one_message(value: object, field: str) -> str:
    if not isinstance(value, str):
        raise Rejected(400, f"{field} must be text.")
    text = clean(value)
    if len(text) > MAX_MESSAGE:
        raise Rejected(400, f"{field} is too long.")
    return text


def read_request(body: object) -> Request:
    """Validate a decoded JSON body into a `Request`, or raise `Rejected`.

    History is *filtered*, not rejected: a malformed prior turn is dropped rather than failing
    the whole ask, because the browser owns that array and a recruiter should not lose their
    question to a stale entry. The current message is rejected outright, because it is the
    thing being asked and there is no sensible way to guess at it.
    """
    if not isinstance(body, dict):
        raise Rejected(400, "Expected a JSON object.")

    message = _one_message(body.get("message"), "message")
    if not message:
        raise Rejected(400, "Ask a question.")

    history: list[Message] = []
    raw = body.get("history")
    if isinstance(raw, list):
        for item in raw[-MAX_HISTORY:]:
            if not isinstance(item, dict):
                continue
            role = item.get("role")
            content = item.get("content")
            if role not in ROLES or not isinstance(content, str):
                continue
            text = clean(content)[:MAX_MESSAGE]
            if text:
                history.append(Message(role=role, content=text))

    return Request(message=message, history=tuple(history))


#: Shapes that must never appear in an answer. Env-var names are matched by their *shape*
#: (SCREAMING_SNAKE of some length) rather than by a list, so a binding added next year is
#: covered without anyone remembering to update this.
_ENV_SHAPE = re.compile(r"\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+){2,}\b")
_SECRETS = ("pbkdf2$", "cf-connecting-ip", "d1database", "wrangler secret")


def leaks(answer: str, system_prompt: str) -> bool:
    """True when an answer looks like it is quoting the system prompt or internals back.

    The system-prompt check compares against its opening line rather than the whole text: a
    model that has been talked into reciting it starts at the beginning, and a short prefix
    does not false-positive on an answer that happens to reuse a common phrase.
    """
    low = answer.lower()
    opening = system_prompt.strip().splitlines()[0].strip().lower()
    if opening and opening[:40] in low:
        return True
    if any(s in low for s in _SECRETS):
        return True
    return bool(_ENV_SHAPE.search(answer))
