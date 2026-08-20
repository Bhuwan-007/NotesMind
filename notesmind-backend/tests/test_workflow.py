import pytest
from app.services.workflow_service import get_approval_chain
from app.models import ApprovalRule

# Mock db session
class MockQuery:
    def __init__(self, category, amount):
        self.category = category
        self.amount = amount
    
    def filter(self, *args):
        return self
        
    def first(self):
        # Mocks the database matching logic
        if self.category == "lab equipment purchase":
            if self.amount <= 100000:
                return ApprovalRule(category="lab equipment purchase", min_amount=0, max_amount=100000, required_chain=["officer", "hod", "dean"])
        elif self.category == "guest faculty honorarium":
            if self.amount <= 10000:
                return ApprovalRule(category="guest faculty honorarium", min_amount=0, max_amount=10000, required_chain=["officer", "hod"])
            else:
                return ApprovalRule(category="guest faculty honorarium", min_amount=10001, max_amount=None, required_chain=["officer", "hod", "dean"])
        return None

class MockSession:
    def __init__(self, category=None, amount=None):
        self.category = category
        self.amount = amount

    def query(self, model):
        return MockQuery(self.category, self.amount)

def test_workflow_chain_lookup_low_amount():
    db = MockSession(category="guest faculty honorarium", amount=5000)
    chain = get_approval_chain(db, "guest faculty honorarium", 5000)
    assert chain == ["officer", "hod"]

def test_workflow_chain_lookup_high_amount():
    db = MockSession(category="guest faculty honorarium", amount=15000)
    chain = get_approval_chain(db, "guest faculty honorarium", 15000)
    assert chain == ["officer", "hod", "dean"]

def test_workflow_chain_lookup_no_match():
    db = MockSession(category="unknown", amount=100)
    chain = get_approval_chain(db, "unknown", 100)
    assert chain == ["officer"]
