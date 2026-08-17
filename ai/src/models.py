"""The shapes that move between retrieval, prompting and the provider.

Plain dataclasses, not pydantic: the only untrusted input is one request body, and
`safety.read_request` validates it in about twenty lines. A validation framework would be
more code than the thing it validates.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Doc:
    """One retrievable piece of the published portfolio.

    `terms` is the searchable token set, precomputed once per request; `text` is what the
    model actually sees. `slug` is empty for anything the site has no page for.
    """

    kind: str
    slug: str
    title: str
    text: str
    terms: frozenset[str]


@dataclass(frozen=True)
class Source:
    """A citation the UI renders under an answer, and links when `slug` is set."""

    type: str
    slug: str
    title: str

    def as_json(self) -> dict[str, str]:
        return {"type": self.type, "slug": self.slug, "title": self.title}


@dataclass(frozen=True)
class Message:
    role: str
    content: str

    def as_json(self) -> dict[str, str]:
        return {"role": self.role, "content": self.content}


@dataclass(frozen=True)
class Request:
    """A validated ask. Never constructed except by `safety.read_request`."""

    message: str
    history: tuple[Message, ...]


@dataclass(frozen=True)
class Answer:
    text: str
    sources: tuple[Source, ...]

    def as_json(self) -> dict[str, object]:
        return {"answer": self.text, "sources": [s.as_json() for s in self.sources]}
