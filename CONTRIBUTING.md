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
- The CI pipeline will also automatically check your code against these linting and type-checking standards on every pull request.

## Testing
- All new features and bug fixes should include appropriate tests. This includes unit tests and, where applicable, integration tests.
- Run tests using \`npm run test\` from the root directory for frontend tests and from within microservice directories for their specific tests.
- Ensure all tests pass before submitting a pull request.
- Aim for good test coverage for your contributions.
- The CI pipeline automatically enforces test coverage requirements on every pull request.

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
