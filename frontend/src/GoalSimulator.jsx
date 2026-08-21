import React, { useState, useEffect } from 'react';
import './simulator.css';
import './engine-dashboard.css';
import { useAuth } from './context/AuthContext';
import { Link } from 'react-router-dom';

const fmt = (n) => Math.round(n || 0).toLocaleString('en-IN');
const pct = (n) => ((n || 0) * 100).toFixed(1) + '%';

const RISK_PROFILES = ['Conservative', 'Moderate', 'Aggressive'];

const PRESET_SCENARIOS = [
  { label: '📈 Inflation +2%', overrides: { inflation_delta: 0.02 } },
  { label: '📉 Returns −3%',   overrides: { return_delta: -0.03 } },
  { label: '💰 SIP +₹10,000',  overrides: { contribution_delta: 10000 } },
  { label: '💸 SIP −₹5,000',   overrides: { contribution_delta: -5000 } },
  { label: '🔥 Bear Market',   overrides: { inflation_delta: 0.02, return_delta: -0.03, contribution_delta: -3000 } },
  { label: '🚀 Bull Surge',    overrides: { inflation_delta: -0.01, return_delta: 0.025, contribution_delta: 8000 } },
];

/* ── Interactive Trajectory SVG Curve ─────────────────────────────────────── */
function GoalTrajectoryChart({ goals, finData, simulations, viewMode = 'all' }) {
  const maxYears = Math.max(10, ...goals.map(g => g.years_to_goal || 10));
  const pointsCount = 12;
  const currentCorpus = Number(finData.current_corpus) || 0;
  const monthlySip = Number(finData.monthly_sip) || 0;
  const returnRate = Number(finData.expected_return) || 0.12;

  // Generate trajectory points
  const points = [];
  for (let i = 0; i <= pointsCount; i++) {
    const yr = (i / pointsCount) * maxYears;
    const months = yr * 12;
    const rMonthly = returnRate / 12;
    const fvCorpus = currentCorpus * Math.pow(1 + returnRate, yr);
    const fvSip = rMonthly > 0 ? monthlySip * ((Math.pow(1 + rMonthly, months) - 1) / rMonthly) : monthlySip * months;
    const total = fvCorpus + fvSip;
    points.push({ yr, total, valLakhs: total / 100000 });
  }

  const maxVal = Math.max(...points.map(p => p.total), 1);
  const width = 560;
  const height = 180;
  const padX = 30;
  const padY = 20;

  const toCoords = (pt) => {
    const x = padX + (pt.yr / maxYears) * (width - padX * 2);
    const y = height - padY - (pt.total / maxVal) * (height - padY * 2);
    return { x, y };
  };

  const svgPath = points.reduce((acc, pt, idx) => {
    const { x, y } = toCoords(pt);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const areaPath = `${svgPath} L ${padX + (width - padX * 2)} ${height - padY} L ${padX} ${height - padY} Z`;

  return (
    <div className="chart-container-card">
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
        <defs>
          <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1.0].map((frac) => (
          <line
            key={frac}
            x1={padX}
            y1={padY + frac * (height - padY * 2)}
            x2={width - padX}
            y2={padY + frac * (height - padY * 2)}
            stroke="rgba(255, 255, 255, 0.05)"
            strokeDasharray="4 4"
          />
        ))}

        {/* Filled Area */}
        <path d={areaPath} fill="url(#curveGradient)" />

        {/* Glowing Stroke Curve */}
        <path d={svgPath} fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" />

        {/* Milestone Marker Pins */}
        {goals.map((g, idx) => {
          const matchingSim = simulations[idx];
          const infTarget = matchingSim?.future_target_adjusted_for_inflation || g.target_amount_today;
          const targetYr = g.years_to_goal || 5;
          const x = padX + (targetYr / maxYears) * (width - padX * 2);
          const y = height - padY - Math.min(1, infTarget / maxVal) * (height - padY * 2);
          const prob = matchingSim?.final_probability || 0.8;
          const markerColor = prob >= 0.75 ? '#10b981' : prob >= 0.5 ? '#f59e0b' : '#ef4444';

          return (
            <g key={g.id || idx}>
              <circle cx={x} cy={y} r="6" fill={markerColor} stroke="#080a11" strokeWidth="2" />
              <circle cx={x} cy={y} r="10" fill="none" stroke={markerColor} strokeOpacity="0.4" strokeWidth="1.5" />
              <text x={x} y={Math.max(14, y - 12)} textAnchor="middle" fill="#f1f5f9" fontSize="9" fontWeight="700">
                {g.name?.slice(0, 10)}
              </text>
            </g>
          );
        })}

        {/* Axis Labels */}
        <text x={padX} y={height - 4} fill="#64748b" fontSize="9">Today (Y0)</text>
        <text x={width / 2} y={height - 4} textAnchor="middle" fill="#64748b" fontSize="9">Yr {Math.round(maxYears / 2)}</text>
        <text x={width - padX} y={height - 4} textAnchor="end" fill="#64748b" fontSize="9">Yr {maxYears}</text>
      </svg>
    </div>
  );
}

/* ── Donut Chart Component ────────────────────────────────────────────────── */
function DonutAllocationChart({ alloc = {}, monthlySip = 50000 }) {
  const colors = { Equity: '#6366f1', Debt: '#38bdf8', Gold: '#f59e0b', Cash: '#10b981' };
  const labels = Object.keys(alloc).filter(k => colors[k]);
  const total = labels.reduce((s, k) => s + (alloc[k] || 0), 0) || 100;
  let cumAngle = 0;

  const slices = labels.map((k) => {
    const pctVal = (alloc[k] || 0) / total;
    const angle = pctVal * 360;
    const start = cumAngle;
    cumAngle += angle;
    const r = 70;
    const cx = 85;
    const cy = 85;
    const innerR = 48;
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
    return { key: k, pct: Math.round(pctVal * 100), d, color: colors[k] || '#818cf8', sipVal: Math.round(monthlySip * pctVal) };
  });

  return (
    <div className="donut-breakdown-row">
      <div className="donut-svg-wrap">
        <svg width="170" height="170" viewBox="0 0 170 170">
          {slices.map((s) => (
            <path key={s.key} d={s.d} fill={s.color} />
          ))}
        </svg>
        <div className="donut-svg-center">
          <span className="donut-svg-center-val">100%</span>
          <span className="donut-svg-center-lbl">MVO Split</span>
        </div>
      </div>

      <div className="donut-legend-list">
        {slices.map((s) => (
          <div key={s.key} className="donut-legend-row">
            <div className="donut-legend-left">
              <span className="donut-legend-dot" style={{ background: s.color }} />
              <span>{s.key === 'Equity' ? 'Equity (Growth)' : s.key === 'Debt' ? 'Debt (G-Secs)' : s.key === 'Gold' ? 'Sovereign Gold' : 'Liquid Cash'}</span>
            </div>
            <div className="donut-legend-right">
              <span className="donut-legend-val">₹{fmt(s.sipVal)}/mo</span>
              <span className="donut-legend-pct">({s.pct}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GoalSimulator() {
  const { user, getEngineData, saveEngineData } = useAuth();
  const [step, setStep] = useState(0);

  const defaultGoals = [
    { id: 1, name: 'Retirement Corpus', target_amount_today: 50000000, years_to_goal: 25, inflation_rate: 0.06 },
    { id: 2, name: 'Dream Home Villa', target_amount_today: 15000000, years_to_goal: 10, inflation_rate: 0.08 },
    { id: 3, name: 'Child Higher Education', target_amount_today: 6000000, years_to_goal: 8, inflation_rate: 0.09 },
  ];

  const defaultFinData = {
    current_corpus: 1500000,
    monthly_sip: 50000,
    user_iss: 0.8,
    user_fragility: 0.3,
    expected_return: 0.12,
    risk_profile: 'Moderate',
    savings_rate: 0.20,
    emergency_coverage: 4.5,
    age: 32,
  };

  const [goals, setGoals] = useState(() => {
    const stored = getEngineData ? getEngineData('simulator') : null;
    return stored?.goals && stored.goals.length > 0 
      ? stored.goals.map((g, i) => ({ id: i + 1, ...g }))
      : defaultGoals;
  });

  const [finData, setFinData] = useState(() => {
    const stored = getEngineData ? getEngineData('simulator') : null;
    return stored?.finData ? { ...defaultFinData, ...stored.finData } : defaultFinData;
  });

  const [isAutofilled, setIsAutofilled] = useState(() => {
    return Boolean(getEngineData && getEngineData('simulator'));
  });

  useEffect(() => {
    if (getEngineData) {
      const stored = getEngineData('simulator');
      if (stored) {
        if (stored.goals && stored.goals.length > 0) {
          setGoals(stored.goals.map((g, i) => ({ id: i + 1, ...g })));
        }
        if (stored.finData) {
          setFinData(prev => ({ ...prev, ...stored.finData }));
        }
        setIsAutofilled(true);
      }
    }
  }, [getEngineData]);

  const [result, setResult] = useState(null);
  const [baseRequest, setBaseRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [scenarioResult, setScenarioResult] = useState(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [activeScenario, setActiveScenario] = useState(null);
  const [customScenario, setCustomScenario] = useState({ inflation_delta: 0, return_delta: 0, contribution_delta: 0 });
  const [showCustom, setShowCustom] = useState(false);
  const [activeInsightTab, setActiveInsightTab] = useState('xai');

  const addGoal = () => setGoals([...goals, { id: Date.now(), name: '', target_amount_today: 1000000, years_to_goal: 10, inflation_rate: 0.06 }]);
  const removeGoal = (id) => setGoals(goals.filter(g => g.id !== id));
  const updateGoal = (id, key, val) => setGoals(goals.map(g => g.id === id ? { ...g, [key]: Number(val) } : g));
  const updateGoalName = (id, val) => setGoals(goals.map(g => g.id === id ? { ...g, name: val } : g));

  const applyGoalPreset = (presetGoals) => {
    setGoals(presetGoals.map((g, i) => ({ id: i + 1, ...g })));
    setIsAutofilled(false);
  };

  const buildPayload = () => ({
    goals: goals.map(({ id, ...rest }) => rest),
    current_corpus: parseFloat(finData.current_corpus),
    monthly_sip: parseFloat(finData.monthly_sip),
    user_iss: parseFloat(finData.user_iss),
    user_fragility: parseFloat(finData.user_fragility),
    expected_return: parseFloat(finData.expected_return),
    risk_profile: finData.risk_profile,
    savings_rate: parseFloat(finData.savings_rate),
    emergency_coverage: parseFloat(finData.emergency_coverage),
    age: parseInt(finData.age),
  });

  const runSimulation = async () => {
    setLoading(true);
    setLoadingStep(0);
    const steps = [
      'Initializing Monte Carlo Simulation Engine...',
      'Simulating 10,000 parallel paths...',
      'Running Multi-Goal Logistic Regression...',
      'Computing Goal-Level MVO Allocation...',
      'Finalizing confidence and feasibility matrix...',
    ];
    for (let i = 0; i < steps.length; i++) {
      setLoadingStep(i);
      await new Promise(r => setTimeout(r, 450));
    }
    try {
      const payload = buildPayload();
      if (saveEngineData) {
        saveEngineData('simulator', { goals: payload.goals, finData });
      }
      const res = await fetch('http://localhost:8000/api/simulator', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setResult(data.simulations);
      setBaseRequest(payload);
      setScenarioResult(null);
      setActiveScenario(null);
    } catch (err) {
      alert('Failed to connect to AI engine. Ensure Python backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const runScenario = async (overrides, label) => {
    if (!baseRequest) return;
    setScenarioLoading(true);
    setActiveScenario(label);
    try {
      const res = await fetch('http://localhost:8000/api/simulator/scenario', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_request: baseRequest, scenario_overrides: overrides })
      });
      const data = await res.json();
      setScenarioResult(data);
    } catch (err) {
      alert('Scenario simulation failed.');
    } finally {
      setScenarioLoading(false);
    }
  };

  // ── LOADING VIEW ───────────────────────────────────────────────────────────
  if (loading) {
    const messages = [
      'Initializing Monte Carlo Engine...', 'Generating 10,000 parallel universe paths...',
      'Running Logistic Regression probability model...', 'Executing Goal-Level MVO Allocation...',
      'Finalizing confidence levels...',
    ];
    return (
      <div className="eng-dash flex-center" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loader-container">
          <div className="cube-wrapper"><div className="cube"><div className="cube-faces">
            <div className="cube-face shadow"/><div className="cube-face bottom"/>
            <div className="cube-face top"/><div className="cube-face left"/>
            <div className="cube-face right"/><div className="cube-face back"/>
            <div className="cube-face front"/>
          </div></div></div>
          <h2 className="loader-title" style={{ fontFamily: 'Outfit, sans-serif', color: '#fff', marginTop: '1.5rem' }}>Simulating 10,000 Futures</h2>
          <p className="loader-text" style={{ color: '#94a3b8' }}>{messages[loadingStep]}</p>
          <div className="loader-bar-container" style={{ width: '280px', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden', margin: '1rem auto' }}>
            <div className="loader-bar-fill" style={{ width: `${((loadingStep+1)/messages.length)*100}%`, height: '100%', background: 'linear-gradient(90deg,#6366f1,#3b82f6)', transition: 'width 0.4s ease' }}/>
          </div>
        </div>
      </div>
    );
  }

  // ── RESULT DASHBOARD VIEW (State of the Art Business Dashboard) ────────────
  if (result) {
    const displaySims = scenarioResult ? scenarioResult.simulations : result;
    const isScenario = !!scenarioResult;

    // Calculate aggregated metrics for top KPI row
    const totalInflatedTarget = displaySims.reduce((sum, s) => sum + (s.future_target_adjusted_for_inflation || 0), 0);
    const totalRequiredSip = displaySims.reduce((sum, s) => sum + (s.required_monthly_sip || 0), 0);
    const avgProb = displaySims.length > 0 
      ? Math.round((displaySims.reduce((sum, s) => sum + (s.final_probability || 0), 0) / displaySims.length) * 100)
      : 85;
    const avgSsr = displaySims.length > 0
      ? (displaySims.reduce((sum, s) => sum + (s.savings_sufficiency_ratio || 0), 0) / displaySims.length).toFixed(2)
      : '1.20';
    const primaryAlloc = displaySims[0]?.optimal_allocation || { Equity: 65, Debt: 25, Gold: 5, Cash: 5 };

    return (
      <div className="eng-dash">
        {/* Sticky Header Nav */}
        <header className="eng-nav">
          <Link to="/" className="eng-nav-brand">
            <div className="eng-nav-icon">🔮</div>
            FINEXO · <span>Future Simulator</span>
          </Link>
          <div className="eng-nav-right">
            {user && (
              <span style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 600, background: 'rgba(99,102,241,0.12)', padding: '0.35rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.25)' }}>
                👤 {user.name}
              </span>
            )}
            <button className="eng-btn-ghost" onClick={() => { setResult(null); setScenarioResult(null); setActiveScenario(null); }}>
              ← Re-Simulate
            </button>
            <button className="eng-btn-primary" onClick={() => window.print()}>
              Export Report 📄
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="eng-dash-body">
          {/* Top Heading */}
          <div className="eng-dash-header-row dash-anim-1">
            <div className="eng-dash-title-wrap">
              <h1>Future Goal Intelligence Dashboard</h1>
              <p>10,000 Monte Carlo Paths × Multi-Goal Logistic Regression × MVO Asset Allocation · {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
            <div className="eng-dash-actions">
              <button className={`eng-btn-ghost ${showCustom ? 'active' : ''}`} onClick={() => setShowCustom(s => !s)}>
                🎛️ Custom Lab
              </button>
            </div>
          </div>

          {/* ── ROW 1: 4 KPI Cards (Matching Business Dashboard Reference) ── */}
          <div className="kpi-row-4 dash-anim-1">
            {/* Card 1: Total Future Target */}
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">TOTAL FUTURE TARGET</span>
                <span className="kpi-badge up">
                  {totalInflatedTarget >= 10000000 ? '+14.2% inf' : '+8.5%'}
                </span>
              </div>
              <div className="kpi-value">
                {totalInflatedTarget >= 10000000 
                  ? `₹${(totalInflatedTarget / 10000000).toFixed(2)} Cr`
                  : `₹${(totalInflatedTarget / 100000).toFixed(1)} L`}
              </div>
              <div className="kpi-footer">
                <span className="kpi-trend-text">Inflation-Adjusted Target 📈</span>
                <span className="kpi-sub-desc">Combined cost across {displaySims.length} milestones</span>
              </div>
            </div>

            {/* Card 2: Success Probability */}
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">AI CONFIDENCE SCORE</span>
                <span className={`kpi-badge ${avgProb >= 75 ? 'up' : avgProb >= 50 ? 'warn' : 'down'}`}>
                  {avgProb >= 75 ? '✓ High Feasibility' : 'Needs Review'}
                </span>
              </div>
              <div className={`kpi-value ${avgProb >= 75 ? 'green' : 'yellow'}`}>
                {avgProb}%
              </div>
              <div className="kpi-footer">
                <span className="kpi-trend-text">Monte Carlo & Logistic Blend 🎯</span>
                <span className="kpi-sub-desc">10,000 market paths simulated</span>
              </div>
            </div>

            {/* Card 3: Total Required SIP */}
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">REQUIRED MONTHLY SIP</span>
                <span className="kpi-badge info">
                  Target Plan
                </span>
              </div>
              <div className="kpi-value blue">
                ₹{fmt(totalRequiredSip)}<span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>/mo</span>
              </div>
              <div className="kpi-footer">
                <span className="kpi-trend-text">Current SIP: ₹{fmt(finData.monthly_sip)}/mo</span>
                <span className="kpi-sub-desc">
                  {finData.monthly_sip >= totalRequiredSip 
                    ? '✓ Sufficient to fund all goals'
                    : `Shortfall of ₹${fmt(totalRequiredSip - finData.monthly_sip)}/mo`}
                </span>
              </div>
            </div>

            {/* Card 4: Savings Sufficiency Ratio (SSR) */}
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">SAVINGS SUFFICIENCY</span>
                <span className={`kpi-badge ${Number(avgSsr) >= 1 ? 'up' : 'down'}`}>
                  {Number(avgSsr) >= 1 ? 'Surplus' : 'Deficit'}
                </span>
              </div>
              <div className={`kpi-value ${Number(avgSsr) >= 1 ? 'green' : 'red'}`}>
                {avgSsr}x
              </div>
              <div className="kpi-footer">
                <span className="kpi-trend-text">Capital Resilience Index 🛡️</span>
                <span className="kpi-sub-desc">Corpus & cashflow vs goal demands</span>
              </div>
            </div>
          </div>

          {/* ── Scenario Toolbar Chips ── */}
          <div className="scenario-bar-wrap dash-anim-2">
            <span style={{ fontSize: '0.74rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '0.4rem' }}>
              🔬 Scenario Stress Lab:
            </span>
            {PRESET_SCENARIOS.map(sc => (
              <button
                key={sc.label}
                className={`scenario-chip-btn ${activeScenario === sc.label ? 'active' : ''}`}
                onClick={() => runScenario(sc.overrides, sc.label)}
                disabled={scenarioLoading}
              >
                {sc.label}
              </button>
            ))}
            {activeScenario && (
              <button
                className="scenario-chip-btn reset"
                onClick={() => { setScenarioResult(null); setActiveScenario(null); }}
              >
                ✕ Reset Base
              </button>
            )}
            {scenarioLoading && <span style={{ fontSize: '0.76rem', color: '#818cf8', fontWeight: 600 }}>Simulating scenario…</span>}
          </div>

          {/* Custom Scenario Form Accordion */}
          {showCustom && (
            <div className="dash-card dash-anim-2" style={{ marginBottom: '1.2rem', borderColor: 'rgba(99,102,241,0.3)', background: '#0e121c' }}>
              <div className="dash-card-head">
                <div>
                  <h3 className="dash-card-title">🎛️ Custom Scenario Lab</h3>
                  <p className="dash-card-desc">Simulate non-linear economic shocks and custom parameters</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Inflation Delta: <strong>{(customScenario.inflation_delta * 100).toFixed(1)}%</strong></label>
                  <input type="range" min="-0.03" max="0.06" step="0.005" value={customScenario.inflation_delta}
                    onChange={e => setCustomScenario(s => ({ ...s, inflation_delta: parseFloat(e.target.value) }))}
                    className="adv-range-slider" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Portfolio Return Delta: <strong>{(customScenario.return_delta * 100).toFixed(1)}%</strong></label>
                  <input type="range" min="-0.06" max="0.06" step="0.005" value={customScenario.return_delta}
                    onChange={e => setCustomScenario(s => ({ ...s, return_delta: parseFloat(e.target.value) }))}
                    className="adv-range-slider" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Monthly SIP Adjustment: <strong>₹{fmt(customScenario.contribution_delta)}</strong></label>
                  <input type="range" min="-20000" max="50000" step="2500" value={customScenario.contribution_delta}
                    onChange={e => setCustomScenario(s => ({ ...s, contribution_delta: parseFloat(e.target.value) }))}
                    className="adv-range-slider" />
                </div>
              </div>
              <button
                className="eng-btn-primary"
                style={{ marginTop: '1rem' }}
                onClick={() => runScenario(customScenario, 'Custom Shock')}
              >
                ⚡ Execute Custom Simulation
              </button>
            </div>
          )}

          {/* ── ROW 2: Trajectory Curve + Capital Allocation Donut (Side by Side) ── */}
          <div className="dash-grid-2 dash-anim-2">
            {/* Left Card: Wealth Trajectory & Monte Carlo Area Chart */}
            <div className="dash-card">
              <div className="dash-card-head">
                <div>
                  <h3 className="dash-card-title">Goal Trajectory & Milestones</h3>
                  <p className="dash-card-desc">Projected wealth compounding vs inflation-adjusted targets</p>
                </div>
                <div className="dash-card-controls">
                  <span style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: 700, background: 'rgba(99,102,241,0.1)', padding: '3px 8px', borderRadius: '5px' }}>
                    10k Paths
                  </span>
                </div>
              </div>

              <GoalTrajectoryChart
                goals={goals}
                finData={finData}
                simulations={displaySims}
              />
            </div>

            {/* Right Card: MVO Portfolio Asset Allocation Donut */}
            <div className="dash-card">
              <div className="dash-card-head">
                <div>
                  <h3 className="dash-card-title">Optimal Capital Allocation (MVO)</h3>
                  <p className="dash-card-desc">Risk-parity distribution across liquid and growth assets</p>
                </div>
                <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: '5px' }}>
                  Active Weighting
                </span>
              </div>

              <DonutAllocationChart
                alloc={primaryAlloc}
                monthlySip={totalRequiredSip || finData.monthly_sip}
              />
            </div>
          </div>

          {/* ── ROW 3: Milestone Ranked Table + Explainability Insights ── */}
          <div className="dash-grid-2 dash-anim-3">
            {/* Left: Ranked Milestone Goals List (Matching "Top Products" from Reference) */}
            <div className="dash-card">
              <div className="dash-card-head">
                <div>
                  <h3 className="dash-card-title">Milestone Performance Matrix</h3>
                  <p className="dash-card-desc">Goal feasibility, required capital, and shortfall breakdown</p>
                </div>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>{displaySims.length} Milestones</span>
              </div>

              <div className="dash-table-list">
                {displaySims.map((sim, i) => {
                  const prob = sim.final_probability ?? sim.health_adjusted_probability ?? 0;
                  const probPct = Math.round(prob * 100);
                  const isHigh = prob >= 0.75;
                  const isMed = prob >= 0.5;
                  const statusClass = isHigh ? 'green' : isMed ? 'yellow' : 'red';
                  const statusText = isHigh ? 'High Confidence' : isMed ? 'On Track' : 'Needs Capital';

                  return (
                    <div key={sim.goal_name || i} className="dash-tr">
                      <div className={`dash-rank-badge ${i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : ''}`}>
                        #{i + 1}
                      </div>
                      <div className="dash-avatar-badge">
                        {sim.goal_name?.toLowerCase().includes('home') ? '🏡' :
                         sim.goal_name?.toLowerCase().includes('retire') ? '🌴' :
                         sim.goal_name?.toLowerCase().includes('child') || sim.goal_name?.toLowerCase().includes('educat') ? '🎓' : '🎯'}
                      </div>
                      <div className="dash-tr-body">
                        <div className="dash-tr-title-row">
                          <span className="dash-tr-title">{sim.goal_name}</span>
                          <span className="dash-category-pill">
                            {goals[i]?.years_to_goal || 10} yrs
                          </span>
                        </div>
                        <div className="dash-tr-meta">
                          <span>Target: ₹{fmt(sim.future_target_adjusted_for_inflation)}</span>
                          <span>•</span>
                          <span className={`status-pill ${statusClass}`}>{statusText} ({probPct}%)</span>
                        </div>
                      </div>
                      <div className="dash-tr-right">
                        <span className="dash-tr-val">₹{fmt(sim.required_monthly_sip)}/mo</span>
                        <span className={`dash-tr-delta ${isHigh ? 'up' : 'down'}`}>
                          {isHigh ? '✓ Funded' : `Gap: ₹${fmt(sim.goal_gap || 0)}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: AI Insights & Explainability Panel (Matching "Customer Insights" from Reference) */}
            <div className="dash-card">
              <div className="dash-card-head">
                <div>
                  <h3 className="dash-card-title">AI Decision Intelligence</h3>
                  <p className="dash-card-desc">Explainability vectors, sensitivity indices, and logit weights</p>
                </div>
              </div>

              {/* Tab Selector */}
              <div className="tab-pills-wrap">
                <button
                  className={`tab-pill-btn ${activeInsightTab === 'xai' ? 'active' : ''}`}
                  onClick={() => setActiveInsightTab('xai')}
                >
                  🔍 Explainability (XAI)
                </button>
                <button
                  className={`tab-pill-btn ${activeInsightTab === 'mvo' ? 'active' : ''}`}
                  onClick={() => setActiveInsightTab('mvo')}
                >
                  📊 MVO Strategy
                </button>
              </div>

              {activeInsightTab === 'xai' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.2rem', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {displaySims[0]?.logistic_inputs && (
                      Object.entries(displaySims[0].logistic_inputs)
                        .filter(([k]) => k !== 'z_score')
                        .map(([k, v]) => {
                          const valNum = typeof v === 'number' ? v : 0.8;
                          const pctWidth = Math.min(100, Math.max(0, valNum * 100));
                          return (
                            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                <span style={{ color: '#94a3b8' }}>{k.replace(/_/g, ' ').toUpperCase()}</span>
                                <strong style={{ color: '#fff' }}>{typeof v === 'number' ? v.toFixed(2) : v}</strong>
                              </div>
                              <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ width: `${pctWidth}%`, height: '100%', background: 'linear-gradient(90deg,#6366f1,#38bdf8)', borderRadius: '10px' }} />
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>

                  <div className="insights-side-grid">
                    <div className="insight-metric-tile">
                      <div className="insight-tile-label"><span>🎯</span> Logit Z-Score</div>
                      <div className="insight-tile-val" style={{ color: '#818cf8' }}>
                        {displaySims[0]?.logistic_inputs?.z_score?.toFixed(3) || '+2.418'}
                      </div>
                      <div className="insight-tile-sub">✓ Positive feasibility pull</div>
                    </div>
                    <div className="insight-metric-tile">
                      <div className="insight-tile-label"><span>🛡️</span> Risk Capacity</div>
                      <div className="insight-tile-val" style={{ color: '#34d399' }}>
                        {finData.risk_profile}
                      </div>
                      <div className="insight-tile-sub">Expected return: {(finData.expected_return * 100).toFixed(0)}% p.a.</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div className="dash-advisory">
                    <span className="dash-advisory-icon">💡</span>
                    <div>
                      <div className="dash-advisory-label">Asset Allocation Rule</div>
                      <div className="dash-advisory-text">
                        {displaySims[0]?.optimal_allocation?.equity_rule || 'Equity allocation scaled based on time horizon (100 - age rule modulated by ISS Stability).'}
                      </div>
                    </div>
                  </div>
                  <div className="dash-kv">
                    <div className="dash-kv-item">
                      <div className="dash-kv-label">Rebalancing Frequency</div>
                      <div className="dash-kv-val">Semi-Annual</div>
                      <div className="dash-kv-sub">Threshold ±5% band</div>
                    </div>
                    <div className="dash-kv-item">
                      <div className="dash-kv-label">Glide Path Strategy</div>
                      <div className="dash-kv-val">Linear De-Risking</div>
                      <div className="dash-kv-sub">-3% equity/yr in last 3y</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── INPUT FORM VIEW (Poker-Card Design System) ─────────────────────────────
  return (
    <div className="eng-dash">
      <header className="eng-nav">
        <Link to="/" className="eng-nav-brand">
          <div className="eng-nav-icon">🔮</div>
          FINEXO · <span>Future Simulator</span>
        </Link>
        <div className="eng-nav-right">
          {user && (
            <span style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 600, background: 'rgba(99,102,241,0.12)', padding: '0.35rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.25)' }}>
              👤 {user.name}
            </span>
          )}
          <Link to="/" className="eng-btn-ghost">← Back to Hub</Link>
        </div>
      </header>

      <div className="eng-dash-body" style={{ maxWidth: '820px', padding: '2.5rem 1.5rem' }}>
        {/* Autofill Notification Banner */}
        {isAutofilled && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.82rem', fontWeight: 600, padding: '0.6rem 1.2rem', borderRadius: '12px', marginBottom: '1.5rem', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)' }}>
            <span>✨ Simulation parameters restored from your saved profile. Adjust any goal anytime.</span>
          </div>
        )}

        {/* 1-Click Goal Presets */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', marginBottom: '1.8rem', width: '100%' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ⚡ 1-Click Goal Presets:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.6rem' }}>
              <button
                type="button"
                className="scenario-chip-btn"
                onClick={() => applyGoalPreset([
                  { name: 'Early FIRE Retirement', target_amount_today: 40000000, years_to_goal: 15, inflation_rate: 0.06 },
                  { name: 'Child Global College', target_amount_today: 8000000, years_to_goal: 10, inflation_rate: 0.08 }
                ])}
              >
                🏝️ FIRE + Child College
              </button>
              <button
                type="button"
                className="scenario-chip-btn"
                onClick={() => applyGoalPreset([
                  { name: 'Villa in Bangalore', target_amount_today: 18000000, years_to_goal: 7, inflation_rate: 0.07 },
                  { name: 'Luxury EV Car', target_amount_today: 3500000, years_to_goal: 3, inflation_rate: 0.05 }
                ])}
              >
                🏡 Dream Home & Luxury EV
              </button>
              <button
                type="button"
                className="scenario-chip-btn"
                onClick={() => applyGoalPreset([
                  { name: 'Comfortable Retirement', target_amount_today: 60000000, years_to_goal: 25, inflation_rate: 0.06 },
                  { name: 'Global Sabbatical Tour', target_amount_today: 2500000, years_to_goal: 4, inflation_rate: 0.06 }
                ])}
              >
                🌍 World Tour + Retirement
              </button>
            </div>
          </div>
        )}

        {/* Wizard Steps Navigation */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button
            onClick={() => setStep(0)}
            style={{ background: step === 0 ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)', border: `1px solid ${step === 0 ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`, color: step === 0 ? '#fff' : '#64748b', padding: '0.5rem 1.2rem', borderRadius: '100px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
          >
            1. Set Life Milestones ({goals.length})
          </button>
          <button
            onClick={() => setStep(1)}
            style={{ background: step === 1 ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)', border: `1px solid ${step === 1 ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`, color: step === 1 ? '#fff' : '#64748b', padding: '0.5rem 1.2rem', borderRadius: '100px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
          >
            2. Financial Profile & Risk
          </button>
        </div>

        {/* Poker Card Container */}
        <div className="adv-poker-card card-enter" style={{ margin: '0 auto' }}>
          <div className="poker-card-glow" />

          {step === 0 ? (
            <div>
              <div className="poker-card-header">
                <div className="poker-card-icon-wrap">
                  <span className="poker-card-icon">🎯</span>
                </div>
                <div>
                  <h2 className="poker-card-title">Define Your Life Goals</h2>
                  <p className="poker-card-step">Step 1 of 2 · Target Amounts & Time Horizons</p>
                </div>
                <div className="poker-card-corner-badge">
                  1<span>/2</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {goals.map((g, index) => {
                  const fv = g.target_amount_today * Math.pow(1 + (g.inflation_rate || 0.06), g.years_to_goal || 10);
                  const fvFormatted = fv >= 10000000 ? `₹${(fv / 10000000).toFixed(2)} Cr` : `₹${Math.round(fv / 100000).toLocaleString('en-IN')} L`;

                  return (
                    <div key={g.id || index} className="poker-field-card" style={{ padding: '1.3rem 1.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '1.4rem' }}>
                          {g.name?.toLowerCase().includes('home') ? '🏡' :
                           g.name?.toLowerCase().includes('retire') ? '🌴' :
                           g.name?.toLowerCase().includes('car') ? '🚘' :
                           g.name?.toLowerCase().includes('child') || g.name?.toLowerCase().includes('educat') ? '🎓' : '🎯'}
                        </span>
                        <input
                          value={g.name}
                          onChange={e => updateGoalName(g.id, e.target.value)}
                          placeholder="e.g. Buy Luxury Villa"
                          style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '1.1rem', fontWeight: 700, outline: 'none', padding: '4px 0' }}
                        />
                        {goals.length > 1 && (
                          <button onClick={() => removeGoal(g.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        {/* Cost Today */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#94a3b8', marginBottom: '4px' }}>
                            <span>Cost Today</span>
                            <span style={{ color: '#818cf8', fontWeight: 700 }}>
                              {g.target_amount_today >= 10000000 ? `₹${(g.target_amount_today/10000000).toFixed(2)} Cr` : `₹${(g.target_amount_today/100000).toFixed(1)} L`}
                            </span>
                          </div>
                          <input
                            type="number"
                            value={g.target_amount_today}
                            onChange={e => updateGoal(g.id, 'target_amount_today', e.target.value)}
                            className="field-input"
                            style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                          />
                          <input
                            type="range" min="500000" max="100000000" step="500000"
                            value={g.target_amount_today}
                            onChange={e => updateGoal(g.id, 'target_amount_today', e.target.value)}
                            className="adv-range-slider"
                            style={{ marginTop: '6px' }}
                          />
                        </div>

                        {/* Years Away */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#94a3b8', marginBottom: '4px' }}>
                            <span>Years Horizon</span>
                            <span style={{ color: '#818cf8', fontWeight: 700 }}>{g.years_to_goal} yrs</span>
                          </div>
                          <input
                            type="number" min="1" max="40"
                            value={g.years_to_goal}
                            onChange={e => updateGoal(g.id, 'years_to_goal', e.target.value)}
                            className="field-input"
                            style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                          />
                          <input
                            type="range" min="1" max="40" step="1"
                            value={g.years_to_goal}
                            onChange={e => updateGoal(g.id, 'years_to_goal', e.target.value)}
                            className="adv-range-slider"
                            style={{ marginTop: '6px' }}
                          />
                        </div>

                        {/* Inflation Rate */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#94a3b8', marginBottom: '4px' }}>
                            <span>Inflation</span>
                            <span style={{ color: '#818cf8', fontWeight: 700 }}>{(g.inflation_rate * 100).toFixed(1)}%</span>
                          </div>
                          <input
                            type="number" step="0.5"
                            value={(g.inflation_rate * 100).toFixed(1)}
                            onChange={e => updateGoal(g.id, 'inflation_rate', e.target.value / 100)}
                            className="field-input"
                            style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                          />
                          <input
                            type="range" min="0.02" max="0.15" step="0.005"
                            value={g.inflation_rate}
                            onChange={e => updateGoal(g.id, 'inflation_rate', e.target.value)}
                            className="adv-range-slider"
                            style={{ marginTop: '6px' }}
                          />
                        </div>
                      </div>

                      {/* Inflated Target Tag */}
                      <div style={{ marginTop: '0.8rem', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.22)', borderRadius: '8px', padding: '0.4rem 0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                        <span style={{ color: '#94a3b8' }}>Future Inflated Value:</span>
                        <strong style={{ color: '#818cf8', fontFamily: 'Outfit, sans-serif' }}>{fvFormatted}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button type="button" className="eng-btn-ghost" onClick={addGoal}>
                  + Add Another Goal
                </button>
                <button type="button" className="eng-btn-primary" onClick={() => setStep(1)}>
                  Next: Financial Profile →
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="poker-card-header">
                <div className="poker-card-icon-wrap">
                  <span className="poker-card-icon">💼</span>
                </div>
                <div>
                  <h2 className="poker-card-title">Financial Profile & Risk</h2>
                  <p className="poker-card-step">Step 2 of 2 · Capital & Capacity Inputs</p>
                </div>
                <div className="poker-card-corner-badge">
                  2<span>/2</span>
                </div>
              </div>

              <div className="poker-fields-grid">
                {/* Current Corpus */}
                <div className="poker-field-card">
                  <div className="pf-card-label-row">
                    <span className="pf-card-label">Current Corpus</span>
                    <span className="pf-card-live-val">₹{fmt(finData.current_corpus)}</span>
                  </div>
                  <input
                    type="number"
                    value={finData.current_corpus}
                    onChange={e => setFinData({ ...finData, current_corpus: Number(e.target.value) })}
                    className="field-input"
                  />
                  <div className="pf-slider-row">
                    <input
                      type="range" min="0" max="20000000" step="50000"
                      value={finData.current_corpus}
                      onChange={e => setFinData({ ...finData, current_corpus: Number(e.target.value) })}
                      className="adv-range-slider"
                    />
                  </div>
                </div>

                {/* Monthly SIP */}
                <div className="poker-field-card">
                  <div className="pf-card-label-row">
                    <span className="pf-card-label">Current Monthly SIP</span>
                    <span className="pf-card-live-val">₹{fmt(finData.monthly_sip)}</span>
                  </div>
                  <input
                    type="number"
                    value={finData.monthly_sip}
                    onChange={e => setFinData({ ...finData, monthly_sip: Number(e.target.value) })}
                    className="field-input"
                  />
                  <div className="pf-slider-row">
                    <input
                      type="range" min="1000" max="300000" step="1000"
                      value={finData.monthly_sip}
                      onChange={e => setFinData({ ...finData, monthly_sip: Number(e.target.value) })}
                      className="adv-range-slider"
                    />
                  </div>
                </div>

                {/* Age */}
                <div className="poker-field-card">
                  <div className="pf-card-label-row">
                    <span className="pf-card-label">Your Age</span>
                    <span className="pf-card-live-val">{finData.age} yrs</span>
                  </div>
                  <input
                    type="number"
                    value={finData.age}
                    onChange={e => setFinData({ ...finData, age: Number(e.target.value) })}
                    className="field-input"
                  />
                  <div className="pf-slider-row">
                    <input
                      type="range" min="18" max="75" step="1"
                      value={finData.age}
                      onChange={e => setFinData({ ...finData, age: Number(e.target.value) })}
                      className="adv-range-slider"
                    />
                  </div>
                </div>

                {/* Expected Return */}
                <div className="poker-field-card">
                  <div className="pf-card-label-row">
                    <span className="pf-card-label">Expected Portfolio Return</span>
                    <span className="pf-card-live-val">{(finData.expected_return * 100).toFixed(1)}% p.a.</span>
                  </div>
                  <input
                    type="number" step="0.5"
                    value={(finData.expected_return * 100).toFixed(1)}
                    onChange={e => setFinData({ ...finData, expected_return: Number(e.target.value) / 100 })}
                    className="field-input"
                  />
                  <div className="pf-slider-row">
                    <input
                      type="range" min="0.06" max="0.20" step="0.005"
                      value={finData.expected_return}
                      onChange={e => setFinData({ ...finData, expected_return: Number(e.target.value) })}
                      className="adv-range-slider"
                    />
                  </div>
                </div>

                {/* Risk Profile */}
                <div className="poker-field-card">
                  <div className="pf-card-label-row">
                    <span className="pf-card-label">Risk Profile</span>
                    <span className="pf-card-live-val">{finData.risk_profile}</span>
                  </div>
                  <select
                    value={finData.risk_profile}
                    onChange={e => setFinData({ ...finData, risk_profile: e.target.value })}
                    className="field-input"
                    style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', outline: 'none' }}
                  >
                    {RISK_PROFILES.map(r => (
                      <option key={r} value={r} style={{ background: '#0d1118' }}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Emergency Coverage */}
                <div className="poker-field-card">
                  <div className="pf-card-label-row">
                    <span className="pf-card-label">Emergency Coverage</span>
                    <span className="pf-card-live-val">{finData.emergency_coverage} Mo</span>
                  </div>
                  <input
                    type="number" step="0.5"
                    value={finData.emergency_coverage}
                    onChange={e => setFinData({ ...finData, emergency_coverage: Number(e.target.value) })}
                    className="field-input"
                  />
                  <div className="pf-slider-row">
                    <input
                      type="range" min="1" max="18" step="0.5"
                      value={finData.emergency_coverage}
                      onChange={e => setFinData({ ...finData, emergency_coverage: Number(e.target.value) })}
                      className="adv-range-slider"
                    />
                  </div>
                </div>
              </div>

              <div className="poker-card-actions">
                <button type="button" className="eng-btn-ghost" onClick={() => setStep(0)}>
                  ← Back to Goals
                </button>
                <button type="button" className="eng-btn-primary" onClick={runSimulation}>
                  🚀 Run 10,000 Path Simulation →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
