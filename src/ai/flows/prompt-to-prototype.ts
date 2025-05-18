
'use server';

/**
 * @fileOverview Turns a single prompt into mood boards, loglines, shot-lists, proxy clips.
 *
 * - promptToPrototype - A function that handles the prompt to prototype process.
 * - PromptToPrototypeInput - The input type for the promptToPrototype function.
 * - PromptToPrototypeOutput - The return type for the promptToPrototype function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const PromptToPrototypeInputSchema = z.object({
  prompt: z.string().describe('A single prompt describing the desired project.'),
});
export type PromptToPrototypeInput = z.infer<typeof PromptToPrototypeInputSchema>;

const PromptToPrototypeOutputSchema = z.object({
  loglines: z.array(z.object({
    tone: z.string().describe("The tone of the logline (e.g., whimsical, gritty, dramatic)."),
    text: z.string().describe("The logline text."),
  })).describe('Three logline variants targeting distinct tones.'),
  moodBoardDescription: z.string().describe('A textual description of a 3x3 grid of images for the mood board, detailing palette, atmosphere, and key props for each of the 9 cells. This description should be detailed enough to guide manual creation or further AI generation of the individual grid images.'),
  moodBoardImage: z
    .string()
    .describe(
      "A single representative image for the mood board concept, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  shotList: z.string().describe('A numbered shot-list (6-10 shots) with suggested lenses, camera moves, and framing notes. Present as a multi-line string, ideally in a CSV-like format: "Shot #,Lens,Camera Move,Framing Notes".'),
  proxyClipAnimaticDescription: z.string().describe('A detailed textual description for a 4-second proxy clip animatic. This should outline key visuals, pacing, and transitions to help visualize the animatic, as if describing a sequence of still frames or very simple animations.'),
});

export type PromptToPrototypeOutput = z.infer<typeof PromptToPrototypeOutputSchema>;

export async function promptToPrototype(input: PromptToPrototypeInput): Promise<PromptToPrototypeOutput> {
  return promptToPrototypeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'promptToPrototypePrompt',
  input: {schema: PromptToPrototypeInputSchema},
  output: {schema: PromptToPrototypeOutputSchema},
  prompt: `You are a creative assistant helping to generate initial assets for a project based on a single prompt. Your goal is to deliver a four-item prototype package in under 30 seconds.

  Based on the following user prompt:
  '''
  {{{prompt}}}
  '''

  Generate the following assets:

  1.  **Loglines**: Provide three distinct logline variants for the project. Each logline should target a different tone (e.g., whimsical, gritty, dramatic, comedic, thrilling, mysterious).
      Output schema for each logline: { tone: string, text: string }

  2.  **Mood Board Description**: Describe a 3x3 grid of images that would visually represent the project's aesthetic. For each of the 9 cells in the grid, detail the envisioned content, including palette, atmosphere, and key props or visual elements. This description should be comprehensive.

  3.  **Shot List**: Create a numbered shot list consisting of 6 to 10 key shots for the project. For each shot, suggest lenses, camera moves, and framing notes.
      Format this as a multi-line string. Each line should represent a shot and follow a CSV-like structure: "Shot #,Lens,Camera Move,Framing Notes".
      Example:
      "1,35mm,Slow Push-in,Close up on character's eyes revealing fear."
      "2,24mm,Static Wide,Establishing shot of the desolate landscape."

  4.  **Proxy Clip Animatic Description**: Provide a detailed textual description for a 4-second proxy clip animatic. This ultra-low-res moving animatic should preview pacing and key moments. Describe the sequence of visuals, any simple motion, and how it conveys the core idea or feeling of the prompt. Imagine you're describing 3-5 key still frames that would make up this animatic.

  Ensure all outputs adhere to the schema provided.
  The mood board image itself will be generated separately after this text generation step.
  `,
});

const promptToPrototypeFlow = ai.defineFlow(
  {
    name: 'promptToPrototypeFlow',
    inputSchema: PromptToPrototypeInputSchema,
    outputSchema: PromptToPrototypeOutputSchema,
  },
  async (input: PromptToPrototypeInput) => {
    // Generate textual components first
    const {output: textOutput} = await prompt(input);

    if (!textOutput) {
      throw new Error("Failed to generate textual components for the prototype.");
    }

    // Generate a single representative mood board image using Gemini
    // The prompt for the image can be the user's original prompt, or derived from the moodBoardDescription
    const imagePromptText = `Generate a single image that captures the overall essence and style described for a project based on: ${input.prompt}. This image should serve as a central piece for a larger mood board concept.`;
    
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: [{text: imagePromptText}],
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // Important: Must include TEXT even if only IMAGE is primary.
      },
    });

    if (!media || !media.url) {
        // Fallback or error handling if image generation fails
        console.warn("Mood board image generation failed or returned no URL. Using placeholder or empty string.");
        textOutput.moodBoardImage = "https://placehold.co/600x400.png?text=Image+Generation+Failed"; // Or handle as an error
    } else {
        textOutput.moodBoardImage = media.url;
    }
    
    return textOutput;
  }
);
