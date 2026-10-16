import React from 'react';
import { AlertOctagon, RefreshCw, Terminal, Sparkles, ExternalLink } from 'lucide-react';

export default function ErrorMessage({ error, onRetry, onLoadSample }) {
  if (!error) return null;

  const isNetworkOrOffline =
    error.status === 0 ||
    error.message?.toLowerCase().includes('connect') ||
    error.message?.toLowerCase().includes('failed to fetch');

  const isApi502 = error.status === 502;
  const isApi429 = error.status === 429 || error.message?.includes('429') || error.message?.toLowerCase().includes('rate limit');
  const isTimeout = error.status === 408;

  return (
    <div
      className="card"
      style={{
        border: '1px solid #fecaca',
        background: '#fffafa',
        padding: '28px',
        maxWidth: 680,
        margin: '24px auto',
      }}
      role="alert"
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-md)',
            background: '#fee2e2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <AlertOctagon size={26} />
        </div>

        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#991b1b', marginBottom: 6 }}>
            {isNetworkOrOffline
              ? 'FastAPI Backend Not Reachable'
              : isApi429
              ? 'Groq AI Provider Rate Limit (Free Tier)'
              : isApi502
              ? 'Vision Analysis Error'
              : isTimeout
              ? 'Request Timed Out'
              : 'Analysis Could Not Be Completed'}
          </h3>

          <p style={{ fontSize: '0.92rem', color: '#7f1d1d', lineHeight: 1.5, marginBottom: 16 }}>
            {error.message}
          </p>

          {/* Actionable troubleshooting tips */}
          {isNetworkOrOffline && (
            <div
              style={{
                background: '#fff',
                border: '1px solid #fed7d7',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                marginBottom: 18,
                fontSize: '0.85rem',
                color: '#4a5568',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 6, color: '#2d3748' }}>
                <Terminal size={15} />
                To run the local backend:
              </div>
              <ol style={{ paddingLeft: 18, lineHeight: 1.6 }}>
                <li>Ensure dependencies are installed: <code>pip install -r requirements.txt</code></li>
                <li>Set <code>GROQ_API_KEY</code> in <code>server/.env</code></li>
                <li>Start server: <code>uvicorn app.main:app --reload --port 8000</code></li>
              </ol>
            </div>
          )}

          {isApi429 && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                marginBottom: 18,
                fontSize: '0.85rem',
                color: '#92400e',
              }}
            >
              <strong>Tip:</strong> Groq's on-demand free tier limits output to 1,000 tokens per minute. We optimized the request to stay under 800 tokens. If you just sent a request, please wait 30 seconds before retrying or test with a sample product preset below.
            </div>
          )}

          {isApi502 && !isApi429 && (
            <div
              style={{
                background: '#fff',
                border: '1px solid #fed7d7',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                marginBottom: 18,
                fontSize: '0.85rem',
                color: '#4a5568',
              }}
            >
              <strong>Tip:</strong> Ensure your <code>GROQ_API_KEY</code> is configured in the backend's <code>.env</code> file. Alternatively, try uploading a well-lit, higher-contrast photo of the label.
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {onRetry && (
              <button className="btn btn-primary btn-sm" onClick={onRetry}>
                <RefreshCw size={16} />
                Retry Analysis
              </button>
            )}

            {onLoadSample && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={onLoadSample}
                title="View the results dashboard with a full sample package label payload"
              >
                <Sparkles size={16} />
                Test With Sample Label Result
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
