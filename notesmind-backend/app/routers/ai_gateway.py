from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class GenerateDraftRequest(BaseModel):
    case_id: str
    category: str
    amount: float
    purpose: str
    budget_head: str
    justification: str
    attached_documents: List[dict] = []

@router.post("/cases/{case_id}/generate-draft")
def generate_draft(case_id: str, request: GenerateDraftRequest):
    # Mocking AI Agent response based on category
    return {
        "draft_text": f"Mock draft for {request.category} notesheet. Purpose: {request.purpose}.",
        "citations": [
            {
                "type": "rule",
                "id": "RULE-01",
                "excerpt": f"Expenditure under {request.category} requires appropriate justification.",
                "source": "University Guidelines 2024",
                "confidence": 0.95
            }
        ],
        "missing_documents": [],
        "overall_confidence": 0.9
    }

@router.post("/cases/{case_id}/analyze-authority")
def analyze_authority(case_id: str, category: str, amount: float):
    # Mocking authority analysis
    recommended_chain = ["hod"]
    if amount > 50000:
        recommended_chain.append("dean")
    
    return {
        "recommended_chain": recommended_chain,
        "reasoning": f"Amount {amount} for {category} exceeds standard thresholds, requiring higher approval."
    }
