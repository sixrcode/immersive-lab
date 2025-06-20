# AI Service Benchmarking

This document outlines how to run the AI service benchmarks locally. These benchmarks test the performance and completeness of critical AI endpoints like `/promptToPrototype` and `/analyzeScript`.

## Prerequisites

1.  **Node.js:** Ensure Node.js is installed on your system (preferably version 18 or later, matching the AI microservice environment).
2.  **Firebase CLI:** Install or update the Firebase CLI:
    ```bash
    npm install -g firebase-tools
    ```
3.  **Firebase Login:** Log in to Firebase using:
    ```bash
    firebase login
    ```
4.  **Project Dependencies:** Install the project's npm dependencies from the root directory of the repository:
    ```bash
    npm install
    ```
    This will install `axios` (used by the benchmark script) and other necessary packages.

## Setup for Local Benchmarking

1.  **Select Firebase Project:**
    Ensure your Firebase CLI is configured to use the correct project. The alias `staging` should be mapped to `immersive-lab-lzcit` in your `.firebaserc` file.
    ```bash
    firebase use staging
    ```
    If the alias is not set, you can use the project ID directly with commands (e.g., `firebase emulators:start --project immersive-lab-lzcit`).

2.  **Start Firebase Emulators:**
    The AI service (`aiApi`) runs as a Firebase Function. To run it locally, you need to start the Firebase emulators. From the root of the repository, run:
    ```bash
    firebase emulators:start --only functions,firestore,auth
    ```
    This command starts the emulators for Functions (which hosts `aiApi`), Firestore (which `aiApi` might interact with), and Auth (for handling authentication, though bypassed for benchmarks).
    Wait for the emulators to initialize. You should see log output indicating that the `aiApi` function is available.

## Running the Benchmark Script

1.  **Set Environment Variables:**
    Before running the benchmark script, you need to set the following environment variables in your terminal session:

    *   `BENCHMARK_API_BASE_URL`: This tells the script where to find the emulated `aiApi` service.
        ```bash
        export BENCHMARK_API_BASE_URL="http://localhost:5001/immersive-lab-lzcit/us-west1/aiApi"
        ```
    *   `RUNNING_BENCHMARKS`: This flag is used by the `aiApi` service (and potentially the benchmark script) to enable test-specific behavior, such as bypassing authentication.
        ```bash
        export RUNNING_BENCHMARKS="true"
        ```
    *   `NODE_ENV` (Optional but Recommended): Setting this to `test` might enable mock authentication tokens or other test-specific configurations within the AI service, as suggested by service documentation.
        ```bash
        export NODE_ENV="test"
        ```
    *   `GOOGLE_API_KEY` (Optional): If the AI functions make calls to Google Cloud AI services (like Gemini via Genkit) and your local environment is not configured with Application Default Credentials (ADC) via `gcloud auth application-default login`, you might need to provide an API key.
        ```bash
        # export GOOGLE_API_KEY="YOUR_GOOGLE_API_KEY" # Only if needed
        ```

2.  **Execute the Script:**
    Once the emulators are running and environment variables are set, navigate to the project root (if not already there) and run the benchmark script using Node.js:
    ```bash
    node benchmarking/run_benchmarks.js
    ```

3.  **Review Results:**
    The script will output progress to the console, including response times, success status, and completeness checks for each benchmarked endpoint.
    Detailed results are saved as a JSON file in the `benchmarking/results/` directory (e.g., `benchmark_results_YYYY-MM-DDTHH-MM-SS.json`).

## Interpreting Results

*   **Connection Errors:** If you see `ECONNREFUSED` errors, ensure the Firebase emulators are running correctly and that `BENCHMARK_API_BASE_URL` is set to the correct local emulator URL.
*   **Authentication Errors:** If you encounter authentication issues, double-check that `RUNNING_BENCHMARKS="true"` is set.
*   **Performance Regressions:** The script compares current run times against a baseline (`benchmarking/benchmark_baseline.json`). If a significant performance regression is detected, the script will highlight it and exit with a status code of 1 (which would typically fail a CI build).

By following these steps, you can run the AI benchmarks locally to assess performance and ensure the `aiApi` service is functioning as expected.
