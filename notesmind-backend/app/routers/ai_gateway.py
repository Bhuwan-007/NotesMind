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
    print(f"DEBUG: Entering generate-draft for case_id: {case_id}", flush=True)
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        print(f"DEBUG: Case {case_id} NOT FOUND in DB!", flush=True)
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found in DB")
        
    if case.status != "draft":
        raise HTTPException(status_code=400, detail="Can only generate drafts for cases in draft status")

    # 1. Retrieve system hard rules
    system_missing_docs = get_missing_documents(db, case)
    system_chain = get_approval_chain(db, case.category, case.amount)

    # 2. Mock AI responses
    detailed_draft = f"""SUBJECT: Administrative and Financial Sanction for {case.category.title()}

1. This note is submitted to the competent authority to seek in-principle administrative and financial sanction for the {case.category.lower()}, amounting to ₹{case.amount:,.2f}.

2. JUSTIFICATION: 
The requested expenditure is essential for the smooth functioning and academic continuity of the department. Preliminary market research indicates that items satisfying the requisite technical specifications are currently cataloged and available.

3. RULE POSITION (GFR 2017):
In accordance with the guidelines stipulated in Rule 149 of the General Financial Rules (GFR) 2017, the procurement of routine goods and services must be executed mandatorily through the Government e-Marketplace (GeM). 
(Note: Rule 154 allows direct purchase without quotation up to ₹25,000, which is not applicable here as the amount exceeds the limit).

4. FINANCIAL IMPLICATION:
The estimated expenditure for this proposal is ₹{case.amount:,.2f}. 
This expenditure is proposed to be debited from the budget head "{case.budget_head or 'Relevant Department Head'}" allocated for the current Financial Year.

5. APPROVAL SOUGHT:
In light of the above, approval of the Competent Authority is solicited for:
   a) Administrative approval for the proposal.
   b) Financial sanction of ₹{case.amount:,.2f}.
   c) Authorization to proceed with procurement/execution via the designated GeM portal / standard bidding process.

Submitted for perusal and necessary approval please."""
    
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
    case.draft_text = detailed_draft
    
    new_version = Version(
        case_id=case.id,
        draft_text=detailed_draft,
        edited_by=current_user.id
    )
    db.add(new_version)
    db.commit()

    return {
        "draft_text": detailed_draft,
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
