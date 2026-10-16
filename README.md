# LabelLens Backend (Groq Vision)

The AI-powered backend for **LabelLens** — a smart packaged-food label scanner and dietary verification engine built for consumer nutrition safety.

LabelLens analyzes packaged-food packaging photos using high-speed **Groq Vision**, extracts ingredients, nutrition facts, and allergen warnings, and evaluates them with a deterministic rules engine to check for conflicts with user dietary preferences, allergens, and nutritional limits.

---

## Architecture Overview

```
Client (React / Mobile)
       │  multipart/form-data: images + profile JSON
       ▼
FastAPI Server (app/main.py)
       │
       ├──► 1. Preprocessing (app/preprocessing.py)
       │       • In-memory Pillow validation
       │       • EXIF auto-rotation & size limits (max 5 images, max 10MB each)
       │       • Format enforcement (JPEG, PNG, WebP)
       │
       ├──► 2. AI Extraction (app/analyzer.py)
       │       • Official Groq Python SDK (`groq`)
       │       • Vision model (default: `qwen/qwen3.6-27b` or `llama-3.2-11b-vision-preview`)
       │       • Multi-image overlap deduplication
       │       • Strict JSON schema validation
       │       • Traceable evidence linking
       │
       └──► 3. Deterministic Rules Engine (app/compare.py)
               • Allergen & synonym dictionary evaluation
               • Explicit vs precautionary statement distinction
               • Vegetarian / vegan ambiguity tracking
               • Custom restriction phrase matching
               • Nutrition limit checking (unit & serving-basis safe)
```

---

## 1. Project Structure

```text
server/
├── app/
│   ├── __init__.py           # Package marker
│   ├── config.py             # Environment configuration (GROQ_API_KEY, GROQ_MODEL, limits)
│   ├── schemas.py            # Pydantic data models & request/response contracts
│   ├── preprocessing.py      # In-memory Pillow image sanitization & validation
│   ├── analyzer.py           # Groq Vision SDK extractor & multi-photo deduplication
│   ├── compare.py            # Deterministic dietary comparison rules engine
│   ├── evidence.py           # Evidence tracking and finding builder helpers
│   └── main.py               # FastAPI application, CORS, and API routes
├── tests/
│   ├── __init__.py           # Test package marker
│   ├── test_api.py           # FastAPI TestClient API integration test suite
│   └── test_compare.py       # Deterministic rules engine unit tests
├── requirements.txt          # Python dependencies
├── .env.example              # Environment variables template
├── .env                      # Local environment configuration (gitignored)
├── .gitignore                # Git exclusions
└── README.md                 # Setup, run, and integration documentation
```

---

## 2. Environment Configuration

The backend reads configuration from environment variables via `server/.env`.

### Setting Your Groq API Key

Open `server/.env` and insert your Groq API key:

```env
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
GROQ_MODEL=qwen/qwen3.6-27b
FRONTEND_ORIGINS=http://localhost:5173
MAX_IMAGE_MB=10
MAX_IMAGES=5
```

> [!IMPORTANT]
> - Never hardcode, commit, or push your `GROQ_API_KEY`.
> - `server/.env` is listed in `.gitignore` and must remain private.
> - The health check endpoint (`/api/health`) functions without an API key.

---

## 3. Windows Setup & Run Commands

All commands below assume you are in the `server` directory in Windows PowerShell.

### Step 1: Create & Activate Virtual Environment
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Step 2: Install Dependencies
```powershell
pip install -r requirements.txt
```

### Step 3: Run the Server
To bind to localhost:
```powershell
uvicorn app.main:app --reload --port 8000
```

To bind to `0.0.0.0` for local-network mobile/frontend testing:
```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 4: Verify Health Endpoint
```powershell
curl.exe http://localhost:8000/api/health
```
Expected response:
```json
{"status":"ok"}
```

### Step 5: Open Interactive API Documentation
Open your browser and navigate to:
```text
http://localhost:8000/docs
```

### Step 6: Run Automated Tests
```powershell
pytest -v
```

---

## 4. Groq Vision Model Availability & Verification

### Recommended Vision Models on Groq:
1. `qwen/qwen3.6-27b`: (Default) High-precision 27B multimodal model supporting image input, reasoning, and JSON mode.
2. `llama-3.2-11b-vision-preview`: High-speed multimodal model with low latency.
3. `llama-3.2-90b-vision-preview`: Large vision model for complex document layout parsing.

### Verifying Model Access with Your Groq Key
To verify that your Groq account has access to the configured vision model, run this one-line command in your virtual environment:

```powershell
python -c "from groq import Groq; import os; from app.config import get_settings; s = get_settings(); c = Groq(api_key=s.groq_api_key); print('Available models:'); [print(m.id) for m in c.models.list().data if 'vision' in m.id or 'qwen' in m.id]"
```

If your Groq account uses a specific model name, you can change `GROQ_MODEL` anytime in `server/.env` without code changes.

---

## 5. API Reference & Contract

### Health Check
`GET /api/health`
- **Authentication:** None required.
- **Response:**
  ```json
  {"status": "ok"}
  ```

### Analyze Food Label
`POST /api/analyze`
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `images`: One or more image files (`image/jpeg`, `image/png`, `image/webp`). Send repeated fields with the name `images`.
  - `profile`: Serialized JSON string of user dietary preferences, allergens, and limits.
  - `request_id` (optional): Tracking ID string.

- **Example Response:**
  ```json
  {
    "request_id": "test-uuid",
    "extracted": {
      "product_name": "Organic Oat Cookies",
      "brand": "Nature Delights",
      "serving_size": "2 cookies (30g)",
      "servings_per_container": "8",
      "ingredients": [
        {
          "name": "Peanut paste",
          "original_text": "Roasted peanut paste",
          "is_sub_ingredient": false,
          "parent_ingredient": null,
          "evidence": [
            {
              "source_image_index": 0,
              "text": "Roasted peanut paste",
              "field_name": "ingredients",
              "confidence": 0.95
            }
          ]
        }
      ],
      "nutrition": [
        {
          "name": "Total Sugars",
          "amount": 12.0,
          "unit": "g",
          "serving_basis": "per serving",
          "evidence": []
        }
      ],
      "allergen_statements": [
        {
          "statement_type": "contains",
          "text": "Contains: peanuts",
          "allergens": ["peanuts"],
          "evidence": []
        }
      ],
      "dietary_claims": [],
      "sections": [],
      "warnings": [],
      "extraction_status": "observed"
    },
    "findings": [
      {
        "category": "allergen",
        "status": "conflict",
        "title": "Explicit Allergen Declaration: Peanuts",
        "message": "The package explicitly declares that this product contains peanuts ('Contains: peanuts').",
        "matched_value": "Contains: peanuts",
        "profile_rule": "peanuts",
        "evidence": [],
        "confidence": 1.0
      }
    ]
  }
  ```

---

## 6. Frontend Integration (React)

```javascript
const analyzeLabel = async (imageFiles, userProfile) => {
  const formData = new FormData();

  // 1. Append each selected image under the repeated 'images' key
  imageFiles.forEach((file) => {
    formData.append("images", file);
  });

  // 2. Append profile as a JSON-serialized string
  formData.append("profile", JSON.stringify({
    dietary_preference: userProfile.dietaryPreference, // e.g. "vegan", "vegetarian"
    allergens_to_avoid: userProfile.allergens,         // e.g. ["milk", "peanuts"]
    custom_restrictions: userProfile.customRestrictions, // e.g. ["gelatin"]
    nutrition_limits: {
      sugar_g: userProfile.maxSugar,
      sodium_mg: userProfile.maxSodium,
      calories_kcal: userProfile.maxCalories,
    }
  }));

  // 3. Optional correlation request ID
  formData.append("request_id", crypto.randomUUID());

  const response = await fetch("http://localhost:8000/api/analyze", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Analysis request failed");
  }

  return await response.json();
};
```
