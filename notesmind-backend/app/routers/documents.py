from fastapi import APIRouter

router = APIRouter()

@router.post("/")
def upload_document():
    return {"message": "Upload document stub"}
