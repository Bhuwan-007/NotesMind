from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_budget():
    return {"message": "Budget stub"}
