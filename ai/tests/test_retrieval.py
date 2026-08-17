"""Retrieval: does the right slice of the portfolio come back for a real question?

These are the tests that decide whether the AI layer needs a vector index. If a question a
recruiter would plausibly ask starts failing here, that is the signal to reach for embeddings
— not before.
"""

from __future__ import annotations

import pytest

from retrieval import CONTEXT_BUDGET, flatten, retrieve, route, sources, tokens


def kinds_for(question: str, content: dict) -> list[str]:
    return [d.kind for d in retrieve(question, flatten(content))]


def titles_for(question: str, content: dict) -> list[str]:
    return [d.title for d in retrieve(question, flatten(content))]


def test_tokens_keep_technology_punctuation():
    assert "c++" in tokens("I write C++ and Python")
    assert "scikit-learn" not in tokens("scikit-learn")  # the hyphen splits, both halves survive
    assert {"scikit", "learn"} <= tokens("scikit-learn")


def test_tokens_drop_trailing_periods_but_keep_internal_ones():
    assert "pm2.5" in tokens("Forecasting PM2.5 levels.")


def test_flatten_covers_every_published_kind(content):
    kinds = {d.kind for d in flatten(content)}
    assert kinds == {"site", "project", "skill", "experience", "education", "certificate", "link"}


def test_flatten_is_total_on_an_empty_bundle():
    assert flatten({}) == []
    assert flatten(None) == []


def test_flatten_skips_records_the_cms_has_not_filled_in():
    docs = flatten({"projects": [{"slug": "x"}, None, {"title": "Real", "slug": "real"}]})
    assert [d.title for d in docs] == ["Real"]


def test_project_doc_carries_stack_and_sections(content):
    doc = next(d for d in flatten(content) if d.title == "PM2.5 Forecasting")
    assert "pytorch" in doc.terms
    assert "lstm" in doc.terms
    assert "rmse" in doc.terms
    assert "github.com" in doc.terms  # link host, so "where is the repo" retrieves it
    assert doc.slug == "pm25-forecasting"


@pytest.mark.parametrize(
    "question, kind",
    [
        ("What projects has Sumit built?", "project"),
        ("What is Sumit's experience?", "experience"),
        ("What is Sumit studying?", "education"),
        ("What certificates does Sumit have?", "certificate"),
        ("Where is Sumit's GitHub?", "link"),
        ("What technologies does Sumit use?", "skill"),
    ],
)
def test_category_questions_reach_their_category(question, kind, content):
    assert kind in kinds_for(question, content)


def test_a_named_project_outranks_everything_else(content):
    assert titles_for("Tell me about the PM2.5 forecasting project.", content)[0] == "PM2.5 Forecasting"


def test_a_technology_question_finds_both_the_project_and_the_skills(content):
    titles = titles_for("Which projects use PyTorch?", content)
    assert "PM2.5 Forecasting" in titles
    assert "Machine learning" in titles
    assert "SAR Crop Mapping" not in titles


def test_an_alias_retrieves_its_project(content):
    assert "PM2.5 Forecasting" in titles_for("what is pm25 about", content)


def test_a_question_the_portfolio_does_not_cover_retrieves_nothing(content):
    assert retrieve("What is Sumit's favourite movie?", flatten(content)) == []
    assert retrieve("What is the capital of France?", flatten(content)) == []


def test_a_bare_who_question_gets_the_about_text_and_nothing_else(content):
    """"Who is Sumit?" is a real question with a real answer, and "who" is the only word in it
    carrying signal — every other token is a stopword. It routes to the About record.

    The cost of that route is that an unrelated "who won…?" also reaches About. That is
    acceptable: one paragraph of biography is not an answer to it, and the system prompt is
    what declines. What must not happen is projects or skills being dragged in as filler.
    """
    assert kinds_for("Who is Sumit?", content) == ["site"]
    assert kinds_for("Who won the 1998 World Cup?", content) == ["site"]


def test_a_question_of_only_stopwords_retrieves_nothing(content):
    assert retrieve("what about the", flatten(content)) == []


def test_routing_is_a_prior_not_a_filter(content):
    # "certificates" routes to certificate, but the named project still has to come back.
    titles = titles_for("does the PM2.5 Forecasting project have certificates", content)
    assert titles[0] == "PM2.5 Forecasting"


def test_route_returns_nothing_for_an_unrelated_question():
    assert route("what is your favourite colour") == set()


def test_retrieval_respects_the_character_budget(content):
    big = dict(content)
    big["projects"] = [
        {**content["projects"][0], "slug": f"p{i}", "title": f"Padding {i}", "note": "x" * CONTEXT_BUDGET}
        for i in range(5)
    ]
    docs = retrieve("padding", flatten(big))
    assert len(docs) == 1  # the first is always admitted; nothing else fits


def test_sources_link_projects_and_only_projects(content):
    got = sources(retrieve("Which projects use PyTorch?", flatten(content)))
    by_type = {s.type: s for s in got}
    assert by_type["project"].slug == "pm25-forecasting"
    assert by_type["skill"].slug == ""


def test_sources_are_deduplicated(content):
    docs = retrieve("Which projects use PyTorch?", flatten(content))
    assert len(sources(docs + docs)) == len(sources(docs))
