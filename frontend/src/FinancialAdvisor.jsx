import React, { useState } from 'react';
import './advisor.css';

// ─── API Integration ────────────────────────────────────────────────────────
// ─── Form steps config ───────────────────────────────────────────────────────
const STEPS = [
  {
    title: 'Personal Info',
    icon: '👤',
    fields: [
      { key: 'age', label: 'Your Age', type: 'number', placeholder: '28', unit: 'years', hint: 'Used to determine your investment horizon' },
      { key: 'monthly_income', label: 'Monthly Income (Net Take-Home)', type: 'number', placeholder: '75000', unit: '₹', hint: 'After tax income credited to your account' },
    ]
  },
  {
    title: 'Monthly Outflows',
    icon: '💸',
    fields: [
      { key: 'monthly_expenses', label: 'Monthly Expenses', type: 'number', placeholder: '30000', unit: '₹', hint: 'Groceries, rent, utilities, lifestyle etc.' },
      { key: 'total_emis', label: 'Total Monthly EMIs', type: 'number', placeholder: '10000', unit: '₹', hint: 'All loan repayments combined' },
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
  const color = score >= 75 ? '#4caf8e' : score >= 50 ? '#f59e0b' : '#ef4444';
  const label = score >= 75 ? 'Excellent' : score >= 50 ? 'Fair' : 'Needs Work';

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
        <text x="90" y="84" textAnchor="middle" fill="#fff" fontSize="32" fontWeight="700">{score}</text>
        <text x="90" y="108" textAnchor="middle" fill={color} fontSize="13">{label}</text>
      </svg>
      <p className="score-ring-label">Financial Health Score</p>
    </div>
  );
}

function DonutChart({ portfolio }) {
  const colors = { Equity: '#f26622', Debt: '#4c9af2', Gold: '#f59e0b', Cash: '#4caf8e' };
  const labels = Object.keys(portfolio);
  const total = 100;
  let cumAngle = -90;

  const slices = labels.map((key) => {
    const pct = portfolio[key];
    const angle = (pct / total) * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;
    const r = 80, cx = 100, cy = 100, innerR = 45;
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
    return { key, pct, d, color: colors[key] };
  });

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 200 200" width="200" height="200">
        {slices.map((s) => (
          <path key={s.key} d={s.d} fill={s.color} opacity="0.9" />
        ))}
        <text x="100" y="96" textAnchor="middle" fill="#fff" fontSize="11" opacity="0.6">Portfolio</text>
        <text x="100" y="112" textAnchor="middle" fill="#fff" fontSize="11" opacity="0.6">Mix</text>
      </svg>
      <div className="donut-legend">
        {slices.map((s) => (
          <div key={s.key} className="legend-item">
            <span className="legend-dot" style={{ background: s.color }}></span>
            <span className="legend-label">{s.key.charAt(0).toUpperCase() + s.key.slice(1)}</span>
            <span className="legend-pct">{s.pct}%</span>
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
    { label: 'Emergency', value: cashFlow.emergency, color: '#4c9af2' },
    { label: 'Invest', value: cashFlow.investments, color: '#4caf8e' },
  ];
  const max = income || 1;

  return (
    <div className="bar-chart">
      {items.map((item) => (
        <div key={item.label} className="bar-row">
          <span className="bar-label">{item.label}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${Math.min(100, (item.value / max) * 100)}%`, background: item.color }}
            ></div>
          </div>
          <span className="bar-value">₹{item.value.toLocaleString('en-IN')}</span>
        </div>
      ))}
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
        
        const steps = [
          "Analyzing cash flow patterns...",
          "Evaluating asset-liability ratio...",
          "Calculating dynamic risk capacity...",
          "Formulating personalized portfolio...",
          "Generating priority action items..."
        ];
        
        for (let i = 0; i < steps.length; i++) {
          setLoadingStep(i);
          await new Promise(r => setTimeout(r, 600));
        }
        
        try {
          const response = await fetch("http://localhost:8000/api/advisor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
          });
          if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
          }
          const res = await response.json();
          setResult(res);
        } catch(err) {
          console.error("Engine fetch error:", err);
          alert("Failed to analyze data via backend engine. Ensure python backend is running.");
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

  if (loading) {
    const messages = [
      "Analyzing cash flow patterns...",
      "Evaluating asset-liability ratio...",
      "Calculating dynamic risk capacity...",
      "Formulating personalized portfolio...",
      "Generating priority action items..."
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

  // ── DASHBOARD view ─────────────────────────────────────────────────────
  if (result) {
    const r = result;
    const { features, prioritized_actions, cashFlow, portfolio } = r;
    const fh = features?.fiscal_health_aggregation || {};
    const emgSplit = features?.emergency_fund_split || { Savings_Account: 50, Liquid_MF: 30, Short_Term_FD: 20 };
    
    // Safe parse form data
    const currentExp = Number(formData.monthly_expenses) || 0;
    const targetExp = cashFlow.expenses || 0;
    const expDiff = currentExp - targetExp;
    
    const currentEmg = Number(formData.emergency_fund) || 0;
    const currentEmis = Number(formData.total_emis) || 0;
    const targetEmgTotal = (targetExp + currentEmis) * 6;
    const emgGap = Math.max(0, targetEmgTotal - currentEmg);
    const incomeNum = Number(formData.monthly_income) || r.income || 1;

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

        <div className="adv-dashboard glass-dashboard">

          {/* 📊 FINANCIAL STATUS */}
          <div className="adv-row adv-row-3">
             <div className="adv-card center-card metric-card">
               <h3 className="card-sec-title">Financial Stress Level</h3>
               <div className={`status-text ${fh.financial_stress_level === 'High' ? 'text-red' : 'text-green'}`}>
                  {fh.financial_stress_level || 'Unknown'}
               </div>
             </div>
             <div className="adv-card center-card metric-card">
               <h3 className="card-sec-title">Risk Capacity</h3>
               <div className="status-text text-blue">{r.riskTier}</div>
             </div>
             <div className="adv-card center-card metric-card">
               <h3 className="card-sec-title">Emergency Readiness</h3>
               <div className={`status-text ${r.emergencyCoverage < 3 ? 'text-red' : r.emergencyCoverage < 6 ? 'text-orange' : 'text-green'}`}>
                  {r.emergencyCoverage < 3 ? 'Critical' : r.emergencyCoverage < 6 ? 'Needs Work' : 'Adequate'}
               </div>
             </div>
          </div>
          
          {/* 🔴 PRIORITY 1 */}
          {prioritized_actions?.Immediate_Actions?.length > 0 && (
          <div className="adv-card full-card urgent-action-card glow-red">
             <h3 className="card-sec-title text-red">🔴 PRIORITY 1: Build Emergency Safety</h3>
             <p className="urgent-text">{prioritized_actions.Immediate_Actions[0].action}</p>
             <div className="emg-stats-grid">
               <div className="emg-stat">
                  <span className="stat-lbl">Target</span>
                  <span className="stat-val">₹{targetEmgTotal.toLocaleString('en-IN')}</span>
               </div>
               <div className="emg-stat">
                  <span className="stat-lbl">Current</span>
                  <span className="stat-val">₹{currentEmg.toLocaleString('en-IN')}</span>
               </div>
               <div className="emg-stat">
                  <span className="stat-lbl">Gap</span>
                  <span className="stat-val text-red">₹{emgGap.toLocaleString('en-IN')}</span>
               </div>
               <div className="emg-stat highlight-stat">
                  <span className="stat-lbl">Monthly Allocation Needed</span>
                  <span className="stat-val">₹{cashFlow.emergency.toLocaleString('en-IN')}</span>
               </div>
             </div>
          </div>
          )}

          {/* 💰 Reallocation Plan */}
          <div className="adv-card full-card reallocation-card">
             <h3 className="card-sec-title">💰 Reallocation Plan</h3>
             <ul className="reallocation-list">
                {expDiff > 0 && (
                  <li>
                    <span className="realloc-icon">📉</span>
                    <span className="realloc-desc">Reduce discretionary spending:</span>
                    <strong className="realloc-amt text-green">₹{Math.round(expDiff).toLocaleString('en-IN')}</strong>
                  </li>
                )}
                {cashFlow.sip_equity > 0 && (
                  <li>
                    <span className="realloc-icon">📈</span>
                    <span className="realloc-desc">Optimize Equity SIP to:</span>
                    <strong className="realloc-amt">₹{cashFlow.sip_equity.toLocaleString('en-IN')}</strong>
                  </li>
                )}
                {cashFlow.fd_debt > 0 && (
                  <li>
                    <span className="realloc-icon">🛡️</span>
                    <span className="realloc-desc">Optimize Debt/FD to:</span>
                    <strong className="realloc-amt">₹{cashFlow.fd_debt.toLocaleString('en-IN')}</strong>
                  </li>
                )}
                {cashFlow.emergency > 0 && (
                  <li>
                    <span className="realloc-icon">🚨</span>
                    <span className="realloc-desc">Redirect to Emergency Fund:</span>
                    <strong className="realloc-amt">₹{cashFlow.emergency.toLocaleString('en-IN')}</strong>
                  </li>
                )}
             </ul>
          </div>
          
          {/* 🏦 Where To Store Emergency Fund? */}
          {cashFlow.emergency > 0 && (
          <div className="adv-card full-card storage-card">
             <h3 className="card-sec-title">🏦 Where To Store Emergency Fund?</h3>
             <ul className="storage-tree">
               <li>
                 <span className="storage-amt">₹{Math.round((emgSplit.Savings_Account/100) * cashFlow.emergency).toLocaleString('en-IN')}</span>
                 <span className="storage-dest">→ High-interest savings account ({emgSplit.Savings_Account}%)</span>
               </li>
               <li>
                 <span className="storage-amt">₹{Math.round((emgSplit.Liquid_MF/100) * cashFlow.emergency).toLocaleString('en-IN')}</span>
                 <span className="storage-dest">→ Liquid mutual fund ({emgSplit.Liquid_MF}%)</span>
               </li>
               <li>
                 <span className="storage-amt">₹{Math.round((emgSplit.Short_Term_FD/100) * cashFlow.emergency).toLocaleString('en-IN')}</span>
                 <span className="storage-dest">→ Short-term FD (3–6 months tenure) ({emgSplit.Short_Term_FD}%)</span>
               </li>
             </ul>
          </div>
          )}

          {/* 🟡 Investment Strategy */}
          <div className="adv-row adv-row-2">
            <div className="adv-card strategy-card">
               <h3 className="card-sec-title">🟡 Investment Strategy (Macro)</h3>
               <p className="sub-note">Post-emergency recommended allocation:</p>
               <div className="strategy-flex">
                 <div className="strategy-chart">
                   <DonutChart portfolio={{ Equity: portfolio.Equity, Debt: portfolio.Debt, Gold: portfolio.Gold }} />
                 </div>
                 <div className="strategy-text">
                   <p><strong>Equity:</strong> {portfolio.Equity}%</p>
                   <p><strong>Debt:</strong> {portfolio.Debt}%</p>
                   <p><strong>Gold:</strong> {portfolio.Gold}%</p>
                 </div>
               </div>
            </div>
            
            <div className="adv-card debt-card">
               <h3 className="card-sec-title">🛡️ Debt Breakdown</h3>
               <ul className="debt-breakdown-list">
                 <li><div className="debt-pct">{portfolio.Debt_FD}%</div> <div className="debt-lbl">Fixed Deposit (FD)</div></li>
                 <li><div className="debt-pct">{portfolio.Debt_MF}%</div> <div className="debt-lbl">Debt Mutual Fund</div></li>
                 <li><div className="debt-pct">{portfolio.Debt_PPF}%</div> <div className="debt-lbl">PPF / Safe Anchor</div></li>
               </ul>
            </div>
          </div>

          {/* 💵 Overall Plan */}
          <div className="adv-card full-card overall-plan-card">
             <h3 className="card-sec-title">💵 Overall Monthly Plan</h3>
             <p className="sub-note">How your ₹{incomeNum.toLocaleString('en-IN')} should be distributed.</p>
             <BarChart cashFlow={cashFlow} income={incomeNum} />
          </div>

        </div>
        <footer className="adv-footer">
          <p>Generated by FINEXO AI · Core Portfolio Allocation Engine · Not Financial Advice</p>
        </footer>
      </div>
    );
  }

  // ── FORM view ──────────────────────────────────────────────────────────────
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
