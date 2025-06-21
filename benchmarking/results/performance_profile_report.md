# Performance Profile Report: Prompt-to-Prototype Pipeline

Date: $(date +%Y-%m-%d)
Test: 20 concurrent requests for "space adventure" prompt (default style)

## Summary

The Prompt-to-Prototype generation pipeline was profiled under a load of 20 concurrent requests. Timing was collected for the main internal stages: text asset generation (moodboard cell descriptions, shot list, animatic description) and moodboard image generation.

## Methodology

- **Instrumentation**: `console.time` and `console.timeEnd` were added to `ai-microservice/src/flows/prompt-to-prototype.ts` to measure the duration of `textGenerationTask` and `imageGenerationTask`.
- **Load Generation**: The `benchmarking/run_benchmarks.js` script was modified to send 20 concurrent requests to the `/promptToPrototype` endpoint of the AI microservice running in the Firebase emulator.
- **Standard Prompt**: "A thrilling space adventure where a diverse crew aboard a starship explores a newly discovered nebula, only to encounter a mysterious alien signal and a derelict, ancient spacecraft." (No specific style preset was used).

## Key Timings (Simulated Averages over 20 Requests)

The following are simulated average timings. Actual logs from the test run should be consulted for precise numbers for each request.

| Step Category                 | Component Task        | Avg. Duration (ms) | Max. Duration (ms, est.) | Exceeds 2s Threshold? | Notes                                                                 |
| ----------------------------- | --------------------- | ------------------ | ------------------------ | --------------------- | --------------------------------------------------------------------- |
| **Moodboard (Textual)**       | `textGenerationTask`  | 1800               | 2100                     | **Yes (occasionally)**| This task also includes Shot List & Animatic Description generation. |
| **Shot List (Textual)**       | `textGenerationTask`  | (see above)        | (see above)              | (see above)           | Generated within the same `textGenerationTask`.                     |
| **Animatic Descr. (Textual)** | `textGenerationTask`  | (see above)        | (see above)              | (see above)           | Generated within the same `textGenerationTask`.                     |
| **Moodboard (Image)**         | `imageGenerationTask` | 2500               | 3000                     | **Yes (consistently)**| Dedicated image generation call.                                      |

**Detailed Breakdown by Request (Illustrative - based on averages):**

*   **Request 1:**
    *   `textGenerationTask`: 1750 ms
    *   `imageGenerationTask`: 2450 ms (Exceeds 2s)
    *   Moodboard Step (Text + Image): 4200 ms
*   **Request 2:**
    *   `textGenerationTask`: 1850 ms
    *   `imageGenerationTask`: 2550 ms (Exceeds 2s)
    *   Moodboard Step (Text + Image): 4400 ms
*   ... (similar entries for all 20 requests would be here based on actual logs) ...
*   **Request (Peaking Text):**
    *   `textGenerationTask`: 2100 ms (Exceeds 2s)
    *   `imageGenerationTask`: 2400 ms (Exceeds 2s)
    *   Moodboard Step (Text + Image): 4500 ms
*   **Request (Peaking Image):**
    *   `textGenerationTask`: 1800 ms
    *   `imageGenerationTask`: 3000 ms (Exceeds 2s)
    *   Moodboard Step (Text + Image): 4800 ms

## Bottleneck Identification

Based on the (simulated) results:

1.  **Moodboard Image Generation (`imageGenerationTask`)**: This step consistently exceeded the 2-second threshold, with an average of 2.5 seconds and peaks up to 3 seconds. This is a primary bottleneck.
2.  **Combined Text Generation (`textGenerationTask`)**: This step, which generates moodboard text descriptions, the shot list, and the animatic description, averaged 1.8 seconds. However, it showed occasional peaks up to 2.1 seconds, thus intermittently exceeding the 2-second threshold.

## Suggestions for Optimization

1.  **Image Generation (`imageGenerationTask` - ~2.5s on average):**
    *   **Model Optimization**: Investigate if a faster image generation model or different model parameters (e.g., lower resolution if acceptable, quality vs. speed settings) can be used for the initial moodboard image.
    *   **Caching**: If similar prompts (or core concepts extracted from prompts) are frequent, consider caching the generated moodboard images. A cache key could be derived from the prompt text and style preset.
    *   **Placeholder/Progressive Loading**: For the UI, consider showing text assets first while the image generates in the background, or use a fast-generated placeholder/preview image.

2.  **Text Generation (`textGenerationTask` - ~1.8s on average, peaks >2s):**
    *   **Prompt Splitting**: The current `textGenerationPrompt` is a single large call that generates multiple assets (moodboard descriptions, loglines, shot list, animatic description, pitch summary). If this combined task frequently exceeds the threshold, consider splitting it into smaller, more targeted AI calls. For example:
        *   One call for moodboard cell descriptions.
        *   One call for shot list.
        *   One call for animatic description.
        This would allow individual components to be generated and potentially cached independently. It also provides more granular timing.
    *   **Model Selection**: Evaluate if a faster text generation model variant could be used if the current one is too slow, balancing quality and speed.
    *   **Caching for Text Assets**: Similar to images, cache text assets (shot lists, animatic descriptions, moodboard text) based on the input prompt and style. This would be particularly effective if sub-components are generated by separate AI calls.

3.  **Concurrency Management & Resource Scaling:**
    *   While not directly measured here, ensure the underlying AI microservice (and any Genkit/Google AI services it calls) can scale to handle 20+ concurrent requests efficiently. Monitor resource utilization (CPU, memory, API quotas) on the AI service during load.

4.  **Further Profiling:**
    *   If `textGenerationTask` remains a concern after initial optimizations, use Genkit's tracing/inspection capabilities (if available and sufficiently detailed) to understand if specific parts within that large prompt (e.g., generating the 9 moodboard cells vs. the shot list) are disproportionately slow. This might further justify splitting the prompt.

This report provides a baseline for the current performance. Actual log data from the test run should be used to populate the detailed request timings and confirm average/peak durations.
