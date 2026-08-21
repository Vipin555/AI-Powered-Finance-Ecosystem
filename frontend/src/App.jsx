import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DecryptText } from './components/ui/decrypt-text';
import './index.css';

// ─── Engine definitions (hardcoded so they always show) ───────────────────────
const ENGINES = [
  {
    id: 'financial-advisor',
    name: 'AI Financial Advisor',
    tagline: 'Personal wealth intelligence',
    description: 'Analyze your income, expenses, assets and liabilities. Get your health score, risk tier, emergency plan, and 10-year corpus projection.',
    icon: '🧠',
    color: '#6366f1',
    glow: 'rgba(99, 102, 241, 0.28)',
    href: '/advisor',
    tag: 'Most Used',
    stats: [{ label: 'Metrics Analyzed', value: '40+' }, { label: 'Avg Health Score', value: '74' }],
  },
  {
    id: 'tax-planning',
    name: 'AI Tax Planner',
    tagline: 'Maximize your take-home',
    description: 'Compare Old vs New tax regimes, optimize deductions across 80C, 80D, NPS, HRA, capital gains, and get your exact tax liability.',
    icon: '⚖️',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.25)',
    href: '/tax',
    tag: 'Tax Season',
    stats: [{ label: 'Max Savings', value: '₹2.5L' }, { label: 'Deductions', value: '12 types' }],
  },
  {
    id: 'life-goal',
    name: 'Life Goal Simulator',
    tagline: 'Turn dreams into timelines',
    description: 'Model retirement, education, home purchase and more. Monte Carlo simulation computes your success probability with inflation-adjusted targets.',
    icon: '🎯',
    color: '#ec4899',
    glow: 'rgba(236, 72, 153, 0.25)',
    href: '/simulator',
    tag: 'Planning',
    stats: [{ label: 'Goal Types', value: '10+' }, { label: 'Sim Accuracy', value: '94%' }],
  },
  {
    id: 'portfolio-growth',
    name: 'Portfolio Dashboard',
    tagline: 'Track & rebalance wealth',
    description: 'View your portfolio allocation, ML-based rebalancing recommendations, and expected 5-year returns across equity, debt, gold, and cash.',
    icon: '📊',
    color: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.25)',
    href: '/portfolio',
    tag: 'Investments',
    stats: [{ label: 'Asset Classes', value: '4' }, { label: 'Rebalance AI', value: 'Live' }],
  },
  {
    id: 'irregular-income',
    name: 'Irregular Income Engine',
    tagline: 'Finances for the self-employed',
    description: 'Built for freelancers, gig workers, and business owners. Smooth volatile income, build buffers, and create a stable financial plan from unpredictable earnings.',
    icon: '🌊',
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.25)',
    href: '/irregular-income',
    tag: 'Freelancers',
    stats: [{ label: 'Income Types', value: '5' }, { label: 'Buffer Months', value: '3–6' }],
  },
];

// ─── Animated number counter ──────────────────────────────────────────────────
function AnimatedNumber({ end, suffix = '', prefix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const duration = 1800;
        const startTime = performance.now();
        const animate = (now) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(eased * end));
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
        observer.disconnect();
      }
    }, { threshold: 0.4 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return <span ref={ref}>{prefix}{count.toLocaleString('en-IN')}{suffix}</span>;
}

// ─── 3D Canvas with floating investment symbols ───────────────────────
function Canvas3D() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animFrame;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Floating 3D investment symbols
    const SYMBOLS = ['₹','₹','$','$','€','₿','%','%','NSE','BSE','SIP','TCS','INFY','RELIANCE','NIFTY','GOLD','ETF','NAV','₹₹','▲','▼','MF'];
    const symbols = Array.from({ length: 28 }, (_, idx) => ({
      sym: SYMBOLS[idx % SYMBOLS.length],
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      z: Math.random() * 400 + 100,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.3 - 0.15,
      rotSpeed: (Math.random() - 0.5) * 0.015,
      rot: Math.random() * Math.PI * 2,
      color: ['rgba(99,102,241,','rgba(245,158,11,','rgba(236,72,153,','rgba(6,182,212,','rgba(139,92,246,'][Math.floor(Math.random() * 5)],
      size: Math.random() * 14 + 9,
    }));

    // Small ambient particles
    const particles = Array.from({ length: 90 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.3,
      speed: Math.random() * 0.3 + 0.05,
      angle: Math.random() * Math.PI * 2,
      opacity: Math.random() * 0.45 + 0.08,
      color: '#6366f1',
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.005;

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.022)';
      ctx.lineWidth = 1;
      const gridSpacing = 80;
      for (let x = 0; x < canvas.width; x += gridSpacing) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSpacing) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Draw 3D investment symbols
      symbols.forEach(s => {
        const perspective = 600 / (600 + s.z);
        const displaySize = s.size * perspective;
        const alpha = perspective * 0.55;

        s.x += s.dx;
        s.y += s.dy;
        s.rot += s.rotSpeed;

        if (s.x < -60) s.x = canvas.width + 60;
        if (s.x > canvas.width + 60) s.x = -60;
        if (s.y < -40) s.y = canvas.height + 40;
        if (s.y > canvas.height + 40) s.y = -40;

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.font = `${Math.round(displaySize)}px 'Outfit', monospace`;
        ctx.fillStyle = s.color + alpha.toFixed(2) + ')';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = s.color + (alpha * 0.3).toFixed(2) + ')';
        ctx.fillText(s.sym, 2, 2);
        ctx.fillStyle = s.color + alpha.toFixed(2) + ')';
        ctx.fillText(s.sym, 0, 0);
        ctx.restore();
      });

      // Ambient particles
      particles.forEach(p => {
        p.angle += 0.005;
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed * 0.5 - 0.15;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
        ctx.fill();
      });

      animFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(animFrame); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="canvas-3d" />;
}

// ─── Marquee ticker ────────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  '₹NIFTY 24,823 ▲ +0.42%', 'SENSEX 81,343 ▲ +0.38%', 'GOLD ₹74,320/10g ▲ +0.12%',
  'USD/INR 83.94 ▼ -0.08%', 'REPO RATE 6.50% →', '10Y BOND 7.08% ▲',
  'SGB Apr-2025 ₹8,634 ▲', 'NIFTY BANK 52,480 ▲ +0.55%', 'MIDCAP 150 ▲ +0.61%',
];

function Ticker() {
  return (
    <div className="ticker-wrap">
      <div className="ticker-label">LIVE</div>
      <div className="ticker-track">
        <div className="ticker-inner">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="ticker-item">
              {item}
              <span className="ticker-sep">·</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useAuth } from './context/AuthContext';

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const navigate = useNavigate();
  const { user, isAdmin, logout, savedData } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [hoveredEngine, setHoveredEngine] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    setTimeout(() => setHeroVisible(true), 100);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const [activeHeroTab, setActiveHeroTab] = useState('matrix');
  const [heroSip, setHeroSip] = useState(15000);

  const handleEngineClick = (engine) => {
    if (engine && engine.href) {
      navigate(engine.href);
    }
  };

  const calc10YCorpus = (sip) => {
    const monthlyRate = 0.12 / 12;
    const months = 120;
    const fvSip = sip * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    const existingGrowth = 1240000 * Math.pow(1.10, 10);
    return ((fvSip + existingGrowth) / 100000).toFixed(1);
  };

  const calcTaxSaved = (sip) => {
    return Math.min(46800, Math.round(sip * 12 * 0.25)).toLocaleString('en-IN');
  };

  const savedEnginesCount = Object.keys(savedData || {}).length;

  return (
    <div className="app-root">

      {/* ── 3D Canvas Background ── */}
      <Canvas3D />

      {/* ── Live Ticker ── */}
      <Ticker />

      {/* ── Navbar ── */}
      <nav className={`v-nav ${scrolled ? 'v-nav--scrolled' : ''}`}>
        <div className="v-nav__logo">
          <div className="v-nav__logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 17L9 11L13 15L21 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 7H21V14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="v-nav__brand">FINEXO</span>
          <span className="v-nav__badge">AI</span>
        </div>

        <div className="v-nav__links">
          <a href="#" className="v-nav__link" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Home</a>
          <a href="#engines" className="v-nav__link" onClick={e => { e.preventDefault(); document.getElementById('engines').scrollIntoView({ behavior: 'smooth' }); }}>Engines</a>
        </div>

        <div className="v-nav__auth-actions">
          {user ? (
            <div className="v-nav__user-menu">
              {isAdmin && (
                <button className="v-nav__admin-btn" onClick={() => navigate('/admin')}>
                  👑 Admin Panel
                </button>
              )}
              <div className="v-nav__user-profile" title={`Signed in as ${user.email}`}>
                <div className="v-nav__user-avatar">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="v-nav__user-meta">
                  <span className="v-nav__user-name">{user.name}</span>
                  <span className="v-nav__saved-tag">💾 {savedEnginesCount} Engines Synced</span>
                </div>
              </div>
              <button className="v-nav__logout-btn" onClick={logout} title="Sign Out">
                Logout
              </button>
            </div>
          ) : (
            <div className="v-nav__guest-menu">
              <button className="v-nav__login-btn" onClick={() => navigate('/login')}>
                Sign In
              </button>
              <button className="v-nav__cta" onClick={() => navigate('/signup')}>
                Get Started
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className={`v-hero ${heroVisible ? 'v-hero--visible' : ''}`}>

        {/* Announcement pill */}
        <div className="v-hero__pill" style={{ animationDelay: '0.1s' }}>
          <span className="v-hero__pill-dot"></span>
          AI-Powered · Real-Time Optimization · Built for India
        </div>

        {/* Heading */}
        <h1 className="v-hero__title" style={{ animationDelay: '0.2s' }}>
          <DecryptText
            text="Your Money,"
            as="span"
            variant="display"
            trigger="mount"
            stagger={36}
            speed={35}
            retriggerOnHover
          />
          <br />
          <span className="v-hero__title-gradient">
            <DecryptText
              text="Intelligently Managed"
              as="span"
              variant="display"
              trigger="mount"
              startDelay={380}
              stagger={34}
              speed={35}
              retriggerOnHover
            />
          </span>
        </h1>

        <p className="v-hero__sub" style={{ animationDelay: '0.35s' }}>
          Five specialized AI engines for financial advising, tax optimization,<br />
          life goal simulation, portfolio rebalancing, and freelance income planning.
        </p>

        {/* CTA Row */}
        <div className="v-hero__cta-row" style={{ animationDelay: '0.5s' }}>
          <button className="v-btn v-btn--primary" onClick={() => document.getElementById('engines').scrollIntoView({ behavior: 'smooth' })}>
            Explore Engines
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          <button className="v-btn v-btn--ghost" onClick={() => navigate('/advisor')}>
            Try Advisor Free →
          </button>
        </div>


        {/* Interactive AI Wealth Terminal Showcase */}
        <div className="v-hero__mockup-container" style={{ animationDelay: '0.4s' }}>
          
          {/* Top Live Telemetry Ribbon */}
          <div className="v-hero-telemetry-ribbon">
            <div className="v-telemetry-pill">
              <span className="v-telemetry-icon">🛡️</span>
              <span className="v-telemetry-label">Emergency Buffer:</span>
              <span className="v-telemetry-val green">6.2 Mo (Secured)</span>
            </div>

            <div className="v-telemetry-pill">
              <span className="v-telemetry-icon">⚡</span>
              <span className="v-telemetry-label">Tax Alpha Saved:</span>
              <span className="v-telemetry-val gold">₹{calcTaxSaved(heroSip)} / yr</span>
            </div>

            <div className="v-telemetry-pill">
              <span className="v-telemetry-icon">🎯</span>
              <span className="v-telemetry-label">Milestone Confidence:</span>
              <span className="v-telemetry-val green">94.8% on target</span>
            </div>

            <div className="v-telemetry-pill">
              <span className="v-telemetry-icon">📈</span>
              <span className="v-telemetry-label">Sharpe Ratio:</span>
              <span className="v-telemetry-val cyan">2.18 (Optimal)</span>
            </div>
          </div>

          {/* Main Terminal Card */}
          <div className="v-terminal-card">
            {/* Terminal Header */}
            <div className="v-terminal__header">
              <div className="v-terminal__controls">
                <span className="dot dot--red"></span>
                <span className="dot dot--yellow"></span>
                <span className="dot dot--green"></span>
              </div>
              <div className="v-terminal__title">
                <span className="v-terminal__live-pulse"></span>
                <span>FINEXO AI WEALTH ENGINE v2.5</span>
                <span className="v-terminal__latency">12ms · Synced</span>
              </div>
              <div className="v-terminal__status-badge">
                <span className="v-terminal__badge-dot"></span>
                OPTIMIZED
              </div>
            </div>

            {/* Navigation Switcher Tabs */}
            <div className="v-terminal__tabs">
              <button 
                className={`v-tab-btn ${activeHeroTab === 'matrix' ? 'active' : ''}`}
                onClick={() => setActiveHeroTab('matrix')}
              >
                <span>📊</span> Wealth Matrix
              </button>
              <button 
                className={`v-tab-btn ${activeHeroTab === 'allocation' ? 'active' : ''}`}
                onClick={() => setActiveHeroTab('allocation')}
              >
                <span>🥧</span> Asset Allocation
              </button>
              <button 
                className={`v-tab-btn ${activeHeroTab === 'ai' ? 'active' : ''}`}
                onClick={() => setActiveHeroTab('ai')}
              >
                <span>⚡</span> AI Insights
              </button>
            </div>

            {/* Tab 1: Wealth Matrix */}
            {activeHeroTab === 'matrix' && (
              <div className="v-tab-content animate-fade">
                {/* 4 Stat Cards */}
                <div className="v-stats-grid">
                  <div className="v-stat-tile">
                    <div className="v-stat-header">
                      <span className="v-stat-lbl">Health Score</span>
                      <span className="v-stat-tag green">PRIME</span>
                    </div>
                    <div className="v-stat-val green">86<span className="v-stat-subval">/100</span></div>
                    <div className="v-stat-bar-track">
                      <div className="v-stat-bar-fill green-gradient" style={{ width: '86%' }}></div>
                    </div>
                  </div>

                  <div className="v-stat-tile">
                    <div className="v-stat-header">
                      <span className="v-stat-lbl">Net Worth</span>
                      <span className="v-stat-tag cyan">+14.2%</span>
                    </div>
                    <div className="v-stat-val">₹18,40,000</div>
                    <div className="v-stat-hint">Assets: ₹24.2L · Liab: ₹5.8L</div>
                  </div>

                  <div className="v-stat-tile">
                    <div className="v-stat-header">
                      <span className="v-stat-lbl">Monthly Surplus</span>
                      <span className="v-stat-tag indigo">42% Rate</span>
                    </div>
                    <div className="v-stat-val indigo">₹32,500<span className="v-stat-subval">/mo</span></div>
                    <div className="v-stat-hint">Income: ₹78k · Spends: ₹45.5k</div>
                  </div>

                  <div className="v-stat-tile highlight-gold">
                    <div className="v-stat-header">
                      <span className="v-stat-lbl">10Y Corpus Forecast</span>
                      <span className="v-stat-tag gold">12% CAGR</span>
                    </div>
                    <div className="v-stat-val gold">₹{calc10YCorpus(heroSip)} Lakhs</div>
                    <div className="v-stat-hint">Based on ₹{heroSip.toLocaleString('en-IN')}/mo SIP</div>
                  </div>
                </div>

                {/* Interactive SIP Slider */}
                <div className="v-hero-slider-box">
                  <div className="v-slider-top">
                    <div className="v-slider-label">
                      <span className="v-slider-icon">🎛️</span>
                      <span>Live SIP Simulator</span>
                    </div>
                    <span className="v-slider-amount">₹{heroSip.toLocaleString('en-IN')} <small>/ month</small></span>
                  </div>
                  <input 
                    type="range" 
                    min="5000" 
                    max="80000" 
                    step="2500" 
                    value={heroSip} 
                    onChange={(e) => setHeroSip(Number(e.target.value))}
                    className="v-range-slider"
                  />
                  <div className="v-slider-labels">
                    <span>₹5,000/mo</span>
                    <span>₹25,000/mo</span>
                    <span>₹50,000/mo</span>
                    <span>₹80,000/mo</span>
                  </div>
                </div>

                {/* Sparkline Visual */}
                <div className="v-sparkline-wrap">
                  <div className="v-sparkline-header">
                    <span>10-Year Wealth Trajectory</span>
                    <span className="green">Compound Growth + AI Optimization</span>
                  </div>
                  <svg className="v-sparkline-svg" viewBox="0 0 500 70" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45"/>
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0"/>
                      </linearGradient>
                    </defs>
                    <path 
                      d="M 0,65 Q 125,58 250,42 T 500,8 L 500,70 L 0,70 Z" 
                      fill="url(#sparkGrad)" 
                    />
                    <path 
                      d="M 0,65 Q 125,58 250,42 T 500,8" 
                      fill="none" 
                      stroke="#6366f1" 
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            )}

            {/* Tab 2: Asset Allocation */}
            {activeHeroTab === 'allocation' && (
              <div className="v-tab-content animate-fade">
                <div className="v-alloc-section">
                  <div className="v-alloc-top">
                    <span className="v-alloc-title">Optimized Asset Distribution</span>
                    <span className="v-alloc-sharpe">Sharpe Ratio: 2.18 (Superior)</span>
                  </div>

                  {/* Multi-Segment Continuous Bar */}
                  <div className="v-multi-segment-bar">
                    <div className="v-seg seg--equity" style={{ width: '52%' }} title="Equity: 52%">
                      <span>Equity 52%</span>
                    </div>
                    <div className="v-seg seg--debt" style={{ width: '28%' }} title="Debt: 28%">
                      <span>Debt 28%</span>
                    </div>
                    <div className="v-seg seg--gold" style={{ width: '12%' }} title="Gold: 12%">
                      <span>Gold 12%</span>
                    </div>
                    <div className="v-seg seg--cash" style={{ width: '8%' }} title="Cash: 8%">
                      <span>Cash 8%</span>
                    </div>
                  </div>

                  {/* Allocation Details Grid */}
                  <div className="v-alloc-grid">
                    <div className="v-alloc-card">
                      <div className="v-alloc-chip color-blue">Equity (52%)</div>
                      <div className="v-alloc-amt">₹9,56,800</div>
                      <div className="v-alloc-desc">Nifty 50 & Flexicap Index</div>
                    </div>
                    <div className="v-alloc-card">
                      <div className="v-alloc-chip color-green">Debt (28%)</div>
                      <div className="v-alloc-amt">₹5,15,200</div>
                      <div className="v-alloc-desc">G-Sec & High Yield Bonds</div>
                    </div>
                    <div className="v-alloc-card">
                      <div className="v-alloc-chip color-gold">Gold (12%)</div>
                      <div className="v-alloc-amt">₹2,20,800</div>
                      <div className="v-alloc-desc">Sovereign Gold Bonds (SGB)</div>
                    </div>
                    <div className="v-alloc-card">
                      <div className="v-alloc-chip color-purple">Liquid Cash (8%)</div>
                      <div className="v-alloc-amt">₹1,47,200</div>
                      <div className="v-alloc-desc">High Yield Liquid Fund</div>
                    </div>
                  </div>

                  {/* AI Rebalance Alert */}
                  <div className="v-alloc-alert">
                    <span className="v-alert-icon">💡</span>
                    <p className="v-alert-text">
                      <strong>AI Optimizer Note:</strong> Equity allocation is generating strong alpha. Maintain monthly SIP split: <strong>60% Equity / 25% Debt / 15% SGB Gold</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: AI Insights */}
            {activeHeroTab === 'ai' && (
              <div className="v-tab-content animate-fade">
                <div className="v-insights-list">
                  <div className="v-insight-item">
                    <div className="v-insight-badge tag-orange">🔥 Priority 1 · Tax Alpha</div>
                    <h4 className="v-insight-heading">Optimize Old vs New Regime Deduction Split</h4>
                    <p className="v-insight-text">
                      By deploying ₹1.5L in 80C and ₹50k in NPS (80CCD 1B), your Old Regime net tax drops by ₹46,800 compared to default New Regime.
                    </p>
                  </div>

                  <div className="v-insight-item">
                    <div className="v-insight-badge tag-green">🛡️ Priority 2 · Risk Shield</div>
                    <h4 className="v-insight-heading">Emergency Buffer Healthy at 6.2 Months</h4>
                    <p className="v-insight-text">
                      Liquid reserves of ₹2.8L fully cover all essential household outflows + loan EMIs against job transitions or medical emergencies.
                    </p>
                  </div>

                  <div className="v-insight-item">
                    <div className="v-insight-badge tag-indigo">📈 Priority 3 · Goal Accelerator</div>
                    <h4 className="v-insight-heading">10% Annual Step-up Rule</h4>
                    <p className="v-insight-text">
                      Stepping up your monthly SIP by just 10% each salary increment accelerates your ₹1 Crore wealth milestone by <strong>3.4 years</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Terminal Footer */}
            <div className="v-terminal__footer">
              <div className="v-terminal__meta">
                <span className="meta-item">🔒 256-Bit Encrypted</span>
                <span className="meta-sep">·</span>
                <span className="meta-item">⚡ Mean-Variance Optimizer</span>
                <span className="meta-sep">·</span>
                <span className="meta-item">🇮🇳 India Tax FY 2024-26</span>
              </div>
              <button className="v-terminal__action-btn" onClick={() => navigate('/advisor')}>
                Launch Full Advisor →
              </button>
            </div>
          </div>

        </div>
      </section>



      {/* ── Engines Section ── */}
      <section id="engines" className="v-engines">
        <div className="v-section-header">
          <div className="v-section-badge">AI Engines</div>
          <h2 className="v-section-title">Five Engines. One Ecosystem.</h2>
          <p className="v-section-sub">Each engine runs its own optimization model. Click any card to launch it instantly.</p>
        </div>

        <div className="v-engines__grid">
          {ENGINES.map((engine, i) => (
            <div
              key={engine.id}
              className={`v-engine-card ${hoveredEngine === engine.id ? 'v-engine-card--hovered' : ''}`}
              style={{ '--engine-color': engine.color, '--engine-glow': engine.glow, animationDelay: `${i * 0.1}s` }}
              onClick={() => handleEngineClick(engine)}
              onMouseEnter={() => setHoveredEngine(engine.id)}
              onMouseLeave={() => setHoveredEngine(null)}
            >
              {/* Glow top border line */}
              <div className="v-engine-card__glow-line"></div>

              <div className="v-engine-card__top">
                <div className="v-engine-card__icon-wrap">
                  <span className="v-engine-card__icon">{engine.icon}</span>
                </div>
                <span className="v-engine-card__tag">{engine.tag}</span>
              </div>

              <h3 className="v-engine-card__name">{engine.name}</h3>
              <p className="v-engine-card__tagline">{engine.tagline}</p>
              <p className="v-engine-card__desc">{engine.description}</p>

              <div className="v-engine-card__stats">
                {engine.stats.map((s, j) => (
                  <div key={j} className="v-engine-card__stat">
                    <span className="v-engine-card__stat-value">{s.value}</span>
                    <span className="v-engine-card__stat-label">{s.label}</span>
                  </div>
                ))}
              </div>

              <div className="v-engine-card__footer">
                <span className="v-engine-card__launch">
                  Launch Engine
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </span>
              </div>

              {/* Corner accent */}
              <div className="v-engine-card__corner"></div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="v-how">
        <div className="v-section-header">
          <div className="v-section-badge">How It Works</div>
          <h2 className="v-section-title">From Data to Decisions</h2>
        </div>
        <div className="v-how__steps">
          {[
            { step: '01', icon: '📝', title: 'Enter Your Data', desc: 'Provide your income, expenses, assets, liabilities and goals through our guided forms.' },
            { step: '02', icon: '🤖', title: 'AI Processes', desc: 'Our engines run Mean-Variance Optimization, Monte Carlo simulation, and XGBoost predictions in real time.' },
            { step: '03', icon: '📊', title: 'Get Your Report', desc: 'Receive a full dashboard with health scores, action plans, corpus projections, and tax savings.' },
            { step: '04', icon: '🚀', title: 'Take Action', desc: 'Follow prioritized, ranked recommendations to systematically improve your financial health.' },
          ].map((s, i) => (
            <div key={i} className="v-step">
              <div className="v-step__num">{s.step}</div>
              <div className="v-step__icon">{s.icon}</div>
              <h4 className="v-step__title">{s.title}</h4>
              <p className="v-step__desc">{s.desc}</p>
              {i < 3 && <div className="v-step__connector"></div>}
            </div>
          ))}
        </div>
      </section>


      {/* ── PLANITT-style Footer ── */}
      <footer className="v-footer-new">

        {/* Ghost watermark text */}
        <div className="v-footer-new__ghost">FINEXO</div>

        {/* Horizon glow line */}
        <div className="v-footer-new__horizon"></div>

        {/* Market exchange tags */}
        <div className="v-footer-new__markets">
          {[
            { city: 'MUMBAI', ex: 'NSE · BSE', active: true },
            { city: 'NEW YORK', ex: 'NYSE · NASDAQ', active: true },
            { city: 'LONDON', ex: 'LSE · ACTIVE', active: true },
            { city: 'SINGAPORE', ex: 'SGX · ACTIVE', active: true },
            { city: 'HONG KONG', ex: 'HKEX · ACTIVE', active: true },
          ].map((m, i) => (
            <div key={i} className="v-market-tag">
              <span className={`v-market-tag__dot ${m.active ? 'active' : ''}`}></span>
              <div>
                <div className="v-market-tag__city">{m.city}</div>
                <div className="v-market-tag__ex">{m.ex}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tagline */}
        <div className="v-footer-new__tagline-wrap">
          <p className="v-footer-new__tagline">Finance never sleeps.</p>
          <p className="v-footer-new__tagline-accent">Neither does FINEXO.</p>
          <p className="v-footer-new__sub">SEBI-AWARE · AI-POWERED · BUILT FOR INDIA</p>
        </div>

        {/* CTA row */}
        <div className="v-footer-new__cta">
          <button className="v-btn v-btn--primary" onClick={() => navigate('/advisor')}>
            Start Financial Advisor
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          <button className="v-btn v-btn--ghost" onClick={() => navigate('/simulator')}>Goal Simulator →</button>
          <button className="v-btn v-btn--ghost" onClick={() => navigate('/tax')}>Tax Planner →</button>
        </div>

        {/* Bottom bar */}
        <div className="v-footer-new__bottom">
          <div className="v-footer-new__brand">
            <div className="v-nav__logo-icon" style={{ width: 28, height: 28 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M3 17L9 11L13 15L21 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1rem', letterSpacing: '2px' }}>FINEXO</span>
          </div>
          <p className="v-footer-new__disclaimer">
            For educational purposes only · Not financial advice
          </p>
          <div className="v-footer-new__links">
            <span>/advisor</span>
            <span>/tax</span>
            <span>/simulator</span>
            <span>/portfolio</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
