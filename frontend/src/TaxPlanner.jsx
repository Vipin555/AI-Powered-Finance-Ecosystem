import React, { useState, useEffect } from 'react';
import './tax.css';

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
    const regimeColor = isNew ? '#4caf8e' : '#f26622';
    const finalTax = isNew ? r.final_tax?.new_regime : r.final_tax?.old_regime;
    const otherTax = isNew ? r.final_tax?.old_regime : r.final_tax?.new_regime;
    const ded = r.deductions || {};
    const gti = r.gti_breakdown || {};
    const cg = r.capital_gains_tax || {};
    const proj = r.future_projection || {};

    return (
      <div className="tax-page">
        <header className="tax-header">
          <div className="tax-logo"><div className="tax-logo-icon">F</div>FINEXO · <span>AI Tax Planner</span></div>
          <button className="tax-back-btn" onClick={reset}>← Re-analyse</button>
        </header>

        <div className="tax-dashboard">

          {/* Summary Strip */}
          <div className="tax-strip">
            <div className="strip-item">
              <span className="strip-lbl">Gross Total Income</span>
              <span className="strip-val">₹{fmt(gti.total_gross_income)}</span>
            </div>
            <div className="strip-item">
              <span className="strip-lbl">Deductions (Old Regime)</span>
              <span className="strip-val">−₹{fmt(ded.total_deductions_old)}</span>
            </div>
            <div className="strip-item">
              <span className="strip-lbl">Taxable (Old)</span>
              <span className="strip-val">₹{fmt(r.taxable_income?.old_regime)}</span>
            </div>
            <div className="strip-item">
              <span className="strip-lbl">Taxable (New)</span>
              <span className="strip-val">₹{fmt(r.taxable_income?.new_regime)}</span>
            </div>
            <div className="strip-item">
              <span className="strip-lbl">Recommended Regime</span>
              <span className="strip-val" style={{ color: regimeColor }}>{r.recommended_regime}</span>
            </div>
          </div>

          {/* Tax Verdict */}
          <div className="tax-card verdict-hero" style={{ borderLeft: `6px solid ${regimeColor}` }}>
            <div className="verdict-icon">📜</div>
            <div className="verdict-content">
              <h3 className="verdict-title">
                {isNew ? '✅ New Regime is Better for You' : '💡 Old Regime Saves More Tax'}
              </h3>
              <p className="verdict-text">
                You save <strong style={{ color: '#4caf8e' }}>₹{fmt(r.savings_differential)}</strong> per year by choosing <strong>{r.recommended_regime}</strong>.
                Your final tax liability is <strong style={{ color: regimeColor }}>₹{fmt(finalTax)}</strong> vs ₹{fmt(otherTax)} in the other regime.
                {isNew
                  ? ' Clean, simple — no lock-ins or paperwork required.'
                  : ` Your deductions of ₹${fmt(ded.total_deductions_old)} make Old Regime highly efficient.`}
              </p>
            </div>
          </div>

          {/* Old vs New Comparison + Slab Breakdown */}
          <div className="tax-row tax-row-2">
            <div className="tax-card">
              <h3 className="tax-sec-title">⚖️ Old vs New Regime Comparison</h3>
              <div className="tax-compare-wrap">
                <div className={`regime-box ${!isNew ? 'winner' : ''}`}>
                  <div className="regime-label">Old Regime</div>
                  <div className="regime-amount" style={{ color: !isNew ? '#4caf8e' : '#ef4444' }}>
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
                  <div className="regime-amount" style={{ color: isNew ? '#4caf8e' : '#ef4444' }}>
                    ₹{fmt(r.final_tax?.new_regime)}
                  </div>
                  <div className="regime-eff">Eff. rate: {pct(r.effective_rate?.new_regime)}</div>
                  {isNew && <div className="regime-badge">✓ Recommended</div>}
                </div>
              </div>

              {/* Tax composition breakdown */}
              <div className="tax-composition">
                {[
                  { label: 'Slab Tax', old: r.final_tax?.old_regime - (r.surcharge?.old_regime||0) - (r.cess_4pct?.old_regime||0), new: r.final_tax?.new_regime - (r.surcharge?.new_regime||0) - (r.cess_4pct?.new_regime||0) },
                  { label: 'Capital Gains Tax', old: cg.total_cg_tax, new: cg.total_cg_tax },
                  { label: 'Surcharge', old: r.surcharge?.old_regime, new: r.surcharge?.new_regime },
                  { label: '4% Cess', old: r.cess_4pct?.old_regime, new: r.cess_4pct?.new_regime },
                ].filter(i => (i.old || 0) + (i.new || 0) > 0).map((item, i) => (
                  <div key={i} className="comp-row">
                    <span className="comp-label">{item.label}</span>
                    <span className="comp-old">₹{fmt(item.old || 0)}</span>
                    <span className="comp-new">₹{fmt(item.new || 0)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="tax-card">
              <h3 className="tax-sec-title">📊 Slab Breakdown ({r.recommended_regime})</h3>
              <SlabChart
                slabs={isNew ? r.slab_tax?.new_regime_slabs : r.slab_tax?.old_regime_slabs}
                totalTax={finalTax || 1}
              />
              <p className="tax-note" style={{ marginTop: '1rem' }}>
                Includes 4% cess (₹{fmt(isNew ? r.cess_4pct?.new_regime : r.cess_4pct?.old_regime)}).&nbsp;
                Net payable: <strong style={{ color: '#f26622' }}>₹{fmt(finalTax)}</strong>
              </p>
            </div>
          </div>

          {/* GTI Waterfall */}
          <div className="tax-card tax-full">
            <h3 className="tax-sec-title">📥 GTI Computation — Step 1</h3>
            <p className="tax-note" style={{ marginBottom: '1rem' }}>GTI = Salary + Business + Rental (after 30% std ded.) + Interest + Debt CG</p>
            <GTIWaterfall gti={gti} />
          </div>

          {/* Deduction Breakdown */}
          <div className="tax-card tax-full">
            <h3 className="tax-sec-title">🎯 Deduction Application — Step 2</h3>
            <div className="deduction-grid">
              <DeductionMeter label="Sec 80C (ELSS/PPF/LIC/EPF)" used={ded.section_80c || 0} cap={150000} color="#f26622" />
              <DeductionMeter label="NPS — 80CCD(1B)" used={ded.section_80ccd_nps || 0} cap={50000} color="#4c9af2" />
              <DeductionMeter label="Health Insurance — 80D" used={ded.section_80d || 0} cap={parseInt(formData.age) >= 60 ? 50000 : 25000} color="#4caf8e" />
              <DeductionMeter label="Home Loan Interest — Sec 24(b)" used={ded.home_loan_interest_24b || 0} cap={200000} color="#f59e0b" />
            </div>
            <div className="breakdown-table" style={{ marginTop: '1.5rem' }}>
              {[
                ['Standard Deduction (Old)', ded.standard_deduction_old],
                ['Standard Deduction (New)', ded.standard_deduction_new],
                ['Section 80C', ded.section_80c],
                ['Section 80CCD(1B) NPS', ded.section_80ccd_nps],
                ['Section 80D Health Insurance', ded.section_80d],
                ['HRA Exemption', ded.hra_exemption],
                ['Home Loan Interest 24(b)', ded.home_loan_interest_24b],
                ['Education Loan 80E', ded.education_loan_interest],
              ].filter(([, v]) => v > 0).map(([label, val]) => (
                <div key={label} className="breakdown-row">
                  <span className="br-label">{label}</span>
                  <span className="br-val" style={{ color: '#4caf8e' }}>−₹{fmt(val)}</span>
                </div>
              ))}
              <div className="breakdown-row total-row">
                <span className="br-label">Total Deductions (Old Regime)</span>
                <span className="br-val" style={{ color: '#f26622' }}>−₹{fmt(ded.total_deductions_old)}</span>
              </div>
            </div>
          </div>

          {/* Capital Gains (if any) */}
          {cg.total_cg_tax > 0 && (
            <div className="tax-card tax-full">
              <h3 className="tax-sec-title">📈 Capital Gains Tax — Separately Computed</h3>
              <div className="cg-grid">
                {[
                  { label: 'Equity STCG', rate: '20%', amount: cg.equity_stcg?.amount, tax: cg.equity_stcg?.tax, color: '#ef4444' },
                  { label: 'Equity LTCG (over ₹1.25L exempt)', rate: '12.5%', amount: cg.equity_ltcg?.amount, tax: cg.equity_ltcg?.tax, color: '#f59e0b' },
                  { label: 'Debt STCG/LTCG', rate: 'Slab Rate', amount: cg.debt_stcg_ltcg?.amount, tax: 'In slab', color: '#4c9af2' },
                ].filter(i => i.amount > 0).map((item, i) => (
                  <div key={i} className="cg-row">
                    <div className="cg-label" style={{ color: item.color }}>{item.label}</div>
                    <div className="cg-meta">
                      <span>₹{fmt(item.amount)} × {item.rate}</span>
                      <strong>= ₹{typeof item.tax === 'number' ? fmt(item.tax) : item.tax}</strong>
                    </div>
                  </div>
                ))}
                <div className="cg-total">
                  <span>Total Capital Gains Tax</span>
                  <strong style={{ color: '#f26622' }}>₹{fmt(cg.total_cg_tax)}</strong>
                </div>
              </div>
            </div>
          )}

          {/* AI Tax Portfolio Allocation (Layer 3) */}
          {r.optimal_tax_allocation && (
            <div className="tax-card tax-full" style={{ border: '1px solid var(--accent)', background: 'rgba(242, 102, 34, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <div>
                  <h3 className="tax-sec-title" style={{ margin: 0, color: 'var(--accent)' }}>🤖 AI Optimal Tax Portfolio</h3>
                  <p className="tax-note" style={{ margin: '0.2rem 0 0 0' }}>Based on a budget of ₹{fmt(formData.tax_saving_budget || 150000)} and {formData.risk_profile || 'Moderate'} risk profile.</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Estimated Tax Saved</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4caf8e' }}>₹{fmt(r.optimal_tax_allocation.estimated_tax_saved)}</div>
                </div>
              </div>
              
              <div className="alloc-bar-wrap" style={{ marginBottom: '1.5rem' }}>
                <div className="alloc-bar-track">
                  <div className="alloc-fill" style={{ width: `${(r.optimal_tax_allocation.elss / Math.max(1, r.optimal_tax_allocation.total_allocated)) * 100}%`, background: '#f26622' }} title="ELSS" />
                  <div className="alloc-fill" style={{ width: `${(r.optimal_tax_allocation.ppf / Math.max(1, r.optimal_tax_allocation.total_allocated)) * 100}%`, background: '#4c9af2' }} title="PPF" />
                  <div className="alloc-fill" style={{ width: `${(r.optimal_tax_allocation.nps / Math.max(1, r.optimal_tax_allocation.total_allocated)) * 100}%`, background: '#f59e0b' }} title="NPS" />
                  <div className="alloc-fill" style={{ width: `${(r.optimal_tax_allocation.health_insurance / Math.max(1, r.optimal_tax_allocation.total_allocated)) * 100}%`, background: '#4caf8e' }} title="Health" />
                </div>
                <div className="alloc-legend">
                  <div className="alloc-dot-item"><span style={{ color: '#f26622' }}>●</span> ELSS: ₹{fmt(r.optimal_tax_allocation.elss)}</div>
                  <div className="alloc-dot-item"><span style={{ color: '#4c9af2' }}>●</span> PPF: ₹{fmt(r.optimal_tax_allocation.ppf)}</div>
                  <div className="alloc-dot-item"><span style={{ color: '#f59e0b' }}>●</span> NPS: ₹{fmt(r.optimal_tax_allocation.nps)}</div>
                  <div className="alloc-dot-item"><span style={{ color: '#4caf8e' }}>●</span> Health (80D): ₹{fmt(r.optimal_tax_allocation.health_insurance)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Deduction Capacity + Suggestions */}
          <div className="tax-row tax-row-2">
            <div className="tax-card">
              <h3 className="tax-sec-title">💡 Tax-Saving Opportunities</h3>
              {!r.tax_saving_suggestions || r.tax_saving_suggestions.length === 0
                ? <p className="tax-note" style={{ color: '#4caf8e' }}>✅ All major deduction sections are fully utilised!</p>
                : r.tax_saving_suggestions.map((s, i) => (
                  <div key={i} className="suggestion-item-v2">
                    <div className="sug-v2-main">
                      <span className="sug-v2-icon">{s.icon}</span>
                      <div className="sug-v2-info">
                        <p className="sug-v2-label">{s.label} <span className="sug-section-tag">{s.section}</span></p>
                        <p className="sug-v2-detail">{s.detail}</p>
                      </div>
                    </div>
                    <div className="sug-v2-action">
                      <span className="sug-v2-benefit">Save ₹{fmt(s.tax_saved)}/yr</span>
                      {s.deduction_available > 0 && <span className="sug-deduction">Deduction: ₹{fmt(s.deduction_available)}</span>}
                    </div>
                  </div>
                ))}
            </div>

            <div className="tax-card">
              <h3 className="tax-sec-title">🤖 ML Tax Forecast (Next Year)</h3>
              <p className="tax-note" style={{ margin: '-0.4rem 0 1rem 0' }}>Using linear regression based on {formData.salary_growth_rate || 10}% salary growth, {formData.business_growth_rate || 15}% business growth, and {formData.inflation_rate || 6}% inflation.</p>
              <div className="projection-grid">
                <div className="proj-item">
                  <span className="proj-lbl">Projected Income</span>
                  <span className="proj-val">₹{fmt(proj.future_total_income)}</span>
                </div>
                <div className="proj-item">
                  <span className="proj-lbl">Tax — Old Regime</span>
                  <span className="proj-val" style={{ color: proj.future_tax_old_regime <= proj.future_tax_new_regime ? '#4caf8e' : '#ef4444' }}>
                    ₹{fmt(proj.future_tax_old_regime)}
                  </span>
                </div>
                <div className="proj-item">
                  <span className="proj-lbl">Tax — New Regime</span>
                  <span className="proj-val" style={{ color: proj.future_tax_new_regime <= proj.future_tax_old_regime ? '#4caf8e' : '#ef4444' }}>
                    ₹{fmt(proj.future_tax_new_regime)}
                  </span>
                </div>
                <div className="proj-item">
                  <span className="proj-lbl">Better Next Year</span>
                  <span className="proj-val" style={{ color: '#f26622' }}>
                    {proj.future_tax_new_regime < proj.future_tax_old_regime ? 'New' : 'Old'} Regime
                  </span>
                </div>
              </div>
              <div className="unused-caps">
                <p className="tax-sec-title" style={{ fontSize: '0.8rem', marginBottom: '0.6rem' }}>Deduction Gap Analysis</p>
                {Object.entries(r.deduction_gap_analysis || {}).filter(([,v]) => v > 0).map(([k, v]) => (
                  <div key={k} className="unused-row">
                    <span>{k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    <span style={{ color: '#f59e0b' }}>₹{fmt(v)} gap</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
        <footer className="tax-footer">
          <p>Backend Tax Engine: FY 2024-25 (AY 2025-26) · GTI → Deductions → Slab Tax + CG Tax + Surcharge + 4% Cess</p>
        </footer>
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

        {/* Cockpit Container */}
        <div className="tax-cockpit-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.8rem', width: '100%', maxWidth: '980px', alignItems: 'start' }}>
          <div className={`form-card ${animating ? 'fade-out' : 'fade-in'}`}>
            <div className="form-card-icon">{cur.icon}</div>
            <h2 className="form-card-title">{cur.title}</h2>
            <p className="form-card-sub">Step {step + 1} of {STEPS.length} · Interactive Tax Cockpit</p>

            <div className="form-fields">
              {cur.fields.map(field => {
                const val = Number(formData[field.key]) || 0;
                return (
                  <div key={field.key} className="form-field-cockpit" style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '1.1rem 1.25rem', marginBottom: '1.1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="field-label" style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.86rem' }}>
                        {field.label}
                        {field.optional && <span className="optional-tag" style={{ fontSize: '0.72rem', color: '#64748b' }}> (optional)</span>}
                      </label>
                      {field.type !== 'select' && (
                        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.88rem', fontWeight: 800, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '2px 10px', borderRadius: '100px' }}>
                          {field.unit === '₹' 
                            ? val >= 100000 
                              ? `₹${(val / 100000).toFixed(2)} Lakhs` 
                              : `₹${val.toLocaleString('en-IN')}`
                            : `${val}${field.unit}`}
                        </span>
                      )}
                    </div>

                    {field.type === 'select' ? (
                      <select className="field-select" value={formData[field.key] || field.options[0]}
                        onChange={e => handleChange(field.key, e.target.value)}
                        style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '0.75rem 0.9rem', color: '#fff', fontSize: '0.88rem', outline: 'none' }}>
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                            <input
                              type="range"
                              min={field.min}
                              max={field.max}
                              step={field.step}
                              value={val}
                              onChange={e => handleChange(field.key, e.target.value)}
                              className="adv-range-slider"
                              style={{ accentColor: '#f59e0b' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                              <span>{field.unit === '₹' ? `₹${(field.min/1000).toFixed(0)}k` : `${field.min}`}</span>
                              <span>{field.unit === '₹' ? `₹${(field.max/100000).toFixed(0)}L` : `${field.max}`}</span>
                            </div>
                          </div>
                        )}

                        {/* Max Cap Button Chips */}
                        {field.maxCap && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '4px' }}>
                            <button
                              type="button"
                              onClick={() => handleChange(field.key, field.maxCap)}
                              style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              ⚡ Max Out Limit (₹{(field.maxCap / 1000).toFixed(0)}k)
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

            <div className="form-actions">
              {step > 0 && <button className="btn-secondary" onClick={prevStep}>← Back</button>}
              <button className={`btn-primary ${!isStepValid() ? 'disabled' : ''}`} onClick={nextStep} disabled={!isStepValid()}>
                {step === STEPS.length - 1 ? '🧾 Compute My Tax' : 'Next →'}
              </button>
            </div>
          </div>

          {/* Live Tax Estimator Preview Widget */}
          <div className="tax-live-preview-box" style={{ background: '#0d111a', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '16px', padding: '1.4rem', boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)', position: 'sticky', top: '90px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.2rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem' }}>
              <span className="live-dot pulse" style={{ background: '#f59e0b', boxShadow: '0 0 10px #f59e0b' }} />
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>Live Tax Estimator</h3>
            </div>

            {(() => {
              const sal = Number(formData.salary_income) || 0;
              const biz = Number(formData.business_income) || 0;
              const rent = Number(formData.rental_income) || 0;
              const totalGti = sal + biz + rent;

              const c80c = Math.min(150000, Number(formData.c80c) || 0);
              const nps = Math.min(50000, Number(formData.nps) || 0);
              const c80d = Math.min(75000, Number(formData.c80d) || 0);
              const hra = Number(formData.hra) || 0;
              const totalDed = c80c + nps + c80d + hra + 50000; // Old regime deductions

              // Rough live estimator for UI preview
              const netOldTaxable = Math.max(0, totalGti - totalDed);
              const netNewTaxable = Math.max(0, totalGti - 75000);

              const estOldTax = netOldTaxable > 1500000 ? netOldTaxable * 0.20 : netOldTaxable > 700000 ? netOldTaxable * 0.12 : 0;
              const estNewTax = netNewTaxable > 1500000 ? netNewTaxable * 0.15 : netNewTaxable > 700000 ? netNewTaxable * 0.08 : 0;
              const diff = Math.abs(estOldTax - estNewTax);
              const winner = estNewTax <= estOldTax ? 'New Regime' : 'Old Regime';

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '10px', padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Gross Annual Income</span>
                    <strong style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', color: '#fff' }}>₹{totalGti.toLocaleString('en-IN')}</strong>
                  </div>

                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '10px', padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Deductions Claimed</span>
                    <strong style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.1rem', color: '#f59e0b' }}>₹{totalDed.toLocaleString('en-IN')}</strong>
                  </div>

                  <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 700 }}>Projected Best Tax Regime</span>
                    <strong style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.15rem', color: '#fff' }}>{winner}</strong>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Est. Tax: ~₹{Math.min(estOldTax, estNewTax).toLocaleString('en-IN')}</span>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.03)', border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '0.6rem 0.8rem', lineHeight: '1.4' }}>
                    💡 Slide salary and deduction sliders to see instantaneous updates in regime savings.
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      <footer className="tax-footer">
        <p>Backend computes: GTI → Deductions → Slab Tax + Capital Gains + Surcharge + 4% Cess · FY 2024-25</p>
      </footer>
    </div>
  );
}
