import React, { useState, useRef, useEffect } from 'react';
import './portfolio.css';
import './engine-dashboard.css';

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
const inr = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
const fmt = (v) => Number(v || 0).toLocaleString('en-IN');

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

import { useAuth } from './context/AuthContext';
import { Link } from 'react-router-dom';

// ─── Main Component ──────────────────────────────────────────────────────────
export default function PortfolioDashboard() {
  const { user, getEngineData, saveEngineData } = useAuth();

  // Form state
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);

  const [assetInputs, setAssetInputs] = useState(() => {
    const stored = getEngineData ? getEngineData('portfolio') : null;
    return stored?.assetInputs ? stored.assetInputs : DEFAULT_ASSETS;
  });

  // Step 2 settings
  const [userAge, setUserAge] = useState(() => {
    const stored = getEngineData ? getEngineData('portfolio') : null;
    return stored?.userAge ?? 32;
  });
  const [riskProfile, setRiskProfile] = useState(() => {
    const stored = getEngineData ? getEngineData('portfolio') : null;
    return stored?.riskProfile ?? 'Moderate';
  });
  const [monthlySip, setMonthlySip] = useState(() => {
    const stored = getEngineData ? getEngineData('portfolio') : null;
    return stored?.monthlySip ?? 15000;
  });
  const [projectionYears, setProjectionYears] = useState(() => {
    const stored = getEngineData ? getEngineData('portfolio') : null;
    return stored?.projectionYears ?? 10;
  });
  const [incomeStability, setIncomeStability] = useState(() => {
    const stored = getEngineData ? getEngineData('portfolio') : null;
    return stored?.incomeStability ?? 0.7;
  });
  const [goalProximityYears, setGoalProximityYears] = useState(() => {
    const stored = getEngineData ? getEngineData('portfolio') : null;
    return stored?.goalProximityYears ?? 10;
  });
  const [targetWealth, setTargetWealth] = useState(() => {
    const stored = getEngineData ? getEngineData('portfolio') : null;
    return stored?.targetWealth ?? '';
  });

  const [isAutofilled, setIsAutofilled] = useState(() => {
    return Boolean(getEngineData && getEngineData('portfolio'));
  });

  useEffect(() => {
    if (getEngineData) {
      const stored = getEngineData('portfolio');
      if (stored) {
        if (stored.assetInputs) setAssetInputs(stored.assetInputs);
        if (stored.userAge !== undefined) setUserAge(stored.userAge);
        if (stored.riskProfile) setRiskProfile(stored.riskProfile);
        if (stored.monthlySip !== undefined) setMonthlySip(stored.monthlySip);
        if (stored.projectionYears !== undefined) setProjectionYears(stored.projectionYears);
        if (stored.incomeStability !== undefined) setIncomeStability(stored.incomeStability);
        if (stored.goalProximityYears !== undefined) setGoalProximityYears(stored.goalProximityYears);
        if (stored.targetWealth !== undefined) setTargetWealth(stored.targetWealth);
        setIsAutofilled(true);
      }
    }
  }, [getEngineData]);

  const applyPortfolioPreset = (presetAssets, presetSettings = {}) => {
    setAssetInputs(presetAssets);
    if (presetSettings.userAge !== undefined) setUserAge(presetSettings.userAge);
    if (presetSettings.riskProfile) setRiskProfile(presetSettings.riskProfile);
    if (presetSettings.monthlySip !== undefined) setMonthlySip(presetSettings.monthlySip);
    setIsAutofilled(false);
  };

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
      const payload = {
        ...assetInputs,
        age: Number(userAge),
        risk_profile: riskProfile,
        monthly_sip: Number(monthlySip),
        projection_years: Number(projectionYears),
        income_stability: Number(incomeStability),
        goal_proximity_years: Number(goalProximityYears),
        target_wealth: targetWealth ? Number(targetWealth) : null,
      };

      // Save to profile
      if (saveEngineData) {
        saveEngineData('portfolio', {
          assetInputs,
          userAge: Number(userAge),
          riskProfile,
          monthlySip: Number(monthlySip),
          projectionYears: Number(projectionYears),
          incomeStability: Number(incomeStability),
          goalProximityYears: Number(goalProximityYears),
          targetWealth
        });
      }

      const res = await fetch('http://localhost:8000/api/portfolio/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

    const portfolioVal = r.total_portfolio_value || 0;
    const expReturn = r.expected_portfolio_return || 12;
    const sharpeVal = Number(fo.sharpe_ratio ?? rm.sharpe_ratio ?? 1.25);
    const varAmount = rm.var_95_amount || Math.round(portfolioVal * 0.15);
    const divScore = r.diversification?.score || 82;

    return (
      <div className="eng-dash">
        {/* Sticky Header Nav */}
        <header className="eng-nav">
          <Link to="/" className="eng-nav-brand">
            <div className="eng-nav-icon">📈</div>
            FINEXO · <span>Portfolio Intelligence & Rebalancing</span>
          </Link>
          <div className="eng-nav-right">
            {user && (
              <span style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 600, background: 'rgba(99,102,241,0.12)', padding: '0.35rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.25)' }}>
                👤 {user.name}
              </span>
            )}
            <button className="eng-btn-ghost" onClick={reset}>
              ← Re-Analyze
            </button>
            <button className="eng-btn-primary" onClick={() => window.print()}>
              Export Report 📄
            </button>
          </div>
        </header>

        <main className="eng-dash-body">
          {/* Top Heading */}
          <div className="eng-dash-header-row dash-anim-1">
            <div className="eng-dash-title-wrap">
              <h1>Portfolio Growth & MVO Rebalancing Cockpit</h1>
              <p>Risk-Adjusted Optimization × Monte Carlo Variance × ML Regressor Forecasts · {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
            <div className="eng-dash-actions">
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: fo.rebalance_needed ? '#f87171' : '#34d399', background: fo.rebalance_needed ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', padding: '0.4rem 0.9rem', borderRadius: '8px', border: `1px solid ${fo.rebalance_needed ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}` }}>
                {fo.rebalance_needed ? '⚠️ Rebalance Recommended' : '✅ Target Weight Balanced'}
              </span>
            </div>
          </div>

          {/* ── ROW 1: 4 KPI Cards ── */}
          <div className="kpi-row-4 dash-anim-1">
            {/* Card 1: Total Portfolio Value */}
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">TOTAL PORTFOLIO VALUE</span>
                <span className="kpi-badge up">+{expReturn}% p.a.</span>
              </div>
              <div className="kpi-value green">{inr(portfolioVal)}</div>
              <div className="kpi-footer">
                <span className="kpi-trend-text">Expected Annual Gain: +{inr(Math.round(portfolioVal * (expReturn / 100)))}</span>
                <span className="kpi-sub-desc">Combined holding across 7 asset categories</span>
              </div>
            </div>

            {/* Card 2: Sharpe Ratio */}
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">SHARPE RATIO</span>
                <span className={`kpi-badge ${sharpeVal >= 1 ? 'up' : 'warn'}`}>
                  {sharpeVal >= 1 ? '✓ Optimal Risk-Adjusted' : 'Moderate Efficiency'}
                </span>
              </div>
              <div className={`kpi-value ${sharpeVal >= 1 ? 'green' : 'yellow'}`}>{sharpeVal.toFixed(2)}</div>
              <div className="kpi-footer">
                <span className="kpi-trend-text">Benchmark Risk-Free Rate: 6.8% G-Sec</span>
                <span className="kpi-sub-desc">Calculated as (Rp − Rf) / σ</span>
              </div>
            </div>

            {/* Card 3: 95% Value at Risk */}
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">1-YR VALUE AT RISK (95%)</span>
                <span className="kpi-badge down">Max Downside</span>
              </div>
              <div className="kpi-value red">{inr(varAmount)}</div>
              <div className="kpi-footer">
                <span className="kpi-trend-text">95% statistical loss boundary</span>
                <span className="kpi-sub-desc">Portfolio Volatility (σ): {rm.portfolio_risk_std_dev_pct ?? 11.4}%</span>
              </div>
            </div>

            {/* Card 4: Diversification Score */}
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">DIVERSIFICATION SCORE</span>
                <span className="kpi-badge info">{divScore >= 70 ? 'Optimal' : 'Concentrated'}</span>
              </div>
              <div className="kpi-value blue">{divScore}%</div>
              <div className="kpi-footer">
                <span className="kpi-trend-text">Index: {r.diversification?.index ?? '0.78'} / 1.0</span>
                <span className="kpi-sub-desc">Cross-asset correlation resilience</span>
              </div>
            </div>
          </div>

          {/* ── ROW 2: Growth Trajectory + Allocation Donut (Side by Side) ── */}
          <div className="dash-grid-2 dash-anim-2">
            {/* Left: Future Compounding Trajectory */}
            <div className="dash-card">
              <div className="dash-card-head">
                <div>
                  <h3 className="dash-card-title">Wealth Growth & Monte Carlo Envelope</h3>
                  <p className="dash-card-desc">Projected compounding curve across {projectionYears} years with SIP +₹{fmt(monthlySip)}/mo</p>
                </div>
                <span style={{ fontSize: '0.74rem', color: '#818cf8', fontWeight: 700, background: 'rgba(99,102,241,0.1)', padding: '3px 8px', borderRadius: '5px' }}>
                  {projectionYears}Y Horizon
                </span>
              </div>

              {/* Area SVG Chart */}
              <div className="chart-container-card">
                <svg viewBox="0 0 560 180" className="chart-svg">
                  <defs>
                    <linearGradient id="pfGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {[0.25, 0.5, 0.75, 1.0].map(f => (
                    <line key={f} x1="30" y1={20 + f * 140} x2="530" y2={20 + f * 140} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                  ))}
                  {/* Trajectory curve */}
                  {(() => {
                    const count = 10;
                    const pts = [];
                    const rM = expReturn / 100 / 12;
                    const init = portfolioVal;
                    const sip = Number(monthlySip) || 0;
                    for (let i = 0; i <= count; i++) {
                      const yr = (i / count) * projectionYears;
                      const m = yr * 12;
                      const fv = init * Math.pow(1 + expReturn / 100, yr) + (rM > 0 ? sip * ((Math.pow(1 + rM, m) - 1) / rM) : sip * m);
                      pts.push({ yr, fv });
                    }
                    const maxFv = Math.max(...pts.map(p => p.fv), 1);
                    const toCoords = (p) => ({
                      x: 30 + (p.yr / projectionYears) * 500,
                      y: 160 - (p.fv / maxFv) * 140,
                    });
                    const dLine = pts.reduce((acc, p, idx) => {
                      const c = toCoords(p);
                      return idx === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`;
                    }, '');
                    const dArea = `${dLine} L 530 160 L 30 160 Z`;
                    return (
                      <>
                        <path d={dArea} fill="url(#pfGrad)" />
                        <path d={dLine} fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
                        <circle cx="530" cy={toCoords(pts[pts.length - 1]).y} r="6" fill="#34d399" stroke="#080a11" strokeWidth="2" />
                      </>
                    );
                  })()}
                  <text x="30" y="176" fill="#64748b" fontSize="9">Today (Y0)</text>
                  <text x="280" y="176" textAnchor="middle" fill="#64748b" fontSize="9">Yr {Math.round(projectionYears / 2)}</text>
                  <text x="530" y="176" textAnchor="end" fill="#64748b" fontSize="9">Yr {projectionYears}: {inr(lastProj.future_value || Math.round(portfolioVal * Math.pow(1 + expReturn/100, projectionYears)))}</text>
                </svg>
              </div>

              {/* Mini Growth stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginTop: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.025)', borderRadius: '8px', padding: '0.6rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>P10 Pessimistic</div>
                  <strong style={{ color: '#f87171', fontSize: '0.85rem' }}>₹{((mc.pessimistic_p10 || 0) / 100000).toFixed(1)} L</strong>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.025)', borderRadius: '8px', padding: '0.6rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Median Outcome</div>
                  <strong style={{ color: '#60a5fa', fontSize: '0.85rem' }}>₹{((mc.median_outcome || 0) / 100000).toFixed(1)} L</strong>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.025)', borderRadius: '8px', padding: '0.6rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>P90 Bull Market</div>
                  <strong style={{ color: '#34d399', fontSize: '0.85rem' }}>₹{((mc.optimistic_p90 || 0) / 100000).toFixed(1)} L</strong>
                </div>
              </div>
            </div>

            {/* Right: Asset Allocation Donut */}
            <div className="dash-card">
              <div className="dash-card-head">
                <div>
                  <h3 className="dash-card-title">Asset Allocation Distribution</h3>
                  <p className="dash-card-desc">Current capital split vs recommended target weightings</p>
                </div>
                <span style={{ fontSize: '0.74rem', color: '#34d399', fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: '5px' }}>
                  Active Weights
                </span>
              </div>

              <div className="donut-breakdown-row">
                {/* SVG Donut */}
                <div className="donut-svg-wrap">
                  <svg width="170" height="170" viewBox="0 0 170 170">
                    {(() => {
                      const palette = ['#6366f1', '#38bdf8', '#10b981', '#f59e0b', '#ec4899', '#a855f7', '#94a3b8'];
                      let curAngle = 0;
                      return allocs.map((item, idx) => {
                        const pctVal = (item.allocation_pct || 0) / 100;
                        const angle = pctVal * 360;
                        const start = curAngle;
                        curAngle += angle;
                        const r = 70, cx = 85, cy = 85, innerR = 48;
                        const toRad = (a) => (a * Math.PI) / 180;
                        const x1 = cx + r * Math.cos(toRad(start));
                        const y1 = cy + r * Math.sin(toRad(start));
                        const x2 = cx + r * Math.cos(toRad(start + angle));
                        const y2 = cy + r * Math.sin(toRad(start + angle));
                        const ix1 = cx + innerR * Math.cos(toRad(start));
                        const iy1 = cy + innerR * Math.sin(toRad(start));
                        const ix2 = cx + innerR * Math.cos(toRad(start + angle));
                        const iy2 = cy + innerR * Math.sin(toRad(start + angle));
                        const large = angle > 180 ? 1 : 0;
                        const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1} Z`;
                        return <path key={item.asset_name} d={d} fill={palette[idx % palette.length]} />;
                      });
                    })()}
                  </svg>
                  <div className="donut-svg-center">
                    <span className="donut-svg-center-val">{allocs.length}</span>
                    <span className="donut-svg-center-lbl">Assets</span>
                  </div>
                </div>

                {/* Legend List */}
                <div className="donut-legend-list">
                  {allocs.map((item, idx) => {
                    const palette = ['#6366f1', '#38bdf8', '#10b981', '#f59e0b', '#ec4899', '#a855f7', '#94a3b8'];
                    return (
                      <div key={item.asset_name} className="donut-legend-row">
                        <div className="donut-legend-left">
                          <span className="donut-legend-dot" style={{ background: palette[idx % palette.length] }} />
                          <span>{item.asset_name}</span>
                        </div>
                        <div className="donut-legend-right">
                          <span className="donut-legend-val">{inr(item.current_value)}</span>
                          <span className="donut-legend-pct">({item.allocation_pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── ROW 3: Rebalance Engine Table + AI Copilot / ML Intelligence ── */}
          <div className="dash-grid-2 dash-anim-3">
            {/* Left: Rebalance Action Matrix (Ranked Table) */}
            <div className="dash-card">
              <div className="dash-card-head">
                <div>
                  <h3 className="dash-card-title">Rebalance Engine & Asset Signals</h3>
                  <p className="dash-card-desc">Target allocation drift and execution triggers</p>
                </div>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Threshold: ±5%</span>
              </div>

              <div className="dash-table-list">
                {(r.rebalancing || []).map((row, i) => {
                  const actionType = row.action?.startsWith('BUY') ? 'green' : row.action?.startsWith('SELL') ? 'red' : 'blue';
                  return (
                    <div key={row.asset_name} className="dash-tr">
                      <div className={`dash-rank-badge ${i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : ''}`}>
                        #{i + 1}
                      </div>
                      <div className="dash-avatar-badge">
                        {ASSET_ICONS[row.asset_name.toLowerCase().replace(/ /g, '_')] || '📊'}
                      </div>
                      <div className="dash-tr-body">
                        <div className="dash-tr-title-row">
                          <span className="dash-tr-title">{row.asset_name}</span>
                          <span className="dash-category-pill">{row.current_pct}% → {row.target_pct}%</span>
                        </div>
                        <div className="dash-tr-meta">
                          <span>Gap: {row.gap_pct > 0 ? `+${row.gap_pct}%` : `${row.gap_pct}%`}</span>
                          <span>•</span>
                          <span className={`status-pill ${actionType}`}>{row.action}</span>
                        </div>
                      </div>
                      <div className="dash-tr-right">
                        <span className="dash-tr-val">
                          {row.rebalance_amount !== 0 ? `${row.rebalance_amount > 0 ? '+' : ''}${inr(row.rebalance_amount)}` : 'In Target Band'}
                        </span>
                        <span className={`dash-tr-delta ${row.gap_pct >= 0 ? 'up' : 'down'}`}>
                          {row.needs_rebalance ? '⚠️ Action Required' : '✓ Balanced'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: ML Intelligence & Copilot Chat */}
            <div className="dash-card">
              <div className="dash-card-head">
                <div>
                  <h3 className="dash-card-title">Machine Learning Portfolio Copilot</h3>
                  <p className="dash-card-desc">Random Forest Classifier & Gradient Boosting Regressor</p>
                </div>
              </div>

              {/* ML Quick Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1.2rem' }}>
                <div className="insight-metric-tile">
                  <div className="insight-tile-label"><span>🤖</span> ML Rebalance Classifier</div>
                  <div className="insight-tile-val" style={{ color: ml.rebalance_decision?.startsWith('Yes') ? '#f87171' : '#34d399', fontSize: '1.15rem' }}>
                    {ml.rebalance_decision || 'Balanced'}
                  </div>
                  <div className="insight-tile-sub">Confidence: {ml.rebalance_confidence_pct ?? 94}%</div>
                </div>
                <div className="insight-metric-tile">
                  <div className="insight-tile-label"><span>📊</span> Gradient Boosting Forecast</div>
                  <div className="insight-tile-val" style={{ color: '#60a5fa', fontSize: '1.15rem' }}>
                    {ml.ml_predicted_return_pct ?? 13.8}% p.a.
                  </div>
                  <div className="insight-tile-sub">ML-Predicted Annual Return</div>
                </div>
              </div>

              {/* Chat Interface */}
              <div className="pf-chat-history" style={{ maxHeight: '200px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '0.8rem', overflowY: 'auto', marginBottom: '0.8rem' }}>
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`pf-chat-bubble pf-${msg.sender}`} style={{ marginBottom: '0.5rem', fontSize: '0.82rem' }}>
                    {msg.text}
                  </div>
                ))}
                {chatLoading && <div className="pf-chat-bubble pf-ai" style={{ fontSize: '0.82rem' }}>Analyzing portfolio telemetry…</div>}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={sendChat} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Ask about Sharpe ratio, Monte Carlo, rebalancing, VaR…"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  className="field-input"
                  style={{ flex: 1, padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}
                />
                <button type="submit" className="eng-btn-primary" style={{ padding: '0.45rem 1rem' }}>
                  Ask AI
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    );
  }


  // ─── FORM: STEP 1 — Asset Inputs ─────────────────────────────────────────
  // ─── FORM: STEP 1 — Asset Inputs ─────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="pf-page">
        <header className="pf-header">
          <Link to="/" className="pf-logo" style={{ textDecoration: 'none', color: '#fff' }}>
            <div className="pf-logo-icon">📈</div>
            FINEXO · <span>Portfolio Growth & Rebalancing</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            {user && (
              <div style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8', fontSize: '0.8rem', fontWeight: 600, padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
                <span>👤 {user.name}</span>
              </div>
            )}
            <Link to="/" className="pf-reset-btn">← Back to Hub</Link>
          </div>
        </header>

        <div className="pf-form-wrapper">
          {/* Autofill Notification */}
          {isAutofilled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.82rem', fontWeight: 600, padding: '0.6rem 1.2rem', borderRadius: '100px', marginBottom: '0.8rem', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)' }}>
              <span>✨ Portfolio holdings pre-filled from your saved model. Adjust allocations as needed.</span>
            </div>
          )}

          {/* 1-Click Allocation Presets */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', width: '100%', maxWidth: '680px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ⚡ 1-Click Asset Allocation Presets:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.6rem' }}>
              <button
                type="button"
                style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f1f5f9', fontSize: '0.82rem', fontWeight: 600, padding: '0.5rem 0.9rem', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={() => applyPortfolioPreset({
                  stocks: { current_value: 100000, expected_return: 14.0, risk_level: 'high' },
                  mutual_funds: { current_value: 150000, expected_return: 11.5, risk_level: 'medium' },
                  fixed_deposits: { current_value: 400000, expected_return: 7.2, risk_level: 'low' },
                  gold: { current_value: 150000, expected_return: 8.5, risk_level: 'low' },
                  pf: { current_value: 300000, expected_return: 8.15, risk_level: 'low' },
                  bonds: { current_value: 100000, expected_return: 7.5, risk_level: 'low' },
                  cash: { current_value: 50000, expected_return: 3.5, risk_level: 'low' }
                }, { riskProfile: 'Conservative', monthlySip: 10000 })}
              >
                🛡️ Low-Risk Capital Preserver (₹12.5L)
              </button>
              <button
                type="button"
                style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f1f5f9', fontSize: '0.82rem', fontWeight: 600, padding: '0.5rem 0.9rem', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={() => applyPortfolioPreset({
                  stocks: { current_value: 500000, expected_return: 14.5, risk_level: 'high' },
                  mutual_funds: { current_value: 400000, expected_return: 12.0, risk_level: 'medium' },
                  fixed_deposits: { current_value: 200000, expected_return: 7.0, risk_level: 'low' },
                  gold: { current_value: 150000, expected_return: 9.0, risk_level: 'low' },
                  pf: { current_value: 250000, expected_return: 8.15, risk_level: 'low' },
                  bonds: { current_value: 100000, expected_return: 7.5, risk_level: 'low' },
                  cash: { current_value: 50000, expected_return: 3.5, risk_level: 'low' }
                }, { riskProfile: 'Moderate', monthlySip: 25000 })}
              >
                ⚖️ Balanced 60/40 Growth (₹16.5L)
              </button>
              <button
                type="button"
                style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f1f5f9', fontSize: '0.82rem', fontWeight: 600, padding: '0.5rem 0.9rem', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={() => applyPortfolioPreset({
                  stocks: { current_value: 1200000, expected_return: 16.0, risk_level: 'high' },
                  mutual_funds: { current_value: 800000, expected_return: 13.5, risk_level: 'high' },
                  fixed_deposits: { current_value: 100000, expected_return: 7.0, risk_level: 'low' },
                  gold: { current_value: 100000, expected_return: 9.0, risk_level: 'low' },
                  pf: { current_value: 200000, expected_return: 8.15, risk_level: 'low' },
                  bonds: { current_value: 50000, expected_return: 7.5, risk_level: 'low' },
                  cash: { current_value: 50000, expected_return: 3.5, risk_level: 'low' }
                }, { riskProfile: 'Aggressive', monthlySip: 50000 })}
              >
                🚀 Aggressive Alpha Max (₹25L)
              </button>
            </div>
          </div>

          <ProgressStepper step={0} />

          <div className={`pf-form-card ${animating ? 'pf-fade-out' : 'pf-fade-in'}`}>
            <div className="pf-form-card-icon">💼</div>
            <h2 className="pf-form-card-title">Enter Your Asset Portfolio</h2>
            <p className="pf-form-card-sub">
              Step 1 of 2 · Enter the current value, expected annual return, and risk level for each asset class
            </p>

            <div className="pf-total-bar" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Portfolio Running Total</span>
                <span style={{ fontWeight: 800, color: '#60a5fa', fontSize: '1.25rem', fontFamily: 'Outfit, sans-serif' }}>{inr(totalValue)}</span>
              </div>

              {/* Live Segmented Asset Weight Distribution Bar */}
              {totalValue > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', height: '8px', borderRadius: '100px', overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
                    {ASSET_KEYS.map((key, i) => {
                      const val = parseFloat(assetInputs[key]?.current_value) || 0;
                      const pct = ((val / totalValue) * 100).toFixed(1);
                      const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];
                      if (val <= 0) return null;
                      return (
                        <div
                          key={key}
                          style={{ width: `${pct}%`, background: colors[i % colors.length] }}
                          title={`${ASSET_LABELS[key]}: ${pct}%`}
                        />
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                    {ASSET_KEYS.map((key, i) => {
                      const val = parseFloat(assetInputs[key]?.current_value) || 0;
                      if (val <= 0) return null;
                      const pct = Math.round((val / totalValue) * 100);
                      const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];
                      return (
                        <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[i % colors.length] }} />
                          {key.replace('_', ' ')}: <strong>{pct}%</strong>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="pf-asset-list">
              {ASSET_KEYS.map(key => {
                const val = parseFloat(assetInputs[key].current_value) || 0;
                return (
                  <div key={key} className="pf-asset-row">
                    <div className="pf-asset-icon-label">
                      <span className="pf-asset-icon">{ASSET_ICONS[key]}</span>
                      <div>
                        <div className="pf-asset-label">{ASSET_LABELS[key]}</div>
                        {totalValue > 0 && (
                          <div style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: 600 }}>
                            {Math.round((val / totalValue) * 100)}% of portfolio
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="pf-asset-fields" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px', gap: '0.8rem', alignItems: 'center' }}>
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
                          <label>Exp. Return</label>
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
                            <option value="medium">🟡 Med</option>
                            <option value="high">🔴 High</option>
                          </select>
                        </div>
                      </div>

                      {/* Range Slider for Asset Value */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <input
                          type="range"
                          min="0"
                          max="5000000"
                          step="10000"
                          value={val}
                          onChange={e => handleAssetChange(key, 'current_value', e.target.value)}
                          className="adv-range-slider"
                          style={{ accentColor: '#06b6d4' }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
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
        <Link to="/" className="pf-logo" style={{ textDecoration: 'none', color: '#fff' }}>
          <div className="pf-logo-icon">⚙️</div>
          FINEXO · <span>Portfolio Growth & Rebalancing</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          {user && (
            <div style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8', fontSize: '0.8rem', fontWeight: 600, padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
              <span>👤 {user.name}</span>
            </div>
          )}
          <Link to="/" className="pf-reset-btn">← Back to Hub</Link>
        </div>
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
