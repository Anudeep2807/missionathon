import { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle } from 'lucide-react';

export default function CameraModal({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const [cameraError, setCameraError] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(true);

  const startCamera = async (mode) => {
    setCameraLoading(true);
    setCameraError(null);

    // Stop any existing tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraLoading(false);
    } catch (err) {
      console.warn('Camera initiation failed:', err);
      // Fallback without facingMode constraint
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play();
        }
        setCameraLoading(false);
      } catch (fallbackErr) {
        setCameraError(
          'Could not access camera. Please allow camera permissions or upload an image file instead.'
        );
        setCameraLoading(false);
      }
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `label-capture-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        const previewUrl = URL.createObjectURL(file);
        setCapturedPhoto({ file, previewUrl });
      },
      'image/jpeg',
      0.92
    );
  };

  const handleConfirm = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto.file);
      onClose();
    }
  };

  const handleRetake = () => {
    if (capturedPhoto?.previewUrl) {
      URL.revokeObjectURL(capturedPhoto.previewUrl);
    }
    setCapturedPhoto(null);
    startCamera(facingMode);
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className="crop-modal-backdrop" role="dialog" aria-modal="true">
      <div className="camera-modal-container">
        {/* Header */}
        <div className="camera-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Camera size={20} className="text-emerald-500" />
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
              {capturedPhoto ? 'Review Label Photo' : 'Capture Label Photo'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewfinder area */}
        <div className="camera-viewport">
          {cameraError ? (
            <div className="camera-error-view">
              <AlertCircle size={36} color="#ef4444" />
              <p style={{ marginTop: 12, fontWeight: 600 }}>{cameraError}</p>
              <button
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 16 }}
                onClick={() => startCamera(facingMode)}
              >
                Retry Camera
              </button>
            </div>
          ) : capturedPhoto ? (
            <img
              src={capturedPhoto.previewUrl}
              alt="Captured Food Label"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  background: '#000',
                }}
              />
              {/* Scan Reticle / Framing Overlay */}
              <div className="viewfinder-frame">
                <div className="corner-tl" />
                <div className="corner-tr" />
                <div className="corner-bl" />
                <div className="corner-br" />
                <div className="scan-laser" />
              </div>
              {cameraLoading && (
                <div className="camera-loading-overlay">
                  <RefreshCw size={28} className="animate-spin text-white" />
                  <span style={{ color: '#fff', marginTop: 10, fontSize: '0.9rem' }}>
                    Initializing camera sensor...
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="camera-modal-actions">
          {capturedPhoto ? (
            <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleRetake}
              >
                <RefreshCw size={16} />
                Retake
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirm}
              >
                <Check size={16} />
                Use This Photo
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={toggleCamera}
                title="Switch Camera (Front/Rear)"
              >
                <RefreshCw size={16} />
                Switch Lens
              </button>

              <button
                type="button"
                className="btn-shutter"
                onClick={handleCapture}
                disabled={Boolean(cameraError) || cameraLoading}
                aria-label="Capture photo"
              >
                <div className="btn-shutter-inner" />
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
