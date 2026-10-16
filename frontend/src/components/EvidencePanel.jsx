import React, { useState } from 'react';
import { Eye, Image as ImageIcon, CheckCircle, AlertTriangle, HelpCircle, FileText } from 'lucide-react';

export default function EvidencePanel({ images, findings, extracted }) {
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  const hasImages = images && images.length > 0;
  const currentImage = hasImages && images[selectedImageIdx] ? images[selectedImageIdx] : null;

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div className="card-header">
        <div>
          <h3 className="card-title">
            <FileText size={20} color="var(--primary-700)" />
            Source Evidence & Visual Reference
          </h3>
          <p className="card-description">
            Inspect the source photographs alongside verified textual evidence.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: hasImages ? '1fr 1fr' : '1fr', gap: 24 }}>
        {/* Left: Source Image Viewport */}
        {hasImages && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto' }}>
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  className={`btn btn-sm ${selectedImageIdx === idx ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSelectedImageIdx(idx)}
                >
                  <ImageIcon size={14} />
                  Photo #{idx + 1}
                </button>
              ))}
            </div>

            <div
              style={{
                background: '#0f172a',
                borderRadius: 'var(--radius-md)',
                height: 360,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {currentImage?.previewUrl ? (
                <img
                  src={currentImage.previewUrl}
                  alt={`Source Label #${selectedImageIdx + 1}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    transform: `rotate(${currentImage.rotation || 0}deg)`,
                  }}
                />
              ) : (
                <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                  No preview available
                </span>
              )}
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
              Photo #{selectedImageIdx + 1}: {currentImage?.file?.name || 'Uploaded Label'}
            </p>
          </div>
        )}

        {/* Right: Evidence Citations Summary */}
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
            Cited Label Wording by Restriction
          </h4>

          {findings && findings.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
              {findings.map((f, idx) => {
                const hasEvidence = Array.isArray(f.evidence) && f.evidence.length > 0;
                return (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      background: f.status === 'conflict' ? '#fffafa' : '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        {f.rule || f.title || 'Check'}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '2px 6px',
                          borderRadius: 4,
                          background:
                            f.status === 'conflict'
                              ? '#fee2e2'
                              : f.status === 'no_conflict_found'
                              ? '#e0f2fe'
                              : '#fef3c7',
                          color:
                            f.status === 'conflict'
                              ? '#991b1b'
                              : f.status === 'no_conflict_found'
                              ? '#0369a1'
                              : '#92400e',
                        }}
                      >
                        {f.status}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                      {f.message}
                    </p>

                    {hasEvidence ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {f.evidence.map((ev, eIdx) => (
                          <div
                            key={eIdx}
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.78rem',
                              background: 'var(--bg-subtle)',
                              padding: '4px 8px',
                              borderRadius: 4,
                              color: 'var(--text-primary)',
                            }}
                          >
                            Source: "{ev}"
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No direct matching phrase cited in label text.
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              No findings to display evidence for.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
