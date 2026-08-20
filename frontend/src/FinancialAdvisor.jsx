import React, { useState } from 'react';
import './advisor.css';

// ─── Form steps config ───────────────────────────────────────────────────────
const STEPS = [
  {
    title: 'Personal Info',
    icon: '👤',
    fields: [
      { key: 'age', label: 'Your Age', type: 'number', placeholder: '28', unit: 'yrs', hint: 'Used to determine your investment horizon' },
      { key: 'monthly_income', label: 'Monthly Income (Net Take-Home)', type: 'number', placeholder: '75000', unit: '₹', hint: 'After tax income credited to your account' },
    ]
  },
  {
    title: 'Monthly Outflows',
    icon: '💸',
    fields: [
      { key: 'monthly_expenses', label: 'Monthly Expenses', type: 'number', placeholder: '30000', unit: '₹', hint: 'Rent, groceries, utilities, subscriptions etc.' },
      { key: 'total_emis', label: 'Total Monthly EMIs', type: 'number', placeholder: '10000', unit: '₹', hint: 'All active loan repayments combined' },
    ]
  },
  {
    title: 'Assets & Liabilities',
    icon: '🏦',
    fields: [
      { key: 'total_assets', label: 'Total Assets', type: 'number', placeholder: '500000', unit: '₹', hint: 'Property, gold, FDs, mutual funds, cash' },
      { key: 'total_liabilities', label: 'Total Liabilities', type: 'number', placeholder: '200000', unit: '₹', hint: 'Outstanding loan balances' },
    ]
  },
  {
    title: 'Investments & Emergency',
    icon: '📈',
    fields: [
      { key: 'current_investments', label: 'Current Investment Corpus', type: 'number', placeholder: '150000', unit: '₹', hint: 'Mutual funds, stocks, PF, bonds' },
      { key: 'emergency_fund', label: 'Emergency Fund Balance', type: 'number', placeholder: '90000', unit: '₹', hint: 'Liquid savings set aside for emergencies' },
    ]
  },
];

// ─── Utility components ──────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const label = score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : 'Needs Work';

  return (
    <div className="score-ring-wrapper">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
        <circle
          cx="90" cy="90" r={radius} fill="none"
          stroke={color} strokeWidth="14"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 90 90)"
          style={{ transition: 'stroke-dashoffset 1.2s ease' }}
        />
        <text x="90" y="82" textAnchor="middle" fill="#fff" fontSize="30" fontWeight="700">{score}</text>
        <text x="90" y="102" textAnchor="middle" fill={color} fontSize="12" fontWeight="500">{label}</text>
        <text x="90" y="120" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10">out of 100</text>
      </svg>
      <p className="score-ring-label">Financial Health Score</p>
    </div>
  );
}

function DonutChart({ portfolio }) {
  const colors = { Equity: '#3b82f6', Debt: '#10b981', Gold: '#f59e0b', Cash: '#8b5cf6' };
  const labels = Object.keys(portfolio);
  const total = 100;
  let cumAngle = -90;

  const slices = labels.map((key) => {
    const pct = portfolio[key];
    const angle = (pct / total) * 360;
    if (angle === 0) return null;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;
    const r = 80, cx = 100, cy = 100, innerR = 50;
    const toRad = (a) => (a * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const ix1 = cx + innerR * Math.cos(toRad(startAngle));
    const iy1 = cy + innerR * Math.sin(toRad(startAngle));
    const ix2 = cx + innerR * Math.cos(toRad(endAngle));
    const iy2 = cy + innerR * Math.sin(toRad(endAngle));
    const largeArc = angle > 180 ? 1 : 0;
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
    return { key, pct, d, color: colors[key] || '#3b82f6' };
  }).filter(Boolean);

  return (
    <div className="donut-layout">
      <div className="donut-chart-container">
        <svg viewBox="0 0 200 200" width="180" height="180">
          {slices.map((s) => (
            <path key={s.key} d={s.d} fill={s.color} opacity="1" />
          ))}
        </svg>
        <div className="donut-center-text">
          <span className="donut-center-val">100%</span>
          <span className="donut-center-lbl">Portfolio</span>
        </div>
      </div>
      <div className="donut-legend-grid">
        {slices.map((s) => (
          <div key={s.key} className="legend-row">
            <div className="legend-left">
              <span className="legend-dot" style={{ background: s.color }}></span>
              <span className="legend-name">{s.key}</span>
            </div>
            <div className="legend-right">
              <span className="legend-val">{s.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ cashFlow, income }) {
  const items = [
    { label: 'Expenses', value: cashFlow.expenses, color: '#ef4444' },
    { label: 'EMIs', value: cashFlow.emis, color: '#f59e0b' },
    { label: 'Emergency', value: cashFlow.emergency, color: '#3b82f6' },
    { label: 'Invest', value: cashFlow.investments, color: '#10b981' },
  ];
  const max = income || 1;

  return (
    <div className="bar-chart-container">
      {items.map((item) => (
        <div key={item.label} className="bar-row">
          <span className="bar-label">{item.label}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${Math.min(100, (item.value / max) * 100)}%`, background: item.color }}
            ></div>
          </div>
          <span className="bar-value">₹{Math.round(item.value).toLocaleString('en-IN')}</span>
          <span className="bar-pct">{Math.round((item.value / max) * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

function SavingsRateBar({ rate, target = 20 }) {
  const pct = Math.min(100, Math.round(rate));
  const color = pct >= target ? '#10b981' : pct >= target / 2 ? '#f59e0b' : '#ef4444';
  return (
    <div className="savings-gauge">
      <div className="savings-gauge-track">
        <div className="savings-gauge-fill" style={{ width: `${pct}%`, background: color }} />
        <div className="savings-gauge-target" style={{ left: `${target}%` }} title={`Target: ${target}%`} />
      </div>
      <div className="savings-gauge-labels">
        <span style={{ color }}>You: {pct}%</span>
        <span style={{ color: 'var(--text-secondary)' }}>Target: {target}%</span>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function FinancialAdvisor() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [result, setResult] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const handleChange = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  const isStepValid = () => {
    const fields = STEPS[step].fields;
    return fields.every(f => formData[f.key] !== undefined && formData[f.key] !== '');
  };

  const nextStep = () => {
    if (!isStepValid()) return;
    if (step < STEPS.length - 1) {
      setAnimating(true);
      setTimeout(() => { setStep(s => s + 1); setAnimating(false); }, 200);
    } else {
      setAnimating(true);
      setTimeout(async () => {
        setAnimating(false);
        setLoading(true);
        setLoadingStep(0);

        const messages = [
          "Analyzing cash flow patterns...",
          "Evaluating asset-liability ratio...",
          "Calculating dynamic risk capacity...",
          "Formulating personalized portfolio...",
          "Generating priority action items...",
        ];

        for (let i = 0; i < messages.length; i++) {
          setLoadingStep(i);
          await new Promise(r => setTimeout(r, 600));
        }

        try {
          const response = await fetch("http://localhost:8000/api/advisor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
          });
          if (!response.ok) throw new Error(`API returned status ${response.status}`);
          const res = await response.json();
          setResult(res);
        } catch (err) {
          console.error("Engine fetch error:", err);
          alert("Failed to connect to backend. Ensure the Python server is running on port 8000.");
        } finally {
          setLoading(false);
        }
      }, 200);
    }
  };

  const prevStep = () => {
    setAnimating(true);
    setTimeout(() => { setStep(s => s - 1); setAnimating(false); }, 200);
  };

  const reset = () => { setResult(null); setStep(0); setFormData({}); };

  // ─── LOADING VIEW ───────────────────────────────────────────────────────────
  if (loading) {
    const messages = [
      "Analyzing cash flow patterns...",
      "Evaluating asset-liability ratio...",
      "Calculating dynamic risk capacity...",
      "Formulating personalized portfolio...",
      "Generating priority action items...",
    ];
    return (
      <div className="adv-page flex-center" style={{ minHeight: '100vh' }}>
        <div className="loader-container">
          <div className="cube-wrapper">
            <div className="cube">
              <div className="cube-faces">
                <div className="cube-face shadow"></div>
                <div className="cube-face bottom"></div>
                <div className="cube-face top"></div>
                <div className="cube-face left"></div>
                <div className="cube-face right"></div>
                <div className="cube-face back"></div>
                <div className="cube-face front"></div>
              </div>
            </div>
          </div>
          <h2 className="loader-title">Crunching the Numbers</h2>
          <p className="loader-text">{messages[loadingStep]}</p>
          <div className="loader-bar-container">
            <div className="loader-bar-fill" style={{ width: `${((loadingStep + 1) / messages.length) * 100}%` }}></div>
          </div>
        </div>
      </div>
    );
  }

  // ─── DASHBOARD VIEW ─────────────────────────────────────────────────────────
  if (result) {
    const r = result;
    const { features, prioritized_actions, cashFlow, portfolio } = r;
    const fh = features?.fiscal_health_aggregation || {};
    const emgSplit = features?.emergency_fund_split || { Savings_Account: 50, Liquid_MF: 30, Short_Term_FD: 20 };
    const diagFlags = features?.diagnosis_flags || {};
    const xai = r.explainable_ai || {};
    const incomeNum = r.income || 1;

    const allActions = [
      ...(prioritized_actions?.Immediate_Actions || []).map(a => ({ ...a, tier: 'immediate' })),
      ...(prioritized_actions?.Mid_Term_Actions || []).map(a => ({ ...a, tier: 'mid' })),
      ...(prioritized_actions?.Long_Term_Actions || []).map(a => ({ ...a, tier: 'long' })),
    ];

    const tierConfig = {
      immediate: { label: 'Act Now', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
      mid: { label: 'This Quarter', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
      long: { label: 'Long Term', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
    };

    return (
      <div className="adv-page">
        {/* Header */}
        <header className="adv-header">
          <div className="adv-logo">
            <div className="adv-logo-icon">F</div>
            FINEXO · <span>AI Financial Advisor</span>
          </div>
          <button className="adv-reset-btn" onClick={reset}>← Re-analyse</button>
        </header>

        <div className="adv-dashboard">

          {/* Dashboard Title */}
          <div className="dashboard-title-wrap">
            <h1 className="dashboard-title">Financial Health Dashboard</h1>
            <p className="dashboard-subtitle">Personalized analysis based on your financial data · {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>

          {/* ── ROW 1: Health Score + Net Worth + Surplus + Savings Rate ── */}
          <div className="adv-row adv-row-4">

            {/* Health Score */}
            <div className="adv-card metric-card">
              <div className="metric-header">
                <span className="metric-title">Health Score</span>
                <span className={`metric-pill ${r.score >= 75 ? 'positive' : r.score >= 50 ? 'neutral' : 'negative'}`}>
                  {r.score >= 75 ? 'Excellent' : r.score >= 50 ? 'Good' : 'At Risk'}
                </span>
              </div>
              <div className="metric-value">{r.score}<span className="metric-unit">/100</span></div>
              <div className="metric-trend">
                <span className="trend-text">{fh.advisory_intensity || 'Standard Maintenance'}</span>
                <span className="trend-sub">Risk Tier: {r.riskTier}</span>
              </div>
            </div>

            {/* Net Worth */}
            <div className="adv-card metric-card">
              <div className="metric-header">
                <span className="metric-title">Net Worth</span>
                <span className={`metric-pill ${r.netWorth >= 0 ? 'positive' : 'negative'}`}>
                  {r.netWorth >= 0 ? 'Positive' : 'Negative'}
                </span>
              </div>
              <div className="metric-value" style={{ fontSize: r.netWorth > 9999999 ? '1.3rem' : '1.8rem' }}>
                {r.netWorth >= 0 ? '' : '−'}₹{Math.abs(r.netWorth).toLocaleString('en-IN')}
              </div>
              <div className="metric-trend">
                <span className="trend-text">Assets: ₹{(r.assets || 0).toLocaleString('en-IN')}</span>
                <span className="trend-sub">Liabilities: ₹{(r.liabilities || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Monthly Surplus */}
            <div className="adv-card metric-card">
              <div className="metric-header">
                <span className="metric-title">Monthly Surplus</span>
                <span className={`metric-pill ${r.surplusAmount > 0 ? 'positive' : 'negative'}`}>
                  {r.savingsRatePct}% saved
                </span>
              </div>
              <div className="metric-value" style={{ color: r.surplusAmount > 0 ? 'var(--green)' : 'var(--red)' }}>
                ₹{Math.round(r.surplusAmount || 0).toLocaleString('en-IN')}
              </div>
              <div className="metric-trend">
                <span className="trend-text">Income: ₹{incomeNum.toLocaleString('en-IN')}</span>
                <span className="trend-sub">Expenses + EMIs: ₹{(r.expenses + r.emis).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Emergency Coverage */}
            <div className="adv-card metric-card">
              <div className="metric-header">
                <span className="metric-title">Emergency Cover</span>
                <span className={`metric-pill ${r.emergencyCoverage >= 6 ? 'positive' : r.emergencyCoverage >= 3 ? 'neutral' : 'negative'}`}>
                  {r.emergencyCoverage >= 6 ? 'Adequate' : r.emergencyCoverage >= 3 ? 'Partial' : 'Critical'}
                </span>
              </div>
              <div className="metric-value">
                {r.emergencyCoverage != null ? `${r.emergencyCoverage}` : '∞'}
                <span className="metric-unit"> mo</span>
              </div>
              <div className="metric-trend">
                <span className="trend-text">
                  {r.emergencyCoverage >= 6 ? 'You are fully protected' : `Need ${Math.max(0, (6 - (r.emergencyCoverage || 0))).toFixed(1)} more months`}
                </span>
                <span className="trend-sub">Target: 6 months of outflows</span>
              </div>
            </div>
          </div>

          {/* ── ROW 2: Score Ring + Savings Rate + Advisory ── */}
          <div className="adv-row adv-row-2">

            {/* Score Ring + Diagnosis */}
            <div className="adv-card">
              <div className="card-header-flex">
                <div>
                  <h3 className="card-sec-title">Financial Health Overview</h3>
                  <p className="card-sec-subtitle">Overall score and key diagnostic flags</p>
                </div>
              </div>
              <div className="health-overview-body">
                <ScoreRing score={r.score} />
                <div className="diag-flags-grid">
                  {Object.entries(diagFlags).map(([k, v]) => {
                    const isGood = v.toLowerCase().includes('healthy') || v.toLowerCase().includes('resilient') || v.toLowerCase().includes('stable') || v.toLowerCase().includes('free') || v.toLowerCase().includes('liquid');
                    const isWarn = v.toLowerCase().includes('elevated') || v.toLowerCase().includes('vulnerable') || v.toLowerCase().includes('thin') || v.toLowerCase().includes('moderate');
                    const color = isGood ? 'var(--green)' : isWarn ? 'var(--yellow)' : 'var(--red)';
                    const labels = {
                      emergency_status: 'Emergency Fund',
                      debt_stress: 'Debt Load',
                      wealth_creation: 'Wealth Building',
                      liquidity_status: 'Liquidity',
                    };
                    return (
                      <div key={k} className="diag-flag-item">
                        <span className="diag-flag-label">{labels[k] || k}</span>
                        <span className="diag-flag-value" style={{ color }}>{v}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Savings Rate + Advisory */}
            <div className="adv-card">
              <div className="card-header-flex">
                <div>
                  <h3 className="card-sec-title">Savings Rate Analysis</h3>
                  <p className="card-sec-subtitle">How much of your income is working for you</p>
                </div>
              </div>
              <SavingsRateBar rate={r.savingsRatePct || 0} target={20} />

              <div className="advisory-box">
                <div className="advisory-icon-wrap">💡</div>
                <div className="advisory-text-wrap">
                  <p className="advisory-title-text">AI Advisory</p>
                  <p className="advisory-body-text">{r.advisory}</p>
                </div>
              </div>

              <div className="kv-grid">
                <div className="kv-item">
                  <span className="kv-label">Stress Level</span>
                  <span className={`kv-value ${fh.financial_stress_level === 'High' ? 'text-red' : fh.financial_stress_level === 'Moderate' ? 'text-orange' : 'text-green'}`}>
                    {fh.financial_stress_level || 'Low'}
                  </span>
                </div>
                <div className="kv-item">
                  <span className="kv-label">DTI Ratio</span>
                  <span className={`kv-value ${r.dtiPct > 40 ? 'text-red' : r.dtiPct > 25 ? 'text-orange' : 'text-green'}`}>
                    {r.dtiPct}%
                  </span>
                </div>
                <div className="kv-item">
                  <span className="kv-label">Risk Tier</span>
                  <span className="kv-value text-blue">{r.riskTier}</span>
                </div>
                <div className="kv-item">
                  <span className="kv-label">Expected Return</span>
                  <span className="kv-value text-green">{r.annualReturnPct}% p.a.</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── ROW 3: Issues List (full width) ── */}
          {r.issues && r.issues.length > 0 && (
            <div className="adv-card full-card">
              <div className="card-header-flex">
                <div>
                  <h3 className="card-sec-title">Financial Diagnostic Report</h3>
                  <p className="card-sec-subtitle">Key issues identified across all financial dimensions</p>
                </div>
              </div>
              <div className="issues-grid">
                {r.issues.map((issue, i) => {
                  const isGreen = issue.icon === '🟢';
                  const isYellow = issue.icon === '🟡';
                  const bgColor = isGreen ? 'rgba(16,185,129,0.06)' : isYellow ? 'rgba(245,158,11,0.06)' : 'rgba(239,68,68,0.06)';
                  const borderColor = isGreen ? 'rgba(16,185,129,0.2)' : isYellow ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)';
                  return (
                    <div key={i} className="issue-card" style={{ background: bgColor, borderColor }}>
                      <div className="issue-icon">{issue.icon}</div>
                      <div className="issue-body">
                        <div className="issue-label">{issue.label}</div>
                        <div className="issue-detail">{issue.detail}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── ROW 4: Monthly Budget + Emergency Fund ── */}
          <div className="adv-row adv-row-2">

            {/* Monthly Budget Breakdown */}
            <div className="adv-card">
              <div className="card-header-flex">
                <div>
                  <h3 className="card-sec-title">Monthly Budget Breakdown</h3>
                  <p className="card-sec-subtitle">How your ₹{incomeNum.toLocaleString('en-IN')} is distributed</p>
                </div>
              </div>
              <BarChart cashFlow={cashFlow} income={incomeNum} />

              {/* Unallocated surplus note */}
              {(() => {
                const allocated = (cashFlow.expenses || 0) + (cashFlow.emis || 0) + (cashFlow.emergency || 0) + (cashFlow.investments || 0);
                const unallocated = Math.max(0, incomeNum - allocated);
                return unallocated > 100 ? (
                  <div className="surplus-note">
                    <span className="surplus-note-icon">💰</span>
                    <span>₹{Math.round(unallocated).toLocaleString('en-IN')}/month is unallocated — consider adding to SIP or Liquid Fund</span>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Emergency Fund Progress */}
            <div className="adv-card">
              <div className="card-header-flex">
                <div>
                  <h3 className="card-sec-title">Emergency Fund Progress</h3>
                  <p className="card-sec-subtitle">Status and recommended monthly allocation</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="emg-progress-section">
                <div className="emg-progress-track">
                  <div
                    className="emg-progress-fill"
                    style={{
                      width: `${Math.min(100, ((r.currentEmergencyFund || 0) / Math.max(cashFlow.target_emg_total, 1)) * 100)}%`,
                      background: r.emergencyCoverage >= 6 ? '#10b981' : r.emergencyCoverage >= 3 ? '#f59e0b' : '#ef4444'
                    }}
                  />
                </div>
                <div className="emg-progress-labels">
                  <span>₹{(r.currentEmergencyFund || 0).toLocaleString('en-IN')} saved</span>
                  <span>Target: ₹{Math.round(cashFlow.target_emg_total || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="kv-grid" style={{ marginTop: '1rem' }}>
                <div className="kv-item">
                  <span className="kv-label">Monthly Allocation</span>
                  <span className="kv-value">₹{Math.round(cashFlow.emergency || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="kv-item">
                  <span className="kv-label">Gap to Fill</span>
                  <span className="kv-value text-orange">₹{Math.round(cashFlow.emg_gap || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="kv-item">
                  <span className="kv-label">Months to Full</span>
                  <span className="kv-value">
                    {cashFlow.months_to_full_emg != null ? `${cashFlow.months_to_full_emg} months` : r.emergencyCoverage >= 6 ? '✅ Done' : '—'}
                  </span>
                </div>
                <div className="kv-item">
                  <span className="kv-label">Coverage</span>
                  <span className="kv-value">{r.emergencyCoverage ?? '∞'} months</span>
                </div>
              </div>

              {/* Placement split */}
              {cashFlow.emergency > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                  <p className="kv-label" style={{ marginBottom: '0.75rem' }}>How to store it</p>
                  <div className="list-view">
                    <div className="list-item">
                      <div className="list-icon-wrap blue">🏦</div>
                      <div className="list-content">
                        <div className="list-title">High-yield Savings</div>
                        <div className="list-sub">{emgSplit.Savings_Account}% — instant access</div>
                      </div>
                      <div className="list-amount">₹{Math.round((emgSplit.Savings_Account / 100) * cashFlow.emergency).toLocaleString('en-IN')}</div>
                    </div>
                    <div className="list-item">
                      <div className="list-icon-wrap green">📈</div>
                      <div className="list-content">
                        <div className="list-title">Liquid Mutual Fund</div>
                        <div className="list-sub">{emgSplit.Liquid_MF}% — redeemable in 1 day</div>
                      </div>
                      <div className="list-amount">₹{Math.round((emgSplit.Liquid_MF / 100) * cashFlow.emergency).toLocaleString('en-IN')}</div>
                    </div>
                    <div className="list-item">
                      <div className="list-icon-wrap" style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.15)' }}>📜</div>
                      <div className="list-content">
                        <div className="list-title">Short-term FD</div>
                        <div className="list-sub">{emgSplit.Short_Term_FD}% — 3–6 month tenure</div>
                      </div>
                      <div className="list-amount">₹{Math.round((emgSplit.Short_Term_FD / 100) * cashFlow.emergency).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── ROW 5: Investment Strategy + Future Corpus ── */}
          <div className="adv-row adv-row-2">

            {/* Portfolio Donut */}
            <div className="adv-card">
              <div className="card-header-flex">
                <div>
                  <h3 className="card-sec-title">Recommended Portfolio Allocation</h3>
                  <p className="card-sec-subtitle">Optimized for your risk tier: {r.riskTier}</p>
                </div>
              </div>
              <DonutChart portfolio={{ Equity: portfolio.Equity, Debt: portfolio.Debt, Gold: portfolio.Gold }} />
              <div className="kv-grid" style={{ marginTop: '1rem' }}>
                <div className="kv-item">
                  <span className="kv-label">FD Allocation</span>
                  <span className="kv-value">{portfolio.Debt_FD}% of Debt</span>
                </div>
                <div className="kv-item">
                  <span className="kv-label">Debt MF</span>
                  <span className="kv-value">{portfolio.Debt_MF}% of Debt</span>
                </div>
                <div className="kv-item">
                  <span className="kv-label">PPF</span>
                  <span className="kv-value">{portfolio.Debt_PPF}% of Debt</span>
                </div>
                <div className="kv-item">
                  <span className="kv-label">Monthly SIP</span>
                  <span className="kv-value text-green">₹{Math.round(cashFlow.sip_equity || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Future Corpus */}
            <div className="adv-card">
              <div className="card-header-flex">
                <div>
                  <h3 className="card-sec-title">10-Year Corpus Projection</h3>
                  <p className="card-sec-subtitle">If you invest ₹{Math.round(r.monthlyInvest || 0).toLocaleString('en-IN')}/month at {r.annualReturnPct}% p.a.</p>
                </div>
              </div>

              <div className="corpus-hero">
                <div className="corpus-value">₹{(r.futureCorpus || 0) >= 10000000
                  ? `${((r.futureCorpus || 0) / 10000000).toFixed(2)} Cr`
                  : (r.futureCorpus || 0) >= 100000
                    ? `${Math.round((r.futureCorpus || 0) / 100000)} L`
                    : Math.round(r.futureCorpus || 0).toLocaleString('en-IN')
                }</div>
                <div className="corpus-sub">Estimated corpus in 10 years</div>
              </div>

              <div className="corpus-breakdown">
                <div className="corpus-row">
                  <span>Current Investments</span>
                  <strong>₹{(r.currentInvestments || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div className="corpus-row">
                  <span>Monthly SIP</span>
                  <strong>₹{Math.round(r.monthlyInvest || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div className="corpus-row">
                  <span>Expected Return</span>
                  <strong className="text-green">{r.annualReturnPct}% per year</strong>
                </div>
                <div className="corpus-row">
                  <span>Horizon</span>
                  <strong>10 years (120 months)</strong>
                </div>
              </div>

              <div className="corpus-disclaimer">
                ⚠️ Projections assume constant returns. Actual returns vary with market conditions.
              </div>
            </div>
          </div>

          {/* ── ROW 6: Prioritized Actions ── */}
          {allActions.length > 0 && (
            <div className="adv-card full-card">
              <div className="card-header-flex">
                <div>
                  <h3 className="card-sec-title">Your Personalized Action Plan</h3>
                  <p className="card-sec-subtitle">Ranked by severity × financial impact × urgency</p>
                </div>
              </div>
              <div className="actions-list">
                {allActions.map((act, i) => {
                  const cfg = tierConfig[act.tier];
                  return (
                    <div key={i} className="action-row" style={{ background: cfg.bg, borderColor: cfg.border }}>
                      <div className="action-index">{i + 1}</div>
                      <div className="action-body">
                        <span className="action-tier-badge" style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}>
                          {cfg.label}
                        </span>
                        <p className="action-text">{act.action}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── ROW 7: AI Transparency ── */}
          {xai?.decision_path && xai.decision_path.length > 0 && (
            <div className="adv-card full-card">
              <div className="card-header-flex">
                <div>
                  <h3 className="card-sec-title">AI Decision Transparency</h3>
                  <p className="card-sec-subtitle">How the engine arrived at your recommendations</p>
                </div>
              </div>
              <div className="decision-path">
                {xai.decision_path.map((step, i) => (
                  <div key={i} className="decision-step">
                    <div className="decision-num">{i + 1}</div>
                    <div className="decision-text">{step}</div>
                  </div>
                ))}
                {xai.structured_json_grounding?.advisory_justification && (
                  <div className="decision-step decision-justification">
                    <div className="decision-num">💬</div>
                    <div className="decision-text">{xai.structured_json_grounding.advisory_justification}</div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
        <footer className="adv-footer">
          <p>Generated by FINEXO AI · Core Portfolio Allocation Engine · For educational purposes only · Not financial advice</p>
        </footer>
      </div>
    );
  }

  // ─── FORM VIEW ──────────────────────────────────────────────────────────────
  const currentStep = STEPS[step];

  return (
    <div className="adv-page">
      <header className="adv-header">
        <div className="adv-logo">
          <div className="adv-logo-icon">F</div>
          FINEXO · <span>AI Financial Advisor</span>
        </div>
        <a href="/" className="adv-reset-btn">← Back to Home</a>
      </header>

      <div className="adv-form-wrapper">
        {/* Progress bar */}
        <div className="form-progress">
          {STEPS.map((s, i) => (
            <div key={i} className={`progress-step ${i <= step ? 'done' : ''}`}>
              <div className="progress-dot">{i < step ? '✓' : s.icon}</div>
              <span className="progress-label">{s.title}</span>
              {i < STEPS.length - 1 && <div className={`progress-line ${i < step ? 'filled' : ''}`}></div>}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className={`form-card ${animating ? 'fade-out' : 'fade-in'}`}>
          <div className="form-card-icon">{currentStep.icon}</div>
          <h2 className="form-card-title">{currentStep.title}</h2>
          <p className="form-card-sub">Step {step + 1} of {STEPS.length}</p>

          <div className="form-fields">
            {currentStep.fields.map((field) => (
              <div key={field.key} className="form-field">
                <label className="field-label">{field.label}</label>
                <div className="field-input-wrap">
                  <span className="field-unit">{field.unit}</span>
                  <input
                    id={field.key}
                    type={field.type}
                    className="field-input"
                    placeholder={field.placeholder}
                    value={formData[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && nextStep()}
                    min="0"
                  />
                </div>
                <p className="field-hint">{field.hint}</p>
              </div>
            ))}
          </div>

          <div className="form-actions">
            {step > 0 && (
              <button className="btn-secondary" onClick={prevStep}>← Back</button>
            )}
            <button
              className={`btn-primary ${!isStepValid() ? 'disabled' : ''}`}
              onClick={nextStep}
              disabled={!isStepValid()}
            >
              {step === STEPS.length - 1 ? '🚀 Generate My Report' : 'Next →'}
            </button>
          </div>
        </div>
      </div>

      <footer className="adv-footer">
        <p>Your data never leaves your browser · FINEXO AI · For educational purposes only</p>
      </footer>
    </div>
  );
}
