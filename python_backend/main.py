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

    # --- 5. CVXPY Cash Flow Optimization ---
    disposable = income
    minimum_expenses = expenses * 0.8
    f_dscr = min(1.0, dscr / 0.5) * 0.4
    f_emg = max(0.0, 1.0 - (emergency_fund_coverage / 3.0)) * 0.4
    f_sav = max(0.0, 1.0 - (savings_rate / 0.2)) * 0.2
    fragility_score = min(1.0, f_dscr + f_emg + f_sav)

    # --- 5. CVXPY Cash Flow Reallocation Optimization Engine ---
    disposable = income
    minimum_expenses = expenses * 0.8
    
    if disposable < (minimum_expenses + emis):
        # Extreme constraint fallback
        total_needed = minimum_expenses + emis
        if total_needed > 0:
            exp_ratio = minimum_expenses / total_needed
            emi_ratio = emis / total_needed
            alloc_expenses = disposable * exp_ratio
            alloc_emi = disposable * emi_ratio
            alloc_emg = alloc_sip = alloc_fd = 0.0
        else:
            alloc_expenses = alloc_emi = alloc_emg = alloc_sip = alloc_fd = 0.0
    else:
        # Decision Variables: [Expenses, SIP, Emergency, FD, Debt_Repayment]
        alloc = cp.Variable(5)
        
        # Determine current equity allocation vs target
        equity_underallocated = asset_allocation_pct < (portfolio["Equity"] * 0.8)
        
        # Weights for Priority Cases
        w_lifestyle = 1.0
        w_emg = 1.0
        w_equity = 1.0
        w_fd = 1.0
        w_debt = 1.0
        
        # Decision Logic Constraints & Priorities
        if emergency_fund_coverage < 3:
            # Case A: Emergency Critical -> Priority = Liquidity
            w_emg = 10.0
        elif dscr > 0.40:
            # Case C: Debt High -> Priority = EMI reduction
            w_debt = 10.0
        elif equity_underallocated:
            # Case B: Equity Underallocated -> Priority = Growth
            w_equity = 5.0
            
        surplus = max(0, disposable - minimum_expenses - emis)
        
        # Target formulations for Risk Imbalance
        target_emg = surplus * 0.8 if w_emg > 1 else surplus * 0.1
        target_debt = emis + (surplus * 0.8 if w_debt > 1 else 0.0)
        target_equity = surplus * (portfolio["Equity"] / 100) if w_equity > 1 else surplus * 0.4
        target_fd = surplus * (portfolio["Debt"] / 100)
        
        # Objective: Minimize lifestyle disruption + risk imbalance
        objective = cp.Minimize(
            w_lifestyle * cp.square(alloc[0] - expenses) + 
            w_equity * cp.square(alloc[1] - target_equity) + 
            w_emg * cp.square(alloc[2] - target_emg) + 
            w_fd * cp.square(alloc[3] - target_fd) + 
            w_debt * cp.square(alloc[4] - target_debt)
        )
        
        constraints = [
            cp.sum(alloc) == disposable,
            alloc[0] >= minimum_expenses, # Minimum lifestyle constraint
            alloc[0] <= expenses,
            alloc[1] >= 0,
            alloc[2] >= 0,
            alloc[3] >= 0,
            alloc[4] >= emis # Debt threshold (Base EMI must be paid)
        ]
        
        prob = cp.Problem(objective, constraints)
        try:
            prob.solve()
            alloc_expenses = float(alloc.value[0])
            alloc_sip = float(alloc.value[1])
            alloc_emg = float(alloc.value[2])
            alloc_fd = float(alloc.value[3])
            alloc_emi = float(alloc.value[4])
        except Exception:
            alloc_expenses = minimum_expenses
            alloc_emi = emis
            alloc_emg = 0.0
            alloc_sip = 0.0
            alloc_fd = 0.0
            
    cashFlow = {
        "expenses": round(alloc_expenses, 2),
        "emis": round(alloc_emi, 2),
        "emergency": round(alloc_emg, 2),
        "investments": round(alloc_sip + alloc_fd, 2),
        "sip_equity": round(alloc_sip, 2),
        "fd_debt": round(alloc_fd, 2)
    }
    alloc_inv = alloc_sip + alloc_fd

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

    return {
        "score": score,
        "riskTier": risk_tier,
        "riskScore": risk_score,
        "issues": issues,
        "savingsRate": actual_savings_rate,
        "dti": dscr,
        "liquidityRatio": liquidity_ratio if liquidity_ratio != float('inf') else None,
        "emergencyCoverage": emergency_fund_coverage if emergency_fund_coverage != float('inf') else None,
        "portfolio": portfolio,
        "cashFlow": cashFlow,
        "prioritized_actions": actions, # Replaces old generic actions
        "explainable_ai": explainable_ai,
        "futureCorpus": future_corpus,
        "monthlyInvest": monthly_invest,
        "annualReturn": round(annual_return, 4),
        "netSavings": surplus,
        "income": income,
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
