import React, { useState, useEffect } from 'react';
import './irregular.css';
import './engine-dashboard.css';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CATEGORY_OPTIONS = [
  { value: 'freelance',   icon: '💻', label: 'Freelancer',        desc: 'Projects, clients, contracts' },
  { value: 'business',   icon: '🏢', label: 'Business Owner',     desc: 'Self-employed, shop, trade' },
  { value: 'gig',        icon: '🛵', label: 'Gig Worker',         desc: 'Delivery, ride-share, tasks' },
  { value: 'commission', icon: '🤝', label: 'Commission-Based',   desc: 'Sales, real estate, agents' },
  { value: 'seasonal',   icon: '🌾', label: 'Seasonal Earner',    desc: 'Farming, tourism, events' },
];

function fmt(n) { return Number(n).toLocaleString('en-IN'); }

function parseIncomeString(raw) {
  try {
    const vals = raw.split(',').map(s => {
      const v = parseFloat(s.trim());
      if (isNaN(v) || v < 0) throw new Error('invalid');
      return v;
    });
    if (vals.length < 3)  throw new Error('Need at least 3 months');
    if (vals.length > 24) throw new Error('Max 24 months');
    return { vals, error: '' };
  } catch {
    return { vals: null, error: 'Enter comma-separated numbers (3–24 values), e.g. 42000, 55000, 38000' };
  }
}

function MiniBarChart({ values, threshold }) {
  const max = Math.max(...values, 1);
  return (
    <div className="irr2-minichart">
      {values.map((v, i) => (
        <div key={i} className="irr2-bar-col" title={`Month ${i + 1}: ₹${fmt(v)}`}>
          <div
            className="irr2-bar-fill"
            style={{
              height: `${Math.round((v / max) * 100)}%`,
              background: v < threshold
                ? 'linear-gradient(180deg,#f87171,#dc2626)'
                : 'linear-gradient(180deg,#818cf8,#6366f1)',
            }}
          />
        </div>
      ))}
    </div>
  );
}

function StepDot({ num, active, done }) {
  return (
    <div className={`irr2-step-dot ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
      {done ? '✓' : num}
    </div>
  );
}

import { useAuth } from './context/AuthContext';
import { Link } from 'react-router-dom';

// ─── Main Component ───────────────────────────────────────────────────────────
export default function IrregularIncomeDashboard() {
  const { user, getEngineData, saveEngineData } = useAuth();
  const [step, setStep]         = useState(1);
  const [submitted, setSubmitted] = useState(false);

  const defaultHistory = '65000, 85000, 42000, 110000, 58000, 95000, 38000, 125000, 70000, 90000, 48000, 115000';
  const defaultVals = [65000, 85000, 42000, 110000, 58000, 95000, 38000, 125000, 70000, 90000, 48000, 115000];

  const [historyInput, setHistoryInput] = useState(() => {
    const stored = getEngineData ? getEngineData('irregular_income') : null;
    return stored?.historyInput ?? defaultHistory;
  });
  const [historyVals,  setHistoryVals]  = useState(() => {
    const stored = getEngineData ? getEngineData('irregular_income') : null;
    if (stored?.income_history && stored.income_history.length >= 3) return stored.income_history;
    return defaultVals;
  });
  const [historyError, setHistoryError] = useState('');

  const [incomeCategory, setIncomeCategory] = useState(() => {
    const stored = getEngineData ? getEngineData('irregular_income') : null;
    return stored?.income_category ?? 'freelance';
  });
  const [fixedExpenses,  setFixedExpenses]  = useState(() => {
    const stored = getEngineData ? getEngineData('irregular_income') : null;
    return stored?.fixed_monthly_expenses ?? '35000';
  });
  const [emiCommitments, setEmiCommitments] = useState(() => {
    const stored = getEngineData ? getEngineData('irregular_income') : null;
    return stored?.emi_commitments ?? '12000';
  });
  const [emergencyFund,  setEmergencyFund]  = useState(() => {
    const stored = getEngineData ? getEngineData('irregular_income') : null;
    return stored?.current_emergency_fund ?? '120000';
  });

  const [seasonalMonths, setSeasonalMonths] = useState(() => {
    const stored = getEngineData ? getEngineData('irregular_income') : null;
    return stored?.seasonal_months ?? [];
  });

  const [isAutofilled, setIsAutofilled] = useState(() => {
    return Boolean(getEngineData && getEngineData('irregular_income'));
  });

  // Interactive inflow simulator state
  const [inflowAmount, setInflowAmount] = useState('');
  const [activeBlueprint, setActiveBlueprint] = useState('normal_month');

  useEffect(() => {
    if (getEngineData) {
      const stored = getEngineData('irregular_income');
      if (stored) {
        if (stored.historyInput) setHistoryInput(stored.historyInput);
        if (stored.income_history) setHistoryVals(stored.income_history);
        if (stored.income_category) setIncomeCategory(stored.income_category);
        if (stored.fixed_monthly_expenses !== undefined) setFixedExpenses(String(stored.fixed_monthly_expenses));
        if (stored.emi_commitments !== undefined) setEmiCommitments(String(stored.emi_commitments));
        if (stored.current_emergency_fund !== undefined) setEmergencyFund(String(stored.current_emergency_fund));
        if (stored.seasonal_months) setSeasonalMonths(stored.seasonal_months);
        setIsAutofilled(true);
      }
    }
  }, [getEngineData]);

  const applyIrregularPreset = (preset) => {
    setHistoryInput(preset.historyInput);
    setHistoryVals(preset.vals);
    setHistoryError('');
    if (preset.category) setIncomeCategory(preset.category);
    if (preset.fixed) setFixedExpenses(String(preset.fixed));
    if (preset.emis !== undefined) setEmiCommitments(String(preset.emis));
    if (preset.fund !== undefined) setEmergencyFund(String(preset.fund));
    setIsAutofilled(false);
  };

  const [result,  setResult]  = useState(null);
  const [hwForecast, setHwForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleHistoryChange = (raw) => {
    setHistoryInput(raw);
    const { vals, error: err } = parseIncomeString(raw);
    setHistoryError(err);
    if (vals) setHistoryVals(vals);
    else      setHistoryVals([]);
  };

  const canGoStep2 = historyVals.length >= 3 && !historyError;
  const canGoStep3 = fixedExpenses !== '' && emergencyFund !== '';

  const toggleMonth = (m) =>
    setSeasonalMonths(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setSubmitted(true);
    try {
      const payload = {
        income_history:          historyVals,
        income_category:         incomeCategory,
        fixed_monthly_expenses:  Number(fixedExpenses) || 0,
        emi_commitments:         Number(emiCommitments) || 0,
        current_emergency_fund:  Number(emergencyFund) || 0,
        seasonal_months:         seasonalMonths.length ? seasonalMonths : null,
      };
      if (saveEngineData) {
        saveEngineData('irregular_income', { ...payload, historyInput });
      }
      const res = await fetch('http://localhost:8000/api/irregular-income/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      setInflowAmount(String(Math.round(data.mean_monthly_income)));
      // Also call M1 — Holt-Winters income forecast
      try {
        const hwRes = await fetch('http://localhost:8000/api/ml/income-forecast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ income_history: historyVals, months_ahead: 6 })
        });
        const hwData = await hwRes.json();
        if (hwData.forecast) setHwForecast(hwData);
      } catch (e) { /* silent */ }
    } catch (e) {
      setError('Something went wrong. Please try again. (' + e.message + ')');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSubmitted(false);
    setResult(null);
    setError('');
  };

  // Derived
  const totalFixed = (Number(fixedExpenses) || 0) + (Number(emiCommitments) || 0);
  const selectedCategory = CATEGORY_OPTIONS.find(c => c.value === incomeCategory);

  const stabilityWord = (score) =>
    score >= 0.80 ? { word: 'Very Stable 🟢', color: '#34d399' }
    : score >= 0.60 ? { word: 'Fairly Stable 🔵', color: '#60a5fa' }
    : score >= 0.40 ? { word: 'Moderate Risk 🟡', color: '#f59e0b' }
    : { word: 'High Risk 🔴', color: '#f87171' };

  // Compute interactive inflow allocation from result params
  const computeAlloc = (amt) => {
    if (!result) return null;
    const a = Math.max(0, Number(amt) || 0);
    const taxRate = result.owners_salary_system?.tax_withholding_rate_pct ?? 15;
    const tax = Math.round(a * taxRate / 100);
    const afterTax = Math.max(0, a - tax);
    const fixedCost = result.shock_analysis?.total_fixed_costs ?? 0;
    const fixed = Math.min(afterTax, fixedCost);
    const rem1 = Math.max(0, afterTax - fixed);
    const efGap = result.emergency_fund?.gap ?? 0;
    const runway = result.owners_salary_system?.buffer_runway_months ?? 3;
    const bufPct = efGap > 0 ? (runway < 3 ? 0.60 : 0.45) : 0.20;
    const buffer = Math.round(rem1 * bufPct);
    const rem2 = Math.max(0, rem1 - buffer);
    const discPct = runway >= 3 ? 0.50 : 0.30;
    const disc = Math.round(rem2 * discPct);
    const wealth = Math.max(0, rem2 - disc);
    return { tax, fixed, buffer, disc, wealth, total: a };
  };

  const alloc = result ? computeAlloc(inflowAmount || result.mean_monthly_income) : null;

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="irr2-root">
      {/* ── Header ── */}
      <div className="irr2-header">
        <Link to="/" className="irr2-back-btn" style={{ textDecoration: 'none' }}>← Back to Hub</Link>
        <div className="irr2-header-center">
          <h1>🌊 Irregular Income Planner</h1>
          <p>Cashflow Intelligence · Spending Guardrails · Money Management System</p>
        </div>
        <div style={{ display:'flex', gap:'0.6rem', alignItems:'center' }}>
          {user && <span style={{ fontSize:'0.78rem', color:'#818cf8', fontWeight:600, background:'rgba(99,102,241,0.12)', padding:'0.35rem 0.8rem', borderRadius:'8px', border:'1px solid rgba(99,102,241,0.25)' }}>👤 {user.name}</span>}
        </div>
      </div>

      {/* ═══════════════════ INPUT WIZARD ═══════════════════ */}
      {!submitted && (
        <div className="irr2-wizard-shell">
          {/* Step Progress */}
          <div className="irr2-step-progress">
            <StepDot num={1} active={step === 1} done={step > 1} />
            <div className={`irr2-step-line ${step > 1 ? 'done' : ''}`} />
            <StepDot num={2} active={step === 2} done={step > 2} />
            <div className={`irr2-step-line ${step > 2 ? 'done' : ''}`} />
            <StepDot num={3} active={step === 3} done={false} />
          </div>

          {/* ── STEP 1: Income History ── */}
          {step === 1 && (
            <div className="irr2-step-content">
              <div className="irr2-step-heading">
                <span className="irr2-step-icon">📊</span>
                <div>
                  <h2>Enter your income history</h2>
                  <p>Type your monthly income values separated by commas. Most recent month last. 3–24 months.</p>
                </div>
              </div>

              {isAutofilled && (
                <div className="irr2-autofill-badge">⚡ Autofilled from your profile · Edit below if needed</div>
              )}

              <div className="irr2-quick-presets">
                <span className="irr2-preset-label">Quick Presets:</span>
                <button className="irr2-preset-btn" onClick={() => applyIrregularPreset({
                  historyInput: '42000, 55000, 35000, 78000, 48000, 91000, 38000, 62000, 45000, 83000, 55000, 70000',
                  vals:[42000,55000,35000,78000,48000,91000,38000,62000,45000,83000,55000,70000], category:'freelance', fixed:32000, emis:8000, fund:80000
                })}>💻 Freelancer</button>
                <button className="irr2-preset-btn" onClick={() => applyIrregularPreset({
                  historyInput: '180000, 220000, 95000, 310000, 150000, 275000, 88000, 320000, 195000, 260000, 105000, 340000',
                  vals:[180000,220000,95000,310000,150000,275000,88000,320000,195000,260000,105000,340000], category:'business', fixed:95000, emis:35000, fund:350000
                })}>🏢 Business Owner</button>
                <button className="irr2-preset-btn" onClick={() => applyIrregularPreset({
                  historyInput: '22000, 31000, 18000, 27000, 35000, 28000, 19000, 33000, 25000, 30000, 22000, 36000',
                  vals:[22000,31000,18000,27000,35000,28000,19000,33000,25000,30000,22000,36000], category:'gig', fixed:18000, emis:0, fund:25000
                })}>🛵 Gig Worker</button>
              </div>

              <div className="irr2-field">
                <label className="irr2-label">Monthly Income History (₹)</label>
                <textarea
                  className={`irr2-textarea ${historyError ? 'error' : historyVals.length >= 3 ? 'valid' : ''}`}
                  value={historyInput}
                  onChange={e => handleHistoryChange(e.target.value)}
                  placeholder="e.g.  42000, 55000, 38000, 72000, 49000, 88000"
                  rows={3}
                />
                {historyError && <p className="irr2-field-error">⚠ {historyError}</p>}
                {historyVals.length >= 3 && !historyError && (
                  <div className="irr2-preview-row">
                    <span className="irr2-preview-label">{historyVals.length} months · ₹{fmt(Math.round(historyVals.reduce((a,b)=>a+b,0)/historyVals.length))} avg</span>
                    <MiniBarChart values={historyVals} threshold={totalFixed || 0} />
                  </div>
                )}
              </div>

              <div className="irr2-form-nav">
                <div />
                <button className="irr2-next-btn" disabled={!canGoStep2} onClick={() => setStep(2)}>
                  Next — Profile →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Expenses & Profile ── */}
          {step === 2 && (
            <div className="irr2-step-content">
              <div className="irr2-step-heading">
                <span className="irr2-step-icon">💼</span>
                <div>
                  <h2>Your income type & monthly obligations</h2>
                  <p>We need this to calibrate your spending guardrails and buffer requirements.</p>
                </div>
              </div>

              <div className="irr2-category-grid">
                {CATEGORY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`irr2-category-card ${incomeCategory === opt.value ? 'selected' : ''}`}
                    onClick={() => setIncomeCategory(opt.value)}
                  >
                    <span className="irr2-cat-icon">{opt.icon}</span>
                    <span className="irr2-cat-label">{opt.label}</span>
                    <span className="irr2-cat-desc">{opt.desc}</span>
                  </button>
                ))}
              </div>

              <div className="irr2-fields-grid">
                <div className="irr2-field">
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <label className="irr2-label">Fixed Monthly Expenses (₹)</label>
                    <span style={{fontSize:'0.78rem', color:'#f59e0b', fontWeight:700}}>₹{fmt(fixedExpenses||0)}</span>
                  </div>
                  <input className="irr2-input" type="number" min="0" value={fixedExpenses} onChange={e => setFixedExpenses(e.target.value)} placeholder="Rent, utilities, groceries..." />
                  <input type="range" min="0" max="300000" step="1000" value={Number(fixedExpenses)||0} onChange={e => setFixedExpenses(e.target.value)} className="adv-range-slider" style={{accentColor:'#f59e0b', marginTop:'6px'}} />
                </div>

                <div className="irr2-field">
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <label className="irr2-label">EMI / Loan Commitments (₹)</label>
                    <span style={{fontSize:'0.78rem', color:'#818cf8', fontWeight:700}}>₹{fmt(emiCommitments||0)}</span>
                  </div>
                  <input className="irr2-input" type="number" min="0" value={emiCommitments} onChange={e => setEmiCommitments(e.target.value)} placeholder="e.g. 5000  (0 if none)" />
                  <input type="range" min="0" max="150000" step="1000" value={Number(emiCommitments)||0} onChange={e => setEmiCommitments(e.target.value)} className="adv-range-slider" style={{accentColor:'#818cf8', marginTop:'6px'}} />
                </div>

                <div className="irr2-field" style={{gridColumn:'1/-1'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <label className="irr2-label">Current Emergency Savings (₹)</label>
                    <span style={{fontSize:'0.78rem', color:'#34d399', fontWeight:700}}>₹{fmt(emergencyFund||0)}</span>
                  </div>
                  <input className="irr2-input" type="number" min="0" value={emergencyFund} onChange={e => setEmergencyFund(e.target.value)} placeholder="e.g. 50000  (0 if none)" />
                  <input type="range" min="0" max="1500000" step="10000" value={Number(emergencyFund)||0} onChange={e => setEmergencyFund(e.target.value)} className="adv-range-slider" style={{accentColor:'#34d399', marginTop:'6px'}} />
                </div>
              </div>

              {fixedExpenses && (
                <div className="irr2-expense-summary">
                  <div className="irr2-expense-row"><span>Fixed Expenses</span><strong>₹{fmt(fixedExpenses)}</strong></div>
                  <div className="irr2-expense-row"><span>Loan Payments</span><strong>₹{fmt(emiCommitments||0)}</strong></div>
                  <div className="irr2-expense-row total"><span>Total Monthly Commitments</span><strong style={{color:'#f87171'}}>₹{fmt(totalFixed)}</strong></div>
                  <div style={{marginTop:'0.8rem', background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.25)', borderRadius:'10px', padding:'0.75rem', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <span style={{fontSize:'0.78rem', color:'#94a3b8'}}>Emergency Buffer Runway:</span>
                    <strong style={{fontSize:'0.98rem', color:'#34d399', fontFamily:'Outfit, sans-serif'}}>
                      {totalFixed > 0 ? ((Number(emergencyFund)||0)/totalFixed).toFixed(1) : 0} Months of Expenses Covered
                    </strong>
                  </div>
                </div>
              )}

              <div className="irr2-form-nav">
                <button className="irr2-back-step-btn" onClick={() => setStep(1)}>← Back</button>
                <button className="irr2-next-btn" disabled={!canGoStep3} onClick={() => setStep(3)}>
                  Next — Seasonal Months →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Seasonal + Submit ── */}
          {step === 3 && (
            <div className="irr2-step-content">
              <div className="irr2-step-heading">
                <span className="irr2-step-icon">🌟</span>
                <div>
                  <h2>Do you earn more in certain months? (Optional)</h2>
                  <p>Select months when you typically get higher income — festivals, summer rush, contract periods. Skip if not applicable.</p>
                </div>
              </div>

              <div className="irr2-month-grid">
                {MONTH_NAMES.map((m, i) => (
                  <button
                    key={i}
                    className={`irr2-month-btn ${seasonalMonths.includes(i + 1) ? 'selected' : ''}`}
                    onClick={() => toggleMonth(i + 1)}
                  >
                    {m}
                    {seasonalMonths.includes(i + 1) && <span className="irr2-month-check">✓</span>}
                  </button>
                ))}
              </div>

              {seasonalMonths.length > 0 && (
                <div className="irr2-seasonal-summary">
                  🌟 Peak months: {seasonalMonths.map(m => MONTH_NAMES[m-1]).join(', ')} — seasonal boost will be applied to forecasts.
                </div>
              )}

              <div className="irr2-form-nav">
                <button className="irr2-back-step-btn" onClick={() => setStep(2)}>← Back</button>
                <button className="irr2-submit-btn" onClick={handleSubmit}>
                  ⚡ Analyse My Cashflow →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ LOADING ═══════════════════ */}
      {submitted && loading && (
        <div className="irr2-loading-screen">
          <div className="irr2-spinner" />
          <h3>Running AI Money Management Analysis...</h3>
          <p>Computing ML risk models, waterfall allocations & spending blueprints</p>
        </div>
      )}

      {/* ═══════════════════ ERROR ═══════════════════ */}
      {submitted && !loading && error && (
        <div className="irr2-error-screen">
          <div className="irr2-error-icon">⚠️</div>
          <h3>Something went wrong</h3>
          <p>{error}</p>
          <button className="irr2-reset-btn" onClick={handleReset}>Try Again</button>
        </div>
      )}

      {/* ═══════════════════ RESULTS ═══════════════════ */}
      {submitted && !loading && result && (
        <div className="eng-dash">
          {/* Sticky Header Nav */}
          <header className="eng-nav">
            <Link to="/" className="eng-nav-brand">
              <div className="eng-nav-icon">🌊</div>
              FINEXO · <span>Irregular Income Money Management</span>
            </Link>
            <div className="eng-nav-right">
              {user && (
                <span style={{fontSize:'0.8rem', color:'#818cf8', fontWeight:600, background:'rgba(99,102,241,0.12)', padding:'0.35rem 0.8rem', borderRadius:'8px', border:'1px solid rgba(99,102,241,0.25)'}}>
                  👤 {user.name}
                </span>
              )}
              <button className="eng-btn-ghost" onClick={handleReset}>← Re-Analyse</button>
              <button className="eng-btn-primary" onClick={() => window.print()}>Export Plan 📄</button>
            </div>
          </header>

          <main className="eng-dash-body">

            {/* ─── TITLE ROW ─── */}
            <div className="eng-dash-header-row dash-anim-1">
              <div className="eng-dash-title-wrap">
                <h1>Variable Income Stabilization & Money Management Cockpit</h1>
                <p>{selectedCategory?.icon} {selectedCategory?.label} Track · {result.sample_months} Months Telemetry · Full Spending Blueprint + ML Risk Radar</p>
              </div>
              <div className="eng-dash-actions">
                <span style={{fontSize:'0.78rem', fontWeight:700, color:stabilityWord(result.stability_score).color, background:'rgba(255,255,255,0.04)', padding:'0.4rem 0.9rem', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.1)'}}>
                  ISS: {(result.stability_score * 100).toFixed(0)}% ({stabilityWord(result.stability_score).word})
                </span>
              </div>
            </div>

            {/* ─── ROW 1: KPI Cards ─── */}
            <div className="kpi-row-4 dash-anim-1">
              <div className="kpi-card">
                <div className="kpi-top"><span className="kpi-label">AVERAGE MONTHLY INCOME</span><span className="kpi-badge info">{result.sample_months} Mo</span></div>
                <div className="kpi-value blue">₹{fmt(result.mean_monthly_income)}</div>
                <div className="kpi-footer">
                  <span className="kpi-trend-text">Floor: ₹{fmt(Math.max(0,result.shock_analysis?.shock_floor_2sigma??0))}</span>
                  <span className="kpi-sub-desc">Historical revenue across all cycles</span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-top"><span className="kpi-label">INCOME STABILITY SCORE</span><span className="kpi-badge up">{stabilityWord(result.stability_score).word}</span></div>
                <div className="kpi-value green">{(result.stability_score*100).toFixed(0)}%</div>
                <div className="kpi-footer">
                  <span className="kpi-trend-text">Volatility: {((1-result.stability_score)*10).toFixed(1)}/10</span>
                  <span className="kpi-sub-desc">Lower variance = higher growth SIP</span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-top">
                  <span className="kpi-label">OWNER'S MONTHLY SALARY</span>
                  <span className="kpi-badge info">Stable Draw</span>
                </div>
                <div className="kpi-value" style={{color:'#f59e0b'}}>₹{fmt(result.owners_salary_system?.recommended_owners_salary??0)}</div>
                <div className="kpi-footer">
                  <span className="kpi-trend-text">Tax Reserve: ₹{fmt(result.owners_salary_system?.monthly_tax_reserve??0)}/mo ({result.owners_salary_system?.tax_withholding_rate_pct??0}%)</span>
                  <span className="kpi-sub-desc">Sustainable paycheck to pay yourself</span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-top">
                  <span className="kpi-label">ML DEFICIT RISK (60-Day)</span>
                  <span className="kpi-badge" style={{background: `${result.cash_crunch_model?.color}22`, color: result.cash_crunch_model?.color, border: `1px solid ${result.cash_crunch_model?.color}44`}}>
                    {result.cash_crunch_model?.badge}
                  </span>
                </div>
                <div className="kpi-value" style={{color: result.cash_crunch_model?.color}}>
                  {result.cash_crunch_model?.probability_60d_pct}%
                </div>
                <div className="kpi-footer">
                  <span className="kpi-trend-text">Runway: {result.cash_crunch_model?.buffer_runway_months} months of expenses</span>
                  <span className="kpi-sub-desc">Logistic Semi-Variance Risk Classifier</span>
                </div>
              </div>
            </div>

            {/* ─── ROW 2: Income Forecast + Inflow Allocator ─── */}
            <div className="dash-grid-2 dash-anim-2">
              {/* 6-Month Forward Forecast */}
              <div className="dash-card">
                <div className="dash-card-head">
                  <div>
                    <h3 className="dash-card-title">6-Month Forward Income Forecast</h3>
                    <p className="dash-card-desc">Holt-Winters Exponential Smoothing (M1) + Seasonal Pattern</p>
                  </div>
                  <span style={{fontSize:'0.74rem', color:'#818cf8', fontWeight:700, background:'rgba(99,102,241,0.1)', padding:'3px 8px', borderRadius:'5px'}}>🧠 HW + CI</span>
                </div>
                <div className="chart-container-card">
                  <svg viewBox="0 0 560 180" className="chart-svg">
                    <defs>
                      <linearGradient id="irrGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {[0.25,0.5,0.75,1.0].map(f => (
                      <line key={f} x1="30" y1={20+f*140} x2="530" y2={20+f*140} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                    ))}
                    {(() => {
                      const fc = (result.lstm_forecast?.predictions?.length ? result.lstm_forecast.predictions : result.income_forecast) || [];
                      if (!fc.length) return null;
                      const key = fc[0].lstm_predicted_income !== undefined ? 'lstm_predicted_income' : 'forecasted_income';
                      const maxVal = Math.max(...fc.map(f => f[key]), totalFixed*1.3, 1);
                      const baseY = 160-(totalFixed/maxVal)*140;
                      const pts = fc.map((f,i) => ({
                        x: 40+(i/(fc.length-1))*480,
                        y: 160-(f[key]/maxVal)*140,
                        month: MONTH_NAMES[f.calendar_month-1],
                        val: f[key],
                        peak: f.is_seasonal_peak
                      }));
                      const dLine = pts.reduce((acc,p,i) => i===0?`M ${p.x} ${p.y}`:`${acc} L ${p.x} ${p.y}`,'');
                      const dArea = `${dLine} L ${pts[pts.length-1].x} 160 L ${pts[0].x} 160 Z`;
                      return (
                        <>
                          <line x1="30" y1={baseY} x2="530" y2={baseY} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 3" />
                          <text x="525" y={baseY-4} textAnchor="end" fill="#f59e0b" fontSize="9">Bills: ₹{fmt(totalFixed)}</text>
                          <path d={dArea} fill="url(#irrGrad)" />
                          <path d={dLine} fill="none" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" />
                          {pts.map((p,i) => (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r={p.peak?'6':'4'} fill={p.peak?'#f59e0b':'#818cf8'} stroke="#080a11" strokeWidth="2" />
                              <text x={p.x} y="176" textAnchor="middle" fill="#94a3b8" fontSize="9">{p.month}</text>
                              <text x={p.x} y={p.y-10} textAnchor="middle" fill={p.peak?'#f59e0b':'#cbd5e1'} fontSize="8" fontWeight="bold">₹{Math.round(p.val/1000)}k</text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>

                {/* HW Forecast Legend + Stats */}
                {hwForecast && (
                  <div style={{ marginTop: '0.8rem' }}>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.73rem', background: 'rgba(99,102,241,0.12)', color: '#818cf8', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                        🧠 Holt-Winters · {hwForecast.seasonal}
                      </span>
                      <span style={{ fontSize: '0.73rem', background: 'rgba(16,185,129,0.1)', color: '#34d399', padding: '3px 8px', borderRadius: 6 }}>
                        Trend: {hwForecast.trend_direction} ({hwForecast.trend_slope_monthly >= 0 ? '+' : ''}₹{Math.round(hwForecast.trend_slope_monthly || 0)}/mo)
                      </span>
                      <span style={{ fontSize: '0.73rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '3px 8px', borderRadius: 6 }}>
                        ±₹{Math.round(hwForecast.residual_std || 0)} (1σ)
                      </span>
                    </div>
                    {/* HW Forecast table */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.4rem' }}>
                      {(hwForecast.forecast || []).map((f, i) => (
                        <div key={i} style={{
                          background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.45rem 0.6rem',
                          border: '1px solid rgba(255,255,255,0.07)'
                        }}>
                          <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b' }}>{f.month_label}</p>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem' }}>₹{Math.round(f.point || 0).toLocaleString('en-IN')}</p>
                          <p style={{ margin: 0, fontSize: '0.68rem', color: '#475569' }}>
                            ₹{Math.round(f.lower_80).toLocaleString('en-IN')} – ₹{Math.round(f.upper_80).toLocaleString('en-IN')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.lstm_forecast?.rmse && (
                  <div style={{display:'flex', gap:'0.8rem', marginTop:'0.5rem', flexWrap:'wrap'}}>
                    <span style={{fontSize:'0.73rem', color:'#64748b', background:'rgba(99,102,241,0.08)', padding:'3px 8px', borderRadius:'6px'}}>Model RMSE: ₹{fmt(Math.round(result.lstm_forecast.rmse))}</span>
                    <span style={{fontSize:'0.73rem', color:'#64748b', background:'rgba(52,211,153,0.08)', padding:'3px 8px', borderRadius:'6px'}}>R²: {result.lstm_forecast.r2_score}</span>
                    <span style={{fontSize:'0.73rem', color:'#64748b', background:'rgba(245,158,11,0.08)', padding:'3px 8px', borderRadius:'6px'}}>Range: ₹{fmt(result.lstm_forecast.predicted_min)}–₹{fmt(result.lstm_forecast.predicted_max)}</span>
                  </div>
                )}
              </div>

              {/* Interactive Inflow Allocator */}
              <div className="dash-card irr-allocator-card">
                <div className="dash-card-head">
                  <div>
                    <h3 className="dash-card-title">💸 Interactive Inflow Allocator</h3>
                    <p className="dash-card-desc">Enter any payment received — see exactly where every rupee should go</p>
                  </div>
                  <span style={{fontSize:'0.74rem', color:'#10b981', fontWeight:700, background:'rgba(16,185,129,0.1)', padding:'3px 8px', borderRadius:'5px'}}>Live Breakdown</span>
                </div>

                <div className="irr-alloc-input-row">
                  <span style={{color:'#94a3b8', fontSize:'1.1rem', fontWeight:700}}>₹</span>
                  <input
                    type="number"
                    className="irr-alloc-input"
                    value={inflowAmount}
                    onChange={e => setInflowAmount(e.target.value)}
                    placeholder={String(Math.round(result.mean_monthly_income))}
                  />
                  <span style={{fontSize:'0.8rem', color:'#64748b'}}>received this payment</span>
                </div>
                {alloc && (
                  <div className="irr-waterfall">
                    {[
                      { label:'🏛️ Tax Reserve', val: alloc.tax, color:'#ef4444', pct: Math.round(alloc.tax/Math.max(1,alloc.total)*100), note:`${result.owners_salary_system?.tax_withholding_rate_pct??15}% advance tax provision` },
                      { label:'🏠 Fixed Bills & EMI', val: alloc.fixed, color:'#f59e0b', pct: Math.round(alloc.fixed/Math.max(1,alloc.total)*100), note:'Rent, utilities, loan payments' },
                      { label:'🛡️ Buffer Tank', val: alloc.buffer, color:'#38bdf8', pct: Math.round(alloc.buffer/Math.max(1,alloc.total)*100), note:'Emergency fund & liquidity pool' },
                      { label:'🎉 Guilt-Free Spend', val: alloc.disc, color:'#10b981', pct: Math.round(alloc.disc/Math.max(1,alloc.total)*100), note:'100% safe to enjoy right now' },
                      { label:'📈 Wealth & Growth SIP', val: alloc.wealth, color:'#818cf8', pct: Math.round(alloc.wealth/Math.max(1,alloc.total)*100), note:'Investments, index funds, long-term' },
                    ].map((row,i) => (
                      <div key={i} className="irr-waterfall-row">
                        <div className="irr-waterfall-header">
                          <span className="irr-waterfall-label">{row.label}</span>
                          <div style={{display:'flex', gap:'0.5rem', alignItems:'center'}}>
                            <span style={{fontSize:'0.72rem', color:'#64748b'}}>{row.note}</span>
                            <strong style={{color:row.color, fontFamily:'Outfit,sans-serif', fontSize:'0.95rem'}}>₹{fmt(row.val)}</strong>
                          </div>
                        </div>
                        <div className="irr-waterfall-track">
                          <div className="irr-waterfall-fill" style={{width:`${row.pct}%`, background:row.color}} />
                        </div>
                        <span style={{fontSize:'0.7rem', color:'#475569'}}>{row.pct}% of inflow</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ─── ROW 3: Owner's Salary System + ML Cash Crunch Radar ─── */}
            <div className="dash-grid-2 dash-anim-2">
              {/* Owner's Salary & Income Smoothing System */}
              <div className="dash-card">
                <div className="dash-card-head">
                  <div>
                    <h3 className="dash-card-title">👔 Owner's Salary & Income Smoothing System</h3>
                    <p className="dash-card-desc">Your "Buffer Tank" strategy to eliminate feast-or-famine stress</p>
                  </div>
                  <span style={{fontSize:'0.74rem', color:'#f59e0b', fontWeight:700, background:'rgba(245,158,11,0.1)', padding:'3px 8px', borderRadius:'5px'}}>Anti-Stress</span>
                </div>

                <div className="irr-salary-system">
                  <div className="irr-salary-hero">
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:'0.75rem', color:'#64748b', marginBottom:'4px'}}>RECOMMENDED MONTHLY DRAW</div>
                      <div style={{fontSize:'2.2rem', fontWeight:800, color:'#f59e0b', fontFamily:'Outfit,sans-serif'}}>₹{fmt(result.owners_salary_system?.recommended_owners_salary??0)}</div>
                      <div style={{fontSize:'0.75rem', color:'#94a3b8', marginTop:'4px'}}>Pay yourself this on the 1st of every month</div>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:'0.75rem', color:'#64748b', marginBottom:'4px'}}>TAX RESERVE (WITHHOLD FIRST)</div>
                      <div style={{fontSize:'1.6rem', fontWeight:700, color:'#ef4444', fontFamily:'Outfit,sans-serif'}}>₹{fmt(result.owners_salary_system?.monthly_tax_reserve??0)}</div>
                      <div style={{fontSize:'0.75rem', color:'#94a3b8', marginTop:'4px'}}>{result.owners_salary_system?.tax_withholding_rate_pct??0}% advance tax @ current income</div>
                    </div>
                  </div>

                  <div className="irr-buffer-tank">
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem'}}>
                      <span style={{fontSize:'0.82rem', fontWeight:600, color:'#e2e8f0'}}>🛢️ Buffer Tank Health</span>
                      <span style={{fontSize:'0.78rem', color:'#38bdf8', fontWeight:700}}>{result.owners_salary_system?.buffer_fill_percentage??0}% Filled</span>
                    </div>
                    <div style={{height:'10px', background:'rgba(255,255,255,0.06)', borderRadius:'6px', overflow:'hidden'}}>
                      <div style={{height:'100%', width:`${result.owners_salary_system?.buffer_fill_percentage??0}%`, background:'linear-gradient(90deg,#38bdf8,#6366f1)', borderRadius:'6px', transition:'width 0.8s ease'}} />
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', marginTop:'6px'}}>
                      <span style={{fontSize:'0.72rem', color:'#64748b'}}>Current: ₹{fmt(result.owners_salary_system?.current_buffer_balance??0)}</span>
                      <span style={{fontSize:'0.72rem', color:'#64748b'}}>Target: ₹{fmt(result.owners_salary_system?.smoothing_buffer_target??0)}</span>
                    </div>
                    <div style={{marginTop:'0.8rem', padding:'0.7rem', background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'8px', fontSize:'0.78rem', color:'#fbbf24', lineHeight:1.5}}>
                      💡 {result.owners_salary_system?.philosophy}
                    </div>
                  </div>
                </div>
              </div>

              {/* ML Cash Crunch Radar */}
              <div className="dash-card">
                <div className="dash-card-head">
                  <div>
                    <h3 className="dash-card-title">⚡ ML Cash Crunch & Deficit Early Warning</h3>
                    <p className="dash-card-desc">Logistic Semi-Variance Risk Classifier — 60-day horizon</p>
                  </div>
                  <span style={{fontSize:'0.74rem', color: result.cash_crunch_model?.color, fontWeight:700, background:`${result.cash_crunch_model?.color}15`, padding:'3px 8px', borderRadius:'5px', border:`1px solid ${result.cash_crunch_model?.color}33`}}>
                    {result.cash_crunch_model?.badge}
                  </span>
                </div>

                <div className="irr-crunch-radar">
                  {/* Probability Gauge */}
                  <div className="irr-gauge-wrap">
                    <svg viewBox="0 0 200 120" style={{width:'180px', height:'108px'}}>
                      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" strokeLinecap="round"/>
                      {(() => {
                        const prob = result.cash_crunch_model?.probability_60d_pct ?? 0;
                        const pct = prob / 100;
                        const angle = Math.PI * pct;
                        const x = 100 - 80*Math.cos(angle);
                        const y = 100 - 80*Math.sin(angle);
                        const color = prob >= 50 ? '#ef4444' : prob >= 25 ? '#f59e0b' : '#10b981';
                        return <path d={`M 20 100 A 80 80 0 ${pct>0.5?1:0} 1 ${x} ${y}`} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"/>;
                      })()}
                      <text x="100" y="88" textAnchor="middle" fill={result.cash_crunch_model?.color} fontSize="26" fontWeight="800" fontFamily="Outfit,sans-serif">{result.cash_crunch_model?.probability_60d_pct}%</text>
                      <text x="100" y="108" textAnchor="middle" fill="#64748b" fontSize="9.5">Deficit Probability</text>
                      <text x="24" y="115" fill="#475569" fontSize="8">Low</text>
                      <text x="175" y="115" textAnchor="end" fill="#475569" fontSize="8">High</text>
                    </svg>
                  </div>

                  <div style={{flex:1, display:'flex', flexDirection:'column', gap:'0.6rem'}}>
                    <div style={{padding:'0.65rem', background:`${result.cash_crunch_model?.color}10`, border:`1px solid ${result.cash_crunch_model?.color}30`, borderRadius:'8px', fontSize:'0.8rem', color:'#e2e8f0', lineHeight:1.5}}>
                      📋 {result.cash_crunch_model?.action_recommendation}
                    </div>
                    <div className="irr-crunch-stats">
                      {[
                        { label:'Burn Rate', val:`₹${fmt(result.cash_crunch_model?.burn_rate_monthly??0)}/mo`, color:'#f87171' },
                        { label:'Buffer Runway', val:`${result.cash_crunch_model?.buffer_runway_months??0} months`, color:'#38bdf8' },
                        { label:'Downside σ', val:`₹${fmt(Math.round(result.cash_crunch_model?.downside_semi_std??0))}`, color:'#f59e0b' },
                      ].map((s,i) => (
                        <div key={i} style={{textAlign:'center', padding:'0.5rem', background:'rgba(255,255,255,0.03)', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.06)'}}>
                          <div style={{fontSize:'0.68rem', color:'#64748b', marginBottom:'3px'}}>{s.label}</div>
                          <div style={{fontSize:'0.88rem', fontWeight:700, color:s.color, fontFamily:'Outfit,sans-serif'}}>{s.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── ROW 4: 3-Tier Spending Blueprint ─── */}
            <div className="dash-card dash-anim-3">
              <div className="dash-card-head">
                <div>
                  <h3 className="dash-card-title">📋 3-Tier Spending & Saving Blueprint</h3>
                  <p className="dash-card-desc">Dynamic rulebook — exact rupee allocations for Lean, Normal, and Surge months</p>
                </div>
                <div style={{display:'flex', gap:'0.4rem'}}>
                  {['lean_month','normal_month','surge_month'].map((k,i) => (
                    <button key={k} onClick={() => setActiveBlueprint(k)} style={{fontSize:'0.73rem', padding:'4px 10px', borderRadius:'6px', border:`1px solid ${activeBlueprint===k ? ['#ef4444','#10b981','#f59e0b'][i]+'66' : 'rgba(255,255,255,0.1)'}`, background:activeBlueprint===k ? `${['#ef4444','#10b981','#f59e0b'][i]}15` : 'transparent', color:activeBlueprint===k ? ['#ef4444','#10b981','#f59e0b'][i] : '#64748b', cursor:'pointer', fontWeight:600, transition:'all 0.2s'}}>
                      {['🌧 Lean','☀ Normal','🚀 Surge'][i]}
                    </button>
                  ))}
                </div>
              </div>

              {(() => {
                const bp = result.spending_blueprints?.[activeBlueprint];
                if (!bp) return null;
                const colorMap = { lean_month:'#ef4444', normal_month:'#10b981', surge_month:'#f59e0b' };
                const accentColor = colorMap[activeBlueprint];
                const items = [
                  { label:'📥 Monthly Income', val: bp.income, color:'#94a3b8', icon:'Income' },
                  { label:'🏛️ Tax Reserve', val: bp.tax_reserve, color:'#ef4444', icon:'Tax' },
                  { label:'🏠 Fixed Bills & EMI', val: bp.fixed_bills, color:'#f59e0b', icon:'Fixed' },
                  { label:'🎉 Discretionary Spend', val: bp.discretionary_spend, color:'#10b981', icon:'Disc' },
                  { label:'🛡️ Buffer Savings', val: bp.buffer_net_flow, color:'#38bdf8', icon:'Buffer' },
                  { label:'📈 Growth SIP', val: bp.growth_sip, color:'#818cf8', icon:'SIP' },
                ];
                const maxVal = Math.max(...items.map(it => it.val), 1);
                return (
                  <div style={{marginTop:'1rem'}}>
                    <div style={{padding:'0.7rem 1rem', background:`${accentColor}10`, border:`1px solid ${accentColor}30`, borderRadius:'10px', marginBottom:'1rem', fontSize:'0.82rem', color:accentColor, fontWeight:600}}>
                      🧭 {bp.rule}
                    </div>
                    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'0.65rem'}}>
                      {items.map((it,i) => (
                        <div key={i} style={{padding:'0.75rem', background:'rgba(255,255,255,0.03)', borderRadius:'10px', border:'1px solid rgba(255,255,255,0.06)'}}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px'}}>
                            <span style={{fontSize:'0.78rem', color:'#94a3b8'}}>{it.label}</span>
                            <strong style={{color:it.color, fontFamily:'Outfit,sans-serif', fontSize:'1rem'}}>₹{fmt(Math.round(it.val))}</strong>
                          </div>
                          <div style={{height:'6px', background:'rgba(255,255,255,0.05)', borderRadius:'4px', overflow:'hidden'}}>
                            <div style={{height:'100%', width:`${Math.round((it.val/maxVal)*100)}%`, background:it.color, borderRadius:'4px', transition:'width 0.6s ease'}} />
                          </div>
                          <div style={{fontSize:'0.68rem', color:'#475569', marginTop:'4px'}}>{Math.round((it.val/Math.max(1,bp.income))*100)}% of monthly income</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ─── ROW 5: Safe Spending Thresholds + Expense Cutback Ladder ─── */}
            <div className="dash-grid-2 dash-anim-3">
              {/* Safe Spending Thresholds */}
              <div className="dash-card">
                <div className="dash-card-head">
                  <div>
                    <h3 className="dash-card-title">🔒 Safe Monthly Spending Thresholds</h3>
                    <p className="dash-card-desc">ML-backed guardrails to prevent slipping into debt</p>
                  </div>
                </div>
                <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.7rem', marginTop:'0.8rem'}}>
                  {[
                    { label:'🔒 Ultra-Safe', val: result.safe_spending?.ultra_safe_spending||0, color:'#38bdf8', note:'During lean dips' },
                    { label:'✅ Safe Ceiling', val: result.safe_spending?.safe_monthly_spending||0, color:'#34d399', note:'Normal months' },
                    { label:'📊 Discretionary', val: result.safe_spending?.discretionary_budget_avg||0, color:'#f59e0b', note:'Leisure & flex' },
                  ].map((t,i) => (
                    <div key={i} style={{background:`${t.color}0d`, border:`1px solid ${t.color}30`, borderRadius:'10px', padding:'0.8rem', textAlign:'center'}}>
                      <div style={{fontSize:'0.72rem', color:'#94a3b8'}}>{t.label}</div>
                      <strong style={{color:t.color, fontSize:'1.05rem', display:'block', marginTop:'4px', fontFamily:'Outfit,sans-serif'}}>₹{fmt(t.val)}</strong>
                      <span style={{fontSize:'0.68rem', color:'#64748b'}}>{t.note}</span>
                    </div>
                  ))}
                </div>

                <div style={{marginTop:'1rem'}}>
                  <div style={{fontSize:'0.8rem', color:'#94a3b8', fontWeight:600, marginBottom:'0.5rem'}}>Adaptive 2-Bucket Cashflow Split</div>
                  <div className="donut-breakdown-row">
                    <div className="donut-svg-wrap">
                      <svg width="130" height="130" viewBox="0 0 160 160">
                        {(() => {
                          const safeVal = result.adaptive_strategy?.conservative_allocation_Rs||5000;
                          const growVal = result.adaptive_strategy?.growth_allocation_Rs||15000;
                          const total = safeVal+growVal||1;
                          const safePct = safeVal/total;
                          const angle = safePct*360;
                          const r=65,cx=80,cy=80,innerR=45;
                          const toRad=(a)=>(a*Math.PI)/180;
                          const x1=cx+r*Math.cos(toRad(0)), y1=cy+r*Math.sin(toRad(0));
                          const x2=cx+r*Math.cos(toRad(angle)), y2=cy+r*Math.sin(toRad(angle));
                          const ix1=cx+innerR*Math.cos(toRad(0)), iy1=cy+innerR*Math.sin(toRad(0));
                          const ix2=cx+innerR*Math.cos(toRad(angle)), iy2=cy+innerR*Math.sin(toRad(angle));
                          const large=angle>180?1:0;
                          const d1=`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1} Z`;
                          const d2=`M ${x2} ${y2} A ${r} ${r} 0 ${large?0:1} 1 ${x1} ${y1} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${large?0:1} 0 ${ix2} ${iy2} Z`;
                          return <><path d={d1} fill="#38bdf8"/><path d={d2} fill="#10b981"/></>;
                        })()}
                      </svg>
                      <div className="donut-svg-center">
                        <span className="donut-svg-center-val" style={{fontSize:'0.9rem', color:'#34d399'}}>₹{fmt(result.adaptive_strategy?.savings_capacity_per_month??0)}</span>
                        <span className="donut-svg-center-lbl">Surplus</span>
                      </div>
                    </div>
                    <div className="donut-legend-list">
                      {[
                        { dot:'#38bdf8', label:'Safe Bucket (Liquid/FD)', val: result.adaptive_strategy?.conservative_allocation_Rs??0, sub:'Easy Access' },
                        { dot:'#10b981', label:'Growth Bucket (SIP/MF)', val: result.adaptive_strategy?.growth_allocation_Rs??0, sub:'Long Term' },
                      ].map((l,i) => (
                        <div key={i} className="donut-legend-row">
                          <div className="donut-legend-left"><span className="donut-legend-dot" style={{background:l.dot}}/><span>{l.label}</span></div>
                          <div className="donut-legend-right"><span className="donut-legend-val">₹{fmt(l.val)}</span><span className="donut-legend-pct">{l.sub}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expense Cutback Ladder */}
              <div className="dash-card">
                <div className="dash-card-head">
                  <div>
                    <h3 className="dash-card-title">🪜 Expense Priority & Cutback Ladder</h3>
                    <p className="dash-card-desc">What to freeze first when a slow month hits</p>
                  </div>
                </div>

                <div style={{display:'flex', flexDirection:'column', gap:'0.75rem', marginTop:'0.8rem'}}>
                  {(result.expense_cutback_ladder||[]).map((rung,i) => {
                    const colors = ['#ef4444','#f59e0b','#34d399'];
                    const bgs = ['rgba(239,68,68,0.08)','rgba(245,158,11,0.08)','rgba(52,211,153,0.08)'];
                    const borders = ['rgba(239,68,68,0.25)','rgba(245,158,11,0.25)','rgba(52,211,153,0.25)'];
                    return (
                      <div key={i} style={{padding:'0.8rem', background:bgs[i], border:`1px solid ${borders[i]}`, borderRadius:'12px'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem'}}>
                          <div style={{display:'flex', alignItems:'center', gap:'0.6rem'}}>
                            <div style={{width:'22px', height:'22px', borderRadius:'50%', background:colors[i], display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem', fontWeight:800, color:'#fff', flexShrink:0}}>
                              {rung.priority}
                            </div>
                            <div>
                              <div style={{fontSize:'0.82rem', fontWeight:700, color:colors[i]}}>{rung.level}</div>
                              <div style={{fontSize:'0.72rem', color:'#64748b'}}>{rung.category}</div>
                            </div>
                          </div>
                          {i < 2 && <span style={{fontSize:'0.7rem', color:colors[i], background:`${colors[i]}20`, padding:'2px 7px', borderRadius:'5px', fontWeight:600}}>Cut {rung.target_savings_pct}%</span>}
                          {i === 2 && <span style={{fontSize:'0.7rem', color:'#34d399', background:'rgba(52,211,153,0.1)', padding:'2px 7px', borderRadius:'5px', fontWeight:600}}>🔒 Protect</span>}
                        </div>
                        <div style={{display:'flex', flexWrap:'wrap', gap:'0.35rem', marginBottom:'0.5rem'}}>
                          {rung.items.map((item,j) => (
                            <span key={j} style={{fontSize:'0.7rem', color:'#94a3b8', background:'rgba(255,255,255,0.05)', padding:'2px 8px', borderRadius:'5px', border:'1px solid rgba(255,255,255,0.07)'}}>
                              {item}
                            </span>
                          ))}
                        </div>
                        <div style={{fontSize:'0.73rem', color:'#94a3b8', fontStyle:'italic'}}>{rung.impact}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ─── ROW 6: Emergency Fund Status + AI Advisory ─── */}
            <div className="dash-grid-2 dash-anim-3">
              {/* Emergency Fund */}
              <div className="dash-card">
                <div className="dash-card-head">
                  <div>
                    <h3 className="dash-card-title">🛡️ Emergency Buffer Status</h3>
                    <p className="dash-card-desc">{result.emergency_fund?.cushion_months}-month target based on your income volatility</p>
                  </div>
                  <span className={`kpi-badge ${result.emergency_fund?.gap>0?'warn':'up'}`}>{result.emergency_fund?.status}</span>
                </div>

                <div style={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'0.7rem', marginTop:'0.8rem'}}>
                  {[
                    { label:'Current Balance', val:`₹${fmt(result.emergency_fund?.current_amount||0)}`, color:'#94a3b8' },
                    { label:'Target Amount', val:`₹${fmt(result.emergency_fund?.recommended_amount||0)}`, color:'#f59e0b' },
                    { label:'Gap to Fill', val: result.emergency_fund?.gap>0?`₹${fmt(result.emergency_fund.gap)}`:'✅ Met', color: result.emergency_fund?.gap>0?'#f87171':'#34d399' },
                    { label:'Months to Fill', val: result.emergency_fund?.months_to_fill>0?`${result.emergency_fund.months_to_fill} months`:'Already Done ✓', color:'#818cf8' },
                  ].map((s,i) => (
                    <div key={i} style={{padding:'0.65rem', background:'rgba(255,255,255,0.03)', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.07)'}}>
                      <div style={{fontSize:'0.7rem', color:'#64748b', marginBottom:'3px'}}>{s.label}</div>
                      <div style={{fontSize:'1rem', fontWeight:700, color:s.color, fontFamily:'Outfit,sans-serif'}}>{s.val}</div>
                    </div>
                  ))}
                </div>

                <div style={{marginTop:'0.8rem'}}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
                    <span style={{fontSize:'0.75rem', color:'#64748b'}}>Buffer Coverage</span>
                    <span style={{fontSize:'0.75rem', color:'#38bdf8', fontWeight:600}}>{Math.min(100,Math.round((result.emergency_fund?.current_amount||0)/(result.emergency_fund?.recommended_amount||1)*100))}%</span>
                  </div>
                  <div style={{height:'8px', background:'rgba(255,255,255,0.06)', borderRadius:'5px', overflow:'hidden'}}>
                    <div style={{height:'100%', width:`${Math.min(100,Math.round((result.emergency_fund?.current_amount||0)/(result.emergency_fund?.recommended_amount||1)*100))}%`, background:'linear-gradient(90deg,#38bdf8,#34d399)', borderRadius:'5px'}} />
                  </div>
                </div>

                <div style={{marginTop:'0.8rem', padding:'0.7rem', background:'rgba(56,189,248,0.06)', border:'1px solid rgba(56,189,248,0.2)', borderRadius:'8px', fontSize:'0.78rem', color:'#7dd3fc', lineHeight:1.5}}>
                  ⚡ Shock Risk: <strong>{result.shock_analysis?.shock_probability_pct}%</strong> of past months had income below fixed costs ({result.shock_analysis?.bad_months_count} months). Keep your {result.emergency_fund?.cushion_months}-month buffer funded.
                </div>
              </div>

              {/* AI Advisory */}
              <div className="dash-card">
                <div className="dash-card-head">
                  <div>
                    <h3 className="dash-card-title">🧠 AI Contingency Intelligence & Directives</h3>
                    <p className="dash-card-desc">Personalized rulebook for {selectedCategory?.label?.toLowerCase()}</p>
                  </div>
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:'0.55rem', marginTop:'0.8rem'}}>
                  {(result.ai_advisory||[]).map((tip,i) => (
                    <div key={i} className="suggestion-item-v2" style={{padding:'0.7rem'}}>
                      <div className="sug-v2-main">
                        <div className="sug-v2-info">
                          <p className="sug-v2-detail" style={{fontSize:'0.79rem', color:'#e2e8f0', lineHeight:1.45}}>{tip}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </main>
        </div>
      )}
    </div>
  );
}
