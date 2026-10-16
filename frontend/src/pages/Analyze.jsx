import { useState } from 'react';
import {
  Sparkles,
  Sliders,
  FileCheck2,
  Zap,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Clock,
  Layers,
} from 'lucide-react';
import ImageUploader from '../components/ImageUploader';
import LoadingState from '../components/LoadingState';
import ErrorMessage from '../components/ErrorMessage';
import { analyzeLabel, ApiError } from '../services/api';
import { formatProfileForBackend } from '../utils/storage';
import { rotateImage } from '../utils/imageHelpers';
import { SAMPLE_PRODUCTS, SAMPLE_ANALYSIS_RESPONSE } from '../utils/mockData';

export default function Analyze({
  images,
  setImages,
  profile,
  onNavigate,
  onAnalysisSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [abortController, setAbortController] = useState(null);
  const [selectedPresetId, setSelectedPresetId] = useState(null);

  const activeAllergens = [
    ...(profile.allergens_to_avoid || []),
    ...(profile.custom_allergens || []),
  ];

  const activeLimitsCount = Object.values(profile.nutrition_limits || {}).filter(
    (l) => l && l.enabled
  ).length;

  const handleStartAnalysis = async () => {
    if (images.length === 0) {
      setError(new ApiError('Please upload or snap at least one food label photo to analyze.', 400));
      return;
    }

    setError(null);
    setLoading(true);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      // 1. Prepare images: Apply any pending rotations to canvas files
      const preparedFiles = await Promise.all(
        images.map(async (item) => {
          if (item.rotation && item.rotation !== 0) {
            return await rotateImage(item.file, item.rotation);
          }
          return item.file;
        })
      );

      // 2. Format dietary profile to backend schema
      const backendProfile = formatProfileForBackend(profile);

      // 3. Send request to FastAPI backend
      const result = await analyzeLabel(preparedFiles, backendProfile, {
        signal: controller.signal,
      });

      // 4. On success, store result and transition to Results view
      onAnalysisSuccess(result);
      onNavigate('results');
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Analysis aborted by user.');
      } else {
        console.error('Analysis error:', err);
        setError(err);
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  const handleCancelAnalysis = () => {
    if (abortController) {
      abortController.abort();
    }
    setLoading(false);
  };

  const handleSelectPreset = (preset) => {
    setSelectedPresetId(preset.id);
    onAnalysisSuccess(preset.response);
    onNavigate('results');
  };

  return (
    <div className="container" style={{ paddingTop: 16 }}>
      {/* Header section */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="hero-badge" style={{ marginBottom: 8, display: 'inline-flex' }}>
            <Zap size={14} />
            <span>AI Label Scanning Engine</span>
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Packaged-Food Label Workspace
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: 4, maxWidth: 650 }}>
            Upload or snap photos of ingredients, allergen boxes, and nutrition facts. Our deterministic AI engine extracts text and checks it against your profile.
          </p>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onNavigate('profile')}
          style={{ borderRadius: 9999 }}
        >
          <Sliders size={15} />
          Edit Dietary Profile
        </button>
      </div>

      {/* Preset Testing Shelf */}
      <div className="preset-shelf-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="icon-pulse-wrapper">
              <Sparkles size={16} color="var(--primary-600)" />
            </div>
            <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
              Quick Test Scenarios (1-Click Real Verification)
            </strong>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            No photo required
          </span>
        </div>

        <div className="preset-chips-grid">
          {SAMPLE_PRODUCTS.map((prod) => {
            const isConflict = prod.badgeType === 'conflict';
            const isUnknown = prod.badgeType === 'unknown';
            return (
              <div
                key={prod.id}
                className="preset-product-item"
                onClick={() => handleSelectPreset(prod)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSelectPreset(prod)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
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
                      <CheckCircle2 size={12} />
                    )}
                    {prod.badge}
                  </span>
                </div>

                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                  {prod.name}
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 10 }}>
                  {prod.summary}
                </p>

                <div className="preset-action-link">
                  <span>Run Verification</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {loading ? (
        <LoadingState onCancel={handleCancelAnalysis} />
      ) : (
        <div className="analyze-grid" style={{ marginTop: 24 }}>
          {/* Left Column: Image Upload & Workspace */}
          <div>
            <div className="card glass-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">1. Upload or Capture Label Photos</h3>
                  <p className="card-description">
                    Provide photos of the ingredients list, allergen box, and nutrition facts.
                  </p>
                </div>
              </div>

              <ImageUploader images={images} setImages={setImages} />
            </div>

            {/* Error Message display */}
            {error && (
              <ErrorMessage
                error={error}
                onRetry={handleStartAnalysis}
                onLoadSample={() => handleSelectPreset(SAMPLE_PRODUCTS[0])}
              />
            )}
          </div>

          {/* Right Column: Active Profile Summary & Submit */}
          <div>
            <div className="card glass-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">2. Evaluation Restrictions</h3>
                  <p className="card-description">
                    Rules checked during this analysis run.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onNavigate('profile')}
                >
                  <Sliders size={14} />
                  Configure
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Dietary Lifestyle
                  </span>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', textTransform: 'capitalize', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="dot-indicator" />
                    {profile.dietary_preference || 'None'}
                    {profile.dietary_preference === 'custom' && profile.dietary_preferences_custom
                      ? ` (${profile.dietary_preferences_custom})`
                      : ''}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Allergens Monitored
                    </span>
                    <span className="count-pill">{activeAllergens.length}</span>
                  </div>
                  <div className="chips-container" style={{ marginTop: 8 }}>
                    {activeAllergens.length > 0 ? (
                      activeAllergens.map((a) => (
                        <span key={a} className="chip selected" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                          {a}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        No specific allergens checked
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Ingredients to Avoid
                    </span>
                    <span className="count-pill">{(profile.ingredients_to_avoid || []).length}</span>
                  </div>
                  <div className="chips-container" style={{ marginTop: 8 }}>
                    {(profile.ingredients_to_avoid || []).length > 0 ? (
                      profile.ingredients_to_avoid.map((item) => (
                        <span key={item} className="chip selected" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                          {item}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        None configured
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Nutrition Thresholds
                    </span>
                    <span className="count-pill">{activeLimitsCount}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    {activeLimitsCount > 0
                      ? `${activeLimitsCount} nutrient limits enabled against readable panel data.`
                      : 'No nutrition limits enabled.'}
                  </p>
                </div>
              </div>

              {/* Analyze CTA */}
              <div style={{ marginTop: 24, borderTop: '1px solid var(--border-light)', paddingTop: 20 }}>
                <button
                  className="btn btn-primary btn-lg pulse-glow"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={handleStartAnalysis}
                  disabled={images.length === 0 || loading}
                >
                  <Sparkles size={20} />
                  Analyze {images.length > 0 ? `${images.length} Image${images.length > 1 ? 's' : ''}` : 'Product'}
                </button>

                {images.length === 0 ? (
                  <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 10 }}>
                    Upload or snap a photo, or choose a preset above
                  </p>
                ) : (
                  <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--primary-600)', marginTop: 10, fontWeight: 500 }}>
                    Ready to scan {images.length} photo{images.length > 1 ? 's' : ''} with Vision AI
                  </p>
                )}
              </div>
            </div>

            {/* Safety Assurance Note */}
            <div
              style={{
                marginTop: 20,
                padding: '16px',
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(240, 249, 255, 0.6)',
                border: '1px solid rgba(186, 230, 253, 0.8)',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <ShieldAlert size={20} color="var(--primary-700)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                <strong style={{ color: 'var(--text-primary)' }}>LabelLens Verification Standard:</strong>{' '}
                Findings provide verbatim package quotes and unreadable flags. We never hallucinate safety guarantees.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
