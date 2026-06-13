"""
Saathi Score - Synthetic alternative-data generator.
Three lender nodes with deliberately different (non-IID) borrower populations.
"""

import numpy as np

FEATURE_NAMES = [
    "daily_income_avg",      # average daily income (Rs)
    "income_consistency",    # 0-1, how steady daily earnings are
    "upi_txn_per_week",      # digital transaction frequency
    "utility_payment_ratio", # fraction of utility bills paid on time
    "savings_rate",          # fraction of income saved
    "years_in_business",     # vendor/work tenure
    "cash_buffer_days",      # days they could survive with zero income
    "informal_loan_count",   # current loans from moneylenders (risk signal)
]

# Hidden ground-truth weights that drive repayment (the model must discover these)
TRUE_WEIGHTS = np.array([0.8, 1.6, 0.5, 1.8, 1.5, 1.4, 1.6, -1.4])
TRUE_BIAS = 1.1

BANK_PROFILES = {
    "urbanpay": {
        "name": "UrbanPay MFI",
        "segment": "Urban gig workers",
        "n": 400,
        "income_mean": 950, "income_std": 350,
        "consistency_ab": (4, 3),      # beta dist params -> volatile
        "upi_mean": 28,
        "utility_ab": (5, 2),
        "savings_ab": (2, 6),
        "tenure_mean": 2.5,
        "buffer_mean": 6,
        "informal_loan_p": 0.35,
    },
    "janata": {
        "name": "Janata Credit Co-op",
        "segment": "Street vendors",
        "n": 400,
        "income_mean": 650, "income_std": 150,
        "consistency_ab": (6, 2),      # steady earners
        "upi_mean": 20,
        "utility_ab": (4, 2),
        "savings_ab": (3, 5),
        "tenure_mean": 6.0,
        "buffer_mean": 9,
        "informal_loan_p": 0.45,
    },
    "grameen": {
        "name": "Grameen Seva Bank",
        "segment": "Rural & semi-urban",
        "n": 400,
        "income_mean": 480, "income_std": 220,
        "consistency_ab": (3, 3),      # seasonal but not chaotic      # seasonal income
        "upi_mean": 7,                 # low digital footprint
        "utility_ab": (3, 3),
        "savings_ab": (3, 4),
        "tenure_mean": 8.0,
        "buffer_mean": 12,
        "informal_loan_p": 0.45,
    },
}


def _generate_bank(profile: dict, rng: np.random.Generator):
    n = profile["n"]
    income = np.clip(rng.normal(profile["income_mean"], profile["income_std"], n), 150, None)
    consistency = rng.beta(*profile["consistency_ab"], n)
    upi = np.clip(rng.poisson(profile["upi_mean"], n), 0, None).astype(float)
    utility = rng.beta(*profile["utility_ab"], n)
    savings = rng.beta(*profile["savings_ab"], n)
    tenure = np.clip(rng.exponential(profile["tenure_mean"], n), 0.2, 30)
    buffer_days = np.clip(rng.exponential(profile["buffer_mean"], n), 0, 60)
    informal = rng.binomial(3, profile["informal_loan_p"], n).astype(float)

    X = np.column_stack([income, consistency, upi, utility, savings,
                         tenure, buffer_days, informal])

    # Standardize with GLOBAL reference stats so the hidden truth is consistent
    X_norm = (X - GLOBAL_MEANS) / GLOBAL_STDS

    # Ground-truth repayment probability + noise
    logits = X_norm @ TRUE_WEIGHTS + TRUE_BIAS + rng.normal(0, 0.8, n)
    p_repay = 1 / (1 + np.exp(-logits))
    y = (rng.random(n) < p_repay).astype(float)  # 1 = repaid, 0 = defaulted

    return X, y


# Global reference stats (rough population-level means/stds for normalization)
GLOBAL_MEANS = np.array([700, 0.55, 18, 0.62, 0.32, 5.0, 9.0, 1.2])
GLOBAL_STDS = np.array([320, 0.20, 11, 0.22, 0.18, 4.5, 8.0, 1.0])


def generate_all_banks(seed: int = 42):
    """Returns {bank_id: {"name", "segment", "X", "y"}}"""
    rng = np.random.default_rng(seed)
    banks = {}
    for bank_id, profile in BANK_PROFILES.items():
        X, y = _generate_bank(profile, rng)
        banks[bank_id] = {
            "name": profile["name"],
            "segment": profile["segment"],
            "X": X,
            "y": y,
        }
    return banks


def normalize(X: np.ndarray) -> np.ndarray:
    return (X - GLOBAL_MEANS) / GLOBAL_STDS


if __name__ == "__main__":
    banks = generate_all_banks()
    print(f"{'Bank':<22} {'Segment':<22} {'Borrowers':>9} {'Repay rate':>11}")
    print("-" * 68)
    for bank_id, b in banks.items():
        print(f"{b['name']:<22} {b['segment']:<22} {len(b['y']):>9} {b['y'].mean():>10.1%}")