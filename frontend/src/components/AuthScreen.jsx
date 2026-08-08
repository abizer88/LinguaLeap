import React, { useState, useEffect } from 'react';
import { Sparkles, KeyRound, User, Eye, EyeOff } from 'lucide-react';

const QUOTES = [
  '"Every expert was once a beginner."',
  '"Language is the road map of a culture."',
  '"To learn Lisan ud-Dawat is to unlock a treasure of knowledge."',
  '"Small daily habits lead to massive fluency gains."',
  '"Arabic is the key that opens a thousand doors."',
];

export default function AuthScreen({ onAuthSuccess, showToast }) {
  const [trNo, setTrNo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Registration specific state
  const [newPass1, setNewPass1] = useState('');
  const [newPass2, setNewPass2] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);

  const [quoteIdx, setQuoteIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Rotate quotes every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIdx((prev) => (prev + 1) % QUOTES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleTrNoChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Numeric only
    if (value.length <= 8) {
      setTrNo(value);
      setErrorMsg('');
    }
  };

  const getTrNoHintClass = () => {
    if (trNo.length === 0) return 'tr-hint-muted';
    return (trNo.length >= 5 && trNo.length <= 8) ? 'tr-hint-valid' : 'tr-hint-invalid';
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!/^\d{5,8}$/.test(trNo)) {
      setErrorMsg('⚠️ TR number must be between 5 and 8 digits.');
      return;
    }
    if (!password) {
      setErrorMsg('⚠️ Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tr_no: trNo, password })
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Login failed. Please check credentials.');
        setLoading(false);
        return;
      }

      showToast('👋 Ahlan Wasahlan!');
      onAuthSuccess(data.token, data);
    } catch {
      setErrorMsg('⚠️ Failed to connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!/^\d{5,8}$/.test(trNo)) {
      setErrorMsg('⚠️ Please enter a valid 5-8 digit TR NO.');
      return;
    }
    if (newPass1.length < 4) {
      setErrorMsg('⚠️ Password must be at least 4 characters.');
      return;
    }
    if (newPass1 !== newPass2) {
      setErrorMsg('⚠️ Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tr_no: trNo, new_password: newPass1 })
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Account setup failed.');
        setLoading(false);
        return;
      }

      setSuccessMsg('✅ Account created! Logging you in...');
      // Auto fill and log in
      setPassword(newPass1);
      setTimeout(() => {
        setIsRegistering(false);
        // Clear registration values
        setNewPass1('');
        setNewPass2('');
      }, 1000);
    } catch {
      setErrorMsg('⚠️ Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Decorative floating grids */}
      <div className="decor-blob decor-blob-1"></div>
      <div className="decor-blob decor-blob-2"></div>

      <div className="auth-grid">
        {/* Left Panel: Hero Graphics & Branding */}
        <div className="auth-hero">
          <div className="hero-content">
            <div className="badge-glow">AL JAMEA TUS SAIFIYAH</div>
            <h1 className="hero-title">
              Master Arabic to <br />
              <span>Lisan ud-Dawat</span>
            </h1>
            <p className="hero-subtitle">
              Expand your capabilities with our specialized university language portal. Complete interactive lessons, earn achievements, and scale the leaderboard.
            </p>
            
            {/* Dynamic Quote Box */}
            <div className="quote-box">
              <Sparkles className="quote-icon" size={20} />
              <p className="quote-text">{QUOTES[quoteIdx]}</p>
            </div>
            
            {/* Stats Overview */}
            <div className="hero-stats">
              <div className="mini-stat">
                <span className="stat-num">6</span>
                <span className="stat-lbl">Primary Modules</span>
              </div>
              <div className="mini-stat">
                <span className="stat-num">50+</span>
                <span className="stat-lbl">Curriculum Words</span>
              </div>
              <div className="mini-stat">
                <span className="stat-num">🔥</span>
                <span className="stat-lbl">Daily Habits</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Glassmorphism Login Card */}
        <div className="auth-panel">
          <div className="glass-card auth-card">
            <div className="auth-header">
              <div className="logo-icon">🦜</div>
              <h2>LinguaLeap</h2>
              <p className="logo-sub">Arabic ➔ LSd Edition</p>
            </div>

            <div className="auth-tabs">
              <button 
                type="button"
                className={`tab-btn ${!isRegistering ? 'active' : ''}`}
                onClick={() => { setIsRegistering(false); setErrorMsg(''); setSuccessMsg(''); }}
              >
                Sign In
              </button>
              <button 
                type="button"
                className={`tab-btn ${isRegistering ? 'active' : ''}`}
                onClick={() => { setIsRegistering(true); setErrorMsg(''); setSuccessMsg(''); }}
              >
                Set Password
              </button>
            </div>

            {/* Login form */}
            {!isRegistering ? (
              <form onSubmit={handleLoginSubmit} className="auth-form">
                <div className="form-group">
                  <span className="futuristic-label">TR Number</span>
                  <div className="input-wrapper">
                    <User className="input-icon" size={18} />
                    <input 
                      type="text"
                      className="futuristic-input input-mono"
                      placeholder="e.g. 25687"
                      value={trNo}
                      onChange={handleTrNoChange}
                      required
                    />
                  </div>
                  <div className={`tr-digits-indicator ${getTrNoHintClass()}`}>
                    {trNo.length} / 5-8 digits
                  </div>
                </div>

                <div className="form-group">
                  <span className="futuristic-label">Password</span>
                  <div className="input-wrapper">
                    <KeyRound className="input-icon" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      className="futuristic-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button 
                      type="button" 
                      className="eye-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {errorMsg && <div className="auth-error-banner">{errorMsg}</div>}
                
                <button type="submit" disabled={loading} className="btn-primary auth-submit-btn">
                  {loading ? 'Authenticating...' : 'Enter Portal ➔'}
                </button>
              </form>
            ) : (
              /* Registration (Set Password) form */
              <form onSubmit={handleRegisterSubmit} className="auth-form">
                <div className="form-group">
                  <span className="futuristic-label">TR Number</span>
                  <div className="input-wrapper">
                    <User className="input-icon" size={18} />
                    <input 
                      type="text"
                      className="futuristic-input input-mono"
                      placeholder="e.g. 25687"
                      value={trNo}
                      onChange={handleTrNoChange}
                      required
                    />
                  </div>
                  <div className="email-domain-helper">
                    Registers as: <span className="derived-email-highlight">{trNo ? `${trNo}@jameasaifiyah.edu` : '...'}</span>
                  </div>
                </div>

                <div className="form-group">
                  <span className="futuristic-label">New Password</span>
                  <div className="input-wrapper">
                    <KeyRound className="input-icon" size={18} />
                    <input 
                      type={showNewPass ? "text" : "password"}
                      className="futuristic-input"
                      placeholder="Min 4 characters"
                      value={newPass1}
                      onChange={(e) => setNewPass1(e.target.value)}
                      required
                    />
                    <button 
                      type="button" 
                      className="eye-toggle"
                      onClick={() => setShowNewPass(!showNewPass)}
                    >
                      {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <span className="futuristic-label">Confirm Password</span>
                  <div className="input-wrapper">
                    <KeyRound className="input-icon" size={18} />
                    <input 
                      type={showNewPass ? "text" : "password"}
                      className="futuristic-input"
                      placeholder="Repeat password"
                      value={newPass2}
                      onChange={(e) => setNewPass2(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {errorMsg && <div className="auth-error-banner">{errorMsg}</div>}
                {successMsg && <div className="auth-success-banner">{successMsg}</div>}

                <button type="submit" disabled={loading} className="btn-primary auth-submit-btn">
                  {loading ? 'Creating Account...' : 'Set Credentials ✓'}
                </button>
              </form>
            )}

            <div className="auth-footer-notice">
              🔐 Integrated with secure university verification system.
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .auth-container {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 20px;
        }

        .auth-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          max-width: 1100px;
          width: 100%;
          gap: 40px;
          z-index: 10;
        }

        @media (max-width: 900px) {
          .auth-grid {
            grid-template-columns: 1fr;
          }
          .auth-hero {
            display: none;
          }
        }

        /* Hero styling */
        .auth-hero {
          display: flex;
          align-items: center;
          padding: 40px;
          border-left: 2px solid var(--border);
          background: rgba(16, 185, 129, 0.02);
          border-radius: var(--radius-lg);
        }

        .badge-glow {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
          color: var(--primary);
          background: var(--primary-glow);
          padding: 6px 14px;
          border-radius: 99px;
          border: 1px solid var(--border);
          margin-bottom: 24px;
          box-shadow: 0 0 15px 0 var(--primary-glow);
        }

        .hero-title {
          font-size: clamp(32px, 4vw, 52px);
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 20px;
        }

        .hero-title span {
          color: var(--accent);
          background: linear-gradient(135deg, var(--accent) 0%, #D97706 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
          color: var(--text-muted);
          font-size: 16px;
          line-height: 1.6;
          max-width: 460px;
          margin-bottom: 36px;
        }

        .quote-box {
          background: rgba(245, 158, 11, 0.03);
          border-left: 3px solid var(--accent);
          padding: 16px 20px;
          border-radius: 0 var(--radius-md) var(--radius-md) 0;
          margin-bottom: 40px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
          max-width: 460px;
        }

        .quote-icon {
          color: var(--accent);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .quote-text {
          font-size: 14px;
          font-style: italic;
          color: #FBBF24;
          line-height: 1.5;
        }

        .hero-stats {
          display: flex;
          gap: 24px;
        }

        .mini-stat {
          display: flex;
          flex-direction: column;
        }

        .stat-num {
          font-size: 26px;
          font-weight: 900;
          color: var(--text);
        }

        .stat-lbl {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 4px;
        }

        /* Auth Form Card */
        .auth-panel {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .auth-card {
          width: 100%;
          max-width: 440px;
          border: 1px solid var(--border);
          position: relative;
        }

        .auth-card::before {
          content: '';
          position: absolute;
          top: -2px; left: 10%; right: 10%;
          height: 3px;
          background: linear-gradient(90deg, transparent, var(--primary), transparent);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .logo-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .auth-header h2 {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .logo-sub {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
          letter-spacing: 0.5px;
        }

        .auth-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: rgba(0, 0, 0, 0.4);
          padding: 4px;
          border-radius: var(--radius-md);
          border: 1px solid rgba(255, 255, 255, 0.05);
          margin-bottom: 24px;
        }

        .tab-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          padding: 10px;
          font-size: 14px;
          font-weight: 600;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-btn.active {
          background: var(--surface-solid);
          color: var(--primary);
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          border: 1px solid rgba(16, 185, 129, 0.1);
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          position: relative;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .input-wrapper .futuristic-input {
          padding-left: 48px;
        }

        .eye-toggle {
          position: absolute;
          right: 16px;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .eye-toggle:hover {
          color: var(--text);
        }

        .tr-digits-indicator {
          font-size: 11px;
          text-align: right;
          margin-top: 6px;
        }

        .tr-hint-muted { color: var(--text-muted); }
        .tr-hint-valid { color: var(--primary); font-weight: 600; }
        .tr-hint-invalid { color: var(--danger); font-weight: 600; }

        .email-domain-helper {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 6px;
        }

        .derived-email-highlight {
          font-family: var(--font-mono);
          color: var(--accent);
          font-weight: bold;
        }

        .auth-submit-btn {
          margin-top: 10px;
        }

        .auth-error-banner {
          background: rgba(239, 68, 68, 0.1);
          border-left: 3px solid var(--danger);
          color: #FCA5A5;
          padding: 12px;
          font-size: 13px;
          border-radius: var(--radius-sm);
          font-weight: 500;
        }

        .auth-success-banner {
          background: rgba(16, 185, 129, 0.1);
          border-left: 3px solid var(--primary);
          color: #A7F3D0;
          padding: 12px;
          font-size: 13px;
          border-radius: var(--radius-sm);
          font-weight: 500;
        }

        .auth-footer-notice {
          text-align: center;
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 24px;
          border-top: 1px solid rgba(255,255,255,0.03);
          padding-top: 16px;
        }

        /* Decorative background blobs */
        .decor-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
          opacity: 0.15;
          z-index: 1;
        }

        .decor-blob-1 {
          width: 300px; height: 300px;
          background: var(--primary);
          top: 10%; left: 5%;
        }

        .decor-blob-2 {
          width: 400px; height: 400px;
          background: var(--accent);
          bottom: 10%; right: 5%;
        }
      `}</style>
    </div>
  );
}
