"""Turn the published portfolio bundle into the few paragraphs one question needs.

Deterministic, no embeddings. The portfolio is a few dozen records; a token-overlap score with
a category prior finds the right ones, costs nothing, and — unlike a vector index — cannot
drift out of date, because it is recomputed from the bundle on every request. Add vector
search only if real questions start missing.

The bundle arrives as decoded JSON, so everything here reads defensively: a field the CMS has
not filled in yet is absent, not empty, and must not raise.
"""

from __future__ import annotations

from urllib.parse import urlparse

from models import Doc, Source

#: Tokens that carry no signal but appear in most questions. Deliberately short — an
#: aggressive stoplist starts eating words like "work" and "use" that do discriminate here.
STOPWORDS = frozenset(
    """
    a an and are as at be by can did do does for from has have he her him his how i in is it
    its me my of on or she that the their them there they this to was were what when where
    which who whom whose why will with you your sumit sumits tell show about please
    """.split()
)

#: Question words that point at a kind of record. A hit is a prior, not a filter: it lifts a
#: whole category so "what has he built?" reaches the projects even though no project contains
#: the word "built", while still letting a strong term match in another kind outrank it.
ROUTES: tuple[tuple[tuple[str, ...], tuple[str, ...]], ...] = (
    (("project", "projects", "built", "build", "made", "portfolio", "demo", "app", "shipped"), ("project",)),
    (("skill", "skills", "tech", "technology", "technologies", "stack", "language", "languages", "tools", "know"), ("skill",)),
    (("experience", "work", "worked", "job", "role", "intern", "internship", "company"), ("experience",)),
    (("education", "study", "studying", "studied", "degree", "college", "university", "school", "gpa"), ("education",)),
    (("certificate", "certificates", "certification", "certifications", "certified", "course", "courses"), ("certificate",)),
    (("contact", "email", "reach", "github", "linkedin", "hire", "link", "links", "profile", "social"), ("link", "site")),
    (("who", "background", "bio", "summary", "introduce", "himself", "overview"), ("site",)),
)

#: How many documents may reach the model, and the total characters they may occupy. Both are
#: about cost and focus, not about a context-window limit: a shorter, relevant context is what
#: keeps the model from wandering into a neighbouring project.
TOP_K = 6
CONTEXT_BUDGET = 6000

_KIND_LABEL = {
    "project": "Project",
    "skill": "Skills",
    "experience": "Experience",
    "education": "Education",
    "certificate": "Certificate",
    "link": "Link",
    "site": "About",
}


def tokens(text: str) -> set[str]:
    """Lowercase word tokens, keeping the characters that make technology names distinct.

    `+`, `#` and `.` stay inside a token so "c++", "c#" and "scikit-learn.js" survive as
    themselves rather than collapsing into "c" and matching every sentence in the portfolio.
    """
    out: set[str] = set()
    word: list[str] = []
    for char in text.lower():
        if char.isalnum() or char in "+#.":
            word.append(char)
        elif word:
            out.add("".join(word).strip("."))
            word = []
    if word:
        out.add("".join(word).strip("."))
    return {w for w in out if w}


def _text(value: object) -> str:
    return value if isinstance(value, str) else ""


def _list(value: object) -> list:
    return value if isinstance(value, list) else []


def _section_text(section: object) -> str:
    """Flatten one project section — prose, flow diagram or metric table — into a sentence."""
    if not isinstance(section, dict):
        return ""
    body = section.get("body")
    body = body if isinstance(body, dict) else {}
    parts = [_text(section.get("heading")), _text(body.get("text"))]
    for row in _list(body.get("flow")) + _list(body.get("metrics")):
        parts.extend(_text(cell) for cell in _list(row))
    return " ".join(p for p in parts if p)


def _host(url: str) -> str:
    try:
        return (urlparse(url).hostname or "").removeprefix("www.")
    except ValueError:
        return ""


def _doc(kind: str, slug: str, title: str, text: str, extra: str = "") -> Doc:
    return Doc(
        kind=kind,
        slug=slug,
        title=title,
        text=text,
        terms=frozenset(tokens(f"{title} {text} {extra}")),
    )


def _project_doc(raw: object) -> Doc | None:
    if not isinstance(raw, dict):
        return None
    title = _text(raw.get("title"))
    if not title:
        return None
    stack = [_text(s) for s in _list(raw.get("stack")) if _text(s)]
    links = [raw_link for raw_link in _list(raw.get("links")) if isinstance(raw_link, dict)]
    lines = [
        f"{title} — {_text(raw.get('tagline'))}".strip(" —"),
        f"Status: {_text((raw.get('status') or {}).get('label')) if isinstance(raw.get('status'), dict) else ''}".strip(),
        f"Stack: {', '.join(stack)}" if stack else "",
        *(_section_text(s) for s in _list(raw.get("sections"))),
        _text(raw.get("note")),
        _text(raw.get("caveat")),
        *(f"{_text(link.get('label'))}: {_host(_text(link.get('url')))}" for link in links),
    ]
    aliases = " ".join(_text(a) for a in _list(raw.get("aliases")))
    return _doc(
        "project",
        _text(raw.get("slug")),
        title,
        "\n".join(line for line in lines if line and line != "Status:"),
        extra=f"{aliases} {_text(raw.get('desktopLabel'))}",
    )


def flatten(content: object) -> list[Doc]:
    """The published bundle as a flat list of retrievable documents.

    Every record the CMS publishes becomes exactly one Doc. Nothing is filtered here: the
    caller was handed a bundle that D1 already restricted to `published = 1`, so there is no
    second visibility rule to get wrong.
    """
    content = content if isinstance(content, dict) else {}
    docs: list[Doc] = []

    site = content.get("site")
    if isinstance(site, dict):
        name = _text(site.get("name"))
        paragraphs = " ".join(_text(p) for p in _list(site.get("paragraphs")))
        body = " ".join(p for p in [_text(site.get("subtitle")), paragraphs] if p)
        if body:
            docs.append(_doc("site", "", name or "About", body))

    for raw in _list(content.get("projects")):
        doc = _project_doc(raw)
        if doc:
            docs.append(doc)

    for raw in _list(content.get("skills")):
        if not isinstance(raw, dict):
            continue
        items = [_text(i) for i in _list(raw.get("items")) if _text(i)]
        heading = _text(raw.get("heading"))
        if items:
            docs.append(_doc("skill", "", heading or "Skills", f"{heading}: {', '.join(items)}"))

    for kind in ("experience", "education"):
        for raw in _list(content.get(kind)):
            if not isinstance(raw, dict):
                continue
            title = _text(raw.get("title"))
            if not title:
                continue
            body = " · ".join(p for p in [_text(raw.get("detail")), _text(raw.get("hint"))] if p)
            docs.append(_doc(kind, "", title, f"{title} — {body}".strip(" —")))

    for raw in _list(content.get("certificates")):
        if not isinstance(raw, dict):
            continue
        title = _text(raw.get("title"))
        if not title:
            continue
        issued = _text(raw.get("issueDate"))
        body = f"{title} — issued by {_text(raw.get('issuer'))}"
        docs.append(_doc("certificate", "", title, f"{body} ({issued})" if issued else body))

    for raw in _list(content.get("socialLinks")):
        if not isinstance(raw, dict):
            continue
        label = _text(raw.get("label"))
        url = _text(raw.get("url"))
        if not label or not url:
            continue
        handle = _text(raw.get("handle"))
        docs.append(_doc("link", "", label, f"{label}: {url}" + (f" ({handle})" if handle else ""), extra=_host(url)))

    return docs


def route(question: str) -> set[str]:
    """The kinds a question is asking about, empty when it names none."""
    words = tokens(question)
    kinds: set[str] = set()
    for triggers, targets in ROUTES:
        if words.intersection(triggers):
            kinds.update(targets)
    return kinds


def score(question: str, doc: Doc) -> int:
    """How well one document's own words answer one question, ignoring its category.

    Three signals, weighted by how much each one actually means. A term appearing anywhere in
    a record is weak evidence; the same term in its title is strong; the record's whole name
    quoted in the question is near-conclusive, which is what makes "tell me about the PM2.5
    forecasting project" land on that project rather than on every record mentioning PM2.5.
    """
    asked = tokens(question) - STOPWORDS
    if not asked:
        return 0

    title_terms = tokens(doc.title)
    total = 0
    for term in asked:
        if term in doc.terms:
            total += 2
        if term in title_terms:
            total += 3

    name = doc.title.lower()
    if len(name) > 3 and name in question.lower():
        total += 5
    return total


#: What a category prior is worth. Below a title hit and below a name quote, so routing orders
#: results that words already found and never overturns them.
ROUTE_BONUS = 2


def retrieve(question: str, docs: list[Doc], limit: int = TOP_K) -> list[Doc]:
    """The documents worth showing the model, best first, within the character budget.

    A category can be read two ways and the difference is what makes this work. "What projects
    has Sumit built?" names a category and nothing else, so every project is an answer.
    "Which projects use PyTorch?" names a category *and* a discriminator, so the category is
    only a hint and the discriminator decides — returning all three projects there would be
    the wrong answer dressed up as thoroughness.

    So: if the routed category contains a record the question's own words matched, the words
    win and routing merely reorders. If it contains none, the question is a browse and the
    whole category comes back.

    An empty result is a real answer, not a failure: the question is about something the
    portfolio does not cover, and the caller says so rather than asking the model to improvise.
    """
    kinds = route(question)
    scored = [(score(question, doc), i, doc) for i, doc in enumerate(docs)]
    browsing = bool(kinds) and not any(s > 0 for s, _, doc in scored if doc.kind in kinds)

    ranked = [
        (s + ROUTE_BONUS if doc.kind in kinds and (s > 0 or browsing) else s, i, doc)
        for s, i, doc in scored
    ]
    ranked = sorted((r for r in ranked if r[0] > 0), key=lambda r: (-r[0], r[1]))

    picked: list[Doc] = []
    budget = CONTEXT_BUDGET
    for _, _, doc in ranked[:limit]:
        cost = len(doc.text)
        if picked and cost > budget:
            break
        picked.append(doc)
        budget -= cost
    return picked


def sources(docs: list[Doc]) -> tuple[Source, ...]:
    """Citations for the UI. Only kinds with a public page carry a slug to link to."""
    seen: set[tuple[str, str]] = set()
    out: list[Source] = []
    for doc in docs:
        key = (doc.kind, doc.title)
        if key in seen:
            continue
        seen.add(key)
        out.append(Source(type=doc.kind, slug=doc.slug if doc.kind == "project" else "", title=doc.title))
    return tuple(out)


def as_context(docs: list[Doc]) -> str:
    """The retrieved documents as the plain text block the prompt embeds."""
    return "\n\n".join(f"[{_KIND_LABEL.get(doc.kind, doc.kind)}] {doc.text}" for doc in docs)
