import React, { useState, useEffect } from 'react';
import './tax.css';
import './engine-dashboard.css';

const fmt = (n) => Math.round(n).toLocaleString('en-IN');
const pct = (n) => `${Number(n).toFixed(2)}%`;

// ── Sub-components ────────────────────────────────────────────────────────────
function SlabChart({ slabs, totalTax }) {
  if (!slabs || slabs.length === 0) return null;
  const colors = ['#4c9af2', '#4caf8e', '#f59e0b', '#f26622', '#ef4444', '#a855f7'];
  return (
    <div className="slab-chart">
      {slabs.filter(s => s.tax > 0).map((s, i) => (
        <div key={i} className="slab-row">
          <div className="slab-meta">
            <span className="slab-label">{s.label}</span>
            <span className="slab-rate">{s.rate}</span>
          </div>
          <div className="slab-track">
            <div className="slab-fill" style={{ width: `${(s.tax / Math.max(totalTax, 1)) * 100}%`, background: colors[i % colors.length] }} />
          </div>
          <span className="slab-amt">₹{fmt(s.tax)}</span>
        </div>
      ))}
    </div>
  );
}

function DeductionMeter({ label, used, cap, color }) {
  const pctUsed = cap > 0 ? Math.min(100, (used / cap) * 100) : 100;
  const unused = Math.max(0, cap - used);
  return (
    <div className="deduction-meter">
      <div className="deduction-header">
        <span className="deduction-label">{label}</span>
        <span className="deduction-values">₹{fmt(used)} / ₹{fmt(cap)}</span>
      </div>
      <div className="deduction-track">
        <div className="deduction-fill" style={{ width: `${pctUsed}%`, background: color }} />
      </div>
      <div className="deduction-footer">
        <span style={{ color: unused > 0 ? '#f59e0b' : '#4caf8e' }}>
          {unused > 0 ? `₹${fmt(unused)} unused capacity` : '✓ Fully utilised'}
        </span>
      </div>
    </div>
  );
}

function GTIWaterfall({ gti }) {
  if (!gti) return null;
  const items = [
    { label: 'Salary / CTC', value: gti.salary, color: '#4c9af2' },
    { label: 'Business Income', value: gti.business, color: '#a855f7' },
    { label: 'Rental (after 30% std ded.)', value: gti.rental_after_std_deduction, color: '#f59e0b' },
    { label: 'Interest Income', value: gti.interest, color: '#4caf8e' },
    { label: 'Debt Capital Gains (slab)', value: gti.debt_capital_gains_at_slab, color: '#64748b' },
    { label: 'Equity CG (separate tax)', value: gti.equity_capital_gains_separate, color: '#f26622', separate: true },
  ].filter(i => i.value > 0);
  const maxVal = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="gti-waterfall">
      {items.map((item, i) => (
        <div key={i} className="gti-row">
          <div className="gti-label">{item.label}</div>
          <div className="gti-bar-track">
            <div className="gti-bar-fill" style={{ width: `${(item.value / maxVal) * 100}%`, background: item.color }} />
          </div>
          <div className="gti-amt" style={{ color: item.color }}>₹{fmt(item.value)}</div>
        </div>
      ))}
      <div className="gti-total-row">
        <div className="gti-label"><strong>Total GTI</strong></div>
        <div />
        <div className="gti-amt" style={{ color: '#f26622', fontWeight: 700 }}>₹{fmt(gti.total_gross_income)}</div>
      </div>
    </div>
  );
}

// ── Form Steps ────────────────────────────────────────────────────────────────
const STEPS = [
  {
    title: 'Personal Details', icon: '👤',
    fields: [
      { key: 'age', label: 'Your Age', unit: 'yrs', placeholder: '32', hint: 'Senior citizens (60+) get higher 80D limits.', min: 18, max: 80, step: 1 },
      { key: 'residential_status', label: 'Residential Status', type: 'select', options: ['Resident', 'NRI'], hint: 'NRIs have different tax treaty implications.' },
      { key: 'regime_choice', label: 'Regime Preference', type: 'select', options: ['Auto', 'Old', 'New'], hint: 'Auto = engine picks the lower-tax regime for you.' },
    ],
  },
  {
    title: 'Income Sources', icon: '💼',
    fields: [
      { key: 'salary_income', label: 'Salary / CTC (Annual)', unit: '₹', placeholder: '12,00,000', hint: 'Your annual salary. Standard deduction applies automatically.', min: 0, max: 5000000, step: 50000, increments: [50000, 100000, 500000] },
      { key: 'business_income', label: 'Business / Freelance Income', unit: '₹', placeholder: '0', hint: 'Net profit from business or professional services.', optional: true, min: 0, max: 5000000, step: 50000 },
      { key: 'rental_income', label: 'Annual Rental Income', unit: '₹', placeholder: '0', hint: '30% standard deduction is auto-applied under Sec 24(a).', optional: true, min: 0, max: 2000000, step: 25000 },
      { key: 'interest_income', label: 'Interest Income (FD/Savings)', unit: '₹', placeholder: '0', hint: 'Interest from FDs, savings accounts, bonds. Fully taxable at slab.', optional: true, min: 0, max: 1000000, step: 10000 },
    ],
  },
  {
    title: 'Capital Gains', icon: '📈',
    fields: [
      { key: 'stcg', label: 'Equity STCG (held < 1 year)', unit: '₹', placeholder: '0', hint: 'Short-term capital gains on equity/equity funds. Taxed at 20% (Budget 2024).', optional: true, min: 0, max: 2000000, step: 25000 },
      { key: 'ltcg', label: 'Equity LTCG (held > 1 year)', unit: '₹', placeholder: '0', hint: 'Long-term capital gains on equity. ₹1.25L exempt, balance taxed at 12.5%.', optional: true, min: 0, max: 2000000, step: 25000 },
      { key: 'stcg_debt', label: 'Debt Fund STCG/LTCG', unit: '₹', placeholder: '0', hint: 'Debt mutual fund gains (post Apr 2023) — taxed at slab rate.', optional: true, min: 0, max: 2000000, step: 25000 },
    ],
  },
  {
    title: 'Deductions', icon: '💰',
    fields: [
      { key: 'c80c', label: '80C Investments (ELSS/PPF/LIC/EPF)', unit: '₹', placeholder: '1,50,000', hint: 'Max benefit ₹1.5L. Includes EPF auto-contribution too.', optional: true, min: 0, max: 150000, step: 5000, maxCap: 150000 },
      { key: 'nps', label: 'Additional NPS 80CCD(1B)', unit: '₹', placeholder: '50,000', hint: 'Extra ₹50K deduction beyond 80C limit.', optional: true, min: 0, max: 50000, step: 5000, maxCap: 50000 },
      { key: 'c80d', label: 'Health Insurance Premium (80D)', unit: '₹', placeholder: '25,000', hint: 'Max ₹25K below 60, ₹50K for senior citizens.', optional: true, min: 0, max: 75000, step: 5000, maxCap: 25000 },
    ],
  },
  {
    title: 'Loans & HRA', icon: '🏠',
    fields: [
      { key: 'hra', label: 'HRA Exemption [Sec 10(13A)]', unit: '₹', placeholder: '0', hint: 'Pre-calculated HRA exemption amount. Enter 0 if you own your house.', optional: true, min: 0, max: 500000, step: 10000 },
      { key: 'home_loan', label: 'Home Loan Interest [Sec 24(b)]', unit: '₹', placeholder: '0', hint: 'Max ₹2L deduction for self-occupied property.', optional: true, min: 0, max: 300000, step: 10000, maxCap: 200000 },
      { key: 'edu_loan', label: 'Education Loan Interest [80E]', unit: '₹', placeholder: '0', hint: 'No upper limit! Deduction for up to 8 years.', optional: true, min: 0, max: 500000, step: 10000 },
    ],
  },
  {
    title: 'AI Optimization & ML Forecast', icon: '🤖',
    fields: [
      { key: 'tax_saving_budget', label: 'Available Investment Budget', unit: '₹', placeholder: '1,50,000', hint: 'How much cash can you afford to invest this year specifically to save tax?', optional: true, min: 0, max: 500000, step: 10000 },
      { key: 'risk_profile', label: 'Risk Profile', type: 'select', options: ['Moderate', 'Conservative', 'Aggressive'], hint: 'Determines the mix between Equity (ELSS) and Debt (PPF/FD).', optional: true },
      { key: 'salary_growth_rate', label: 'Expected Salary Growth', unit: '%', placeholder: '10', hint: 'Used by ML model to forecast next year\'s tax.', optional: true, min: 0, max: 50, step: 1 },
      { key: 'business_growth_rate', label: 'Expected Business Growth', unit: '%', placeholder: '15', hint: 'Used by ML model for business income projection.', optional: true, min: 0, max: 50, step: 1 },
      { key: 'inflation_rate', label: 'Expected Inflation Rate', unit: '%', placeholder: '6', hint: 'Adjusts future deduction value expectations.', optional: true, min: 0, max: 20, step: 1 },
    ],
  }
];

import { useAuth } from './context/AuthContext';
import { Link } from 'react-router-dom';

// ── Main Component ────────────────────────────────────────────────────────────
export default function TaxPlanner() {
  const { user, getEngineData, saveEngineData } = useAuth();
  const [step, setStep] = useState(0);

  const defaultTaxData = {
    age: 30,
    residential_status: 'Resident',
    regime_choice: 'Auto',
    salary_income: 1200000,
    business_income: 0,
    rental_income: 0,
    interest_income: 0,
    stcg: 0,
    ltcg: 0,
    stcg_debt: 0,
    c80c: 150000,
    c80d: 25000,
    nps: 50000,
    hra: 120000,
    home_loan: 0,
    edu_loan: 0,
    tax_saving_budget: 150000,
    risk_profile: 'Moderate',
    salary_growth_rate: 10,
    business_growth_rate: 15,
    inflation_rate: 6
  };

  const [formData, setFormData] = useState(() => {
    const stored = getEngineData ? getEngineData('tax') : null;
    return stored ? { ...defaultTaxData, ...stored } : defaultTaxData;
  });

  const [isAutofilled, setIsAutofilled] = useState(() => {
    return Boolean(getEngineData && getEngineData('tax'));
  });

  useEffect(() => {
    if (getEngineData) {
      const stored = getEngineData('tax');
      if (stored) {
        setFormData(prev => ({ ...prev, ...stored }));
        setIsAutofilled(true);
      }
    }
  }, [getEngineData]);

  const [result, setResult] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const handleChange = (key, val) => setFormData(p => ({ ...p, [key]: val }));

  const applyPreset = (preset) => {
    setFormData(prev => ({ ...prev, ...preset }));
    setIsAutofilled(false);
  };

  const isStepValid = () => {
    const required = STEPS[step].fields.filter(f => !f.optional);
    return required.every(f => formData[f.key] !== undefined && formData[f.key] !== '');
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
        const msgs = [
          'Aggregating all income sources...', 'Computing GTI under Indian Tax Law...',
          'Applying deductions (80C / 80D / NPS / HRA)...', 'Calculating slab taxes + capital gains...',
          'Applying surcharge and 4% cess...', 'Optimising Old vs New regime verdict...'
        ];
        for (let i = 0; i < msgs.length; i++) {
          setLoadingStep(i);
          await new Promise(r => setTimeout(r, 500));
        }

        try {
          const payload = {
            age: parseInt(formData.age) || 30,
            residential_status: formData.residential_status || 'Resident',
            regime_choice: formData.regime_choice || 'Auto',
            salary_income: parseFloat(formData.salary_income) || 0,
            business_income: parseFloat(formData.business_income) || 0,
            rental_income: parseFloat(formData.rental_income) || 0,
            interest_income: parseFloat(formData.interest_income) || 0,
            capital_gains: {
              stcg: parseFloat(formData.stcg) || 0,
              ltcg: parseFloat(formData.ltcg) || 0,
              stcg_debt: parseFloat(formData.stcg_debt) || 0,
              ltcg_debt: 0,
            },
            current_80c: parseFloat(formData.c80c) || 0,
            current_80d: parseFloat(formData.c80d) || 0,
            current_nps: parseFloat(formData.nps) || 0,
            hra_exemption: parseFloat(formData.hra) || 0,
            home_loan_interest: parseFloat(formData.home_loan) || 0,
            education_loan_interest: parseFloat(formData.edu_loan) || 0,
            tax_saving_budget: parseFloat(formData.tax_saving_budget) || 150000,
            risk_profile: formData.risk_profile || 'Moderate',
            salary_growth_rate: parseFloat(formData.salary_growth_rate) || 10,
            business_growth_rate: parseFloat(formData.business_growth_rate) || 15,
            inflation_rate: parseFloat(formData.inflation_rate) || 6,
          };

          // Persist data for user
          if (saveEngineData) {
            saveEngineData('tax', formData);
          }

          const res = await fetch('http://localhost:8000/api/tax', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          setResult(data);
        } catch (err) {
          alert('Failed to connect to AI engine. Make sure Python backend is running.');
        } finally { setLoading(false); }
      }, 200);
    }
  };

  const prevStep = () => { setAnimating(true); setTimeout(() => { setStep(s => s - 1); setAnimating(false); }, 200); };
  const reset = () => { setResult(null); setStep(0); };

  // ── Loader ──────────────────────────────────────────────────────────────────
  if (loading) {
    const messages = [
      'Aggregating all income sources...', 'Computing GTI under Indian Tax Law...',
      'Applying deductions (80C / 80D / NPS / HRA)...', 'Calculating slab taxes + capital gains...',
      'Applying surcharge and 4% cess...', 'Optimising Old vs New regime verdict...'
    ];
    return (
      <div className="tax-page flex-center" style={{ minHeight: '100vh' }}>
        <div className="loader-container">
          <div className="cube-wrapper"><div className="cube"><div className="cube-faces">
            <div className="cube-face shadow"/><div className="cube-face bottom"/>
            <div className="cube-face top"/><div className="cube-face left"/>
            <div className="cube-face right"/><div className="cube-face back"/>
            <div className="cube-face front"/>
          </div></div></div>
          <h2 className="loader-title">Computing Your Tax</h2>
          <p className="loader-text">{messages[loadingStep]}</p>
          <div className="loader-bar-container">
            <div className="loader-bar-fill" style={{ width: `${((loadingStep + 1) / messages.length) * 100}%` }} />
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────
  if (result) {
    const r = result;
    const isNew = r.recommended_regime === 'New Regime' || r.recommended_regime === 'New';
    const regimeColor = isNew ? '#10b981' : '#6366f1';
    const finalTax = isNew ? r.final_tax?.new_regime : r.final_tax?.old_regime;
    const otherTax = isNew ? r.final_tax?.old_regime : r.final_tax?.new_regime;
    const ded = r.deductions || {};
    const gti = r.gti_breakdown || {};
    const cg = r.capital_gains_tax || {};
    const proj = r.future_projection || {};

    return (
      <div className="eng-dash">
        {/* Sticky Header Nav */}
        <header className="eng-nav">
          <Link to="/" className="eng-nav-brand">
            <div className="eng-nav-icon">🧾</div>
            FINEXO · <span>AI Tax Intelligence & Regime Engine</span>
          </Link>
          <div className="eng-nav-right">
            {user && (
              <span style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 600, background: 'rgba(99,102,241,0.12)', padding: '0.35rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.25)' }}>
                👤 {user.name}
              </span>
            )}
            <button className="eng-btn-ghost" onClick={reset}>
              ← Re-Analyse
            </button>
            <button className="eng-btn-primary" onClick={() => window.print()}>
              Export Tax Plan 📄
            </button>
          </div>
        </header>

        <main className="eng-dash-body">
          {/* Top Heading */}
          <div className="eng-dash-header-row dash-anim-1">
            <div className="eng-dash-title-wrap">
              <h1>Tax Optimization & Statutory Regime Cockpit</h1>
              <p>FY 2024-25 (AY 2025-26) · Income Tax Act Framework × AI 80C/80D/NPS Allocation Matrix</p>
            </div>
            <div className="eng-dash-actions">
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#34d399', background: 'rgba(16,185,129,0.12)', padding: '0.4rem 0.9rem', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.25)' }}>
                ✨ {isNew ? 'New Regime Optimal' : 'Old Regime Optimal'} (Save ₹{fmt(r.savings_differential)})
              </span>
            </div>
          </div>

          {/* ── ROW 1: 4 Top KPI Cards ── */}
          <div className="kpi-row-4 dash-anim-1">
            {/* Card 1: Gross Total Income */}
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">GROSS TOTAL INCOME (GTI)</span>
                <span className="kpi-badge info">Step 1 Total</span>
              </div>
              <div className="kpi-value blue">₹{fmt(gti.total_gross_income)}</div>
              <div className="kpi-footer">
                <span className="kpi-trend-text">Salary + Business + Rental + Gains</span>
                <span className="kpi-sub-desc">Taxable baseline before chapter VI-A deductions</span>
              </div>
            </div>

            {/* Card 2: Recommended Regime */}
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">RECOMMENDED REGIME</span>
                <span className="kpi-badge up">Save ₹{fmt(r.savings_differential)}</span>
              </div>
              <div className="kpi-value green">{r.recommended_regime}</div>
              <div className="kpi-footer">
                <span className="kpi-trend-text">Optimal Statutory Route</span>
                <span className="kpi-sub-desc">{isNew ? 'Simplified rates without lock-in' : `Maximizing ₹${fmt(ded.total_deductions_old)} deductions`}</span>
              </div>
            </div>

            {/* Card 3: Final Tax Payable */}
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">TOTAL TAX PAYABLE</span>
                <span className="kpi-badge down">Eff. {pct(isNew ? r.effective_rate?.new_regime : r.effective_rate?.old_regime)}</span>
              </div>
              <div className="kpi-value" style={{ color: '#f59e0b' }}>₹{fmt(finalTax)}</div>
              <div className="kpi-footer">
                <span className="kpi-trend-text">Includes 4% Health & Edu Cess</span>
                <span className="kpi-sub-desc">vs ₹{fmt(otherTax)} in alternative regime</span>
              </div>
            </div>

            {/* Card 4: Deductions Claimed */}
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">TOTAL DEDUCTIONS CLAIMED</span>
                <span className="kpi-badge info">VI-A Applied</span>
              </div>
              <div className="kpi-value purple">₹{fmt(isNew ? ded.standard_deduction_new : ded.total_deductions_old)}</div>
              <div className="kpi-footer">
                <span className="kpi-trend-text">Sec 80C + 80D + NPS + HRA</span>
                <span className="kpi-sub-desc">Reduced taxable base significantly</span>
              </div>
            </div>
          </div>

          {/* ── ROW 2: Regime Comparison + Slab Breakdown ── */}
          <div className="dash-grid-2 dash-anim-2">
            {/* Left: Old vs New Regime Comparison */}
            <div className="dash-card">
              <div className="dash-card-head">
                <div>
                  <h3 className="dash-card-title">Old vs New Regime Comparative Evaluation</h3>
                  <p className="dash-card-desc">Full statutory side-by-side calculation under Finance Act 2024</p>
                </div>
                <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: '5px' }}>
                  Save ₹{fmt(r.savings_differential)}/yr
                </span>
              </div>

              <div className="tax-compare-wrap" style={{ margin: '1rem 0' }}>
                <div className={`regime-box ${!isNew ? 'winner' : ''}`}>
                  <div className="regime-label">Old Regime</div>
                  <div className="regime-amount" style={{ color: !isNew ? '#34d399' : '#f87171' }}>
                    ₹{fmt(r.final_tax?.old_regime)}
                  </div>
                  <div className="regime-eff">Eff. rate: {pct(r.effective_rate?.old_regime)}</div>
                  {!isNew && <div className="regime-badge">✓ Recommended</div>}
                </div>
                <div className="vs-divider">
                  <div className="savings-pill">Save ₹{fmt(r.savings_differential)}</div>
                  <span>VS</span>
                </div>
                <div className={`regime-box ${isNew ? 'winner' : ''}`}>
                  <div className="regime-label">New Regime</div>
                  <div className="regime-amount" style={{ color: isNew ? '#34d399' : '#f87171' }}>
                    ₹{fmt(r.final_tax?.new_regime)}
                  </div>
                  <div className="regime-eff">Eff. rate: {pct(r.effective_rate?.new_regime)}</div>
                  {isNew && <div className="regime-badge">✓ Recommended</div>}
                </div>
              </div>

              {/* Tax Composition */}
              <div className="tax-composition">
                {[
                  { label: 'Basic Slab Tax', old: r.final_tax?.old_regime - (r.surcharge?.old_regime||0) - (r.cess_4pct?.old_regime||0), new: r.final_tax?.new_regime - (r.surcharge?.new_regime||0) - (r.cess_4pct?.new_regime||0) },
                  { label: 'Capital Gains Tax', old: cg.total_cg_tax, new: cg.total_cg_tax },
                  { label: 'Surcharge', old: r.surcharge?.old_regime, new: r.surcharge?.new_regime },
                  { label: '4% Health & Edu Cess', old: r.cess_4pct?.old_regime, new: r.cess_4pct?.new_regime },
                ].filter(i => (i.old || 0) + (i.new || 0) > 0).map((item, i) => (
                  <div key={i} className="comp-row">
                    <span className="comp-label">{item.label}</span>
                    <span className="comp-old">₹{fmt(item.old || 0)}</span>
                    <span className="comp-new">₹{fmt(item.new || 0)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Slab Breakdown */}
            <div className="dash-card">
              <div className="dash-card-head">
                <div>
                  <h3 className="dash-card-title">Tax Slab Breakdown ({r.recommended_regime})</h3>
                  <p className="dash-card-desc">Marginal progressive tax calculation across slabs</p>
                </div>
                <span style={{ fontSize: '0.74rem', color: '#818cf8', fontWeight: 700, background: 'rgba(99,102,241,0.1)', padding: '3px 8px', borderRadius: '5px' }}>
                  Progressive Tax Slabs
                </span>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <SlabChart
                  slabs={isNew ? r.slab_tax?.new_regime_slabs : r.slab_tax?.old_regime_slabs}
                  totalTax={finalTax || 1}
                />
              </div>

              <div style={{ marginTop: '1.2rem', padding: '0.9rem', background: 'rgba(255,255,255,0.025)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Total Payable (including ₹{fmt(isNew ? r.cess_4pct?.new_regime : r.cess_4pct?.old_regime)} Cess):</span>
                <strong style={{ fontSize: '1.15rem', color: '#f59e0b', fontFamily: 'Outfit, sans-serif' }}>₹{fmt(finalTax)}</strong>
              </div>
            </div>
          </div>

          {/* ── ROW 3: Deductions & Opportunities ── */}
          <div className="dash-grid-2 dash-anim-3">
            {/* Left: Deductions Matrix */}
            <div className="dash-card">
              <div className="dash-card-head">
                <div>
                  <h3 className="dash-card-title">Deduction & Exemption Matrix</h3>
                  <p className="dash-card-desc">Chapter VI-A utilization and statutory limit headroom</p>
                </div>
              </div>

              <div className="deduction-grid" style={{ marginTop: '0.6rem' }}>
                <DeductionMeter label="Sec 80C (ELSS/PPF/LIC/EPF)" used={ded.section_80c || 0} cap={150000} color="#6366f1" />
                <DeductionMeter label="NPS — 80CCD(1B)" used={ded.section_80ccd_nps || 0} cap={50000} color="#38bdf8" />
                <DeductionMeter label="Health Insurance — 80D" used={ded.section_80d || 0} cap={parseInt(formData.age) >= 60 ? 50000 : 25000} color="#10b981" />
                <DeductionMeter label="Home Loan Interest — Sec 24(b)" used={ded.home_loan_interest_24b || 0} cap={200000} color="#f59e0b" />
              </div>
            </div>

            {/* Right: AI Tax-Saving Opportunities & Next Year Forecast */}
            <div className="dash-card">
              <div className="dash-card-head">
                <div>
                  <h3 className="dash-card-title">AI Tax Optimization & Next Year Forecast</h3>
                  <p className="dash-card-desc">Actionable strategies to reduce liabilities and next FY projection</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1rem' }}>
                <div className="insight-metric-tile">
                  <div className="insight-tile-label"><span>📈</span> Next FY Projected Income</div>
                  <div className="insight-tile-val" style={{ color: '#60a5fa', fontSize: '1.15rem' }}>
                    ₹{fmt(proj.future_total_income || 0)}
                  </div>
                  <div className="insight-tile-sub">Assuming +{formData.salary_growth_rate || 10}% growth</div>
                </div>
                <div className="insight-metric-tile">
                  <div className="insight-tile-label"><span>🔮</span> Better Regime Next FY</div>
                  <div className="insight-tile-val" style={{ color: '#34d399', fontSize: '1.15rem' }}>
                    {proj.future_tax_new_regime < proj.future_tax_old_regime ? 'New Regime' : 'Old Regime'}
                  </div>
                  <div className="insight-tile-sub">Est. Tax: ₹{fmt(Math.min(proj.future_tax_old_regime || 0, proj.future_tax_new_regime || 0))}</div>
                </div>
              </div>

              {/* Suggestions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {!r.tax_saving_suggestions || r.tax_saving_suggestions.length === 0 ? (
                  <p style={{ color: '#34d399', fontSize: '0.84rem' }}>✅ All major deduction sections are fully utilised!</p>
                ) : (
                  r.tax_saving_suggestions.slice(0, 3).map((s, i) => (
                    <div key={i} className="suggestion-item-v2" style={{ padding: '0.7rem' }}>
                      <div className="sug-v2-main">
                        <span className="sug-v2-icon">{s.icon}</span>
                        <div className="sug-v2-info">
                          <p className="sug-v2-label" style={{ fontSize: '0.82rem' }}>{s.label} <span className="sug-section-tag">{s.section}</span></p>
                          <p className="sug-v2-detail" style={{ fontSize: '0.74rem' }}>{s.detail}</p>
                        </div>
                      </div>
                      <div className="sug-v2-action">
                        <span className="sug-v2-benefit" style={{ fontSize: '0.8rem' }}>Save ₹{fmt(s.tax_saved)}/yr</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }


  // ── Form ────────────────────────────────────────────────────────────────────
  const cur = STEPS[step];
  return (
    <div className="tax-page">
      <header className="tax-header">
        <Link to="/" className="tax-logo" style={{ textDecoration: 'none', color: '#fff' }}>
          <div className="tax-logo-icon">⚖️</div>
          FINEXO · <span>AI Tax Planner</span>
        </Link>
        <div className="tax-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          {user && (
            <div className="tax-user-badge" style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600, padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
              <span>👤 {user.name}</span>
            </div>
          )}
          <Link to="/" className="tax-back-btn">← Back to Hub</Link>
        </div>
      </header>

      <div className="tax-form-wrapper">
        {/* Autofill Notification */}
        {isAutofilled && (
          <div className="tax-autofill-banner" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.82rem', fontWeight: 600, padding: '0.6rem 1.2rem', borderRadius: '100px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)' }}>
            <span>✨ Pre-filled with your saved tax profile. Edit any value freely.</span>
          </div>
        )}

        {/* 1-Click Fast Presets on Step 0 */}
        {step === 0 && (
          <div className="tax-presets-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', width: '100%', maxWidth: '600px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ⚡ 1-Click Tax Profile Presets:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.6rem', width: '100%' }}>
              <button 
                type="button" 
                className="tax-preset-btn"
                style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f1f5f9', fontSize: '0.82rem', fontWeight: 600, padding: '0.5rem 0.9rem', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={() => applyPreset({
                  age: 28,
                  salary_income: 900000,
                  c80c: 150000,
                  c80d: 25000,
                  nps: 0,
                  hra: 80000
                })}
              >
                💼 Salaried ₹9L (Standard)
              </button>
              <button 
                type="button" 
                className="tax-preset-btn"
                style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f1f5f9', fontSize: '0.82rem', fontWeight: 600, padding: '0.5rem 0.9rem', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={() => applyPreset({
                  age: 34,
                  salary_income: 2200000,
                  c80c: 150000,
                  c80d: 50000,
                  nps: 50000,
                  hra: 180000,
                  home_loan: 150000
                })}
              >
                🚀 Senior Tech ₹22L (Max 80C/NPS)
              </button>
              <button 
                type="button" 
                className="tax-preset-btn"
                style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f1f5f9', fontSize: '0.82rem', fontWeight: 600, padding: '0.5rem 0.9rem', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={() => applyPreset({
                  age: 30,
                  salary_income: 0,
                  business_income: 1800000,
                  c80c: 150000,
                  c80d: 25000,
                  nps: 50000
                })}
              >
                💻 Freelancer ₹18L (44ADA)
              </button>
            </div>
          </div>
        )}

        <div className="form-progress">
          {STEPS.map((s, i) => (
            <div key={i} className={`progress-step ${i <= step ? 'done' : ''}`}>
              <div className="progress-dot">{i < step ? '✓' : s.icon}</div>
              <span className="progress-label">{s.title}</span>
              {i < STEPS.length - 1 && <div className={`progress-line ${i < step ? 'filled' : ''}`} />}
            </div>
          ))}
        </div>

        {/* Premium Poker-Card Input */}
        <div className={`adv-poker-card ${animating ? 'card-exit' : 'card-enter'}`} style={{ borderColor: 'rgba(245, 158, 11, 0.22)' }}>
          <div className="poker-card-glow" style={{ background: 'radial-gradient(ellipse, rgba(245,158,11,0.14) 0%, transparent 70%)' }} />

          <div className="poker-card-header">
            <div className="poker-card-icon-wrap" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(245,158,11,0.06))', border: '1px solid rgba(245,158,11,0.3)', boxShadow: '0 0 20px rgba(245,158,11,0.25)' }}>
              <span className="poker-card-icon">{cur.icon}</span>
            </div>
            <div>
              <h2 className="poker-card-title" style={{ background: 'linear-gradient(135deg, #fff 30%, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{cur.title}</h2>
              <p className="poker-card-step">Step {step + 1} / {STEPS.length} · Tax Cockpit</p>
            </div>
            <div className="poker-card-corner-badge" style={{ color: 'rgba(245,158,11,0.85)', borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.07)' }}>
              {step + 1}<span>/{STEPS.length}</span>
            </div>
          </div>

          <div className="poker-fields-grid">
            {cur.fields.map(field => {
              const val = Number(formData[field.key]) || 0;
              const formatted = field.type === 'select' ? null
                : field.unit === '₹'
                  ? val >= 100000 ? `₹${(val / 100000).toFixed(2)} L` : `₹${val.toLocaleString('en-IN')}`
                  : `${val}${field.unit}`;
              return (
                <div key={field.key} className="poker-field-card" style={{ borderColor: 'rgba(245,158,11,0.08)' }}>
                  <div className="pf-card-label-row">
                    <span className="pf-card-label">
                      {field.label}
                      {field.optional && <span style={{ fontSize: '0.7rem', color: '#475569' }}> (opt)</span>}
                    </span>
                    {formatted && (
                      <span className="pf-card-live-val" style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)' }}>
                        {formatted}
                      </span>
                    )}
                  </div>

                  {field.type === 'select' ? (
                    <select className="field-select" value={formData[field.key] || field.options[0]}
                      onChange={e => handleChange(field.key, e.target.value)}
                      style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.7rem', color: '#fff', fontSize: '0.88rem', width: '100%', outline: 'none' }}>
                      {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <>
                      <div className="field-input-wrap">
                        <span className="field-unit">{field.unit}</span>
                        <input type="number" min="0" className="field-input" placeholder={field.placeholder}
                          value={formData[field.key] ?? ''}
                          onChange={e => handleChange(field.key, e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && nextStep()} />
                      </div>

                      {field.min !== undefined && (
                        <div className="pf-slider-row">
                          <input type="range" min={field.min} max={field.max} step={field.step}
                            value={val} onChange={e => handleChange(field.key, e.target.value)}
                            className="adv-range-slider" style={{ accentColor: '#f59e0b' }} />
                          <div className="slider-labels">
                            <span>{field.unit === '₹' ? `₹${(field.min/1000).toFixed(0)}k` : field.min}</span>
                            <span>{field.unit === '₹' ? `₹${(field.max/100000).toFixed(0)}L` : field.max}</span>
                          </div>
                        </div>
                      )}

                      {field.maxCap && (
                        <div style={{ marginTop: '6px' }}>
                          <button type="button"
                            onClick={() => handleChange(field.key, field.maxCap)}
                            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.28)', color: '#f59e0b', fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit' }}>
                            ⚡ Max Limit ₹{(field.maxCap/1000).toFixed(0)}k
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  <p className="field-hint">{field.hint}</p>
                </div>
              );
            })}
          </div>

          <div className="poker-card-actions">
            {step > 0 && <button className="btn-secondary" onClick={prevStep}>← Back</button>}
            <button className={`btn-primary ${!isStepValid() ? 'disabled' : ''}`} onClick={nextStep} disabled={!isStepValid()}>
              {step === STEPS.length - 1 ? '🧾 Compute My Tax' : 'Next →'}
            </button>
          </div>
        </div>
      </div>

      <footer className="tax-footer">
        <p>Backend computes: GTI → Deductions → Slab Tax + Capital Gains + Surcharge + 4% Cess · FY 2024-25</p>
      </footer>
    </div>
  );
}


