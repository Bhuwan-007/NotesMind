import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import engine, SessionLocal
from app.models import ApprovalRule, User, RoleEnum
from app.services.auth_service import get_password_hash

def seed_db():
    db: Session = SessionLocal()
    
    # Check if we already seeded rules
    if db.query(ApprovalRule).count() == 0:
        rules = [
            ApprovalRule(category="guest faculty honorarium", min_amount=0, max_amount=10000, required_chain=["officer", "hod"]),
            ApprovalRule(category="guest faculty honorarium", min_amount=10001, max_amount=None, required_chain=["officer", "hod", "dean"]),
            ApprovalRule(category="hackathon/fest expenditure", min_amount=0, max_amount=50000, required_chain=["officer", "hod", "dean"]),
            ApprovalRule(category="hackathon/fest expenditure", min_amount=50001, max_amount=None, required_chain=["officer", "hod", "dean", "registrar"]),
            ApprovalRule(category="lab equipment purchase", min_amount=0, max_amount=100000, required_chain=["officer", "hod", "dean"]),
            ApprovalRule(category="conference TA/DA", min_amount=0, max_amount=None, required_chain=["officer", "hod"]),
        ]
        db.add_all(rules)
    
    if db.query(User).count() == 0:
        users = [
            User(name="Demo Officer", role=RoleEnum.officer, email="officer@notesmind.edu", password_hash=get_password_hash("password123")),
            User(name="Demo HOD", role=RoleEnum.hod, email="hod@notesmind.edu", password_hash=get_password_hash("password123")),
            User(name="Demo Dean", role=RoleEnum.dean, email="dean@notesmind.edu", password_hash=get_password_hash("password123")),
            User(name="Demo Registrar", role=RoleEnum.registrar, email="registrar@notesmind.edu", password_hash=get_password_hash("password123")),
            User(name="Admin", role=RoleEnum.admin, email="admin@notesmind.edu", password_hash=get_password_hash("admin123"))
        ]
        db.add_all(users)

    db.commit()
    db.close()
    print("Seed complete.")

if __name__ == "__main__":
    seed_db()
