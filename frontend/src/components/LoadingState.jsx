import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, CircleDot } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Preprocessing & encoding label photos', duration: 1500 },
  { id: 2, label: 'Vision AI OCR: Extracting ingredients & nutrition tables', duration: 3500 },
  { id: 3, label: 'Evaluating rules against your dietary profile & synonyms', duration: 2500 },
  { id: 4, label: 'Verifying evidence, uncertainties, and legibility notes', duration: 2000 },
];

export default function LoadingState({ onCancel }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    let timer;
    if (currentStepIndex < STEPS.length - 1) {
      timer = setTimeout(() => {
        setCurrentStepIndex((prev) => prev + 1);
      }, STEPS[currentStepIndex].duration);
    }
    return () => clearTimeout(timer);
  }, [currentStepIndex]);

  return (
    <div
      className="card"
      style={{
        textAlign: 'center',
        padding: '48px 24px',
        maxWidth: 640,
        margin: '32px auto',
      }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        style={{
          width: 64,
          height: 64,
          background: 'var(--primary-50)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: 'var(--primary-700)',
        }}
      >
        <Loader2 size={36} className="spin-animation" style={{ animation: 'spin 1s linear infinite' }} />
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary-900)', marginBottom: 8 }}>
        Analyzing Food Label
      </h3>
      <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', maxWidth: 440, margin: '0 auto 32px' }}>
        Our Vision AI is scanning the label photos to identify ingredients, nutrition values, and allergen warnings.
      </p>

      {/* Progressive Step Checklist */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          textAlign: 'left',
          maxWidth: 420,
          margin: '0 auto 32px',
          background: 'var(--bg-subtle)',
          padding: '20px 24px',
          borderRadius: 'var(--radius-md)',
        }}
      >
        {STEPS.map((step, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;

          return (
            <div
              key={step.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: '0.88rem',
                color: isDone ? 'var(--primary-800)' : isCurrent ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: isCurrent ? 600 : 500,
              }}
            >
              {isDone ? (
                <CheckCircle2 size={18} color="var(--primary-600)" />
              ) : isCurrent ? (
                <CircleDot size={18} color="var(--primary-700)" className="spin-animation" />
              ) : (
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: '2px solid var(--border-light)',
                  }}
                />
              )}
              <span>{step.label}</span>
            </div>
          );
        })}
      </div>

      {onCancel && (
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>
          Cancel Analysis
        </button>
      )}
    </div>
  );
}
