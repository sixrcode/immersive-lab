# ISL.SIXR.tv Documentation v1.1 (2025-06-15)

# Immersive Storytelling Lab Platform (ISL.SIXR.tv)

Forge the Future, One Story at a Time.

## 🌐 Live Demo / Preview

-   You can access a live version of the platform at: [https://ISL.SIXR.tv](https://ISL.SIXR.tv)

## Table of Contents

- [Features](#features)
- [System Architecture](#system-architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Development Server](#running-the-development-server)
  - [Environment Variables Nextjs App](#environment-variables-nextjs-app)
- [Tech Stack](#tech-stack)
- [Deployment: Firebase Hosting & Cloud Run Strategy](#deployment-firebase-hosting--cloud-run-strategy)
  - [Feature Comparison](#feature-comparison)
  - [When to Use Which or Both](#when-to-use-which-or-both)
  - [Example Setup Combine Firebase Hosting--Cloud-Run](#example-setup-combine-firebase-hosting--cloud-run)
  - [Trade-offs--Tips](#trade-offs--tips)
  - [TLDR Choose Based On](#tldr-choose-based-on)
  - [What to Do Next](#what-to-do-next)
- [Microservices Architecture](#microservices-architecture)
  - [Centralized AI Microservice ai-microservice](#centralized-ai-microservice-ai-microservice)
  - [AI Script Analyzer functions](#ai-script-analyzer-functions)
  - [Collaboration Service collaboration-service](#collaboration-service-collaboration-service)
  - [Portfolio Microservice portfolio-microservice](#portfolio-microservice-portfolio-microservice)
- [Error Handling and Logging](#error-handling-and-logging)
- [Future Improvements](#future-improvements)
  - [Enhanced AI Capabilities](#enhanced-ai-capabilities)
  - [Broader Platform Integrations](#broader-platform-integrations)
  - [Performance and Scalability](#performance-and-scalability)
  - [Expanded Community Features](#expanded-community-features)
  - [User Experience UX and Accessibility](#user-experience-ux-and-accessibility)
- [Development Phases](#development-phases)
  - [Overall Platform Development Phases](#overall-platform-development-phases)
  - [Microservice Development Phases](#microservice-development-phases)
- [Contributing](#contributing)
  - [Contribution Process](#contribution-process)
- [License](#license)
- [Prompt-to-Prototype Studio](#prompt-to-prototype-studio)
  - [Future Phases--Integrations](#future-phases--integrations)
- [Enhanced Feature Integration](#enhanced-feature-integration)
  - [Prompt-to-Prototype Studio Handoff Features](#prompt-to-prototype-studio-handoff-features)
  - [Workflow Example](#workflow-example)

ISL.SIXR.tv is the digital home of the Immersive Storytelling Lab, a project by SIXR aimed at empowering underrepresented youth and independent creators to master immersive storytelling techniques using VR, XR, AI filmmaking, and open-source creative tools.

## Features

The Immersive Storytelling Lab Platform (ISL.SIXR.tv) offers a suite of tools designed to support creators through every stage of the immersive storytelling process. Key features include:

-   **Tutorial Discovery Engine:** A curated database of tutorials and learning materials focused on VR, XR, AI filmmaking, and open-source creative tools. (Vision as per documentation)
-   **Community Showcase:** A space for creators to share their projects, get feedback, and connect with peers. (Basic portfolio functionality currently present, supported by the Portfolio Microservice. See Microservices Architecture section for details.)
-   **Resources Hub:** A collection of links to essential tools, assets, and documentation for immersive content creation. (Vision as per documentation)
-   **AI Script Analyzer:** Provides insights on script pacing, character arcs, and potential plot holes. (Detailed in Microservices Architecture section)
-   **Prompt-to-Prototype Studio (Phase 1: Core Generation):** Generates a comprehensive set of creative assets (loglines, mood board, shot list, animatic description, pitch summary) from a user's prompt, optional image, and style preset. Results are stored in Firestore and Firebase Storage, with a JSON download option. (Actively developed/present in UI)
-   **AI Storyboarding Studio (Phase 1):** Enables creators to turn scene descriptions into storyboard panels using AI. (Phase 1 uses placeholder images and basic panel layouts; deeper Genkit integration in progress.) (Initial version available in UI)
-   **Production Board (Production-Gate Board):** Helps manage the production workflow, from pre-production to final output. (Actively developed/present in UI)
-   **Real-Time Collaboration:** Allows multiple users to work together on creative projects in real-time. (Supported by the Collaboration Service. See Microservices Architecture section for details.)
-   **Authentication and User Profiles:** Secure user accounts and personalized profiles for managing projects and contributions.

## System Architecture

The ISL.SIXR.tv platform employs a modern web architecture. The following sections describe the architecture in more detail.

### ISL.SIXR.tv Architecture Diagrams

#### System-Level Architecture

[SYSTEM-LEVEL DIAGRAM HERE]

The system-level architecture of ISL.SIXR.tv centers on a Next.js frontend and centralized AI microservices. The Next.js app (deployed via Firebase Hosting or Vercel) handles the UI and user authentication (using Firebase Auth) and accesses data through Firestore and Cloud Storage. When a user submits a prompt or requests content generation, the frontend calls the **Centralized AI Microservice** (a Firebase Function or Cloud Run container) via its API. This AI microservice orchestrates GenKit-powered AI flows and calls Google’s AI models to generate assets. It also reads/writes project data in Firestore and stores large assets (like generated images) in Cloud Storage. Heavy GPU-based tasks (such as image synthesis) can be routed from the AI microservice to an external GPU service (RunPod) for processing. The diagram above illustrates how users interact with the frontend, how API requests route to Firebase services and AI microservices, and how data flows between Firestore, Cloud Storage, Google AI, and RunPod.

#### Workflow-Level Architecture

[WORKFLOW-LEVEL DIAGRAM HERE]

This diagram maps the **Prompt-to-Prototype Studio** workflow. First, the user inputs a text prompt (and optional style or reference image) into the frontend UI. The UI sends a POST to the AI microservice’s `/promptToPrototype` endpoint. The microservice then runs GenKit-powered AI logic (using Google AI models) to generate a suite of assets – including a logline, moodboard images, shot list, and animatic description – from the prompt. These outputs are saved to Firestore (structured data like shot lists and text) and Cloud Storage (generated images). Next, the user may invoke storyboard generation by calling `/generateStoryboard` (passing in scene descriptions or shot lists); this tells the microservice to run a diffusion model (on RunPod GPUs) to produce storyboard panels, which are also stored in Cloud Storage. Similarly, a request to `/analyzeScript` sends script text to the microservice, which calls AI models for analysis and logs results to Firestore. Arrows in the diagram show the flow of data (API calls to the microservice, AI model invocations, and data reads/writes to Firebase). This illustrates how a single user prompt is turned into creative assets and how each step interacts with Firestore and Storage.

#### Infrastructure & Deployment Architecture

[INFRASTRUCTURE & DEPLOYMENT DIAGRAM HERE]

This diagram shows the CI/CD and deployment pipeline. The code is stored on GitHub, and **GitHub Actions** automates builds and deployments. On commits or PR merges, Actions run tests and then build/deploy services: the Next.js frontend is built and deployed to Firebase Hosting (or optionally Vercel), and the AI microservice is deployed using the Firebase CLI (e.g. `firebase deploy --only functions:aiApi` as noted in the docs). Any containerized backend (e.g. collaboration or portfolio services) are Docker-built and pushed to Google Artifact Registry, then deployed to Google Cloud Run using `gcloud run deploy`. Terraform scripts (also run via GitHub Actions) are used to provision GPU pods on RunPod. Environment variables and secrets (Firebase credentials, RunPod API keys, etc.) are managed via GitHub Secrets and the respective service configurations. Arrows in the diagram trace these pipelines: from GitHub to Actions, then to Firebase Deploy (functions/hosting), to Artifact Registry and Cloud Run, and to Terraform/RunPod.

### Legacy System Architecture Text

The ISL.SIXR.tv platform employs a modern web architecture:

-   **Frontend & BFF (Backend-For-Frontend):** The primary application is built with Next.js, serving both as the user interface and a backend layer that handles user authentication, data management with Firestore, and orchestration of calls to other services.

Below is a textual representation of the system components and their interactions:

```text
+-------------------------------------------------------------------------------------------------+
|                                     User (Creator)                                              |
+-------------------------------------------------------------------------------------------------+
      | (Interacts via Web Browser)               ^ (Views Content, Manages Projects)
      v                                           |
+-------------------------------------------------------------------------------------------------+
|                                Next.js Frontend (Vercel/Firebase Hosting)                       |
|  - UI Components                                                                                |
|  - User Authentication (Client-side)                                                            |
|  - BFF (Backend-For-Frontend API Routes)                                                        |
+---------------------------------|------------------------------^--------------------------------+
      | (Firebase SDK)              | (API Calls, e.g., to aiApi)  | (Serves Static Assets)
      v                             v                              |
+-----------------------------+  +---------------------------------------------------------------+
| Firebase Services           |  |            Centralized AI Microservice (aiApi)                |
|  - Authentication           |  |             (Firebase Function / Cloud Run)                   |
|  - Firestore (Database)     |  |  - Orchestrates Genkit Flows:                                 |
|  - Storage (File Uploads)   |  |    - Prompt-to-Prototype                                      |
|  - Hosting (Static Assets)  |  |    - Storyboard Generation                                    |
+-----------------------------+  |    - Script Analysis                                          |
                               +--|-----------------------------|-------------------------------+
                                  | (Calls to Google AI Models) | (Data to/from Firestore, Storage)
                                  v                             v
                             (AI Models)                   (Databases/Storage)
```

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   **Node.js**: Make sure you have Node.js installed. We recommend using the latest LTS version. You can download it from [nodejs.org](https://nodejs.org/).
-   **Firebase**: This project uses Firebase for its backend services (Authentication, Firestore, Storage).
    -   Ensure you have a Firebase project set up.
    -   For backend functionalities like image uploads and data storage for the Prompt-to-Prototype Studio, you will need to configure Firebase Admin SDK credentials via environment variables. Refer to `src/lib/firebase/admin.ts` for the required variables (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`).
    -   Client-side Firebase configuration will also be needed (typically in a Firebase config file or environment variables like `NEXT_PUBLIC_FIREBASE_...`).

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/sixrcode/immersive-lab.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd immersive-lab
    ```
3.  Install the dependencies:
    ```bash
    npm install
    ```

### Running the Development Server

To start the development server, run the following command:

```bash
npm run dev
```
This will typically start the server on `http://localhost:9002` (or another port if configured).

### Environment Variables (Next.js App)

Before running the Next.js application, ensure you have a `.env.local` file in the root of the Next.js project with the following variables:

-   **Firebase Client SDK Configuration:**
    -   `NEXT_PUBLIC_FIREBASE_API_KEY="your_api_key"`
    -   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_auth_domain"`
    -   `NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_project_id"`
    -   `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_storage_bucket"`
    -   `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_messaging_sender_id"`
    -   `NEXT_PUBLIC_FIREBASE_APP_ID="your_app_id"`
-   **Firebase Admin SDK Configuration (for server-side operations in Next.js API routes, if any remain that are not offloaded to the microservice):**
    -   `FIREBASE_PROJECT_ID="your_project_id"`
    -   `FIREBASE_CLIENT_EMAIL="your_firebase_admin_client_email"`
    -   `FIREBASE_PRIVATE_KEY="your_firebase_admin_private_key"` (Ensure newlines are correctly formatted, e.g., by using `\n` in the string or by using base64 encoding)
    -   `FIREBASE_STORAGE_BUCKET="your_storage_bucket_name"`
-   **AI Microservice URL:**
    -   `NEXT_PUBLIC_AI_MICROSERVICE_URL="your_ai_microservice_functions_url"` (e.g., `https://us-central1-your-project-id.cloudfunctions.net/aiApi`)

Replace `"your_..."` placeholders with your actual Firebase project configuration values.

## 🧪 Testing

This section outlines how to run tests, the frameworks used, and general testing guidelines for the ISL.SIXR.tv platform.

### Running Tests

-   **Root Project Tests:** To run all tests defined in the root project (primarily frontend component tests and potentially integration tests), use the following command from the project root:
    ```bash
    npm run test
    ```
-   **Microservice-Specific Tests:** Some microservices have their own dedicated test suites. To run these, navigate to the microservice directory and execute its test command (typically also `npm run test` if a `test` script is defined in its `package.json`):
    ```bash
    # Example for ai-microservice
    cd ai-microservice
    npm run test
    cd ..

    # Example for collaboration-service
    cd collaboration-service
    npm run test
    cd ..

    # Check other microservices like functions/, portfolio-microservice/ for their specific testing setups.
    ```

### Frameworks

-   **Jest:** The primary JavaScript testing framework used across the project for both frontend and backend tests. You'll find Jest configuration files (e.g., `jest.config.js`) in the root directory and within several microservice directories.
-   **React Testing Library:** Used for testing React components in the Next.js frontend, encouraging tests that interact with components as a user would.

### Test Coverage

-   Developers are encouraged to write tests for new features and bug fixes to maintain good test coverage.
-   To generate a test coverage report, you might be able to use a flag with the test command, such as:
    ```bash
    npm run test -- --coverage
    ```
    (Note: The exact command for coverage might vary based on Jest configuration in different packages.)
- The CI pipeline automatically runs tests on every pull request and enforces a minimum test coverage threshold, failing the build if standards are not met.
- Additionally, the CI pipeline performs static analysis, including linting and TypeScript type checking, and will fail the build if any errors are detected.

### Types of Tests

-   **Unit Tests:** These form the majority of tests, focusing on individual functions, modules, or components. Examples can be found in `src/components/__tests__/` for frontend components and within specific microservice test directories like `ai-microservice/index.test.js`.
-   **Integration/Flow Validation Tests:** Some tests might cover the interaction between multiple units or validate entire flows. For example, tests in `functions/test/` or `portfolio-microservice/routes/portfolio.test.js` might perform more integrated testing of API endpoints or specific flows.
-   **End-to-End Tests (Future Consideration):** While not explicitly detailed, end-to-end tests using frameworks like Cypress or Playwright could be a future addition for testing complete user flows through the UI.

## Tech Stack

ISL.SIXR.tv is built with a modern tech stack designed for scalability and a rich user experience:

-   **Next.js 13+ (App Directory):** A React framework for building server-side rendered and statically generated web applications, utilizing the latest App Directory structure.
-   **Firebase:** Leveraged for backend services, including Firestore for the database and Google Authentication for user management.
-   **Genkit:** An open source framework from Google to help build, deploy and monitor AI-powered features and applications.
-   **Tailwind CSS:** A utility-first CSS framework for rapidly building custom user interfaces.
-   **Radix UI (implicitly):** Used via a component library like shadcn/ui, providing a foundation of unstyled, accessible UI components.
-   **TypeScript:** A typed superset of JavaScript that enhances code quality and maintainability.
-   **Vercel:** Used for deployment and managing serverless functions, ensuring high availability and performance.

## Deployment: Firebase Hosting & Cloud Run Strategy

This section provides a breakdown of **Firebase Hosting** vs. **Cloud Run**, including when it makes sense to use each—or both in tandem for the ISL.SIXR.tv platform.

### 🔧 Feature Comparison

#### Firebase Hosting

*   Excellent for static sites and SPAs, with integrated global CDN + HTTPS + custom domains + previews + easy rollbacks ([Firebase App Hosting Comparison](https://firebase.google.com/docs/app-hosting/product-comparison?utm_source=chatgpt.com), [Cloud Run Custom Domains](https://cloud.google.com/run/docs/mapping-custom-domains?utm_source=chatgpt.com)).
*   Includes generous free tier (Spark: 1 GB storage, 10 GB monthly bandwidth; custom domains and SSL included). Blaze adds usage-based costs as you grow .
*   Integrates tightly with Firebase Auth, Firestore/Realtime DB, Functions, Analytics, etc.
*   Best when you want simplicity, tight Firebase service integration, and minimal backend customization.

#### Cloud Run

*   Designed for running containerized, stateless services (Node, Go, Python, Java, etc.) ([Firebase Hosting with Cloud Run](https://firebase.google.com/docs/hosting/cloud-run?utm_source=chatgpt.com)).
*   Auto-scales to zero or thousands of instances; billed per CPU/memory usage during active requests ([Firebase Hosting with Cloud Run](https://firebase.google.com/docs/hosting/cloud-run?utm_source=chatgpt.com)).
*   Offers flexibility for custom backends, microservices, REST APIs, SSR, or complex compute.
*   Can map custom domains via Firebase Hosting, Load Balancer, or Cloud Run domain mapping ([Cloud Run Custom Domains](https://cloud.google.com/run/docs/mapping-custom-domains?utm_source=chatgpt.com)).
*   No built-in CDN; dynamic, container response only (and a \~60s timeout from Firebase proxy) ([Reddit Discussion](https://www.reddit.com/r/googlecloud/comments/g1wgzo/static_website_google_cloud_run_or_firebase/?utm_source=chatgpt.com)).

---

### 📊 When to Use Which (or Both)

| Scenario                         | Firebase Hosting Only     | Cloud Run Only          | Firebase Hosting + Cloud Run                         |
| -------------------------------- | ------------------------- | ----------------------- | ---------------------------------------------------- |
| **Static site / SPA**            | ✅ Ideal                   | ❌ Overkill              | ❌ Not needed                                         |
| **Backend APIs / SSR**           | 🚧 Possible via Functions | ✅ Ideal                 | ✅ Great option                                       |
| **Custom runtimes / frameworks** | ❌ Restricted to Node.js   | ✅ Full control          | ✅ Use Hosting for static + rewrite APIs to Cloud Run |
| **Minimal infra management**     | ✅ Very easy               | ⚙️ You manage images    | ✅ Balanced                                           |
| **Tight Firebase integration**   | ✅ Full support            | ☑️ Possible, extra code | ✅ Best of both                                       |

---

### ⚙️ Example Setup: Combine Firebase Hosting + Cloud Run

1.  Build your frontend and deploy via `firebase deploy`.
2.  Package backend container, deploy it to Cloud Run via `gcloud build/ run`.
3.  Add rewrite in `firebase.json`:

    ```json
    "hosting": {
      "rewrites": [{
        "source": "/api/**",
        "run": { "serviceId": "your-service", "region": "us-west1" }
      }]
    }
    ```
4.  Deploy hosting config with `firebase deploy --only hosting` ([Stack Overflow](https://stackoverflow.com/questions/66198081/how-to-correctly-deploy-changes-after-pairing-google-cloud-run-with-firebase-hos?utm_source=chatgpt.com), [StackShare](https://stackshare.io/stackups/firebase-vs-google-cloud-run?utm_source=chatgpt.com)).

This lets Hosting handle static assets, CDN, SSL, and rewrites `/api` to your containerized microservice. That’s the sweet-spot combo.

---

### 💡 Trade-offs & Tips

*   **Latency**: Proxying through Hosting adds \~600ms overhead compared to direct Cloud Run endpoints ([Stack Overflow](https://stackoverflow.com/questions/59068532/high-latency-using-firebase-hosting-as-compared-to-native-cloud-run?utm_source=chatgpt.com)).
*   **Cold starts**: Containers—particularly large Node.js ones—can take seconds to spin up. Optimize image size (Go works great) to avoid this ([Reddit Discussion](https://www.reddit.com/r/googlecloud/comments/g1wgzo/static_website_google_cloud_run_or_firebase/?utm_source=chatgpt.com)).
*   **Timeouts**: Firebase proxy enforces a 60s limit—longer tasks need other solutions (e.g., App Engine Flex).
*   **Deployment complexity**: Cloud Run involves Docker builds & CI/CD, compared to one-command Firebase deploys ([Firebase Hosting with Cloud Run](https://firebase.google.com/docs/hosting/cloud-run?utm_source=chatgpt.com), [Firebase Serverless Overview](https://firebase.google.com/docs/hosting/serverless-overview?utm_source=chatgpt.com)).

---

### 🛤️ TL;DR: Choose Based On:

*   **Firebase Hosting alone**: Static/SPA site with minimal backend.
*   **Cloud Run alone**: Massive backend services, custom logic, full control.
*   **Combine them**: You want a fast static frontend from Hosting, plus a powerful, containerized backend—without building your own CDN or SSL.

---

### ✅ What to Do Next

1.  **Define your app architecture**: static vs dynamic; what runtime you need.
2.  **Choose your tool(s)**:
    *   If you're a frontend-heavy project with light backend, go with Firebase Hosting (+ Cloud Functions).
    *   Need full backend flexibility or language support beyond Node? Cloud Run is your friend.
    *   Want both? Use Hosting + Cloud Run with proxies—balanced and elegant.
3.  **Prototype a mini app**:
    *   Deploy a SPA on Hosting.
    *   Create a `/api/hello` Cloud Run service.
    *   Test rewrite configuration.
4.  **Watch latency & cold starts**; optimize container images (e.g. Alpine, Go, caching layers).

Mixing Firebase Hosting with Cloud Run gives you the best of both worlds—fast static delivery, global SSL/CDN, and backend flexibility in containers. If that aligns with SIXR’s mission—empowering creators with style and scale—this combo is a strong play.

## 📦 API Contracts & Shared Types

Maintaining clear API contracts and consistent data structures across the platform is crucial for interoperability between the frontend, backend (Next.js BFF), and various microservices.

-   **Shared Type Definitions:**
    -   Core platform-wide data structures and type definitions are primarily located in `src/lib/types.ts`.
    -   Specific packages or modules may also have their own type definitions, for example, shared types related to the Storyboard feature can be found in `packages/types/src/storyboard.types.ts`.
    -   These files serve as a key source of truth for data contracts, ensuring consistency in the data exchanged between different parts of the system.

-   **API Endpoint Contracts (Future: OpenAPI):**
    -   Currently, API contract details for microservices are often described within their respective `README.md` files or inferred from their implementation and the shared type definitions.
    -   We plan to expose OpenAPI (Swagger) specifications for all AI and core microservice endpoints in the future. This will facilitate clearer API contracts, easier integration, automated client generation, and improved discoverability of service capabilities.

## 🔐 Authentication & Roles

The platform uses Firebase Authentication to manage user identities and access control. Role-based access ensures that users have appropriate permissions based on their defined roles.

### Authentication Methods

-   **Firebase Authentication:** Core authentication is handled by Firebase.
    -   **Email/Password:** Users can sign up and log in using their email address and a password.
    -   **Google OAuth:** Users can also authenticate using their existing Google accounts for a streamlined experience.
-   **JWT for Service Access:** Upon successful authentication, Firebase ID tokens (JWTs) are issued to clients. These tokens are then sent as Bearer tokens in the `Authorization` header when making requests to protected backend endpoints, particularly the AI microservices (e.g., Centralized AI Microservice).

### User Roles

The platform defines the following user roles to differentiate access and capabilities:

-   **`youth`:** Represents young creators using the platform to learn and develop projects. They typically have access to learning resources, content creation tools, and their own project spaces.
-   **`mentor`:** Represents educators or experienced individuals guiding youth users. They might have additional permissions to review youth projects, provide feedback, and manage groups.
-   **`admin`:** Represents platform administrators with full access to manage users, content, platform settings, and monitor overall activity.

Role management is typically handled via Firebase custom claims, which are set on user accounts and can be used in security rules (Firestore) and backend logic to enforce permissions.

### Key Authentication Logic

-   **Client-Side Setup:** Configuration and handling of Firebase authentication on the client-side (e.g., sign-in flows, user state management) are primarily managed in `src/lib/firebase/client.ts`.
-   **Server-Side Admin Tasks:** Firebase Admin SDK operations, such as token verification and management of custom claims for roles, are handled in `src/lib/firebase/admin.ts`.
-   **Role-Based Access Control (RBAC):** RBAC is implemented within specific API routes (e.g., in Next.js BFF) and microservices, checking user roles (derived from JWT claims) before allowing access to certain functionalities or data.

## Microservices Architecture

The ISL.SIXR.tv platform employs a modular, microservices-based architecture to ensure scalability, focused development, and independent deployment of its diverse functionalities. This approach is particularly beneficial for managing AI-intensive workflows, real-time collaborative features, and production support tools. Below is an overview of the key microservices, grouped by their primary function:

### AI Microservices

These services are responsible for the core AI-driven functionalities of the platform, including content generation, analysis, and AI model orchestration.

#### Centralized AI Microservice (`ai-microservice/`)

*   **Purpose:** Acts as the **primary API gateway and backend orchestrator for all core AI functionalities**. It manages Genkit flows, communicates with various AI models (e.g., Gemini via Google AI), and processes structured input from frontend features. It is responsible for and serves as the backend for:
    *   The **Prompt-to-Prototype Studio** (handling all asset generation, image processing, and Firestore/Firebase Storage interactions).
    *   The **AI Script Analyzer**.
    *   The **Storyboard Studio** (including AI image generation for panels).
*   **Key Technologies:** Firebase Function, Node.js, Express, Genkit
*   **Location:** `ai-microservice/`
*   **Authentication:** All endpoints require a valid Firebase ID token (Authorization: Bearer <token>).
*   **Endpoints:**
    *   Base URL: `https://<region>-<project-id>.cloudfunctions.net/aiApi`
    *   `POST /analyzeScript`: Accepts script content and returns a `ScriptAnalysisPackage`. Powers the AI Script Analyzer tool.
    *   `POST /promptToPrototype`: Generates a `PromptPackage` from a user prompt (with optional image/style). Used by the Prompt-to-Prototype Studio.
    *   `POST /generateStoryboard`: Returns a `StoryboardPackage` from a scene description. Intended for the Storyboard Studio.
*   **Deployment:**
    *   Deploy using the command: `firebase deploy --only functions:aiApi`
    *   The resulting URL should be set as the `NEXT_PUBLIC_AI_MICROSERVICE_URL` environment variable in the Next.js application, which is used for all features relying on this microservice, including prompt-to-prototype.
*   **Note:** This service centralizes common AI tasks and model interactions, providing a consistent interface for the frontend. For more details, see the [Centralized AI Microservice README](./ai-microservice/README.md).

#### AI Script Analyzer

*   **Purpose:** Analyzes textual scripts to provide users with insights on narrative elements such as pacing, character development, and potential plot inconsistencies.
*   **Key Technologies:** The core logic is implemented as a Genkit flow within the Centralized AI Microservice.
*   **Location:** The primary logic resides in `ai-microservice/src/flows/ai-script-analyzer.ts`. This flow is exposed via the `/analyzeScript` endpoint of the Centralized AI Microservice (`aiApi`).
*   **Note:** This functionality is part of the Centralized AI Microservice, which orchestrates AI-related tasks. The `functions/` directory may contain other general-purpose Firebase Functions, but the AI Script Analyzer specific logic and its primary endpoint are managed via the `ai-microservice`. For an overview of any other functions, see the [Firebase Functions README](./functions/README.md).

### Collaboration & Community

These services focus on enabling user interaction, project sharing, and collaborative workflows.

#### Collaboration Service (`collaboration-service/`)

*   **Purpose:** Enables real-time collaboration features for users working concurrently on creative projects. This can include functionalities like shared document editing, synchronized project states, and potentially real-time chat or presence indicators.
*   **Key Technologies:** Node.js, Express, Socket.io (real-time communication), MongoDB (via Mongoose), Docker (containerized deployment)
*   **Location:** `collaboration-service/`
*   **Note:** This service is crucial for team-based projects, allowing multiple creators to contribute and interact seamlessly.

#### Portfolio Microservice (`portfolio-microservice/`)

*   **Purpose:** Manages user portfolios and project showcases. It allows creators to publish their work (both completed and in-progress), receive feedback from the community, and build their public profiles on the ISL.SIXR.tv platform.
*   **Key Technologies:** Node.js, Express
*   **Location:** `portfolio-microservice/`
*   **Note:** This service supports the community aspect of the platform, enabling users to share and discover creative projects. For more details, see the [Portfolio Microservice README](./portfolio-microservice/README.md).

### Production Support

These services provide tools and functionalities to aid in the planning, organization, and execution of creative projects.

#### Production Board Service
*   **Purpose:** Manages and visualizes the production workflow, from pre-production stages (like concept development and scriptwriting) through to final output. Helps track project status and tasks.
*   **Key Technologies:** Next.js components interacting with Firestore.
*   **Location:** The frontend components and primary logic are part of the core Next.js application, located under `src/app/production-board/`.
*   **Note:** This service is integral to the Production-Gate Board feature, providing a Kanban-style or similar interface for project management.

#### Storyboard Studio
*   **Purpose:** Enables the creation and visualization of storyboards. It can import data from the Prompt-to-Prototype Studio (like shot lists and style presets) and uses AI to generate storyboard images.
*   **Key Technologies:** Utilizes Genkit-powered AI functions within the Centralized AI Microservice (via the `/generateStoryboard` endpoint) for image generation. Frontend components for displaying and managing storyboard panels.
*   **Location:** Logic primarily handled by the Centralized AI Microservice, with UI components in the Next.js application.
*   **Note:** This tool is designed to bridge the gap between textual descriptions/shot lists and visual storytelling, facilitating pre-visualization. It is a key part of the "Prompt-to-Prototype Studio Handoff Features".

## Error Handling and Logging

All microservices in this project adhere to a standardized approach for error handling and logging to ensure consistency and aid in debugging.

### Standardized Error Response

When an error occurs, API endpoints will return a JSON response in the following format:

```json
{
  "success": false,
  "error": {
    "id": "unique-error-id-uuidv4",
    "message": "A human-readable description of the error.",
    "code": "ERROR_CODE_STRING"
  }
}
```

*   `success`: Always `false` for errors.
*   `error.id`: A unique identifier (UUID v4) generated for each error instance. This ID is also logged and can be used to correlate client-side errors with server-side logs.
*   `error.message`: A developer-friendly message explaining the error.
*   `error.code`: A string code representing the type of error (e.g., `VALIDATION_ERROR`, `UNAUTHENTICATED`, `INTERNAL_SERVER_ERROR`, `FIRESTORE_OPERATION_FAILED`).

The HTTP status code will also reflect the nature of the error (e.g., 400 for validation errors, 401/403 for auth errors, 500 for server errors).

### Structured Logging

*   **Firebase Functions (`ai-microservice`, `functions/index.js`):** These services use the built-in `firebase-functions/logger` which produces structured JSON logs in Google Cloud Logging.
*   **Standalone Node.js Services (`collaboration-service`, `portfolio-microservice`):** These services use the `winston` library, configured to output structured JSON logs to the console. In a production deployment, these console logs would typically be collected by a log aggregator.

All logs aim to include:
*   `errorId`: The unique error identifier, correlating with the API response.
*   `service`: The name of the microservice (e.g., `ai-microservice`).
*   `userId`: Identifier for the user who initiated the request, if available.
*   `route`: The API route that was accessed.
*   `method`: The HTTP method used.
*   `errorCode`: The error code string.
*   `errorMessage`: The error message.
*   `stack`: The stack trace for server errors.
*   Other relevant contextual information.

This consistent logging and error reporting helps in quickly identifying, diagnosing, and resolving issues.

## 🚀 CI/CD & Deployment Pipeline

This section outlines the continuous integration, continuous delivery (CI/CD), and deployment pipeline for the ISL.SIXR.tv platform. The goal is to automate testing and deployment processes to ensure reliability and efficiency.

### Automation with GitHub Actions

-   **Core Tool:** GitHub Actions is the primary tool planned for automating CI/CD workflows. While specific workflow files (e.g., under `/.github/workflows/`) are yet to be fully implemented or made visible, the strategy is to use them extensively. (Note: Full configuration is 'coming soon' as per project status).
-   **Triggers:** Workflows are typically configured to trigger on:
    -   Push events to main branches (e.g., `main`, `develop`).
    -   Pull requests targeting the `main` branch to ensure code quality before merging.
-   **Common Jobs:** Automated jobs within the workflows will likely include:
    -   **Linting:** Checking code for style consistency and potential errors.
    -   **Testing:** Running unit, integration, and potentially other tests (see "🧪 Testing" section).
    -   **Building:** Compiling the Next.js application and building Docker images for containerized microservices.
    -   **Deployment:** Pushing built assets and images to their respective hosting/registry services and deploying to various environments.

### Environments

-   **Development:** Local developer setups and feature branches.
-   **Staging (Planned/To Be Detailed):** A dedicated staging or pre-production environment is crucial for testing features in a production-like setting before deploying to live users. Details on its setup and refresh cycle are to be defined.
-   **Production:** The live environment accessible to all users, deployed from a stable main branch (e.g., `main`).

### Deployment Tools & Strategies

-   **Next.js Frontend (Vercel & Firebase Hosting):**
    -   The Next.js frontend is primarily deployed using **Firebase Hosting**, leveraging its optimizations for Next.js applications (e.g., serverless functions, edge network, CI/CD integration).
    -   Alternatively, **Vercel** can serve the Next.js application during specific development phases or for exploring alternative deployment strategies, but Firebase Hosting is the main target for tighter integration with other Firebase services and the overall platform ecosystem.
    -   Deployments to **Firebase Hosting** are automated via GitHub Actions.

-   **Firebase Services (Functions, Firestore Rules, Hosting Config):**
    -   The **Firebase CLI** (`firebase deploy`) is the standard tool for deploying Firebase Functions (like the Centralized AI Microservice), Firestore security rules, and Firebase Hosting configurations.
    -   These deployments are typically scripted within GitHub Actions workflows for automation. For example, `firebase deploy --only functions:aiApi` is used for the Centralized AI Microservice.

-   **Containerized Microservices (Docker & Google Cloud Run):**
    -   **Design:** Microservices like the 'Collaboration Service' or other custom backend APIs are designed to be containerized using **Docker**.
    -   **Dockerfile:** Each containerized microservice should include a `Dockerfile` in its root directory (e.g., `collaboration-service/Dockerfile`) that defines its build environment.
    -   **Image Registry:** During the CI/CD process, Docker images are built and pushed to a container registry. **Google Artifact Registry** is the recommended choice within the Google Cloud ecosystem, though Docker Hub is also an option.
    -   **Cloud Run Deployment:** Deployment to **Google Cloud Run** is managed via `gcloud run deploy` commands. These commands specify the image URL from the registry, target region, environment variables, and other service configurations.
    -   **Scalability:** Each Cloud Run service is configured for auto-scaling, allowing it to handle varying loads efficiently, including scaling down to zero instances to save costs when not in use.

### General Workflow (Anticipated)

1.  Developers work on features in separate branches.
2.  Pull requests (PRs) are created to merge features into a main development branch (e.g., `develop`) or directly to `main` for smaller changes.
3.  GitHub Actions automatically trigger on PRs to:
    *   Run linters and format checkers.
    *   Execute test suites across the application and relevant microservices.
    *   Optionally, build the application to catch build errors early.
4.  Upon successful tests, code review, and PR approval, changes are merged.
5.  Merging to a designated deployment branch (e.g., `main` for production, `develop` for staging) triggers further GitHub Actions workflows:
    *   Builds the Next.js frontend and deploys to Vercel/Firebase Hosting.
    *   Deploys Firebase Functions and related configurations.
    *   Builds Docker images for containerized microservices, pushes them to Google Artifact Registry.
    *   Deploys the new images to Google Cloud Run services.

This structured CI/CD pipeline aims to provide a robust, automated pathway for developing, testing, and deploying updates and new features to the ISL.SIXR.tv platform, ensuring stability and rapid iteration.


## Future Improvements

The ISL.SIXR.tv platform is envisioned as an evolving ecosystem for immersive storytellers. Future enhancements will focus on deepening AI capabilities, broadening integrations, and enriching the community experience, all while ensuring robust performance and accessibility. Key areas for future development include:

### Enhanced AI Capabilities
*   **Advanced Content Generation:** Explore more sophisticated AI models to generate richer content, such as short video snippets beyond animatics, dynamic 3D scene prototyping, or even AI-composed musical scores to match moods.
*   **Iterative AI Assistance:** Introduce AI-powered feedback loops for refining generated content. This could include suggestions for improving logline impact, diversifying shot compositions based on cinematic principles, or enhancing dialogue authenticity.
*   **Personalized Learning Paths:** Leverage AI to analyze a creator's skill progression and suggest personalized tutorial paths or resources from the Tutorial Discovery Engine.
*   **Predictive Script Insights:** Expand the AI Script Analyzer to offer predictive insights, such as potential audience reception for different narrative choices or suggestions for aligning a script with specific genre conventions.

### Broader Platform Integrations
*   **XR/VR Authoring Tools:** Develop deeper, more seamless integrations with popular XR/VR authoring tools (e.g., Unity, Unreal Engine), allowing for direct export/import of assets and scene data.
*   **Open-Source Creative Ecosystem:** Connect with other open-source creative tools (e.g., Blender for 3D modeling, Krita for concept art) and asset libraries to create a more comprehensive workflow.
*   **Version Control Systems:** Integrate with systems like Git for managing versions of creative projects, especially text-based assets like scripts or interactive narratives.
*   **Educational Platforms:** Explore APIs for connecting with Learning Management Systems (LMS) to better serve educational users and institutions.

### Performance and Scalability
*   **Microservice Optimization:** Continuously optimize all microservices, particularly AI-intensive ones like the Centralized AI Microservice, for faster response times, improved resource efficiency, and enhanced scalability.
*   **Edge Computing for AI:** Investigate the feasibility of deploying certain AI inference tasks to edge devices to reduce latency for real-time feedback and interactive AI tools.
*   **Optimized Asset Pipelines:** Refine asset management and processing pipelines (e.g., image/video transcoding, 3D model optimization) for smoother and faster handling of creative media.

### Expanded Community Features
*   **Peer Review & Mentorship Workflows:** Implement structured peer review systems for shared projects, and facilitate mentorship connections within the community.
*   **Versioned Feedback & Annotation:** Allow users to provide version-specific feedback on shared creative works, potentially with on-asset annotation tools (e.g., commenting directly on a script or storyboard panel).
*   **Collaborative Project Spaces:** Enhance collaborative environments with more granular permission controls, role assignments, and integrated project management tools.
*   **Skill-Sharing & Workshops:** Facilitate community-led skill-sharing sessions or virtual workshops directly within the platform.

### User Experience (UX) and Accessibility
*   **Intuitive Workflow Refinement:** Continuously gather user feedback to refine the user interface (UI) and overall workflow, making the platform more intuitive and reducing the learning curve.
*   **Enhanced Accessibility:** Proactively implement and improve accessibility features based on WCAG standards to ensure the platform is usable by creators with diverse abilities.
*   **Mobile & Tablet Responsiveness:** Improve responsiveness and usability of the platform on a wider range of devices, including tablets and mobile for certain review/feedback functionalities.
*   **Customizable Dashboards:** Allow users to personalize their dashboards to prioritize tools and information relevant to their current projects and learning goals.

## Development Phases

This section outlines the general phased development approach for the ISL.SIXR.tv platform and its constituent microservices. The platform evolves iteratively, with features maturing through these stages.

### Overall Platform Development Phases

*   **Phase 1: Foundation & Core Features (Completed/Recent Past)**
    *   *Description:* Focused on establishing the core platform infrastructure, essential user-facing features, and initial versions of key AI tools.
    *   Key Completions:
        *   Next.js frontend and Firebase backend (Auth, Firestore, Storage) established.
        *   Prompt-to-Prototype Studio (Core generation pipeline delivered and completed).
        *   AI Script Analyzer (Basic functionality delivered and completed).
        *   Storyboard Studio (Phase 1 MVP with mocked image generation and basic panel layouts established) - Completed.
        *   Rudimentary Portfolio/Community showcase feature (Initial version completed).
        *   Basic real-time collaboration infrastructure (Initial setup completed).
*   **Phase 2: Expansion & Integration (Ongoing/Near Future)**
    *   *Description:* Focus on enriching existing features, deeper integration between tools, significant expansion of AI capabilities, maturing collaboration, and growing community engagement.
    *   Key Initiatives:
        *   Enriching AI features (e.g., more in-depth script analysis feedback, variant generation tools for the Prompt Studio).
        *   Implementing the next phases of Prompt-to-Prototype (e.g., creative block refinements, interactive editing, selective regeneration).
        *   Full implementation of Storyboard Studio, including real AI image generation and integration with Prompt-to-Prototype outputs.
        *   Building out Production Board functionality (workflow/kanban for projects).
        *   Advancing Real-Time Collaboration features (e.g., version history, comments, unified presence system).
        *   Growing portfolio and community features (e.g., project feedback mechanisms, enhanced discovery).
        *   Ongoing performance and scalability improvements (e.g., profiling AI microservices, optimizing database usage, enabling streaming responses for storyboard generation, load testing critical pathways).
        *   Continued architectural consolidation and simplification where appropriate (e.g., evaluating long-term data storage strategies for services like collaboration).
        *   Introducing benchmarking, evaluation, monitoring, and logging for AI outputs and services.
*   **Phase 3: Maturity & Ecosystem Growth (Future)**
    *   *Description:* Transition towards a highly scalable, robust platform with advanced AI/XR integrations, broader third-party tool connections, and fostering a self-sustaining creator ecosystem. This phase might include introducing more complex XR content generation/editing capabilities, offering API access for external developers, implementing advanced platform analytics for users and administrators, and establishing robust governance models for community content and contributions.

### Microservice Development Phases

*General Note: Each microservice generally aligns with the overall platform phases but with a specific focus relevant to its domain. Development is iterative, and features within each microservice will evolve through these phases.*

*   **Centralized AI Microservice (`ai-microservice/`)**
    *   *Phase 1 (Completed):* Establish the API gateway, implement initial Genkit flows for core features:
        *   Script analysis (`/analyzeScript`).
        *   Prompt-to-Prototype (`/promptToPrototype`).
        *   Storyboard Studio MVP (`/generateStoryboard` - initial Genkit flow for storyboard generation with mocked images, basic panel structure).
    *   *Phase 2 (Ongoing/Upcoming):*
        *   Refine Genkit flows for robustness, new features (e.g., real storyboard image generation, variant generation for Prompt Studio).
        *   Enhance error handling, logging, monitoring, and introduce benchmarking/evaluation for AI outputs.
        *   Integrate additional AI capabilities as platform features expand (e.g., advanced script analysis, refined storyboard image generation with inputs from Prompt-to-Prototype like shot lists and styles).
        *   Enable streaming responses for features like storyboard generation.
    *   *Phase 3 (Future):* Support for more complex, multi-step AI workflows, potential integration with MLOps pipelines for model management and deployment, and enhanced security measures for sensitive AI operations.
*   **AI Script Analyzer (logic within `ai-microservice`)**
    *   *Phase 1 (Completed via `ai-microservice`):* Basic script parsing, scene detection, and initial analysis (e.g., tone, pacing estimates, keyword extraction). The core logic is in `ai-microservice/src/flows/ai-script-analyzer.ts`.
    *   *Phase 2:* More nuanced analysis (e.g., character dialogue patterns, plot structure visualization), and providing actionable suggestions for improvement.
    *   *Phase 3:* Deeper understanding of cinematic conventions and genre-specific feedback, potential integration with other writing or pre-production tools.
*   **Collaboration Service (`collaboration-service/`)**
    *   *Phase 1:* Core real-time features such as shared document co-editing for scripts or project notes, and basic real-time presence indicators.
    *   *Phase 2:* Enhanced collaboration tools including version history for shared documents, commenting and annotation features, and basic project management integrations (e.g., task tracking).
    *   *Phase 3:* Highly scalable infrastructure for large concurrent collaborative projects, integration with external communication and project management tools, and advanced permissioning models.
*   **Portfolio Microservice (`portfolio-microservice/`)**
    *   *Phase 1:* Basic user portfolio creation and display, ability to share links to projects, simple project descriptions.
    *   *Phase 2:* Advanced portfolio customization options, structured feedback mechanisms (likes, comments), integration with community showcase features for better discoverability.
    *   *Phase 3:* Introduction of social networking aspects (following creators, project updates), enhanced discoverability algorithms, and personal analytics for creators on how their work is viewed.

### Roadmap Considerations

*   **Storyboard Studio Integration:** The Storyboard Studio MVP was developed and delivered as part of Phase 1 (within the `ai-microservice`). Phase 2 will focus on its full implementation with real AI image generation, deeper integration with other platform tools (e.g., importing shot lists from Prompt-to-Prototype), and UI enhancements for panel management.
*   **AI Service Architecture:** The platform has successfully consolidated its primary AI generation tasks (including Prompt-to-Prototype, Script Analysis, and Storyboard Generation) into the `ai-microservice`.
*   **Data Storage Strategy:** The Collaboration Service currently utilizes MongoDB, while other core services (via Next.js BFF and `ai-microservice`) primarily use Firestore. For Phase 2 and beyond, the project will evaluate strategies for data management to ensure scalability, maintainability, and data consistency where beneficial. This may include exploring options for greater alignment or defining clear boundaries for data ownership and access patterns.
*   **Third-Party AI Dependencies:** The platform's AI capabilities heavily rely on Genkit and underlying Google AI models. Future development will include robust monitoring of these services, contingency planning for API changes or deprecations, and evaluating alternative models or providers if necessary to ensure feature continuity and performance.
*   **Resource Allocation:** Successful execution of the ambitious Phase 2 goals requires careful resource management and prioritization to support parallel development across multiple features (Storyboard Studio full implementation, Prompt-to-Prototype enhancements, Production Board, Collaboration features) and microservices (primarily `ai-microservice` and `collaboration-service`).

## Automated Performance Benchmarking

The platform includes an automated performance benchmarking process to ensure that code changes do not inadvertently introduce significant performance regressions.

-   **CI Integration:** Performance benchmarks are run automatically via GitHub Actions on every pull request targeting the `main` or `develop` branches. This is part of the `pr-check.yml` workflow.
-   **Benchmark Script:** The core script responsible for running these benchmarks is `benchmarking/run_benchmarks.js`.
-   **Baseline Comparison:** This script compares the performance of key features (e.g., "promptToPrototype", "analyzeScript") against a predefined baseline stored in `benchmarking/benchmark_baseline.json`.
-   **Regression Detection:** If the average response time for a benchmarked feature during a CI run is more than twice (2x) its baseline average, it's considered a significant performance regression. In such cases, the "Run Performance Benchmarks" step in the GitHub Actions workflow will fail, thus failing the overall PR check.
-   **Archived Results:** The detailed JSON results from each benchmark run in CI are archived as downloadable artifacts in the GitHub Actions run summary. This allows developers to inspect the raw performance data if needed.

### Updating the Baseline

The `benchmark_baseline.json` file contains the reference performance figures (average response times) for various features. This baseline may need to be updated periodically, for example, if:

-   Significant performance improvements have been intentionally made to a feature.
-   The underlying infrastructure or dependencies have changed, impacting performance characteristics.
-   The current baseline is no longer representative of acceptable performance.

To update the baseline:

1.  **Run Benchmarks Locally:** Execute the `benchmarking/run_benchmarks.js` script locally. Ensure you are running it against a stable and representative environment (e.g., a local setup that mirrors production or a dedicated staging environment).
    ```bash
    node benchmarking/run_benchmarks.js
    ```
    (You might need to set the `BENCHMARK_API_BASE_URL` environment variable if you are targeting a non-localhost API).
2.  **Analyze Results:** After the script completes, it will save a new JSON results file in the `benchmarking/results/` directory. Review this file to understand the current average response times for the features.
3.  **Update Baseline File:** If the new performance figures are deemed acceptable and representative of the new baseline, manually update the `avgResponseTime` values in the `benchmarking/benchmark_baseline.json` file for the relevant features.
4.  **Commit Changes:** Commit the updated `benchmarking/benchmark_baseline.json` file to your branch and include it in your pull request. Explain the reason for the baseline update in your PR description.

Regularly maintaining an accurate baseline ensures that the performance regression checks remain effective and relevant.

## Contributing

Contributions are welcome! We appreciate any help in improving this project and empowering more creators. Our goal is to make contributing to ISL.SIXR.tv a positive and rewarding experience.

Please see our detailed **[Contributing Guidelines](CONTRIBUTING.md)** for information on:
- Setting up your development environment
- Coding standards (linting, formatting)
- Testing expectations
- The Pull Request (PR) process
- Our branching strategy
- How to report bugs and suggest enhancements
- Our Code of Conduct

Before submitting your contribution, please ensure your code adheres to our linting standards by running \`npm run lint\` and that all tests pass (\`npm run test\`).

## 📜 Responsible AI Guidelines

The Immersive Storytelling Lab Platform (ISL.SIXR.tv) is committed to fostering a creative and ethical environment. As we integrate AI technologies to empower storytellers, we adhere to the following principles to ensure responsible use:

### Introduction
We believe AI is a powerful tool for creativity and innovation. Our goal is to provide access to these tools while promoting their ethical use and mitigating potential harms. These guidelines outline our commitment and expectations for users of our AI-powered features.

###  Fairness and Bias
AI models can inadvertently reflect or amplify existing societal biases. While we strive to use models and techniques that minimize such biases, it's important for users to be aware that biases can still be present in AI-generated content.
-   **Our Goal:** We are committed to continuously evaluating and working to mitigate biases in the AI tools we provide.
-   **User Awareness:** We encourage users to critically review AI-generated content and consider potential biases when incorporating it into their work.

### Transparency
We aim to be transparent about the use of AI on our platform.
-   **AI-Generated Content:** Content produced significantly by AI tools will be clearly identified where feasible, ensuring users understand its origin.
-   **Model Capabilities:** We will strive to provide information about the capabilities and limitations of the AI models used.

### Harmful Content
The generation or promotion of harmful content is strictly prohibited on ISL.SIXR.tv. This includes:
-   Hate speech
-   Harassing content
-   Discriminatory content based on race, ethnicity, religion, gender, sexual orientation, disability, or other protected characteristics
-   Sexually explicit material
-   Content that promotes violence, self-harm, or dangerous activities
-   Misinformation or disinformation with harmful intent

We have implemented safety filters and content moderation technologies (as described in our AI microservice configurations) to block the generation of such content. These systems are not perfect, but we are committed to their ongoing improvement.

### User Responsibility
Users of ISL.SIXR.tv are responsible for the content they create and how they use the AI tools provided.
-   **Ethical Use:** We expect all users to leverage AI tools in a manner that is ethical, respectful, and lawful.
-   **Content Review:** Users should review AI-generated content to ensure it aligns with these guidelines before sharing or publishing.
-   **No Harmful Intent:** Do not attempt to bypass safety measures or intentionally create harmful content.

### Reporting Mechanisms
If you encounter content on the platform that you believe violates these guidelines or is otherwise problematic, we encourage you to report it.
-   *(Note: The specific reporting mechanism is under development. In the interim, please contact platform administrators if you have concerns.)*
This feedback is crucial for maintaining a safe and respectful environment.

### Continuous Improvement
The field of AI is rapidly evolving, as are the best practices for responsible AI. ISL.SIXR.tv is committed to:
-   Staying informed about new research and guidelines in AI ethics.
-   Continuously refining our safety measures and platform policies.
-   Seeking feedback from our community to improve our approach to responsible AI.

By using the AI features on ISL.SIXR.tv, you agree to adhere to these guidelines.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details. It is recommended to add a `LICENSE` file to the project root.

## Prompt-to-Prototype Studio

The Prompt-to-Prototype Studio is a key feature of ISL.SIXR.tv, designed to rapidly convert initial ideas into a tangible set of creative assets. Users can input a text prompt, optionally upload a reference image, and select a style preset. The backend logic for generating these assets is handled by the **Centralized AI Microservice (`ai-microservice/`)**. The studio then receives and displays:

-   Multiple loglines (targeting different tones, influenced by the style preset).
-   An AI-generated mood board image (inspired by the prompt, image, and style).
-   Nine themed mood board cells with detailed textual descriptions reflecting the chosen style and inputs.
-   A detailed shot list (6-10 shots) with lens, camera move, and framing notes, adapted to the style preset.
-   An animatic description for a 4-second proxy clip, outlining key visuals and pacing, influenced by the style.
-   A concise pitch summary, capturing the core concept and tone.

All generated data is bundled into a `PromptPackage`, which is created and stored in Firestore by the Centralized AI Microservice. Images (user-uploaded and AI-generated) are also handled by the Centralized AI Microservice and saved to Firebase Cloud Storage, with their URLs included in the `PromptPackage`. The Next.js application receives this package and allows users to view the content and download it as a JSON file.

This feature is under active development. For detailed documentation on the current Phase 1 implementation, please see [Core Generation Pipeline Documentation](./docs/v1.1/core.md). The AI logic itself resides in the `ai-microservice/src/flows/prompt-to-prototype.ts` flow.

### Future Phases & Integrations:

*   **Phase 2 (Creative Block Support):** Introduce tools like "Logline Enhancer," "Mood Board Variation Generator," and "Shot List Expander" using Genkit flows to help users refine or expand on initial outputs.
*   **Phase 3 (Interactive Editing & Refinement):** Allow direct editing of generated text assets (loglines, cell descriptions, shot notes) within the UI. Implement functionality to save these edits back to the `PromptPackage` in Firestore, incrementing its version.
*   **Phase 4 (Selective Regeneration & Versioning):** Enable regeneration of specific parts of the `PromptPackage` (e.g., just the loglines, a single mood board cell, or the AI mood board image). Each regeneration or significant edit will create a new version of the package in Firestore for history and comparison.
*   **Integration with Storyboard Studio:**
    *   Generated shot lists from Prompt-to-Prototype can be directly imported into the Storyboard Studio to pre-populate scenes and panel descriptions.
    *   The selected style preset and mood board can inform the visual style for AI-generated storyboard images.
*   **Integration with Production Board:**
    *   A completed `PromptPackage` can automatically create an initial "Concept" or "Pre-Production" card on the Production Board, linking back to the prototype details.
    *   Key assets (logline, pitch summary) can populate fields on the Kanban card.
*   **Integration with Script Analyzer:**
    *   The animatic description and shot list could serve as a structural starting point for a script, which can then be analyzed and refined by the AI Script Analyzer.

This phased approach ensures that the Prompt-to-Prototype Studio becomes a deeply integrated and evolving tool, empowering creators from the initial spark of an idea through to more detailed production planning.

## ✨ Enhanced Feature Integration

### Prompt-to-Prototype Studio Handoff Features

#### ➤ Storyboard Studio Integration
- Converts generated shot lists into visual storyboard panels. (Handled by the Centralized AI Microservice's `/generateStoryboard` endpoint)
- Auto-fills style and panel details from prototype data.
- Generates storyboard images using Genkit-powered AI functions within the Centralized AI Microservice.

#### ➤ Script & Dialogue Analyzer Integration
- Transforms logline, shot list, and animatic description into a script draft.
- AI analyzes tone, clarity, and dialogue strength. (Handled by the Centralized AI Microservice's `/analyzeScript` endpoint)
- Editable script interface with in-line suggestions.

### Workflow Example
1. Input prompt and style in Prompt-to-Prototype Studio.
2. Generate moodboard, logline, shot list, and animatic.
3. Click “Generate Storyboard” or “Analyze Script” to continue.

## 🎓 For Educators / Workshop Use

This section provides guidance for educators, workshop facilitators, or anyone looking to use the ISL.SIXR.tv platform in an educational setting with groups or cohorts of learners.

### Setting Up for a Cohort

-   **Fresh Firebase Instance:** It is highly recommended to deploy a fresh, dedicated Firebase instance for each new cohort or workshop group. This ensures a clean data environment (Firestore, Storage, Auth users) for each group, preventing data overlaps and simplifying management.
-   **Firebase Project Configuration:** Ensure your new Firebase project's configuration (API keys, project ID, etc.) is correctly set up in the Next.js application's environment variables (`.env.local` or deployment environment variables).

### Pre-filling Example Content (Seeding)

-   **Seed Data (Suggestion):** To provide students with a starting point or illustrative examples, consider creating a `seeds/` directory in the project root. This directory could contain:
    -   Example JSON files for prompts to be used with the Prompt-to-Prototype Studio.
    -   Sample scripts (e.g., plain text or Fountain format) that can be analyzed by the AI Script Analyzer.
    -   Example storyboard descriptions or structures.
-   **Seeding Mechanism (To Be Developed):** A script or manual process would need to be established to populate the Firestore database with this seed data. This might involve writing simple Node.js scripts that use the Firebase Admin SDK to create initial documents.

### Managing Student Accounts

-   **Firebase Authentication Users:** Create individual Firebase Authentication accounts for each student. You can do this manually via the Firebase console or programmatically using the Firebase Admin SDK.
    -   Using a consistent email pattern (e.g., `student{id}@workshop.com`) can simplify management.
-   **Assigning Roles:** Assign the `youth` role to student accounts (likely via Firebase custom claims) to ensure they have the appropriate permissions. Mentors or facilitators could be assigned the `mentor` role.

### Workshop Facilitation Tips

-   **Mentors Group in Firestore:** To manage review permissions or group students under specific mentors, consider creating a `mentors` collection in Firestore. Each document could represent a mentor and store a list of student UIDs they are responsible for. This can be used in Firestore security rules or application logic to control access.
-   **Utilize Portfolio Mode:** Encourage students to use the Portfolio microservice/feature to showcase their projects. This can be a great way for them to share their work, receive peer feedback, and build a collection of their creative outputs from the workshop.
-   **Introduce Tools Incrementally:** Depending on the workshop's focus, introduce the platform's tools (Prompt-to-Prototype, Storyboard Studio, Script Analyzer) incrementally to avoid overwhelming learners.
-   **Dedicated Q&A/Support Channel:** Set up a dedicated channel (e.g., Slack, Discord, or forum) for students to ask questions and receive support during the workshop.

By following these guidelines, educators can create a more structured and effective learning experience using the ISL.SIXR.tv platform.
