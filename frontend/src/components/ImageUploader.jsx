import { useState, useRef } from 'react';
import { UploadCloud, Camera, AlertCircle, Info, Sparkles, Plus } from 'lucide-react';
import ImagePreview from './ImagePreview';
import CropModal from './CropModal';
import CameraModal from './CameraModal';
import {
  MAX_IMAGES,
  MAX_IMAGE_MB,
  validateImageFile,
} from '../utils/imageHelpers';

export default function ImageUploader({ images, setImages }) {
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [croppingItem, setCroppingItem] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef(null);

  const processFiles = (newFiles) => {
    setErrorMessage('');
    const fileList = Array.from(newFiles);

    if (images.length + fileList.length > MAX_IMAGES) {
      setErrorMessage(`You can upload a maximum of ${MAX_IMAGES} label images. Please remove some or select fewer.`);
      return;
    }

    const validatedItems = [];
    for (const file of fileList) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setErrorMessage(validation.error);
        return;
      }

      const id = `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const previewUrl = URL.createObjectURL(file);
      validatedItems.push({
        id,
        file,
        previewUrl,
        rotation: 0,
      });
    }

    setImages((prev) => [...prev, ...validatedItems]);
  };

  const handleCameraCapture = (file) => {
    processFiles([file]);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleRotate = async (id) => {
    setImages((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextRotation = (item.rotation + 90) % 360;
          return { ...item, rotation: nextRotation };
        }
        return item;
      })
    );
  };

  const handleCropComplete = (id, newCroppedFile) => {
    const newPreviewUrl = URL.createObjectURL(newCroppedFile);
    setImages((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          URL.revokeObjectURL(item.previewUrl);
          return {
            ...item,
            file: newCroppedFile,
            previewUrl: newPreviewUrl,
            rotation: 0,
          };
        }
        return item;
      })
    );
    setCroppingItem(null);
  };

  const handleRemove = (id) => {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleClearAll = () => {
    images.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setImages([]);
    setErrorMessage('');
  };

  return (
    <div>
      {/* Upload Zone */}
      <div
        className={`dropzone ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        role="region"
        aria-label="Image Upload Dropzone"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div className="dropzone-icon">
          <UploadCloud size={32} />
        </div>

        <p className="dropzone-text-primary">
          Drag & drop food package labels here
        </p>
        <p className="dropzone-text-secondary">
          High-resolution photos of ingredients, allergen declarations, or nutrition facts
        </p>

        {/* Action Buttons: Browse and Camera */}
        <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => fileInputRef.current?.click()}
            style={{ borderRadius: 9999, padding: '8px 18px' }}
          >
            <Plus size={16} />
            Browse Files
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setCameraOpen(true)}
            style={{ borderRadius: 9999, padding: '8px 18px' }}
          >
            <Camera size={16} />
            Take Photo with Camera
          </button>
        </div>

        <div className="dropzone-specs">
          <span>• JPEG, PNG, or WebP</span>
          <span>• Max {MAX_IMAGE_MB} MB per file</span>
          <span>• Up to {MAX_IMAGES} photos ({images.length}/{MAX_IMAGES} uploaded)</span>
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#dc2626',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            marginTop: 12,
            fontSize: '0.88rem',
          }}
          role="alert"
        >
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Photography Tips */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          background: 'var(--bg-subtle)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          marginTop: 14,
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          alignItems: 'flex-start',
        }}
      >
        <Info size={18} style={{ color: 'var(--primary-600)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong>Photo Quality Tip:</strong> Ensure adequate lighting without heavy glare. If the packaging is cylindrical or curved, snap 2 or 3 overlapping angles so every line of text is fully readable.
        </div>
      </div>

      {/* Selected Image Previews */}
      <ImagePreview
        images={images}
        onRotate={handleRotate}
        onOpenCrop={(item) => setCroppingItem(item)}
        onRemove={handleRemove}
        onClearAll={handleClearAll}
      />

      {/* Interactive Crop Modal */}
      {croppingItem && (
        <CropModal
          imageItem={croppingItem}
          onCropComplete={handleCropComplete}
          onClose={() => setCroppingItem(null)}
        />
      )}

      {/* Interactive Camera Modal */}
      {cameraOpen && (
        <CameraModal
          onCapture={handleCameraCapture}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
}
