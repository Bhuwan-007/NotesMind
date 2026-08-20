import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db
from app.models import Case, User, RoleEnum, RequiredDocumentRule, Document
from app.services.auth_service import get_current_user

# Setup dummy db using sqlite in-memory for testing
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(scope="module")
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Add rules
    from app.models import ApprovalRule
    db.add(ApprovalRule(category="lab equipment purchase", min_amount=0, max_amount=100000, required_chain=["officer", "hod", "dean"]))
    db.add(RequiredDocumentRule(category="lab equipment purchase", required_docs=["Quotation", "Justification Letter"]))
    
    # Add users
    db.add(User(id="officer1", name="Officer", role=RoleEnum.officer, email="off@test.com", password_hash="hash"))
    db.add(User(id="hod1", name="HOD", role=RoleEnum.hod, email="hod@test.com", password_hash="hash"))
    db.add(User(id="dean1", name="Dean", role=RoleEnum.dean, email="dean@test.com", password_hash="hash"))
    
    db.commit()
    yield
    Base.metadata.drop_all(bind=engine)

def auth_as(role_str):
    db = TestingSessionLocal()
    user = db.query(User).filter(User.role == role_str).first()
    db.close()
    app.dependency_overrides[get_current_user] = lambda: user

def test_full_case_lifecycle(setup_db):
    db = TestingSessionLocal()
    
    # 1. Create Case as Officer
    auth_as("officer")
    response = client.post("/cases/", json={
        "category": "lab equipment purchase",
        "amount": 50000.0,
        "purpose": "Buy microscopes",
        "budget_head": "LAB-01",
        "justification": "Needed for bio lab"
    })
    assert response.status_code == 200
    case_id = response.json()["id"]
    
    # 2. Missing docs diff
    # Initially missing both Quotation and Justification Letter
    response = client.get(f"/cases/{case_id}/missing-docs")
    assert response.status_code == 200
    missing = response.json()["missing_documents"]
    assert "Quotation" in missing and "Justification Letter" in missing
    
    # Add a document
    db.add(Document(case_id=case_id, filename="quote.pdf", doc_type="Quotation"))
    db.commit()
    
    response = client.get(f"/cases/{case_id}/missing-docs")
    missing = response.json()["missing_documents"]
    assert "Quotation" not in missing
    assert "Justification Letter" in missing
    
    # 3. Generate Draft (and check disagreement flags)
    response = client.post(f"/ai/cases/{case_id}/generate-draft")
    assert response.status_code == 200
    data = response.json()
    assert data["disagreements"]["chain_disagreement"] == False
    assert data["disagreements"]["docs_disagreement"] == False
    assert "Justification Letter" in data["missing_documents"]
    
    # Force a disagreement by creating a case with amount 99999 (mock trigger in ai_gateway)
    response_disagreement = client.post("/cases/", json={
        "category": "lab equipment purchase", "amount": 99999.0,
        "purpose": "x", "budget_head": "x", "justification": "x"
    })
    case_id_2 = response_disagreement.json()["id"]
    response_gen2 = client.post(f"/ai/cases/{case_id_2}/generate-draft")
    data2 = response_gen2.json()
    assert data2["disagreements"]["chain_disagreement"] == True
    assert data2["disagreements"]["docs_disagreement"] == True
    
    # 4. Submit for approval
    response = client.post(f"/cases/{case_id}/submit-for-approval")
    assert response.status_code == 200
    assert response.json()["status"] == "under_review"
    
    # Try generating draft after submission (should fail)
    response_gen_fail = client.post(f"/ai/cases/{case_id}/generate-draft")
    assert response_gen_fail.status_code == 400
    
    # 5. Out of turn approval attempt (Dean tries to approve when HOD is next)
    auth_as("dean")
    response = client.post(f"/cases/{case_id}/approve")
    assert response.status_code == 403
    
    response = client.post(f"/cases/{case_id}/reject")
    assert response.status_code == 403
    
    # 6. Correct turn approval (HOD approves)
    auth_as("hod")
    response = client.post(f"/cases/{case_id}/approve")
    assert response.status_code == 200
    assert response.json()["current_stage"] == 2
    
    # 7. Next approval (Dean approves)
    auth_as("dean")
    response = client.post(f"/cases/{case_id}/approve")
    assert response.status_code == 200

