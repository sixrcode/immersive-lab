
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
  moodBoardCells: z.array(
    z.string().describe("A detailed textual description for one cell of the 3x3 mood board, covering its specific visuals, palette, atmosphere, and key props/elements. Aim for 2-4 sentences per cell.")
  ).length(9).describe("An array of 9 textual descriptions, one for each cell of a 3x3 mood board grid, ordered from top-left to bottom-right, row by row."),
  moodBoardImage: z
    .string()
    .describe(
      "A single representative image for the mood board concept, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  shotList: z.string().describe('A numbered shot-list (6-10 shots) with suggested lenses, camera moves, and framing notes. Presented as a multi-line string, with each shot on a new line and values separated by commas (Shot #,Lens,Camera Move,Framing Notes). Do not include a header row.'),
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

  2.  **Mood Board 3x3 Grid Cell Descriptions**: Generate an array of 9 detailed textual descriptions, one for each cell of a 3x3 mood board grid. The order should be row by row, starting from top-left (cell 1) to bottom-right (cell 9). For each cell, provide a description (approximately 2-4 sentences) that clearly outlines:
      *   **Visuals**: The key imagery or scene depicted.
      *   **Palette**: The dominant colors and overall color scheme.
      *   **Atmosphere**: The mood or feeling the cell should evoke (e.g., mysterious, vibrant, calm, tense).
      *   **Key Props/Elements**: Specific objects, characters, or significant visual details.
      The output for this entire item must be a JSON array of 9 strings. Each string in the array corresponds to one cell's description.

  3.  **Shot List**: Create a numbered shot list consisting of 6 to 10 key shots for the project. For each shot, provide the Shot Number, Lens, Camera Move, and Framing Notes.
      Output each shot on a new line, with values separated by a comma (e.g., Shot #,Lens,Camera Move,Framing Notes).
      **Do not include a header row in the shot list output.**
      Example of a single line:
      1,35mm,Slow Push-in,Close up on character's eyes revealing fear.

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
    const imagePromptText = `Generate a single piece of concept art or a visual summary that captures the overall essence, style, and atmosphere for a project based on: '${input.prompt}'. This image should serve as a central, representative piece for a mood board concept, evoking a "style collage" or "visual keynote" feel. Focus on compelling composition and artistic representation of the theme.`;
    
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', 
      prompt: [{text: imagePromptText}],
      config: {
        responseModalities: ['TEXT', 'IMAGE'], 
      },
    });

    if (!media || !media.url) {
        console.warn("Mood board image generation failed or returned no URL. Using placeholder.");
        textOutput.moodBoardImage = "https://placehold.co/600x400.png?text=Image+Gen+Failed";
    } else {
        textOutput.moodBoardImage = media.url;
    }
    
    return textOutput;
  }
);
