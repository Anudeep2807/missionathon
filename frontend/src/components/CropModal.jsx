import { useState, useRef, useEffect } from 'react';
import { Crop, Check, X } from 'lucide-react';
import { cropImage } from '../utils/imageHelpers';

export default function CropModal({ imageItem, onCropComplete, onClose }) {
  const [crop, setCrop] = useState({
    xPercent: 10,
    yPercent: 10,
    widthPercent: 80,
    heightPercent: 80,
  });

  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [previewDataUrl, setPreviewDataUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!imageItem?.file) return;
    const url = URL.createObjectURL(imageItem.file);
    setPreviewDataUrl(url);

    const testImg = new Image();
    testImg.onload = () => {
      setNaturalSize({ width: testImg.naturalWidth, height: testImg.naturalHeight });
    };
    testImg.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageItem]);

  const handleApply = async () => {
    if (!imageItem?.file || naturalSize.width === 0) return;
    setIsProcessing(true);
    try {
      const pixelCrop = {
        x: (crop.xPercent / 100) * naturalSize.width,
        y: (crop.yPercent / 100) * naturalSize.height,
        width: (crop.widthPercent / 100) * naturalSize.width,
        height: (crop.heightPercent / 100) * naturalSize.height,
      };

      const croppedFile = await cropImage(imageItem.file, pixelCrop);
      onCropComplete(imageItem.id, croppedFile);
    } catch (err) {
      console.error('Error applying crop:', err);
      alert('Failed to crop image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const setPreset = (preset) => {
    if (preset === 'full') {
      setCrop({ xPercent: 0, yPercent: 0, widthPercent: 100, heightPercent: 100 });
    } else if (preset === 'top') {
      setCrop({ xPercent: 5, yPercent: 5, widthPercent: 90, heightPercent: 45 });
    } else if (preset === 'bottom') {
      setCrop({ xPercent: 5, yPercent: 50, widthPercent: 90, heightPercent: 45 });
    } else if (preset === 'center') {
      setCrop({ xPercent: 15, yPercent: 15, widthPercent: 70, heightPercent: 70 });
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="crop-title">
      <div className="modal-content">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Crop size={20} color="var(--primary-700)" />
            <h3 id="crop-title" style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              Crop Label Photo
            </h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Focus on the ingredients list, nutrition facts, or allergen statement for best Vision AI accuracy.
          </p>

          {/* Quick presets */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, alignSelf: 'center', marginRight: 4 }}>
              Presets:
            </span>
            <button className="btn btn-secondary btn-sm" onClick={() => setPreset('center')}>
              Center (70%)
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setPreset('top')}>
              Top Section
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setPreset('bottom')}>
              Bottom Section
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setPreset('full')}>
              Reset (100%)
            </button>
          </div>

          {/* Image & Interactive Crop Preview */}
          <div className="crop-workspace">
            {previewDataUrl && (
              <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', maxHeight: '420px' }}>
                <img
                  ref={imgRef}
                  src={previewDataUrl}
                  alt="Crop preview"
                  style={{
                    display: 'block',
                    maxWidth: '100%',
                    maxHeight: '420px',
                    objectFit: 'contain',
                    userSelect: 'none',
                  }}
                />
                {/* Visual Crop Box Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: `${crop.yPercent}%`,
                    left: `${crop.xPercent}%`,
                    width: `${crop.widthPercent}%`,
                    height: `${crop.heightPercent}%`,
                    border: '2px solid #52b788',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      background: 'rgba(27, 67, 50, 0.85)',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 4,
                    }}
                  >
                    Crop Area
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Fine Tuning Sliders */}
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.82rem' }}>
                Horizontal Span: {crop.widthPercent}%
              </label>
              <input
                type="range"
                min="20"
                max="100"
                value={crop.widthPercent}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  const maxX = 100 - val;
                  setCrop((prev) => ({
                    ...prev,
                    widthPercent: val,
                    xPercent: Math.min(prev.xPercent, maxX),
                  }));
                }}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.82rem' }}>
                Vertical Span: {crop.heightPercent}%
              </label>
              <input
                type="range"
                min="20"
                max="100"
                value={crop.heightPercent}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  const maxY = 100 - val;
                  setCrop((prev) => ({
                    ...prev,
                    heightPercent: val,
                    yPercent: Math.min(prev.yPercent, maxY),
                  }));
                }}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.82rem' }}>
                Horizontal Offset: {crop.xPercent}%
              </label>
              <input
                type="range"
                min="0"
                max={Math.max(0, 100 - crop.widthPercent)}
                value={crop.xPercent}
                onChange={(e) =>
                  setCrop((prev) => ({ ...prev, xPercent: Number(e.target.value) }))
                }
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.82rem' }}>
                Vertical Offset: {crop.yPercent}%
              </label>
              <input
                type="range"
                min="0"
                max={Math.max(0, 100 - crop.heightPercent)}
                value={crop.yPercent}
                onChange={(e) =>
                  setCrop((prev) => ({ ...prev, yPercent: Number(e.target.value) }))
                }
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isProcessing}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleApply} disabled={isProcessing}>
            {isProcessing ? 'Processing...' : (
              <>
                <Check size={18} />
                Apply Crop
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
