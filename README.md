# ISL.SIXR.tv Documentation v1.1 (2025-06-15)

# Immersive Storytelling Lab Platform (ISL.SIXR.tv)

Forge the Future, One Story at a Time.

ISL.SIXR.tv is the digital home of the Immersive Storytelling Lab, a project by SIXR aimed at empowering underrepresented youth and independent creators to master immersive storytelling techniques using VR, XR, AI filmmaking, and open-source creative tools.

## Features

The Immersive Storytelling Lab Platform (ISL.SIXR.tv) offers a suite of tools designed to support creators through every stage of the immersive storytelling process. Key features include:

-   **Tutorial Discovery Engine:** A curated database of tutorials and learning materials focused on VR, XR, AI filmmaking, and open-source creative tools. (Vision as per documentation)
-   **Community Showcase:** A space for creators to share their projects, get feedback, and connect with peers. (Basic portfolio functionality currently present)
-   **Resources Hub:** A collection of links to essential tools, assets, and documentation for immersive content creation. (Vision as per documentation)
-   **AI Script Analyzer:** Analyzes scripts to provide insights on pacing, character arcs, and potential plot holes. (Actively developed/present in UI)
-   **Prompt-to-Prototype Studio (Phase 1: Core Generation):** Generates a comprehensive set of creative assets (loglines, mood board, shot list, animatic description, pitch summary) from a user's prompt, optional image, and style preset. Results are stored in Firestore and Firebase Storage, with a JSON download option. (Actively developed/present in UI)
-   **Production Board (Production-Gate Board):** Helps manage the production workflow, from pre-production to final output. (Actively developed/present in UI)
-   **Real-Time Collaboration:** Allows multiple users to work together on creative projects in real-time.
-   **Authentication and User Profiles:** Secure user accounts and personalized profiles for managing projects and contributions.

## System Architecture

The ISL.SIXR.tv platform employs a modern web architecture:

-   **Frontend & BFF (Backend-For-Frontend):** The primary application is built with Next.js, serving both as the user interface and a backend layer that handles user authentication, data management with Firestore, and orchestration of calls to other services.
-   **AI Microservice (`prompt-gen-service`):** For computationally intensive AI-based generation tasks, specifically the "Prompt-to-Prototype" feature, the system delegates work to a separate Node.js microservice. This service is located in the `services/prompt-gen-service` directory. This approach ensures that the main Next.js application remains responsive and scalable, while the specialized AI tasks are handled by a dedicated service that can be scaled independently. The Next.js backend communicates with this microservice via HTTP requests.

This separation of concerns allows for more focused development, independent scaling of components, and robustness.

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

## Tech Stack

ISL.SIXR.tv is built with a modern tech stack designed for scalability and a rich user experience:

-   **Next.js 13+ (App Directory):** A React framework for building server-side rendered and statically generated web applications, utilizing the latest App Directory structure.
-   **Firebase:** Leveraged for backend services, including Firestore for the database and Google Authentication for user management.
-   **Genkit:** An open source framework from Google to help build, deploy and monitor AI-powered features and applications.
-   **Tailwind CSS:** A utility-first CSS framework for rapidly building custom user interfaces.
-   **Radix UI (implicitly):** Used via a component library like shadcn/ui, providing a foundation of unstyled, accessible UI components.
-   **TypeScript:** A typed superset of JavaScript that enhances code quality and maintainability.
-   **Vercel:** Used for deployment and managing serverless functions, ensuring high availability and performance.

## Microservices

The ISL.SIXR.tv platform is evolving to incorporate a microservices architecture for specialized tasks. This allows for more focused development, deployment, and scaling of individual components.

### Prompt Generation Service (`prompt-gen-service`)

-   **Location:** `services/prompt-gen-service`
-   **Description:** This service is responsible for handling the core AI-driven generation of creative assets (loglines, mood boards, shot lists, etc.) based on user prompts. It's built with Node.js, Express, and Genkit.
-   **Documentation:** For more details on its setup, environment variables, and API, please see its dedicated [README.md](./services/prompt-gen-service/README.md).

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

The Prompt-to-Prototype Studio is a key feature of ISL.SIXR.tv, designed to rapidly convert initial ideas into a tangible set of creative assets. Users can input a text prompt, optionally upload a reference image, and select a style preset. The studio then generates:

-   Multiple loglines (targeting different tones, influenced by the style preset).
-   An AI-generated mood board image (inspired by the prompt, image, and style).
-   Nine themed mood board cells with detailed textual descriptions reflecting the chosen style and inputs.
-   A detailed shot list (6-10 shots) with lens, camera move, and framing notes, adapted to the style preset.
-   An animatic description for a 4-second proxy clip, outlining key visuals and pacing, influenced by the style.
-   A concise pitch summary, capturing the core concept and tone.

All generated data is bundled into a `PromptPackage`, which is stored in Firestore, with images (user-uploaded and AI-generated) saved to Firebase Cloud Storage. Users can also download this package as a JSON file.

This feature is under active development. For detailed documentation on the current Phase 1 implementation, please see [Core Generation Pipeline Documentation](./docs/v1.1/core.md).

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
- Converts generated shot lists into visual storyboard panels.
- Auto-fills style and panel details from prototype data.
- Generates storyboard images using Genkit-powered AI functions.

#### ➤ Script & Dialogue Analyzer Integration
- Transforms logline, shot list, and animatic description into a script draft.
- AI analyzes tone, clarity, and dialogue strength.
- Editable script interface with in-line suggestions.

### Workflow Example
1. Input prompt and style in Prompt-to-Prototype Studio.
2. Generate moodboard, logline, shot list, and animatic.
3. Click “Generate Storyboard” or “Analyze Script” to continue.

```