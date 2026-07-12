import React, { useState, useEffect } from 'react';
import './index.css';

const floatingIcons = [
  { id: 1, icon: "₿", top: "20%", left: "15%", delay: "0s" },
  { id: 2, icon: "Ξ", top: "60%", left: "10%", delay: "1s" },
  { id: 3, icon: "₮", top: "30%", left: "85%", delay: "2s" },
  { id: 4, icon: "📈", top: "70%", left: "80%", delay: "1.5s" },
  { id: 5, icon: "🏦", top: "15%", left: "50%", delay: "0.5s" },
];

// Default payloads for each engine (used when clicking "Initialize Engine")
const ENGINE_DEFAULTS = {
  "financial-advisor": {
    endpoint: "http://localhost:8000/api/advisor",
    payload: {
      monthly_income: 80000,
      monthly_expenses: 30000,
      total_emis: 10000,
      total_assets: 500000,
      total_liabilities: 200000,
      current_investments: 150000,
      emergency_fund: 90000,
      age: 32
    }
  },
  "tax-planning": {
    endpoint: "http://localhost:8000/api/tax",
    payload: {
      annual_income: 1200000,
      age: 32,
      current_80c: 100000,
      current_80d: 15000,
      current_nps: 30000,
      hra_exemption: 60000,
      home_loan_interest: 150000,
      education_loan_interest: 0
    }
  },
  "life-goal": {
    endpoint: "http://localhost:8000/api/simulator",
    payload: {
      goals: [
        { name: "Retirement", target_amount_today: 5000000, years_to_goal: 25, inflation_rate: 0.06 },
        { name: "Child Education", target_amount_today: 2000000, years_to_goal: 15, inflation_rate: 0.08 }
      ],
      current_corpus: 300000,
      monthly_sip: 15000,
      user_iss: 0.8,
      user_fragility: 0.3
    }
  },
  "portfolio-growth": {
    endpoint: "http://localhost:8000/api/advisor",
    payload: {
      monthly_income: 120000,
      monthly_expenses: 40000,
      total_emis: 5000,
      total_assets: 1500000,
      total_liabilities: 100000,
      current_investments: 800000,
      emergency_fund: 240000,
      age: 35
    }
  },
  "irregular-income": {
    endpoint: "http://localhost:8000/api/advisor",
    payload: {
      monthly_income: 60000,
      monthly_expenses: 35000,
      total_emis: 8000,
      total_assets: 200000,
      total_liabilities: 150000,
      current_investments: 50000,
      emergency_fund: 30000,
      age: 28
    }
  },
  "chatbot": {
    endpoint: "http://localhost:8000/api/advisor",
    payload: {
      monthly_income: 70000,
      monthly_expenses: 28000,
      total_emis: 12000,
      total_assets: 400000,
      total_liabilities: 180000,
      current_investments: 100000,
      emergency_fund: 60000,
      age: 30
    }
  }
};

function formatResultValue(val) {
  if (typeof val === 'number') return val.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  return String(val);
}

function ResultDisplay({ data, depth = 0 }) {
  if (data === null || data === undefined) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  if (Array.isArray(data)) {
    return (
      <div style={{ marginLeft: depth * 12 }}>
        {data.map((item, i) => (
          <div key={i} style={{ marginBottom: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <ResultDisplay data={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }
  if (typeof data === 'object') {
    return (
      <div style={{ marginLeft: depth * 12 }}>
        {Object.entries(data).map(([key, val]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'capitalize', minWidth: '140px' }}>
              {key.replace(/_/g, ' ')}
            </span>
            <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.9rem', textAlign: 'right', flex: 1 }}>
              {typeof val === 'object' ? <ResultDisplay data={val} depth={depth + 1} /> : formatResultValue(val)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return <span style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>{formatResultValue(data)}</span>;
}

function App() {
  const [engines, setEngines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEngine, setSelectedEngine] = useState(null);
  const [engineResult, setEngineResult] = useState(null);
  const [engineLoading, setEngineLoading] = useState(false);
  const [engineError, setEngineError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetch('http://localhost:5000/api/engines')
      .then(res => res.json())
      .then(data => {
        setEngines(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching engines:", err);
        setLoading(false);
      });
  }, []);

  const handleEngineClick = (engine) => {
    if (engine.id === 'financial-advisor') {
      window.open('/advisor', '_blank');
      return;
    }
    if (engine.id === 'tax-planning') {
      window.open('/tax', '_blank');
      return;
    }
    if (engine.id === 'life-goal') {
      window.open('/simulator', '_blank');
      return;
    }
    setSelectedEngine(engine);
    setEngineResult(null);
    setEngineError(null);
  };

  const closeModal = () => {
    setSelectedEngine(null);
    setEngineResult(null);
    setEngineError(null);
    setEngineLoading(false);
  };

  const handleInitializeEngine = async () => {
    if (!selectedEngine) return;
    const config = ENGINE_DEFAULTS[selectedEngine.id];
    if (!config) {
      setEngineError("No configuration found for this engine.");
      return;
    }

    setEngineLoading(true);
    setEngineResult(null);
    setEngineError(null);

    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      const result = await response.json();
      setEngineResult(result);
    } catch (err) {
      console.error("Engine initialization error:", err);
      setEngineError(
        err.message.includes('fetch')
          ? "⚠️ Could not reach the Python backend. Make sure it is running on port 8000 (`uvicorn main:app --reload`)."
          : `⚠️ ${err.message}`
      );
    } finally {
      setEngineLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Background visual effects */}
      <div className="background-effects">
        <div className="glow-orb"></div>
        <div className="concentric-circles">
          <div className="circle"></div>
          <div className="circle"></div>
          <div className="circle"></div>
          <div className="circle"></div>
          <div className="circle"></div>
          <div className="circle"></div>
          <div className="circle"></div>
        </div>
        
        {floatingIcons.map(item => (
          <div 
            key={item.id} 
            className="floating-icon" 
            style={{ top: item.top, left: item.left, animationDelay: item.delay }}
          >
            {item.icon}
          </div>
        ))}
      </div>

      {/* Navigation */}
      <nav className="navbar">
        <div className="logo-container">
          <div className="logo-icon">F</div>
          FINEXO
        </div>
        <div className="nav-links">
          <a href="#" className="active" onClick={(e) => { e.preventDefault(); window.scrollTo({top: 0, behavior: 'smooth'}); }}>Home</a>
          <a href="#ecosystem" onClick={(e) => { e.preventDefault(); document.getElementById('ecosystem').scrollIntoView({ behavior: 'smooth' }); }}>Ecosystem</a>
          <a href="#" onClick={(e) => { e.preventDefault(); alert("Performance analytics module coming soon!"); }}>Performance</a>
          <a href="#" onClick={(e) => { e.preventDefault(); alert("Premium membership features are locked for guest users."); }}>Membership</a>
        </div>
        <button className="nav-action" onClick={(e) => {
          e.target.innerText = "Wallet Connected ✅";
          e.target.style.background = "var(--green)";
          e.target.style.color = "#fff";
        }}>Connect Wallet</button>
      </nav>

      {/* Hero */}
      <section className="hero-section">
        <div className="hero-badge">✨ Revolutionizing AI Finance</div>
        <h1 className="hero-title">
          The Future of <span>Digital Wealth</span>
        </h1>
        <p className="hero-subtitle">
          Explore real-time insights, groundbreaking innovations, and the latest trends in personal finance—all powered by an intelligent ecosystem.
        </p>
        <button className="cta-button" onClick={() => document.getElementById('ecosystem').scrollIntoView({ behavior: 'smooth' })}>
          Explore Ecosystem
          <div className="icon-wrapper">→</div>
        </button>
      </section>

      {/* Dashboard / Ecosystem */}
      <section id="ecosystem" className="dashboard-section">
        <div className="dashboard-header">
          <h2 className="dashboard-title">
            <span>Our AI Engines</span>
            <span style={{ fontSize: '1rem', color: 'var(--accent-primary)', background: 'rgba(242, 102, 34, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '10px' }}>PRO</span>
          </h2>
          <div className="dashboard-tabs">
            <div className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All Apps</div>
            <div className={`tab ${activeTab === 'favorites' ? 'active' : ''}`} onClick={() => setActiveTab('favorites')}>Favorites</div>
            <div className={`tab ${activeTab === 'recent' ? 'active' : ''}`} onClick={() => setActiveTab('recent')}>Recent</div>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner"></div>
        ) : (
          <div className="engines-grid">
            {engines
              .filter(engine => activeTab === 'all' || (activeTab === 'favorites' && ['financial-advisor', 'tax-planning'].includes(engine.id)) || (activeTab === 'recent' && ['life-goal'].includes(engine.id)))
              .map((engine) => (
              <div key={engine.id} className="engine-card" onClick={() => handleEngineClick(engine)}>
                <div className="card-header">
                  <div className="card-icon">{engine.icon}</div>
                  <div className="status-badge">
                    <span className="status-dot"></span>
                    {engine.status}
                  </div>
                </div>
                <div className="card-content">
                  <h3 className="card-title">{engine.name}</h3>
                  <p className="card-desc">{engine.description}</p>
                </div>
                <div className="card-footer">
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>AI Powered</div>
                  <div className="card-action">
                    Launch <i style={{ fontStyle: 'normal' }}>→</i>
                  </div>
                </div>
              </div>
            ))}
            {engines.filter(engine => activeTab === 'all' || (activeTab === 'favorites' && ['financial-advisor', 'tax-planning'].includes(engine.id)) || (activeTab === 'recent' && ['life-goal'].includes(engine.id))).length === 0 && (
              <div style={{color: 'var(--text-muted)', gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 0', background: 'rgba(255,255,255,0.02)', borderRadius: '12px'}}>
                No apps found in this category.
              </div>
            )}
          </div>
        )}
      </section>

      {/* Modal for Engine Details */}
      <div className={`modal-overlay ${selectedEngine ? 'active' : ''}`} onClick={closeModal}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={closeModal}>✕</button>
          {selectedEngine && (
            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card-icon" style={{ width: '80px', height: '80px', fontSize: '2.5rem' }}>
                  {selectedEngine.icon}
                </div>
                <div>
                  <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{selectedEngine.name}</h2>
                  <div className="status-badge" style={{ display: 'inline-flex' }}>
                    <span className="status-dot"></span> System Online
                  </div>
                </div>
              </div>
              
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ color: 'var(--accent-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>⚙️</span> Dashboard Interface
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '2rem' }}>
                  {selectedEngine.description}
                </p>
                
                {/* Result / Loading / Error area */}
                {engineLoading && (
                  <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
                    <div className="loading-spinner" style={{ width: '40px', height: '40px' }}></div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Running engine analysis...</span>
                  </div>
                )}

                {engineError && !engineLoading && (
                  <div style={{ padding: '1rem 1.5rem', background: 'rgba(255, 80, 80, 0.1)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: '12px', color: '#ff8888', fontSize: '0.9rem', lineHeight: '1.6' }}>
                    {engineError}
                  </div>
                )}

                {engineResult && !engineLoading && (
                  <div style={{ maxHeight: '380px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1rem' }}>✅</span>
                      <span style={{ color: '#4caf8e', fontWeight: '600', fontSize: '0.95rem' }}>Engine Initialized Successfully</span>
                    </div>
                    <ResultDisplay data={engineResult} />
                  </div>
                )}

                {!engineResult && !engineLoading && !engineError && (
                  <div style={{ height: '120px', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '2rem' }}>⚡</span>
                    <span>Click "Initialize Engine" to run a live analysis</span>
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', gap: '1rem' }}>
                {engineResult && (
                  <button
                    onClick={() => { setEngineResult(null); setEngineError(null); }}
                    style={{ padding: '0.8rem 1.5rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    Reset
                  </button>
                )}
                <button
                  className="cta-button"
                  style={{ padding: '0.8rem 2rem', opacity: engineLoading ? 0.6 : 1, cursor: engineLoading ? 'not-allowed' : 'pointer' }}
                  onClick={handleInitializeEngine}
                  disabled={engineLoading}
                >
                  {engineLoading ? 'Initializing...' : 'Initialize Engine'}
                  <div className="icon-wrapper">{engineLoading ? '⏳' : '→'}</div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
