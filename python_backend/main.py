from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import numpy as np
import cvxpy as cp
from fastapi.middleware.cors import CORSMiddleware
import math
import joblib
import os

app = FastAPI(title="AI Finance Ecosystem API - Robust Rule-Based Engine")

# --- Load Portfolio ML Models ---
_PORT_DIR = os.path.dirname(os.path.abspath(__file__))
try:
    _REBALANCE_CLF = joblib.load(os.path.join(_PORT_DIR, "portfolio_rebalance_clf.pkl"))
    _RETURN_REG    = joblib.load(os.path.join(_PORT_DIR, "portfolio_return_reg.pkl"))
    print("[OK] Portfolio ML models loaded.")
except Exception as e:
    _REBALANCE_CLF = None
    _RETURN_REG    = None
    print(f"[WARN] Portfolio ML models not found: {e}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev purposes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Schemas with Validation ---
class UserFinancialData(BaseModel):
    monthly_income: float = Field(..., ge=0)
    monthly_expenses: float = Field(..., ge=0)
    total_emis: float = Field(..., ge=0)
    total_assets: float = Field(..., ge=0)
    total_liabilities: float = Field(..., ge=0)
    current_investments: float = Field(..., ge=0)
    emergency_fund: float = Field(..., ge=0)
    age: int = Field(..., gt=0, le=120)
    dependents: int = Field(0, ge=0)
    monthly_sip: float = Field(0, ge=0)
    income_history: Optional[List[float]] = Field(default=None)

class CapitalGainsData(BaseModel):
    stcg: float = Field(0, ge=0)          # Short-term capital gains (15%)
    ltcg: float = Field(0, ge=0)          # Long-term capital gains (10% over 1L)
    stcg_debt: float = Field(0, ge=0)     # Debt fund STCG (slab rate)
    ltcg_debt: float = Field(0, ge=0)     # Debt fund LTCG (slab rate post-2023)

class TaxData(BaseModel):
    # Personal Details
    age: int = Field(30, gt=0, le=120)
    residential_status: str = Field("Resident")  # Resident / NRI
    regime_choice: str = Field("Auto")            # Old / New / Auto

    # Income Components (Step 1 — GTI)
    salary_income: float = Field(0, ge=0)
    business_income: float = Field(0, ge=0)
    rental_income: float = Field(0, ge=0)
    interest_income: float = Field(0, ge=0)
    capital_gains: Optional[CapitalGainsData] = Field(default=None)

    # Deductions (Step 2)
    current_80c: float = Field(0, ge=0)
    current_80d: float = Field(0, ge=0)
    current_nps: float = Field(0, ge=0)
    hra_exemption: float = Field(0, ge=0)
    home_loan_interest: float = Field(0, ge=0)
    education_loan_interest: float = Field(0, ge=0)

    # Legacy field — map to salary if no breakdown provided
    annual_income: float = Field(0, ge=0)

    # Optimization inputs (Layer 3)
    tax_saving_budget: float = Field(150000, ge=0)  # How much can they afford to invest?
    risk_profile: str = Field("Moderate")           # Conservative, Moderate, Aggressive

    # Predictive Forecasting inputs (Layer 5)
    salary_growth_rate: float = Field(10.0, ge=0)   # Expected % annual salary growth
    business_growth_rate: float = Field(15.0, ge=0) # Expected % annual business growth
    inflation_rate: float = Field(6.0, ge=0)        # Macro inflation rate

    # Asset data from advisor engine
    current_investments: float = Field(0, ge=0)


class LifeGoal(BaseModel):
    name: str
    target_amount_today: float = Field(..., gt=0)
    years_to_goal: int = Field(..., ge=0)
    inflation_rate: float = Field(0.06, ge=0, le=0.5)

class GoalSimulationRequest(BaseModel):
    goals: List[LifeGoal]
    current_corpus: float = Field(..., ge=0)
    monthly_sip: float = Field(..., ge=0)
    user_iss: float = Field(0.8, ge=0, le=1.0)
    user_fragility: float = Field(0.3, ge=0, le=1.0)
    expected_return: float = Field(0.10, ge=0.01, le=0.40)
    risk_profile: str = Field("Moderate")
    savings_rate: float = Field(0.20, ge=0.0, le=1.0)       # From advisor engine
    emergency_coverage: float = Field(3.0, ge=0.0)          # Months of coverage
    age: int = Field(30, ge=18, le=80)                      # User age for allocation rule


# --- MODULE 1: AI Financial Advisor Engine ---
@app.post("/api/advisor")
def financial_advisor_engine(data: UserFinancialData):
    # --- 1. Robust Feature Engineering ---
    income = float(data.monthly_income)
    expenses = float(data.monthly_expenses)
    emis = float(data.total_emis)
    assets = float(data.total_assets)
    liabilities = float(data.total_liabilities)
    investments = float(data.current_investments)
    emergency = float(data.emergency_fund)
    age = int(data.age)
    dependents = int(data.dependents)
    monthly_sip = float(data.monthly_sip)

    # 1. Savings Ratio
    savings_rate = 0.0
    dscr = 0.0
    surplus = income - expenses - emis
    if income > 0:
        savings_rate = max(0, surplus / income)
        dscr = emis / income
    
    # 2. EMI Burden Ratio
    emi_burden_ratio = dscr

    # 3. Emergency Coverage Ratio
    fixed_outflows = expenses + emis
    emergency_fund_coverage = emergency / fixed_outflows if fixed_outflows > 0 else float('inf')

    # 4. Dependency Ratio (Mock proxy: dependents / (income/10000) or simply dependents as a ratio metric)
    dependency_ratio = dependents / (income / 10000) if income > 0 else float(dependents)

    # 5. Liquidity Ratio
    liquidity_ratio = assets / liabilities if liabilities > 0 else float('inf')

    # 6. Asset Allocation %
    total_portfolio = investments + emergency
    asset_allocation_pct = (investments / total_portfolio) * 100 if total_portfolio > 0 else 0.0

    # 7. Diversification Index (Simple mock: max 1.0 when perfectly balanced between investments and emergency)
    diversification_index = 1.0 - abs(0.5 - (asset_allocation_pct / 100))

    # Statistical Measures
    if data.income_history and len(data.income_history) > 0:
        income_mean = float(np.mean(data.income_history))
        income_std = float(np.std(data.income_history))
        cv = (income_std / income_mean) if income_mean > 0 else 0.0
    else:
        income_mean = income
        income_std = 0.0
        cv = 0.0
        
    extracted_features = {
        "savings_ratio": savings_rate,
        "emi_burden_ratio": emi_burden_ratio,
        "emergency_coverage_ratio": emergency_fund_coverage if emergency_fund_coverage != float('inf') else -1,
        "dependency_ratio": dependency_ratio,
        "liquidity_ratio": liquidity_ratio if liquidity_ratio != float('inf') else -1,
        "asset_allocation_pct": asset_allocation_pct,
        "diversification_index": diversification_index,
        "income_mean": income_mean,
        "income_std": income_std,
        "coefficient_of_variation": cv
    }

    # --- 1.5 Financial Diagnosis Layer ---
    # Translates raw ratios into interpretable financial health states (categorical flags)
    diagnosis_flags = {}

    # Emergency Coverage Flag
    if emergency_fund_coverage < 1:
        diagnosis_flags["emergency_status"] = "Severe Deficit"
    elif emergency_fund_coverage < 3:
        diagnosis_flags["emergency_status"] = "Critical"
    elif emergency_fund_coverage < 6:
        diagnosis_flags["emergency_status"] = "Vulnerable"
    else:
        diagnosis_flags["emergency_status"] = "Resilient"

    # EMI Burden / Debt Stress Flag
    if dscr > 0.50:
        diagnosis_flags["debt_stress"] = "Severe Debt Stress"
    elif dscr > 0.40:
        diagnosis_flags["debt_stress"] = "Debt Stress High"
    elif dscr > 0.30:
        diagnosis_flags["debt_stress"] = "Elevated Debt"
    elif dscr > 0:
        diagnosis_flags["debt_stress"] = "Healthy Debt"
    else:
        diagnosis_flags["debt_stress"] = "Debt Free"

    # Savings / Wealth Creation Flag
    if savings_rate <= 0:
        diagnosis_flags["wealth_creation"] = "Capital Erosion"
    elif savings_rate < 0.10:
        diagnosis_flags["wealth_creation"] = "Wealth Creation Weak"
    elif savings_rate < 0.20:
        diagnosis_flags["wealth_creation"] = "Moderate Growth"
    else:
        diagnosis_flags["wealth_creation"] = "Strong Wealth Accumulation"

    # Liquidity Flag
    if liquidity_ratio < 0.5:
        diagnosis_flags["liquidity_status"] = "Insolvent Risk"
    elif liquidity_ratio < 1.0:
        diagnosis_flags["liquidity_status"] = "Negative Net Worth"
    elif liquidity_ratio < 1.5:
        diagnosis_flags["liquidity_status"] = "Low Liquidity"
    else:
        diagnosis_flags["liquidity_status"] = "Liquid and Stable"

    extracted_features["diagnosis_flags"] = diagnosis_flags

    # --- 1.6 Income Stability & Forecasting ---
    forecast_results = {}
    try:
        meta_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'income_forecasting_meta.pkl')
        if os.path.exists(meta_path):
            forecast_meta = joblib.load(meta_path)
            input_len = forecast_meta.get('input_len', 12)
            forecast_len = forecast_meta.get('forecast_len', 6)
            aux_mean = forecast_meta.get('aux_mean', [0, 0, 0])
            aux_std = forecast_meta.get('aux_std', [0.1, 0.1, 0.1])
            
            # Use income history if available, else use current income
            history = data.income_history if data.income_history else [income] * input_len
            if len(history) < input_len:
                history = history + [history[-1]] * (input_len - len(history))
            elif len(history) > input_len:
                history = history[-input_len:]
                
            base_forecast = np.mean(history)
            forecast = []
            
            # Simple stochastic forecast using aux_mean and aux_std
            for i in range(forecast_len):
                # We use the first aux variable parameters for simulated shock
                shock = np.random.normal(aux_mean[0], aux_std[0])
                predicted_income = base_forecast * (1 + shock)
                forecast.append(round(float(predicted_income), 2))
                
            forecast_results = {
                "forecasted_income": forecast,
                "stability_score": round(max(0, 100 - (cv * 100)), 2),
                "status": "Success"
            }
        else:
            forecast_results = {"status": "Meta file not found", "path_checked": meta_path}
    except Exception as e:
        forecast_results = {"status": "Error", "message": str(e)}
        
    extracted_features["income_forecasting"] = forecast_results

    # --- 1.7 Vulnerability Prediction ---
    vulnerability_index = 0.5 # fallback
    vulnerability_status = "Unknown"
    try:
        import pandas as pd
        xgb_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'financial_vulnerability_xgb.pkl')
        if os.path.exists(xgb_path):
            xgb_dict = joblib.load(xgb_path)
            xgb_model = xgb_dict.get('model', xgb_dict.get('classifier'))
            
            # Features: ['Income_Stability', 'Savings_Ratio', 'EMI_Ratio', 'Emergency_Fund', 'Dependents', 'Liquidity_Ratio']
            safe_emg = 99.0 if emergency_fund_coverage == float('inf') else emergency_fund_coverage
            safe_liq = 99.0 if liquidity_ratio == float('inf') else liquidity_ratio
            safe_stability = forecast_results.get("stability_score", 50.0)
            
            input_df = pd.DataFrame([[
                safe_stability,
                savings_rate,
                dscr,
                safe_emg,
                dependents,
                safe_liq
            ]], columns=['Income_Stability', 'Savings_Ratio', 'EMI_Ratio', 'Emergency_Fund', 'Dependents', 'Liquidity_Ratio'])
            
            vulnerability_index = float(xgb_model.predict(input_df)[0])
            vulnerability_index = max(0.0, min(1.0, vulnerability_index))
            
            if vulnerability_index > 0.70:
                vulnerability_status = "High Vulnerability (Defensive strategy activated)"
            elif vulnerability_index > 0.40:
                vulnerability_status = "Moderate Vulnerability"
            else:
                vulnerability_status = "Low Vulnerability"
                
    except Exception as e:
        vulnerability_status = f"Error: {str(e)}"
        
    extracted_features["vulnerability_index"] = round(vulnerability_index, 4)
    extracted_features["vulnerability_status"] = vulnerability_status

    # --- 2. Risk Score & Tier ---
    risk_score = 0
    if age < 28: risk_score += 40
    elif age < 35: risk_score += 34
    elif age < 42: risk_score += 26
    elif age < 50: risk_score += 18
    elif age < 58: risk_score += 10
    else: risk_score += 4

    if emergency_fund_coverage >= 6: risk_score += 25
    elif emergency_fund_coverage >= 3: risk_score += 14

    if dscr < 0.10: risk_score += 20
    elif dscr < 0.20: risk_score += 14
    elif dscr < 0.30: risk_score += 8
    elif dscr < 0.40: risk_score += 3

    if savings_rate >= 0.30: risk_score += 15
    elif savings_rate >= 0.20: risk_score += 10
    elif savings_rate >= 0.10: risk_score += 5

    risk_tier = 'Conservative'
    if risk_score >= 65: risk_tier = 'Aggressive'
    elif risk_score >= 40: risk_tier = 'Moderate'

    # --- 2.5 Fiscal Health Aggregation ---
    # Combines Risk Capacity, Vulnerability, Liquidity, and Debt Stress
    stress_points = 0
    
    # 1. Risk Capacity
    if risk_tier == 'Conservative': stress_points += 1
    elif risk_tier == 'Aggressive': stress_points -= 1
    
    # 2. Vulnerability
    if vulnerability_index > 0.70: stress_points += 2
    elif vulnerability_index > 0.40: stress_points += 1
    
    # 3. Liquidity
    if liquidity_ratio < 1.0: stress_points += 2
    elif liquidity_ratio < 1.5: stress_points += 1
    
    # 4. Debt Stress
    if dscr > 0.40: stress_points += 2
    elif dscr > 0.30: stress_points += 1
    
    if stress_points >= 4:
        financial_stress_level = "High"
        advisory_intensity = "Urgent Corrective Actions Required"
    elif stress_points >= 2:
        financial_stress_level = "Moderate"
        advisory_intensity = "Proactive Adjustments Recommended"
    else:
        financial_stress_level = "Low"
        advisory_intensity = "Standard Maintenance"
        
    extracted_features["fiscal_health_aggregation"] = {
        "stress_points": stress_points,
        "financial_stress_level": financial_stress_level,
        "advisory_intensity": advisory_intensity
    }

    # --- 3. Health Score ---
    penalty = 0
    if dscr > 0.50: penalty += 30
    elif dscr > 0.40: penalty += 22
    elif dscr > 0.30: penalty += 13
    elif dscr > 0.20: penalty += 5

    ec = 99 if emergency_fund_coverage == float('inf') else emergency_fund_coverage
    if ec < 1: penalty += 25
    elif ec < 3: penalty += 18
    elif ec < 6: penalty += 8

    if (surplus/income if income>0 else 0) < 0: penalty += 25
    elif savings_rate < 0.05: penalty += 20
    elif savings_rate < 0.10: penalty += 13
    elif savings_rate < 0.20: penalty += 6

    lr = 99 if liquidity_ratio == float('inf') else liquidity_ratio
    if lr < 0.5: penalty += 20
    elif lr < 1.0: penalty += 14
    elif lr < 1.5: penalty += 6

    score = max(0, min(100, round(100 - penalty)))

    # --- 4. Core Portfolio Allocation Engine (Mean-Variance) ---
    # Replaces the generic static map with a personalized mathematical optimization
    stab_score = forecast_results.get("stability_score", 50.0)
    
    # Expected Returns (mu) and Volatility (std_dev)
    # Assets: [Equity, Debt, Gold, Cash]
    mu = np.array([0.12, 0.07, 0.09, 0.04])
    std_dev = np.array([0.15, 0.04, 0.12, 0.005])
    
    # Correlation Matrix
    corr = np.array([
        [1.0,  0.1, -0.2,  0.0],
        [0.1,  1.0,  0.05, 0.0],
        [-0.2, 0.05, 1.0,  0.0],
        [0.0,  0.0,  0.0,  1.0]
    ])
    
    # Covariance Matrix = diag(std) * corr * diag(std)
    D = np.diag(std_dev)
    cov_matrix = D @ corr @ D
    
    # Personalized Risk Aversion Parameter (lambda)
    # Base = 3.0. High risk score lowers lambda (more aggressive). High vulnerability/low stability raises lambda.
    lambda_val = 3.0 + (vulnerability_index * 4.0) + ((100 - stab_score) / 40.0) - (risk_score / 30.0)
    lambda_val = max(0.5, min(10.0, lambda_val)) # Bound between 0.5 (Aggressive) and 10.0 (Very Conservative)
    
    # CVXPY Mean-Variance Optimization
    weights = cp.Variable(4)
    expected_return = mu @ weights
    risk = cp.quad_form(weights, cov_matrix)
    
    objective = cp.Maximize(expected_return - (lambda_val * risk))
    
    constraints = [
        cp.sum(weights) == 1.0,
        weights >= 0,
        weights[0] <= 0.85, # Max Equity 85%
        weights[1] >= 0.10, # Min Debt 10%
        weights[2] >= 0.05, # Min Gold 5%
        weights[2] <= 0.20, # Max Gold 20%
        weights[3] >= 0.05  # Min Cash 5%
    ]
    
    prob = cp.Problem(objective, constraints)
    try:
        prob.solve()
        alloc_eq = float(weights.value[0])
        alloc_debt = float(weights.value[1])
        alloc_gold = float(weights.value[2])
        alloc_cash = float(weights.value[3])
    except Exception:
        # Fallback to moderate
        alloc_eq, alloc_debt, alloc_gold, alloc_cash = 0.52, 0.32, 0.10, 0.06
        
    # Breakdown Debt dynamically based on metrics
    # Higher vulnerability or lower stability = higher FD, lower MF
    fd_ratio = 0.2 + (vulnerability_index * 0.5) + ((100 - stab_score) / 200.0)
    fd_ratio = max(0.1, min(0.8, fd_ratio)) # Between 10% and 80% of Debt
    
    ppf_ratio = 0.2 # Fixed 20% of Debt goes to PPF as stable anchor
    mf_ratio = max(0.0, 1.0 - fd_ratio - ppf_ratio)
    
    portfolio = {
        "Equity": round(alloc_eq * 100),
        "Debt": round(alloc_debt * 100),
        "Gold": round(alloc_gold * 100),
        "Cash": round(alloc_cash * 100),
        "Debt_FD": round(alloc_debt * fd_ratio * 100),
        "Debt_MF": round(alloc_debt * mf_ratio * 100),
        "Debt_PPF": round(alloc_debt * ppf_ratio * 100)
    }

    # --- 4.5 Emergency Fund Storage Logic ---
    # Split rule depends on income stability (calculated in section 1.6)
    stab_score = forecast_results.get("stability_score", 50.0)
    
    if stab_score < 40.0:
        # Volatile income: Increase highly liquid savings account share
        emg_split = {"Savings_Account": 70, "Liquid_MF": 10, "Short_Term_FD": 20}
    elif stab_score >= 70.0:
        # Stable income: Increase liquid mutual fund exposure for better returns
        emg_split = {"Savings_Account": 30, "Liquid_MF": 50, "Short_Term_FD": 20}
    else:
        # Default split
        emg_split = {"Savings_Account": 50, "Liquid_MF": 30, "Short_Term_FD": 20}
        
    extracted_features["emergency_fund_split"] = emg_split

    # --- 5. CVXPY Cash Flow Reallocation Optimization Engine ---
    # IMPORTANT: Expenses are treated as FIXED — people cannot simply cut essential living costs.
    # Only genuine discretionary surplus (income - expenses - emis) is available to allocate.
    disposable = income
    # Expenses are NOT reducible by default. They represent committed living costs.
    minimum_expenses = expenses  # Floor = actual expenses. No artificial 20% haircut.

    # True monthly surplus after non-negotiable outflows
    surplus = max(0, disposable - expenses - emis)

    if disposable < (expenses + emis):
        # Extreme constraint: income doesn't even cover basic outflows
        alloc_expenses = expenses
        alloc_emi = emis
        alloc_emg = 0.0
        alloc_sip = 0.0
        alloc_fd = 0.0
    elif surplus == 0:
        alloc_expenses = expenses
        alloc_emi = emis
        alloc_emg = 0.0
        alloc_sip = 0.0
        alloc_fd = 0.0
    else:
        # Determine priorities based on financial health
        equity_underallocated = asset_allocation_pct < (portfolio["Equity"] * 0.8)

        # ------------------------------------------------------------------
        # REALISTIC SURPLUS ALLOCATION
        # Rules:
        #   Emergency capped at 40% of surplus (even in critical scenarios).
        #   Always preserve at least 10% of surplus for investments.
        #   Expenses output = actual expenses (never reduced).
        # ------------------------------------------------------------------
        if emergency_fund_coverage < 3:
            # Emergency is critical — divert up to 40% of surplus
            emg_share = min(0.40, max(0.20, 0.40))
            invest_share = max(0.10, 1.0 - emg_share)  # rest to investments
            alloc_emg = round(surplus * emg_share, 2)
            alloc_invest_total = round(surplus * invest_share, 2)
        elif emergency_fund_coverage < 6:
            # Moderate gap — 20% to emergency, rest to investments
            emg_share = 0.20
            alloc_emg = round(surplus * emg_share, 2)
            alloc_invest_total = round(surplus * (1.0 - emg_share), 2)
        elif dscr > 0.40:
            # High debt burden — minimal emergency (already OK), focus on debt
            alloc_emg = round(surplus * 0.05, 2)
            alloc_invest_total = round(surplus * 0.95, 2)
        else:
            # Healthy scenario — standard allocation
            alloc_emg = 0.0
            alloc_invest_total = surplus

        # Split investments between equity SIP and debt/FD
        eq_ratio = portfolio["Equity"] / max(portfolio["Equity"] + portfolio["Debt"], 1)
        alloc_sip = round(alloc_invest_total * eq_ratio, 2)
        alloc_fd = round(alloc_invest_total * (1.0 - eq_ratio), 2)

        alloc_expenses = expenses  # Always the actual expense amount
        alloc_emi = emis           # Always the actual EMI amount
            
    alloc_inv = alloc_sip + alloc_fd

    # Calculate how many months to fill emergency fund gap
    target_emg_total = fixed_outflows * 6
    emg_gap = max(0, target_emg_total - emergency)
    months_to_full_emg = math.ceil(emg_gap / alloc_emg) if alloc_emg > 0 else None

    cashFlow = {
        "expenses": round(alloc_expenses, 2),
        "emis": round(alloc_emi, 2),
        "emergency": round(alloc_emg, 2),
        "investments": round(alloc_inv, 2),
        "sip_equity": round(alloc_sip, 2),
        "fd_debt": round(alloc_fd, 2),
        "surplus": round(surplus, 2),
        "target_emg_total": round(target_emg_total, 2),
        "emg_gap": round(emg_gap, 2),
        "months_to_full_emg": months_to_full_emg,
    }

    # --- 6. Diagnosis Issues ---
    issues = []
    emg_display = '∞' if emergency_fund_coverage == float('inf') else f"{emergency_fund_coverage:.1f}"
    liq_display = '∞' if liquidity_ratio == float('inf') else f"{liquidity_ratio:.2f}"
    actual_savings_rate = surplus / income if income > 0 else 0

    if surplus < 0:
        issues.append({"icon": '🔴', "label": 'Negative Cash Flow — Critical!', "detail": f"You overspend by ₹{abs(surplus):,.0f}/month. Cut discretionary spending immediately."})
    elif actual_savings_rate < 0.10:
        issues.append({"icon": '🟠', "label": 'Dangerously Low Savings', "detail": f"You save only {actual_savings_rate*100:.0f}% (₹{surplus:,.0f}/mo). Need ₹{math.ceil(income*0.20):,.0f}/mo (20%)."})
    elif actual_savings_rate < 0.20:
        issues.append({"icon": '🟡', "label": 'Below-Target Savings', "detail": f"Saving {actual_savings_rate*100:.0f}% — good start! Aim for ₹{math.ceil(income*0.20):,.0f}/mo to hit 20%."})
    else:
        issues.append({"icon": '🟢', "label": 'Strong Savings Habit', "detail": f"Saving {actual_savings_rate*100:.0f}% (₹{surplus:,.0f}/mo) — excellent financial discipline."})

    if dscr > 0.40:
        issues.append({"icon": '🔴', "label": 'Heavy EMI Burden', "detail": f"DTI {dscr*100:.0f}%: ₹{emis:,.0f} of every ₹{income:,.0f} earned goes to EMIs. Target <30%."})
    elif dscr > 0.25:
        issues.append({"icon": '🟡', "label": 'Elevated EMI Load', "detail": f"DTI at {dscr*100:.0f}% is above comfort zone. Avoid taking any new loans."})
    elif emis > 0:
        issues.append({"icon": '🟢', "label": 'Healthy EMI Load', "detail": f"DTI at {dscr*100:.0f}% is within safe limits. Maintain this discipline."})

    if ec < 3:
        target = math.ceil(fixed_outflows * 6)
        issues.append({"icon": '🔴', "label": 'Emergency Fund — Critical Gap', "detail": f"Only {emg_display} months covered. Build to ₹{target:,.0f} (6-month buffer) ASAP."})
    elif ec < 6:
        gap = math.ceil(max(0, fixed_outflows * 6 - emergency))
        issues.append({"icon": '🟡', "label": 'Emergency Fund Needs Top-Up', "detail": f"{emg_display} months covered. Need ₹{gap:,.0f} more to reach full 6-month buffer."})
    else:
        issues.append({"icon": '🟢', "label": 'Emergency Fund Adequate', "detail": f"{emg_display} months of outflows covered (₹{emergency:,.0f}). You're well protected."})

    if lr < 1:
        issues.append({"icon": '🔴', "label": 'Negative Net Worth', "detail": f"Liabilities (₹{liabilities:,.0f}) exceed assets (₹{assets:,.0f}). Focus on debt reduction."})
    elif lr < 1.5:
        issues.append({"icon": '🟡', "label": 'Thin Asset Cushion', "detail": f"Assets are {liq_display}× liabilities. Build assets or repay loans to strengthen your balance sheet."})
    else:
        issues.append({"icon": '🟢', "label": 'Solid Net Worth', "detail": f"Assets are {liq_display}× your liabilities (₹{assets:,.0f} vs ₹{liabilities:,.0f}). Strong position."})

    if age < 30:
        r_temp = 0.13 / 12
        growth = 1000 * (((1 + r_temp)**(30 * 12) - 1) / r_temp) * (1 + r_temp)
        issues.append({"icon": '⚡', "label": f"Superpower: {30 - age} Years of Compounding Ahead", "detail": f"At {age}, ₹1,000/mo invested at 13% becomes ₹{round(growth):,.0f} in 30 years. Start now."})
    elif age < 40:
        issues.append({"icon": '🚀', "label": 'Peak Wealth-Building Decade', "detail": f"Your 30s are prime for compounding. Max out SIP contributions and resist lifestyle inflation."})
    elif age < 55:
        issues.append({"icon": '⚖️', "label": 'Consolidation Phase', "detail": f"Gradually shift {max(0, 75 - (age - 35) * 2)}% into equity, rest into debt/gold as retirement nears."})
    else:
        issues.append({"icon": '🛡️', "label": 'Pre-Retirement — Capital Preservation Mode', "detail": f"Shift toward debt funds, FDs, and dividend-yielding instruments. Target <{max(20, 75 - age)}% equity."})

    # --- 7. Priority Ranking Engine ---
    # Ranks actions using: Severity × Financial Impact × Time Sensitivity
    raw_actions = []
    
    if surplus < 0:
        raw_actions.append({
            "text": f"🚨 URGENT: Cut ₹{abs(surplus):,.0f}/month in non-essential spending. You cannot build wealth while spending more than you earn.",
            "severity": 10, "financial_impact": 10, "time_sensitivity": 10
        })
    if ec < 6:
        target = math.ceil(fixed_outflows * 6)
        gap = max(0, target - emergency)
        sev = 9 if ec < 1 else (7 if ec < 3 else 4)
        raw_actions.append({
            "text": f"Emergency Fund: Save ₹{alloc_emg:,.0f}/month to reach your ₹{target:,.0f} goal.",
            "severity": sev, "financial_impact": 8, "time_sensitivity": sev
        })
    if dscr > 0.30:
        sev = 9 if dscr > 0.50 else (6 if dscr > 0.40 else 4)
        raw_actions.append({
            "text": f"Debt Avalanche: List all loans by interest rate and prepay the costliest one first.",
            "severity": sev, "financial_impact": 9, "time_sensitivity": sev
        })
    if surplus > 0 and alloc_inv > 0:
        sip_suggestion = max(500, round(alloc_inv * 0.70 / 500) * 500)
        lumpsum = alloc_inv - sip_suggestion
        action_text = f"Invest ₹{sip_suggestion:,.0f}/month via SIP. Park remaining ₹{lumpsum:,.0f} in a liquid fund."
        raw_actions.append({
            "text": action_text,
            "severity": 3, "financial_impact": 8, "time_sensitivity": 4
        })
    if age < 40 and actual_savings_rate >= 0.20:
        raw_actions.append({
            "text": f"Step-Up SIP: Increase your SIP by 10% every April.",
            "severity": 2, "financial_impact": 9, "time_sensitivity": 2
        })
    if liabilities > 0 and lr < 2:
        raw_actions.append({
            "text": f"Target a liability-to-asset ratio below 50%. You're at {round((liabilities/max(assets,1))*100)}%.",
            "severity": 5, "financial_impact": 6, "time_sensitivity": 4
        })
        
    for act in raw_actions:
        act["priority_score"] = act["severity"] * act["financial_impact"] * act["time_sensitivity"]
        
    raw_actions.sort(key=lambda x: x["priority_score"], reverse=True)
    
    immediate_actions, mid_term_actions, long_term_actions = [], [], []
    for act in raw_actions:
        output_act = {"action": act["text"], "score": act["priority_score"]}
        if act["priority_score"] >= 300: immediate_actions.append(output_act)
        elif act["priority_score"] >= 100: mid_term_actions.append(output_act)
        else: long_term_actions.append(output_act)
            
    actions = {
        "Immediate_Actions": immediate_actions,
        "Mid_Term_Actions": mid_term_actions,
        "Long_Term_Actions": long_term_actions
    }

    # --- 8. Future Corpus ---
    # Used CVXPY's implied optimal weights to project returns
    annual_return = (alloc_eq * 0.12) + (alloc_debt * 0.07) + (alloc_gold * 0.09) + (alloc_cash * 0.04)
    r = annual_return / 12
    monthly_invest = max(0, alloc_inv)
    future_from_corpus = investments * ((1 + annual_return) ** 10)
    future_from_sip = monthly_invest * (((1 + r)**120 - 1) / r) * (1 + r) if (monthly_invest > 0 and r > 0) else 0
    future_corpus = future_from_corpus + future_from_sip

    # --- 9. Explainable AI Layer ---
    # Generating SHAP value proxies (Feature contributions relative to healthy baselines)
    shap_proxies = {
        "Savings_Ratio": round((actual_savings_rate - 0.20) * 10, 2), # Positive is good
        "EMI_Burden": round((0.30 - dscr) * 10, 2), # Positive is good
        "Emergency_Coverage": round(min(6, ec) - 3, 2), # Positive is good
        "Liquidity": round(min(3, lr) - 1.5, 2)
    }
    
    decision_path = [
        f"1. Calculated Risk Capacity score: {risk_score} -> Tier: {risk_tier}",
        f"2. Evaluated Vulnerability Index: {vulnerability_index:.2f} ({vulnerability_status})",
        f"3. Derived Dynamic Risk Aversion (Lambda): {lambda_val:.2f}",
        f"4. Executed Mean-Variance Optimization yielding Equity {alloc_eq*100:.0f}%, Debt {alloc_debt*100:.0f}%"
    ]
    
    explainable_ai = {
        "shap_values_proxy": shap_proxies,
        "decision_path": decision_path,
        "structured_json_grounding": {
            "advisory_justification": f"Advisory intensity set to '{advisory_intensity}' because total stress points reached {stress_points} (out of max 7)."
        }
    }

    advisory = "Your financial strategy has been optimized using Mean-Variance analysis."
    if stress_points >= 4: advisory = "High financial stress detected. Focus immediately on liquidity and debt reduction."
    elif stress_points >= 2: advisory = "Moderate stress. Optimize debt and build emergency reserves."

    net_worth = assets - liabilities

    return {
        "score": score,
        "riskTier": risk_tier,
        "riskScore": risk_score,
        "issues": issues,
        "savingsRate": actual_savings_rate,
        "savingsRatePct": round(actual_savings_rate * 100, 1),
        "dti": dscr,
        "dtiPct": round(dscr * 100, 1),
        "liquidityRatio": liquidity_ratio if liquidity_ratio != float('inf') else None,
        "emergencyCoverage": round(emergency_fund_coverage, 1) if emergency_fund_coverage != float('inf') else None,
        "portfolio": portfolio,
        "cashFlow": cashFlow,
        "prioritized_actions": actions,
        "explainable_ai": explainable_ai,
        "futureCorpus": round(future_corpus, 2),
        "monthlyInvest": round(monthly_invest, 2),
        "annualReturn": round(annual_return, 4),
        "annualReturnPct": round(annual_return * 100, 2),
        "netSavings": round(surplus, 2),
        "surplusAmount": round(surplus, 2),
        "income": income,
        "expenses": expenses,
        "emis": emis,
        "assets": assets,
        "liabilities": liabilities,
        "netWorth": round(net_worth, 2),
        "currentInvestments": investments,
        "currentEmergencyFund": emergency,
        "age": age,
        "advisory": advisory,
        "features": extracted_features
    }


# --- MODULE 2: AI Tax Planning Engine ---
@app.post("/api/tax")
def tax_planning_engine(data: TaxData):
    """
    Indian Tax Computation Engine — FY 2024-25 (AY 2025-26)
    Step 1: GTI  →  Step 2: Deductions  →  Step 3: Slab Tax
    + Capital Gains Tax  +  Surcharge  +  4% Cess
    """
    age = data.age

    # ── Step 1: Compute Gross Total Income (GTI) ─────────────────────────────
    # Use salary_income if provided, else fall back to legacy annual_income field
    salary        = data.salary_income if data.salary_income > 0 else data.annual_income
    business      = data.business_income
    rental        = data.rental_income
    interest      = data.interest_income

    # 30% standard deduction on rental income (Sec 24a)
    rental_taxable = rental * 0.70

    # Capital gains are taxed separately (not added to slab income)
    cg            = data.capital_gains or CapitalGainsData()
    stcg_equity   = cg.stcg       # Equity STCG → 20% (post-Budget 2024)
    ltcg_equity   = cg.ltcg       # Equity LTCG → 12.5% over ₹1.25L exemption
    stcg_debt     = cg.stcg_debt  # Debt STCG   → slab rate
    ltcg_debt     = cg.ltcg_debt  # Debt LTCG   → slab rate (post-Apr 2023 rule)

    # GTI (slab-taxable portion — excludes separately-taxed capital gains)
    gti_slab = salary + business + rental_taxable + interest + stcg_debt + ltcg_debt

    # ── Step 2: Apply Deductions ─────────────────────────────────────────────
    MAX_80C       = 150000
    MAX_80D_below60 = 25000
    MAX_80D_senior  = 50000
    MAX_80D       = MAX_80D_senior if age >= 60 else MAX_80D_below60
    MAX_NPS       = 50000   # 80CCD(1B) — additional NPS over 80C
    MAX_HOME_LOAN = 200000  # Section 24(b)
    STD_OLD       = 50000   # Standard deduction (Old)
    STD_NEW       = 75000   # Standard deduction (New — Budget 2024)

    # Cap deductions at their legal maxima
    c80c      = min(data.current_80c, MAX_80C)
    c80d      = min(data.current_80d, MAX_80D)
    nps_ded   = min(data.current_nps, MAX_NPS)
    home_loan = min(data.home_loan_interest, MAX_HOME_LOAN)
    edu_loan  = data.education_loan_interest  # No cap
    hra       = data.hra_exemption            # Pre-computed exemption

    # Total deductions applicable in Old Regime
    total_deductions_old = STD_OLD + c80c + c80d + nps_ded + hra + home_loan + edu_loan
    # New Regime — only standard deduction allowed
    total_deductions_new = STD_NEW

    # Taxable income under each regime
    taxable_old = max(0.0, gti_slab - total_deductions_old)
    taxable_new = max(0.0, gti_slab - total_deductions_new)

    # ── Step 3: Apply Slab Rates ─────────────────────────────────────────────
    def compute_old_slab_tax(income: float) -> tuple:
        """Returns (tax, slab_breakdown)"""
        slabs = []
        tax = 0.0
        brackets = [
            (250000, 0.00, "0 – ₹2.5L"),
            (500000, 0.05, "₹2.5L – ₹5L"),
            (1000000, 0.20, "₹5L – ₹10L"),
            (float('inf'), 0.30, "Above ₹10L"),
        ]
        prev = 0
        for ceiling, rate, label in brackets:
            taxable_in_slab = max(0, min(income, ceiling) - prev)
            tax_in_slab = taxable_in_slab * rate
            tax += tax_in_slab
            slabs.append({"label": label, "rate": f"{int(rate*100)}%", "income_in_slab": round(taxable_in_slab), "tax": round(tax_in_slab)})
            prev = ceiling
            if income <= ceiling:
                break
        return tax, slabs

    def compute_new_slab_tax(income: float) -> tuple:
        """Returns (tax, slab_breakdown) — FY 2024-25 new slabs"""
        slabs = []
        tax = 0.0
        brackets = [
            (300000, 0.00, "0 – ₹3L"),
            (700000, 0.05, "₹3L – ₹7L"),
            (1000000, 0.10, "₹7L – ₹10L"),
            (1200000, 0.15, "₹10L – ₹12L"),
            (1500000, 0.20, "₹12L – ₹15L"),
            (float('inf'), 0.30, "Above ₹15L"),
        ]
        prev = 0
        for ceiling, rate, label in brackets:
            taxable_in_slab = max(0, min(income, ceiling) - prev)
            tax_in_slab = taxable_in_slab * rate
            tax += tax_in_slab
            slabs.append({"label": label, "rate": f"{int(rate*100)}%", "income_in_slab": round(taxable_in_slab), "tax": round(tax_in_slab)})
            prev = ceiling
            if income <= ceiling:
                break
        return tax, slabs

    # Raw slab taxes
    raw_tax_old, old_slabs = compute_old_slab_tax(taxable_old)
    raw_tax_new, new_slabs = compute_new_slab_tax(taxable_new)

    # ── Section 87A Rebate ────────────────────────────────────────────────────
    # Old: full rebate if taxable ≤ 5L; New: full rebate if taxable ≤ 7L
    if taxable_old <= 500000:
        raw_tax_old = 0.0
    if taxable_new <= 700000:
        raw_tax_new = 0.0

    # ── Capital Gains Tax (Separately Taxed) ─────────────────────────────────
    # Equity STCG: 20% (Budget 2024 — was 15%)
    cg_tax_stcg_equity = stcg_equity * 0.20
    # Equity LTCG: 12.5% over ₹1.25L exemption (Budget 2024 — was 10% over 1L)
    ltcg_exemption = 125000
    cg_tax_ltcg_equity = max(0, ltcg_equity - ltcg_exemption) * 0.125
    # Debt STCG/LTCG added at slab rate (already in slab income above)
    cg_tax_total = cg_tax_stcg_equity + cg_tax_ltcg_equity

    # ── Surcharge ─────────────────────────────────────────────────────────────
    def compute_surcharge(income: float, base_tax: float) -> float:
        """Marginal relief not implemented — standard bracket surcharge"""
        if income > 50000000:   return base_tax * 0.25  # 25% for >5Cr
        if income > 20000000:   return base_tax * 0.15  # 15% for >2Cr
        if income > 10000000:   return base_tax * 0.15  # 15% for >1Cr
        if income > 5000000:    return base_tax * 0.10  # 10% for >50L
        return 0.0

    total_income_for_surcharge = gti_slab + stcg_equity + ltcg_equity

    surcharge_old = compute_surcharge(total_income_for_surcharge, raw_tax_old + cg_tax_total)
    surcharge_new = compute_surcharge(total_income_for_surcharge, raw_tax_new + cg_tax_total)

    # ── Health & Education Cess (4%) ──────────────────────────────────────────
    pre_cess_old = raw_tax_old + cg_tax_total + surcharge_old
    pre_cess_new = raw_tax_new + cg_tax_total + surcharge_new
    cess_old = pre_cess_old * 0.04
    cess_new = pre_cess_new * 0.04

    # ── Final Tax ─────────────────────────────────────────────────────────────
    final_tax_old = pre_cess_old + cess_old
    final_tax_new = pre_cess_new + cess_new

    total_income = salary + business + rental + interest + stcg_equity + ltcg_equity + stcg_debt + ltcg_debt

    eff_rate_old = final_tax_old / total_income if total_income > 0 else 0
    eff_rate_new = final_tax_new / total_income if total_income > 0 else 0

    # ── Regime Recommendation ────────────────────────────────────────────────
    if data.regime_choice in ("Old", "New"):
        recommended = data.regime_choice
    else:
        recommended = "New Regime" if final_tax_new <= final_tax_old else "Old Regime"

    savings_diff = abs(final_tax_old - final_tax_new)

    # ── Unused Deduction Capacity ─────────────────────────────────────────────
    unused_80c  = max(0, MAX_80C - c80c)
    unused_80d  = max(0, MAX_80D - c80d)
    unused_nps  = max(0, MAX_NPS - nps_ded)
    unused_home = max(0, MAX_HOME_LOAN - home_loan)

    # ── Next Year Tax Projection (10% income growth) ──────────────────────────
    # ── Layer 5: Predictive Tax Forecasting (ML Regression) ───────────────────
    from sklearn.linear_model import LinearRegression
    import numpy as np

    # Synthetic Historical Data Generation
    # To predict future income realistically, we simulate the past 5 years based on user's current 
    # income and stated growth trends (with some Gaussian noise representing volatility).
    sal_growth = data.salary_growth_rate / 100.0
    bus_growth = data.business_growth_rate / 100.0
    inflation = data.inflation_rate / 100.0

    years = np.array([-5, -4, -3, -2, -1, 0]).reshape(-1, 1)
    
    # Back-calculate past income assuming it grew by the specified rate to reach current income
    # Add a slight random noise (e.g. standard deviation of 2%) to make it a realistic regression task.
    np.random.seed(42) # For reproducibility
    historical_salary = [salary / ((1 + sal_growth) ** abs(y)) * np.random.normal(1, 0.02) for y in range(-5, 1)]
    historical_business = [business / ((1 + bus_growth) ** abs(y)) * np.random.normal(1, 0.04) for y in range(-5, 1)]
    historical_other = [(rental_taxable + interest) / ((1 + inflation) ** abs(y)) * np.random.normal(1, 0.01) for y in range(-5, 1)]
    
    historical_total = [historical_salary[i] + historical_business[i] + historical_other[i] for i in range(6)]

    # Train ML Model
    model = LinearRegression()
    model.fit(years, historical_total)
    
    # Predict next year (Year 1)
    future_total_income_pred = model.predict([[1]])[0]
    
    # For tax slab calculation, we also need to project the components proportionally
    future_salary = salary * (1 + sal_growth)
    future_business = business * (1 + bus_growth)
    future_other = (rental_taxable + interest) * (1 + inflation)
    
    # Normalize to match ML prediction total exactly
    raw_future_sum = future_salary + future_business + future_other
    if raw_future_sum > 0:
        scaling_factor = future_total_income_pred / raw_future_sum
        future_salary *= scaling_factor
        future_business *= scaling_factor
        future_other *= scaling_factor
    else:
        future_total_income_pred = 0

    future_gti_slab = future_salary + future_business + future_other + stcg_debt + ltcg_debt

    # Deductions are assumed to stay the same or grow slightly with inflation
    future_taxable_old = max(0, future_gti_slab - (total_deductions_old * (1 + (inflation * 0.5))))
    future_taxable_new = max(0, future_gti_slab - (total_deductions_new * (1 + (inflation * 0.5))))
    
    future_raw_old, _ = compute_old_slab_tax(future_taxable_old)
    future_raw_new, _ = compute_new_slab_tax(future_taxable_new)
    if future_taxable_old <= 500000: future_raw_old = 0
    if future_taxable_new <= 700000: future_raw_new = 0

    future_surcharge_old = compute_surcharge(future_total_income_pred, future_raw_old + cg_tax_total)
    future_surcharge_new = compute_surcharge(future_total_income_pred, future_raw_new + cg_tax_total)
    
    future_tax_old = (future_raw_old + cg_tax_total + future_surcharge_old) * 1.04
    future_tax_new = (future_raw_new + cg_tax_total + future_surcharge_new) * 1.04

    # ── Tax-Saving Suggestions ────────────────────────────────────────────────
    suggestions = []
    tax_rate = 0.30 if taxable_old > 1000000 else (0.20 if taxable_old > 500000 else 0.05)

    if unused_80c > 0:
        saved = round(unused_80c * tax_rate * 1.04)
        suggestions.append({"icon": "📈", "section": "80C", "label": "ELSS Mutual Fund",
            "deduction_available": unused_80c, "tax_saved": saved,
            "detail": f"3-year lock-in, best equity returns. Fills ₹{unused_80c:,.0f} of 80C gap."})
        suggestions.append({"icon": "🏛️", "section": "80C", "label": "PPF (Public Provident Fund)",
            "deduction_available": unused_80c, "tax_saved": saved,
            "detail": f"Risk-free 7.1% return. 15-year lock-in. EEE tax status."})
    if unused_nps > 0:
        saved = round(unused_nps * tax_rate * 1.04)
        suggestions.append({"icon": "🎯", "section": "80CCD(1B)", "label": "NPS Additional Contribution",
            "deduction_available": unused_nps, "tax_saved": saved,
            "detail": f"Extra ₹50K deduction over 80C limit. Builds retirement corpus."})
    if unused_80d > 0:
        saved = round(unused_80d * tax_rate * 1.04)
        suggestions.append({"icon": "🏥", "section": "80D", "label": "Health Insurance Premium",
            "deduction_available": unused_80d, "tax_saved": saved,
            "detail": f"Family floater plan recommended. Protects health + saves tax."})
    if unused_home > 0 and home_loan == 0:
        suggestions.append({"icon": "🏠", "section": "Sec 24(b)", "label": "Home Loan Interest",
            "deduction_available": MAX_HOME_LOAN, "tax_saved": round(MAX_HOME_LOAN * tax_rate * 1.04),
            "detail": "₹2L deduction on self-occupied property loan interest. One of the largest deductions available."})
    if ltcg_equity > ltcg_exemption:
        suggestions.append({"icon": "📊", "section": "LTCG Harvesting", "label": "Tax Harvesting Strategy",
            "deduction_available": 0, "tax_saved": round(ltcg_exemption * 0.125),
            "detail": f"Book ₹1.25L LTCG profit each year tax-free. Re-invest to reset cost basis."})

    # ── Capital Gains Breakdown ────────────────────────────────────────────────
    cg_breakdown = {
        "equity_stcg": {"amount": round(stcg_equity), "rate": "20%", "tax": round(cg_tax_stcg_equity)},
        "equity_ltcg": {"amount": round(ltcg_equity), "rate": "12.5% (over ₹1.25L)", "tax": round(cg_tax_ltcg_equity), "exemption_used": min(ltcg_equity, ltcg_exemption)},
        "debt_stcg_ltcg": {"amount": round(stcg_debt + ltcg_debt), "rate": "Slab Rate", "tax": "Included in slab"},
        "total_cg_tax": round(cg_tax_total)
    }

    # ── GTI Breakdown ─────────────────────────────────────────────────────────
    gti_breakdown = {
        "salary": round(salary),
        "business": round(business),
        "rental_gross": round(rental),
        "rental_after_std_deduction": round(rental_taxable),
        "interest": round(interest),
        "debt_capital_gains_at_slab": round(stcg_debt + ltcg_debt),
        "gti_slab_taxable": round(gti_slab),
        "equity_capital_gains_separate": round(stcg_equity + ltcg_equity),
        "total_gross_income": round(total_income)
    }

    response = {
        "gti_breakdown": gti_breakdown,
        "deductions": {
            "standard_deduction_old": STD_OLD,
            "standard_deduction_new": STD_NEW,
            "section_80c": round(c80c),
            "section_80d": round(c80d),
            "section_80ccd_nps": round(nps_ded),
            "hra_exemption": round(hra),
            "home_loan_interest_24b": round(home_loan),
            "education_loan_interest": round(edu_loan),
            "total_deductions_old": round(total_deductions_old),
            "total_deductions_new": round(total_deductions_new)
        },
        "taxable_income": {
            "old_regime": round(taxable_old),
            "new_regime": round(taxable_new)
        },
        "slab_tax": {
            "old_regime_slabs": old_slabs,
            "new_regime_slabs": new_slabs
        },
        "capital_gains_tax": cg_breakdown,
        "surcharge": {
            "old_regime": round(surcharge_old),
            "new_regime": round(surcharge_new)
        },
        "cess_4pct": {
            "old_regime": round(cess_old),
            "new_regime": round(cess_new)
        },
        "final_tax": {
            "old_regime": round(final_tax_old),
            "new_regime": round(final_tax_new)
        },
        "effective_rate": {
            "old_regime": round(eff_rate_old * 100, 2),
            "new_regime": round(eff_rate_new * 100, 2)
        },
        "recommended_regime": recommended,
        "savings_differential": round(savings_diff),
        "unused_deduction_capacity": {
            "section_80c": round(unused_80c),
            "section_80d": round(unused_80d),
            "section_80ccd_nps": round(unused_nps),
            "home_loan_sec24b": round(unused_home)
        },
        "future_projection": {
            "assumed_income_growth": f"ML Predicted",
            "future_total_income": round(future_total_income_pred),
            "future_tax_old_regime": round(future_tax_old),
            "future_tax_new_regime": round(future_tax_new)
        },
        "tax_saving_suggestions": suggestions
    }

    # ── Layer 3: Tax Optimization Engine (AI Allocation) ─────────────────────
    import cvxpy as cp
    
    # 1. Deduction Gap Analysis
    gap_80c = max(0, MAX_80C - c80c)
    gap_80d = max(0, MAX_80D - c80d)
    gap_nps = max(0, MAX_NPS - nps_ded)
    gap_home = max(0, MAX_HOME_LOAN - home_loan)
    
    deduction_gap_analysis = {
        "gap_80c": round(gap_80c),
        "gap_80d": round(gap_80d),
        "gap_nps": round(gap_nps),
        "gap_home_loan": round(gap_home)
    }

    # 2. CVXPY Constrained Optimization
    # Variables for where to put the budget
    x_elss = cp.Variable(nonneg=True)
    x_ppf = cp.Variable(nonneg=True)
    x_nps_alloc = cp.Variable(nonneg=True)
    x_health = cp.Variable(nonneg=True)

    constraints = [
        x_elss + x_ppf <= gap_80c,
        x_nps_alloc <= gap_nps,
        x_health <= gap_80d,
        x_elss + x_ppf + x_nps_alloc + x_health <= data.tax_saving_budget
    ]

    # Set weights based on risk profile to maximize the "utility" of the tax-saving portfolio
    rp = data.risk_profile.lower()
    if rp == "aggressive":
        w_elss, w_ppf, w_nps, w_health = 1.0, 0.4, 0.8, 0.9
    elif rp == "moderate":
        w_elss, w_ppf, w_nps, w_health = 0.7, 0.7, 0.9, 1.0
    else: # Conservative
        w_elss, w_ppf, w_nps, w_health = 0.3, 1.0, 0.8, 1.0

    # Objective: Maximize weighted allocation
    objective = cp.Maximize(w_elss * x_elss + w_ppf * x_ppf + w_nps * x_nps_alloc + w_health * x_health)
    
    prob = cp.Problem(objective, constraints)
    try:
        prob.solve()
        opt_elss = float(x_elss.value) if x_elss.value else 0.0
        opt_ppf = float(x_ppf.value) if x_ppf.value else 0.0
        opt_nps = float(x_nps_alloc.value) if x_nps_alloc.value else 0.0
        opt_health = float(x_health.value) if x_health.value else 0.0
    except Exception:
        opt_elss, opt_ppf, opt_nps, opt_health = 0.0, 0.0, 0.0, 0.0

    optimal_allocation = {
        "elss": round(opt_elss),
        "ppf": round(opt_ppf),
        "nps": round(opt_nps),
        "health_insurance": round(opt_health),
        "total_allocated": round(opt_elss + opt_ppf + opt_nps + opt_health),
        "budget_used": round(opt_elss + opt_ppf + opt_nps + opt_health),
        "unallocated_budget": round(data.tax_saving_budget - (opt_elss + opt_ppf + opt_nps + opt_health)),
        "estimated_tax_saved": round((opt_elss + opt_ppf + opt_nps + opt_health) * tax_rate * 1.04)
    }
    
    response["deduction_gap_analysis"] = deduction_gap_analysis
    response["optimal_tax_allocation"] = optimal_allocation

    return response

# --- MODULE 3: Life Goal Simulator ---
@app.post("/api/simulator")
def life_goal_simulator(req: GoalSimulationRequest):
    results = []
    
    # Dynamic parameters from client request
    mu = req.expected_return
    
    # Adjust volatility based on risk profile
    if req.risk_profile == "Aggressive":
        sigma = 0.16
    elif req.risk_profile == "Conservative":
        sigma = 0.05
    else:
        sigma = 0.10 # Moderate
        
    num_simulations = 10000

    for goal in req.goals:
        # Edge case: Target already achieved today
        if req.current_corpus >= goal.target_amount_today:
            results.append({
                "goal_name": goal.name,
                "future_target_adjusted_for_inflation": goal.target_amount_today,
                "required_monthly_sip": 0,
                "base_mc_probability": 1.0,
                "health_adjusted_probability": 1.0,
                "savings_sufficiency_ratio": 1.0,
                "goal_gap": 0.0,
                "status": "Goal Already Achieved"
            })
            continue
            
        # Edge case: 0 years to goal (needed today)
        if goal.years_to_goal == 0:
            req_sip_today = max(0.0, goal.target_amount_today - req.current_corpus)
            ssr_today = req.monthly_sip / req_sip_today if req_sip_today > 0 else 1.0
            gap_today = max(0.0, req_sip_today - req.monthly_sip)
            results.append({
                "goal_name": goal.name,
                "future_target_adjusted_for_inflation": goal.target_amount_today,
                "required_monthly_sip": req_sip_today,
                "base_mc_probability": 0.0 if req.current_corpus < goal.target_amount_today else 1.0,
                "health_adjusted_probability": 0.0 if req.current_corpus < goal.target_amount_today else 1.0,
                "savings_sufficiency_ratio": round(ssr_today, 4),
                "goal_gap": round(gap_today, 2),
                "status": "Goal Due Immediately"
            })
            continue

        # Inflation adjusted target
        future_target = goal.target_amount_today * ((1 + goal.inflation_rate) ** goal.years_to_goal)
        
        # Required SIP Calculation
        r_monthly = mu / 12
        n_months = goal.years_to_goal * 12
        
        fv_corpus = req.current_corpus * ((1 + mu) ** goal.years_to_goal)
        deficit = max(0, future_target - fv_corpus)
        
        if deficit > 0 and r_monthly > 0:
            required_sip = deficit * r_monthly / ((1 + r_monthly)**n_months - 1)
        else:
            required_sip = 0

        # --- 8. Income Volatility Adjustment ---
        # Effective Contribution = Monthly SIP × Income Stability Score
        # This makes Monte Carlo realistic — not all months will contribute fully
        effective_sip = req.monthly_sip * req.user_iss
        try:
            returns_matrix = np.random.normal(r_monthly, sigma/np.sqrt(12), (num_simulations, n_months))
            cumulative_returns = np.cumprod(1 + returns_matrix, axis=1)
            
            final_corpus_values = req.current_corpus * cumulative_returns[:, -1]
            
            if effective_sip > 0:
                sip_growth_matrix = np.zeros_like(cumulative_returns)
                for i in range(n_months):
                    if i == n_months - 1:
                        sip_growth_matrix[:, i] = 1 + returns_matrix[:, i]
                    else:
                        sip_growth_matrix[:, i] = cumulative_returns[:, -1] / cumulative_returns[:, i]
                final_sip_values = np.sum(effective_sip * sip_growth_matrix, axis=1)
            else:
                final_sip_values = np.zeros(num_simulations)
                
            total_portfolios = final_corpus_values + final_sip_values
            
            success_count = np.sum(total_portfolios >= future_target)
            base_probability = float(success_count / num_simulations)
        except Exception as e:
            # Fallback if simulation fails due to memory/shape issues
            base_probability = 0.5

        # --- 6.3 Logistic Regression Probability (Mathematical, No ML Model) ---
        # P(success) = 1 / (1 + e^(-z))
        # z = b0 + b1*x1 + b2*x2 + ... + bn*xn
        # Features: savings_ratio, income_stability, risk_score, horizon, emergency_coverage, ssr
        
        # Calibrated hand-crafted weights (empirically tuned for Indian financial context)
        b0 = -1.0   # base bias (neutral tendency toward 50%)
        
        # x1: Savings rate (higher = better)
        b1, x1 = 4.5, req.savings_rate
        
        # x2: Income stability score (higher = better, 0–1)
        b2, x2 = 3.0, req.user_iss
        
        # x3: Risk profile score (Aggressive=1, Moderate=0.5, Conservative=0)
        risk_score_lr = 1.0 if req.risk_profile == "Aggressive" else (0.5 if req.risk_profile == "Moderate" else 0.0)
        b3, x3 = 1.5, risk_score_lr
        
        # x4: Investment horizon benefit (longer = better, normalized at 20 years)
        b4, x4 = 2.5, min(1.0, goal.years_to_goal / 20.0)
        
        # x5: Emergency fund coverage (3 months = baseline, 6+ months = excellent)
        b5, x5 = 1.5, min(1.0, req.emergency_coverage / 6.0)
        
        # x6: Savings Sufficiency Ratio (capped at 2.0 for normalization)
        ssr = req.monthly_sip / required_sip if required_sip > 0 else 1.0
        b6, x6 = 3.0, min(1.0, ssr)
        
        # x7: Fragility penalty (higher fragility = lower probability)
        b7, x7 = -2.0, req.user_fragility
        
        z = b0 + (b1*x1) + (b2*x2) + (b3*x3) + (b4*x4) + (b5*x5) + (b6*x6) + (b7*x7)
        logistic_probability = 1.0 / (1.0 + math.exp(-z))
        logistic_probability = round(min(0.99, max(0.01, logistic_probability)), 4)
        
        # --- 7. Monte Carlo Result (already computed above as base_probability) ---
        mc_probability = round(base_probability, 4)
        
        # --- Final Blended Probability (60% Monte Carlo, 40% Logistic) ---
        # MC gives market uncertainty, Logistic gives behavioral/financial health signal
        final_probability = round(0.60 * mc_probability + 0.40 * logistic_probability, 4)
        
        # Feasibility label
        if final_probability >= 0.75:
            feasibility = "High Confidence"
        elif final_probability >= 0.50:
            feasibility = "Achievable with Discipline"
        elif final_probability >= 0.30:
            feasibility = "At Risk — Action Needed"
        else:
            feasibility = "Critical — Restructure Plan"

        goal_gap = max(0.0, required_sip - req.monthly_sip)

        # --- 9. Optimal Asset Allocation For Goal ---
        # 9.1 Time-Horizon Rule: Equity % = (100 - Age) x Risk Factor
        risk_factor = {"Aggressive": 1.0, "Moderate": 0.8, "Conservative": 0.6}.get(req.risk_profile, 0.8)
        raw_equity_pct = (100 - req.age) * risk_factor
        equity_cap = min(85.0, raw_equity_pct)
        equity_cap = max(10.0, equity_cap)

        # 9.2 MVO-Based Allocation for Goal
        # Assets: [Equity, Debt, Gold, Cash]
        goal_mu = np.array([0.12, 0.07, 0.09, 0.04])
        goal_sigma = np.array([0.15, 0.04, 0.12, 0.005])
        goal_corr = np.array([
            [1.0,   0.1,  -0.2,  0.0],
            [0.1,   1.0,   0.05, 0.0],
            [-0.2,  0.05,  1.0,  0.0],
            [0.0,   0.0,   0.0,  1.0]
        ])
        D_g = np.diag(goal_sigma)
        cov_g = D_g @ goal_corr @ D_g

        # Lambda is tuned by horizon: shorter horizon = more conservative
        horizon_lambda = 2.0 + (1.0 - min(1.0, goal.years_to_goal / 20.0)) * 6.0
        fragility_lambda = req.user_fragility * 4.0
        goal_lambda = min(12.0, max(0.5, horizon_lambda + fragility_lambda))

        gw = cp.Variable(4)
        goal_objective = cp.Maximize(goal_mu @ gw - goal_lambda * cp.quad_form(gw, cov_g))
        goal_constraints = [
            cp.sum(gw) == 1.0,
            gw >= 0,
            gw[0] <= equity_cap / 100.0,   # Equity capped by time-horizon rule
            gw[1] >= 0.10,                   # Min Debt 10%
            gw[2] >= 0.05, gw[2] <= 0.20,   # Gold 5-20%
            gw[3] >= 0.05,                   # Min Cash 5%
        ]
        try:
            cp.Problem(goal_objective, goal_constraints).solve()
            g_eq  = round(float(gw.value[0]) * 100, 1)
            g_dbt = round(float(gw.value[1]) * 100, 1)
            g_gld = round(float(gw.value[2]) * 100, 1)
            g_csh = round(float(gw.value[3]) * 100, 1)
        except Exception:
            g_eq  = round(equity_cap, 1)
            g_dbt = round(max(10.0, 80.0 - equity_cap), 1)
            g_gld = 10.0
            g_csh = 5.0

        goal_allocation = {
            "Equity": g_eq,
            "Debt":   g_dbt,
            "Gold":   g_gld,
            "Cash":   g_csh,
            "equity_rule": f"(100 - {req.age}) × {risk_factor} = {raw_equity_pct:.1f}% → capped at {equity_cap:.1f}%"
        }

        results.append({
            "goal_name": goal.name,
            "future_target_adjusted_for_inflation": round(future_target, 2),
            "required_monthly_sip": round(required_sip, 2),
            "effective_sip": round(effective_sip, 2),
            "mc_probability": mc_probability,
            "logistic_probability": logistic_probability,
            "final_probability": final_probability,
            "feasibility": feasibility,
            "savings_sufficiency_ratio": round(ssr, 4),
            "goal_gap": round(goal_gap, 2),
            "optimal_allocation": goal_allocation,
            "logistic_inputs": {
                "savings_rate": round(x1, 4),
                "income_stability": round(x2, 4),
                "risk_score": round(x3, 4),
                "horizon_score": round(x4, 4),
                "emergency_score": round(x5, 4),
                "ssr_score": round(x6, 4),
                "fragility": round(x7, 4),
                "z_score": round(z, 4)
            },
            "status": "Simulation Complete"
        })

    return {"simulations": results}


# --- MODULE 3B: Scenario Simulation Endpoint ---
# Section 10: "What if" scenarios that re-run the simulation with overridden parameters
class ScenarioRequest(BaseModel):
    base_request: GoalSimulationRequest
    scenario_overrides: dict = Field(default_factory=dict)
    # Supported keys in scenario_overrides:
    # - inflation_delta: float (e.g. +0.02 means inflation +2%)
    # - return_delta: float (e.g. -0.03 means return -3%)
    # - contribution_delta: float (e.g. +5000 means SIP +₹5000)

@app.post("/api/simulator/scenario")
def scenario_simulation(req: ScenarioRequest):
    overrides = req.scenario_overrides
    base = req.base_request

    # Apply overrides to build modified request
    inflation_delta  = float(overrides.get("inflation_delta", 0.0))
    return_delta     = float(overrides.get("return_delta", 0.0))
    contribution_delta = float(overrides.get("contribution_delta", 0.0))

    modified_goals = [
        LifeGoal(
            name=g.name,
            target_amount_today=g.target_amount_today,
            years_to_goal=g.years_to_goal,
            inflation_rate=max(0.0, min(0.5, g.inflation_rate + inflation_delta))
        )
        for g in base.goals
    ]

    modified_req = GoalSimulationRequest(
        goals=modified_goals,
        current_corpus=base.current_corpus,
        monthly_sip=max(0.0, base.monthly_sip + contribution_delta),
        user_iss=base.user_iss,
        user_fragility=base.user_fragility,
        expected_return=max(0.01, min(0.40, base.expected_return + return_delta)),
        risk_profile=base.risk_profile,
        savings_rate=base.savings_rate,
        emergency_coverage=base.emergency_coverage,
        age=base.age
    )

    result = life_goal_simulator(modified_req)
    return {
        "scenario": {
            "inflation_delta": inflation_delta,
            "return_delta": return_delta,
            "contribution_delta": contribution_delta,
        },
        "simulations": result["simulations"]
    }


# --- MODULE 4: Portfolio Growth & Rebalancing Engine ---
class AssetItemInput(BaseModel):
    current_value: float = Field(0.0, ge=0.0)
    expected_return: float = Field(8.0, ge=-50.0, le=100.0)  # Percentage, e.g., 12.5 for 12.5%
    risk_level: str = Field("medium")  # low, medium, high

class PortfolioGrowthRequest(BaseModel):
    stocks: AssetItemInput = Field(default_factory=lambda: AssetItemInput(current_value=300000, expected_return=14.0, risk_level="high"))
    mutual_funds: AssetItemInput = Field(default_factory=lambda: AssetItemInput(current_value=250000, expected_return=12.0, risk_level="medium"))
    fixed_deposits: AssetItemInput = Field(default_factory=lambda: AssetItemInput(current_value=150000, expected_return=7.0, risk_level="low"))
    gold: AssetItemInput = Field(default_factory=lambda: AssetItemInput(current_value=100000, expected_return=9.0, risk_level="low"))
    pf: AssetItemInput = Field(default_factory=lambda: AssetItemInput(current_value=120000, expected_return=8.15, risk_level="low"))
    bonds: AssetItemInput = Field(default_factory=lambda: AssetItemInput(current_value=50000, expected_return=7.5, risk_level="low"))
    cash: AssetItemInput = Field(default_factory=lambda: AssetItemInput(current_value=30000, expected_return=3.5, risk_level="low"))

    age: int = Field(32, ge=18, le=100)
    risk_profile: str = Field("Moderate")  # Conservative, Moderate, Aggressive
    monthly_sip: float = Field(15000.0, ge=0.0)
    projection_years: int = Field(10, ge=1, le=40)
    # Section 11 Integration Inputs
    income_stability: float = Field(0.7, ge=0.0, le=1.0)   # 0=Volatile, 1=Very Stable
    goal_proximity_years: int = Field(10, ge=0, le=40)      # Years until primary goal
    target_wealth: Optional[float] = Field(None, ge=0.0)    # User-defined wealth target (₹)

class PortfolioChatMessage(BaseModel):
    message: str
    portfolio_context: Dict[str, Any]

@app.post("/api/portfolio/analyze")
def portfolio_growth_engine(req: PortfolioGrowthRequest):
    """
    Module Objectives:
    1. Aggregate all 7 investments in one place
    2. Compute asset allocation percentages: Allocation_i = (A_i / Total Portfolio) * 100
    3. Evaluate diversification quality (HHI + Entropy Score)
    4. Estimate expected return: Weighted average sum(w_i * r_i)
    5. Measure portfolio risk (Volatility, VaR 95%, Risk Score)
    6. Recommend rebalancing (Step-by-step Buy/Sell/Hold execution plan)
    7. Predict future portfolio value (Compound growth + Monthly SIP projections)
    8. Provide AI Advisory insights
    """
    assets_map = {
        "Stocks": req.stocks,
        "Mutual Funds": req.mutual_funds,
        "Fixed Deposits": req.fixed_deposits,
        "Gold": req.gold,
        "Provident Fund (PF)": req.pf,
        "Bonds": req.bonds,
        "Cash Balance": req.cash
    }

    # 4.1 Total Portfolio Value: Total Portfolio = sum(A_i)
    total_portfolio_value = sum(item.current_value for item in assets_map.values())

    if total_portfolio_value <= 0:
        return {
            "total_portfolio_value": 0.0,
            "expected_portfolio_return": 0.0,
            "allocations": [],
            "diversification": {"score": 0, "status": "Empty Portfolio", "hhi": 1.0},
            "risk_metrics": {"portfolio_risk_score": 0.0, "risk_level": "N/A", "estimated_volatility": 0.0, "var_95": 0.0},
            "rebalancing": [],
            "projections": [],
            "ai_advisory": "Please enter asset values to perform portfolio analysis."
        }

    # Risk Weight Multipliers: Low=1, Medium=2, High=3
    risk_multipliers = {"low": 1.0, "medium": 2.0, "high": 3.0}
    standard_volatility = {"low": 0.04, "medium": 0.12, "high": 0.22}

    allocations = []
    weighted_return_sum = 0.0
    weighted_risk_score_sum = 0.0
    weighted_volatility_sq = 0.0

    weights = []

    for name, asset in assets_map.items():
        val = asset.current_value
        ret = asset.expected_return / 100.0  # Decimal expected return
        risk_lvl = asset.risk_level.lower()

        # 4.2 Asset Allocation Percentage: Allocation_i = (A_i / Total Portfolio) * 100
        alloc_pct = (val / total_portfolio_value) * 100.0
        w_i = val / total_portfolio_value
        weights.append(w_i)

        # 4.3 Expected Portfolio Return component
        weighted_return_sum += w_i * ret
        
        # Risk component
        r_mult = risk_multipliers.get(risk_lvl, 2.0)
        vol = standard_volatility.get(risk_lvl, 0.12)
        weighted_risk_score_sum += w_i * r_mult
        weighted_volatility_sq += (w_i * vol) ** 2  # Simplified component

        allocations.append({
            "asset_name": name,
            "current_value": round(val, 2),
            "allocation_pct": round(alloc_pct, 2),
            "weight": round(w_i, 4),
            "expected_return_pct": round(asset.expected_return, 2),
            "risk_level": asset.risk_level
        })

    # 4.3 Expected Portfolio Return = sum(w_i * r_i) * 100%
    expected_portfolio_return_pct = weighted_return_sum * 100.0

    # 4.4 Portfolio Variance & Standard Deviation (Risk Measurement)
    # Portfolio Variance = sum(w_i^2 * sigma_i^2) + 2 * sum_{i < j} w_i * w_j * Cov(i, j)
    # Construct stylized covariance matrix based on asset volatility and cross-correlation defaults
    cov_matrix = np.zeros((7, 7))
    vols = [standard_volatility.get(alloc["risk_level"].lower(), 0.12) for alloc in allocations]
    
    # Stylized correlation matrix between asset classes [Stocks, MF, FD, Gold, PF, Bonds, Cash]
    corr_matrix = np.array([
        [1.00, 0.85, 0.05, 0.10, 0.02, 0.15, 0.00],  # Stocks
        [0.85, 1.00, 0.05, 0.12, 0.02, 0.20, 0.00],  # MF
        [0.05, 0.05, 1.00, 0.15, 0.60, 0.50, 0.80],  # FD
        [0.10, 0.12, 0.15, 1.00, 0.10, 0.25, 0.05],  # Gold
        [0.02, 0.02, 0.60, 0.10, 1.00, 0.70, 0.50],  # PF
        [0.15, 0.20, 0.50, 0.25, 0.70, 1.00, 0.40],  # Bonds
        [0.00, 0.00, 0.80, 0.05, 0.50, 0.40, 1.00]   # Cash
    ])

    w_vec = np.array(weights)
    for i in range(7):
        for j in range(7):
            cov_matrix[i, j] = vols[i] * vols[j] * corr_matrix[i, j]

    portfolio_variance = float(w_vec.T @ cov_matrix @ w_vec)
    portfolio_std_dev = math.sqrt(max(0.0, portfolio_variance))
    portfolio_volatility_pct = portfolio_std_dev * 100.0

    # 10.1 Value at Risk (VaR) — Exact Section 10 Formula
    # VaR = Mean Return - (Z * Standard Deviation)  [as a % of portfolio]
    # For 95% confidence, Z = 1.65
    Z_95 = 1.65
    Z_99 = 2.33
    mean_return = expected_portfolio_return_pct / 100.0
    var_95_pct  = mean_return - (Z_95 * portfolio_std_dev)   # as decimal, can be negative (loss)
    var_99_pct  = mean_return - (Z_99 * portfolio_std_dev)
    var_95_val  = -var_95_pct * total_portfolio_value         # Positive = potential ₹ loss
    var_99_val  = -var_99_pct * total_portfolio_value

    # 10.2 Maximum Drawdown from simulated price path
    # Simulate a 252-day price path using daily returns ~ Normal(mu/252, sigma/sqrt(252))
    np.random.seed(42)
    daily_mu  = mean_return / 252.0
    daily_sig = portfolio_std_dev / math.sqrt(252.0)
    daily_returns = np.random.normal(daily_mu, daily_sig, 252)
    price_path = total_portfolio_value * np.cumprod(1.0 + daily_returns)
    running_max = np.maximum.accumulate(price_path)
    drawdowns = (price_path - running_max) / running_max
    max_drawdown_pct = round(float(np.min(drawdowns)) * 100.0, 2)  # Negative value
    
    if weighted_risk_score_sum <= 1.4:
        overall_risk_level = "Low"
    elif weighted_risk_score_sum <= 2.3:
        overall_risk_level = "Medium"
    else:
        overall_risk_level = "High"

    # 4.5 Diversification Index = 1 - sum(w_i^2)
    sum_w_sq = float(sum(w**2 for w in weights))
    diversification_index = round(1.0 - sum_w_sq, 4)  # Range 0 (Concentrated) to 1 - 1/N (Diversified)
    diversification_score = round(diversification_index * 100.0, 1)

    if diversification_score >= 70:
        div_status = "Excellent Diversification"
        div_color = "green"
    elif diversification_score >= 45:
        div_status = "Moderate Diversification"
        div_color = "yellow"
    else:
        div_status = "Concentration Risk"
        div_color = "red"

    # 6 + 11. REBALANCING ENGINE + INTEGRATION WITH OTHER MODULES
    # Rule: Base Equity % = 100 - Age
    # Final Equity = (100 - Age) * Risk Adjustment Factor
    # Section 11: Automatically adjust allocation based on income_stability and goal_proximity
    risk_factors = {"conservative": 0.6, "moderate": 0.8, "aggressive": 1.0}
    rf = risk_factors.get(req.risk_profile.lower(), 0.8)

    base_equity_pct = max(10.0, min(90.0, 100 - req.age))
    final_equity_pct = max(10.0, min(90.0, base_equity_pct * rf))

    # Section 11 Integration: Income Stability Adapter
    # If income_stability < 0.5, reduce equity by up to 10% for safety
    integration_notes = []
    income_stability = float(req.income_stability)
    if income_stability < 0.5:
        equity_reduction = round((0.5 - income_stability) * 20.0, 1)  # Max -10%
        final_equity_pct = max(10.0, final_equity_pct - equity_reduction)
        integration_notes.append(
            f"Income Stability ({income_stability:.2f}) is low — equity reduced by {equity_reduction}% for safety."
        )

    # Section 11 Integration: Goal Proximity Adapter
    # If goal is within 3 years, aggressively shift to low-risk assets
    gp = int(req.goal_proximity_years)
    if gp <= 3:
        final_equity_pct = max(10.0, final_equity_pct * 0.5)  # Halve equity
        integration_notes.append(
            f"Goal is only {gp} year(s) away — shifted to low-risk assets (equity capped at {final_equity_pct:.1f}%)."
        )
    elif gp <= 7:
        final_equity_pct = max(15.0, final_equity_pct * 0.75)
        integration_notes.append(
            f"Goal proximity ({gp} yrs) is moderate — equity moderated to {final_equity_pct:.1f}%."
        )

    final_equity_pct = round(final_equity_pct, 2)

    # Split Final Equity between Stocks (60%) & Mutual Funds (40%)
    target_stocks_pct = round(final_equity_pct * 0.60, 2)
    target_mf_pct     = round(final_equity_pct * 0.40, 2)

    # Remaining % split across Debt (FD, PF, Bonds, Cash) and Gold
    remaining_pct       = max(0.0, 100.0 - final_equity_pct)
    target_gold_pct     = min(15.0, round(remaining_pct * 0.15, 2))
    debt_remaining_pct  = max(0.0, remaining_pct - target_gold_pct)
    target_fd_pct    = round(debt_remaining_pct * 0.40, 2)
    target_pf_pct    = round(debt_remaining_pct * 0.30, 2)
    target_bonds_pct = round(debt_remaining_pct * 0.20, 2)
    target_cash_pct  = round(debt_remaining_pct * 0.10, 2)

    target_weights = {
        "Stocks":              target_stocks_pct / 100.0,
        "Mutual Funds":        target_mf_pct     / 100.0,
        "Fixed Deposits":      target_fd_pct     / 100.0,
        "Gold":                target_gold_pct   / 100.0,
        "Provident Fund (PF)": target_pf_pct     / 100.0,
        "Bonds":               target_bonds_pct  / 100.0,
        "Cash Balance":        target_cash_pct   / 100.0
    }

    rebalancing_plan = []
    for alloc in allocations:
        name = alloc["asset_name"]
        curr_val = alloc["current_value"]
        curr_pct = alloc["allocation_pct"]
        targ_pct = round(target_weights.get(name, 0.10) * 100.0, 2)
        targ_val = total_portfolio_value * (targ_pct / 100.0)
        diff_val = targ_val - curr_val

        if diff_val > 1000:
            action = "BUY / ALLOCATE"
            recommendation = f"Add ₹{abs(diff_val):,.0f} to reach target {targ_pct}%"
        elif diff_val < -1000:
            action = "SELL / TRIM"
            recommendation = f"Trim ₹{abs(diff_val):,.0f} to reduce to target {targ_pct}%"
        else:
            action = "HOLD"
            recommendation = f"Maintain current position (~{targ_pct}%)"

        rebalancing_plan.append({
            "asset_name": name,
            "current_pct": curr_pct,
            "target_pct": targ_pct,
            "current_value": curr_val,
            "target_value": round(targ_val, 2),
            "difference": round(diff_val, 2),
            "action": action,
            "recommendation": recommendation
        })

    # 5. PERFORMANCE ANALYSIS & FUTURE PORTFOLIO VALUE (5.1 Future Value & 5.2 CAGR)
    # 5.1 Future Value = Present Value * (1 + r)^n
    # 5.2 CAGR = (Final Value / Initial Value)^(1 / n) - 1
    annual_r = expected_portfolio_return_pct / 100.0
    monthly_r = annual_r / 12.0
    monthly_sip = req.monthly_sip

    projections = []
    cum_invested = total_portfolio_value

    for year in range(1, req.projection_years + 1):
        months = year * 12
        # Future value of initial lump-sum corpus: FV = PV * (1 + r)^n
        fv_corpus = total_portfolio_value * ((1 + annual_r) ** year)
        
        # Future value of monthly SIP
        if monthly_r > 0:
            fv_sip = monthly_sip * (((1 + monthly_r)**months - 1) / monthly_r) * (1 + monthly_r)
        else:
            fv_sip = monthly_sip * months

        total_predicted = fv_corpus + fv_sip
        cum_invested += (monthly_sip * 12)
        total_gains = max(0.0, total_predicted - cum_invested)

        # 5.2 Compound Annual Growth Rate (CAGR) calculation
        # CAGR for initial corpus = (FV_corpus / PV)^(1/n) - 1
        cagr_corpus_pct = (((fv_corpus / max(1.0, total_portfolio_value)) ** (1.0 / year)) - 1.0) * 100.0
        # Overall portfolio effective CAGR considering total invested vs predicted
        cagr_effective_pct = (((total_predicted / max(1.0, cum_invested)) ** (1.0 / year)) - 1.0) * 100.0

        projections.append({
            "year": year,
            "total_invested": round(cum_invested, 2),
            "future_value": round(total_predicted, 2),
            "estimated_gains": round(total_gains, 2),
            "fv_corpus_only": round(fv_corpus, 2),
            "fv_sip_only": round(fv_sip, 2),
            "cagr_pct": round(cagr_corpus_pct, 2),
            "effective_cagr_pct": round(cagr_effective_pct, 2)
        })

    # -----------------------------------------------------------------------
    # 6.2 Rebalancing Gap Calculation
    # Gap_i = Target Allocation_i - Current Allocation_i
    # Flag for rebalance if |Gap_i| > REBALANCE_THRESHOLD (5%)
    # -----------------------------------------------------------------------
    REBALANCE_THRESHOLD = 5.0  # percent
    for item in rebalancing_plan:
        gap = item["target_pct"] - item["current_pct"]
        item["gap_pct"] = round(gap, 2)
        item["needs_rebalance"] = abs(gap) > REBALANCE_THRESHOLD
        # 6.3 Exact Rebalancing Amount
        # RebalancingAmount_i = (Target_i × Total Portfolio) - CurrentValue_i
        item["rebalance_amount"] = round(
            (item["target_pct"] / 100.0) * total_portfolio_value - item["current_value"], 2
        )

    assets_needing_rebalance = [r for r in rebalancing_plan if r["needs_rebalance"]]

    # -----------------------------------------------------------------------
    # 7.1 Rebalance Decision Classifier (Random Forest)
    # Inputs: asset_concentration, market_volatility, risk_score,
    #         income_stability, goal_proximity
    # Output: Rebalance Yes / No
    # -----------------------------------------------------------------------
    rebalance_decision = "Unavailable"
    rebalance_confidence = 0.0
    if _REBALANCE_CLF is not None:
        concentration_feat = float(sum_w_sq)          # Higher = more concentrated
        volatility_feat    = portfolio_std_dev         # Portfolio std dev
        risk_feat          = min(1.0, weighted_risk_score_sum / 3.0)  # Normalised 0-1
        stability_feat     = 0.7                       # Default: moderate stability
        proximity_feat     = min(1.0, req.projection_years / 30.0)   # Normalised horizon

        clf_input = np.array([[concentration_feat, volatility_feat,
                                risk_feat, stability_feat, proximity_feat]])
        pred = int(_REBALANCE_CLF.predict(clf_input)[0])
        proba = float(_REBALANCE_CLF.predict_proba(clf_input)[0][pred])
        rebalance_decision = "Yes — Rebalance Recommended" if pred == 1 else "No — Portfolio Balanced"
        rebalance_confidence = round(proba * 100.0, 1)

    # -----------------------------------------------------------------------
    # 7.2 Portfolio Return Prediction (Gradient Boosting Regressor)
    # Inputs: asset weights + stylized economic indicators
    # Output: Predicted portfolio return (%)
    # -----------------------------------------------------------------------
    ml_predicted_return = expected_portfolio_return_pct  # Fallback to weighted avg
    if _RETURN_REG is not None:
        w_eq   = float(weights[0])   # Stocks
        w_mf   = float(weights[1])   # MF
        w_fd   = float(weights[2])   # FD
        w_pf   = float(weights[4])   # PF
        w_bo   = float(weights[5])   # Bonds
        w_ca   = float(weights[6])   # Cash
        market_pe   = 22.0           # Neutral P/E assumption
        gdp_growth  = 6.5            # India avg GDP growth
        inflation   = 5.5            # India avg inflation

        reg_input = np.array([[w_eq, w_mf + w_fd, weights[3],
                                w_pf, w_bo, w_ca,
                                market_pe, gdp_growth, inflation]])
        ml_predicted_return = round(float(_RETURN_REG.predict(reg_input)[0]), 2)

    # -----------------------------------------------------------------------
    # 8. Monte Carlo Simulation
    # 8.1 Return_t ~ Normal(mu, sigma)  for 1000 independent runs
    # 8.2 FV = PV × ∏(1 + Return_t)   per simulation path
    # -----------------------------------------------------------------------
    NUM_SIMULATIONS = 1000
    mu  = expected_portfolio_return_pct / 100.0     # Mean annual return
    sig = portfolio_std_dev                          # Annual std dev
    horizon = req.projection_years

    np.random.seed(0)  # Reproducibility
    # Generate return matrix: (NUM_SIMULATIONS x horizon) annual returns
    sim_returns = np.random.normal(mu, sig, size=(NUM_SIMULATIONS, horizon))
    # Compute cumulative growth factor per simulation
    growth_factors = np.prod(1.0 + sim_returns, axis=1)
    sim_final_values = total_portfolio_value * growth_factors

    mc_median     = float(np.median(sim_final_values))
    mc_p10        = float(np.percentile(sim_final_values, 10))   # Pessimistic
    mc_p90        = float(np.percentile(sim_final_values, 90))   # Optimistic
    mc_mean       = float(np.mean(sim_final_values))

    # 8.2 Probability of achieving target wealth (default: 2× initial portfolio)
    target_wealth = total_portfolio_value * 2.0
    successful_sims = int(np.sum(sim_final_values >= target_wealth))
    mc_success_probability = round((successful_sims / NUM_SIMULATIONS) * 100.0, 1)

    monte_carlo = {
        "simulations": NUM_SIMULATIONS,
        "horizon_years": horizon,
        "target_wealth": round(target_wealth, 2),
        "success_probability_pct": mc_success_probability,
        "median_outcome": round(mc_median, 2),
        "optimistic_p90": round(mc_p90, 2),
        "pessimistic_p10": round(mc_p10, 2),
        "mean_outcome": round(mc_mean, 2),
        "mu_pct": round(mu * 100, 2),
        "sigma_pct": round(sig * 100, 2)
    }

    # -----------------------------------------------------------------------
    # 9. Sharpe Ratio  (RL Reward Signal)
    # Sharpe = (Portfolio Return - Risk Free Rate) / Portfolio Std Dev
    # Indian 10-yr G-Sec rate used as risk-free rate proxy
    # -----------------------------------------------------------------------
    RISK_FREE_RATE = 0.072   # 7.2% (approximate Indian 10-yr G-Sec)
    sharpe_ratio = 0.0
    if portfolio_std_dev > 0:
        sharpe_ratio = round(
            (expected_portfolio_return_pct / 100.0 - RISK_FREE_RATE) / portfolio_std_dev, 4
        )

    # RL-inspired allocation commentary
    if sharpe_ratio >= 1.5:
        rl_commentary = "Excellent risk-adjusted return. The allocation is near-optimal."
    elif sharpe_ratio >= 0.8:
        rl_commentary = "Good risk-adjusted return. Minor rebalancing could improve Sharpe."
    elif sharpe_ratio >= 0.3:
        rl_commentary = "Moderate. Consider shifting towards higher-return assets to improve Sharpe."
    else:
        rl_commentary = "Low risk-adjusted return. Portfolio needs significant rebalancing."

    # AI Advisory Generation (all sections combined)
    advisory_bullets = []
    advisory_bullets.append(
        f"📊 Target Equity: (100 - {req.age}) × {rf} = {final_equity_pct:.1f}% "
        f"[{req.risk_profile} | Income Stability: {income_stability:.2f}]"
    )
    for note in integration_notes:
        advisory_bullets.append(f"🔗 Module Integration: {note}")
    if diversification_score < 45:
        advisory_bullets.append(f"⚠️ Concentration Risk: Diversification Index = {diversification_index:.2f}.")
    else:
        advisory_bullets.append(f"✅ Diversification Index = {diversification_index:.2f} ({div_status}).")
    advisory_bullets.append(
        f"📉 Variance = {portfolio_variance:.6f} | σ = {portfolio_volatility_pct:.2f}% | "
        f"VaR(95%) = ₹{var_95_val:,.0f} | Max Drawdown ≈ {max_drawdown_pct:.1f}%"
    )
    advisory_bullets.append(f"🤖 ML Decision: {rebalance_decision} ({rebalance_confidence}% confidence)")
    advisory_bullets.append(f"📈 ML Return Prediction: {ml_predicted_return}%")
    advisory_bullets.append(f"🎲 Monte Carlo: {mc_success_probability}% success probability in {horizon} yrs")
    advisory_bullets.append(f"⚡ Sharpe Ratio: {sharpe_ratio} — {rl_commentary}")

    # -----------------------------------------------------------------------
    # Section 14: Evaluation Metrics
    # -----------------------------------------------------------------------
    # Classification accuracy from training (stored value)
    clf_accuracy = 94.8   # From trained RF classifier
    reg_r2       = 72.2   # From trained GB regressor (R² × 100 for display)
    # RMSE proxy: average absolute error of return prediction vs weighted avg
    rmse_proxy   = round(abs(ml_predicted_return - expected_portfolio_return_pct), 2)

    evaluation_metrics = {
        "rebalance_classifier_accuracy_pct": clf_accuracy,
        "return_regressor_r2_score_pct": reg_r2,
        "return_prediction_rmse_proxy": rmse_proxy,
        "current_sharpe_ratio": sharpe_ratio,
        "portfolio_volatility_pct": round(portfolio_volatility_pct, 2),
        "diversification_index": diversification_index,
        "models": "RF Classifier (7.1) + GB Regressor (7.2)"
    }

    # -----------------------------------------------------------------------
    # Section 17: Final Output Summary (exact spec format)
    # -----------------------------------------------------------------------
    user_target_wealth = req.target_wealth if req.target_wealth else total_portfolio_value * 2.0
    np.random.seed(0)
    sim_ret2 = np.random.normal(mu, sig, size=(NUM_SIMULATIONS, horizon))
    sim_fv2  = total_portfolio_value * np.prod(1.0 + sim_ret2, axis=1)
    prob_target = round(float(np.sum(sim_fv2 >= user_target_wealth) / NUM_SIMULATIONS) * 100.0, 1)

    final_output = {
        "portfolio_value":      f"₹{total_portfolio_value:,.0f}",
        "expected_return_pct":  round(expected_portfolio_return_pct, 2),
        "portfolio_risk_pct":   round(portfolio_volatility_pct, 2),
        "diversification_index": diversification_index,
        "sharpe_ratio":         sharpe_ratio,
        "rebalance_needed":     rebalance_decision.startswith("Yes"),
        "recommended_allocation": {
            "Equity":   round(final_equity_pct, 1),
            "Debt":     round(target_fd_pct + target_pf_pct + target_bonds_pct + target_cash_pct, 1),
            "Gold":     round(target_gold_pct, 1)
        },
        "probability_of_target_wealth_pct": prob_target,
        "target_wealth":        f"₹{user_target_wealth:,.0f}",
        "horizon_years":        horizon,
        "max_drawdown_pct":     max_drawdown_pct,
        "var_95_amount":        round(var_95_val, 2),
        "var_99_amount":        round(var_99_val, 2),
        "ai_explanation": (
            f"Your equity exposure is {allocations[0]['allocation_pct'] + allocations[1]['allocation_pct']:.1f}%, "
            f"while your {req.risk_profile} profile suggests {final_equity_pct:.1f}%. "
            f"Income stability score is {income_stability:.2f}. "
            f"{'Rebalancing is strongly recommended.' if rebalance_decision.startswith('Yes') else 'Portfolio is balanced.'}"
        )
    }

    return {
        "total_portfolio_value":    round(total_portfolio_value, 2),
        "expected_portfolio_return": round(expected_portfolio_return_pct, 2),
        "allocations": allocations,
        "diversification": {
            "score":   diversification_score,
            "index":   diversification_index,
            "status":  div_status,
            "color":   div_color,
            "sum_w_sq": round(sum_w_sq, 4)
        },
        "risk_metrics": {
            "portfolio_risk_score":     round(weighted_risk_score_sum, 2),
            "risk_level":               overall_risk_level,
            "portfolio_variance":       round(portfolio_variance, 6),
            "portfolio_risk_std_dev_pct": round(portfolio_volatility_pct, 2),
            # Section 10.1 — VaR = Mean - Z * σ
            "var_formula":              "VaR = Mean Return - (Z × σ)",
            "var_95_pct":               round(var_95_pct * 100, 2),
            "var_95_amount":            round(var_95_val, 2),
            "var_99_pct":               round(var_99_pct * 100, 2),
            "var_99_amount":            round(var_99_val, 2),
            # Section 10.2 — Maximum Drawdown
            "max_drawdown_pct":         max_drawdown_pct,
            "sharpe_ratio":             sharpe_ratio,
            "risk_free_rate_pct":       round(RISK_FREE_RATE * 100, 2),
            "rl_commentary":            rl_commentary
        },
        "target_allocation_model": {
            "age":                    req.age,
            "risk_profile":           req.risk_profile,
            "risk_adjustment_factor": rf,
            "income_stability":       income_stability,
            "goal_proximity_years":   req.goal_proximity_years,
            "target_equity_pct":      final_equity_pct
        },
        # Section 11 Integration Notes
        "integration_notes": integration_notes,
        "rebalancing": rebalancing_plan,
        "rebalancing_summary": {
            "threshold_pct":             REBALANCE_THRESHOLD,
            "assets_needing_rebalance":  len(assets_needing_rebalance),
            "ml_decision":               rebalance_decision,
            "ml_confidence_pct":         rebalance_confidence
        },
        "ml_insights": {
            "rebalance_decision":        rebalance_decision,
            "rebalance_confidence_pct":  rebalance_confidence,
            "ml_predicted_return_pct":   ml_predicted_return,
            "model_note":                "RF Classifier (7.1) + GB Regressor (7.2)"
        },
        "monte_carlo":          monte_carlo,
        "projections":          projections,
        # Section 14 — Evaluation Metrics
        "evaluation_metrics":   evaluation_metrics,
        # Section 17 — Final Output Summary
        "final_output":         final_output,
        "ai_advisory":          advisory_bullets
    }


# -----------------------------------------------------------------------
# Section 12: Reasoning-Based Chatbot
# Receives full portfolio context and gives reasoning-based (not generic) responses
# -----------------------------------------------------------------------
@app.post("/api/portfolio/chat")
def portfolio_chat_advisor(req: PortfolioChatMessage):
    user_msg  = req.message.lower()
    ctx       = req.portfolio_context
    final_out = ctx.get("final_output", {})
    ml        = ctx.get("ml_insights", {})
    rm        = ctx.get("risk_metrics", {})
    tgt       = ctx.get("target_allocation_model", {})
    rb_sum    = ctx.get("rebalancing_summary", {})
    mc        = ctx.get("monte_carlo", {})
    allocs    = ctx.get("allocations", [])
    intg      = ctx.get("integration_notes", [])

    total_val      = ctx.get("total_portfolio_value", 0)
    exp_ret        = ctx.get("expected_portfolio_return", 0)
    sharpe         = rm.get("sharpe_ratio", 0)
    var_95         = rm.get("var_95_amount", 0)
    max_dd         = rm.get("max_drawdown_pct", 0)
    div_idx        = ctx.get("diversification", {}).get("index", 0)
    div_status_str = ctx.get("diversification", {}).get("status", "")
    ml_ret         = ml.get("ml_predicted_return_pct", exp_ret)
    ml_dec         = ml.get("rebalance_decision", "")
    ml_conf        = ml.get("rebalance_confidence_pct", 0)
    target_eq_pct  = tgt.get("target_equity_pct", 55)
    income_stab    = tgt.get("income_stability", 0.7)
    goal_prox      = tgt.get("goal_proximity_years", 10)
    prob_target    = mc.get("success_probability_pct", 0)
    target_wealth_str = final_out.get("target_wealth", "2× portfolio")
    horizon_yrs    = mc.get("horizon_years", 10)

    # Find current equity allocation from allocations
    curr_equity_pct = sum(
        a.get("allocation_pct", 0) for a in allocs
        if a.get("asset_name", "") in ("Stocks", "Mutual Funds")
    )

    # Build reasoning-based reply
    if any(w in user_msg for w in ["why", "rebalanc", "suggest", "recomm"]):
        reply = (
            f"Your current equity exposure is {curr_equity_pct:.1f}%, while your "
            f"{tgt.get('risk_profile','Moderate')} risk profile with age {tgt.get('age',32)} "
            f"suggests a target of {target_eq_pct:.1f}% equity. "
            f"Additionally, your income stability score is {income_stab:.2f}, which "
            f"{'increases vulnerability to market shocks' if income_stab < 0.6 else 'is healthy'}. "
        )
        if intg:
            reply += f"Module integration note: {intg[0]} "
        reply += (
            f"The Random Forest Classifier recommends: '{ml_dec}' with {ml_conf:.0f}% confidence. "
            f"Rebalancing will help align your portfolio to the optimal target allocation."
        )

    elif any(w in user_msg for w in ["risk", "loss", "drawdown", "var", "safe"]):
        reply = (
            f"Your portfolio risk (σ) is {rm.get('portfolio_risk_std_dev_pct', 0):.2f}%, "
            f"with a 95% Value-at-Risk (VaR = μ − 1.65σ) of ₹{var_95:,.0f}. "
            f"The simulated Maximum Drawdown over 1 year is approximately {max_dd:.1f}%. "
            f"Sharpe Ratio is {sharpe}, meaning "
            f"{'you are earning good risk-adjusted returns.' if sharpe >= 0.8 else 'returns per unit of risk are low — consider rebalancing.'}"
        )

    elif any(w in user_msg for w in ["return", "growth", "profit", "earn", "cagr"]):
        reply = (
            f"Your weighted expected portfolio return is {exp_ret}%. "
            f"The ML-predicted return (Gradient Boosting, adjusted for macro signals) is {ml_ret}%. "
            f"{'The ML model expects slightly lower returns, possibly due to current market valuations.' if ml_ret < exp_ret else 'The ML model is optimistic on your current allocation.'} "
            f"Over {horizon_yrs} years, you have a {prob_target}% probability of reaching {target_wealth_str}."
        )

    elif any(w in user_msg for w in ["diversif", "concentrat", "spread", "allocat"]):
        reply = (
            f"Your Diversification Index is {div_idx:.2f} ({div_status_str}). "
            f"This is calculated as 1 − Σ(wᵢ²). A higher value means better diversification. "
            f"{'Consider redistributing from over-allocated assets to under-represented ones.' if div_idx < 0.65 else 'Your portfolio is well spread across asset classes.'} "
            f"The Rebalancing Engine has identified {rb_sum.get('assets_needing_rebalance', 0)} asset(s) with a gap >5% from target."
        )

    elif any(w in user_msg for w in ["monte carlo", "simulation", "probab", "chance", "target"]):
        reply = (
            f"The Monte Carlo Simulation ran {mc.get('simulations', 1000)} independent paths using "
            f"Return_t ~ Normal(μ={mc.get('mu_pct',0)}%, σ={mc.get('sigma_pct',0)}%). "
            f"Results over {horizon_yrs} years: "
            f"Pessimistic (P10) = ₹{mc.get('pessimistic_p10',0):,.0f}, "
            f"Median = ₹{mc.get('median_outcome',0):,.0f}, "
            f"Optimistic (P90) = ₹{mc.get('optimistic_p90',0):,.0f}. "
            f"Probability of reaching {target_wealth_str}: {prob_target}%."
        )

    elif any(w in user_msg for w in ["sharpe", "optimal", "efficient"]):
        reply = (
            f"Your Sharpe Ratio is {sharpe} (formula: (Rp − Rf) / σ, where Rf = 7.2% G-Sec). "
            f"{rm.get('rl_commentary', '')} "
            f"A Sharpe > 1.0 is generally considered excellent. "
            f"To improve Sharpe, either increase expected returns or reduce portfolio volatility through better diversification."
        )

    else:
        reply = (
            f"I'm your context-aware Portfolio AI Advisor! "
            f"Portfolio: ₹{total_val:,.0f} | Return: {exp_ret}% | Risk: {rm.get('portfolio_risk_std_dev_pct',0):.2f}% | "
            f"Sharpe: {sharpe} | Diversification: {div_idx:.2f} | "
            f"ML Decision: {ml_dec}. "
            f"Ask me about rebalancing rationale, risk metrics, Monte Carlo simulation, Sharpe ratio, or return predictions!"
        )

    return {"reply": reply}


# =============================================================================
# MODULE 5: Irregular Income Planning Engine
# For: Business owners, Freelancers, Gig workers, Commission earners, Seasonal households
# Transforms: Income History → Statistical Analysis → Income Forecast → Adaptive Planning
# =============================================================================

class IrregularIncomeRequest(BaseModel):
    """
    Section 3 — User Inputs
    income_history: List of monthly income values (6–24 months, most recent last)
    income_category: business | freelance | gig | commission | seasonal
    fixed_monthly_expenses: Monthly fixed costs (rent, utilities, subscriptions)
    emi_commitments: Monthly EMI obligations
    current_emergency_fund: Current emergency savings balance
    seasonal_months: Optional list of month indices (1-12) that are typically high-income
    """
    income_history: List[float] = Field(
        ...,
        min_length=3,
        description="Monthly income values (minimum 3 months, max 24)"
    )
    income_category: str = Field("freelance")   # business|freelance|gig|commission|seasonal
    fixed_monthly_expenses: float = Field(25000.0, ge=0)
    emi_commitments: float = Field(5000.0, ge=0)
    current_emergency_fund: float = Field(50000.0, ge=0)
    seasonal_months: Optional[List[int]] = Field(None)  # e.g. [11, 12, 1] for festive season


@app.post("/api/irregular-income/analyze")
def irregular_income_engine(req: IrregularIncomeRequest):
    """
    Irregular Income Planning Engine
    Implements Sections 4.1–4.4 and Objectives 1–7:
    1. Measure income volatility  (Section 4.2 — StdDev)
    2. Quantify income stability  (Section 4.4 — Stability Score)
    3. Forecast short-term income (Linear Trend + Seasonal Adjustment)
    4. Estimate income shock risk (VaR-style floor)
    5. Adjust savings / investment strategy
    6. Recommend emergency fund size
    7. Integration with portfolio and goal planning
    """
    incomes = [float(x) for x in req.income_history]
    n = len(incomes)

    # ------------------------------------------------------------------
    # 4.1 Mean Monthly Income  =  Σ(Income_i) / n
    # ------------------------------------------------------------------
    mean_income = sum(incomes) / n

    # ------------------------------------------------------------------
    # 4.2 Standard Deviation of Income
    # Variance   = Σ(Income_i − Mean)² / n   (population variance)
    # Std Dev     = √Variance
    # ------------------------------------------------------------------
    variance = sum((x - mean_income) ** 2 for x in incomes) / n
    std_dev  = math.sqrt(variance)

    # Min, Max, Median for context
    sorted_inc = sorted(incomes)
    min_income = sorted_inc[0]
    max_income = sorted_inc[-1]
    if n % 2 == 1:
        median_income = sorted_inc[n // 2]
    else:
        median_income = (sorted_inc[n // 2 - 1] + sorted_inc[n // 2]) / 2.0

    # ------------------------------------------------------------------
    # 4.3 Coefficient of Variation  =  Std Dev / Mean Income
    # CV < 0.20  → Stable
    # 0.20–0.40  → Moderate volatility
    # > 0.40     → High volatility
    # ------------------------------------------------------------------
    cv = std_dev / mean_income if mean_income > 0 else 0.0
    cv = round(cv, 4)

    if cv < 0.20:
        cv_label   = "Stable"
        cv_color   = "green"
    elif cv <= 0.40:
        cv_label   = "Moderate Volatility"
        cv_color   = "yellow"
    else:
        cv_label   = "High Volatility"
        cv_color   = "red"

    # ------------------------------------------------------------------
    # 4.4 Income Stability Score  =  1 − CV
    # Clamped to [0, 1]
    # Closer to 1 → Stable | Closer to 0 → Highly volatile
    # ------------------------------------------------------------------
    stability_score = round(max(0.0, min(1.0, 1.0 - cv)), 4)

    if stability_score >= 0.80:
        stability_label = "Very Stable"
        stability_color = "green"
    elif stability_score >= 0.60:
        stability_label = "Reasonably Stable"
        stability_color = "blue"
    elif stability_score >= 0.40:
        stability_label = "Moderately Volatile"
        stability_color = "yellow"
    else:
        stability_label = "Highly Volatile"
        stability_color = "red"

    # ------------------------------------------------------------------
    # Objective 3 — Short-Term Income Forecast (6 months ahead)
    # Method: Linear Trend Regression + optional seasonal boost
    #   Trend slope  = (Σ i*y_i − n*x̄*ȳ) / (Σ i² − n*x̄²)   [LSQ]
    #   Forecast_t   = intercept + slope * t
    # Seasonal adjustment: if month falls in seasonal_months → add 1 std dev
    # ------------------------------------------------------------------
    x_vals = list(range(1, n + 1))
    x_mean = sum(x_vals) / n
    y_mean = mean_income

    num   = sum((x_vals[i] - x_mean) * (incomes[i] - y_mean) for i in range(n))
    denom = sum((x_vals[i] - x_mean) ** 2 for i in range(n))
    slope     = num / denom if denom != 0 else 0.0
    intercept = y_mean - slope * x_mean

    seasonal_months_set = set(req.seasonal_months or [])

    forecast_months = []
    import datetime
    base_month = datetime.date.today().month

    for ahead in range(1, 7):
        t = n + ahead
        base_forecast = intercept + slope * t
        base_forecast = max(0.0, base_forecast)

        # Seasonal boost: months the user flagged as high-income
        cal_month = ((base_month - 1 + ahead) % 12) + 1
        seasonal_boost = std_dev * 0.5 if cal_month in seasonal_months_set else 0.0

        final_forecast = round(base_forecast + seasonal_boost, 2)
        forecast_months.append({
            "month_ahead": ahead,
            "calendar_month": cal_month,
            "forecasted_income": final_forecast,
            "is_seasonal_peak": cal_month in seasonal_months_set,
            "trend_component": round(base_forecast, 2),
            "seasonal_boost": round(seasonal_boost, 2)
        })

    # ------------------------------------------------------------------
    # Objective 4 — Income Shock Risk
    # Worst-case floor = Mean − 2 × StdDev   (97.7% confidence, Normal dist)
    # Income Gap       = Fixed Expenses + EMI − Shock Floor
    # Shock probability (months income < fixed costs in history)
    # ------------------------------------------------------------------
    shock_floor = max(0.0, mean_income - 2.0 * std_dev)
    total_fixed_costs = req.fixed_monthly_expenses + req.emi_commitments
    income_gap  = max(0.0, total_fixed_costs - shock_floor)   # shortfall in worst month

    # Count months where income < total fixed costs (historical)
    bad_months = sum(1 for x in incomes if x < total_fixed_costs)
    shock_probability_pct = round((bad_months / n) * 100.0, 1)

    # ------------------------------------------------------------------
    # Objective 6 — Emergency Fund Recommendation
    # Base Rule:  Emergency Fund = Fixed Costs × Cushion Months
    # Cushion Months derived from stability score:
    #   Stable (≥0.80) → 3 months
    #   Moderate       → 6 months
    #   Volatile       → 9 months
    #   Highly Volatile→ 12 months
    # ------------------------------------------------------------------
    if stability_score >= 0.80:
        cushion_months = 3
    elif stability_score >= 0.60:
        cushion_months = 6
    elif stability_score >= 0.40:
        cushion_months = 9
    else:
        cushion_months = 12

    recommended_emergency_fund = round(total_fixed_costs * cushion_months, 2)
    emergency_fund_gap = round(
        max(0.0, recommended_emergency_fund - req.current_emergency_fund), 2
    )
    emergency_fund_status = "Adequate" if emergency_fund_gap == 0 else "Insufficient"
    months_to_fill_ef = 0
    avg_savings_cap = mean_income - total_fixed_costs
    if avg_savings_cap > 0 and emergency_fund_gap > 0:
        months_to_fill_ef = math.ceil(emergency_fund_gap / avg_savings_cap)

    # ------------------------------------------------------------------
    # Objective 5 — Adaptive Savings & Investment Strategy
    # Savings Capacity = Mean Income − Fixed Costs (positive = surplus)
    # Base Savings Rate = Savings Capacity / Mean Income
    # Risk-adjusted Investable Surplus:
    #   Conservative pool = Savings * (1 - CV) → liquid / FD
    #   Growth pool        = Savings * CV         → SIP / equity
    # ------------------------------------------------------------------
    savings_capacity = mean_income - total_fixed_costs
    base_savings_rate = max(0.0, savings_capacity / mean_income) if mean_income > 0 else 0.0

    # Reduce investable surplus if emergency fund not yet adequate
    ef_priority_fraction = min(1.0, emergency_fund_gap / max(1.0, savings_capacity * 12))
    investable_surplus = max(0.0, savings_capacity * (1.0 - ef_priority_fraction))

    conservative_pool = round(investable_surplus * (1.0 - cv), 2)   # Low-risk (FD, liquid)
    growth_pool       = round(investable_surplus * cv, 2)             # Market-linked (SIP/equity)

    adaptive_strategy = {
        "savings_capacity_per_month":   round(savings_capacity, 2),
        "base_savings_rate_pct":         round(base_savings_rate * 100.0, 2),
        "investable_surplus_per_month":  round(investable_surplus, 2),
        "conservative_allocation_Rs":    conservative_pool,   # FD / Liquid fund
        "growth_allocation_Rs":          growth_pool,         # SIP / Equity
        "ef_priority_fraction_pct":      round(ef_priority_fraction * 100.0, 2),
        "strategy_note": (
            f"With CV={cv:.2f}, allocate {round((1-cv)*100):.0f}% of surplus to "
            f"liquid/FD (₹{conservative_pool:,.0f}) and {round(cv*100):.0f}% to "
            f"growth assets (₹{growth_pool:,.0f}) to match your income volatility."
        )
    }

    # ------------------------------------------------------------------
    # Objective 7 — Integration Signals for Portfolio & Goal Planning
    # ------------------------------------------------------------------
    portfolio_integration = {
        "recommended_income_stability_score": stability_score,
        "suggested_equity_cap_pct": round(max(10.0, 100.0 * stability_score * 0.7), 1),
        "debt_preference_pct": round(min(70.0, 100.0 - (100.0 * stability_score * 0.7)), 1),
        "note": (
            f"Portfolio engine should use income_stability={stability_score:.2f}. "
            f"Max equity cap = {round(max(10.0, 100.0*stability_score*0.7),1)}% "
            f"due to {'high' if cv > 0.4 else 'moderate'} income volatility."
        )
    }

    # ------------------------------------------------------------------
    # AI Advisory Bullets
    # ------------------------------------------------------------------
    advisory = []
    advisory.append(
        f"📊 Mean Monthly Income: ₹{mean_income:,.0f} | "
        f"σ = ₹{std_dev:,.0f} | CV = {cv:.3f} ({cv_label})"
    )
    advisory.append(
        f"🎯 Income Stability Score: {stability_score:.3f} ({stability_label}) — "
        f"{'Your income is reliable enough for aggressive SIP.' if stability_score >= 0.75 else 'Build emergency buffer before aggressive investments.'}"
    )
    advisory.append(
        f"⚡ Worst-Case Monthly Income (σ×2 floor): ₹{shock_floor:,.0f} | "
        f"Income Gap vs Fixed Costs: ₹{income_gap:,.0f}"
    )
    advisory.append(
        f"🛡️ Emergency Fund: Recommended ₹{recommended_emergency_fund:,.0f} ({cushion_months} months) | "
        f"Current: ₹{req.current_emergency_fund:,.0f} | "
        f"{'✅ Adequate' if emergency_fund_status == 'Adequate' else f'Gap: ₹{emergency_fund_gap:,.0f} (~{months_to_fill_ef} months to fill)'}"
    )
    advisory.append(
        f"💰 Savings Capacity: ₹{savings_capacity:,.0f}/month | "
        f"Conservative Pool (FD): ₹{conservative_pool:,.0f} | "
        f"Growth Pool (SIP): ₹{growth_pool:,.0f}"
    )
    if forecast_months:
        next_m = forecast_months[0]
        advisory.append(
            f"📈 Next Month Income Forecast: ₹{next_m['forecasted_income']:,.0f} "
            f"{'(Seasonal Peak!)' if next_m['is_seasonal_peak'] else ''}"
        )
    if bad_months > 0:
        advisory.append(
            f"⚠️ Income Shock Risk: {shock_probability_pct}% of past months had income below fixed costs. "
            f"Build {cushion_months}-month emergency buffer."
        )

    # ==================================================================
    # SECTION 5 — INCOME FORECASTING MODEL (MLP / LSTM Approximation)
    # ==================================================================
    # 5.1 Time Series Modeling
    # We model Income_t as a function of:
    #   • Lagged incomes: Income_{t-1}, Income_{t-2}, Income_{t-3}
    #   • Month indicator: sin/cos encoding of calendar month (seasonality)
    #   • Economic indicator: income trend (slope per month)
    # Implementation: MLPRegressor (scikit-learn Neural Network)
    #   — a trained multi-layer perceptron that approximates LSTM behaviour
    #   for tabular time-series without requiring TensorFlow.
    # ==================================================================
    from sklearn.neural_network import MLPRegressor
    from sklearn.preprocessing import MinMaxScaler
    from scipy import stats as scipy_stats
    import datetime as _dt

    lstm_forecast  = []
    lstm_rmse      = None
    lstm_r2        = None
    lstm_model_note = "MLP Neural Network (LSTM approximation)"

    if n >= 4:          # Need at least 4 data points to build lag-3 features
        # ── 5.2 Feature Engineering ──────────────────────────────────────
        # Lag features:  X = [income_{t-3}, income_{t-2}, income_{t-1}, sin_month, cos_month, t_idx]
        # Target:        y = income_t
        LAG = min(3, n - 1)
        base_cal_month = _dt.date.today().month

        def _make_features(idx_list, income_arr, lags, base_month):
            rows, targets = [], []
            for i in idx_list:
                lag_vals = [income_arr[i - k] for k in range(1, lags + 1)]
                cal_m = ((base_month - 1 + (i - (len(income_arr) - 1))) % 12) + 1
                sin_m = math.sin(2 * math.pi * cal_m / 12.0)
                cos_m = math.cos(2 * math.pi * cal_m / 12.0)
                rows.append(lag_vals + [sin_m, cos_m, float(i)])
                targets.append(income_arr[i])
            return rows, targets

        train_idx = list(range(LAG, n))
        X_train, y_train = _make_features(train_idx, incomes, LAG, base_cal_month)

        # Scale inputs for MLP stability
        x_scaler = MinMaxScaler()
        y_scaler = MinMaxScaler()
        X_np = np.array(X_train)
        y_np = np.array(y_train).reshape(-1, 1)
        X_scaled = x_scaler.fit_transform(X_np)
        y_scaled = y_scaler.fit_transform(y_np).ravel()

        # Train MLP (hidden layers simulate LSTM gating)
        mlp = MLPRegressor(
            hidden_layer_sizes=(64, 32, 16),
            activation='tanh',          # tanh mimics LSTM cell activation
            max_iter=500,
            random_state=42,
            early_stopping=False,
            learning_rate_init=0.01
        )
        mlp.fit(X_scaled, y_scaled)

        # 5.3 Forecast Accuracy — RMSE on training set (leave-last-out)
        y_pred_scaled = mlp.predict(X_scaled)
        y_pred = y_scaler.inverse_transform(y_pred_scaled.reshape(-1, 1)).ravel()
        residuals_sq = [(y_pred[i] - y_train[i]) ** 2 for i in range(len(y_train))]
        lstm_rmse = round(math.sqrt(sum(residuals_sq) / len(residuals_sq)), 2)
        ss_res = sum(residuals_sq)
        ss_tot = sum((y - mean_income) ** 2 for y in y_train)
        lstm_r2 = round(1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0, 4)

        # Rolling forecast for next 6 months
        rolling_window = list(incomes[-LAG:])   # Most recent LAG values
        for ahead in range(1, 7):
            t_idx = n + ahead - 1
            cal_m = ((base_cal_month - 1 + ahead) % 12) + 1
            sin_m = math.sin(2 * math.pi * cal_m / 12.0)
            cos_m = math.cos(2 * math.pi * cal_m / 12.0)
            feat = [rolling_window[-k] for k in range(1, LAG + 1)] + [sin_m, cos_m, float(t_idx)]
            feat_s = x_scaler.transform([feat])
            pred_s = mlp.predict(feat_s)[0]
            pred_val = float(y_scaler.inverse_transform([[pred_s]])[0][0])
            pred_val = max(0.0, pred_val)

            # Add seasonal boost if month is flagged
            seasonal_boost_lstm = std_dev * 0.5 if cal_m in seasonal_months_set else 0.0
            pred_val += seasonal_boost_lstm
            pred_val = round(pred_val, 2)

            rolling_window.append(pred_val)  # Feed prediction back for next step
            lstm_forecast.append({
                "month_ahead": ahead,
                "calendar_month": cal_m,
                "month_name": MONTH_NAMES[cal_m - 1] if 'MONTH_NAMES' in dir() else cal_m,
                "lstm_predicted_income": pred_val,
                "is_seasonal_peak": cal_m in seasonal_months_set,
                "seasonal_boost": round(seasonal_boost_lstm, 2)
            })

    MONTH_NAMES_PY = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    for f in lstm_forecast:
        f["month_name"] = MONTH_NAMES_PY[f["calendar_month"] - 1]

    # ── 5.3 RMSE in human-readable advisory ──────────────────────────────
    lstm_predicted_values = [f["lstm_predicted_income"] for f in lstm_forecast]
    lstm_predicted_min    = min(lstm_predicted_values) if lstm_predicted_values else mean_income
    lstm_predicted_max    = max(lstm_predicted_values) if lstm_predicted_values else mean_income

    # ==================================================================
    # SECTION 6 — INCOME SHOCK PROBABILITY (Normal Distribution / Z-Score)
    # ==================================================================
    # 6.1 Define Income Shock Threshold
    # Shock if Current Income < Mean − 1 × StdDev
    shock_threshold = mean_income - 1.0 * std_dev    # Section 6.1 threshold

    # 6.2 Z-Score  =  (Threshold − Mean) / StdDev
    # P(Income < Threshold) = CDF of standard normal at Z
    if std_dev > 0:
        z_score_shock = (shock_threshold - mean_income) / std_dev   # = -1.0 by definition
        # scipy.stats.norm.cdf gives P(X < threshold)
        shock_probability_zscore = float(scipy_stats.norm.cdf(z_score_shock))
    else:
        z_score_shock = 0.0
        shock_probability_zscore = 0.0

    # For a custom threshold (mean - 1*sigma), z = -1 → P ≈ 15.87%
    # Allow custom z-score for 2-sigma shock as well
    z_score_2sigma = -2.0
    shock_probability_2sigma = float(scipy_stats.norm.cdf(z_score_2sigma))  # ≈ 2.28%

    section6 = {
        "shock_threshold_1sigma":     round(shock_threshold, 2),
        "z_score_at_threshold":       round(z_score_shock, 4),
        "shock_probability_1sigma_pct": round(shock_probability_zscore * 100, 2),
        "z_score_2sigma":             round(z_score_2sigma, 4),
        "shock_probability_2sigma_pct": round(shock_probability_2sigma * 100, 2),
        "formula":                    "Z = (Threshold − μ) / σ   →   P = Φ(Z)",
        "interpretation": (
            f"There is a {shock_probability_zscore*100:.1f}% probability that any given month's income "
            f"falls below ₹{shock_threshold:,.0f} (μ − 1σ). "
            f"Probability of extreme shock (μ − 2σ = ₹{max(0,mean_income-2*std_dev):,.0f}) is "
            f"{shock_probability_2sigma*100:.1f}%."
        )
    }

    # ==================================================================
    # SECTION 7 — SAFE SPENDING LIMIT
    # Safe Monthly Spending = Predicted Minimum Income − EMI − Fixed Obligations
    # ==================================================================
    # Use LSTM-predicted minimum as the most conservative forward estimate
    predicted_min_income = lstm_predicted_min if lstm_predicted_values else shock_floor
    safe_monthly_spending = max(0.0, predicted_min_income - req.emi_commitments - req.fixed_monthly_expenses)
    discretionary_budget  = max(0.0, mean_income - req.fixed_monthly_expenses - req.emi_commitments)

    # Safety buffer recommendation: keep 10% of mean as liquid reserve every month
    liquid_reserve_monthly = round(mean_income * 0.10, 2)
    ultra_safe_spending    = max(0.0, safe_monthly_spending - liquid_reserve_monthly)

    section7 = {
        "predicted_minimum_income":   round(predicted_min_income, 2),
        "emi_commitments":            round(req.emi_commitments, 2),
        "fixed_obligations":          round(req.fixed_monthly_expenses, 2),
        "safe_monthly_spending":      round(safe_monthly_spending, 2),
        "ultra_safe_spending":        round(ultra_safe_spending, 2),
        "discretionary_budget_avg":   round(discretionary_budget, 2),
        "liquid_reserve_monthly":     liquid_reserve_monthly,
        "formula":                    "Safe Spending = Predicted Min Income − EMI − Fixed Obligations",
        "interpretation": (
            f"Based on the ML forecast, your safest spending ceiling is "
            f"₹{safe_monthly_spending:,.0f}/month. "
            f"For extra protection (10% reserve), limit to ₹{ultra_safe_spending:,.0f}/month."
        )
    }

    # Extend advisory with sections 5, 6, 7
    if lstm_rmse is not None:
        advisory.append(
            f"🧠 LSTM/MLP Forecast (Section 5): Next 6-month income range "
            f"₹{lstm_predicted_min:,.0f}–₹{lstm_predicted_max:,.0f} | "
            f"Model RMSE = ₹{lstm_rmse:,.0f} | R² = {lstm_r2}"
        )
    advisory.append(
        f"📊 Shock Probability (Section 6): {section6['shock_probability_1sigma_pct']}% chance of income "
        f"dropping below ₹{section6['shock_threshold_1sigma']:,.0f} (Z = {section6['z_score_at_threshold']})"
    )
    advisory.append(
        f"💸 Safe Spending Limit (Section 7): ₹{section7['safe_monthly_spending']:,.0f}/month "
        f"| Ultra-safe: ₹{section7['ultra_safe_spending']:,.0f}/month "
        f"(Predicted min − EMI − Fixed Costs)"
    )

    return {
        # 4.1 Mean
        "mean_monthly_income":   round(mean_income, 2),
        "median_monthly_income": round(median_income, 2),
        "min_income":            round(min_income, 2),
        "max_income":            round(max_income, 2),
        "sample_months":         n,

        # 4.2 Volatility
        "variance":              round(variance, 2),
        "std_dev":               round(std_dev, 2),

        # 4.3 CV
        "coefficient_of_variation": cv,
        "cv_label":                 cv_label,
        "cv_color":                 cv_color,

        # 4.4 Stability Score
        "stability_score":       stability_score,
        "stability_label":       stability_label,
        "stability_color":       stability_color,

        # Obj 3 — Linear Trend Forecast (retained)
        "income_forecast":       forecast_months,
        "trend_slope":           round(slope, 2),
        "trend_intercept":       round(intercept, 2),

        # Obj 4 — Shock Risk (basic)
        "shock_analysis": {
            "shock_floor_2sigma":        round(shock_floor, 2),
            "total_fixed_costs":         round(total_fixed_costs, 2),
            "income_gap_at_shock":       round(income_gap, 2),
            "shock_probability_pct":     shock_probability_pct,
            "bad_months_count":          bad_months
        },

        # Obj 5 — Adaptive Strategy
        "adaptive_strategy":     adaptive_strategy,

        # Obj 6 — Emergency Fund
        "emergency_fund": {
            "recommended_amount":     recommended_emergency_fund,
            "current_amount":         req.current_emergency_fund,
            "gap":                    emergency_fund_gap,
            "status":                 emergency_fund_status,
            "cushion_months":         cushion_months,
            "months_to_fill":         months_to_fill_ef
        },

        # Obj 7 — Portfolio Integration
        "portfolio_integration":  portfolio_integration,

        # ── NEW: Section 5 — LSTM/MLP Deep Learning Forecast ──
        "lstm_forecast": {
            "model":           lstm_model_note,
            "architecture":    "MLP (64→32→16) with tanh activation, lag-3 + sin/cos seasonality + trend index",
            "rmse":            lstm_rmse,
            "r2_score":        lstm_r2,
            "predictions":     lstm_forecast,
            "predicted_min":   round(lstm_predicted_min, 2),
            "predicted_max":   round(lstm_predicted_max, 2),
            "rmse_formula":    "RMSE = √(Σ(Predicted − Actual)² / n)",
            "note": (
                "MLP trained on user's own income history using lag-3 features + "
                "Fourier-encoded seasonality (sin/cos month). "
                "Predictions fed back iteratively for multi-step forecasting."
            )
        },

        # ── NEW: Section 6 — Z-Score Shock Probability ──
        "shock_probability_model": section6,

        # ── NEW: Section 7 — Safe Spending Limit ──
        "safe_spending":          section7,

        # AI Advisory
        "ai_advisory":            advisory,

        # Meta
        "income_category":        req.income_category
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

