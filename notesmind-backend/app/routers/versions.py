from fastapi import APIRouter

router = APIRouter()

@router.get("/{id}")
def get_versions(id: str):
    return {"message": "Versions stub"}
