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
