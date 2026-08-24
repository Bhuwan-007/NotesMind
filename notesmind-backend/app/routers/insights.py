"""
Lightweight insights router – plain SQL aggregation, no AI/LLM calls.
Returns a single payload so the frontend needs only one fetch.
"""

from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Case
from ..services.auth_service import get_current_user

router = APIRouter()


# ── Response schemas ────────────────────────────────────

class CategoryCount(BaseModel):
    category: str
    count: int

class StatusCount(BaseModel):
    status: str
    count: int

class CategoryExpenditure(BaseModel):
    category: str
    total: float

class InsightsSummaryResponse(BaseModel):
    total_cases: int
    total_expenditure: float
    cases_by_category: list[CategoryCount]
    cases_by_status: list[StatusCount]
    expenditure_by_category: list[CategoryExpenditure]



# ── Endpoint ────────────────────────────────────────────

@router.get("/summary", response_model=InsightsSummaryResponse)
def get_insights_summary(
    from_date: Optional[date] = Query(None, description="Start date filter (inclusive)"),
    to_date: Optional[date] = Query(None, description="End date filter (inclusive)"),
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """Aggregated analytics across all cases."""

    # Base query with optional date-range filter
    base = db.query(Case)
    if from_date:
        base = base.filter(Case.created_at >= datetime.combine(from_date, datetime.min.time()))
    if to_date:
        base = base.filter(Case.created_at <= datetime.combine(to_date, datetime.max.time()))

    # 1. Scalar aggregates
    agg = base.with_entities(
        func.count(Case.id).label("total_cases"),
        func.coalesce(func.sum(Case.amount), 0).label("total_expenditure"),
    ).one()

    total_cases: int = agg.total_cases
    total_expenditure: float = float(agg.total_expenditure)

    # 2. Cases grouped by category
    cases_by_category = [
        CategoryCount(category=row.category, count=row.cnt)
        for row in base.with_entities(Case.category, func.count(Case.id).label("cnt"))
        .group_by(Case.category)
        .all()
    ]

    # 3. Cases grouped by status
    cases_by_status = [
        StatusCount(status=row.status, count=row.cnt)
        for row in base.with_entities(Case.status, func.count(Case.id).label("cnt"))
        .group_by(Case.status)
        .all()
    ]

    # 4. Expenditure by category
    expenditure_by_category = [
        CategoryExpenditure(category=row.category, total=float(row.total))
        for row in base.with_entities(
            Case.category, func.coalesce(func.sum(Case.amount), 0).label("total")
        )
        .group_by(Case.category)
        .all()
    ]

    return InsightsSummaryResponse(
        total_cases=total_cases,
        total_expenditure=total_expenditure,
        cases_by_category=cases_by_category,
        cases_by_status=cases_by_status,
        expenditure_by_category=expenditure_by_category,
    )
