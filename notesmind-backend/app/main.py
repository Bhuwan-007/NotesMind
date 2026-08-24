from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, cases, documents, workflow, budget, versions, audit, ai_gateway, demo, insights
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="NotesMind API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(cases.router, prefix="/cases", tags=["Cases"])
app.include_router(documents.router, prefix="/documents", tags=["Documents"])
app.include_router(workflow.router, prefix="/workflow", tags=["Workflow"])
app.include_router(budget.router, prefix="/budget", tags=["Budget"])
app.include_router(versions.router, prefix="/versions", tags=["Versions"])
app.include_router(audit.router, prefix="/audit", tags=["Audit"])
app.include_router(ai_gateway.router, prefix="", tags=["AI Gateway"])
app.include_router(demo.router, prefix="/demo", tags=["Demo"])
app.include_router(insights.router, prefix="/insights", tags=["Insights"])

@app.get("/")
def read_root():
    return {"message": "NotesMind Backend is running"}
