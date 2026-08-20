import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [hoveredEngine, setHoveredEngine] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    setTimeout(() => setHeroVisible(true), 100);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleEngineClick = (engine) => {
    navigate(engine.href);
  };

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

        <button className="v-nav__cta" onClick={() => document.getElementById('engines').scrollIntoView({ behavior: 'smooth' })}>
          Get Started
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </nav>

      {/* ── Hero Section ── */}
      <section className={`v-hero ${heroVisible ? 'v-hero--visible' : ''}`}>

        {/* Announcement pill */}
        <div className="v-hero__pill" style={{ animationDelay: '0.1s' }}>
          <span className="v-hero__pill-dot"></span>
          AI-Powered · Rule-Based · No Black Boxes
        </div>

        {/* Heading */}
        <h1 className="v-hero__title" style={{ animationDelay: '0.2s' }}>
          Your Money,<br />
          <span className="v-hero__title-gradient">Intelligently Managed</span>
        </h1>

        <p className="v-hero__sub" style={{ animationDelay: '0.35s' }}>
          Four specialized AI engines for financial advising, tax optimization,<br />
          life goal simulation, and portfolio management — built for India.
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


        {/* Floating finance metrics mockup */}
        <div className="v-hero__mockup" style={{ animationDelay: '0.4s' }}>
          <div className="v-mockup">
            <div className="v-mockup__header">
              <div className="v-mockup__dots">
                <span></span><span></span><span></span>
              </div>
              <span className="v-mockup__title">Financial Dashboard</span>
            </div>
            <div className="v-mockup__body">
              <div className="v-mockup__row">
                <span className="v-mockup__label">Health Score</span>
                <span className="v-mockup__value green">82 / 100</span>
              </div>
              <div className="v-mockup__row">
                <span className="v-mockup__label">Net Worth</span>
                <span className="v-mockup__value">₹12,40,000</span>
              </div>
              <div className="v-mockup__row">
                <span className="v-mockup__label">Monthly Surplus</span>
                <span className="v-mockup__value green">₹18,500</span>
              </div>
              <div className="v-mockup__row">
                <span className="v-mockup__label">10Y Corpus</span>
                <span className="v-mockup__value gold">₹89.4 L</span>
              </div>
              <div className="v-mockup__bar-section">
                <div className="v-mockup__bar-label">Portfolio Allocation</div>
                <div className="v-mockup__bars">
                  <div className="v-mockup__bar" style={{ width: '55%', background: '#3b82f6' }}><span>Equity 55%</span></div>
                  <div className="v-mockup__bar" style={{ width: '30%', background: '#10b981' }}><span>Debt 30%</span></div>
                  <div className="v-mockup__bar" style={{ width: '15%', background: '#f59e0b' }}><span>Gold 15%</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating info pills */}
          <div className="v-float-pill v-float-pill--1">
            <span className="v-float-pill__icon">📈</span>
            <span>SIP: ₹8,000/mo</span>
          </div>
          <div className="v-float-pill v-float-pill--2">
            <span className="v-float-pill__icon">🛡️</span>
            <span>Emergency: 6.2 mo</span>
          </div>
          <div className="v-float-pill v-float-pill--3">
            <span className="v-float-pill__icon">⚖️</span>
            <span>Tax saved: ₹42,000</span>
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
