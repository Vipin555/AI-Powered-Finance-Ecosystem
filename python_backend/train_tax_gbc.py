"""
Train only M6 - Tax Instrument GBC (the one that was cut off)
Run: python train_tax_gbc.py
"""
import numpy as np
import joblib
import os
import warnings
warnings.filterwarnings("ignore")

from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

np.random.seed(42)
OUT_DIR = os.path.dirname(os.path.abspath(__file__))

print("[M6] Tax Instrument Recommender (GradientBoosting) - 30k tax profiles...")

N_TAX = 30_000
rng = np.random.default_rng(42)

annual_salary  = rng.uniform(400_000, 5_000_000, N_TAX)
age_t          = rng.integers(22, 60, N_TAX).astype(float)
curr_80c       = rng.uniform(0, 150_000, N_TAX)
curr_80d       = rng.uniform(0, 50_000,  N_TAX)
curr_nps       = rng.uniform(0, 50_000,  N_TAX)
home_loan_int  = rng.uniform(0, 200_000, N_TAX)
hra_ex         = rng.uniform(0, 100_000, N_TAX)
emi_ratio_t    = rng.uniform(0.0, 0.45, N_TAX)
savings_r_t    = rng.uniform(0.05, 0.55, N_TAX)
has_health_ins = rng.integers(0, 2, N_TAX).astype(float)
has_home_loan  = (home_loan_int > 10_000).astype(float)
risk_t         = rng.uniform(0, 1, N_TAX)

X_tax = np.column_stack([
    annual_salary / 1_000_000,
    age_t / 60,
    curr_80c / 150_000,
    curr_80d / 50_000,
    curr_nps / 50_000,
    home_loan_int / 200_000,
    hra_ex / 100_000,
    emi_ratio_t,
    savings_r_t,
    has_health_ins,
    has_home_loan,
    risk_t
])

INSTRUMENTS = [
    "ELSS (Tax-saving Mutual Fund)",
    "PPF (Public Provident Fund)",
    "NPS Tier-1 (80CCD 1B)",
    "Health Insurance (80D Top-Up)",
    "Home Loan Repayment (Sec 24b)",
    "Term Life Insurance"
]

def best_instrument(sal, age, c80c, c80d, nps, hl, hra, emi, sr, hi, has_hl, risk):
    unused_80c = max(0, 150_000 - c80c)
    unused_80d = max(0, (50_000 if age >= 60 else 25_000) - c80d)
    unused_nps = max(0, 50_000 - nps)
    unused_hl  = max(0, 200_000 - hl)
    if hi == 0 and unused_80d > 5_000:           return 3
    if sal > 1_500_000 and unused_nps > 10_000:  return 2
    if unused_80c > 50_000 and risk > 0.5:       return 0
    if unused_80c > 50_000 and risk <= 0.5:      return 1
    if has_hl and unused_hl > 20_000:            return 4
    if age < 40 and sal > 600_000:               return 5
    if unused_80c > 10_000 and risk > 0.5:       return 0
    return 1

y_tax = np.array([
    best_instrument(annual_salary[i], age_t[i], curr_80c[i], curr_80d[i],
                    curr_nps[i], home_loan_int[i], hra_ex[i],
                    emi_ratio_t[i], savings_r_t[i], has_health_ins[i],
                    has_home_loan[i], risk_t[i])
    for i in range(N_TAX)
])

X_tr_t, X_te_t, y_tr_t, y_te_t = train_test_split(
    X_tax, y_tax, test_size=0.15, random_state=42, stratify=y_tax
)

gbc = Pipeline([
    ("scaler", StandardScaler()),
    ("gbc", GradientBoostingClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.85,
        min_samples_split=20,
        random_state=42
    ))
])
gbc.fit(X_tr_t, y_tr_t)
acc = accuracy_score(y_te_t, gbc.predict(X_te_t))
print(f"  Accuracy: {acc:.4f}  (target > 0.88)")

path = os.path.join(OUT_DIR, "tax_instrument_gbc.pkl")
joblib.dump({"model": gbc, "instruments": INSTRUMENTS,
             "feature_names": ["annual_salary_norm","age_norm","curr_80c_util",
                               "curr_80d_util","curr_nps_util","home_loan_util",
                               "hra_util","emi_ratio","savings_ratio",
                               "has_health_ins","has_home_loan","risk_appetite"]},
            path)
print(f"  [OK] Saved: tax_instrument_gbc.pkl")
print("\nDone! All 6 models are now available.")
