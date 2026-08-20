import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './auth.css';

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password should be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const newUser = await signup(name, email, password);
      if (newUser.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
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
              Join Finexo Ecosystem
            </div>
            <h1 className="auth-card__title">Create Account</h1>
            <p className="auth-card__sub">Start optimizing your financial trajectory with persistent AI models.</p>
          </div>

          {error && (
            <div className="auth-error">
              <span className="auth-error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Full Name</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">👤</span>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="auth-input"
                />
              </div>
            </div>

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
              <label className="auth-label">Create Password</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">🔒</span>
                <input 
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Confirm Password</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">🛡️</span>
                <input 
                  type="password"
                  required
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="auth-input"
                />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <span className="auth-loading-spinner">Creating Your Profile...</span>
              ) : (
                <>
                  Register & Get Started
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="auth-card__footer">
            <span>Already have an account?</span>
            <Link to="/login" className="auth-link">Sign In →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
