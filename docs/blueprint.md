# **App Name**: Immersive Storytelling Lab Platform (ISL.SIXR.tv)

For more detailed information, please refer to the main "Immersive Storytelling Lab Platform (ISL.SIXR.tv) - Full Documentation".

## Core Features:

The Immersive Storytelling Lab Platform (ISL.SIXR.tv) is designed to empower creators with a comprehensive suite of tools for immersive storytelling.

-   **Tutorial Discovery Engine:** A curated database of tutorials and learning materials focused on VR, XR, AI filmmaking, and open-source creative tools. Users can filter by skill level, topic, and software. (Key part of documented vision; not yet fully implemented in UI)
-   **Community Showcase:** A space for creators to share their projects, get feedback, connect with peers, and participate in community events or challenges. (Basic portfolio functionality currently present; comprehensive showcase with event boards is part of the documented vision)
-   **Resources Hub:** A centralized collection of links to essential tools, software, hardware recommendations, asset libraries, and documentation relevant to immersive content creation. (Key part of documented vision; not yet fully implemented in UI)
-   **AI Script Analyzer:** Analyzes scripts (including dialogue, scene descriptions) to provide insights on pacing, character arcs, emotional tone, and potential production challenges. Offers suggestions for improvement. (Visible UI elements and backend logic present, leverages Genkit for AI)
-   **Prompt to Prototype:** Generates initial creative assets (e.g., mood boards, loglines, character concepts, visual storyboards, proxy clips) from text prompts, enabling rapid ideation and visualization. (Visible UI elements and backend logic present, leverages Genkit for AI)
-   **Production-Gate Board:** A Kanban-style board that visually tracks project progress through customizable stages (e.g., Idea, Scripting, Pre-production, Production, Post-production, Distribution). Each stage can have associated quality gates or rubrics. (This is the "Production Board" found in the current UI/code; functionality is present)
-   **Real-Time Collaboration:** Features enabling multiple users to work together on projects simultaneously, including shared document editing, synchronized media review, and in-platform communication. (Documented vision; specific real-time collaboration features beyond basic project sharing may not be fully implemented yet)
-   **Authentication and User Profiles:** Secure user registration and login (via Firebase Google Authentication), with personalized user profiles to manage projects, showcase work, and track progress. (Implemented)

## Technical Architecture:

-   **Frontend:**
    -   Next.js 13+ (App Directory): For building a responsive and performant user interface with server-side rendering and static generation capabilities.
    -   Tailwind CSS: A utility-first CSS framework for rapid UI development and customization.
    -   Vercel: Platform for serverless hosting, deployment, and continuous integration.
-   **Backend:**
    -   Firebase Firestore: NoSQL cloud database for storing application data, including user profiles, project details, and community content.
    -   Firebase Google Authentication: For secure user authentication and management.
-   **AI & Automation:**
    -   Genkit (Google): Framework used for developing and deploying AI-powered features like the Script Analyzer and Prompt to Prototype.
    -   Vercel Serverless Functions: Used for backend logic, API endpoints, and potentially for automated tasks like cron jobs (e.g., YouTube API polling for the Tutorial Discovery Engine, as envisioned in documentation).

## Data Models:

Detailed data models for Firestore collections (Users, Projects, Scripts, Community Posts, Tutorials, Resources etc.) are outlined in the main "Immersive Storytelling Lab Platform (ISL.SIXR.tv) - Full Documentation". This blueprint provides a high-level overview of features and architecture.

## Style Guidelines:

-   **Primary Color:** Deep indigo (#4B0082) - Evokes creativity, depth, and sophistication. Used for key branding elements and calls to action.
-   **Background Color:** Very dark gray (#222222) - Provides a sleek, modern backdrop that ensures content and UI elements have high contrast and readability.
-   **Accent Color:** Gold (#FFD700) - Used sparingly for highlighting interactive elements, awards, or important notifications, adding a touch of prestige and drawing user attention.
-   **Fonts:** Clean and modern sans-serif fonts (e.g., Inter, Montserrat, or similar) to ensure readability and a professional appearance across the platform.
-   **Icons:** Minimalist, line-based icons, primarily white or using the accent color (gold) for specific highlights. Icons should be consistent and easily understandable.
-   **Layout:** Modular grid-based layouts for balanced screen composition, ensuring a clean presentation, responsive design, and scalability of content display.

This document is intended as a high-level guide. For specific implementation details, component designs, and complete data schemas, please refer to the main platform documentation and codebase.
