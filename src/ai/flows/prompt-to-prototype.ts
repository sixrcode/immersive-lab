
'use server';

/**
 * @fileOverview Turns a single prompt (and optional image/style) into mood boards, loglines, shot-lists, proxy clips, and a pitch summary.
 *
 * - promptToPrototype - A function that handles the prompt to prototype process.
 * - PromptToPrototypeInput - The input type for the promptToPrototype function.
 * - PromptToPrototypeOutput - The return type for the promptToPrototype function.
 */

import {ai} from '@/ai/genkit';
import {z}from 'zod';

const PromptToPrototypeInputSchema = z.object({
  prompt: z.string().describe('A single prompt describing the desired project.'),
  imageDataUri: z.string().optional().describe(
    "An optional image provided by the user, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  stylePreset: z.string().optional().describe('An optional style preset selected by the user (e.g., "A24 Cinematic", "Afrofuturist Urban").'),
});
export type PromptToPrototypeInput = z.infer<typeof PromptToPrototypeInputSchema>;

const MoodBoardCellSchema = z.object({
  visuals: z.string().describe("A concise description of the key imagery or scene depicted in this cell. (1-2 sentences)"),
  palette: z.string().describe("The dominant colors and overall color scheme for this cell. (e.g., 'Warm earth tones with a splash of crimson')"),
  atmosphere: z.string().describe("The mood or feeling this cell should evoke. (e.g., 'Mysterious and melancholic', 'Bright and energetic')"),
  keyProps: z.string().describe("Specific objects, characters, or significant visual details central to this cell. (e.g., 'A lone figure, a glowing artifact')")
});

const PromptToPrototypeOutputSchema = z.object({
  loglines: z.array(z.object({
    tone: z.string().describe("The tone of the logline (e.g., whimsical, gritty, dramatic)."),
    text: z.string().describe("The logline text."),
  })).describe('Three logline variants targeting distinct tones.'),
  moodBoardCells: z.array(MoodBoardCellSchema)
    .length(9)
    .describe("An array of 9 objects, one for each cell of a 3x3 mood board grid, ordered from top-left to bottom-right, row by row. Each object details the cell's visuals, palette, atmosphere, and key props."),
  moodBoardImage: z
    .string()
    .describe(
      "A single representative image for the mood board concept, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  shotList: z.string().describe('A numbered shot-list (6-10 shots) with suggested lenses, camera moves, and framing notes. Presented as a multi-line string, with each shot on a new line and values separated by commas (Shot #,Lens,Camera Move,Framing Notes). Do not include a header row.'),
  proxyClipAnimaticDescription: z.string().describe('A detailed textual description for a 4-second proxy clip animatic. This should outline key visuals, pacing, and transitions to help visualize the animatic, as if describing a sequence of still frames or very simple animations.'),
  pitchSummary: z.string().describe('A concise and compelling overview of the project idea, suitable for a quick pitch. It should encapsulate the core concept, tone, and potential appeal, drawing from the prompt and other generated assets.'),
});

export type PromptToPrototypeOutput = z.infer<typeof PromptToPrototypeOutputSchema>;

export async function promptToPrototype(input: PromptToPrototypeInput): Promise<PromptToPrototypeOutput> {
  return promptToPrototypeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'promptToPrototypePrompt',
  input: {schema: PromptToPrototypeInputSchema},
  output: {schema: PromptToPrototypeOutputSchema},
  prompt: `You are a creative assistant helping to generate initial assets for a project based on a user's prompt, an optional image, and an optional style preset. Your goal is to deliver a comprehensive prototype package.

  User Inputs:
  - Prompt: {{{prompt}}}
  {{#if imageDataUri}}
  - User Provided Image: {{media url=imageDataUri}} (This image should serve as a primary visual inspiration for the mood board cell descriptions and the overall visual tone. Refer to its elements or style when describing the mood board cells.)
  {{/if}}
  {{#if stylePreset}}
  - Style Preset: "{{stylePreset}}" (Apply this selected style to the mood board cell descriptions, the tone of the loglines, the shot list suggestions, and the style of the proxy clip animatic description.)
  {{/if}}

  Generate the following assets, adhering strictly to the output schema provided:

  1.  **Loglines**: Provide three distinct logline variants for the project. Each logline should target a different tone (e.g., whimsical, gritty, dramatic, comedic, thrilling, mysterious). If a style preset is provided, let it influence the tone.
      For each logline, output an object with 'tone' (string) and 'text' (string) properties.

  2.  **Mood Board 3x3 Grid Cell Content**: Generate an array of 9 objects for the 'moodBoardCells' field. Each object represents one cell in a 3x3 grid, ordered row by row (top-left to bottom-right).
      Your goal for these 9 cells is to create a diverse and comprehensive textual guide for a visual mood board that covers a range of important visual and thematic elements derived from the user's core prompt. Try to make each cell distinct. Consider including descriptions across the 9 cells that touch upon:
      *   A primary character: their look, expression, or a key costume detail.
      *   A key setting or environment: highlighting its specific atmosphere, time of day, or notable features.
      *   A close-up or focus on an important prop or symbolic object.
      *   An example of the intended core color palette and dominant textures.
      *   A representation of a key emotional beat, overall tone, or a specific mood for a scene.
      *   A suggestion for lighting style (e.g., chiaroscuro, soft daylight, neon glow).
      *   A hint at camera work, framing, or a common cinematographic style (e.g., shallow depth of field, wide establishing shot).
      *   An abstract visual concept or symbolism relevant to the core theme.
      *   A contrasting visual element or a less obvious idea that still supports the main prompt.

      For each of the 9 cells, the object MUST contain the following string properties. These should be directly inspired by and expand upon the user's main prompt:
      *   'visuals': (1-2 sentences) Describe the key imagery or scene this specific cell represents, aiming for visual richness.
      *   'palette': Detail the dominant colors and overall color scheme for THIS CELL (e.g., 'Deep blues and cool grays with a single point of neon pink for contrast', 'Monochromatic sepia tones with high contrast').
      *   'atmosphere': Articulate the specific mood or feeling THIS CELL should evoke (e.g., 'Tense and suspenseful with a sense of claustrophobia', 'Nostalgic and warm, slightly melancholic', 'Chaotic, energetic, and overwhelming').
      *   'keyProps': List specific objects, characters, or significant visual details central to THIS CELL'S particular focus (e.g., 'Rain-streaked window obscuring a face', 'A single, wilting flower on polished metal', 'Eyes wide, reflecting distant city lights').

      Ensure the descriptions for each cell are distinct and collectively contribute to a holistic and inspiring visual brief.
      {{#if stylePreset}}
      Remember to apply the "{{stylePreset}}" style preset to influence the artistic direction, color choices, and overall feel of these descriptions.
      {{/if}}
      {{#if imageDataUri}}
      If a user image was provided (see User Inputs section), it should heavily inspire these descriptions, particularly for palette, texture, composition, and initial character/environment ideas. Explicitly draw from it where appropriate.
      {{/if}}

  3.  **Shot List**: Create a numbered shot list consisting of 6 to 10 key shots for the project. For each shot, provide the Shot Number, Lens, Camera Move, and Framing Notes. Adapt suggestions if a style preset is specified.
      Output this as a single multi-line string, with each shot on a new line, and values separated by commas (e.g., "1,35mm,Slow Push-in,Close up on character's eyes revealing fear.").
      **Do not include a header row in the shot list output.**

  4.  **Proxy Clip Animatic Description**: Provide a detailed textual description for a 4-second proxy clip animatic. This ultra-low-res moving animatic should preview pacing and key moments. Describe the sequence of visuals, any simple motion, and how it conveys the core idea or feeling of the prompt. If a style preset is provided, let it influence the description. Imagine you're describing 3-5 key still frames that would make up this animatic.

  5.  **Pitch Summary**: Generate a concise (1-2 paragraphs) and compelling overview of the project idea, suitable for a quick pitch. It should encapsulate the core concept, dominant tone (influenced by style preset if any), and potential appeal, drawing from the main prompt and other generated assets.

  Ensure all outputs strictly adhere to the schema definition, especially the structure for 'moodBoardCells'.
  The representative 'moodBoardImage' (a single image) will be generated separately by the application after this text generation step and added to the final output.
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
    let imageGenPromptText = `Generate a single piece of concept art or a visual summary that captures the overall essence, style, and atmosphere for a project based on: '${input.prompt}'.`;
    if (input.stylePreset) {
      imageGenPromptText += ` The style should be reminiscent of '${input.stylePreset}'.`;
    }
    if (input.imageDataUri) {
      imageGenPromptText += ` Consider the themes and elements from the provided user image when generating this concept art.`;
    }
    imageGenPromptText += ` This image should serve as a central, representative piece for a mood board concept, evoking a "style collage" or "visual keynote" feel. Focus on compelling composition and artistic representation of the theme.`;
    
    const imageGenPayload: any = {
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: [{text: imageGenPromptText}],
        config: {
            responseModalities: ['TEXT', 'IMAGE'],
            safetySettings: [
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            ],
        },
    };

    if (input.imageDataUri) {
      // Prepend user image to the prompt for image generation if provided for context
      imageGenPayload.prompt = [{media: {url: input.imageDataUri}}, ...imageGenPayload.prompt];
    }

    const {media} = await ai.generate(imageGenPayload);

    if (!media || !media.url) {
        console.warn("Mood board image generation failed or returned no URL. Using placeholder.");
        textOutput.moodBoardImage = "https://placehold.co/600x400.png?text=Image+Gen+Failed";
    } else {
        textOutput.moodBoardImage = media.url;
    }
    
    return textOutput;
  }
);

