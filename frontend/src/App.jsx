import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Analyze from './pages/Analyze';
import Results from './pages/Results';
import HowItWorks from './pages/HowItWorks';
import ProfilePage from './pages/ProfilePage';
import { loadDietaryProfile } from './utils/storage';
import { SAMPLE_ANALYSIS_RESPONSE } from './utils/mockData';
import './App.css';

export default function App() {
  const getPageFromUrl = () => {
    try {
      const path = window.location.pathname.replace(/^\/+/, '').split('/')[0];
      if (['home', 'analyze', 'results', 'profile', 'how-it-works'].includes(path)) {
        return path;
      }
      const params = new URLSearchParams(window.location.search);
      const pageParam = params.get('page');
      if (pageParam && ['home', 'analyze', 'results', 'profile', 'how-it-works'].includes(pageParam)) {
        return pageParam;
      }
      const hash = window.location.hash.replace('#', '');
      if (['home', 'analyze', 'results', 'profile', 'how-it-works'].includes(hash)) {
        return hash;
      }
    } catch {}
    return 'home';
  };

  const [activePage, setActivePage] = useState(getPageFromUrl);
  const [images, setImages] = useState([]);
  const [profile, setProfile] = useState(() => loadDietaryProfile());
  const [analysisResult, setAnalysisResult] = useState(() => {
    const p = getPageFromUrl();
    return p === 'results' ? SAMPLE_ANALYSIS_RESPONSE : null;
  });

  // Sync with browser url changes
  useEffect(() => {
    const handleUrlChange = () => {
      const p = getPageFromUrl();
      setActivePage(p);
      if (p === 'results' && !analysisResult) {
        setAnalysisResult(SAMPLE_ANALYSIS_RESPONSE);
      }
    };
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, [analysisResult]);

  // Sync scroll to top and hash on page change
  const navigateTo = (page) => {
    setActivePage(page);
    window.location.hash = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Sticky Navigation */}
      <Navbar
        activePage={activePage}
        setActivePage={navigateTo}
        hasResults={Boolean(analysisResult)}
      />

      {/* Main Dynamic View */}
      <main className="main-content" role="main">
        {activePage === 'home' && (
          <Home onNavigate={navigateTo} />
        )}

        {activePage === 'analyze' && (
          <Analyze
            images={images}
            setImages={setImages}
            profile={profile}
            onNavigate={navigateTo}
            onAnalysisSuccess={(res) => setAnalysisResult(res)}
          />
        )}

        {activePage === 'results' && (
          <Results
            analysisResult={analysisResult}
            images={images}
            profile={profile}
            onNavigate={navigateTo}
          />
        )}

        {activePage === 'profile' && (
          <ProfilePage
            profile={profile}
            setProfile={setProfile}
            onNavigate={navigateTo}
          />
        )}

        {activePage === 'how-it-works' && (
          <HowItWorks onNavigate={navigateTo} />
        )}
      </main>

      {/* Application Footer */}
      <footer className="footer" role="contentinfo">
        <div className="container footer-inner">
          <div>
            <div style={{ fontWeight: 700, color: 'var(--primary-900)', fontSize: '1rem' }}>
              LabelLens
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
              See what's really in your food. Packaged-food transparency powered by Vision AI.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 20, fontSize: '0.85rem' }}>
            <button
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onClick={() => navigateTo('how-it-works')}
            >
              How It Works
            </button>
            <button
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onClick={() => navigateTo('profile')}
            >
              Dietary Profile
            </button>
            <button
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onClick={() => navigateTo('analyze')}
            >
              Analyze Product
            </button>
          </div>
        </div>

        <div className="container" style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-light)', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
          Disclaimer: Not a medical diagnostic device. LabelLens evaluates visible packaging text against user-defined restrictions and does not certify products as 100% allergen-free.
        </div>
      </footer>
    </div>
  );
}
