# Firebase Functions & Microservices

This directory contains the backend microservices for the ISL.SIXR.tv platform, implemented as Firebase Functions. These functions handle various backend tasks, AI processing, and API endpoints.

## Services Hosted

### 1. API Service (`index.js`)

This file sets up an Express.js application that bundles multiple API routes and is deployed as a single Firebase Function typically named `api`. This allows for a more organized and scalable way to manage different API endpoints.

All endpoints defined within the Express app in `index.js` are protected by Firebase Authentication middleware by default.

#### a. Script Analyzer Microservice

*   **Purpose:** Provides AI-powered analysis of scripts, identifying unclear sections, off-tone dialogue, and suggesting improvements.
*   **Endpoint:** `POST /api/analyzeScript` (routed via the Express app in `index.js`)
*   **Core Logic:** The main logic for the script analysis is located at `./src_copy/ai/flows/ai-script-analyzer.ts`. This Genkit-based flow performs the AI analysis.
*   **Input:** Expects a JSON body with a `script` field: `{ "script": "Your script content here..." }`
*   **Output:** Returns a JSON object with `analysis` and `suggestions`.
*   **Authentication:** Requires a valid Firebase ID token in the `Authorization: Bearer <token>` header.

---

*More microservices and functions may be documented here as they are added.*
