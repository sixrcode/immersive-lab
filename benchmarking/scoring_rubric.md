# Qualitative Scoring Rubric for AI Features

This rubric outlines the criteria for qualitatively scoring the outputs of the AI features. Each criterion is scored on a scale of 1 (Poor) to 5 (Excellent).

## 1. `promptToPrototype` Feature

The overall quality of the `promptToPrototype` output will be an average of the scores for the sub-components.

### 1.1. Loglines (Average score of 3 loglines)
*   **Score 1 (Poor):** Loglines are irrelevant to the prompt, nonsensical, or grammatically incorrect. Tone is completely off.
*   **Score 2 (Fair):** Loglines vaguely relate to the prompt but miss key elements or are poorly constructed. Tone is inconsistent.
*   **Score 3 (Good):** Loglines are relevant and capture the main essence of the prompt. Generally well-written. Tone is appropriate.
*   **Score 4 (Very Good):** Loglines are engaging, accurately reflect the prompt, and are well-written. Tone is distinct and fitting.
*   **Score 5 (Excellent):** Loglines are exceptionally compelling, insightful, and creative, perfectly capturing the prompt's essence and nuances. Tone is spot-on and enhances the concept.

### 1.2. Mood Board Cell Descriptions (Average score of 9 cells)
*   **Score 1 (Poor):** Descriptions are generic, irrelevant to the prompt or the cell's theme, or missing.
*   **Score 2 (Fair):** Descriptions show some connection to the prompt/theme but are superficial or lack detail.
*   **Score 3 (Good):** Descriptions are mostly relevant and provide adequate detail for the theme, generally aligning with the prompt.
*   **Score 4 (Very Good):** Descriptions are detailed, evocative, and clearly tied to the prompt and the cell's theme. They offer good creative direction.
*   **Score 5 (Excellent):** Descriptions are highly imaginative, rich in detail, perfectly aligned with the prompt and theme, and provide strong, inspiring creative direction.

### 1.3. Style Consistency (If `stylePreset` was provided)
*   **Score 1 (Poor):** Specified style is ignored or inconsistently applied across different output components (loglines, mood board, shot list, pitch).
*   **Score 2 (Fair):** Specified style is minimally present or applied sporadically and inconsistently.
*   **Score 3 (Good):** Specified style is generally applied across most components, with minor inconsistencies.
*   **Score 4 (Very Good):** Specified style is clearly and consistently applied across all relevant components.
*   **Score 5 (Excellent):** Specified style is masterfully integrated throughout all outputs, enhancing the overall concept and demonstrating a nuanced understanding of the style.
*   **N/A:** If no `stylePreset` was provided in the input.

### 1.4. Shot List Coherence
*   **Score 1 (Poor):** Shot list is nonsensical, irrelevant to the prompt, or technically flawed (e.g., impossible camera moves for the context). Formatting is incorrect.
*   **Score 2 (Fair):** Shot list has some relevance but lacks clarity, creativity, or contains several technical/formatting errors.
*   **Score 3 (Good):** Shot list is generally coherent, relevant to the prompt, and technically plausible. Minor formatting issues may be present. 6-10 shots provided.
*   **Score 4 (Very Good):** Shot list is creative, well-structured, relevant, and enhances the prompt's narrative. Formatting is correct.
*   **Score 5 (Excellent):** Shot list is highly cinematic, innovative, and perfectly captures the essence of the prompt, offering clear visual storytelling. Formatting is perfect.

### 1.5. Proxy Clip Animatic Description
*   **Score 1 (Poor):** Description is vague, irrelevant, or does not describe a 4-second animatic sequence.
*   **Score 2 (Fair):** Description has some relevance but is unclear or lacks detail for visualizing an animatic.
*   **Score 3 (Good):** Description provides a decent outline of a 4-second animatic, covering key visuals and pacing.
*   **Score 4 (Very Good):** Description is clear, evocative, and effectively outlines a compelling 4-second animatic with good pacing and visual storytelling.
*   **Score 5 (Excellent):** Description is highly imaginative and detailed, perfectly translating the prompt into a vivid and well-paced 4-second animatic concept.

### 1.6. Pitch Summary
*   **Score 1 (Poor):** Pitch summary is irrelevant, poorly written, or fails to summarize the project.
*   **Score 2 (Fair):** Pitch summary touches upon the project idea but is unconvincing, unclear, or misses key aspects.
*   **Score 3 (Good):** Pitch summary is adequately written and covers the main points of the project.
*   **Score 4 (Very Good):** Pitch summary is compelling, well-written, and effectively encapsulates the project's core concept, tone, and appeal.
*   **Score 5 (Excellent):** Pitch summary is exceptionally persuasive, concise, and captures the project's essence with flair and insight.

### 1.7. Mood Board Image Generation
*   **Score 1 (Poor):** Image is a placeholder (e.g., "Image Gen Failed"), or completely irrelevant and low quality.
*   **Score 2 (Fair):** Image is generated but is of low quality, has significant artifacts, or is only vaguely relevant to the prompt.
*   **Score 3 (Good):** Image is relevant to the prompt and of acceptable quality. May have minor flaws.
*   **Score 4 (Very Good):** Image is high quality, aesthetically pleasing, and clearly represents the prompt's themes and style (if any).
*   **Score 5 (Excellent):** Image is exceptional in quality, highly creative, and perfectly captures the essence and style of the prompt.
*   **N/A:** If image generation was not expected for a particular test case (though current flow always attempts it).

## 2. `analyzeScript` Feature

The overall quality of the `analyzeScript` output will be an average of the scores for the sub-components.

### 2.1. Identification of Issues (Accuracy & Relevance)
*   **Score 1 (Poor):** Fails to identify obvious issues or flags non-issues. Analysis is irrelevant.
*   **Score 2 (Fair):** Identifies some minor issues but misses significant ones, or the analysis is superficial. 'Section' text is often mismatched.
*   **Score 3 (Good):** Identifies most key issues with reasonable accuracy. Analysis is generally relevant. 'Section' text is mostly accurate.
*   **Score 4 (Very Good):** Accurately identifies key issues and provides insightful analysis. 'Section' text is consistently accurate.
*   **Score 5 (Excellent):** Shows a deep understanding by identifying subtle yet important issues with high accuracy and providing nuanced analysis. 'Section' text is perfect.

### 2.2. Quality of Suggestions (Actionability & Clarity)
*   **Score 1 (Poor):** Suggestions are generic, unclear, unhelpful, or missing.
*   **Score 2 (Fair):** Suggestions are somewhat relevant but lack clarity or are not very actionable.
*   **Score 3 (Good):** Suggestions are generally clear, relevant, and actionable.
*   **Score 4 (Very Good):** Suggestions are clear, insightful, and provide concrete, actionable advice for improvement.
*   **Score 5 (Excellent):** Suggestions are highly insightful, creative, and offer specific, actionable improvements that significantly enhance the script.

### 2.3. Overall Usefulness of Analysis & Suggestions
*   **Score 1 (Poor):** The entire output is unhelpful or misleading.
*   **Score 2 (Fair):** The output has very limited usefulness.
*   **Score 3 (Good):** The output provides some useful insights and guidance.
*   **Score 4 (Very Good):** The output is highly useful and provides valuable feedback for script revision.
*   **Score 5 (Excellent):** The output is exceptionally valuable, offering deep insights and transformative suggestions that could significantly elevate the script.
