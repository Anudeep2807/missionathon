import { useState } from 'react';
import {
  AlertTriangle,
  HelpCircle,
  CheckCircle,
  Info,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
  Sliders,
  Printer,
  Copy,
  Check,
  Download,
  Share2,
  FileCheck2,
  Activity,
  Layers,
  ChevronRight,
} from 'lucide-react';
import FindingCard from '../components/FindingCard';
import ExtractedLabelView from '../components/ExtractedLabelView';
import EvidencePanel from '../components/EvidencePanel';

export default function Results({
  analysisResult,
  images,
  profile,
  onNavigate,
}) {
  const [filterCategory, setFilterCategory] = useState('all'); // 'all' | 'conflict' | 'unknown' | 'no_conflict_found' | 'informational'
  const [activeTab, setActiveTab] = useState('findings'); // 'findings' | 'nutrition' | 'extracted' | 'evidence'
  const [copied, setCopied] = useState(false);

  if (!analysisResult) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div className="icon-pulse-wrapper" style={{ margin: '0 auto 16px' }}>
          <FileCheck2 size={32} color="var(--primary-600)" />
        </div>
        <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
          No Analysis Results Yet
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 500, margin: '0 auto 24px' }}>
          Upload packaged-food label photos or select a test scenario to evaluate dietary restrictions.
        </p>
        <button className="btn btn-primary btn-lg" onClick={() => onNavigate('analyze')}>
          Go to Analysis Workspace
        </button>
      </div>
    );
  }

  const { extracted, findings = [], request_id } = analysisResult;

  // Compute counts according to Deliverable 6 (Confirmed, Uncertain, Missing, Contradiction)
  const contradictionFindings = findings.filter(
    (f) => f.status === 'contradiction' || f.resolution_state === 'contradiction'
  );
  const conflictFindings = findings.filter(
    (f) => f.status === 'conflict' && f.status !== 'contradiction'
  );
  const confirmationNeededFindings = findings.filter(
    (f) => f.requires_user_confirmation
  );
  const unknownFindings = findings.filter(
    (f) => (f.status === 'unknown' || f.resolution_state === 'uncertain') && f.status !== 'contradiction'
  );
  const missingFindings = findings.filter(
    (f) => f.status === 'missing_information' || f.resolution_state === 'missing' || f.status === 'unreadable'
  );
  const evaluatedNoConflictFindings = findings.filter(
    (f) => f.status === 'no_conflict_found'
  );
  const infoFindings = findings.filter((f) => f.status === 'informational');

  // Filtered list
  const displayedFindings =
    filterCategory === 'all'
      ? findings
      : findings.filter((f) => {
          if (filterCategory === 'contradiction')
            return f.status === 'contradiction' || f.resolution_state === 'contradiction';
          if (filterCategory === 'conflict')
            return f.status === 'conflict';
          if (filterCategory === 'confirmation')
            return f.requires_user_confirmation;
          if (filterCategory === 'unknown')
            return f.status === 'unknown' || f.resolution_state === 'uncertain';
          if (filterCategory === 'missing')
            return f.status === 'missing_information' || f.resolution_state === 'missing';
          if (filterCategory === 'no_conflict_found')
            return f.status === 'no_conflict_found';
          if (filterCategory === 'informational')
            return f.status === 'informational';
          return true;
        });

  // Overall summary
  let summaryText = '';
  if (contradictionFindings.length > 0) {
    summaryText = `⚠️ ${contradictionFindings.length} packaging contradiction${
      contradictionFindings.length > 1 ? 's' : ''
    } detected between marketing claims and actual ingredients or nutrition facts. Please inspect dual-evidence cited below.`;
  } else if (conflictFindings.length > 0) {
    summaryText = `${conflictFindings.length} confirmed label conflict${
      conflictFindings.length > 1 ? 's' : ''
    } identified matching your profile restrictions. Please examine cited evidence below before consuming.`;
  } else if (confirmationNeededFindings.length > 0) {
    summaryText = `${confirmationNeededFindings.length} ingredient(s) or statement(s) require your confirmation due to ambiguous origin or unverified claims.`;
  } else if (unknownFindings.length > 0 || missingFindings.length > 0) {
    summaryText = `No explicit conflicts were detected in legible text, but ${unknownFindings.length + missingFindings.length} check${
      unknownFindings.length + missingFindings.length > 1 ? 's remain' : ' remains'
    } unknown or missing. Absence of detection does not guarantee clinical absence of an allergen.`;
  } else {
    summaryText =
      'All evaluated checks found no matching conflicts in the readable portions of the label. Note: This analysis is based strictly on visible packaging text and is not a clinical guarantee.';
  }

  const productName =
    extracted?.product_name ||
    'Packaged Food Product';

  const nutritionList = extracted?.nutrition || [];

  const handleCopySummary = () => {
    const textLines = [
      `🔍 LabelLens Analysis Report: ${productName}`,
      `ID: ${request_id || 'N/A'}`,
      `Status: ${conflictFindings.length > 0 ? '🚨 Conflicted' : unknownFindings.length > 0 ? '⚠️ Caution / Needs Verification' : '🛡️ Evaluated (No Conflicts Found)'}`,
      `• Confirmed Conflicts: ${conflictFindings.length}`,
      `• Unknown / Advisory: ${unknownFindings.length}`,
      `• Evaluated Checks Passed: ${evaluatedNoConflictFindings.length}`,
      '',
      'Findings Summary:',
      ...findings.map((f, i) => `  ${i + 1}. [${f.status.toUpperCase()}] ${f.message}`),
      '',
      'Generated by LabelLens AI. Always inspect packaging directly.'
    ];

    navigator.clipboard.writeText(textLines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(analysisResult, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `labellens-report-${request_id || Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="container" style={{ paddingTop: 16 }}>
      {/* Top Action Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onNavigate('analyze')}
          style={{ borderRadius: 9999 }}
        >
          <ArrowLeft size={16} />
          Back to Upload Workspace
        </button>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleCopySummary}
            style={{ borderRadius: 9999 }}
            title="Copy formatted summary to clipboard"
          >
            {copied ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
            {copied ? 'Copied to Clipboard!' : 'Share Summary'}
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleDownloadJson}
            style={{ borderRadius: 9999 }}
            title="Download full JSON response"
          >
            <Download size={15} />
            JSON
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => window.print()}
            style={{ borderRadius: 9999 }}
            title="Print or save as PDF"
          >
            <Printer size={15} />
            Print Report
          </button>
        </div>
      </div>

      {/* Product Overview Header Card */}
      <div className="results-header-card glass-card" role="region" aria-label="Product Analysis Overview">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: '1 1 540px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="badge-pill badge-clean">
                <Sparkles size={12} />
                Verification Report
              </span>
              {request_id && (
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  ID: {request_id}
                </span>
              )}
            </div>

            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.02em' }}>
              {productName}
            </h2>

            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: 760, lineHeight: 1.55 }}>
              {summaryText}
            </p>
          </div>

          {/* Verdict Status Badge */}
          <div>
            {contradictionFindings.length > 0 ? (
              <div className="verdict-card verdict-contradiction">
                <div className="verdict-icon" style={{ background: '#f3e8ff', color: '#9333ea', borderRadius: 'var(--radius-md)', padding: 8, display: 'flex' }}>
                  <ShieldAlert size={26} />
                </div>
                <div>
                  <div className="verdict-title" style={{ color: '#6b21a8' }}>Contradictions Detected</div>
                  <div className="verdict-subtitle">{contradictionFindings.length} claim(s) contradict ingredients or nutrition</div>
                </div>
              </div>
            ) : conflictFindings.length > 0 ? (
              <div className="verdict-card verdict-conflict">
                <div className="verdict-icon">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <div className="verdict-title">Conflicts Detected</div>
                  <div className="verdict-subtitle">{conflictFindings.length} restriction(s) triggered</div>
                </div>
              </div>
            ) : confirmationNeededFindings.length > 0 ? (
              <div className="verdict-card verdict-unknown">
                <div className="verdict-icon">
                  <HelpCircle size={24} />
                </div>
                <div>
                  <div className="verdict-title">Confirmation Required</div>
                  <div className="verdict-subtitle">{confirmationNeededFindings.length} item(s) require your choice</div>
                </div>
              </div>
            ) : unknownFindings.length > 0 || missingFindings.length > 0 ? (
              <div className="verdict-card verdict-unknown">
                <div className="verdict-icon">
                  <HelpCircle size={24} />
                </div>
                <div>
                  <div className="verdict-title">Uncertain / Verification Needed</div>
                  <div className="verdict-subtitle">{unknownFindings.length + missingFindings.length} advisory or unreadable item(s)</div>
                </div>
              </div>
            ) : (
              <div className="verdict-card verdict-clean">
                <div className="verdict-icon">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <div className="verdict-title">Evaluated Checks Passed</div>
                  <div className="verdict-subtitle">No conflicts observed in legible text</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="results-stats-row">
          {contradictionFindings.length > 0 && (
            <div className="stat-box" style={{ borderColor: '#d8b4fe', background: '#faf5ff' }}>
              <div className="stat-icon contradiction">
                <ShieldAlert size={20} />
              </div>
              <div>
                <div className="stat-value" style={{ color: '#7e22ce' }}>
                  {contradictionFindings.length}
                </div>
                <div className="stat-label">Contradictions</div>
              </div>
            </div>
          )}

          <div className="stat-box">
            <div className="stat-icon conflict">
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="stat-value" style={{ color: 'var(--status-conflict-text)' }}>
                {conflictFindings.length}
              </div>
              <div className="stat-label">Confirmed Conflicts</div>
            </div>
          </div>

          {confirmationNeededFindings.length > 0 && (
            <div className="stat-box" style={{ borderColor: '#fde68a', background: '#fffdf7' }}>
              <div className="stat-icon unknown">
                <HelpCircle size={20} />
              </div>
              <div>
                <div className="stat-value" style={{ color: 'var(--status-unknown-text)' }}>
                  {confirmationNeededFindings.length}
                </div>
                <div className="stat-label">Needs Confirmation</div>
              </div>
            </div>
          )}

          <div className="stat-box">
            <div className="stat-icon unknown">
              <HelpCircle size={20} />
            </div>
            <div>
              <div className="stat-value" style={{ color: 'var(--status-unknown-text)' }}>
                {unknownFindings.length}
              </div>
              <div className="stat-label">Uncertain / Ambiguous</div>
            </div>
          </div>

          {missingFindings.length > 0 && (
            <div className="stat-box">
              <div className="stat-icon missing">
                <HelpCircle size={20} />
              </div>
              <div>
                <div className="stat-value" style={{ color: '#475569' }}>
                  {missingFindings.length}
                </div>
                <div className="stat-label">Missing / Illegible</div>
              </div>
            </div>
          )}

          <div className="stat-box">
            <div className="stat-icon evaluated">
              <CheckCircle size={20} />
            </div>
            <div>
              <div className="stat-value" style={{ color: 'var(--status-neutral-text)' }}>
                {evaluatedNoConflictFindings.length}
              </div>
              <div className="stat-label">No Conflict Found</div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard View Navigation Tabs */}
      <div className="tabs-header-bar">
        <button
          className={`tab-btn ${activeTab === 'findings' ? 'active' : ''}`}
          onClick={() => setActiveTab('findings')}
        >
          <span>Dietary Findings</span>
          <span className="tab-count">{findings.length}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'nutrition' ? 'active' : ''}`}
          onClick={() => setActiveTab('nutrition')}
        >
          <Activity size={16} />
          <span>Nutrition Breakdown</span>
          <span className="tab-count">{nutritionList.length}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'extracted' ? 'active' : ''}`}
          onClick={() => setActiveTab('extracted')}
        >
          <Layers size={16} />
          <span>Extracted Label Data</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'evidence' ? 'active' : ''}`}
          onClick={() => setActiveTab('evidence')}
        >
          <FileCheck2 size={16} />
          <span>Evidence & Ground Truth</span>
        </button>
      </div>

      {/* Tab 1: Findings */}
      {activeTab === 'findings' && (
        <div>
          {/* Category Filter Pills (Deliverables 4, 5, 6) */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            <button
              className={`chip ${filterCategory === 'all' ? 'selected' : ''}`}
              onClick={() => setFilterCategory('all')}
            >
              All Findings ({findings.length})
            </button>

            {contradictionFindings.length > 0 && (
              <button
                className={`chip ${filterCategory === 'contradiction' ? 'selected' : ''}`}
                onClick={() => setFilterCategory('contradiction')}
                style={{
                  borderColor: filterCategory === 'contradiction' ? '#9333ea' : undefined,
                  color: filterCategory === 'contradiction' ? '#7e22ce' : undefined,
                  fontWeight: 700,
                }}
              >
                Contradictions ({contradictionFindings.length})
              </button>
            )}

            {conflictFindings.length > 0 && (
              <button
                className={`chip ${filterCategory === 'conflict' ? 'selected' : ''}`}
                onClick={() => setFilterCategory('conflict')}
                style={{
                  borderColor: filterCategory === 'conflict' ? 'var(--status-conflict-badge)' : undefined,
                }}
              >
                Conflicts ({conflictFindings.length})
              </button>
            )}

            {confirmationNeededFindings.length > 0 && (
              <button
                className={`chip ${filterCategory === 'confirmation' ? 'selected' : ''}`}
                onClick={() => setFilterCategory('confirmation')}
                style={{
                  borderColor: filterCategory === 'confirmation' ? '#d97706' : undefined,
                  color: filterCategory === 'confirmation' ? '#b45309' : undefined,
                }}
              >
                Needs Confirmation ({confirmationNeededFindings.length})
              </button>
            )}

            {unknownFindings.length > 0 && (
              <button
                className={`chip ${filterCategory === 'unknown' ? 'selected' : ''}`}
                onClick={() => setFilterCategory('unknown')}
                style={{
                  borderColor: filterCategory === 'unknown' ? 'var(--status-unknown-badge)' : undefined,
                }}
              >
                Uncertain / Ambiguous ({unknownFindings.length})
              </button>
            )}

            {missingFindings.length > 0 && (
              <button
                className={`chip ${filterCategory === 'missing' ? 'selected' : ''}`}
                onClick={() => setFilterCategory('missing')}
              >
                Missing Info ({missingFindings.length})
              </button>
            )}

            {evaluatedNoConflictFindings.length > 0 && (
              <button
                className={`chip ${filterCategory === 'no_conflict_found' ? 'selected' : ''}`}
                onClick={() => setFilterCategory('no_conflict_found')}
              >
                No Conflict Found ({evaluatedNoConflictFindings.length})
              </button>
            )}

            {infoFindings.length > 0 && (
              <button
                className={`chip ${filterCategory === 'informational' ? 'selected' : ''}`}
                onClick={() => setFilterCategory('informational')}
              >
                Informational ({infoFindings.length})
              </button>
            )}
          </div>

          {/* Finding Cards List */}
          {displayedFindings.length === 0 ? (
            <div className="card glass-card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              No findings match the selected filter category.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {displayedFindings.map((finding, idx) => (
                <FindingCard key={idx} finding={finding} index={idx} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Nutrition Breakdown & Limit Visualizer */}
      {activeTab === 'nutrition' && (
        <div className="card glass-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Nutritional Facts & Profile Thresholds</h3>
              <p className="card-description">
                Extracted nutrient metrics compared against daily values and custom user thresholds.
              </p>
            </div>
          </div>

          {nutritionList.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              No nutrition panel metrics detected in the provided images.
            </div>
          ) : (
            <div className="nutrition-meters-grid">
              {nutritionList.map((nutrient, idx) => {
                // Find matching profile threshold if any
                const normalizedKey = (nutrient.name || '').toLowerCase().replace(/\s+/g, '_');
                const userLimit = profile?.nutrition_limits?.[normalizedKey];
                const hasLimit = userLimit && userLimit.enabled && !isNaN(Number(userLimit.value));
                const limitVal = hasLimit ? Number(userLimit.value) : null;
                const isExceeded = hasLimit && nutrient.value !== null && Number(nutrient.value) > limitVal;

                // Determine representative daily percentage if available
                const valNum = Number(nutrient.value);
                const percentBar = isNaN(valNum) ? 0 : Math.min(100, (valNum / (limitVal || 50)) * 100);

                return (
                  <div key={idx} className={`nutrition-meter-card ${isExceeded ? 'exceeded' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div className="nutrient-name">{nutrient.name}</div>
                        <div className="nutrient-serving">{nutrient.serving_basis || 'per serving'}</div>
                      </div>
                      <div className="nutrient-value-badge">
                        {nutrient.value !== null && nutrient.value !== undefined ? (
                          <span>
                            <strong>{nutrient.value}</strong> {nutrient.unit || ''}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Unreadable</span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar Visualizer */}
                    {nutrient.value !== null && (
                      <div className="meter-track">
                        <div
                          className={`meter-fill ${isExceeded ? 'danger' : 'normal'}`}
                          style={{ width: `${Math.max(8, percentBar)}%` }}
                        />
                      </div>
                    )}

                    {hasLimit && (
                      <div className="meter-threshold-text">
                        <span>Configured Limit: {limitVal} {nutrient.unit || userLimit.unit}</span>
                        {isExceeded ? (
                          <span className="text-danger" style={{ fontWeight: 700 }}>Exceeded by {(valNum - limitVal).toFixed(1)} {nutrient.unit}</span>
                        ) : (
                          <span className="text-success">Within Limit</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Extracted Label Data */}
      {activeTab === 'extracted' && (
        <ExtractedLabelView extracted={extracted} />
      )}

      {/* Tab 4: Evidence & Photos */}
      {activeTab === 'evidence' && (
        <EvidencePanel
          images={images}
          findings={findings}
          extracted={extracted}
        />
      )}

      {/* Strict Medical Non-Guarantee Notice */}
      <div className="disclaimer-banner" role="note" style={{ marginTop: 36 }}>
        <ShieldAlert size={24} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>LabelLens Scientific Transparency Statement:</strong>
          <p style={{ marginTop: 4 }}>
            LabelLens NEVER declares a food product "completely safe." Findings are derived strictly from readable packaging pixels processed through Vision AI and deterministic logic. A status of <em>"no_conflict_found"</em> indicates only that no matching allergen term was detected in legible sections. If you have severe allergies, always consult with the manufacturer and examine the physical product.
          </p>
        </div>
      </div>
    </div>
  );
}
