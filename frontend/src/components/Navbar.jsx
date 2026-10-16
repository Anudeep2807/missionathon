import { useState, useEffect } from 'react';
import { Search, Sparkles, Menu, X, ShieldAlert, BookOpen, UserCheck, Activity, Zap } from 'lucide-react';
import { checkApiHealth } from '../services/api';

export default function Navbar({ activePage, setActivePage, hasResults }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState({ online: null, checking: true });

  const pollHealth = async () => {
    const res = await checkApiHealth();
    setBackendStatus({ online: res.online, checking: false });
  };

  useEffect(() => {
    pollHealth();
    const interval = setInterval(pollHealth, 25000);
    return () => clearInterval(interval);
  }, []);

  const handleNav = (page) => {
    setActivePage(page);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="navbar" role="navigation" aria-label="Main Navigation">
      <div className="container nav-container">
        {/* Brand */}
        <a
          href="#home"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            handleNav('home');
          }}
          aria-label="LabelLens Home"
        >
          <div className="brand-icon-wrapper" aria-hidden="true">
            <Search size={22} strokeWidth={2.5} />
          </div>
          <div className="brand-text-block">
            <span className="brand-name">
              Label<span style={{ color: 'var(--primary-600)' }}>Lens</span>
            </span>
            <span className="brand-tagline">AI Food Label Intelligence</span>
          </div>
        </a>

        {/* Mobile Menu Toggle Button */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Navigation Links */}
        <div className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
          <button
            className={`nav-link ${activePage === 'home' ? 'active' : ''}`}
            onClick={() => handleNav('home')}
          >
            Home
          </button>

          <button
            className={`nav-link ${activePage === 'analyze' ? 'active' : ''}`}
            onClick={() => handleNav('analyze')}
          >
            <Sparkles size={16} />
            Analyze Label
          </button>

          {hasResults && (
            <button
              className={`nav-link ${activePage === 'results' ? 'active' : ''}`}
              onClick={() => handleNav('results')}
            >
              <Activity size={16} />
              Results Report
            </button>
          )}

          <button
            className={`nav-link ${activePage === 'profile' ? 'active' : ''}`}
            onClick={() => handleNav('profile')}
          >
            <UserCheck size={16} />
            Dietary Profile
          </button>

          <button
            className={`nav-link ${activePage === 'how-it-works' ? 'active' : ''}`}
            onClick={() => handleNav('how-it-works')}
          >
            <BookOpen size={16} />
            How It Works
          </button>

          {/* Backend Status Indicator */}
          <div
            className={`health-badge ${
              backendStatus.online === true
                ? 'online'
                : backendStatus.online === false
                ? 'offline'
                : ''
            }`}
            title={
              backendStatus.online === true
                ? 'FastAPI AI Backend is online and connected'
                : 'FastAPI backend offline. Demo verification mode available.'
            }
          >
            <span className="health-dot" />
            <span>
              {backendStatus.checking
                ? 'Connecting...'
                : backendStatus.online
                ? 'Vision AI Online'
                : 'Demo Mode Ready'}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
