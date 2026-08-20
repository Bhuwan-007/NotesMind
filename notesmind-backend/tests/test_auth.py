import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from app.services.auth_service import require_role, get_current_user
from app.models import User, RoleEnum

app = FastAPI()

# A mock dependency to override get_current_user
def override_get_current_user_dean():
    return User(email="dean@test.com", role=RoleEnum.dean)

def override_get_current_user_officer():
    return User(email="officer@test.com", role=RoleEnum.officer)

# Route protected by require_role
@app.get("/protected-dean")
def protected_route(user: User = Depends(require_role(["dean"]))):
    return {"message": "Success"}

client = TestClient(app)

def test_require_role_success():
    app.dependency_overrides[get_current_user] = override_get_current_user_dean
    response = client.get("/protected-dean")
    assert response.status_code == 200
    assert response.json() == {"message": "Success"}
    app.dependency_overrides.clear()

def test_require_role_forbidden():
    app.dependency_overrides[get_current_user] = override_get_current_user_officer
    response = client.get("/protected-dean")
    assert response.status_code == 403
    assert "Operation not permitted" in response.json()["detail"]
    app.dependency_overrides.clear()

def test_require_role_unauthenticated():
    # If get_current_user is not overridden, it defaults to using OAuth2PasswordBearer
    # which will raise a 401 if no token is provided.
    response = client.get("/protected-dean")
    assert response.status_code == 401
