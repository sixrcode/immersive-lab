# Contributing to ISL.SIXR.tv

Thank you for your interest in contributing to the Immersive Storytelling Lab Platform! We welcome contributions from everyone.

## How to Contribute
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)
- [Your First Code Contribution](#your-first-code-contribution)
- [Pull Request Process](#pull-request-process)

## Getting Started (Development Setup)
1. Fork the repository on GitHub.
2. Clone your fork locally: \`git clone https://github.com/YOUR_USERNAME/immersive-lab.git\`
3. Navigate to the project directory: \`cd immersive-lab\`
4. Install dependencies for the main application: \`npm install\`
   - Note: Individual microservices (e.g., in `ai-microservice/`, `collaboration-service/`) have their own `package.json` files and may require separate dependency installations if you are working within them (e.g., \`cd ai-microservice && npm install\`).
5. Set up your \`.env.local\` file in the root of the Next.js application (under `src/`) as described in the main README.md's "Environment Variables (Next.js App)" section. Microservices may also require their own environment variable setup (e.g., as per their respective READMEs or `.env.example` files).
6. Run the development server for the Next.js application: \`npm run dev\` (from the root project directory).
   - To run microservices, refer to their specific README files for startup instructions.

## Coding Standards
- Please ensure your code adheres to the project's linting rules. Run \`npm run lint\` (from the root and/or microservice directories) to check your changes.
- We use Prettier for code formatting (often integrated with ESLint). Please ensure your code is formatted before committing. Configuration for ESLint can be found in `eslint.config.cjs`.
- Follow common JavaScript/TypeScript best practices regarding code clarity, naming conventions, and comments.
- Write modular and maintainable code.

## Testing
- All new features and bug fixes should include appropriate tests. This includes unit tests and, where applicable, integration tests.
- Run tests using \`npm run test\` from the root directory for frontend tests and from within microservice directories for their specific tests.
- Ensure all tests pass before submitting a pull request.
- Aim for good test coverage for your contributions.

## Pull Request Process
1. Ensure your code lints and all tests pass.
2. Commit your changes with clear and descriptive commit messages.
3. Push your changes to your forked repository.
4. Open a Pull Request (PR) against the \`develop\` branch of the main repository (or \`main\` if \`develop\` is not actively used - assuming \`develop\` for now as per common practice).
5. Your PR description should:
   - Clearly describe the changes made.
   - Explain the problem solved or feature added.
   - Link to any relevant GitHub Issues (e.g., "Fixes #123" or "Closes #123").
6. Update any relevant documentation, including README.md files, with details of changes to the interface, new environment variables, exposed ports, useful file locations, etc.
7. If your PR introduces a new feature or significant change, consider if version numbers in example files or documentation need updating according to [SemVer](http://semver.org/).
8. You may merge the Pull Request once you have the sign-off of at least one other developer (or as per project maintainer guidelines). If you do not have merge permissions, request a review and merge from a maintainer.

## Branching Strategy
We generally follow a Gitflow-like branching strategy:
- **main**: Contains production-ready code. Direct pushes are restricted.
- **develop**: Serves as the primary integration branch for ongoing development. Feature branches are merged here. PRs should typically target this branch.
- **feature/\***: For developing new features (e.g., `feature/new-ai-tool`). Branched from `develop`.
- **bugfix/\***: For fixing bugs on releases/main (e.g., `bugfix/login-error-hotfix`). Branched from `main` and merged back into `main` and `develop`.
- **fix/\*** or **chore/\***: For smaller fixes or chores on development code (e.g., `fix/typo-in-docs`, `chore/refactor-utils`). Branched from `develop`.

## Reporting Bugs
- Use the GitHub Issues tab in the repository to report bugs.
- Check if the bug has already been reported.
- Provide a clear and descriptive title (e.g., "Bug: Crash when uploading SVG to Prompt Studio").
- Include the following in the description:
    - Steps to reproduce the bug.
    - Expected behavior.
    - Actual behavior (including any error messages or screenshots).
    - Your environment (e.g., browser version, OS).

## Suggesting Enhancements
- Use the GitHub Issues tab to suggest new features or enhancements.
- Provide a clear and descriptive title (e.g., "Feature Request: Add support for custom style presets in Prompt Studio").
- In the description, detail:
    - The proposed enhancement and its user benefits.
    - The use case or problem it solves.
    - Any potential implementation ideas (optional).

## Code of Conduct
Please note that this project is released with a Contributor Code of Conduct. By participating in this project, you agree to abide by its terms. (A `CODE_OF_CONDUCT.md` file should be added to detail these terms).

## Minimizing Merge Conflicts

To maintain a smooth development workflow and reduce the likelihood of merge conflicts, please consider the following best practices, especially when working on features that might touch shared areas of the codebase:

1.  **AI Service Consolidation:**
    *   The platform's AI functionalities, particularly for prompt-to-prototype, have been consolidated into the `ai-microservice`. The `services/prompt-gen-service` is deprecated. Ensure all new development targets the `ai-microservice` to prevent conflicting changes.

2.  **Shared Data Schemas (`src/lib/ai-types.ts`, `packages/types/`):**
    *   Changes to core data structures (e.g., `PromptPackage`, `StoryboardPackage`) should be communicated early with the team.
    *   Coordinate schema changes to avoid simultaneous edits. Consider centralizing significant model changes on a specific branch or using feature flags for new fields to allow incremental merges.

3.  **Documentation Updates (`README.md`, `CHANGELOG.md`):**
    *   For `CHANGELOG.md`, try to update it sequentially or consolidate updates into a single PR before a release to avoid conflicts from multiple feature branches.
    *   For `README.md`, if multiple features require updates to the same section, coordinate these changes or merge them serially.

4.  **Environment Configurations (`.env.example`, Config Files):**
    *   When adding new environment variables, list them alphabetically in `.env.example` files to minimize diff overlaps.
    *   Clearly communicate any new environment variable requirements in your Pull Request descriptions so they can be merged carefully.

5.  **Microservice Integration Points (API Routes, Client Hooks):**
    *   Be mindful when editing code that handles communication between the frontend and microservices (e.g., Next.js API route handlers in `src/app/api/`, client-side hooks that call these services).
    *   If core integration logic changes (e.g., auth methods, endpoint paths, fundamental error handling), ensure these changes are communicated and feature branches are rebased promptly if they depend on this logic. Consider designating owners or liaisons for key integration modules.

6.  **Sequencing of Refactors vs. Features:**
    *   Large-scale refactoring (e.g., renaming files/directories, significant logic shifts in shared services like `ai-microservice/index.js` or navigation components) should ideally be done in isolation and merged into the main development branch *before* feature branches diverge too far.
    *   Communicate planned refactors in advance so other developers can anticipate rebasing or temporarily avoid working on those specific parts of the codebase.

By following these guidelines, we can collectively reduce integration friction. Regularly pulling changes from the main development branch and rebasing your feature branches can also help catch and resolve conflicts earlier.
