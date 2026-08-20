import enum
import datetime
import uuid
from sqlalchemy import Column, String, Float, Enum, ForeignKey, DateTime, JSON, Text
from sqlalchemy.orm import relationship
from .database import Base

class RoleEnum(str, enum.Enum):
    officer = "officer"
    hod = "hod"
    dean = "dean"
    registrar = "registrar"
    admin = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)

class Case(Base):
    __tablename__ = "cases"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    category = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    purpose = Column(String, nullable=False)
    budget_head = Column(String, nullable=False)
    justification = Column(Text, nullable=False)
    status = Column(String, default="draft", nullable=False)
    draft_text = Column(Text, nullable=True)
    citations = Column(JSON, nullable=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    creator = relationship("User")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    filename = Column(String, nullable=False)
    doc_type = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

class ApprovalRule(Base):
    __tablename__ = "approval_rules"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    category = Column(String, nullable=False, index=True)
    min_amount = Column(Float, nullable=False, default=0.0)
    max_amount = Column(Float, nullable=True)  # Null means no upper limit
    required_chain = Column(JSON, nullable=False)  # e.g., ["hod", "dean"]

class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    actor_id = Column(String, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)
    details = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class Version(Base):
    __tablename__ = "versions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    draft_text = Column(Text, nullable=False)
    edited_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
