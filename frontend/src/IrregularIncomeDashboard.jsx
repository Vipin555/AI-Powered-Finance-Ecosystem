import React, { useState } from 'react';
import './irregular.css';

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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function IrregularIncomeDashboard() {
  const [step, setStep]         = useState(1);   // 1=income, 2=profile, 3=seasonal
  const [submitted, setSubmitted] = useState(false);

  // Step 1 — Income history
  const [historyInput, setHistoryInput]   = useState('');
  const [historyVals,  setHistoryVals]    = useState([]);
  const [historyError, setHistoryError]   = useState('');

  // Step 2 — Profile
  const [incomeCategory, setIncomeCategory] = useState('freelance');
  const [fixedExpenses,  setFixedExpenses]  = useState('');
  const [emiCommitments, setEmiCommitments] = useState('');
  const [emergencyFund,  setEmergencyFund]  = useState('');

  // Step 3 — Seasonal (optional)
  const [seasonalMonths, setSeasonalMonths] = useState([]);

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
      const res = await fetch('http://localhost:8000/api/irregular-income/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          income_history:          historyVals,
          income_category:         incomeCategory,
          fixed_monthly_expenses:  Number(fixedExpenses) || 0,
          emi_commitments:         Number(emiCommitments) || 0,
          current_emergency_fund:  Number(emergencyFund) || 0,
          seasonal_months:         seasonalMonths.length ? seasonalMonths : null,
        }),
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
    setHistoryInput('');
    setHistoryVals([]);
    setHistoryError('');
    setFixedExpenses('');
    setEmiCommitments('');
    setEmergencyFund('');
    setSeasonalMonths([]);
    setIncomeCategory('freelance');
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
  return (
    <div className="irr2-root">
      {/* ── Header ── */}
      <div className="irr2-header">
        <button className="irr2-back-btn" onClick={() => window.location.href = '/'}>← Back</button>
        <div className="irr2-header-center">
          <h1>Irregular Income Planner</h1>
          <p>Smart saving &amp; investing advice tailored for variable earners</p>
        </div>
        {result && (
          <button className="irr2-reset-btn" onClick={handleReset}>🔄 Start Over</button>
        )}
      </div>

      {/* ═══════════════════ INPUT FORM ═══════════════════ */}
      {!submitted && (
        <div className="irr2-form-wrapper">

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
                    <label className="irr2-label">
                      Fixed Monthly Expenses (₹)
                      <span className="irr2-hint">Rent, groceries, utilities, subscriptions</span>
                    </label>
                    <input
                      className="irr2-input"
                      type="number"
                      min="0"
                      value={fixedExpenses}
                      onChange={e => setFixedExpenses(e.target.value)}
                      placeholder="e.g. 25000"
                    />
                  </div>
                  <div className="irr2-field">
                    <label className="irr2-label">
                      Monthly Loan Payments / EMIs (₹)
                      <span className="irr2-hint">Home loan, car loan, personal loan</span>
                    </label>
                    <input
                      className="irr2-input"
                      type="number"
                      min="0"
                      value={emiCommitments}
                      onChange={e => setEmiCommitments(e.target.value)}
                      placeholder="e.g. 5000  (enter 0 if none)"
                    />
                  </div>
                </div>

                <div className="irr2-field">
                  <label className="irr2-label">
                    Emergency Savings you already have (₹)
                    <span className="irr2-hint">Money kept aside for emergencies — in FD, savings a/c etc.</span>
                  </label>
                  <input
                    className="irr2-input"
                    type="number"
                    min="0"
                    value={emergencyFund}
                    onChange={e => setEmergencyFund(e.target.value)}
                    placeholder="e.g. 50000  (enter 0 if none)"
                  />
                </div>

                {fixedExpenses && emiCommitments && (
                  <div className="irr2-expense-summary">
                    <div className="irr2-expense-row">
                      <span>Fixed Expenses</span>
                      <strong>₹{fmt(fixedExpenses)}</strong>
                    </div>
                    <div className="irr2-expense-row">
                      <span>Loan Payments</span>
                      <strong>₹{fmt(emiCommitments)}</strong>
                    </div>
                    <div className="irr2-expense-row total">
                      <span>Total Monthly Commitments</span>
                      <strong style={{ color: '#f87171' }}>₹{fmt(totalFixed)}</strong>
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
        <div className="irr2-results-wrapper">

          {/* ── Hero Summary ── */}
          <div className="irr2-hero">
            <div className="irr2-hero-left">
              <div className="irr2-hero-badge">
                {selectedCategory?.icon} {selectedCategory?.label}
              </div>
              <h2 className="irr2-hero-title">Your Income Plan is Ready</h2>
              <p className="irr2-hero-sub">
                Based on {result.sample_months} months of data &nbsp;|&nbsp;
                Average income: <strong style={{ color: '#a78bfa' }}>₹{fmt(result.mean_monthly_income)}/month</strong>
              </p>
            </div>
            <div className="irr2-hero-right">
              <div className="irr2-stability-badge" style={{ color: stabilityWord(result.stability_score).color }}>
                <div className="irr2-stability-num">{(result.stability_score * 100).toFixed(0)}%</div>
                <div className="irr2-stability-lbl">Income Stability</div>
                <div className="irr2-stability-word">{stabilityWord(result.stability_score).word}</div>
              </div>
            </div>
          </div>

          {/* ── 4 Quick-Glance Numbers ── */}
          <div className="irr2-kpi-strip">
            <div className="irr2-kpi">
              <div className="irr2-kpi-icon">📈</div>
              <div className="irr2-kpi-val" style={{ color: '#60a5fa' }}>₹{fmt(result.mean_monthly_income)}</div>
              <div className="irr2-kpi-lbl">Average Monthly Income</div>
            </div>
            <div className="irr2-kpi">
              <div className="irr2-kpi-icon">📉</div>
              <div className="irr2-kpi-val" style={{ color: '#f87171' }}>₹{fmt(Math.max(0, result.shock_analysis?.shock_floor_2sigma ?? 0))}</div>
              <div className="irr2-kpi-lbl">Worst-Case Month (Estimate)</div>
            </div>
            <div className="irr2-kpi">
              <div className="irr2-kpi-icon">💰</div>
              <div className="irr2-kpi-val" style={{ color: result.adaptive_strategy?.savings_capacity_per_month >= 0 ? '#34d399' : '#f87171' }}>
                ₹{fmt(Math.max(0, result.adaptive_strategy?.savings_capacity_per_month ?? 0))}
              </div>
              <div className="irr2-kpi-lbl">You Can Save / Month</div>
            </div>
            <div className="irr2-kpi">
              <div className="irr2-kpi-icon">🛡</div>
              <div className="irr2-kpi-val" style={{ color: result.emergency_fund?.gap > 0 ? '#f59e0b' : '#34d399' }}>
                {result.emergency_fund?.gap > 0 ? `₹${fmt(result.emergency_fund.gap)} needed` : '✅ Covered'}
              </div>
              <div className="irr2-kpi-lbl">Emergency Fund Gap</div>
            </div>
          </div>

          <div className="irr2-results-grid">

            {/* ── LEFT COLUMN ── */}
            <div className="irr2-col">

              {/* How steady is your income? */}
              <ResultSection icon="📊" title="How Steady Is Your Income?">
                <div className="irr2-income-chart-wrap">
                  <MiniBarChart values={historyVals} threshold={totalFixed} />
                  <div className="irr2-chart-legend">
                    <span style={{ color: '#6366f1' }}>■ Good months</span>
                    <span style={{ color: '#dc2626' }}>■ Tight months (below bills)</span>
                    {totalFixed > 0 && <span style={{ color: '#f59e0b' }}>— Your monthly bills line</span>}
                  </div>
                </div>
                <div className="irr2-income-stats">
                  <div className="irr2-stat-chip">
                    <span className="irr2-chip-label">Lowest month</span>
                    <span className="irr2-chip-val red">₹{fmt(Math.min(...historyVals))}</span>
                  </div>
                  <div className="irr2-stat-chip">
                    <span className="irr2-chip-label">Average month</span>
                    <span className="irr2-chip-val blue">₹{fmt(result.mean_monthly_income)}</span>
                  </div>
                  <div className="irr2-stat-chip">
                    <span className="irr2-chip-label">Highest month</span>
                    <span className="irr2-chip-val green">₹{fmt(Math.max(...historyVals))}</span>
                  </div>
                </div>

                {result.shock_analysis?.bad_months_count > 0 ? (
                  <TipBox icon="⚠️" title="Heads Up" color="#f59e0b">
                    In <strong>{result.shock_analysis.bad_months_count} out of {result.sample_months} months</strong>, your income was less than your bills (₹{fmt(totalFixed)}).
                    That means you dipped into savings those months — which is why building an emergency fund first is critical.
                  </TipBox>
                ) : (
                  <TipBox icon="✅" title="Great News" color="#34d399">
                    In all {result.sample_months} months, your income stayed above your monthly bills. You're in a stable position — now let's put that surplus to work!
                  </TipBox>
                )}
              </ResultSection>

              {/* Emergency Fund */}
              <ResultSection icon="🛡️" title="Your Emergency Fund">
                <div className="irr2-ef-visual">
                  <div>
                    <div className="irr2-ef-row">
                      <span>You need (for safety)</span>
                      <strong style={{ color: '#34d399' }}>₹{fmt(result.emergency_fund.recommended_amount)}</strong>
                    </div>
                    <div className="irr2-ef-row">
                      <span>You currently have</span>
                      <strong style={{ color: '#60a5fa' }}>₹{fmt(result.emergency_fund.current_amount)}</strong>
                    </div>
                    {result.emergency_fund.gap > 0 && (
                      <div className="irr2-ef-row">
                        <span>Still need to save</span>
                        <strong style={{ color: '#f87171' }}>₹{fmt(result.emergency_fund.gap)}</strong>
                      </div>
                    )}
                  </div>
                  <div className="irr2-ef-meter">
                    <div
                      className="irr2-ef-fill"
                      style={{
                        height: `${Math.min(100, (result.emergency_fund.current_amount / result.emergency_fund.recommended_amount) * 100)}%`,
                        background: result.emergency_fund.status === 'Adequate'
                          ? 'linear-gradient(0deg, #10b981, #34d399)'
                          : 'linear-gradient(0deg, #f59e0b, #fbbf24)',
                      }}
                    />
                    <div className="irr2-ef-meter-label">
                      {Math.min(100, Math.round((result.emergency_fund.current_amount / result.emergency_fund.recommended_amount) * 100))}%
                    </div>
                  </div>
                </div>

                {result.emergency_fund.status === 'Adequate' ? (
                  <TipBox icon="✅" title="Emergency Fund: Covered!" color="#34d399">
                    You have enough emergency savings to cover {result.emergency_fund.cushion_months} months of expenses — perfect for variable earners. You can now focus on growing your investments!
                  </TipBox>
                ) : (
                  <TipBox icon="🎯" title={`Build your safety net first — ${result.emergency_fund.months_to_fill} months to go`} color="#f59e0b">
                    As a variable earner, you need <strong>{result.emergency_fund.cushion_months} months</strong> of expenses (₹{fmt(result.emergency_fund.recommended_amount)}) as backup.
                    Priority #1: Set aside a small amount each month until this is filled. Even ₹500 a week helps!
                  </TipBox>
                )}
              </ResultSection>

            </div>

            {/* ── RIGHT COLUMN ── */}
            <div className="irr2-col">

              {/* How Much You Can Save & Invest */}
              <ResultSection icon="💰" title="How Much Can You Save &amp; Invest?">
                {result.adaptive_strategy?.savings_capacity_per_month > 0 ? (
                  <>
                    <div className="irr2-savings-visual">
                      <div className="irr2-savings-donut-wrap">
                        <div className="irr2-savings-number">
                          ₹{fmt(result.adaptive_strategy.savings_capacity_per_month)}
                          <span>/mo</span>
                        </div>
                        <div className="irr2-savings-sublabel">Average Surplus</div>
                      </div>
                      <div className="irr2-savings-split">
                        <div className="irr2-split-item safe">
                          <div className="irr2-split-label">🏦 Keep it Safe (FD / Liquid Fund)</div>
                          <div className="irr2-split-amount">₹{fmt(result.adaptive_strategy.conservative_allocation_Rs)}</div>
                          <div className="irr2-split-why">For unstable months — easy to withdraw</div>
                        </div>
                        <div className="irr2-split-item grow">
                          <div className="irr2-split-label">📈 Grow it (SIP / Mutual Fund)</div>
                          <div className="irr2-split-amount">₹{fmt(result.adaptive_strategy.growth_allocation_Rs)}</div>
                          <div className="irr2-split-why">Long-term wealth building</div>
                        </div>
                      </div>
                    </div>

                    <TipBox icon="💡" title="How this split works" color="#818cf8">
                      Because your income varies month to month, we split your savings in two:
                      a <strong>safe bucket</strong> (FD or liquid fund — you can withdraw anytime) and a
                      <strong> growth bucket</strong> (SIP or mutual fund — stays invested for the long run).
                      In good months, top up both. In tight months, skip the growth bucket first.
                    </TipBox>

                    <div className="irr2-rates-row">
                      <div className="irr2-rate-chip">
                        <span>Savings Rate</span>
                        <strong style={{ color: '#34d399' }}>{result.adaptive_strategy.base_savings_rate_pct}%</strong>
                      </div>
                      <div className="irr2-rate-chip">
                        <span>Emergency Priority</span>
                        <strong style={{ color: '#f59e0b' }}>{result.adaptive_strategy.ef_priority_fraction_pct}%</strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <TipBox icon="⚠️" title="Your expenses are covering all your income" color="#f87171">
                    Right now your monthly bills (₹{fmt(totalFixed)}) are equal to or more than your average income (₹{fmt(result.mean_monthly_income)}).
                    Focus on reducing one fixed expense, or increasing income, before starting investments.
                    Even a ₹2,000 saving on expenses = ₹2,000 freed for your future.
                  </TipBox>
                )}
              </ResultSection>

              {/* Next 6 Months Forecast */}
              <ResultSection icon="📅" title="What to Expect Next 6 Months">
                <p className="irr2-forecast-note">
                  Based on your past income trend, here's a rough estimate for the coming months.
                  Use this to plan your spending — not as a guarantee!
                </p>
                <div className="irr2-forecast-cards">
                  {result.income_forecast?.map((f, i) => (
                    <div key={i} className={`irr2-fc-card ${f.is_seasonal_peak ? 'peak' : ''}`}>
                      <div className="irr2-fc-month">
                        {MONTH_NAMES[f.calendar_month - 1]}
                        {f.is_seasonal_peak && <span className="irr2-fc-peak">🌟 Peak</span>}
                      </div>
                      <div className="irr2-fc-amount">₹{fmt(f.forecasted_income)}</div>
                      <div className={`irr2-fc-vs ${f.forecasted_income >= totalFixed ? 'ok' : 'low'}`}>
                        {f.forecasted_income >= totalFixed
                          ? `+₹${fmt(f.forecasted_income - totalFixed)} surplus`
                          : `⚠ ₹${fmt(totalFixed - f.forecasted_income)} short`}
                      </div>
                    </div>
                  ))}
                </div>
              </ResultSection>

              {/* Safe Monthly Spending */}
              {result.safe_spending && (
                <ResultSection icon="💸" title="Safe Amount to Spend Each Month">
                  <p className="irr2-forecast-note">
                    This is the maximum you can spend each month without risking going into debt,
                    even if next month's income is lower than usual.
                  </p>
                  <div className="irr2-safe-spending-blocks">
                    <div className="irr2-ss-block ultra">
                      <div className="irr2-ss-label">🔒 Ultra-Safe (most conservative)</div>
                      <div className="irr2-ss-value">₹{fmt(result.safe_spending.ultra_safe_spending)}/month</div>
                    </div>
                    <div className="irr2-ss-block safe">
                      <div className="irr2-ss-label">✅ Safe Ceiling</div>
                      <div className="irr2-ss-value">₹{fmt(result.safe_spending.safe_monthly_spending)}/month</div>
                    </div>
                    <div className="irr2-ss-block avg">
                      <div className="irr2-ss-label">📊 Average Budget</div>
                      <div className="irr2-ss-value">₹{fmt(result.safe_spending.discretionary_budget_avg)}/month</div>
                    </div>
                  </div>
                  <TipBox icon="💡" title="What these mean" color="#60a5fa">
                    <strong>Ultra-Safe:</strong> spend this if you want maximum security. <br />
                    <strong>Safe Ceiling:</strong> spend up to this without worry most months. <br />
                    <strong>Average Budget:</strong> what you can typically afford on a normal month.
                  </TipBox>
                </ResultSection>
              )}
            </div>

          </div>

          {/* ── Full-width AI Tips ── */}
          {result.ai_advisory?.length > 0 && (
            <div className="irr2-advisory-section">
              <div className="irr2-advisory-title">🤖 Personalised Tips Just for You</div>
              <div className="irr2-advisory-grid">
                {result.ai_advisory.map((tip, i) => (
                  <div key={i} className="irr2-advisory-tip">
                    <span className="irr2-tip-num">{i + 1}</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Start Over ── */}
          <div className="irr2-footer-actions">
            <button className="irr2-reset-btn large" onClick={handleReset}>
              🔄 Analyse Again with Different Numbers
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
