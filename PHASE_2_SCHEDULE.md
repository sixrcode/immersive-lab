## Phase 2 Project Schedule

### Foundational Work & Refactoring

#### 1. Architectural Consolidation: AI Services
- **Task:** Resolve overlap between `aiApi` function and `Prompt Generation service`. ✅ Done
    - **Sub-task:** Decide on a single implementation path.
    - **Sub-task:** Migrate/deprecate the redundant service.
- **Dependencies:** None
- **Estimated Timeframe:** Completed Q2 2024
- **Notes:** Critical for reducing complexity and avoiding merge conflicts. Consolidated into `aiApi` (the Centralized AI Microservice). The `prompt-gen-service` is deprecated.

#### 2. Architectural Consolidation: Script Analyzer
- **Task:** Migrate Script Analyzer entirely into the AI microservice. ✅ Done
- **Dependencies:** None
- **Estimated Timeframe:** Completed Q2 2024
- **Notes:** Script Analyzer functionality is now fully integrated into the Centralized AI Microservice (`aiApi`).

#### 3. Collaboration Service Model Refactor ✅ Done
- **Task:** Refactor collaboration-service models and tests.
    - **Sub-task:** Use a single initialized Mongoose instance.
    - **Sub-task:** Update test suites.
- **Dependencies:** None
- **Estimated Timeframe:** Completed Q2 2024
- **Notes:** Refactored models and tests to use a single initialized Mongoose instance, preventing redundant inits. This improves cross-test reliability and stability for project CRUD and membership APIs, setting the stage for real-time collaboration features.

#### 4. Data Management & Consistency Strategy 🕒 In Progress
- **Task:** Define and implement a strategy for data consistency across microservices, particularly between project data (MongoDB) and storyboard data (Firestore). Evaluate and address synchronization needs (e.g., on project deletion) and define clear data ownership. This includes the ongoing evaluation of MongoDB vs. Firestore for the Collaboration Service.
- **Dependencies:** None
- **Estimated Timeframe:** TBD
- **Notes:** Crucial for long-term data integrity and preventing orphaned data. Initial design and planning are underway. This task is a high priority.

#### 5. Containerization & Cloud Deployment: Collaboration Service ⏭️ Next
- **Task:** Verify and optimize the existing Docker container for the collaboration-service. Ensure it runs correctly with a cloud database instance and is ready for consistent Cloud Run deployments.
    - **Sub-task:** Verify Dockerfile and build process.
    - **Sub-task:** Test with cloud MongoDB instance.
    - **Sub-task:** Prepare Cloud Run deployment scripts/configs.
- **Dependencies:** Collaboration Service.
- **Estimated Timeframe:** TBD
- **Notes:** Aligns collaboration-service deployment with other microservices like the AI service, improving infrastructure cohesion.

### AI Feature Enhancements

#### 6. AI Output Benchmarking & Evaluation ✅ Done
- **Task:** Define and implement benchmarking and evaluation for AI outputs.
    - **Sub-task:** Define baseline generation times.
    - **Sub-task:** Create sample prompts for measuring output quality and consistency.
    - **Sub-task:** Implement monitoring and logging for AI services (latency, error rates).
- **Dependencies:** Foundational AI services in place.
- **Estimated Timeframe:** Completed Q2 2024
- **Notes:** Crucial for tracking improvements and detecting regressions. Initial framework for performance and quality benchmarking, along with an automated AI output evaluation pipeline, is now in place.

#### 7. Storyboard Studio - Full Implementation 🕒 In Progress
- **Task:** Implement real AI image generation for Storyboard Studio.
    - **Sub-task:** Integrate Genkit for actual image generation.
    - **Sub-task:** Allow import of Prompt Studio outputs (shot lists, styles).
- **Dependencies:** `ai-microservice` ready for new Genkit flows.
- **Estimated Timeframe:** TBD
- **Notes:** Storyboard Studio MVP is already in place using placeholder images. This task focuses on full functionality, including the integration of real AI image generation (currently started). Timelines may need adjustment due to the earlier-than-planned start of this feature.

#### 8. Prompt-to-Prototype Studio - Enhancements
- **Task:** Implement Phase 2 enhancements (e.g., creative block refinements, interactive editing, selective regeneration).
- **Dependencies:** Core Prompt-to-Prototype Studio.
- **Estimated Timeframe:** TBD

#### 9. AI Script Analyzer - Enhancements
- **Task:** Implement more nuanced script analysis feedback.
- **Dependencies:** Core AI Script Analyzer.
- **Estimated Timeframe:** TBD

### Feature Development & Integration

#### 10. Production Board - Full Functionality 🕒 In Progress
- **Task:** Build out full Production Board functionality (workflow/kanban).
- **Dependencies:** None
- **Estimated Timeframe:** TBD
- **Notes:** Focus is on delivering a usable Kanban UI MVP, building upon existing project metadata and APIs. Further enhancements to follow.

#### 11. Real-Time Collaboration - Enhancements
- **Task:** Advance Real-Time Collaboration features (version history, comments, presence).
- **Dependencies:** Existing collaboration service. Potential dependency on data management strategy decision.
- **Estimated Timeframe:** TBD

#### 12. Portfolio & Community Features - Growth
- **Task:** Expand portfolio and community features (project feedback mechanisms, discovery).
- **Dependencies:** Existing portfolio service.
- **Estimated Timeframe:** TBD

### Performance & Scalability

#### 13. Performance Optimizations 🕒 In Progress
- **Task:** Implement performance optimizations (e.g., streaming responses for Storyboard generation).
    - **Sub-task:** Load-test new pipeline with larger prompts/images.
    - **Sub-task:** Investigate edge computation and caching.
- **Dependencies:** Key features (Storyboard, Prompt Gen) in place for testing.
- **Estimated Timeframe:** TBD
- **Notes:** Focus includes enabling streaming responses for Storyboard generation, optimizing image handling (e.g., for base64), and profiling/parallelizing AI microservice flows.

#### 14. Concurrency Controls
- **Task:** Implement queuing or concurrency controls for prompt generation service.
- **Dependencies:** Prompt generation service.
- **Estimated Timeframe:** TBD

### General Project Tasks

#### Buffer Time
- **Task:** Allocate buffer time for code reviews, testing, and unexpected delays across all major feature deliveries.
- **Estimated Timeframe:** Calculated as a percentage of total feature time or specific blocks per milestone.

### Risk Management

#### 15. Contingency Planning for AI Dependencies
- **Task:** Establish proactive measures for managing dependencies on external AI services.
    - **Sub-task:** Regularly monitor Genkit and Google AI model API updates, changes, and potential deprecations.
    - **Sub-task:** Identify and evaluate alternative AI models or services for critical features (Prompt-to-Prototype, Storyboard, Script Analysis).
    - **Sub-task:** Develop strategies for caching AI-generated results to mitigate impact from API limits or latency issues.
    - **Sub-task:** Define a response plan for significant changes in third-party AI service availability or terms.
- **Dependencies:** None
- **Estimated Timeframe:** TBD (Ongoing)
- **Notes:** Crucial for mitigating risks to Phase 2 deliverables and ensuring project continuity.
