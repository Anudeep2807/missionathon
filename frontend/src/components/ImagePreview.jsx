import React, { useState } from 'react';
import { RotateCw, Crop, Trash2, Maximize2, AlertCircle } from 'lucide-react';
import { formatFileSize } from '../utils/imageHelpers';

export default function ImagePreview({
  images,
  onRotate,
  onOpenCrop,
  onRemove,
  onClearAll,
}) {
  const [fullscreenImage, setFullscreenImage] = useState(null);

  if (!images || images.length === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Selected Label Photos ({images.length} of 5)
        </h4>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onClearAll}
          style={{ fontSize: '0.8rem', color: '#dc2626' }}
        >
          Clear All
        </button>
      </div>

      <div className="image-previews-grid">
        {images.map((item, idx) => (
          <div key={item.id} className="preview-card">
            <div className="preview-thumb-container">
              <span className="preview-badge-idx">#{idx + 1}</span>
              <img
                src={item.previewUrl}
                alt={item.file.name}
                className="preview-img"
                style={{
                  transform: `rotate(${item.rotation || 0}deg)`,
                }}
              />
            </div>

            <div className="preview-meta">
              <div>
                <p className="preview-name" title={item.file.name}>
                  {item.file.name}
                </p>
                <p className="preview-size">
                  {formatFileSize(item.file.size)}
                  {item.rotation ? ` • Rotated ${item.rotation}°` : ''}
                </p>
              </div>

              <div className="preview-actions">
                <button
                  type="button"
                  className="icon-btn"
                  title="Rotate 90° Clockwise"
                  onClick={() => onRotate(item.id)}
                  aria-label="Rotate image clockwise"
                >
                  <RotateCw size={17} />
                </button>

                <button
                  type="button"
                  className="icon-btn"
                  title="Crop Image"
                  onClick={() => onOpenCrop(item)}
                  aria-label="Crop image"
                >
                  <Crop size={17} />
                </button>

                <button
                  type="button"
                  className="icon-btn"
                  title="View Full Size"
                  onClick={() => setFullscreenImage(item)}
                  aria-label="View full size image"
                >
                  <Maximize2 size={17} />
                </button>

                <button
                  type="button"
                  className="icon-btn danger"
                  title="Remove Image"
                  onClick={() => onRemove(item.id)}
                  aria-label="Remove image"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {fullscreenImage && (
        <div
          className="modal-backdrop"
          onClick={() => setFullscreenImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: '#0f172a',
              padding: 16,
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                color: '#fff',
                marginBottom: 10,
                fontSize: '0.9rem',
              }}
            >
              <span>{fullscreenImage.file.name}</span>
              <button
                className="icon-btn"
                style={{ color: '#fff' }}
                onClick={() => setFullscreenImage(null)}
              >
                ✕ Close
              </button>
            </div>
            <img
              src={fullscreenImage.previewUrl}
              alt="Fullscreen Preview"
              style={{
                maxWidth: '85vw',
                maxHeight: '80vh',
                objectFit: 'contain',
                transform: `rotate(${fullscreenImage.rotation || 0}deg)`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
