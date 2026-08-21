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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n) {
  return Number(n).toLocaleString('en-IN');
}

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

// ─── Sub-components ──────────────────────────────────────────────────────────
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

function ScorePill({ value, max = 1, label, color }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="irr2-score-pill">
      <div className="irr2-score-pill-header">
        <span>{label}</span>
        <strong style={{ color }}>{typeof value === 'number' && value < 10 ? value.toFixed(2) : fmt(value)}</strong>
      </div>
      <div className="irr2-progress-track">
        <div className="irr2-progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function TipBox({ icon, title, children, color = '#818cf8' }) {
  return (
    <div className="irr2-tip-box" style={{ borderLeftColor: color }}>
      <div className="irr2-tip-title" style={{ color }}>
        <span>{icon}</span> {title}
      </div>
      <div className="irr2-tip-body">{children}</div>
    </div>
  );
}

function ResultSection({ icon, title, children }) {
  return (
    <div className="irr2-result-section">
      <div className="irr2-result-section-title">
        <span>{icon}</span> {title}
      </div>
      {children}
    </div>
  );
}

import { useAuth } from './context/AuthContext';
import { Link } from 'react-router-dom';

// ─── Main Component ───────────────────────────────────────────────────────────
export default function IrregularIncomeDashboard() {
  const { user, getEngineData, saveEngineData } = useAuth();
  const [step, setStep]         = useState(1);   // 1=income, 2=profile, 3=seasonal
  const [submitted, setSubmitted] = useState(false);

  const defaultHistory = '65000, 85000, 42000, 110000, 58000, 95000, 38000, 125000, 70000, 90000, 48000, 115000';
  const defaultVals = [65000, 85000, 42000, 110000, 58000, 95000, 38000, 125000, 70000, 90000, 48000, 115000];

  // Step 1 — Income history
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

  // Step 2 — Profile
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

  // Step 3 — Seasonal (optional)
  const [seasonalMonths, setSeasonalMonths] = useState(() => {
    const stored = getEngineData ? getEngineData('irregular_income') : null;
    return stored?.seasonal_months ?? [];
  });

  const [isAutofilled, setIsAutofilled] = useState(() => {
    return Boolean(getEngineData && getEngineData('irregular_income'));
  });

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

  // Result / loading
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // ── Step 1 handlers ─────────────────────────────────────────────────────
  const handleHistoryChange = (raw) => {
    setHistoryInput(raw);
    const { vals, error: err } = parseIncomeString(raw);
    setHistoryError(err);
    if (vals) setHistoryVals(vals);
    else      setHistoryVals([]);
  };

  const canGoStep2 = historyVals.length >= 3 && !historyError;
  const canGoStep3 = fixedExpenses !== '' && emergencyFund !== '';

  // ── Toggle seasonal month ────────────────────────────────────────────────
  const toggleMonth = (m) =>
    setSeasonalMonths(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );

  // ── Submit ───────────────────────────────────────────────────────────────
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

      // Save to profile
      if (saveEngineData) {
        saveEngineData('irregular_income', {
          ...payload,
          historyInput
        });
      }

      const res = await fetch('http://localhost:8000/api/irregular-income/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
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

  // ── derived ─────────────────────────────────────────────────────────────
  const totalFixed = (Number(fixedExpenses) || 0) + (Number(emiCommitments) || 0);
  const selectedCategory = CATEGORY_OPTIONS.find(c => c.value === incomeCategory);

  // ── Stability color helper (simple words) ─────────────────────────────
  const stabilityWord = (score) =>
    score >= 0.80 ? { word: 'Very Stable 🟢', color: '#34d399' }
    : score >= 0.60 ? { word: 'Fairly Stable 🔵', color: '#60a5fa' }
    : score >= 0.40 ? { word: 'Moderate Risk 🟡', color: '#f59e0b' }
    : { word: 'High Risk 🔴', color: '#f87171' };

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════════
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
          <p>Smart buffering, floor income stabilization &amp; volatile cash flow planner</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          {user && (
            <div style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8', fontSize: '0.8rem', fontWeight: 600, padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
              <span>👤 {user.name}</span>
            </div>
          )}
          {result && (
            <button className="irr2-reset-btn" onClick={handleReset}>🔄 Start Over</button>
          )}
        </div>
      </div>

      {/* ═══════════════════ INPUT FORM ═══════════════════ */}
      {!submitted && (
        <div className="irr2-form-wrapper">

          {/* Autofill Notification */}
          {isAutofilled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.82rem', fontWeight: 600, padding: '0.6rem 1.2rem', borderRadius: '100px', marginBottom: '1.2rem', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)' }}>
              <span>✨ Income history & expenses restored from your saved model. Edit any value.</span>
            </div>
          )}

          {/* 1-Click Fast Presets on Step 1 */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem', width: '100%' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ⚡ 1-Click Income Flow Presets:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.6rem' }}>
                <button
                  type="button"
                  style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f1f5f9', fontSize: '0.82rem', fontWeight: 600, padding: '0.5rem 0.9rem', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}
                  onClick={() => applyIrregularPreset({
                    historyInput: '75000, 120000, 45000, 95000, 140000, 60000, 110000, 85000, 130000, 50000, 105000, 90000',
                    vals: [75000, 120000, 45000, 95000, 140000, 60000, 110000, 85000, 130000, 50000, 105000, 90000],
                    category: 'freelance',
                    fixed: 40000,
                    emis: 15000,
                    fund: 150000
                  })}
                >
                  💻 Tech Freelancer (₹45k–₹1.4L)
                </button>
                <button
                  type="button"
                  style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f1f5f9', fontSize: '0.82rem', fontWeight: 600, padding: '0.5rem 0.9rem', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}
                  onClick={() => applyIrregularPreset({
                    historyInput: '55000, 60000, 48000, 72000, 50000, 65000, 58000, 80000, 52000, 68000, 60000, 75000',
                    vals: [55000, 60000, 48000, 72000, 50000, 65000, 58000, 80000, 52000, 68000, 60000, 75000],
                    category: 'gig',
                    fixed: 30000,
                    emis: 8000,
                    fund: 80000
                  })}
                >
                  🛵 Gig Worker / Driver (₹48k–₹80k)
                </button>
                <button
                  type="button"
                  style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f1f5f9', fontSize: '0.82rem', fontWeight: 600, padding: '0.5rem 0.9rem', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}
                  onClick={() => applyIrregularPreset({
                    historyInput: '35000, 40000, 30000, 220000, 280000, 310000, 45000, 50000, 240000, 290000, 40000, 35000',
                    vals: [35000, 40000, 30000, 220000, 280000, 310000, 45000, 50000, 240000, 290000, 40000, 35000],
                    category: 'seasonal',
                    fixed: 50000,
                    emis: 20000,
                    fund: 300000
                  })}
                >
                  🛍️ Seasonal Merchant (₹30k–₹3.1L Festival Surge)
                </button>
              </div>
            </div>
          )}

          {/* Step Progress */}
          <div className="irr2-steps-bar">
            <StepDot num={1} active={step === 1} done={step > 1} />
            <div className={`irr2-step-line ${step > 1 ? 'done' : ''}`} />
            <StepDot num={2} active={step === 2} done={step > 2} />
            <div className={`irr2-step-line ${step > 2 ? 'done' : ''}`} />
            <StepDot num={3} active={step === 3} done={false} />
          </div>
          <div className="irr2-steps-labels">
            <span className={step === 1 ? 'irr2-step-lbl-active' : ''}>Your Income</span>
            <span className={step === 2 ? 'irr2-step-lbl-active' : ''}>Your Expenses</span>
            <span className={step === 3 ? 'irr2-step-lbl-active' : ''}>Seasonal (optional)</span>
          </div>

          <div className="irr2-form-card">

            {/* ── STEP 1: Income History ── */}
            {step === 1 && (
              <div className="irr2-step-content">
                <div className="irr2-step-heading">
                  <span className="irr2-step-icon">📊</span>
                  <div>
                    <h2>Tell us your income for the last few months</h2>
                    <p>Enter your monthly income numbers (6–24 months works best). Your income doesn't need to be the same each month — that's perfectly fine!</p>
                  </div>
                </div>

                <div className="irr2-field">
                  <label className="irr2-label">
                    Monthly Income — Enter each month's income separated by commas
                  </label>
                  <textarea
                    className={`irr2-textarea ${historyError ? 'irr2-error-border' : historyVals.length >= 3 ? 'irr2-ok-border' : ''}`}
                    value={historyInput}
                    onChange={e => handleHistoryChange(e.target.value)}
                    rows={3}
                    placeholder="e.g.  42000, 38000, 55000, 31000, 62000, 47000"
                  />
                  {historyError && <div className="irr2-field-error">⚠ {historyError}</div>}
                  {historyVals.length >= 3 && !historyError && (
                    <div className="irr2-field-ok">
                      ✅ {historyVals.length} months entered &nbsp;|&nbsp;
                      Lowest: ₹{fmt(Math.min(...historyVals))} &nbsp;|&nbsp;
                      Highest: ₹{fmt(Math.max(...historyVals))}
                    </div>
                  )}
                </div>

                {historyVals.length >= 3 && (
                  <MiniBarChart values={historyVals} threshold={totalFixed} />
                )}

                <div className="irr2-field" style={{ marginTop: '1.25rem' }}>
                  <label className="irr2-label">What best describes how you earn?</label>
                  <div className="irr2-category-grid">
                    {CATEGORY_OPTIONS.map(cat => (
                      <button
                        key={cat.value}
                        className={`irr2-cat-btn ${incomeCategory === cat.value ? 'active' : ''}`}
                        onClick={() => setIncomeCategory(cat.value)}
                      >
                        <span className="irr2-cat-icon">{cat.icon}</span>
                        <span className="irr2-cat-label">{cat.label}</span>
                        <span className="irr2-cat-desc">{cat.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="irr2-form-nav">
                  <div />
                  <button
                    className="irr2-next-btn"
                    disabled={!canGoStep2}
                    onClick={() => setStep(2)}
                  >
                    Next — Your Expenses →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Profile ── */}
            {step === 2 && (
              <div className="irr2-step-content">
                <div className="irr2-step-heading">
                  <span className="irr2-step-icon">💸</span>
                  <div>
                    <h2>What do you spend &amp; owe each month?</h2>
                    <p>This helps us figure out how much you actually have left to save and invest after your bills are paid.</p>
                  </div>
                </div>

                <div className="irr2-two-col">
                  <div className="irr2-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="irr2-label">
                        Fixed Monthly Expenses (₹)
                      </label>
                      <span style={{ fontSize: '0.78rem', color: '#818cf8', fontWeight: 700 }}>
                        ₹{fmt(fixedExpenses || 0)}/mo
                      </span>
                    </div>
                    <input
                      className="irr2-input"
                      type="number"
                      min="0"
                      value={fixedExpenses}
                      onChange={e => setFixedExpenses(e.target.value)}
                      placeholder="e.g. 25000"
                    />
                    <input
                      type="range"
                      min="5000"
                      max="200000"
                      step="2000"
                      value={Number(fixedExpenses) || 0}
                      onChange={e => setFixedExpenses(e.target.value)}
                      className="adv-range-slider"
                      style={{ accentColor: '#6366f1', marginTop: '6px' }}
                    />
                  </div>
                  <div className="irr2-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="irr2-label">
                        Monthly Loan Payments / EMIs (₹)
                      </label>
                      <span style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 700 }}>
                        ₹{fmt(emiCommitments || 0)}/mo
                      </span>
                    </div>
                    <input
                      className="irr2-input"
                      type="number"
                      min="0"
                      value={emiCommitments}
                      onChange={e => setEmiCommitments(e.target.value)}
                      placeholder="e.g. 5000  (enter 0 if none)"
                    />
                    <input
                      type="range"
                      min="0"
                      max="150000"
                      step="1000"
                      value={Number(emiCommitments) || 0}
                      onChange={e => setEmiCommitments(e.target.value)}
                      className="adv-range-slider"
                      style={{ accentColor: '#f59e0b', marginTop: '6px' }}
                    />
                  </div>
                </div>

                <div className="irr2-field" style={{ marginTop: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="irr2-label">
                      Emergency Savings Balance (₹)
                    </label>
                    <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 700 }}>
                      ₹{fmt(emergencyFund || 0)}
                    </span>
                  </div>
                  <input
                    className="irr2-input"
                    type="number"
                    min="0"
                    value={emergencyFund}
                    onChange={e => setEmergencyFund(e.target.value)}
                    placeholder="e.g. 50000  (enter 0 if none)"
                  />
                  <input
                    type="range"
                    min="0"
                    max="1500000"
                    step="10000"
                    value={Number(emergencyFund) || 0}
                    onChange={e => setEmergencyFund(e.target.value)}
                    className="adv-range-slider"
                    style={{ accentColor: '#34d399', marginTop: '6px' }}
                  />
                </div>

                {fixedExpenses && (
                  <div className="irr2-expense-summary">
                    <div className="irr2-expense-row">
                      <span>Fixed Expenses</span>
                      <strong>₹{fmt(fixedExpenses)}</strong>
                    </div>
                    <div className="irr2-expense-row">
                      <span>Loan Payments</span>
                      <strong>₹{fmt(emiCommitments || 0)}</strong>
                    </div>
                    <div className="irr2-expense-row total">
                      <span>Total Monthly Commitments</span>
                      <strong style={{ color: '#f87171' }}>₹{fmt(totalFixed)}</strong>
                    </div>

                    {/* Live Emergency Buffer Coverage Meter */}
                    <div style={{ marginTop: '0.8rem', background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.25)', borderRadius: '10px', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Emergency Buffer Runway:</span>
                      <strong style={{ fontSize: '0.98rem', color: '#34d399', fontFamily: 'Outfit, sans-serif' }}>
                        {totalFixed > 0 ? ((Number(emergencyFund) || 0) / totalFixed).toFixed(1) : 0} Months of Expenses Covered
                      </strong>
                    </div>
                  </div>
                )}

                <div className="irr2-form-nav">
                  <button className="irr2-back-step-btn" onClick={() => setStep(1)}>← Back</button>
                  <button
                    className="irr2-next-btn"
                    disabled={!canGoStep3}
                    onClick={() => setStep(3)}
                  >
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
                    <p>Select months when you typically get more work or higher income — like festival seasons, summer rush, or contract periods. Skip if not applicable.</p>
                  </div>
                </div>

                <div className="irr2-month-grid">
                  {MONTH_NAMES.map((m, i) => (
                    <button
                      key={i}
                      className={`irr2-month-btn ${seasonalMonths.includes(i + 1) ? 'active' : ''}`}
                      onClick={() => toggleMonth(i + 1)}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {seasonalMonths.length > 0 && (
                  <div className="irr2-seasonal-selected">
                    🌟 Peak months: {seasonalMonths.map(m => MONTH_NAMES[m - 1]).join(', ')}
                  </div>
                )}

                {/* Summary before submit */}
                <div className="irr2-submit-summary">
                  <div className="irr2-summary-row">
                    <span>📊 Income months entered</span>
                    <strong>{historyVals.length} months</strong>
                  </div>
                  <div className="irr2-summary-row">
                    <span>👤 Earner type</span>
                    <strong>{selectedCategory?.icon} {selectedCategory?.label}</strong>
                  </div>
                  <div className="irr2-summary-row">
                    <span>💸 Monthly commitments</span>
                    <strong>₹{fmt(totalFixed)}</strong>
                  </div>
                  <div className="irr2-summary-row">
                    <span>🛡 Emergency savings</span>
                    <strong>₹{fmt(emergencyFund || 0)}</strong>
                  </div>
                </div>

                <div className="irr2-form-nav">
                  <button className="irr2-back-step-btn" onClick={() => setStep(2)}>← Back</button>
                  <button className="irr2-submit-btn" onClick={handleSubmit}>
                    ✨ Get My Plan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════ LOADING ═══════════════════ */}
      {submitted && loading && (
        <div className="irr2-loading-screen">
          <div className="irr2-spinner" />
          <h3>Analysing your income pattern...</h3>
          <p>Building your personalised saving &amp; investment plan 🔍</p>
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
              <div className="eng-nav-icon">🛡️</div>
              FINEXO · <span>Cashflow & Emergency Buffer Intelligence</span>
            </Link>
            <div className="eng-nav-right">
              {user && (
                <span style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 600, background: 'rgba(99,102,241,0.12)', padding: '0.35rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.25)' }}>
                  👤 {user.name}
                </span>
              )}
              <button className="eng-btn-ghost" onClick={handleReset}>
                ← Re-Analyse
              </button>
              <button className="eng-btn-primary" onClick={() => window.print()}>
                Export Plan 📄
              </button>
            </div>
          </header>

          <main className="eng-dash-body">
            {/* Top Heading */}
            <div className="eng-dash-header-row dash-anim-1">
              <div className="eng-dash-title-wrap">
                <h1>Variable Income Stabilization & Emergency Runway Cockpit</h1>
                <p>{selectedCategory?.icon} {selectedCategory?.label} Track · {result.sample_months} Months Telemetry · Adaptive 2-Tier Cashflow Split</p>
              </div>
              <div className="eng-dash-actions">
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: stabilityWord(result.stability_score).color, background: 'rgba(255,255,255,0.04)', padding: '0.4rem 0.9rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  ISS Stability: {(result.stability_score * 100).toFixed(0)}% ({stabilityWord(result.stability_score).word})
                </span>
              </div>
            </div>

            {/* ── ROW 1: 4 KPI Cards ── */}
            <div className="kpi-row-4 dash-anim-1">
              {/* Card 1: Average Monthly Income */}
              <div className="kpi-card">
                <div className="kpi-top">
                  <span className="kpi-label">AVERAGE MONTHLY INCOME</span>
                  <span className="kpi-badge info">{result.sample_months} Mo Baseline</span>
                </div>
                <div className="kpi-value blue">₹{fmt(result.mean_monthly_income)}</div>
                <div className="kpi-footer">
                  <span className="kpi-trend-text">Worst Month Floor: ₹{fmt(Math.max(0, result.shock_analysis?.shock_floor_2sigma ?? 0))}</span>
                  <span className="kpi-sub-desc">Historical revenue range across cycles</span>
                </div>
              </div>

              {/* Card 2: Stability Score */}
              <div className="kpi-card">
                <div className="kpi-top">
                  <span className="kpi-label">INCOME STABILITY SCORE (ISS)</span>
                  <span className="kpi-badge up">{stabilityWord(result.stability_score).word}</span>
                </div>
                <div className="kpi-value green">{(result.stability_score * 100).toFixed(0)}%</div>
                <div className="kpi-footer">
                  <span className="kpi-trend-text">Volatility Index: {((1 - result.stability_score) * 10).toFixed(1)}/10</span>
                  <span className="kpi-sub-desc">Lower variance allows higher growth SIP</span>
                </div>
              </div>

              {/* Card 3: Monthly Savings Capacity */}
              <div className="kpi-card">
                <div className="kpi-top">
                  <span className="kpi-label">SURPLUS SAVINGS CAPACITY</span>
                  <span className={`kpi-badge ${result.adaptive_strategy?.savings_capacity_per_month >= 0 ? 'up' : 'down'}`}>
                    {result.adaptive_strategy?.base_savings_rate_pct ?? 25}% of Income
                  </span>
                </div>
                <div className={`kpi-value ${result.adaptive_strategy?.savings_capacity_per_month >= 0 ? 'green' : 'red'}`}>
                  ₹{fmt(Math.max(0, result.adaptive_strategy?.savings_capacity_per_month ?? 0))}/mo
                </div>
                <div className="kpi-footer">
                  <span className="kpi-trend-text">After ₹{fmt(totalFixed)} Fixed Commitments</span>
                  <span className="kpi-sub-desc">Investable capital in normal months</span>
                </div>
              </div>

              {/* Card 4: Emergency Fund Gap */}
              <div className="kpi-card">
                <div className="kpi-top">
                  <span className="kpi-label">EMERGENCY BUFFER RUNWAY</span>
                  <span className={`kpi-badge ${result.emergency_fund?.gap > 0 ? 'warn' : 'up'}`}>
                    {result.emergency_fund?.cushion_months} Mo Target
                  </span>
                </div>
                <div className={`kpi-value ${result.emergency_fund?.gap > 0 ? 'yellow' : 'green'}`}>
                  {result.emergency_fund?.gap > 0 ? `₹${fmt(result.emergency_fund.gap)} Gap` : '✅ Fully Covered'}
                </div>
                <div className="kpi-footer">
                  <span className="kpi-trend-text">Holding: ₹{fmt(result.emergency_fund?.current_amount || 0)} / ₹{fmt(result.emergency_fund?.recommended_amount || 0)}</span>
                  <span className="kpi-sub-desc">Vital protection against lean client months</span>
                </div>
              </div>
            </div>

            {/* ── ROW 2: Seasonal Forward Forecast + Adaptive Savings Split ── */}
            <div className="dash-grid-2 dash-anim-2">
              {/* Left: 6-Month Forward Income Forecast */}
              <div className="dash-card">
                <div className="dash-card-head">
                  <div>
                    <h3 className="dash-card-title">6-Month Forward Income & Seasonal Forecast</h3>
                    <p className="dash-card-desc">Predictive trend analysis with fixed expense commitments line</p>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#818cf8', fontWeight: 700, background: 'rgba(99,102,241,0.1)', padding: '3px 8px', borderRadius: '5px' }}>
                    Forward Simulation
                  </span>
                </div>

                <div className="chart-container-card">
                  <svg viewBox="0 0 560 180" className="chart-svg">
                    <defs>
                      <linearGradient id="irrGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {[0.25, 0.5, 0.75, 1.0].map(f => (
                      <line key={f} x1="30" y1={20 + f * 140} x2="530" y2={20 + f * 140} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                    ))}
                    {/* Fixed Commitments Baseline */}
                    {(() => {
                      const fc = result.income_forecast || [];
                      const maxVal = Math.max(...fc.map(f => f.forecasted_income), totalFixed * 1.3, 1);
                      const baseLineY = 160 - (totalFixed / maxVal) * 140;
                      return (
                        <g>
                          <line x1="30" y1={baseLineY} x2="530" y2={baseLineY} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 3" />
                          <text x="525" y={baseLineY - 4} textAnchor="end" fill="#f59e0b" fontSize="9">Fixed Bills: ₹{fmt(totalFixed)}</text>
                        </g>
                      );
                    })()}
                    {/* Forecasted Curve */}
                    {(() => {
                      const fc = result.income_forecast || [];
                      if (fc.length === 0) return null;
                      const maxVal = Math.max(...fc.map(f => f.forecasted_income), totalFixed * 1.3, 1);
                      const pts = fc.map((f, i) => ({
                        x: 40 + (i / (fc.length - 1)) * 480,
                        y: 160 - (f.forecasted_income / maxVal) * 140,
                        month: MONTH_NAMES[f.calendar_month - 1],
                        val: f.forecasted_income,
                        peak: f.is_seasonal_peak,
                      }));
                      const dLine = pts.reduce((acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
                      const dArea = `${dLine} L ${pts[pts.length - 1].x} 160 L ${pts[0].x} 160 Z`;
                      return (
                        <>
                          <path d={dArea} fill="url(#irrGrad)" />
                          <path d={dLine} fill="none" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" />
                          {pts.map((p, idx) => (
                            <g key={idx}>
                              <circle cx={p.x} cy={p.y} r={p.peak ? '6' : '4'} fill={p.peak ? '#f59e0b' : '#818cf8'} stroke="#080a11" strokeWidth="2" />
                              <text x={p.x} y="176" textAnchor="middle" fill="#94a3b8" fontSize="9">{p.month}</text>
                              <text x={p.x} y={p.y - 10} textAnchor="middle" fill={p.peak ? '#f59e0b' : '#cbd5e1'} fontSize="8" fontWeight="bold">
                                ₹{Math.round(p.val / 1000)}k
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>

              {/* Right: Adaptive 2-Bucket Savings Split */}
              <div className="dash-card">
                <div className="dash-card-head">
                  <div>
                    <h3 className="dash-card-title">Adaptive 2-Bucket Cashflow Split</h3>
                    <p className="dash-card-desc">Separates safe liquid reserves from long-term compounding SIP</p>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: '5px' }}>
                    Dynamic Buffer
                  </span>
                </div>

                <div className="donut-breakdown-row" style={{ marginTop: '0.8rem' }}>
                  {/* Visual Split Donut */}
                  <div className="donut-svg-wrap">
                    <svg width="160" height="160" viewBox="0 0 160 160">
                      {(() => {
                        const safeVal = result.adaptive_strategy?.conservative_allocation_Rs || 5000;
                        const growVal = result.adaptive_strategy?.growth_allocation_Rs || 15000;
                        const total = safeVal + growVal || 1;
                        const safePct = safeVal / total;
                        const angle = safePct * 360;
                        const r = 65, cx = 80, cy = 80, innerR = 45;
                        const toRad = (a) => (a * Math.PI) / 180;
                        const x1 = cx + r * Math.cos(toRad(0));
                        const y1 = cy + r * Math.sin(toRad(0));
                        const x2 = cx + r * Math.cos(toRad(angle));
                        const y2 = cy + r * Math.sin(toRad(angle));
                        const ix1 = cx + innerR * Math.cos(toRad(0));
                        const iy1 = cy + innerR * Math.sin(toRad(0));
                        const ix2 = cx + innerR * Math.cos(toRad(angle));
                        const iy2 = cy + innerR * Math.sin(toRad(angle));
                        const large = angle > 180 ? 1 : 0;
                        const d1 = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1} Z`;
                        const d2 = `M ${x2} ${y2} A ${r} ${r} 0 ${large ? 0 : 1} 1 ${x1} ${y1} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${large ? 0 : 1} 0 ${ix2} ${iy2} Z`;
                        return (
                          <>
                            <path d={d1} fill="#38bdf8" />
                            <path d={d2} fill="#10b981" />
                          </>
                        );
                      })()}
                    </svg>
                    <div className="donut-svg-center">
                      <span className="donut-svg-center-val" style={{ fontSize: '1rem', color: '#34d399' }}>₹{fmt(result.adaptive_strategy?.savings_capacity_per_month ?? 0)}</span>
                      <span className="donut-svg-center-lbl">Surplus/mo</span>
                    </div>
                  </div>

                  {/* Legend List */}
                  <div className="donut-legend-list">
                    <div className="donut-legend-row">
                      <div className="donut-legend-left">
                        <span className="donut-legend-dot" style={{ background: '#38bdf8' }} />
                        <span>Safe Bucket (Liquid / FD)</span>
                      </div>
                      <div className="donut-legend-right">
                        <span className="donut-legend-val">₹{fmt(result.adaptive_strategy?.conservative_allocation_Rs ?? 0)}</span>
                        <span className="donut-legend-pct">Easy Access</span>
                      </div>
                    </div>
                    <div className="donut-legend-row">
                      <div className="donut-legend-left">
                        <span className="donut-legend-dot" style={{ background: '#10b981' }} />
                        <span>Growth Bucket (SIP / MF)</span>
                      </div>
                      <div className="donut-legend-right">
                        <span className="donut-legend-val">₹{fmt(result.adaptive_strategy?.growth_allocation_Rs ?? 0)}</span>
                        <span className="donut-legend-pct">Long Term</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── ROW 3: Safe Spending Tiers + AI Risk Advisory ── */}
            <div className="dash-grid-2 dash-anim-3">
              {/* Left: Safe Monthly Spending Ceiling */}
              <div className="dash-card">
                <div className="dash-card-head">
                  <div>
                    <h3 className="dash-card-title">Safe Monthly Spending Thresholds</h3>
                    <p className="dash-card-desc">Statistical guardrails to prevent dipping into debt</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.7rem', marginTop: '0.8rem' }}>
                  <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '10px', padding: '0.8rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>🔒 Ultra-Safe</div>
                    <strong style={{ color: '#38bdf8', fontSize: '1rem', display: 'block', marginTop: '4px' }}>
                      ₹{fmt(result.safe_spending?.ultra_safe_spending || 0)}
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>During low-revenue dips</span>
                  </div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px', padding: '0.8rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>✅ Safe Ceiling</div>
                    <strong style={{ color: '#34d399', fontSize: '1rem', display: 'block', marginTop: '4px' }}>
                      ₹{fmt(result.safe_spending?.safe_monthly_spending || 0)}
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Normal months limit</span>
                  </div>
                  <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '10px', padding: '0.8rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>📊 Discretionary</div>
                    <strong style={{ color: '#f59e0b', fontSize: '1rem', display: 'block', marginTop: '4px' }}>
                      ₹{fmt(result.safe_spending?.discretionary_budget_avg || 0)}
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Leisure & flex spending</span>
                  </div>
                </div>
              </div>

              {/* Right: AI Contingency Advisory */}
              <div className="dash-card">
                <div className="dash-card-head">
                  <div>
                    <h3 className="dash-card-title">AI Contingency Intelligence & Directives</h3>
                    <p className="dash-card-desc">Personalized rulebook for irregular revenue earners</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.8rem' }}>
                  {(result.ai_advisory || []).slice(0, 3).map((tip, i) => (
                    <div key={i} className="suggestion-item-v2" style={{ padding: '0.75rem' }}>
                      <div className="sug-v2-main">
                        <span className="sug-v2-icon">{i === 0 ? '🛡️' : i === 1 ? '📈' : '⚡'}</span>
                        <div className="sug-v2-info">
                          <p className="sug-v2-detail" style={{ fontSize: '0.8rem', color: '#e2e8f0', lineHeight: 1.4 }}>{tip}</p>
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
