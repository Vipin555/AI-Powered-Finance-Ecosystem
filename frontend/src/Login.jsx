import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './auth.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedUser = await login(email, password);
      if (loggedUser.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail, quickPassword) => {
    setEmail(quickEmail);
    setPassword(quickPassword);
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login(quickEmail, quickPassword);
      if (loggedUser.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Ambient background glow */}
      <div className="auth-glow-top"></div>
      <div className="auth-glow-bottom"></div>

      <nav className="auth-nav">
        <Link to="/" className="auth-nav__logo">
          <div className="auth-nav__logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 17L9 11L13 15L21 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 7H21V14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="auth-nav__brand">FINEXO</span>
          <span className="auth-nav__badge">AI</span>
        </Link>
        <Link to="/" className="auth-nav__back">← Back to Hub</Link>
      </nav>

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-card__header">
            <div className="auth-card__pill">
              <span className="auth-card__pill-dot"></span>
              Secure AI Authentication
            </div>
            <h1 className="auth-card__title">Welcome Back</h1>
            <p className="auth-card__sub">Sign in to access your stored financial models and personalized AI engines.</p>
          </div>

          {/* 1-Click Quick Demo Login Shortcuts */}
          <div className="auth-quick-login">
            <span className="auth-quick-label">⚡ 1-Click Test Access:</span>
            <div className="auth-quick-buttons">
              <button 
                type="button"
                className="auth-quick-btn admin-btn"
                onClick={() => handleQuickLogin('admin@finexo.ai', 'admin123')}
                disabled={loading}
              >
                👑 <strong>Super Admin</strong>
                <small>admin@finexo.ai</small>
              </button>
              <button 
                type="button"
                className="auth-quick-btn user-btn"
                onClick={() => handleQuickLogin('demo@finexo.ai', 'demo123')}
                disabled={loading}
              >
                👤 <strong>Demo User</strong>
                <small>demo@finexo.ai</small>
              </button>
            </div>
          </div>

          <div className="auth-divider">
            <span>or sign in with email</span>
          </div>

          {error && (
            <div className="auth-error">
              <span className="auth-error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Email Address</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">✉️</span>
                <input 
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                />
              </div>
            </div>

            <div className="auth-field">
              <div className="auth-field-header">
                <label className="auth-label">Password</label>
                <button 
                  type="button" 
                  className="auth-toggle-pwd"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">🔒</span>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <span className="auth-loading-spinner">Verifying Credentials...</span>
              ) : (
                <>
                  Sign In to Finexo
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="auth-card__footer">
            <span>Don't have an account yet?</span>
            <Link to="/signup" className="auth-link">Create Account →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
