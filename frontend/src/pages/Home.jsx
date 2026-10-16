import {
  Sparkles,
  ShieldAlert,
  Search,
  Sliders,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Camera,
  Layers,
  FileCheck2,
  Zap,
  Activity,
  AlertTriangle,
  HeartHandshake,
  Cpu,
  BadgeCheck,
} from 'lucide-react';
import { SAMPLE_PRODUCTS } from '../utils/mockData';

export default function Home({ onNavigate }) {
  return (
    <div className="container" style={{ paddingTop: 20 }}>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">
          <Sparkles size={16} />
          <span>AI-Powered Food Label Intelligence & Safety Verification</span>
        </div>

        <h1 className="hero-title">
          See what’s <span>really</span> inside your packaged food.
        </h1>

        <p className="hero-subtitle">
          Upload packaged-food labels to instantly detect allergen conflicts, precautionary advisory warnings, and nutritional thresholds tailored strictly to your dietary profile.
        </p>

        <div className="hero-actions">
          <button
            className="btn btn-primary btn-lg pulse-glow"
            onClick={() => onNavigate('analyze')}
            aria-label="Analyze a food product label"
          >
            <Sparkles size={20} />
            Analyze a Product Label
            <ArrowRight size={18} />
          </button>

          <button
            className="btn btn-secondary btn-lg"
            onClick={() => onNavigate('profile')}
            aria-label="Configure dietary profile"
          >
            <Sliders size={20} />
            Set Dietary Profile
          </button>

          <button
            className="btn btn-secondary btn-lg"
            onClick={() => onNavigate('how-it-works')}
            aria-label="Learn how LabelLens works"
          >
            How It Works
          </button>
        </div>
      </section>

      {/* Live Interactive Scenarios Grid */}
      <section style={{ marginTop: 48 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="hero-badge" style={{ display: 'inline-flex', marginBottom: 8 }}>
            <Zap size={14} />
            <span>Interactive Live Demos</span>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Test Real-World Scenarios in 1 Click
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 600, margin: '6px auto 0', fontSize: '0.95rem' }}>
            Explore how LabelLens deterministically detects declared allergens, cross-contamination warnings, and nutritional limits.
          </p>
        </div>

        <div className="preset-chips-grid">
          {SAMPLE_PRODUCTS.map((prod) => {
            const isConflict = prod.badgeType === 'conflict';
            const isUnknown = prod.badgeType === 'unknown';
            return (
              <div
                key={prod.id}
                className="preset-product-item glass-card"
                onClick={() => onNavigate('analyze')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onNavigate('analyze')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>
                    {prod.category}
                  </span>
                  <span
                    className={`badge-pill ${
                      isConflict
                        ? 'badge-conflict'
                        : isUnknown
                        ? 'badge-unknown'
                        : 'badge-clean'
                    }`}
                  >
                    {isConflict ? (
                      <AlertTriangle size={12} />
                    ) : isUnknown ? (
                      <HelpCircle size={12} />
                    ) : (
                      <CheckCircle size={12} />
                    )}
                    {prod.badge}
                  </span>
                </div>

                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                  {prod.name}
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: 14 }}>
                  {prod.summary}
                </p>

                <div className="preset-action-link">
                  <span>Explore Scenario</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Core Capabilities Matrix */}
      <section style={{ marginTop: 64 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            Engineered for Precision & Transparency
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 650, margin: '0 auto', fontSize: '0.96rem' }}>
            Unlike generic chatbots that guess or hallucinate, LabelLens uses specialized OCR coupled with deterministic rule engines.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card glass-card">
            <div className="feature-icon-wrapper">
              <Camera size={24} />
            </div>
            <h3 className="feature-heading">Multi-Angle Ingestion & Camera</h3>
            <p className="feature-text">
              Capture or upload up to 5 photos covering curved packages, ingredients lists, allergen boxes, and nutrition facts. Built-in camera, crop, and rotation controls.
            </p>
          </div>

          <div className="feature-card glass-card">
            <div className="feature-icon-wrapper">
              <ShieldAlert size={24} />
            </div>
            <h3 className="feature-heading">Deterministic Allergen Logic</h3>
            <p className="feature-text">
              Explicitly categorizes "Contains..." declarations from "May contain traces" advisory warnings and recognized scientific synonyms (e.g. casein, whey, arachis).
            </p>
          </div>

          <div className="feature-card glass-card">
            <div className="feature-icon-wrapper">
              <Activity size={24} />
            </div>
            <h3 className="feature-heading">Nutrient Threshold Checks</h3>
            <p className="feature-text">
              Configure personal limits for sugar, sodium, saturated fat, carbohydrates, and calories. Instant visual progress meters highlight any exceeded boundaries.
            </p>
          </div>

          <div className="feature-card glass-card">
            <div className="feature-icon-wrapper">
              <FileCheck2 size={24} />
            </div>
            <h3 className="feature-heading">Verbatim Evidence Citations</h3>
            <p className="feature-text">
              Every finding quotes the exact readable text from the packaging with confidence scores and unreadable section alerts. We never declare a product "completely safe."
            </p>
          </div>
        </div>
      </section>

      {/* 4-Step Quick Walkthrough */}
      <section style={{ marginTop: 64, textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
          How LabelLens Works
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto 36px', fontSize: '0.98rem' }}>
          Four steps from packaging photo to evidence-backed dietary clarity.
        </p>

        <div className="steps-grid">
          {[
            { step: '01', title: 'Snap / Upload Label', desc: 'Use your phone camera or upload photos of ingredients, allergen statements, and nutrition tables.' },
            { step: '02', title: 'Vision AI OCR', desc: 'High-precision OCR extracts text, nutrient metrics, units, and flags any blurry or unreadable packaging seams.' },
            { step: '03', title: 'Profile Comparison', desc: 'Deterministic rules cross-reference your allergens, custom avoided ingredients, and nutrient caps.' },
            { step: '04', title: 'Evidence & Scorecard', desc: 'Inspect confirmed conflicts, advisory warnings, and verbatim quotes with zero false safety claims.' },
          ].map((item) => (
            <div
              key={item.step}
              className="step-card glass-card"
            >
              <div className="step-number">
                {item.step}
              </div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                {item.title}
              </h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Safety & Medical Transparency Disclaimer */}
      <section className="disclaimer-banner" role="note" style={{ marginTop: 60 }}>
        <ShieldAlert size={26} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Important Food Safety & Medical Transparency Disclaimer:</strong>
          <p style={{ marginTop: 4 }}>
            LabelLens assists users in reviewing packaged-food labels, but AI extraction depends entirely on photo sharpness, lighting, and packaging typography. LabelLens is <strong>not a medical diagnostic device</strong> and does not guarantee that any product is allergen-free. Individuals with severe allergies should always verify the physical package directly and consult with their physician or manufacturer.
          </p>
        </div>
      </section>
    </div>
  );
}
