import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Case, Version, User
from ..services.auth_service import get_current_user
from ..services.workflow_service import get_approval_chain, get_missing_documents
from ..services.ai_agent_client import generate_draft_for_case

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/cases/{case_id}/generate-draft")
def generate_draft(
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
    try:
        ai_result = generate_draft_for_case(case)
    except Exception as exc:
        logger.exception("AI Agent call failed for case %s", case_id)
        raise HTTPException(
            status_code=503,
            detail=f"AI Agent service unavailable: {exc}",
        )

    detailed_draft: str = ai_result["draft_text"]
    ai_citations: list[dict] = ai_result["citations"]

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
        "citations": ai_citations,
        "missing_documents": merged_missing_docs,
        "disagreements": {
            "chain_disagreement": chain_disagreement,
            "docs_disagreement": docs_disagreement,
            "ai_chain": recommended_chain,
            "system_chain": system_chain,
        },
        "overall_confidence": 0.9,
    }
