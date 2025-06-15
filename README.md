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

-   Multiple loglines
-   An AI-generated mood board image and 9 themed descriptive cells
-   A detailed shot list
-   An animatic description
-   A concise pitch summary

All generated data is bundled into a `PromptPackage`, which is stored in Firestore, with images saved to Firebase Cloud Storage. Users can also download this package as a JSON file.

This feature is under active development. For detailed documentation on the current Phase 1 implementation, please see [Core Generation Pipeline Documentation](./docs/v1.1/core.md).

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
