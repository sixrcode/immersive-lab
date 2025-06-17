# Firebase Functions in ISL.SIXR.tv

This directory and its associated configurations are part of the Firebase Functions setup for the ISL.SIXR.tv platform. Firebase Functions are used to run backend code in response to events or HTTP requests.

## Central AI Microservice (`aiApi`)

The primary AI functionalities, including script analysis, prompt-to-prototype generation, and storyboard assistance, are consolidated into a dedicated microservice located in the `ai-microservice/` directory. This service is deployed as a single, comprehensive Firebase Function typically named `aiApi`.

**For detailed documentation on the `aiApi` microservice, including its purpose, authentication, API endpoints, and deployment, please refer to its dedicated README: [`../ai-microservice/README.md`](../ai-microservice/README.md).**

The core logic for the AI Script Analyzer, for example, can be found in `ai-microservice/src/flows/ai-script-analyzer.ts`.

## Other Functions

This `functions/` directory may also contain:
*   The `index.js` file, which might be used as an entry point for deploying other Firebase Functions that are not part of the `aiApi` microservice.
*   Older or auxiliary functions.
*   Configuration files related to Firebase Functions deployment for the broader project.

If you are looking for the main AI backend endpoints, please consult the `ai-microservice/README.md`.

---

*General notes on Firebase Functions development and deployment within this project can be added here if applicable.*
