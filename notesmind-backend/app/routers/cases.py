from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from ..database import get_db
from ..models import Case, User, AuditLog, Document
from ..services.auth_service import get_current_user, require_role
from ..services.workflow_service import get_approval_chain, get_missing_documents, can_approve
from ..services import otp_service

router = APIRouter()

class CaseCreate(BaseModel):
    category: str
    amount: float
    purpose: str
    budget_head: str
    justification: str

class DocumentCreate(BaseModel):
    filename: str
    doc_type: str

class CaseResponse(BaseModel):
    id: str
    category: str
    amount: float
    purpose: str
    status: str
    current_approval_stage: int
    draft_text: str | None = None
    confidentiality_level: str
    access_verified: bool
    
    class Config:
        from_attributes = True

def log_audit(db: Session, case_id: str, actor_id: str, action: str, details: str = None):
    audit = AuditLog(case_id=case_id, actor_id=actor_id, action=action, details=details)
    db.add(audit)

@router.post("/", response_model=CaseResponse)
def create_case(case_data: CaseCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(["officer"]))):
    new_case = Case(
        category=case_data.category,
        amount=case_data.amount,
        purpose=case_data.purpose,
        budget_head=case_data.budget_head,
        justification=case_data.justification,
        created_by=current_user.id,
        status="draft",
        confidentiality_level="confidential" if otp_service.is_confidential_category(case_data.category) else "normal"
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    log_audit(db, new_case.id, current_user.id, "created", "Case created in draft status")
    db.commit()
    return new_case

@router.get("/", response_model=List[CaseResponse])
def list_cases(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # For now, return all cases. Later can be filtered by role/visibility.
    return db.query(Case).all()

@router.get("/{id}", response_model=CaseResponse)
def get_case(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = db.query(Case).filter(Case.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

@router.get("/{id}/approval-chain")
def get_case_approval_chain(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from ..services.workflow_service import get_ai_approval_chain
    case = db.query(Case).filter(Case.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    chain = get_approval_chain(db, case.category, case.amount)
    ai_chain = get_ai_approval_chain(chain)
    ai_disagreement = chain != ai_chain
    
    return {
        "required_chain": chain, 
        "current_stage": case.current_approval_stage,
        "system_chain": chain,
        "ai_recommended_chain": ai_chain,
        "ai_disagreement": ai_disagreement
    }

@router.get("/{id}/audit")
def get_case_audit(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = db.query(Case).filter(Case.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    logs = db.query(AuditLog).filter(AuditLog.case_id == id).order_by(AuditLog.timestamp.asc()).all()
    
    timeline = []
    for log in logs:
        actor = db.query(User).filter(User.id == log.actor_id).first()
        actor_name = actor.name if actor else "Unknown"
        timeline.append({
            "date": log.timestamp.isoformat() + "Z",
            "actor": actor_name,
            "action": log.details or log.action
        })
    return {"timeline": timeline}

@router.post("/{id}/generate-draft")
def generate_draft(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from ..services.ai_agent_client import generate_draft_for_case

    case = db.query(Case).filter(Case.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Call the external AgenticRAG service for a real draft + citations
    try:
        ai_result = generate_draft_for_case(case)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"AI Agent service unavailable: {exc}",
        )

    draft_text: str = ai_result["draft_text"]
    precedents: list = ai_result.get("precedents", [])
    rules: list = ai_result.get("rules", [])
    citations: list = ai_result.get("citations", [])

    # Save draft text to case
    case.draft_text = draft_text
    log_audit(db, case.id, current_user.id, "draft_generated", "Draft generated via AI Agent")
    db.commit()

    # System-level approval chain (NotesMind domain logic, not from AI Agent)
    from ..services.workflow_service import get_ai_approval_chain
    system_chain = get_approval_chain(db, case.category, case.amount)
    ai_chain = get_ai_approval_chain(system_chain)

    return {
        "draft_text": draft_text,
        "precedents": precedents,
        "rules": rules,
        "citations": citations,
        "ai_disagreement": system_chain != ai_chain,
        "disagreements": {
            "chain_disagreement": system_chain != ai_chain,
            "ai_chain": ai_chain,
            "system_chain": system_chain,
            "docs_disagreement": False,
        },
    }

@router.get("/{id}/missing-docs")
def get_case_missing_docs(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = db.query(Case).filter(Case.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    missing = get_missing_documents(db, case)
    return {"missing_documents": missing}

@router.post("/{id}/submit-for-approval")
def submit_case(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = db.query(Case).filter(Case.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft cases can be submitted")
    
    case.status = "under_review"
    
    chain = get_approval_chain(db, case.category, case.amount)
    if len(chain) > 0 and chain[0] == current_user.role.value:
        case.current_approval_stage = 1
    else:
        case.current_approval_stage = 0
        
    log_audit(db, case.id, current_user.id, "submitted", "Case submitted for approval")
    db.commit()
    return {"message": "Case submitted", "status": case.status}

@router.post("/{id}/approve")
def approve_case(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = db.query(Case).filter(Case.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    if not can_approve(db, case, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to approve this case at its current stage")
        
    chain = get_approval_chain(db, case.category, case.amount)
    case.current_approval_stage += 1
    
    action_detail = f"Approved by {current_user.role.value}"
    if case.current_approval_stage >= len(chain):
        case.status = "approved"
        action_detail += " (Final Approval)"
        
    log_audit(db, case.id, current_user.id, "approved", action_detail)
    db.commit()
    return {"message": "Case approved", "status": case.status, "current_stage": case.current_approval_stage}

@router.post("/{id}/reject")
def reject_case(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = db.query(Case).filter(Case.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    if not can_approve(db, case, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to reject this case at its current stage")
        
    case.status = "rejected"
    log_audit(db, case.id, current_user.id, "rejected", f"Rejected by {current_user.role.value}")
    db.commit()
    return {"message": "Case rejected", "status": case.status}

class OtpVerifyRequest(BaseModel):
    otp: str

@router.post("/{id}/request-access-otp")
def request_access_otp(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = db.query(Case).filter(Case.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    if case.confidentiality_level != "confidential":
        raise HTTPException(status_code=400, detail="Case is not confidential")

    # Generate and store OTP
    otp_service.create_otp(db, case.id)
    log_audit(db, case.id, current_user.id, "otp_requested", "Access OTP requested")
    return {"message": "OTP sent to Dean"}

@router.post("/{id}/verify-access-otp")
def verify_access_otp(id: str, request: OtpVerifyRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = db.query(Case).filter(Case.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    result = otp_service.verify_otp(db, case.id, request.otp)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])

    case.access_verified = True
    log_audit(db, case.id, current_user.id, "otp_verified", "Access OTP verified")
    db.commit()
    return {"message": "OTP verified successfully"}

@router.post("/{id}/documents")
def add_document(id: str, doc_data: DocumentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = db.query(Case).filter(Case.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    if case.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator of the case can attach documents")
        
    if case.status != "draft":
        raise HTTPException(status_code=400, detail="Documents can only be attached while the case is in draft status")
        
    new_doc = Document(
        case_id=case.id,
        filename=doc_data.filename,
        doc_type=doc_data.doc_type
    )
    db.add(new_doc)
    db.commit()
    return {"message": "Document attached successfully"}

@router.delete("/{id}")
def delete_case(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = db.query(Case).filter(Case.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    if case.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator of the case can delete it")
        
    if case.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft cases can be deleted")
        
    db.query(Document).filter(Document.case_id == case.id).delete()
    db.query(AuditLog).filter(AuditLog.case_id == case.id).delete()
    
    db.delete(case)
    db.commit()
    return {"message": "Case deleted successfully"}

class CaseUpdate(BaseModel):
    category: str
    amount: float
    budget_head: str
    draft_text: str | None = None

@router.put("/{id}", response_model=CaseResponse)
def update_case(id: str, case_data: CaseUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = db.query(Case).filter(Case.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this case")
    if case.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft cases can be edited")
        
    case.category = case_data.category
    case.amount = case_data.amount
    case.budget_head = case_data.budget_head
    if case_data.draft_text is not None:
        case.draft_text = case_data.draft_text
        
    log_audit(db, case.id, current_user.id, "updated", "Case details updated")
    db.commit()
    db.refresh(case)
    return case
