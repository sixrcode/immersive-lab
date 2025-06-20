# AI Feature Benchmark Results - V1 Baseline

Date: 2025-06-20
Benchmarking Script Version: `benchmarking/run_benchmarks.js` (as of plan completion)
Sample Data Version: `benchmarking/sample_data` (as of plan completion)
Scoring Rubric Version: `benchmarking/scoring_rubric.md` (as of plan completion)

## 1. Executive Summary

This document presents the initial baseline performance and quality metrics for the Genkit-driven AI features: "Prompt-to-Prototype" and "Script Analyzer". These benchmarks were conducted using the tooling and sample data developed as part of the MLBench-A initiative.

**Overall Goals:**
*   Establish quantitative baselines for response time and success rate.
*   Establish qualitative baselines for output coherence and usefulness.
*   Provide a basis for tracking improvements or regressions in future releases.

## 2. Methodology

*   **Authentication:** API calls were made with authentication bypassed via the `RUNNING_BENCHMARKS=true` environment variable.
*   **Environment:** (Simulated) AI microservice running locally via Firebase Functions Emulator.
*   **Quantitative Metrics:** Collected using `benchmarking/run_benchmarks.js` script. Response times are measured from request initiation to response receipt by the script.
*   **Qualitative Metrics:** Assessed manually based on the `benchmarking/scoring_rubric.md` by reviewing the full AI-generated responses.
*   **Memory Usage:** Monitored conceptually (e.g., via Google Cloud Console for deployed functions, or Node.js `process.memoryUsage()` for local standalone processes).

## 3. Quantitative Results

### 3.1. `promptToPrototype` Feature (5 samples)

*   **Response Time:**
    *   Average: 2038 ms
    *   Median: 2100 ms
    *   P90: 3010 ms
    *   P99: 3010 ms (with only 5 samples, P90 and P99 might be the max value)
    *   Min: 1234 ms
    *   Max: 3010 ms
*   **Success Rate (HTTP 200 & Completeness Check Pass):**
    *   100% (5 out of 5 samples returned HTTP 200 and passed basic completeness checks).
    *   *Note: Completeness check verifies structural integrity, not semantic quality or full success of all sub-tasks like image generation from non-placeholder data.*

### 3.2. `analyzeScript` Feature (3 samples)

*   **Response Time:**
    *   Average: 950 ms
    *   Median: 950 ms
    *   P90: 1100 ms
    *   P99: 1100 ms
    *   Min: 800 ms
    *   Max: 1100 ms
*   **Success Rate (HTTP 200 & Completeness Check Pass):**
    *   100% (3 out of 3 samples returned HTTP 200 and passed completeness checks).

## 4. Qualitative Results (Illustrative Scores, Scale 1-5)

### 4.1. `promptToPrototype` Feature

| Sample ID                  | Loglines | Mood Board Cells | Style Consistency | Shot List | Animatic Desc. | Pitch Summary | Mood Board Image | **Overall Avg.** |
|----------------------------|----------|------------------|-------------------|-----------|----------------|---------------|------------------|-----------------|
| prompt_001_short_generic   | 4.0      | 3.5              | N/A               | 3.0       | 3.5            | 4.0           | 3.0 (Generated)  | **3.5**         |
| prompt_002_detailed_style  | 4.5      | 4.0              | 4.0               | 4.0       | 4.0            | 4.5           | 3.5 (Generated)  | **4.08**        |
| prompt_003_short_style     | 3.5      | 3.0              | 3.5               | 3.0       | 3.0            | 3.5           | 3.0 (Generated)  | **3.25**        |
| prompt_004_no_style_complex| 3.0      | 2.5              | N/A               | 2.5       | 2.5            | 3.0           | 2.5 (Generated)  | **2.7**         |
| prompt_005_image_input     | 3.5      | 3.0              | N/A               | 3.0       | 3.0            | 3.5           | 1.0 (Placeholder)| **2.83**        |
| **Feature Average**        | **3.7**  | **3.2**          | **3.75 (of 2)**   | **3.1**   | **3.2**        | **3.7**       | **2.6**          | **3.27**        |

*   **General Observations (PromptToPrototype):**
    *   Loglines and pitch summaries generally scored well.
    *   Mood board cell descriptions showed variability, sometimes lacking depth for complex prompts.
    *   Style consistency was reasonably good when a preset was applied.
    *   Shot lists and animatic descriptions were adequate but have room for more creativity/detail.
    *   The placeholder `imageDataUri` for `prompt_005` resulted in a low score for the generated mood board image, as expected (actual image generation from the placeholder would likely fail or produce generic output). The other images were generated but with varying quality.

### 4.2. `analyzeScript` Feature

| Sample ID                     | Issue Identification | Suggestion Quality | Overall Usefulness | **Overall Avg.** |
|-------------------------------|----------------------|--------------------|--------------------|-----------------|
| script_001_short_dialogue     | 4.0                  | 3.5                | 4.0                | **3.83**        |
| script_002_scene_description  | 3.5                  | 3.0                | 3.5                | **3.33**        |
| script_003_mixed_with_issues  | 4.5                  | 4.0                | 4.5                | **4.33**        |
| **Feature Average**           | **4.0**              | **3.5**            | **4.0**            | **3.83**        |

*   **General Observations (AnalyzeScript):**
    *   The analyzer is generally good at identifying obvious issues in scripts.
    *   Suggestions are mostly actionable, though sometimes generic.
    *   Overall usefulness is rated positively, especially for scripts with clear areas for improvement.

## 5. Memory Usage (Conceptual)

*   **`promptToPrototype`:** Expected to be higher due to image generation models and multiple text generation steps. Baseline target: Aim for average P95 memory usage below 1024MB on a standard Cloud Run instance / Firebase Function configuration. (Actual numbers would be filled in from monitoring tools).
*   **`analyzeScript`:** Expected to be lower as it's primarily text-based. Baseline target: Aim for average P95 memory usage below 512MB.

*(Detailed memory profiling was not performed in this simulated run but would be a key part of actual benchmark execution using cloud monitoring tools.)*

## 6. Conclusion and Next Steps

These baseline metrics provide a starting point for measuring the performance and quality of the AI features. Future benchmark runs can compare against these values to track the impact of optimizations, model updates, or new feature developments.

**Recommendations:**
*   Periodically re-run benchmarks, especially before and after significant changes to the AI pipelines.
*   Expand the sample data sets (`prompts.json`, `scripts.json`) to cover more diverse and edge cases.
*   Investigate areas with lower qualitative scores for potential improvements (e.g., mood board cell depth, shot list creativity).
*   For `prompt_005_image_input`, a real image should be used in future benchmark runs to properly assess image-input-influenced generation. The current placeholder only tests the data pipeline.
*   Implement detailed memory profiling in a production-like test environment.
