// Image helper utilities for validation, transformation, rotation, and cropping

export const MAX_IMAGES = 5;
export const MAX_IMAGE_MB = 10;
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
export const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

/**
 * Validate a single file for size and type
 */
export function validateImageFile(file) {
  if (!file) return { valid: false, error: 'No file provided.' };

  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  const validMime = ACCEPTED_MIME_TYPES.includes(file.type);
  const validExt = ACCEPTED_EXTENSIONS.includes(ext);

  if (!validMime && !validExt) {
    return {
      valid: false,
      error: `"${file.name}" has an unsupported format. Please upload JPEG, PNG, or WebP.`,
    };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `"${file.name}" is ${sizeMb} MB, which exceeds the ${MAX_IMAGE_MB} MB limit.`,
    };
  }

  return { valid: true };
}

/**
 * Convert an image file or blob to an Image element
 */
export function loadImageElement(fileOrBlob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fileOrBlob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image preview: ' + err));
    };
    img.src = url;
  });
}

/**
 * Apply rotation (in multiples of 90 degrees) to an image and return a new File
 */
export async function rotateImage(file, angleDegrees) {
  const normalizedAngle = ((angleDegrees % 360) + 360) % 360;
  if (normalizedAngle === 0) return file;

  const img = await loadImageElement(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (normalizedAngle === 90 || normalizedAngle === 270) {
    canvas.width = img.height;
    canvas.height = img.width;
  } else {
    canvas.width = img.width;
    canvas.height = img.height;
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((normalizedAngle * Math.PI) / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);

  return new Promise((resolve) => {
    const type = file.type || 'image/jpeg';
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(file);
        return;
      }
      const newFile = new File([blob], file.name, {
        type,
        lastModified: Date.now(),
      });
      resolve(newFile);
    }, type, 0.92);
  });
}

/**
 * Crop an image given normalized coordinates (0 to 1) or pixel coordinates
 */
export async function cropImage(file, cropRect) {
  const img = await loadImageElement(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // cropRect = { x, y, width, height } in pixel coordinates relative to original image
  const { x, y, width, height } = cropRect;
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  ctx.drawImage(
    img,
    x,
    y,
    width,
    height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return new Promise((resolve) => {
    const type = file.type || 'image/jpeg';
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(file);
        return;
      }
      const newFile = new File([blob], `cropped_${file.name}`, {
        type,
        lastModified: Date.now(),
      });
      resolve(newFile);
    }, type, 0.95);
  });
}

/**
 * Format bytes to readable string (e.g. 1.2 MB)
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
