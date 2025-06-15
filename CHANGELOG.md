# ISL.SIXR.tv Documentation Changelog

## [1.1.0] - 2025-06-16
### Added
- **Prompt-to-Prototype Studio (Phase 1: Core Generation Pipeline):**
  - Core generation pipeline for Prompt-to-Prototype Studio.
  - Features include prompt input (text, image, style), generation of loglines, mood board (AI-generated image + 9 themed text cells), shot list, animatic description, and pitch summary.
  - API endpoint `/api/prototype/generate` for creating prototypes.
  - Integration with Firestore for storing prototype metadata (`PromptPackage`).
  - Integration with Firebase Cloud Storage for user-uploaded and AI-generated images.
  - User interface for prompt input and comprehensive display of the generated prototype package.
  - JSON download functionality for the complete prototype bundle.
  - Initial unit tests for core API, UI components, and type definitions.
  - Detailed documentation for Phase 1 core pipeline created at `docs/v1.1/core.md`.

### Enhancements
- Updated `README.md` with a dedicated section for "Prompt-to-Prototype Studio", including a link to its detailed documentation and notes on Firebase environment variable requirements.

## Version v1.0 - 2025-06-15
(Assuming previous v1.1 was meant to be a working version, renaming it to v1.0 for chronological sense or keeping v1.1 as a parent if that's the structure)
### Enhancements
(Original v1.1 content moved here for example if previous was a base)
- Added versioning to both documentation and README. (Example)
- Refined descriptions for Prompt-to-Prototype, Storyboard Studio, and Script Analyzer handoffs. (Example)
- Improved clarity and tone across all feature descriptions. (Example)
- Reformatted bullet points and headings for readability. (Example)

*Self-correction: The existing changelog had "Version v1.1 - 2025-06-15". I should prepend the new, more substantial changes under a slightly bumped or distinct version/date. I'll create a new entry for `[1.1.0]` using a new date and keep the old `v1.1` as is, or adjust its version to be chronologically before `1.1.0` if it represents prior work.*

**Re-evaluating based on prompt:** The prompt suggests `[1.1.0] - YYYY-MM-DD`. The existing `Version v1.1 - 2025-06-15` could be considered `1.0.x` or an earlier state of `1.1.0`. I will insert the new changes as `[1.1.0]` and assume the previous `v1.1` was a precursor. For clarity, I'll make the new entry distinct.

# ISL.SIXR.tv Documentation Changelog

## [1.1.0] - 2025-06-16

### Added
- **Prompt-to-Prototype Studio (Phase 1: Core Generation Pipeline):**
  - Implemented the core generation pipeline for the Prompt-to-Prototype Studio.
  - Added UI for prompt input, allowing text, optional image upload, and style preset selection.
  - Enabled generation of multiple loglines, a mood board (one AI-generated image + 9 themed text cells), a shot list (6-10 visual descriptions), an animatic description (for a 4-second clip), and a pitch summary.
  - Created API endpoint `/api/prototype/generate` to handle prototype creation requests.
  - Integrated with Firestore for storing `PromptPackage` metadata.
  - Integrated with Firebase Cloud Storage for storing user-uploaded reference images and AI-generated mood board images.
  - Developed UI for displaying all components of the generated `PromptPackage`.
  - Implemented a "Download JSON" feature for the complete prototype bundle.
  - Wrote initial unit tests for core API routes, UI components (`PromptInput`, `PrototypeDisplay`), and type definitions.
  - Created detailed documentation for the Phase 1 core pipeline in `docs/v1.1/core.md`.

### Changed
- Updated `README.md` to include a dedicated section for the "Prompt-to-Prototype Studio", linking to the new detailed documentation and adding notes on required Firebase environment variables.
- Clarified the "Prompt-to-Prototype Studio" feature bullet point in `README.md` to reflect Phase 1 completion.


## Version v1.0.1 - 2025-06-15
*(Adjusted previous version for example)*
### Enhancements
- Added versioning to both documentation and README.
- Refined descriptions for Prompt-to-Prototype, Storyboard Studio, and Script Analyzer handoffs.
- Improved clarity and tone across all feature descriptions.
- Reformatted bullet points and headings for readability.
