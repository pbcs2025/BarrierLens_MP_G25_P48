# BarrierLens Research Intelligence Assistant — Claude Backend & Safety Service (Member 2)

Member 2 owns the **secure LLM explanation backend** and **research-safety layer** for the BarrierLens platform.

---

## 1. Quickstart & Environment Setup

### Installation
```bash
cd backend
pip install -r requirements.txt
```

### Configuration
Copy the example environment file:
```bash
cp .env.example .env
```
Edit `.env` and configure your Anthropic Claude API Key:
```ini
CLAUDE_API_KEY=sk-ant-api03-your-real-key-here
CLAUDE_MODEL=claude-3-5-sonnet-20241022
PORT=5000
HOST=0.0.0.0
DEBUG=False
CORS_ORIGINS=*
```

> [!IMPORTANT]
> **Security Rule**: The `CLAUDE_API_KEY` resides strictly server-side in `.env`. Never commit `.env` or put API credentials in frontend JavaScript. `.env` is listed in `.gitignore`.

### Starting the Server
```bash
python app.py
```
The backend server will run on `http://localhost:5000`.

---

## 2. API Contract & Endpoints

### Endpoint 1: Health Check
- **URL**: `GET /api/health`
- **Response**: `200 OK`
```json
{
  "status": "healthy",
  "service": "BarrierLens Research Intelligence Assistant Backend",
  "version": "1.0.0"
}
```

### Endpoint 2: Chat Explanation
- **URL**: `POST /api/chat`
- **Content-Type**: `application/json`

#### Request Schema (Input from Member 3 / Member 1)
```json
{
  "question": "Compare healthcare access barriers in Karnataka and Kerala.",
  "language": "en",
  "intent": "STATE_COMPARISON",
  "status": "verified",
  "entities": {
    "states": ["Karnataka", "Kerala"]
  },
  "evidence": [
    {
      "source": "state_summary.json",
      "path": "states.Karnataka.observed_any_barrier_rate",
      "label": "Karnataka — Any Barrier Rate",
      "value": "55.38",
      "unit": "%",
      "entity": "Karnataka"
    },
    {
      "source": "state_summary.json",
      "path": "states.Kerala.observed_any_barrier_rate",
      "label": "Kerala — Any Barrier Rate",
      "value": "7.58",
      "unit": "%",
      "entity": "Kerala"
    }
  ],
  "calculations": [
    {
      "type": "percentage_point_difference",
      "result": 47.8,
      "unit": "percentage points",
      "interpretation": "Karnataka has a 47.80 percentage-point higher Observed Any Barrier Rate than Kerala (55.38% vs 7.58%).",
      "derived": true
    }
  ],
  "metrics": [
    { "label": "Karnataka — Any Barrier Rate", "value": "55.38", "unit": "%" },
    { "label": "Kerala — Any Barrier Rate", "value": "7.58", "unit": "%" }
  ],
  "source": ["state_summary.json"],
  "relatedPage": {
    "label": "State-Level Barrier Analysis & Comparison",
    "url": "dashboard/pages/state_analysis.html"
  }
}
```

#### Response Schema (Output to Member 3 / Member 4)
```json
{
  "answer": "In the verified BarrierLens dataset (NFHS-5), Karnataka has an Observed Any Barrier Rate of 55.38%, whereas Kerala has an Observed Any Barrier Rate of 7.58%. Karnataka shows a 47.80 percentage-point higher rate of healthcare access barriers compared to Kerala.",
  "language": "en",
  "status": "success",
  "intent": "STATE_COMPARISON",
  "source": ["state_summary.json"],
  "metrics": [
    { "label": "Karnataka — Any Barrier Rate", "value": "55.38", "unit": "%" },
    { "label": "Kerala — Any Barrier Rate", "value": "7.58", "unit": "%" }
  ],
  "evidence_used": [
    "state_summary.json:states.Karnataka.observed_any_barrier_rate",
    "state_summary.json:states.Kerala.observed_any_barrier_rate"
  ],
  "relatedPage": {
    "label": "State-Level Barrier Analysis & Comparison",
    "url": "dashboard/pages/state_analysis.html"
  },
  "disclaimer": null,
  "claims": [
    {
      "text": "Karnataka has an Observed Any Barrier Rate of 55.38%",
      "supported_by": ["state_summary.json"]
    }
  ]
}
```

---

## 3. Possible Status Values & Error Behaviors

| Status Code | Response `status` | Meaning & Action |
| :--- | :--- | :--- |
| `200 OK` | `success` | Query successfully processed and grounded in verified evidence. |
| `200 OK` | `unavailable` | Requested information is absent from NFHS-5 recode dataset. Safe fallback returned. |
| `200 OK` | `api_error` | Claude API error / network failure. Graceful research disclaimer fallback returned without crashing dashboard. |
| `400 Bad Request` | `validation_error` | Missing required parameters (e.g. empty `question` string or malformed JSON). |
| `500 Error` | `api_error` | Internal server exception. Controlled JSON response returned without exposing internal stack traces. |

---

## 4. Integration Guide for Member 3 (UI/Voice) & Member 4 (Reports)

### Calling Backend from Member 3 Client
```javascript
// Step 1: Member 1 processes query locally
const member1Output = await BarrierLensResponse.processUserQuery(userText, language);

// Step 2: Member 3 sends Member 1 payload to Member 2 backend
const response = await fetch('http://localhost:5000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: userText,
    language: language,
    evidence: member1Output
  })
});

const data = await response.json();
console.log(data.answer, data.relatedPage, data.metrics);
```

---

## 5. Safety & Verification Suite

To run backend tests:
```bash
pytest tests/backend/test_chat_backend.py -v
```
Tests check:
1. Exact metric grounding
2. State comparisons
3. Out-of-scope / waiting time fallback
4. Non-causal wording enforcement (`associated with` vs `causes`)
5. SHAP model result explanations
6. Medical advice safety disclaimer
7. Kannada (`kn`) language support
8. Hindi (`hi`) language support
9. Graceful API failure handling
10. Secret protection audit (`.gitignore` & frontend secrets check)
