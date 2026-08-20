from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Case, Version, User
from ..services.auth_service import get_current_user
from ..services.workflow_service import get_approval_chain, get_missing_documents

router = APIRouter()

@router.post("/cases/{case_id}/generate-draft")
def generate_draft(case_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    if case.status != "draft":
        raise HTTPException(status_code=400, detail="Can only generate drafts for cases in draft status")

    # 1. Retrieve system hard rules
    system_missing_docs = get_missing_documents(db, case)
    system_chain = get_approval_chain(db, case.category, case.amount)

    # 2. Mock AI responses
    ai_draft_text = f"Mock draft for {case.category} notesheet. Purpose: {case.purpose}."
    ai_missing_docs = []
    
    recommended_chain = ["officer", "hod"]
    if case.category == "lab equipment purchase" or case.amount > 10000:
        recommended_chain.append("dean")
        
    # Introduce an intentional disagreement for testing if amount is exactly 99999
    if case.amount == 99999.0:
        ai_missing_docs = ["Some AI Suggested Document"]
        recommended_chain = ["officer", "hod", "dean", "registrar"]

    # 3. Cross-check and merge
    merged_missing_docs = list(set(system_missing_docs + ai_missing_docs))
    
    docs_disagreement = bool(set(ai_missing_docs) - set(system_missing_docs))
    chain_disagreement = (recommended_chain != system_chain)

    # 4. Save draft in Case and Version
    case.draft_text = ai_draft_text
    
    new_version = Version(
        case_id=case.id,
        draft_text=ai_draft_text,
        edited_by=current_user.id
    )
    db.add(new_version)
    db.commit()

    return {
        "draft_text": ai_draft_text,
        "citations": [
            {
                "type": "rule",
                "id": "RULE-01",
                "excerpt": f"Expenditure under {case.category} requires appropriate justification.",
                "source": "University Guidelines 2024",
                "confidence": 0.95
            }
        ],
        "missing_documents": merged_missing_docs,
        "disagreements": {
            "chain_disagreement": chain_disagreement,
            "docs_disagreement": docs_disagreement,
            "ai_chain": recommended_chain,
            "system_chain": system_chain
        },
        "overall_confidence": 0.9
    }
