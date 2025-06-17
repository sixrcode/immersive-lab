Firebase Functions for ISL.SIXR.tv
This directory contains backend microservices and function configurations for the ISL.SIXR.tv platform. These are implemented using Firebase Functions and serve as the foundation for AI workflows, API endpoints, and other backend services.

📦 Microservices Overview
1. api Service (Express Router)
The index.js file initializes an Express.js application that bundles multiple API routes into a single Firebase Function, typically deployed as api. All routes within this app are protected by Firebase Authentication middleware by default.

✍️ Script Analyzer Microservice
Purpose: Provides AI-powered analysis of scripts—highlighting unclear sections, off-tone dialogue, and offering revision suggestions.

Endpoint: POST /api/analyzeScript

Core Logic: Defined in src_copy/ai/flows/ai-script-analyzer.ts using Genkit-based flows.

Input Format:

json
Copy
Edit
{ "script": "Your script content here..." }
Output Format:

json
Copy
Edit
{ "analysis": "...", "suggestions": [...] }
Authentication: Requires a valid Firebase ID token in the Authorization: Bearer <token> header.

2. aiApi Microservice (Firebase Function)
A centralized AI microservice deployed as aiApi, located in the ai-microservice/ directory. It powers:

Prompt-to-Prototype generation

AI Script Analysis

Storyboard generation

📖 Refer to the ../ai-microservice/README.md for:

Full endpoint specs

Authentication structure

Deployment instructions

🛠 Other Functions
The functions/ directory may also include:

Legacy or auxiliary Firebase Functions

Entry points for experimental routes

Deployment configurations for the overall Firebase setup

💡 Tip: Use firebase deploy --only functions:<name> for scoped deployments.