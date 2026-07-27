import React, { useState, useRef, useEffect } from 'react';
import './portfolio.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const ASSET_KEYS = ['stocks', 'mutual_funds', 'fixed_deposits', 'gold', 'pf', 'bonds', 'cash'];

const ASSET_ICONS = {
  stocks: '📈',
  mutual_funds: '📊',
  fixed_deposits: '🏦',
  gold: '🥇',
  pf: '🛡️',
  bonds: '📜',
  cash: '💵',
};

const ASSET_LABELS = {
  stocks: 'Stocks (Direct Equity)',
  mutual_funds: 'Mutual Funds',
  fixed_deposits: 'Fixed Deposits (FD)',
  gold: 'Gold Investments',
  pf: 'Provident Fund (PF)',
  bonds: 'Bonds & Debentures',
  cash: 'Cash / Savings Balance',
};

const DEFAULT_ASSETS = {
  stocks:         { current_value: 300000,  expected_return: 14.0,  risk_level: 'high' },
  mutual_funds:   { current_value: 250000,  expected_return: 12.0,  risk_level: 'medium' },
  fixed_deposits: { current_value: 150000,  expected_return: 7.0,   risk_level: 'low' },
  gold:           { current_value: 100000,  expected_return: 9.0,   risk_level: 'low' },
  pf:             { current_value: 120000,  expected_return: 8.15,  risk_level: 'low' },
  bonds:          { current_value: 50000,   expected_return: 7.5,   risk_level: 'low' },
  cash:           { current_value: 30000,   expected_return: 3.5,   risk_level: 'low' },
};

const LOADING_STEPS = [
  'Aggregating asset values…',
  'Computing portfolio weights & returns…',
  'Measuring diversification & risk (σ, VaR)…',
  'Running ML rebalancing classifier…',
  'Running 1,000-path Monte Carlo simulation…',
  'Generating AI advisory insights…',
];

// ─── Utility ─────────────────────────────────────────────────────────────────
const inr = (v) => `₹${Number(v).toLocaleString('en-IN')}`;

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProgressStepper({ step }) {
  const steps = [
    { icon: '💼', label: 'Asset Values' },
    { icon: '⚙️', label: 'Portfolio Settings' },
  ];
  return (
    <div className="pf-form-progress">
      {steps.map((s, i) => (
        <div key={i} className={`pf-progress-step ${i <= step ? 'done' : ''}`}>
          <div className="pf-progress-dot">{i < step ? '✓' : s.icon}</div>
          <span className="pf-progress-label">{s.label}</span>
          {i < steps.length - 1 && <div className={`pf-progress-line ${i < step ? 'filled' : ''}`} />}
        </div>
      ))}
    </div>
  );
}

function LoadingScreen({ stepIdx }) {
  return (
    <div className="pf-loader-overlay">
      <div className="pf-loader-box">
        <div className="pf-cube-wrapper">
          <div className="pf-cube">
            <div className="pf-cube-faces">
              <div className="pf-cube-face shadow" />
              <div className="pf-cube-face bottom" />
              <div className="pf-cube-face top" />
              <div className="pf-cube-face left" />
              <div className="pf-cube-face right" />
              <div className="pf-cube-face back" />
              <div className="pf-cube-face front" />
            </div>
          </div>
        </div>
        <h2 className="pf-loader-title">Analyzing Your Portfolio</h2>
        <p className="pf-loader-msg">{LOADING_STEPS[stepIdx] ?? 'Please wait…'}</p>
        <div className="pf-loader-bar-wrap">
          <div
            className="pf-loader-bar-fill"
            style={{ width: `${((stepIdx + 1) / LOADING_STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function PortfolioDashboard() {
  // Form state
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [assetInputs, setAssetInputs] = useState(DEFAULT_ASSETS);

  // Step 2 settings
  const [userAge, setUserAge] = useState(32);
  const [riskProfile, setRiskProfile] = useState('Moderate');
  const [monthlySip, setMonthlySip] = useState(15000);
  const [projectionYears, setProjectionYears] = useState(10);
  const [incomeStability, setIncomeStability] = useState(0.7);
  const [goalProximityYears, setGoalProximityYears] = useState(10);
  const [targetWealth, setTargetWealth] = useState('');

  // Result & loading state
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // Chat state
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: 'Hello! I am your Portfolio AI. Ask me about your Sharpe ratio, VaR, Monte Carlo results, rebalancing, or anything about your portfolio!' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const handleAssetChange = (key, field, val) => {
    setAssetInputs(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: field === 'risk_level' ? val : parseFloat(val) || 0,
      },
    }));
  };

  const totalValue = ASSET_KEYS.reduce(
    (sum, k) => sum + (parseFloat(assetInputs[k]?.current_value) || 0),
    0
  );

  // ── Navigation ────────────────────────────────────────────────────────────
  const goNext = () => {
    setAnimating(true);
    setTimeout(() => { setStep(1); setAnimating(false); }, 200);
  };

  const goPrev = () => {
    setAnimating(true);
    setTimeout(() => { setStep(0); setAnimating(false); }, 200);
  };

  const reset = () => {
    setResult(null);
    setStep(0);
    setAssetInputs(DEFAULT_ASSETS);
    setChatMessages([
      { sender: 'ai', text: 'Hello! I am your Portfolio AI. Ask me about your Sharpe ratio, VaR, Monte Carlo results, rebalancing, or anything about your portfolio!' },
    ]);
  };

  // ── API Call ──────────────────────────────────────────────────────────────
  const analyze = async () => {
    setAnimating(true);
    await new Promise(r => setTimeout(r, 200));
    setAnimating(false);
    setLoading(true);
    setLoadingStep(0);

    for (let i = 0; i < LOADING_STEPS.length; i++) {
      setLoadingStep(i);
      await new Promise(r => setTimeout(r, 600));
    }

    try {
      const res = await fetch('http://localhost:8000/api/portfolio/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...assetInputs,
          age: Number(userAge),
          risk_profile: riskProfile,
          monthly_sip: Number(monthlySip),
          projection_years: Number(projectionYears),
          income_stability: Number(incomeStability),
          goal_proximity_years: Number(goalProximityYears),
          target_wealth: targetWealth ? Number(targetWealth) : null,
        }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Portfolio analysis error:', err);
      alert('Failed to fetch analysis. Make sure the Python backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  // ── Chat ──────────────────────────────────────────────────────────────────
  const sendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text }]);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/portfolio/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          portfolio_context: { ...result, monthly_sip: monthlySip },
        }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);
    } catch {
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'Sorry, an error occurred.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ─── LOADING SCREEN ───────────────────────────────────────────────────────
  if (loading) return <LoadingScreen stepIdx={loadingStep} />;

  // ─── RESULTS DASHBOARD ────────────────────────────────────────────────────
  if (result) {
    const r = result;
    const fo = r.final_output || {};
    const rm = r.risk_metrics || {};
    const mc = r.monte_carlo || {};
    const ml = r.ml_insights || {};
    const ev = r.evaluation_metrics || {};
    const allocs = r.allocations || [];
    const projections = r.projections || [];
    const lastProj = projections[projections.length - 1] || {};

    return (
      <div className="pf-page">
        {/* Header */}
        <header className="pf-header">
          <div className="pf-logo">
            <div className="pf-logo-icon">P</div>
            FINEXO · <span>Portfolio Growth & Rebalancing</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="pf-header-stat">
              <span className="pf-header-stat-label">Total Value</span>
              <span className="pf-header-stat-value">{inr(r.total_portfolio_value)}</span>
            </div>
            <div className="pf-header-stat">
              <span className="pf-header-stat-label">Expected Return</span>
              <span className="pf-header-stat-value" style={{ color: '#34d399' }}>{r.expected_portfolio_return}%</span>
            </div>
            <button className="pf-reset-btn" onClick={reset}>← Re-analyze</button>
          </div>
        </header>

        <div className="pf-dashboard">

          {/* KPI Grid */}
          <div className="pf-kpi-grid">
            {[
              { label: 'Portfolio Value', value: inr(r.total_portfolio_value), color: '#60a5fa', bar: 'blue' },
              { label: 'Expected Return', value: `${r.expected_portfolio_return}%`, color: '#34d399', bar: 'green' },
              { label: 'Portfolio Risk (σ)', value: `${rm.portfolio_risk_std_dev_pct}%`, color: '#f87171', bar: 'red' },
              { label: 'Diversification Index', value: `${r.diversification?.index} (${r.diversification?.score}%)`, color: '#a78bfa', bar: 'purple' },
              { label: 'Sharpe Ratio', value: fo.sharpe_ratio, color: fo.sharpe_ratio >= 1 ? '#34d399' : '#f59e0b', bar: fo.sharpe_ratio >= 1 ? 'green' : 'warning' },
              { label: 'VaR (95%)', value: inr(rm.var_95_amount), color: '#f87171', bar: 'red' },
            ].map(({ label, value, color, bar }) => (
              <div key={label} className={`pf-kpi-card pf-kpi-${bar}`}>
                <div className="pf-kpi-label">{label}</div>
                <div className="pf-kpi-value" style={{ color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Section 17: Final Output */}
          {fo.portfolio_value && (
            <div className="pf-card pf-card-green">
              <div className="pf-card-title">🏆 Final Output Summary</div>

              <div className="pf-metrics-grid">
                {[
                  { label: 'Portfolio Value', value: fo.portfolio_value, color: '#60a5fa' },
                  { label: 'Expected Return', value: `${fo.expected_return_pct}%`, color: '#34d399' },
                  { label: 'Portfolio Risk (σ)', value: `${fo.portfolio_risk_pct}%`, color: '#f87171' },
                  { label: 'Diversification Index', value: fo.diversification_index, color: '#a78bfa' },
                  { label: 'Sharpe Ratio', value: fo.sharpe_ratio, color: fo.sharpe_ratio >= 1 ? '#34d399' : '#f59e0b' },
                  { label: 'Max Drawdown', value: `${fo.max_drawdown_pct}%`, color: '#f87171' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="pf-metric-pill">
                    <div className="pf-metric-label">{label}</div>
                    <div className="pf-metric-value" style={{ color }}>{value}</div>
                  </div>
                ))}
              </div>

              <div className="pf-rebalance-badge-row">
                <span className="pf-muted-label">Rebalance Needed:</span>
                <span className={`pf-rebalance-badge ${fo.rebalance_needed ? 'needed' : 'ok'}`}>
                  {fo.rebalance_needed ? '⚠️ Yes — Action Required' : '✅ No — Portfolio Balanced'}
                </span>
              </div>

              <div className="pf-alloc-row">
                <div className="pf-muted-label" style={{ marginBottom: '0.6rem' }}>Recommended Allocation</div>
                <div className="pf-alloc-chips">
                  {Object.entries(fo.recommended_allocation || {}).map(([k, v]) => (
                    <div key={k} className={`pf-alloc-chip pf-chip-${k.toLowerCase()}`}>
                      <div className="pf-chip-label">{k}</div>
                      <div className="pf-chip-value">{v}%</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pf-prob-section">
                <div className="pf-prob-row">
                  <span className="pf-muted-label">Probability of reaching {fo.target_wealth} in {fo.horizon_years} yrs</span>
                  <strong style={{ color: fo.probability_of_target_wealth_pct >= 60 ? '#34d399' : '#f59e0b', fontSize: '1.1rem' }}>
                    {fo.probability_of_target_wealth_pct}%
                  </strong>
                </div>
                <div className="pf-prob-track">
                  <div className="pf-prob-fill" style={{ width: `${fo.probability_of_target_wealth_pct}%` }} />
                </div>
              </div>

              <div className="pf-ai-explain">
                <strong>🤖 AI Explanation:</strong> {fo.ai_explanation}
              </div>
            </div>
          )}

          {/* Two column: Asset Allocation + Risk Metrics */}
          <div className="pf-two-col">

            <div className="pf-card">
              <div className="pf-card-title">📊 Asset Allocation Breakdown</div>
              {allocs.map(item => (
                <div key={item.asset_name} className="pf-alloc-item">
                  <div className="pf-alloc-meta">
                    <span>{item.asset_name} <small style={{ color: '#6b7280' }}>({item.expected_return_pct}% return)</small></span>
                    <strong>{inr(item.current_value)} <small style={{ color: '#9ca3af' }}>({item.allocation_pct}%)</small></strong>
                  </div>
                  <div className="pf-progress-track">
                    <div className="pf-progress-fill" style={{ width: `${Math.min(100, item.allocation_pct)}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="pf-card">
              <div className="pf-card-title">⚡ Risk & Return Metrics</div>
              <div className="pf-risk-grid">
                <div className="pf-risk-pill">
                  <div className="pf-risk-label">Sharpe Ratio</div>
                  <div className="pf-risk-value" style={{ color: rm.sharpe_ratio >= 1 ? '#34d399' : rm.sharpe_ratio >= 0.5 ? '#f59e0b' : '#f87171' }}>
                    {rm.sharpe_ratio}
                  </div>
                  <div className="pf-risk-formula">(Rp − Rf) / σ</div>
                </div>
                <div className="pf-risk-pill">
                  <div className="pf-risk-label">Risk-Free Rate (Rf)</div>
                  <div className="pf-risk-value" style={{ color: '#9ca3af' }}>{rm.risk_free_rate_pct}%</div>
                  <div className="pf-risk-formula">Indian 10-yr G-Sec</div>
                </div>
                <div className="pf-risk-pill">
                  <div className="pf-risk-label">95% VaR (1-year)</div>
                  <div className="pf-risk-value" style={{ color: '#f87171' }}>{inr(rm.var_95_amount)}</div>
                  <div className="pf-risk-formula">μ − 1.65σ × Portfolio</div>
                </div>
                <div className="pf-risk-pill">
                  <div className="pf-risk-label">Max Drawdown</div>
                  <div className="pf-risk-value" style={{ color: '#f87171' }}>{rm.max_drawdown_pct}%</div>
                  <div className="pf-risk-formula">Simulated worst drop</div>
                </div>
              </div>
              <div className="pf-rl-commentary">{rm.rl_commentary}</div>
            </div>
          </div>

          {/* Rebalancing Table */}
          <div className="pf-card">
            <div className="pf-card-title" style={{ justifyContent: 'space-between' }}>
              <span>⚖️ Rebalancing Engine</span>
              {r.rebalancing_summary && (
                <span style={{ fontSize: '0.82rem', color: r.rebalancing_summary.ml_decision?.startsWith('Yes') ? '#f87171' : '#34d399', fontWeight: 'normal' }}>
                  🤖 ML: {r.rebalancing_summary.ml_decision} ({r.rebalancing_summary.ml_confidence_pct}% confidence)
                </span>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="pf-table">
                <thead>
                  <tr>
                    <th>Asset Class</th>
                    <th>Current %</th>
                    <th>Target %</th>
                    <th>Gap</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(r.rebalancing || []).map(row => (
                    <tr key={row.asset_name} style={{ background: row.needs_rebalance ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                      <td>
                        <strong>{row.asset_name}</strong>
                        {row.needs_rebalance && <span style={{ marginLeft: '0.4rem', color: '#f87171', fontSize: '0.72rem' }}>⚠️ &gt;5%</span>}
                      </td>
                      <td>{row.current_pct}%</td>
                      <td>{row.target_pct}%</td>
                      <td style={{ color: row.gap_pct > 0 ? '#34d399' : row.gap_pct < 0 ? '#f87171' : '#9ca3af', fontWeight: 600 }}>
                        {row.gap_pct > 0 ? '+' : ''}{row.gap_pct}%
                      </td>
                      <td style={{ color: row.rebalance_amount > 0 ? '#34d399' : '#f87171', fontWeight: 600 }}>
                        {row.rebalance_amount > 0 ? '+' : ''}₹{Math.abs(row.rebalance_amount).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <span className={`pf-badge ${row.action?.startsWith('BUY') ? 'pf-buy' : row.action?.startsWith('SELL') ? 'pf-sell' : 'pf-hold'}`}>
                          {row.action}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Three-col: ML + Monte Carlo + Projections */}
          <div className="pf-three-col">

            <div className="pf-card pf-card-purple">
              <div className="pf-card-title">🤖 ML Intelligence</div>
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ color: '#a78bfa', fontSize: '0.8rem', marginBottom: '0.4rem' }}>7.1 Random Forest Classifier</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: ml.rebalance_decision?.startsWith('Yes') ? '#f87171' : '#34d399', marginBottom: '0.4rem' }}>
                  {ml.rebalance_decision}
                </div>
                <div className="pf-conf-bar-track">
                  <div className="pf-conf-bar-fill" style={{ width: `${ml.rebalance_confidence_pct}%` }} />
                </div>
                <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.3rem' }}>Confidence: {ml.rebalance_confidence_pct}%</div>
              </div>
              <div>
                <div style={{ color: '#60a5fa', fontSize: '0.8rem', marginBottom: '0.4rem' }}>7.2 Gradient Boosting Regressor</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#60a5fa' }}>{ml.ml_predicted_return_pct}%</div>
                <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.2rem' }}>ML-Predicted Annual Return</div>
              </div>
            </div>

            {mc.simulations && (
              <div className="pf-card pf-card-green">
                <div className="pf-card-title">🎲 Monte Carlo ({mc.simulations} paths)</div>
                <div className="pf-mc-grid">
                  <div className="pf-mc-pill" style={{ background: 'rgba(239,68,68,0.1)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Pessimistic (P10)</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f87171' }}>₹{(mc.pessimistic_p10 / 100000).toFixed(1)}L</div>
                  </div>
                  <div className="pf-mc-pill" style={{ background: 'rgba(59,130,246,0.1)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Median</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#60a5fa' }}>₹{(mc.median_outcome / 100000).toFixed(1)}L</div>
                  </div>
                  <div className="pf-mc-pill" style={{ background: 'rgba(16,185,129,0.1)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Optimistic (P90)</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#34d399' }}>₹{(mc.optimistic_p90 / 100000).toFixed(1)}L</div>
                  </div>
                </div>
                <div className="pf-prob-row" style={{ marginTop: '1rem' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}>P(2× in {mc.horizon_years} yrs)</span>
                  <strong style={{ color: mc.success_probability_pct >= 60 ? '#34d399' : '#f59e0b' }}>{mc.success_probability_pct}%</strong>
                </div>
                <div className="pf-prob-track">
                  <div className="pf-prob-fill" style={{ width: `${mc.success_probability_pct}%` }} />
                </div>
                <div style={{ fontSize: '0.72rem', color: '#4b5563', marginTop: '0.4rem' }}>μ = {mc.mu_pct}% | σ = {mc.sigma_pct}%</div>
              </div>
            )}

            {lastProj.future_value && (
              <div className="pf-card">
                <div className="pf-card-title">🚀 Future Growth ({projectionYears} yrs)</div>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ color: '#9ca3af', fontSize: '0.82rem', marginBottom: '0.3rem' }}>Projected Wealth</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60a5fa' }}>{inr(lastProj.future_value)}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  {[
                    { label: 'CAGR', value: `${lastProj.cagr_pct}%`, color: '#a855f7' },
                    { label: 'Compound Gains', value: `+${inr(lastProj.estimated_gains)}`, color: '#34d399' },
                    { label: 'Total Invested', value: inr(lastProj.total_invested), color: '#9ca3af' },
                    { label: 'Monthly SIP', value: `₹${Number(monthlySip).toLocaleString('en-IN')}/mo`, color: '#60a5fa' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.6rem' }}>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '0.2rem' }}>{label}</div>
                      <div style={{ fontWeight: 700, color, fontSize: '0.9rem' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Evaluation Metrics */}
          {ev.rebalance_classifier_accuracy_pct && (
            <div className="pf-card pf-card-purple">
              <div className="pf-card-title">📐 Model Evaluation Metrics</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                {[
                  { label: 'RF Classifier Accuracy', value: `${ev.rebalance_classifier_accuracy_pct}%`, good: true },
                  { label: 'GB Regressor R²', value: `${ev.return_regressor_r2_score_pct}%`, good: ev.return_regressor_r2_score_pct > 60 },
                  { label: 'Return RMSE Proxy', value: `${ev.return_prediction_rmse_proxy}%`, good: ev.return_prediction_rmse_proxy < 2 },
                  { label: 'Sharpe Ratio', value: ev.current_sharpe_ratio, good: ev.current_sharpe_ratio > 0.8 },
                  { label: 'Portfolio Volatility', value: `${ev.portfolio_volatility_pct}%`, good: ev.portfolio_volatility_pct < 15 },
                  { label: 'Diversification Index', value: ev.diversification_index, good: ev.diversification_index > 0.55 },
                ].map(({ label, value, good }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{label}</span>
                    <span style={{ fontWeight: 700, color: good ? '#34d399' : '#f59e0b' }}>{value}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#4b5563' }}>{ev.models}</div>
            </div>
          )}

          {/* AI Advisory + Chat */}
          <div className="pf-chat-card">
            <div className="pf-card-title">🤖 AI Portfolio Advisor & Chat</div>
            <ul style={{ paddingLeft: '1.2rem', color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
              {(r.ai_advisory || []).map((item, i) => (
                <li key={i} style={{ marginBottom: '0.4rem' }}>{item}</li>
              ))}
            </ul>
            <div className="pf-chat-history">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`pf-chat-bubble pf-${msg.sender}`}>{msg.text}</div>
              ))}
              {chatLoading && <div className="pf-chat-bubble pf-ai">Analyzing your portfolio…</div>}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={sendChat} className="pf-chat-input-row">
              <input
                type="text"
                placeholder="Ask about Sharpe ratio, Monte Carlo, rebalancing, VaR…"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
              />
              <button type="submit">Ask AI</button>
            </form>
          </div>

        </div>

        <footer className="pf-footer">
          <p>Generated by FINEXO AI · Portfolio Growth & Rebalancing Engine · Not Financial Advice</p>
        </footer>
      </div>
    );
  }

  // ─── FORM: STEP 1 — Asset Inputs ─────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="pf-page">
        <header className="pf-header">
          <div className="pf-logo">
            <div className="pf-logo-icon">P</div>
            FINEXO · <span>Portfolio Growth & Rebalancing</span>
          </div>
          <a href="/" className="pf-reset-btn">← Back to Home</a>
        </header>

        <div className="pf-form-wrapper">
          <ProgressStepper step={0} />

          <div className={`pf-form-card ${animating ? 'pf-fade-out' : 'pf-fade-in'}`}>
            <div className="pf-form-card-icon">💼</div>
            <h2 className="pf-form-card-title">Enter Your Asset Portfolio</h2>
            <p className="pf-form-card-sub">
              Step 1 of 2 · Enter the current value, expected annual return, and risk level for each asset class
            </p>

            <div className="pf-total-bar">
              <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Running Total</span>
              <span style={{ fontWeight: 800, color: '#60a5fa', fontSize: '1.1rem' }}>{inr(totalValue)}</span>
            </div>

            <div className="pf-asset-list">
              {ASSET_KEYS.map(key => (
                <div key={key} className="pf-asset-row">
                  <div className="pf-asset-icon-label">
                    <span className="pf-asset-icon">{ASSET_ICONS[key]}</span>
                    <span className="pf-asset-label">{ASSET_LABELS[key]}</span>
                  </div>
                  <div className="pf-asset-fields">
                    <div className="pf-field-group">
                      <label>Current Value</label>
                      <div className="pf-field-wrap">
                        <span className="pf-field-unit">₹</span>
                        <input
                          type="number"
                          value={assetInputs[key].current_value}
                          onChange={e => handleAssetChange(key, 'current_value', e.target.value)}
                          min="0"
                        />
                      </div>
                    </div>
                    <div className="pf-field-group">
                      <label>Expected Return</label>
                      <div className="pf-field-wrap">
                        <span className="pf-field-unit">%</span>
                        <input
                          type="number"
                          value={assetInputs[key].expected_return}
                          onChange={e => handleAssetChange(key, 'expected_return', e.target.value)}
                          step="0.1"
                          min="0"
                        />
                      </div>
                    </div>
                    <div className="pf-field-group">
                      <label>Risk Level</label>
                      <select
                        value={assetInputs[key].risk_level}
                        onChange={e => handleAssetChange(key, 'risk_level', e.target.value)}
                        className="pf-select"
                      >
                        <option value="low">🟢 Low</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="high">🔴 High</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pf-form-actions">
              <button className="pf-btn-primary" onClick={goNext}>
                Portfolio Settings →
              </button>
            </div>
          </div>
        </div>

        <footer className="pf-footer">
          <p>Your data never leaves your browser · FINEXO AI · For educational purposes only</p>
        </footer>
      </div>
    );
  }

  // ─── FORM: STEP 2 — Portfolio Settings ───────────────────────────────────
  return (
    <div className="pf-page">
      <header className="pf-header">
        <div className="pf-logo">
          <div className="pf-logo-icon">P</div>
          FINEXO · <span>Portfolio Growth & Rebalancing</span>
        </div>
        <a href="/" className="pf-reset-btn">← Back to Home</a>
      </header>

      <div className="pf-form-wrapper">
        <ProgressStepper step={1} />

        <div className={`pf-form-card ${animating ? 'pf-fade-out' : 'pf-fade-in'}`}>
          <div className="pf-form-card-icon">⚙️</div>
          <h2 className="pf-form-card-title">Portfolio Settings</h2>
          <p className="pf-form-card-sub">Step 2 of 2 · Configure your profile, goals, and simulation parameters</p>

          <div className="pf-settings-grid">

            <div className="pf-settings-group">
              <label className="pf-settings-label">Your Age</label>
              <div className="pf-field-wrap">
                <span className="pf-field-unit">yrs</span>
                <input type="number" value={userAge} onChange={e => setUserAge(e.target.value)} min="18" max="80" />
              </div>
              <p className="pf-settings-hint">Used to compute base equity allocation (100 − Age rule)</p>
            </div>

            <div className="pf-settings-group">
              <label className="pf-settings-label">Risk Profile</label>
              <select value={riskProfile} onChange={e => setRiskProfile(e.target.value)} className="pf-select pf-select-full">
                <option value="Conservative">🛡️ Conservative (0.6× equity)</option>
                <option value="Moderate">⚖️ Moderate (0.8× equity)</option>
                <option value="Aggressive">🚀 Aggressive (1.0× equity)</option>
              </select>
              <p className="pf-settings-hint">Scales the equity allocation multiplier</p>
            </div>

            <div className="pf-settings-group">
              <label className="pf-settings-label">Monthly SIP Contribution (₹)</label>
              <div className="pf-field-wrap">
                <span className="pf-field-unit">₹</span>
                <input type="number" value={monthlySip} onChange={e => setMonthlySip(e.target.value)} min="0" />
              </div>
              <p className="pf-settings-hint">Added each month on top of existing corpus</p>
            </div>

            <div className="pf-settings-group">
              <label className="pf-settings-label">Investment Horizon</label>
              <div className="pf-slider-row">
                <input type="range" min="1" max="30" value={projectionYears} onChange={e => setProjectionYears(e.target.value)} className="pf-slider" />
                <span className="pf-slider-val">{projectionYears} yrs</span>
              </div>
              <p className="pf-settings-hint">Used for Monte Carlo simulation and growth projections</p>
            </div>

            <div className="pf-settings-group">
              <label className="pf-settings-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Income Stability Score</span>
                <strong style={{ color: incomeStability < 0.5 ? '#f87171' : '#34d399' }}>{incomeStability}</strong>
              </label>
              <input type="range" min="0" max="1" step="0.05" value={incomeStability}
                onChange={e => setIncomeStability(e.target.value)}
                className="pf-slider"
                style={{ accentColor: incomeStability < 0.5 ? '#f87171' : '#3b82f6' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#4b5563' }}>
                <span>0 = Volatile</span><span>1 = Very Stable</span>
              </div>
            </div>

            <div className="pf-settings-group">
              <label className="pf-settings-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Goal Proximity (Years)</span>
                <strong style={{ color: goalProximityYears <= 3 ? '#f87171' : '#34d399' }}>{goalProximityYears} yrs</strong>
              </label>
              <input type="range" min="0" max="30" step="1" value={goalProximityYears}
                onChange={e => setGoalProximityYears(e.target.value)}
                className="pf-slider"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#4b5563' }}>
                <span>0 = Goal is NOW</span><span>30 = Long Term</span>
              </div>
            </div>

            <div className="pf-settings-group pf-settings-full">
              <label className="pf-settings-label">Target Wealth for Monte Carlo (₹)</label>
              <div className="pf-field-wrap">
                <span className="pf-field-unit">₹</span>
                <input type="number" value={targetWealth} placeholder="Leave blank for 2× portfolio"
                  onChange={e => setTargetWealth(e.target.value)} min="0" />
              </div>
              <p className="pf-settings-hint">Target wealth for calculating probability of success. Default: 2× current portfolio value.</p>
            </div>

          </div>

          <div className="pf-form-actions">
            <button className="pf-btn-secondary" onClick={goPrev}>← Back</button>
            <button className="pf-btn-primary" onClick={analyze}>
              🚀 Analyze My Portfolio
            </button>
          </div>
        </div>
      </div>

      <footer className="pf-footer">
        <p>Your data never leaves your browser · FINEXO AI · For educational purposes only</p>
      </footer>
    </div>
  );
}
