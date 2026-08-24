"""
ai_agent_client.py — HTTP client for the teammate's AgenticRAG service.

This is the ONLY module in the NotesMind backend that talks to the external
AI Agent.  Every other module goes through AI Gateway, which delegates here.
"""

import os
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

AI_AGENT_BASE_URL: str = os.getenv(
    "AI_AGENT_BASE_URL",
    "https://fastapi-backend-production-4995.up.railway.app",
)

# Generous timeout — the agentic RAG pipeline (retrieve → grade → generate)
# can take a while, especially on cold starts.
_TIMEOUT = httpx.Timeout(timeout=90.0, connect=10.0)


# ---------------------------------------------------------------------------
# Low-level helpers
# ---------------------------------------------------------------------------

def _client() -> httpx.Client:
    """Return a fresh *sync* httpx client (short-lived, one per request)."""
    return httpx.Client(base_url=AI_AGENT_BASE_URL, timeout=_TIMEOUT)


def health_check() -> dict:
    """Quick liveness probe — useful for monitoring / startup checks."""
    with _client() as c:
        r = c.get("/api/v1/health")
        r.raise_for_status()
        return r.json()


# ---------------------------------------------------------------------------
# Chat endpoint — the main agentic RAG pipeline
# ---------------------------------------------------------------------------

def chat(question: str, thread_id: str | None = None) -> dict:
    """
    Call ``POST /api/v1/chat`` on the AgenticRAG service.

    Parameters
    ----------
    question : str
        The user / system prompt (max 8 000 chars).
    thread_id : str | None
        Optional conversation id for multi-turn chats.

    Returns
    -------
    dict with keys ``thread_id``, ``answer``, ``sources``.
    """
    payload: dict[str, Any] = {"question": question}
    if thread_id:
        payload["thread_id"] = thread_id

    with _client() as c:
        r = c.post("/api/v1/chat", json=payload)
        r.raise_for_status()
        return r.json()


# ---------------------------------------------------------------------------
# Draft-generation façade used by the AI Gateway router
# ---------------------------------------------------------------------------

def _build_draft_prompt(case) -> str:
    """
    Compose a structured prompt from case fields so the RAG agent produces
    a formal government note-sheet draft.
    """
    return (
        f"You are a senior government noting assistant. "
        f"Draft a formal administrative and financial sanction note for the following case.\n\n"
        f"Category: {case.category}\n"
        f"Amount: ₹{case.amount:,.2f}\n"
        f"Purpose: {case.purpose}\n"
        f"Budget Head: {case.budget_head or 'Not specified'}\n"
        f"Justification: {case.justification}\n\n"
        f"Instructions:\n"
        f"1. Write a formal note addressed to the Competent Authority.\n"
        f"2. Cite the relevant GFR 2017 rules (e.g., Rule 149 for GeM procurement, Rule 154 for direct purchase limits).\n"
        f"3. Include financial implications and the budget head.\n"
        f"4. End with a request for administrative approval and financial sanction.\n"
        f"5. Keep the tone formal and bureaucratic.\n"
    )


def generate_draft_for_case(case) -> dict:
    """
    Call the AgenticRAG chat endpoint to generate a real draft note,
    then normalise the response into the shape the AI Gateway / Cases
    routers expect.

    Returns
    -------
    dict with keys:
        draft_text       – the AI-generated note-sheet text
        citations        – [{source, excerpt}]  (mapped from RAG sources)
        precedents       – [{id, source, excerpt, confidence}]
        rules            – [{id, source, excerpt, confidence}]
    """
    prompt = _build_draft_prompt(case)
    logger.info("Calling AI Agent for case %s …", case.id)

    ai_response = chat(question=prompt)

    draft_text: str = ai_response.get("answer", "")
    raw_sources: list[dict] = ai_response.get("sources", [])

    # ------------------------------------------------------------------
    # Map RAG sources → frontend-friendly citations / precedents / rules
    # ------------------------------------------------------------------
    citations: list[dict] = []
    precedents: list[dict] = []
    rules: list[dict] = []

    for idx, src in enumerate(raw_sources):
        source_name: str = src.get("source", "Unknown")
        snippet: str = src.get("snippet", "")
        score: float = src.get("score", 0.0)
        pages: list[int] = src.get("pages", [])

        page_str = f" (pp. {', '.join(str(p) for p in pages)})" if pages else ""

        citation_entry = {
            "source": f"{source_name}{page_str}",
            "excerpt": snippet,
        }
        citations.append(citation_entry)

        # Heuristic: classify as rule or precedent based on source name
        source_lower = source_name.lower()
        is_rule = any(
            kw in source_lower
            for kw in ("gfr", "rule", "manual", "guideline", "regulation", "circular", "order")
        )

        if is_rule:
            rules.append({
                "id": f"R-{idx + 1:02d}",
                "source": f"{source_name}{page_str}",
                "excerpt": snippet,
                "confidence": round(score, 2),
            })
        else:
            precedents.append({
                "id": f"P-{idx + 1:02d}",
                "source": f"{source_name}{page_str}",
                "excerpt": snippet,
                "confidence": round(score, 2),
            })

    logger.info(
        "AI Agent returned %d chars, %d sources for case %s",
        len(draft_text), len(raw_sources), case.id,
    )

    return {
        "draft_text": draft_text,
        "citations": citations,
        "precedents": precedents,
        "rules": rules,
    }
