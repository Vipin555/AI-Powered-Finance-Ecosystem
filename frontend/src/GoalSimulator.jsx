import React, { useState, useEffect } from 'react';
import './simulator.css';

const fmt = (n) => Math.round(n).toLocaleString('en-IN');
const pct = (n) => (n * 100).toFixed(1) + '%';

const RISK_PROFILES = ['Conservative', 'Moderate', 'Aggressive'];

const PRESET_SCENARIOS = [
  { label: '📈 Inflation +2%', overrides: { inflation_delta: 0.02 } },
  { label: '📉 Returns −3%',   overrides: { return_delta: -0.03 } },
  { label: '💰 SIP +₹5,000',  overrides: { contribution_delta: 5000 } },
  { label: '💸 SIP −₹3,000',  overrides: { contribution_delta: -3000 } },
  { label: '🔥 Worst Case',    overrides: { inflation_delta: 0.02, return_delta: -0.03, contribution_delta: -2000 } },
  { label: '🚀 Best Case',     overrides: { inflation_delta: -0.01, return_delta: 0.02, contribution_delta: 5000 } },
];

function ProbabilityRing({ value, color, label }) {
  const r = 28, circ = 2 * Math.PI * r;
  return (
    <div className="prob-ring-wrap">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={circ - (value * circ)}
          strokeLinecap="round" transform="rotate(-90 40 40)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="40" y="45" textAnchor="middle" fill={color} fontSize="13" fontWeight="700">{(value*100).toFixed(0)}%</text>
      </svg>
      <span className="ring-label">{label}</span>
    </div>
  );
}

function AllocationBar({ alloc }) {
  const colors = { Equity: '#f26622', Debt: '#4c9af2', Gold: '#f59e0b', Cash: '#4caf8e' };
  return (
    <div className="alloc-bar-wrap">
      <div className="alloc-bar-track">
        {Object.entries(alloc).filter(([k]) => colors[k]).map(([k, v]) => (
          <div key={k} style={{ width: `${v}%`, background: colors[k], height: '100%', transition: 'width 0.8s ease' }} title={`${k}: ${v}%`} />
        ))}
      </div>
      <div className="alloc-legend">
        {Object.entries(alloc).filter(([k]) => colors[k]).map(([k, v]) => (
          <span key={k} className="alloc-dot-item">
            <span style={{ background: colors[k], width: 10, height: 10, borderRadius: '50%', display: 'inline-block', marginRight: 4 }} />
            {k} {v}%
          </span>
        ))}
      </div>
    </div>
  );
}

import { useAuth } from './context/AuthContext';
import { Link } from 'react-router-dom';

export default function GoalSimulator() {
  const { user, getEngineData, saveEngineData } = useAuth();
  const [step, setStep] = useState(0);

  const defaultGoals = [
    { id: 1, name: 'Retirement', target_amount_today: 50000000, years_to_goal: 25, inflation_rate: 0.06 },
    { id: 2, name: 'Dream Home', target_amount_today: 15000000, years_to_goal: 10, inflation_rate: 0.08 },
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
    setLoading(true); setLoadingStep(0);
    const steps = [
      'Initializing Monte Carlo Engine...',
      'Generating 10,000 parallel universe paths...',
      'Running Logistic Regression probability model...',
      'Executing Goal-Level MVO Allocation...',
      'Finalizing confidence levels...',
    ];
    for (let i = 0; i < steps.length; i++) {
      setLoadingStep(i);
      await new Promise(r => setTimeout(r, 550));
    }
    try {
      const payload = buildPayload();

      // Persist simulation parameters for user
      if (saveEngineData) {
        saveEngineData('simulator', {
          goals: payload.goals,
          finData: finData
        });
      }

      const res = await fetch('http://localhost:8000/api/simulator', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setResult(data.simulations);
      setBaseRequest(payload);
      setScenarioResult(null); setActiveScenario(null);
    } catch (err) {
      alert('Failed to connect to AI engine. Ensure Python backend is running.');
    } finally { setLoading(false); }
  };

  const runScenario = async (overrides, label) => {
    if (!baseRequest) return;
    setScenarioLoading(true); setActiveScenario(label);
    try {
      const res = await fetch('http://localhost:8000/api/simulator/scenario', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_request: baseRequest, scenario_overrides: overrides })
      });
      const data = await res.json();
      setScenarioResult(data);
    } catch (err) {
      alert('Scenario simulation failed.');
    } finally { setScenarioLoading(false); }
  };

  // ── LOADER ──────────────────────────────────────────────────────────────────
  if (loading) {
    const messages = [
      'Initializing Monte Carlo Engine...', 'Generating 10,000 parallel universe paths...',
      'Running Logistic Regression probability model...', 'Executing Goal-Level MVO Allocation...',
      'Finalizing confidence levels...',
    ];
    return (
      <div className="sim-page flex-center">
        <div className="loader-container">
          <div className="cube-wrapper"><div className="cube"><div className="cube-faces">
            <div className="cube-face shadow"/><div className="cube-face bottom"/>
            <div className="cube-face top"/><div className="cube-face left"/>
            <div className="cube-face right"/><div className="cube-face back"/>
            <div className="cube-face front"/>
          </div></div></div>
          <h2 className="loader-title">Crunching the Numbers</h2>
          <p className="loader-text">{messages[loadingStep]}</p>
          <div className="loader-bar-container">
            <div className="loader-bar-fill" style={{ width: `${((loadingStep+1)/messages.length)*100}%` }}/>
          </div>
        </div>
      </div>
    );
  }

  // ── RESULTS ──────────────────────────────────────────────────────────────────
  if (result) {
    const displaySims = scenarioResult ? scenarioResult.simulations : result;
    const isScenario = !!scenarioResult;

    return (
      <div className="sim-page">
        <div className="bg-gradient-mesh"/>
        <header className="sim-header glass-nav">
          <div className="sim-logo"><div className="sim-logo-icon">🔮</div>FINEXO · <span>Future Simulator</span></div>
          <button className="sim-back-btn hover-glow" onClick={() => { setResult(null); setScenarioResult(null); setActiveScenario(null); }}>← Recalculate</button>
        </header>

        <main className="sim-dashboard slide-up">

          {/* Hero */}
          <div className="results-hero glass-panel">
            <div className="hero-content">
              <h2 className="sim-title gradient-text">Your Alternate Futures</h2>
              <p className="sim-subtitle">10,000 Monte Carlo paths × Logistic Regression × MVO Allocation</p>
            </div>
          </div>

          {/* Scenario Panel */}
          <div className="scenario-panel glass-panel">
            <div className="scenario-header">
              <div>
                <h3 className="scenario-title">🔬 Section 10: Scenario Simulation</h3>
                <p className="scenario-sub">Test "What If" — results update instantly for all goals</p>
              </div>
              <button className={`btn-custom-scenario ${showCustom ? 'active' : ''}`} onClick={() => setShowCustom(s => !s)}>
                🎛️ Custom Scenario
              </button>
            </div>

            <div className="scenario-presets">
              {PRESET_SCENARIOS.map(sc => (
                <button key={sc.label} className={`scenario-chip ${activeScenario === sc.label && !scenarioResult?.custom ? 'active-chip' : ''}`}
                  onClick={() => runScenario(sc.overrides, sc.label)} disabled={scenarioLoading}>
                  {sc.label}
                </button>
              ))}
              {activeScenario && (
                <button className="scenario-chip reset-chip" onClick={() => { setScenarioResult(null); setActiveScenario(null); }}>
                  ✕ Reset to Base
                </button>
              )}
            </div>

            {showCustom && (
              <div className="custom-scenario-form">
                <div className="custom-row">
                  <label>Inflation Δ (%)</label>
                  <input type="number" step="0.5" value={customScenario.inflation_delta * 100}
                    onChange={e => setCustomScenario(s => ({ ...s, inflation_delta: e.target.value / 100 }))} />
                </div>
                <div className="custom-row">
                  <label>Return Δ (%)</label>
                  <input type="number" step="0.5" value={customScenario.return_delta * 100}
                    onChange={e => setCustomScenario(s => ({ ...s, return_delta: e.target.value / 100 }))} />
                </div>
                <div className="custom-row">
                  <label>Monthly SIP Δ (₹)</label>
                  <input type="number" step="500" value={customScenario.contribution_delta}
                    onChange={e => setCustomScenario(s => ({ ...s, contribution_delta: parseFloat(e.target.value) }))} />
                </div>
                <button className="btn-primary" style={{ marginTop: '0.5rem' }}
                  onClick={() => runScenario(customScenario, 'Custom')}>
                  ⚡ Run Custom Scenario
                </button>
              </div>
            )}

            {scenarioLoading && <p className="scenario-loading">Simulating scenario…</p>}

            {isScenario && scenarioResult?.scenario && (
              <div className="scenario-active-badge">
                <span className="badge-icon">🔬</span>
                <span>Active: <strong>{activeScenario}</strong></span>
                {scenarioResult.scenario.inflation_delta !== 0 && <span className="badge-tag">Inflation {scenarioResult.scenario.inflation_delta > 0 ? '+' : ''}{(scenarioResult.scenario.inflation_delta*100).toFixed(1)}%</span>}
                {scenarioResult.scenario.return_delta !== 0 && <span className="badge-tag">Returns {scenarioResult.scenario.return_delta > 0 ? '+' : ''}{(scenarioResult.scenario.return_delta*100).toFixed(1)}%</span>}
                {scenarioResult.scenario.contribution_delta !== 0 && <span className="badge-tag">SIP {scenarioResult.scenario.contribution_delta > 0 ? '+' : ''}₹{fmt(scenarioResult.scenario.contribution_delta)}</span>}
              </div>
            )}
          </div>

          {/* Goal Cards */}
          <div className="results-grid">
            {displaySims.map((res, i) => {
              const prob = res.final_probability ?? res.health_adjusted_probability ?? 0;
              const baseProb = result[i]?.final_probability ?? 0;
              const delta = isScenario ? prob - baseProb : null;
              const color = prob >= 0.75 ? '#4caf8e' : prob >= 0.50 ? '#f59e0b' : '#ef4444';

              return (
                <div key={i} className="result-card glass-card pop-in" style={{ animationDelay: `${i*0.12}s` }}>
                  {/* Card header */}
                  <div className="res-header">
                    <h3 className="res-card-title">
                      {res.goal_name.toLowerCase().includes('home') ? '🏡' :
                       res.goal_name.toLowerCase().includes('retire') ? '🌴' :
                       res.goal_name.toLowerCase().includes('child') || res.goal_name.toLowerCase().includes('educat') ? '🎓' : '🎯'} {res.goal_name}
                    </h3>
                    <div className="res-status-pill" style={{ background: `${color}20`, color, border: `1px solid ${color}50` }}>
                      {res.feasibility || res.status}
                    </div>
                  </div>

                  {/* Probability rings */}
                  <div className="prob-rings">
                    <ProbabilityRing value={res.mc_probability ?? res.base_mc_probability ?? 0} color="#4c9af2" label="Monte Carlo" />
                    <ProbabilityRing value={res.logistic_probability ?? res.health_adjusted_probability ?? 0} color="#f59e0b" label="Logistic" />
                    <ProbabilityRing value={prob} color={color} label="Final Blend" />
                  </div>

                  {isScenario && delta !== null && (
                    <div className={`delta-badge ${delta >= 0 ? 'delta-up' : 'delta-down'}`}>
                      {delta >= 0 ? '▲' : '▼'} {Math.abs(delta * 100).toFixed(1)}% vs base scenario
                    </div>
                  )}

                  {/* Financial stats */}
                  <div className="res-stats-grid">
                    <div className="res-stat-item">
                      <span className="res-stat-label">Inflation-Adj Target</span>
                      <span className="res-stat-val accent">₹{fmt(res.future_target_adjusted_for_inflation)}</span>
                    </div>
                    <div className="res-stat-item">
                      <span className="res-stat-label">Required SIP</span>
                      <span className="res-stat-val">₹{fmt(res.required_monthly_sip)}/mo</span>
                    </div>
                    <div className="res-stat-item">
                      <span className="res-stat-label">Effective SIP (ISS-adjusted)</span>
                      <span className="res-stat-val muted">₹{fmt(res.effective_sip ?? res.required_monthly_sip)}/mo</span>
                    </div>
                    <div className="res-stat-item">
                      <span className="res-stat-label">Savings Sufficiency (SSR)</span>
                      <span className={`res-stat-val ${(res.savings_sufficiency_ratio ?? 0) >= 1 ? 'text-green' : 'text-red'}`}>
                        {(res.savings_sufficiency_ratio ?? 0).toFixed(2)} {(res.savings_sufficiency_ratio ?? 0) >= 1 ? '✓ Sufficient' : '✗ Gap'}
                      </span>
                    </div>
                    {(res.goal_gap ?? 0) > 0 && (
                      <div className="res-stat-item full-span">
                        <span className="res-stat-label">Monthly Gap to Bridge</span>
                        <span className="res-stat-val text-red">₹{fmt(res.goal_gap)}/mo shortfall</span>
                      </div>
                    )}
                  </div>

                  {/* Optimal Allocation */}
                  {res.optimal_allocation && (
                    <div className="alloc-section">
                      <p className="alloc-title">📊 Optimal Allocation for this Goal</p>
                      <p className="alloc-rule">{res.optimal_allocation.equity_rule}</p>
                      <AllocationBar alloc={res.optimal_allocation} />
                    </div>
                  )}

                  {/* XAI Inputs */}
                  {res.logistic_inputs && (
                    <details className="xai-details">
                      <summary>🔍 Explainability — Why this probability?</summary>
                      <div className="xai-grid">
                        {Object.entries(res.logistic_inputs).filter(([k]) => k !== 'z_score').map(([k, v]) => (
                          <div key={k} className="xai-item">
                            <span>{k.replace(/_/g, ' ')}</span>
                            <div className="xai-bar-track"><div className="xai-bar-fill" style={{ width: `${Math.min(100, Math.max(0, v)*100)}%` }}/></div>
                            <span>{typeof v === 'number' ? v.toFixed(2) : v}</span>
                          </div>
                        ))}
                        <div className="xai-item xai-z">
                          <span>Z-score (logit)</span><span style={{ color: '#f26622' }}>{res.logistic_inputs.z_score?.toFixed(3)}</span>
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  // ── INPUT FORM ────────────────────────────────────────────────────────────────
  return (
    <div className="sim-page">
      <div className="bg-gradient-mesh"/>
      <header className="sim-header glass-nav">
        <Link to="/" className="sim-logo" style={{ textDecoration: 'none', color: '#fff' }}>
          <div className="sim-logo-icon">🔮</div>
          FINEXO · <span>Future Simulator</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          {user && (
            <div style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8', fontSize: '0.8rem', fontWeight: 600, padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
              <span>👤 {user.name}</span>
            </div>
          )}
          <Link to="/" className="sim-back-btn hover-glow">← Back to Hub</Link>
        </div>
      </header>

      <div className="sim-container slide-up">
        {/* Autofill Notification */}
        {isAutofilled && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.82rem', fontWeight: 600, padding: '0.6rem 1.2rem', borderRadius: '100px', marginBottom: '1.5rem', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)' }}>
            <span>✨ Simulation parameters restored from your saved profile. Adjust any goal anytime.</span>
          </div>
        )}

        {/* 1-Click Goal Presets */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', width: '100%' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ⚡ 1-Click Goal Portfolio Presets:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.6rem' }}>
              <button
                type="button"
                style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f1f5f9', fontSize: '0.82rem', fontWeight: 600, padding: '0.5rem 0.9rem', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={() => applyGoalPreset([
                  { name: 'Early FIRE Retirement', target_amount_today: 40000000, years_to_goal: 15, inflation_rate: 0.06 },
                  { name: 'Child Global College', target_amount_today: 8000000, years_to_goal: 10, inflation_rate: 0.08 }
                ])}
              >
                🏝️ FIRE + Child Education
              </button>
              <button
                type="button"
                style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f1f5f9', fontSize: '0.82rem', fontWeight: 600, padding: '0.5rem 0.9rem', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={() => applyGoalPreset([
                  { name: 'Villa Purchase in Bangalore', target_amount_today: 18000000, years_to_goal: 7, inflation_rate: 0.07 },
                  { name: 'Luxury EV Car', target_amount_today: 3500000, years_to_goal: 3, inflation_rate: 0.05 }
                ])}
              >
                🏡 Dream Home & Luxury EV
              </button>
              <button
                type="button"
                style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f1f5f9', fontSize: '0.82rem', fontWeight: 600, padding: '0.5rem 0.9rem', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={() => applyGoalPreset([
                  { name: 'Comfortable Retirement', target_amount_today: 60000000, years_to_goal: 25, inflation_rate: 0.06 },
                  { name: 'Sabbatical / World Tour', target_amount_today: 2500000, years_to_goal: 4, inflation_rate: 0.06 }
                ])}
              >
                🌍 Global Tour + Retirement
              </button>
            </div>
          </div>
        )}

        <div className="sim-steps-container">
          <div className="progress-line" style={{ width: step === 0 ? '50%' : '100%' }}/>
          <div className="sim-steps">
            <div className={`sim-step ${step === 0 ? 'active' : ''} ${step > 0 ? 'completed' : ''}`} onClick={() => setStep(0)}>
              <span className="step-num">1</span> Set Milestones
            </div>
            <div className={`sim-step ${step === 1 ? 'active' : ''}`} onClick={() => setStep(1)}>
              <span className="step-num">2</span> Financial Profile
            </div>
          </div>
        </div>

        <div className="sim-card glass-panel main-wizard">
          {step === 0 ? (
            <div className="goal-editor fade-in">
              <div className="section-header">
                <div>
                  <h2 className="gradient-text">Design Your Life Milestones</h2>
                  <p className="section-desc">What does your ideal future look like? Add each goal.</p>
                </div>
                <button className="btn-add pulse-btn" onClick={addGoal}>+ Add Goal</button>
              </div>
              <div className="goal-list">
                {goals.map((g, index) => (
                  <div key={g.id} className="goal-item stagger-in" style={{ animationDelay: `${index*0.1}s` }}>
                    <div className="goal-row">
                      <div className="goal-icon-picker">
                        {g.name.toLowerCase().includes('home') ? '🏡' :
                         g.name.toLowerCase().includes('retire') ? '🌴' :
                         g.name.toLowerCase().includes('car') ? '🚘' :
                         g.name.toLowerCase().includes('child') || g.name.toLowerCase().includes('educat') ? '🎓' : '🎯'}
                      </div>
                      <input className="input-name" value={g.name} onChange={e => updateGoalName(g.id, e.target.value)} placeholder="e.g., Buy Home in Mumbai" />
                      <button className="btn-remove hover-red" onClick={() => removeGoal(g.id)}>✕</button>
                    </div>
                    <div className="goal-inputs">
                      <div className="field modern-field">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label>Cost Today (₹)</label>
                          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#ec4899' }}>
                            {g.target_amount_today >= 10000000 
                              ? `₹${(g.target_amount_today / 10000000).toFixed(2)} Cr` 
                              : `₹${(g.target_amount_today / 100000).toFixed(2)} L`}
                          </span>
                        </div>
                        <div className="input-prefix"><span>₹</span>
                          <input type="number" value={g.target_amount_today} onChange={e => updateGoal(g.id, 'target_amount_today', e.target.value)} />
                        </div>
                        <input
                          type="range"
                          min="500000"
                          max="100000000"
                          step="500000"
                          value={g.target_amount_today}
                          onChange={e => updateGoal(g.id, 'target_amount_today', e.target.value)}
                          className="adv-range-slider"
                          style={{ accentColor: '#ec4899', marginTop: '6px' }}
                        />
                      </div>
                      <div className="field modern-field">
                        <label>Years Away: <strong>{g.years_to_goal} yrs</strong></label>
                        <div className="input-prefix"><span>⌛</span>
                          <input type="number" value={g.years_to_goal} onChange={e => updateGoal(g.id, 'years_to_goal', e.target.value)} />
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="40"
                          step="1"
                          value={g.years_to_goal}
                          onChange={e => updateGoal(g.id, 'years_to_goal', e.target.value)}
                          className="adv-range-slider"
                          style={{ accentColor: '#ec4899', marginTop: '6px' }}
                        />
                      </div>
                      <div className="field modern-field">
                        <label>Inflation: <strong>{(g.inflation_rate * 100).toFixed(1)}%</strong></label>
                        <div className="input-prefix"><span>%</span>
                          <input type="number" step="0.5" value={(g.inflation_rate * 100).toFixed(1)} onChange={e => updateGoal(g.id, 'inflation_rate', e.target.value / 100)} />
                        </div>
                        <input
                          type="range"
                          min="0.02"
                          max="0.15"
                          step="0.005"
                          value={g.inflation_rate}
                          onChange={e => updateGoal(g.id, 'inflation_rate', e.target.value)}
                          className="adv-range-slider"
                          style={{ accentColor: '#ec4899', marginTop: '6px' }}
                        />
                      </div>
                    </div>

                    {/* Live Inflated Target Cost Preview Box */}
                    <div style={{ marginTop: '0.8rem', background: 'rgba(236, 72, 153, 0.08)', border: '1px solid rgba(236, 72, 153, 0.25)', borderRadius: '10px', padding: '0.6rem 0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                      <span style={{ color: '#94a3b8' }}>Estimated Future Target Cost (Inflation Adjusted):</span>
                      <strong style={{ color: '#ec4899', fontFamily: 'Outfit, sans-serif', fontSize: '0.95rem' }}>
                        {(() => {
                          const fv = g.target_amount_today * Math.pow(1 + g.inflation_rate, g.years_to_goal);
                          return fv >= 10000000 ? `₹${(fv / 10000000).toFixed(2)} Cr` : `₹${Math.round(fv / 100000).toLocaleString('en-IN')} Lakhs`;
                        })()}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn-primary full next-btn" onClick={() => setStep(1)}>
                Lock Milestones & Continue →
              </button>
            </div>
          ) : (
            <div className="health-editor fade-in">
              <div className="section-header">
                <div>
                  <h2 className="gradient-text">Your Financial Profile</h2>
                  <p className="section-desc">These inputs drive the probability engine, MVO allocation, and scenario simulations.</p>
                </div>
              </div>

              <div className="form-grid modern-grid">
                {/* Row 1 */}
                <div className="field modern-field highlight-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label>Current Corpus (₹)</label>
                    <span style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: 700 }}>
                      ₹{(Number(finData.current_corpus) / 100000).toFixed(1)} Lakhs
                    </span>
                  </div>
                  <div className="input-prefix"><span>₹</span>
                    <input type="number" value={finData.current_corpus} onChange={e => setFinData({...finData, current_corpus: e.target.value})} />
                  </div>
                  <input
                    type="range" min="0" max="20000000" step="100000" value={finData.current_corpus}
                    onChange={e => setFinData({...finData, current_corpus: e.target.value})}
                    className="adv-range-slider" style={{ accentColor: '#3b82f6', marginTop: '6px' }}
                  />
                </div>
                <div className="field modern-field highlight-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label>Monthly SIP (₹)</label>
                    <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700 }}>
                      ₹{(Number(finData.monthly_sip) / 1000).toFixed(0)}k/mo
                    </span>
                  </div>
                  <div className="input-prefix"><span>₹</span>
                    <input type="number" value={finData.monthly_sip} onChange={e => setFinData({...finData, monthly_sip: e.target.value})} />
                  </div>
                  <input
                    type="range" min="0" max="200000" step="5000" value={finData.monthly_sip}
                    onChange={e => setFinData({...finData, monthly_sip: e.target.value})}
                    className="adv-range-slider" style={{ accentColor: '#10b981', marginTop: '6px' }}
                  />
                </div>

                {/* Row 2 */}
                <div className="field modern-field">
                  <label>Age: {finData.age} yrs</label>
                  <div className="input-prefix"><span>👤</span>
                    <input type="number" min="18" max="80" value={finData.age} onChange={e => setFinData({...finData, age: e.target.value})} />
                  </div>
                  <input
                    type="range" min="18" max="75" step="1" value={finData.age}
                    onChange={e => setFinData({...finData, age: e.target.value})}
                    className="adv-range-slider" style={{ marginTop: '6px' }}
                  />
                </div>
                <div className="field modern-field">
                  <label>Expected Annual Return: {(finData.expected_return * 100).toFixed(1)}%</label>
                  <div className="input-prefix"><span>%</span>
                    <input type="number" step="0.5" value={(finData.expected_return * 100).toFixed(1)} onChange={e => setFinData({...finData, expected_return: e.target.value / 100})} />
                  </div>
                  <input
                    type="range" min="0.05" max="0.25" step="0.005" value={finData.expected_return}
                    onChange={e => setFinData({...finData, expected_return: e.target.value})}
                    className="adv-range-slider" style={{ marginTop: '6px' }}
                  />
                </div>

                {/* Row 3 */}
                <div className="field modern-field">
                  <label>Savings Rate: {(finData.savings_rate * 100).toFixed(0)}%</label>
                  <div className="input-prefix"><span>💰</span>
                    <input type="number" step="1" value={(finData.savings_rate * 100).toFixed(0)} onChange={e => setFinData({...finData, savings_rate: e.target.value / 100})} />
                  </div>
                  <input
                    type="range" min="0.05" max="0.75" step="0.05" value={finData.savings_rate}
                    onChange={e => setFinData({...finData, savings_rate: e.target.value})}
                    className="adv-range-slider" style={{ marginTop: '6px' }}
                  />
                </div>
                <div className="field modern-field">
                  <label>Emergency Coverage: {finData.emergency_coverage} months</label>
                  <div className="input-prefix"><span>🛡️</span>
                    <input type="number" step="0.5" value={finData.emergency_coverage} onChange={e => setFinData({...finData, emergency_coverage: e.target.value})} />
                  </div>
                  <input
                    type="range" min="1" max="12" step="0.5" value={finData.emergency_coverage}
                    onChange={e => setFinData({...finData, emergency_coverage: e.target.value})}
                    className="adv-range-slider" style={{ marginTop: '6px' }}
                  />
                </div>

                {/* Risk Profile */}
                <div className="field modern-field full-width">
                  <label>Risk Profile</label>
                  <div className="risk-toggle">
                    {RISK_PROFILES.map(rp => (
                      <button key={rp} className={`risk-btn ${finData.risk_profile === rp ? 'risk-active' : ''}`}
                        onClick={() => setFinData({...finData, risk_profile: rp})}>
                        {rp === 'Conservative' ? '🛡️' : rp === 'Moderate' ? '⚖️' : '🚀'} {rp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ISS Slider */}
                <div className="field slider-field full-width">
                  <div className="slider-header">
                    <label>Income Stability Score (ISS)</label>
                    <span className="slider-val">{(finData.user_iss * 10).toFixed(0)}/10</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.1" value={finData.user_iss} onChange={e => setFinData({...finData, user_iss: e.target.value})} className="styled-slider blue-slider" />
                  <div className="range-labels"><span>Volatile (Gig)</span><span>Stable (Govt/MNC)</span></div>
                </div>

                {/* Fragility Slider */}
                <div className="field slider-field full-width">
                  <div className="slider-header">
                    <label>Financial Fragility</label>
                    <span className="slider-val">{(finData.user_fragility * 10).toFixed(0)}/10</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.1" value={finData.user_fragility} onChange={e => setFinData({...finData, user_fragility: e.target.value})} className="styled-slider red-slider" />
                  <div className="range-labels"><span>Resilient (Zero Debt)</span><span>Fragile (High Debt)</span></div>
                </div>
              </div>

              <div className="actions mt-3">
                <button className="btn-secondary" onClick={() => setStep(0)}>← Back</button>
                <button className="btn-primary run-sim-btn" onClick={runSimulation}>
                  <span className="btn-icon">⚡</span> Ignite 10,000 Timelines
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
