// API service for LabelLens backend communication

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location.origin) {
    if (window.location.port !== '5173') {
      return window.location.origin;
    }
  }
  return 'http://localhost:8000';
};

const API_BASE_URL = getApiBaseUrl();
const DEFAULT_TIMEOUT_MS = 60000; // 60s timeout for vision AI processing

/**
 * Custom error class for API errors with actionable status codes and messages
 */
export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Health check to verify if the FastAPI backend is running
 */
export async function checkApiHealth() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) return { online: false, status: response.status };
    const data = await response.json();
    return { online: true, service: data.service, status: response.status };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

/**
 * Send food package label images and user dietary profile to the backend for analysis
 *
 * @param {File[]} images - Array of label image files
 * @param {Object} backendProfile - DietaryProfile formatted for backend
 * @param {Object} options - Optional settings (e.g., custom signal)
 * @returns {Promise<Object>} AnalyzeResponse object
 */
export async function analyzeLabel(images, backendProfile, options = {}) {
  if (!images || images.length === 0) {
    throw new ApiError('Please select at least one label photo to analyze.', 400);
  }

  const formData = new FormData();

  // Append images using the field name "images" for each image as per requirements
  images.forEach((image) => {
    formData.append('images', image);
  });

  // Also append "image" with the primary image to ensure compatibility with
  // FastAPI endpoints expecting a single `image: UploadFile = File(...)`
  formData.append('image', images[0]);

  // Append the JSON-stringified profile
  formData.append('profile', JSON.stringify(backendProfile));

  // Append a unique request_id
  const requestId = options.requestId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req-${Date.now()}`);
  formData.append('request_id', requestId);

  // Setup abort controller for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, options.timeoutMs || DEFAULT_TIMEOUT_MS);

  // Allow external signal to trigger abort as well
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      body: formData,
      // Note: Do not set Content-Type header; the browser sets multipart/form-data with the boundary.
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = '';
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.detail || errorJson.message || JSON.stringify(errorJson);
      } catch {
        errorDetail = await response.text();
      }

      if (response.status === 400) {
        throw new ApiError(
          `Invalid request: ${errorDetail || 'Please verify the dietary profile or uploaded images.'}`,
          400,
          errorDetail
        );
      } else if (response.status === 413) {
        throw new ApiError(
          `Image payload too large: ${errorDetail || 'One or more images exceed the maximum allowed size.'}`,
          413,
          errorDetail
        );
      } else if (response.status === 415) {
        throw new ApiError(
          `Unsupported file format: ${errorDetail || 'Please upload JPEG, PNG, or WebP images.'}`,
          415,
          errorDetail
        );
      } else if (response.status === 422) {
        throw new ApiError(
          `Validation error: ${errorDetail || 'The backend could not process the provided form fields.'}`,
          422,
          errorDetail
        );
      } else if (response.status === 429) {
        throw new ApiError(
          `Provider Rate Limit (429): ${errorDetail || 'Groq free tier limits requests to 1,000 output tokens per minute. Please wait 30 seconds before retrying or use a preset product.'}`,
          429,
          errorDetail
        );
      } else if (response.status === 502) {
        throw new ApiError(
          `Vision analysis failed: ${errorDetail || 'Check server AI configuration or upload a clearer, well-lit label photo.'}`,
          502,
          errorDetail
        );
      } else {
        throw new ApiError(
          `Backend error (${response.status}): ${errorDetail || 'An unexpected server error occurred during label analysis.'}`,
          response.status,
          errorDetail
        );
      }
    }

    const result = await response.json();

    // Verify response schema sanity
    if (!result || typeof result !== 'object') {
      throw new ApiError('Received malformed data from the analysis service.', 500);
    }

    // Attach request_id if not present in backend response
    if (!result.request_id) {
      result.request_id = requestId;
    }

    // Ensure extracted and findings defaults exist
    if (!result.extracted) {
      result.extracted = {
        ingredients: [],
        nutrition: [],
        allergen_statements: [],
        warnings: [],
      };
    }
    if (!Array.isArray(result.findings)) {
      result.findings = [];
    }

    return result;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      throw new ApiError(
        'The analysis request timed out. Processing food labels with Vision AI may take longer on slow connections or large photos. Please try again with a clearer or smaller image.',
        408
      );
    }

    if (err instanceof ApiError) {
      throw err;
    }

    // Network error (e.g. backend server is not running or CORS blocked)
    throw new ApiError(
      `Cannot connect to LabelLens backend at ${API_BASE_URL}. Ensure the FastAPI server is running with 'uvicorn app.main:app --reload'.`,
      0,
      err.message
    );
  }
}
