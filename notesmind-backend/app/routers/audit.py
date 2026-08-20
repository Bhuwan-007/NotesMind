from fastapi import APIRouter

router = APIRouter()

@router.get("/{case_id}")
def get_audit_log(case_id: str):
    return {"message": "Audit stub"}
