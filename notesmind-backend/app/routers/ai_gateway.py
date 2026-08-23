import logging
import httpx

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Case, Version, User
from ..services.auth_service import get_current_user
from ..services.workflow_service import get_approval_chain, get_missing_documents
from ..services.workflow_service import get_approval_chain, get_missing_documents

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/cases/{case_id}/generate-draft")
async def generate_draft(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a draft note-sheet for a case by calling the external
    AgenticRAG service, then cross-check with NotesMind's own rules.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found in DB")

    if case.status != "draft":
        raise HTTPException(
            status_code=400,
            detail="Can only generate drafts for cases in draft status",
        )

    # 1. Retrieve system hard rules
    system_missing_docs = get_missing_documents(db, case)
    system_chain = get_approval_chain(db, case.category, case.amount)

    # 2. Call external AI Agent for draft + citations
    query = (
        f"Draft an official notesheet for the following request.\n\n"
        f"Category: {case.category}\n"
        f"Purpose: {case.purpose}\n"
        f"Amount: ₹{case.amount:,.2f}\n"
        f"Budget head: {case.budget_head}\n"
        f"Justification: {case.justification}\n\n"
        f"Cite the relevant GFR rules and any similar precedent cases.\n\n"
        f"CRITICAL INSTRUCTIONS:\n"
        f"1. Output plain text ONLY. Do NOT use markdown formatting (no asterisks, no bold, no headers).\n"
        f"2. Do NOT include any meta-commentary about the retrieval process in the draft (e.g. do not say 'No specific precedents were found'). Write ONLY the final notesheet content."
    )
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://fastapi-backend-production-4995.up.railway.app/api/v1/generate",
                json={"query": query}
            )
            response.raise_for_status()
            ai_result = response.json()
    except (httpx.RequestError, httpx.HTTPStatusError) as exc:
        logger.exception("AI Agent call failed for case %s", case_id)
        raise HTTPException(
            status_code=503,
            detail=f"AI Agent service unavailable: {exc}",
        )

    detailed_draft: str = ai_result.get("answer", "No draft generated.")
    
    # Process citations
    citations = []
    raw_chunks = ai_result.get("chunks", [])
    overall_confidence = 0.85 # Default if usage doesn't have it
    
    for chunk in raw_chunks:
        # Determine type based on heuristic
        source = chunk.get("source", "Unknown Source")
        src_lower = source.lower()
        if "notesheet" in src_lower or "case" in src_lower:
            c_type = "precedent"
        else:
            c_type = "rule"
            
        citations.append({
            "type": c_type,
            "id": source,
            "excerpt": chunk.get("content", "No excerpt provided")[:500],
            "source": source,
            # TODO: Replace with real score if available from API chunk
            "confidence": chunk.get("score") if chunk.get("score") is not None else 0.85
        })
        
    precedents = [c for c in citations if c.get("type") == "precedent"]
    rules = [c for c in citations if c.get("type") == "rule"]

    # The AI Agent is a document RAG system — it does not manage approval
    # chains or document requirements.  Those stay as NotesMind domain logic.
    ai_missing_docs: list = []
    recommended_chain: list = list(system_chain)  # default: agree with system

    # 3. Cross-check and merge
    merged_missing_docs = list(set(system_missing_docs + ai_missing_docs))

    docs_disagreement = bool(set(ai_missing_docs) - set(system_missing_docs))
    chain_disagreement = recommended_chain != system_chain

    # 4. Save draft in Case and Version
    case.draft_text = detailed_draft

    new_version = Version(
        case_id=case.id,
        draft_text=detailed_draft,
        edited_by=current_user.id,
    )
    db.add(new_version)
    db.commit()

    return {
        "draft_text": detailed_draft,
        "citations": citations,
        "precedents": precedents,
        "rules": rules,
        "missing_documents": merged_missing_docs,
        "disagreements": {
            "chain_disagreement": chain_disagreement,
            "docs_disagreement": docs_disagreement,
            "ai_chain": recommended_chain,
            "system_chain": system_chain,
        },
        "overall_confidence": overall_confidence,
    }
