"""
Saathi Score - API server.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np

from data_generator import FEATURE_NAMES, normalize, BANK_PROFILES
from federated import FederatedTrainer, sigmoid

app = FastAPI(title="Saathi Score API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)

trainer = FederatedTrainer()
# Auto-train on startup so the deployed model is always ready
for _ in range(25):
    trainer.run_round()

# Human-readable explanations per feature
FEATURE_LABELS = {
    "daily_income_avg":      "Daily income level",
    "income_consistency":    "Income steadiness",
    "upi_txn_per_week":      "Digital payment activity",
    "utility_payment_ratio": "On-time utility bill payments",
    "savings_rate":          "Savings habit",
    "years_in_business":     "Work experience / tenure",
    "cash_buffer_days":      "Emergency cash buffer",
    "informal_loan_count":   "Existing informal loans",
}


class BorrowerInput(BaseModel):
    name: str = Field(default="Applicant")
    daily_income_avg: float = Field(ge=0)
    income_consistency: float = Field(ge=0, le=1)
    upi_txn_per_week: float = Field(ge=0)
    utility_payment_ratio: float = Field(ge=0, le=1)
    savings_rate: float = Field(ge=0, le=1)
    years_in_business: float = Field(ge=0)
    cash_buffer_days: float = Field(ge=0)
    informal_loan_count: float = Field(ge=0)


@app.get("/api/banks")
def get_banks():
    return [
        {
            "id": bank_id,
            "name": b["name"],
            "segment": b["segment"],
            "borrowers": len(b["y"]),
            "repay_rate": round(float(b["y"].mean()), 3),
        }
        for bank_id, b in trainer.banks.items()
    ]


@app.post("/api/training/reset")
def reset_training():
    trainer.reset()
    return {"status": "reset", "round": 0}


@app.post("/api/training/round")
def training_round():
    return trainer.run_round()


@app.get("/api/training/history")
def training_history():
    return {"history": trainer.history, "solo_accuracy": trainer.solo_acc}


@app.post("/api/score")
def score_borrower(borrower: BorrowerInput):
    raw = np.array([[
        borrower.daily_income_avg,
        borrower.income_consistency,
        borrower.upi_txn_per_week,
        borrower.utility_payment_ratio,
        borrower.savings_rate,
        borrower.years_in_business,
        borrower.cash_buffer_days,
        borrower.informal_loan_count,
    ]])
    X = normalize(raw)

    model = trainer.global_model
    p_repay = float(model.predict_proba(X)[0])

    # Map probability -> 300-900 score band (CIBIL-style range, familiar to judges)
    # Temper extreme probabilities so the score band spreads realistically
    tempered = 0.5 + (p_repay - 0.5) * 0.7
    score = int(round(300 + tempered * 600))

    if score >= 700:
        decision, decision_label = "approve", "Approved"
    elif score >= 580:
        decision, decision_label = "review", "Manual review"
    else:
        decision, decision_label = "decline", "Not approved yet"

    # Explainability: per-feature contribution = weight * normalized value
    contributions = model.w * X[0]
    explanation = []
    for i, fname in enumerate(FEATURE_NAMES):
        explanation.append({
            "feature": fname,
            "label": FEATURE_LABELS[fname],
            "value": float(raw[0][i]),
            "contribution": float(contributions[i]),
            "direction": "positive" if contributions[i] >= 0 else "negative",
        })
    explanation.sort(key=lambda e: abs(e["contribution"]), reverse=True)

    return {
        "name": borrower.name,
        "score": score,
        "probability_repay": round(p_repay, 3),
        "decision": decision,
        "decision_label": decision_label,
        "rounds_trained": trainer.round,
        "explanation": explanation,
    }