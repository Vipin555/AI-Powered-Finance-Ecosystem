"""
Portfolio ML Model Training Script
Generates synthetic data and trains:
1. Rebalance Decision Classifier (Random Forest) — Section 7.1
2. Portfolio Return Regression (Gradient Boosting) — Section 7.2

Run once to produce .pkl model files for use by FastAPI.
"""

import numpy as np
import joblib
import os
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

np.random.seed(42)
N = 5000  # Synthetic samples

# --- 7.1 Rebalance Decision Classifier (Random Forest) ---
# Features: [asset_concentration, market_volatility, risk_score, income_stability, goal_proximity]

asset_concentration = np.random.uniform(0.05, 0.95, N)   # HHI / concentration (0-1)
market_volatility   = np.random.uniform(0.02, 0.35, N)   # Portfolio std dev (%)
risk_score          = np.random.uniform(0.0, 1.0, N)     # Normalized risk score
income_stability    = np.random.uniform(0.0, 1.0, N)     # Stability index
goal_proximity      = np.random.uniform(0.0, 1.0, N)     # Years left / horizon

# Label: Rebalance = 1 if concentration > 0.55 OR volatility > 0.20 OR
#        (goal_proximity < 0.25 AND risk_score > 0.65)
rebalance_label = (
    (asset_concentration > 0.55).astype(int)
    | (market_volatility > 0.20).astype(int)
    | ((goal_proximity < 0.25) & (risk_score > 0.65)).astype(int)
)
# Add noise
noise_idx = np.random.choice(N, size=int(N * 0.05), replace=False)
rebalance_label[noise_idx] = 1 - rebalance_label[noise_idx]

X_clf = np.column_stack([
    asset_concentration,
    market_volatility,
    risk_score,
    income_stability,
    goal_proximity
])

X_clf_train, X_clf_test, y_clf_train, y_clf_test = train_test_split(
    X_clf, rebalance_label, test_size=0.2, random_state=42
)

rf_pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("clf", RandomForestClassifier(n_estimators=150, max_depth=8, random_state=42))
])
rf_pipeline.fit(X_clf_train, y_clf_train)
clf_accuracy = rf_pipeline.score(X_clf_test, y_clf_test)
print(f"[7.1] Rebalance Classifier Accuracy: {clf_accuracy:.4f}")


# --- 7.2 Portfolio Return Prediction (Gradient Boosting Regressor) ---
# Features: [w_equity, w_debt, w_gold, w_pf, w_bonds, w_cash, market_pe, gdp_growth, inflation]

w_equity   = np.random.uniform(0.05, 0.80, N)
w_debt     = np.random.uniform(0.05, 0.60, N)
w_gold     = np.random.uniform(0.02, 0.20, N)
w_pf       = np.random.uniform(0.02, 0.20, N)
w_bonds    = np.random.uniform(0.01, 0.15, N)
w_cash     = np.random.uniform(0.01, 0.15, N)

# Normalize weights to sum ~1
total_w = w_equity + w_debt + w_gold + w_pf + w_bonds + w_cash
w_equity /= total_w
w_debt   /= total_w
w_gold   /= total_w
w_pf     /= total_w
w_bonds  /= total_w
w_cash   /= total_w

market_pe   = np.random.uniform(12, 35, N)    # Market P/E ratio
gdp_growth  = np.random.uniform(-2, 10, N)    # GDP growth rate (%)
inflation   = np.random.uniform(3, 12, N)     # Inflation rate (%)

# Realistic return formula with economic factors
base_return = (
    w_equity * 13.5
    + w_debt * 7.0
    + w_gold * 9.0
    + w_pf * 8.15
    + w_bonds * 7.5
    + w_cash * 3.5
)
pe_effect       = -0.08 * (market_pe - 22)   # High PE reduces future returns
gdp_effect      =  0.25 * gdp_growth
inflation_effect = -0.15 * inflation

expected_return = base_return + pe_effect + gdp_effect + inflation_effect
# Add noise
expected_return += np.random.normal(0, 0.8, N)
expected_return = np.clip(expected_return, -5.0, 30.0)

X_reg = np.column_stack([
    w_equity, w_debt, w_gold, w_pf, w_bonds, w_cash,
    market_pe, gdp_growth, inflation
])

X_reg_train, X_reg_test, y_reg_train, y_reg_test = train_test_split(
    X_reg, expected_return, test_size=0.2, random_state=42
)

gb_pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("reg", GradientBoostingRegressor(n_estimators=200, max_depth=5, learning_rate=0.05, random_state=42))
])
gb_pipeline.fit(X_reg_train, y_reg_train)
reg_r2 = gb_pipeline.score(X_reg_test, y_reg_test)
print(f"[7.2] Return Regressor R² Score: {reg_r2:.4f}")

# Save both models
out_dir = os.path.dirname(os.path.abspath(__file__))
clf_path = os.path.join(out_dir, "portfolio_rebalance_clf.pkl")
reg_path = os.path.join(out_dir, "portfolio_return_reg.pkl")

joblib.dump(rf_pipeline, clf_path)
joblib.dump(gb_pipeline, reg_path)

print(f"[OK] Saved Classifier → {clf_path}")
print(f"[OK] Saved Regressor  → {reg_path}")
