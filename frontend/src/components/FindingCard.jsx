import { useState } from 'react';
import {
  AlertTriangle,
  HelpCircle,
  CheckCircle,
  Info,
  Quote,
  ShieldAlert,
  HelpCircle as QuestionIcon,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export default function FindingCard({ finding, index: _index }) {
  const [userChoice, setUserChoice] = useState(null);

  if (!finding) return null;

  // Extract rule details
  let category = finding.category || '';
  let ruleName = finding.profile_rule || finding.rule || '';

  if (!category && finding.rule && finding.rule.includes(':')) {
    const parts = finding.rule.split(':');
    category = parts[0];
    ruleName = parts.slice(1).join(':');
  }

  const status = finding.status || 'unknown';
  const resolutionState = finding.resolution_state || (
    status === 'contradiction' ? 'contradiction' :
    status === 'conflict' ? 'confirmed' :
    status === 'no_conflict_found' ? 'confirmed' :
    status === 'missing_information' ? 'missing' : 'uncertain'
  );

  // Configuration for accessible status rendering
  const statusConfig = {
    contradiction: {
      badgeText: 'Packaging Contradiction',
      badgeClass: 'contradiction',
      icon: <ShieldAlert size={16} strokeWidth={2.5} />,
      titlePrefix: 'Contradiction Detected',
      accessibleSummary: 'Direct contradiction between packaging claim and label evidence.',
    },
    conflict: {
      badgeText: 'Confirmed Conflict',
      badgeClass: 'conflict',
      icon: <AlertTriangle size={16} strokeWidth={2.5} />,
      titlePrefix: 'Conflict Detected',
      accessibleSummary: 'This label contains wording matching your dietary restriction.',
    },
    missing_information: {
      badgeText: 'Missing Information',
      badgeClass: 'missing_information',
      icon: <HelpCircle size={16} strokeWidth={2} />,
      titlePrefix: 'Missing Label Area',
      accessibleSummary: 'Required label area or nutrient is missing or unreadable.',
    },
    unknown: {
      badgeText: 'Uncertain / Ambiguous',
      badgeClass: 'unknown',
      icon: <QuestionIcon size={16} strokeWidth={2} />,
      titlePrefix: 'Uncertain Finding',
      accessibleSummary: 'Status cannot be verified from the visible label pixels. Review physical package.',
    },
    no_conflict_found: {
      badgeText: 'No Conflict Found (Evaluated)',
      badgeClass: 'no_conflict_found',
      icon: <CheckCircle size={16} strokeWidth={2} />,
      titlePrefix: 'Evaluated Check',
      accessibleSummary: 'No matching mention was detected in readable text. This does not certify allergen-free status.',
    },
    informational: {
      badgeText: 'Informational',
      badgeClass: 'informational',
      icon: <Info size={16} strokeWidth={2} />,
      titlePrefix: 'Label Notice',
      accessibleSummary: 'Informational note regarding packaging statements or facility handling.',
    },
  };

  const config = statusConfig[status] || statusConfig.unknown;
  const title = finding.title || `${config.titlePrefix}: ${ruleName || 'Restriction Check'}`;

  // Helper to format evidence item
  const renderEvidenceQuote = (ev, key) => {
    const text = typeof ev === 'object' && ev !== null ? ev.text : ev;
    const field = typeof ev === 'object' && ev !== null ? ev.field_name : null;
    const imgIdx = typeof ev === 'object' && ev !== null ? ev.source_image_index : null;

    return (
      <div key={key} className="evidence-quote">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          {field && (
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-700)', background: 'var(--primary-100)', padding: '1px 6px', borderRadius: 4 }}>
              {field.replace('_', ' ')}
            </span>
          )}
          {typeof imgIdx === 'number' && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Image #{imgIdx + 1}
            </span>
          )}
        </div>
        <div>"{text}"</div>
      </div>
    );
  };

  return (
    <div
      className={`finding-card ${config.badgeClass}`}
      role="article"
      aria-label={`${config.badgeText}: ${title}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className={`finding-badge ${config.badgeClass}`}>
            {config.icon}
            {config.badgeText}
          </span>

          {/* Deliverable 6: High-level classification badge */}
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              padding: '2px 8px',
              borderRadius: 4,
            }}
          >
            State: {resolutionState}
          </span>

          {category && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                background: 'var(--bg-subtle)',
                padding: '2px 8px',
                borderRadius: 4,
              }}
            >
              {category}
            </span>
          )}
        </div>

        {typeof finding.confidence === 'number' && (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Confidence: {(finding.confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>

      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
        {title}
      </h4>

      <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
        {finding.message}
      </p>

      {/* Deliverable 2: Specific matched value or nutrition field highlighted */}
      {finding.matched_value && (
        <div style={{ marginTop: 8, fontSize: '0.85rem' }}>
          <strong>Exact Label Match:</strong>{' '}
          <span style={{ color: 'var(--primary-800)', fontWeight: 600, background: 'var(--primary-50)', padding: '2px 6px', borderRadius: 4 }}>
            {finding.matched_value}
          </span>
        </div>
      )}

      {/* Deliverable 4: Dual Evidence Comparison for Contradictions */}
      {status === 'contradiction' && (
        <div className="contradiction-dual-evidence">
          {Array.isArray(finding.conflicting_evidence) && finding.conflicting_evidence.length > 0 && (
            <div className="evidence-side-card claim-side">
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7e22ce', marginBottom: 6 }}>
                📢 Package Marketing Claim:
              </div>
              {finding.conflicting_evidence.map((ev, i) => renderEvidenceQuote(ev, `claim-${i}`))}
            </div>
          )}

          {Array.isArray(finding.evidence) && finding.evidence.length > 0 && (
            <div className="evidence-side-card ingredient-side">
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#b91c1c', marginBottom: 6 }}>
                ⚠️ Contradicting Ingredients / Nutrition Facts:
              </div>
              {finding.evidence.map((ev, i) => renderEvidenceQuote(ev, `ing-${i}`))}
            </div>
          )}
        </div>
      )}

      {/* Deliverable 3: Supporting Evidence Quotes for Standard Findings */}
      {status !== 'contradiction' && Array.isArray(finding.evidence) && finding.evidence.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            <Quote size={14} />
            Ground-Truth Label Evidence:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            {finding.evidence.map((ev, evIdx) => renderEvidenceQuote(ev, evIdx))}
          </div>
        </div>
      )}

      {/* Deliverable 5: Interactive User Confirmation Box */}
      {finding.requires_user_confirmation && (
        <div className={`user-confirmation-box ${status === 'contradiction' ? 'contradiction' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={18} color={status === 'contradiction' ? '#9333ea' : '#d97706'} style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                User Confirmation Requested:
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                {finding.user_confirmation_prompt || 'Conflicting or ambiguous label information was detected. Please choose how this should affect your dietary evaluation:'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {Array.isArray(finding.user_confirmation_options) && finding.user_confirmation_options.map((opt, optIdx) => (
              <button
                key={optIdx}
                className={`confirmation-option-btn ${userChoice === opt ? 'selected' : ''}`}
                onClick={() => setUserChoice(opt)}
                type="button"
              >
                {userChoice === opt && <Check size={13} style={{ display: 'inline', marginRight: 4 }} />}
                {opt}
              </button>
            ))}
          </div>

          {userChoice && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#065f46', background: '#ecfdf5', padding: '6px 10px', borderRadius: 6 }}>
              <span>
                <strong>Your Preference Recorded:</strong> {userChoice}
              </span>
              <button
                onClick={() => setUserChoice(null)}
                style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                title="Reset choice"
              >
                <RotateCcw size={12} /> Reset
              </button>
            </div>
          )}
        </div>
      )}

      {/* Uncertainty & Safety Note */}
      {status === 'no_conflict_found' && (
        <div
          style={{
            marginTop: 12,
            padding: '6px 12px',
            background: 'rgba(2, 132, 199, 0.08)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.78rem',
            color: '#0369a1',
            lineHeight: 1.4,
          }}
        >
          <strong>Evaluation Note:</strong> No match was detected in readable text. This does not prove the product is 100% allergen-free.
        </div>
      )}

      {status === 'unknown' && !finding.requires_user_confirmation && (
        <div
          style={{
            marginTop: 12,
            padding: '6px 12px',
            background: 'rgba(217, 119, 6, 0.08)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.78rem',
            color: '#b45309',
            lineHeight: 1.4,
          }}
        >
          <strong>Uncertainty Note:</strong> Absence of detection is not proof of absence. Check the physical package or contact the manufacturer.
        </div>
      )}

      {/* Deliverable 7: Persistent Non-Medical Disclaimer */}
      <div style={{ marginTop: 10, fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px dashed var(--border-light)', paddingTop: 6 }}>
        * Informational text-analysis only based on visible label photography. Not medical advice or certification.
      </div>
    </div>
  );
}
