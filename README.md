# ISL.SIXR.tv Documentation v1.1 (2025-06-15)

# Immersive Storytelling Lab Platform (ISL.SIXR.tv)

Forge the Future, One Story at a Time.

ISL.SIXR.tv is the digital home of the Immersive Storytelling Lab, a project by SIXR aimed at empowering underrepresented youth and independent creators to master immersive storytelling techniques using VR, XR, AI filmmaking, and open-source creative tools.

## Features

The Immersive Storytelling Lab Platform (ISL.SIXR.tv) offers a suite of tools designed to support creators through every stage of the immersive storytelling process. Key features include:

-   **Tutorial Discovery Engine:** A curated database of tutorials and learning materials focused on VR, XR, AI filmmaking, and open-source creative tools. (Vision as per documentation)
-   **Community Showcase:** A space for creators to share their projects, get feedback, and connect with peers. (Basic portfolio functionality currently present, supported by the Portfolio Microservice. See Microservices Architecture section for details.)
-   **Resources Hub:** A collection of links to essential tools, assets, and documentation for immersive content creation. (Vision as per documentation)
-   **AI Script Analyzer:** Provides insights on script pacing, character arcs, and potential plot holes. (Detailed in Microservices Architecture section)
-   **Prompt-to-Prototype Studio (Phase 1: Core Generation):** Generates a comprehensive set of creative assets (loglines, mood board, shot list, animatic description, pitch summary) from a user's prompt, optional image, and style preset. Results are stored in Firestore and Firebase Storage, with a JSON download option. (Actively developed/present in UI)
-   **Production Board (Production-Gate Board):** Helps manage the production workflow, from pre-production to final output. (Actively developed/present in UI)
-   **Real-Time Collaboration:** Allows multiple users to work together on creative projects in real-time. (Supported by the Collaboration Service. See Microservices Architecture section for details.)
-   **Authentication and User Profiles:** Secure user accounts and personalized profiles for managing projects and contributions.

## System Architecture

The ISL.SIXR.tv platform employs a modern web architecture:

-   **Frontend & BFF (Backend-For-Frontend):** The primary application is built with Next.js, serving both as the user interface and a backend layer that handles user authentication, data management with Firestore, and orchestration of calls to other services.

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
    git clone https://github.com/your-repository-url.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd project-directory-name
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

## Tech Stack

ISL.SIXR.tv is built with a modern tech stack designed for scalability and a rich user experience:

-   **Next.js 13+ (App Directory):** A React framework for building server-side rendered and statically generated web applications, utilizing the latest App Directory structure.
-   **Firebase:** Leveraged for backend services, including Firestore for the database and Google Authentication for user management.
-   **Genkit:** An open source framework from Google to help build, deploy and monitor AI-powered features and applications.
-   **Tailwind CSS:** A utility-first CSS framework for rapidly building custom user interfaces.
-   **Radix UI (implicitly):** Used via a component library like shadcn/ui, providing a foundation of unstyled, accessible UI components.
-   **TypeScript:** A typed superset of JavaScript that enhances code quality and maintainability.
-   **Vercel:** Used for deployment and managing serverless functions, ensuring high availability and performance.

## Microservices Architecture

The ISL.SIXR.tv platform employs a modular, microservices-based architecture to ensure scalability, focused development, and independent deployment of its diverse functionalities. This approach is particularly beneficial for managing AI-intensive workflows and real-time collaborative features. Below is an overview of the key microservices:

### Prompt Generation Service (`services/prompt-gen-service/`)

*   **Purpose:** Handles the core AI-driven generation of creative assets such as loglines, mood boards, shot lists, and pitch summaries based on user prompts. It is responsible for all AI-driven content generation and image processing tasks related to the Prompt-to-Prototype Studio.
*   **Key Technologies:** Node.js, Express, Genkit
*   **Location:** `services/prompt-gen-service/`
*   **Notes:**
    *   This service operates independently from the main web application.
    *   Its architectural separation ensures the main Next.js application remains responsive and lightweight, allows the AI microservice to be deployed, monitored, and scaled independently, and maintains clear boundaries between user interface/backend logic and AI model orchestration.
    *   Communication with the frontend is handled via HTTP requests from the Next.js backend, which also manages authentication, Firestore storage, and user session context.
    *   For detailed setup, environment variables, and API reference, see the `README.md` within its directory.

### Centralized AI Microservice (`ai-microservice/`)

*   **Purpose:** Acts as a primary API gateway for a range of AI functionalities beyond prompt generation. It manages Genkit flows, orchestrates communication with various AI models (e.g., Gemini via Google AI), and processes structured input from different frontend features.
*   **Key Technologies:** Firebase Function, Node.js, Express
*   **Location:** `ai-microservice/`
*   **Authentication:** All endpoints require a valid Firebase ID token (Authorization: Bearer <token>).
*   **Endpoints:**
    *   Base URL: `https://<region>-<project-id>.cloudfunctions.net/aiApi`
    *   `POST /analyzeScript`: Accepts script content and returns a `ScriptAnalysisPackage`. Powers the AI Script Analyzer tool.
    *   `POST /promptToPrototype`: Generates a `PromptPackage` from a user prompt (with optional image/style). Used by the Prompt-to-Prototype Studio.
    *   `POST /generateStoryboard`: Returns a `StoryboardPackage` from a scene description. Intended for the Storyboard Studio.
*   **Deployment:**
    *   Deploy using the command: `firebase deploy --only functions:aiApi`
    *   The resulting URL should be set as the `NEXT_PUBLIC_AI_MICROSERVICE_URL` environment variable in the Next.js application.
*   **Note:** This service centralizes common AI tasks and model interactions, providing a consistent interface for the frontend.

### AI Script Analyzer (`functions/`)

*   **Purpose:** Analyzes textual scripts to provide users with insights on narrative elements such as pacing, character development, and potential plot inconsistencies.
*   **Key Technologies:** Firebase Function
*   **Location:** The core logic resides in `functions/src_copy/ai/flows/ai-script-analyzer.ts`, with the endpoint defined in `functions/index.js`. It is invoked via the Centralized AI Microservice's `/analyzeScript` endpoint.
*   **Note:** This microservice provides specialized AI analysis for scriptwriting, integrating with the Centralized AI Microservice for API exposure.

### Collaboration Service (`collaboration-service/`)

*   **Purpose:** Enables real-time collaboration features for users working concurrently on creative projects. This can include functionalities like shared document editing, synchronized project states, and potentially real-time chat or presence indicators.
*   **Key Technologies:** Node.js, Express, Docker (containerization for deployment)
*   **Location:** `collaboration-service/`
*   **Note:** This service is crucial for team-based projects, allowing multiple creators to contribute and interact seamlessly.

### Portfolio Microservice (`portfolio-microservice/`)

*   **Purpose:** Manages user portfolios and project showcases. It allows creators to publish their work (both completed and in-progress), receive feedback from the community, and build their public profiles on the ISL.SIXR.tv platform.
*   **Key Technologies:** Node.js, Express
*   **Location:** `portfolio-microservice/`
*   **Note:** This service supports the community aspect of the platform, enabling users to share and discover creative projects.

## Deployment: Firebase Hosting & Cloud Run Strategy

This section provides a breakdown of **Firebase Hosting** vs. **Cloud Run**, including when it makes sense to use each—or both in tandem for the ISL.SIXR.tv platform.

### 🔧 Feature Comparison

#### Firebase Hosting

*   Excellent for static sites and SPAs, with integrated global CDN + HTTPS + custom domains + previews + easy rollbacks ([Firebase App Hosting Comparison](https://firebase.google.com/docs/app-hosting/product-comparison?utm_source=chatgpt.com), [Cloud Run Custom Domains](https://cloud.google.com/run/docs/mapping-custom-domains?utm_source=chatgpt.com)).
*   Includes generous free tier (Spark: 1 GB storage, 10 GB monthly bandwidth; custom domains and SSL included). Blaze adds usage-based costs as you grow.
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
*   **Microservice Optimization:** Continuously optimize all microservices, particularly AI-intensive ones like the Prompt Generation Service and Centralized AI Microservice, for faster response times, improved resource efficiency, and enhanced scalability.
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

*   **Phase 1: Foundation & Core Features (Current/Recent Past)**
    *   *Description:* Focus on establishing the core platform infrastructure, essential user-facing features, and initial versions of key AI tools. This includes the development of the Next.js frontend, Firebase backend (Auth, Firestore, Storage), the initial Prompt-to-Prototype Studio (core generation), the AI Script Analyzer (basic analysis), and foundational elements for collaboration and portfolio functionalities.
*   **Phase 2: Expansion & Integration (Ongoing/Near Future)**
    *   *Description:* Enhancing existing features with more depth, improving integration between platform tools, expanding AI capabilities based on user feedback and model advancements, and growing community functionalities. Examples include implementing the detailed future phases of the Prompt-to-Prototype Studio, refining the AI Script Analyzer for more nuanced feedback, maturing collaboration tools with richer features, and building out a more interactive community showcase and portfolio system.
*   **Phase 3: Maturity & Ecosystem Growth (Future)**
    *   *Description:* Transition towards a highly scalable, robust platform with advanced AI/XR integrations, broader third-party tool connections, and fostering a self-sustaining creator ecosystem. This phase might include introducing more complex XR content generation/editing capabilities, offering API access for external developers, implementing advanced platform analytics for users and administrators, and establishing robust governance models for community content and contributions.

### Microservice Development Phases

*General Note: Each microservice generally aligns with the overall platform phases but with a specific focus relevant to its domain. Development is iterative, and features within each microservice will evolve through these phases.*

*   **Prompt Generation Service (`services/prompt-gen-service/`)**
    *   *Phase 1:* Core AI model integration for generating initial creative assets (loglines, mood boards, shot lists, pitch summaries). Establish stable API for internal use.
    *   *Phase 2:* Expansion of supported AI models, improvement in the quality and diversity of generated assets, introduction of more fine-grained style controls and options.
    *   *Phase 3:* Exploration of advanced generative capabilities (e.g., basic 3D assets, interactive narrative elements), significant optimization for high-volume usage, and potential for customizable model fine-tuning.
*   **Centralized AI Microservice (`ai-microservice/`)**
    *   *Phase 1:* Establish the API gateway structure, implement initial Genkit flows for core platform AI features like script analysis (`/analyzeScript`) and prototype generation (`/promptToPrototype`).
    *   *Phase 2:* Add more AI-driven endpoints as new features require, refine existing Genkit flows for robustness, improve error handling, logging, and monitoring capabilities.
    *   *Phase 3:* Support for more complex, multi-step AI workflows, potential integration with MLOps pipelines for model management and deployment, and enhanced security measures for sensitive AI operations.
*   **AI Script Analyzer (`functions/` - via Centralized AI Microservice)**
    *   *Phase 1:* Basic script parsing, scene detection, and initial analysis (e.g., tone, pacing estimates, keyword extraction).
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

## Contributing

Contributions are welcome! We appreciate any help in improving this project and empowering more creators.

Before submitting your contribution, please ensure your code adheres to our linting and type-checking standards by running:

```bash
npm run lint
npm run typecheck
```

### Contribution Process

1.  **Fork** the repository.
2.  Create a new **branch** for your feature or bug fix (e.g., `feature/your-feature-name` or `fix/issue-number`).
3.  Make your **commits** with clear and concise messages.
4.  Push your changes to your forked repository.
5.  Open a **Pull Request** to the main repository, detailing the changes you've made.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details (if available). It is recommended to add a `LICENSE` file to the project root.

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

```