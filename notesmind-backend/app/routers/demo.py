from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..services import otp_service

router = APIRouter()

@router.get("/last-otp")
def get_last_otp(db: Session = Depends(get_db)):
    otp = otp_service.get_last_otp(db)
    if not otp:
        return {"otp": None}
    return {"otp": otp.otp_code}
