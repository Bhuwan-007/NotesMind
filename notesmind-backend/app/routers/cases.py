from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from ..database import get_db
from ..models import Case, User, AuditLog, Document
from ..services.auth_service import get_current_user, require_role
from ..services.workflow_service import get_approval_chain, get_missing_documents, can_approve

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
        status="draft"
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
    case = db.query(Case).filter(Case.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    chain = get_approval_chain(db, case.category, case.amount)
    return {"required_chain": chain, "current_stage": case.current_approval_stage}

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
