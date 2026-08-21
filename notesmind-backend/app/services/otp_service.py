"""
OTP service for Dean authorization on confidential cases.

Generates 6-digit numeric OTPs, stores them with expiry and attempt limits,
and verifies submitted codes with clear error feedback.
"""

import datetime
import random
import string
from sqlalchemy.orm import Session
from ..models import AccessOtp, Case

# ── Configuration ────────────────────────────────────────────
OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 10
MAX_ATTEMPTS = 5

# Categories treated as confidential
CONFIDENTIAL_CATEGORIES = [
    "disciplinary action",
    "faculty grievance",
]


def is_confidential_category(category: str) -> bool:
    """Check if a category requires Dean OTP authorization."""
    return category.lower() in CONFIDENTIAL_CATEGORIES


def generate_otp_code() -> str:
    """Generate a random 6-digit numeric OTP."""
    return "".join(random.choices(string.digits, k=OTP_LENGTH))


def create_otp(db: Session, case_id: str) -> AccessOtp:
    """
    Create a new OTP for the given case, invalidating any prior active OTPs.
    Returns the new AccessOtp record (with .otp_code accessible).
    """
    # Invalidate prior un-verified OTPs for this case
    db.query(AccessOtp).filter(
        AccessOtp.case_id == case_id,
        AccessOtp.verified == False,  # noqa: E712
    ).delete()
    db.flush()

    otp = AccessOtp(
        case_id=case_id,
        otp_code=generate_otp_code(),
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(minutes=OTP_EXPIRY_MINUTES),
    )
    db.add(otp)
    db.commit()
    db.refresh(otp)
    return otp


def verify_otp(db: Session, case_id: str, submitted_code: str) -> dict:
    """
    Verify a submitted OTP code against the latest active OTP for the case.

    Returns a dict:
        {"success": True} on match
        {"success": False, "error": "...", "attempts_remaining": N} on failure
    """
    otp = (
        db.query(AccessOtp)
        .filter(
            AccessOtp.case_id == case_id,
            AccessOtp.verified == False,  # noqa: E712
        )
        .order_by(AccessOtp.created_at.desc())
        .first()
    )

    if not otp:
        return {
            "success": False,
            "error": "No active OTP found. Please request a new code.",
            "attempts_remaining": 0,
        }

    # Check expiry
    if datetime.datetime.utcnow() > otp.expires_at:
        return {
            "success": False,
            "error": "OTP has expired. Please request a new code.",
            "attempts_remaining": 0,
        }

    # Check attempt limit
    if otp.attempts >= otp.max_attempts:
        return {
            "success": False,
            "error": "Too many failed attempts. Please request a new code.",
            "attempts_remaining": 0,
        }

    # Check the code
    otp.attempts += 1

    if otp.otp_code != submitted_code:
        remaining = otp.max_attempts - otp.attempts
        db.commit()
        return {
            "success": False,
            "error": f"Invalid OTP code. {remaining} attempt{'s' if remaining != 1 else ''} remaining.",
            "attempts_remaining": remaining,
        }

    # ── Success ──
    otp.verified = True
    db.commit()
    return {"success": True}


def get_last_otp(db: Session) -> AccessOtp | None:
    """
    Demo-only: Return the most recently created OTP (any case).
    """
    return (
        db.query(AccessOtp)
        .order_by(AccessOtp.created_at.desc())
        .first()
    )
