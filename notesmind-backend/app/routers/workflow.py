from fastapi import APIRouter

router = APIRouter()

@router.get("/{id}/approval-chain")
def get_approval_chain(id: str):
    return {"message": "Workflow stub"}
