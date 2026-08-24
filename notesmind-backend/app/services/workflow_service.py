from sqlalchemy.orm import Session
from ..models import ApprovalRule

def get_approval_chain(db: Session, category: str, amount: float) -> list[str]:
    # Query rules matching the category where amount falls in the range
    rule = db.query(ApprovalRule).filter(
        ApprovalRule.category == category,
        ApprovalRule.min_amount <= amount,
        (ApprovalRule.max_amount >= amount) | (ApprovalRule.max_amount == None)
    ).first()

    if rule:
        return rule.required_chain
    
    # Fallback default if no rule matches
    return ["officer"]

def get_missing_documents(db: Session, case) -> list[str]:
    from ..models import RequiredDocumentRule, Document
    rule = db.query(RequiredDocumentRule).filter(RequiredDocumentRule.category == case.category).first()
    
    # If there is no rule for this category, implicitly return 0 missing documents
    # (this is intended silent-pass behavior for categories without specific requirements).
    if not rule:
        return []

    required = set(rule.required_docs)
    attached = set(doc.doc_type for doc in db.query(Document).filter(Document.case_id == case.id).all())
    
    missing = required - attached
    return list(missing)

def can_approve(db: Session, case, user) -> bool:
    if case.status != "under_review":
        return False
        
    chain = get_approval_chain(db, case.category, case.amount)
    
    if case.current_approval_stage >= len(chain):
        return False
        
    expected_role = chain[case.current_approval_stage]
    return user.role.value == expected_role

def get_ai_approval_chain(system_chain: list[str]) -> list[str]:
    """Mock AI logic to recommend a different approval chain for demonstration."""
    ai_chain = list(system_chain)
    if "registrar" not in ai_chain:
        ai_chain.append("registrar")
    else:
        # If it already has registrar, maybe add dean or just something to differ
        if "dean" not in ai_chain:
            ai_chain.insert(0, "dean")
    return ai_chain

