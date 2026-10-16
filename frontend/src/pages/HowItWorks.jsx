import React from 'react';
import {
  Upload,
  Cpu,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  FileCheck2,
  Sparkles,
} from 'lucide-react';

export default function HowItWorks({ onNavigate }) {
  return (
    <div className="container" style={{ maxWidth: 900 }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary-900)', marginBottom: 12 }}>
          How LabelLens Works
        </h2>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: 640, margin: '0 auto' }}>
          Understanding our evidence-based, AI-assisted approach to packaged-food transparency.
        </p>
      </div>

      {/* 4 Core Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {[
          {
            step: 'Step 1',
            title: 'Upload Package Label Photos',
            icon: <Upload size={24} color="var(--primary-700)" />,
            desc: 'Users photograph or upload up to 5 photos of a food package—including the ingredients panel, nutrition facts box, and allergen advisories. LabelLens provides built-in tools to rotate images to the correct orientation or crop to the text zone before submission.',
          },
          {
            step: 'Step 2',
            title: 'Vision AI OCR & Structured Extraction',
            icon: <Cpu size={24} color="var(--primary-700)" />,
            desc: 'The backend FastAPI service utilizes multimodal AI to read visible text and output structured JSON data: discrete ingredients, nutrition values with units and serving sizes, and explicit allergen statements. Crucially, the model does not assume an ingredient is absent just because it was not detected.',
          },
          {
            step: 'Step 3',
            title: 'Profile Comparison & Synonym Matching',
            icon: <Sliders size={24} color="var(--primary-700)" />,
            desc: 'The backend cross-references extracted items with your saved dietary profile. It checks curated synonym trees (e.g. recognizing "casein" or "whey" as milk, and "arachis" as peanut), flags precautionary statements like "made in a facility that handles peanuts", and evaluates numeric nutrition limits (e.g. sugar > 15g).',
          },
          {
            step: 'Step 4',
            title: 'Evidence Presentation with Uncertainty Calibration',
            icon: <FileCheck2 size={24} color="var(--primary-700)" />,
            desc: 'Findings are categorized into Confirmed Conflicts, Unknown/Inconclusive checks, Evaluated Checks with No Conflict Found, and Informational notices. Every finding links directly to the original quote from the package label.',
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className="card"
            style={{
              display: 'flex',
              gap: 20,
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 'var(--radius-md)',
                background: 'var(--primary-50)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {item.icon}
            </div>

            <div style={{ flex: 1 }}>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--primary-600)',
                  letterSpacing: '0.04em',
                }}
              >
                {item.step}
              </span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 8px' }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '0.94rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Precautionary vs. Explicit Statement Transparency */}
      <div className="card" style={{ marginTop: 32 }}>
        <h3 className="card-title" style={{ marginBottom: 12 }}>
          <AlertTriangle size={20} color="#d97706" />
          Precautionary Warnings vs. Explicit Ingredient Lists
        </h3>
        <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
          Food labeling regulations distinguish between direct ingredient declarations (e.g., <em>"Contains: Milk, Peanuts"</em>) and voluntary cross-contact statements (e.g., <em>"May contain traces of tree nuts"</em> or <em>"Processed in a shared facility"</em>). LabelLens reports these distinctly so users can make informed choices based on their personal sensitivity levels.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '14px', borderRadius: 8 }}>
            <strong style={{ color: '#991b1b', fontSize: '0.9rem' }}>Direct Ingredient Conflict:</strong>
            <p style={{ fontSize: '0.82rem', color: '#7f1d1d', marginTop: 4 }}>
              The allergen or ingredient is an intentional recipe component listed on the label.
            </p>
          </div>

          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '14px', borderRadius: 8 }}>
            <strong style={{ color: '#92400e', fontSize: '0.9rem' }}>Precautionary Cross-Contact:</strong>
            <p style={{ fontSize: '0.82rem', color: '#78350f', marginTop: 4 }}>
              Advisories indicating shared manufacturing lines or facility equipment.
            </p>
          </div>
        </div>
      </div>

      {/* Comprehensive Medical & Regulatory Disclaimer */}
      <div className="disclaimer-banner" style={{ marginTop: 32 }}>
        <ShieldAlert size={26} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 6 }}>
            Safety & Medical Disclaimer
          </h4>
          <p style={{ fontSize: '0.88rem', lineHeight: 1.55 }}>
            LabelLens is an educational and decision-support assistant. Results depend entirely on the visual quality of submitted photos, lighting conditions, and exact manufacturer wording. LabelLens is <strong>not a substitute for medical advice</strong>, professional allergen testing, or direct manufacturer confirmation. Never rely solely on AI for life-threatening allergies.
          </p>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 36 }}>
        <button className="btn btn-primary btn-lg" onClick={() => onNavigate('analyze')}>
          <Sparkles size={18} />
          Start Analyzing Labels
        </button>
      </div>
    </div>
  );
}
