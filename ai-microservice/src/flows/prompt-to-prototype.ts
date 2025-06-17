/**
 * @fileOverview Turns a single prompt (and optional image/style) into mood boards, loglines, shot-lists, proxy clips, and a pitch summary.
 *
 * - promptToPrototype - A function that handles the prompt to prototype process.
 * - PromptToPrototypeInput - The input type for the promptToPrototype function.
 * - PromptToPrototypeOutput - The return type for the promptToPrototype function.
 * - PromptToPrototypeInputSchema - The Zod schema for the input.
 */

type PromptItem = { text: string } | { media: { url: string } };

import {ai} from '../genkit';
import {z}from 'zod';

export const PromptToPrototypeInputSchema = z.object({
  prompt: z.string().describe('A single prompt describing the desired project.'),
  imageDataUri: z.string().optional().describe(
    "An optional image provided by the user, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  stylePreset: z.string().optional().describe('An optional style preset selected by the user (e.g., "A24 Cinematic", "Afrofuturist Urban"). This style should be consistently reflected in loglines, mood board cell content, shot lists, animatic descriptions, and the pitch summary.'),
});
export type PromptToPrototypeInput = z.infer<typeof PromptToPrototypeInputSchema>;

const MoodBoardCellSchema = z.object({
  title: z.string().describe("The specific theme/category for this mood board cell (e.g., 'Key Character Focus', 'Environment Details'). This title MUST be one of the 9 predefined themes from the THEME_LIST provided in the prompt."),
  description: z.string().describe(
    "A detailed textual description for this specific cell, related to its assigned theme. This should elaborate on the visual and conceptual elements relevant to the theme."
  )
});

const LoglineSchema = z.object({
    tone: z.string().describe("The tone of the logline (e.g., whimsical, gritty, dramatic)."),
    text: z.string().describe("The logline text."),
  });

const PromptToPrototypeOutputSchema = z.object({
  loglines: z.array(LoglineSchema).describe('Three logline variants targeting distinct tones.'),
  loglinesJsonString: z.string().describe('The loglines formatted as a JSON string, suitable for file handoff.'),
  moodBoardCells: z.array(MoodBoardCellSchema)
    .length(9)
    .describe("An array of 9 objects, one for each cell of a 3x3 mood board grid. Each object represents a specific theme and its textual description, ordered from top-left to bottom-right, row by row. The themes are: 1. Key Character Focus, 2. Environment Details, 3. Color Palette & Texture, 4. Specific Props or Symbols, 5. Tone & Lighting, 6. Cinematography Hints, 7. Patterns & Swatches, 8. Text: Words & Typography, 9. Concept & Overall Theme."),
  moodBoardCellsJsonString: z.string().describe('The mood board cells (themes and descriptions) formatted as a JSON string, suitable for file handoff.'),
  moodBoardImage: z
    .string()
    .describe(
      "A single representative image for the mood board concept, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  shotList: z.string().describe('A numbered shot-list (6-10 shots) with suggested lenses, camera moves, and framing notes. Presented as a multi-line string, with each shot on a new line and values separated by commas (Shot #,Lens,Camera Move,Framing Notes). Do not include a header row.'),
  shotListMarkdownString: z.string().describe('The shot list formatted as a Markdown string, suitable for file handoff.'),
  proxyClipAnimaticDescription: z.string().describe('A detailed textual description for a 4-second proxy clip animatic. This should outline key visuals, pacing, and transitions to help visualize the animatic, as if describing a sequence of still frames or very simple animations.'),
  pitchSummary: z.string().describe('A concise and compelling overview of the project idea, suitable for a quick pitch. It should encapsulate the core concept, tone, and potential appeal, drawing from the prompt and other generated assets.'),
  allTextAssetsJsonString: z.string().describe('A JSON string containing the user inputs (prompt, stylePreset, imageProvided flag) and all generated textual assets (loglines, moodBoardCells, shotList, proxyClipAnimaticDescription, and pitchSummary). This field describes the structure of the JSON: { userInput: { prompt: string, stylePreset: string | null, imageProvided: boolean }, generatedAssets: { loglines: LoglineSchema[], moodBoardCells: MoodBoardCellSchema[], shotList: string, proxyClipAnimaticDescription: string, pitchSummary: string } }.'),
});

export type PromptToPrototypeOutput = z.infer<typeof PromptToPrototypeOutputSchema>;

export async function promptToPrototype(input: PromptToPrototypeInput): Promise<PromptToPrototypeOutput> {
  return promptToPrototypeFlow(input);
}

const THEME_LIST = [
  "Key Character Focus",
  "Environment Details",
  "Color Palette & Texture",
  "Specific Props or Symbols",
  "Tone & Lighting",
  "Cinematography Hints",
  "Patterns & Swatches",
  "Text: Words & Typography",
  "Concept & Overall Theme"
];

const textGenerationPrompt = ai.definePrompt({
  name: 'promptToPrototypeTextPrompt',
  input: {schema: PromptToPrototypeInputSchema},
  output: {schema: PromptToPrototypeOutputSchema.omit({ 
    allTextAssetsJsonString: true, 
    loglinesJsonString: true, 
    moodBoardCellsJsonString: true, 
    shotListMarkdownString: true,
    moodBoardImage: true, // AI doesn't generate the image directly in this text prompt
  })},
  prompt: `You are a creative assistant helping to generate initial assets for a project based on a user's prompt, an optional image, and an optional style preset. Your goal is to deliver a comprehensive textual prototype package.
  {{#if stylePreset}}
  The user has selected the style preset: "{{stylePreset}}". This style should be consistently reflected across ALL generated textual assets where applicable, influencing aspects like tone, artistic direction, descriptive language, and specific suggestions. This includes loglines, mood board cell content, shot lists, animatic descriptions, and the pitch summary.
  {{/if}}

  User Inputs:
  - Prompt: {{{prompt}}}
  {{#if imageDataUri}}
  - User Provided Image: {{media url=imageDataUri}} (This image should serve as a primary visual inspiration for the mood board cell descriptions and the overall visual tone. Refer to its elements or style when describing the mood board cells.)
  {{/if}}

  Generate the following textual assets, adhering strictly to the output schema provided:

  1.  **Loglines**: Provide three distinct logline variants for the project. Each logline should target a different tone (e.g., whimsical, gritty, dramatic, comedic, thrilling, mysterious). {{#if stylePreset}}The tone of these loglines should be influenced by the "{{stylePreset}}" preset.{{/if}}
      For each logline, output an object with 'tone' (string) and 'text' (string) properties.

  2.  **Mood Board 3x3 Grid Cell Content**: Generate an array of 9 objects for the 'moodBoardCells' field. Each object must represent one cell in a 3x3 grid and correspond to a specific theme.
      The themes, in order for the 9 cells (top-left to bottom-right, row by row), are:
      1.  **${THEME_LIST[0]}**: Describe the primary character's appearance, expression, key costume details, or pose relevant to the user's prompt.
      2.  **${THEME_LIST[1]}**: Detail the key setting, its atmosphere, time of day, notable features, or specific location elements from the user's prompt.
      3.  **${THEME_LIST[2]}**: Specify the dominant colors, secondary colors, accent colors, and key textures that define the visual style, inspired by the user's prompt.
      4.  **${THEME_LIST[3]}**: List and describe any important objects, props, or symbolic elements crucial to the story or theme from the user's prompt.
      5.  **${THEME_LIST[4]}**: Articulate the primary emotional mood (e.g., suspenseful, joyful, melancholic) and suggest lighting styles (e.g., chiaroscuro, soft daylight, neon glow) to achieve it, reflecting the user's prompt.
      6.  **${THEME_LIST[5]}**: Suggest camera angles, framing (e.g., close-up, wide shot), or common camera movements that would enhance the storytelling of the user's prompt.
      7.  **${THEME_LIST[6]}**: Describe any recurring patterns, motifs, or provide examples of visual swatches (textual description) that could be used, based on the user's prompt.
      8.  **${THEME_LIST[7]}**: Suggest any key words, phrases, or typographic styles (e.g., font choices, text treatments) relevant to the project, as derived from the user's prompt.
      9.  **${THEME_LIST[8]}**: Provide a concise summary of the core concept or overarching theme that the mood board aims to visually represent, based on the user's prompt.

      For each of these 9 themes, the object in the array MUST contain:
      *   'title': A string that is the exact name of the theme (e.g., "${THEME_LIST[0]}", "${THEME_LIST[1]}", etc., from the THEME_LIST above). You MUST use the exact titles from this list.
      *   'description': A string containing your detailed textual elaboration for that specific theme, directly inspired by and expanding upon the user's main prompt.

      {{#if stylePreset}}
      Remember to apply the "{{stylePreset}}" style preset to influence the artistic direction, color choices, and overall feel of these descriptions.
      {{/if}}
      {{#if imageDataUri}}
      If a user image was provided, it should heavily inspire these descriptions, particularly for palette, texture, composition, and initial character/environment ideas. Explicitly draw from it where appropriate.
      {{/if}}

  3.  **Shot List**: Create a numbered shot list consisting of 6 to 10 key shots for the project. For each shot, provide the Shot Number, Lens, Camera Move, and Framing Notes. {{#if stylePreset}}Adapt suggestions if the "{{stylePreset}}" style preset is specified.{{/if}}
      Output this as a single multi-line string for the 'shotList' field, with each shot on a new line, and values separated by commas (e.g., "1,35mm,Slow Push-in,Close up on character's eyes revealing fear.").
      **Do not include a header row in the shot list output.**

  4.  **Proxy Clip Animatic Description**: Provide a detailed textual description for a 4-second proxy clip animatic. This ultra-low-res moving animatic should preview pacing and key moments. Describe the sequence of visuals, any simple motion, and how it conveys the core idea or feeling of the prompt. {{#if stylePreset}}Let the "{{stylePreset}}" style preset influence the description.{{/if}} Imagine you're describing 3-5 key still frames that would make up this animatic.

  5.  **Pitch Summary**: Generate a concise (1-2 paragraphs) and compelling overview of the project idea, suitable for a quick pitch. It should encapsulate the core concept, dominant tone ({{#if stylePreset}}influenced by the "{{stylePreset}}" preset{{else}}reflecting the main prompt{{/if}}), and potential appeal, drawing from the main prompt and other generated assets.

  Ensure all outputs strictly adhere to the schema definition, especially the structure for 'moodBoardCells'.
  `,
});

const promptToPrototypeFlow = ai.defineFlow(
  {
    name: 'promptToPrototypeFlow',
    inputSchema: PromptToPrototypeInputSchema,
    outputSchema: PromptToPrototypeOutputSchema,
  },
  async (input: PromptToPrototypeInput): Promise<PromptToPrototypeOutput> => {
    try {
      // Task 1: Generate textual components
      const textGenerationTask = textGenerationPrompt(input);

    // Task 2: Generate a single representative mood board image
    let imageGenPromptText = `Generate a single piece of concept art or a visual summary that captures the overall essence, style, and atmosphere for a project based on: '${input.prompt}'.`;
    if (input.stylePreset) {
      imageGenPromptText += ` The style should be reminiscent of '${input.stylePreset}'.`;
    }
    if (input.imageDataUri) {
      imageGenPromptText += ` Consider the themes and elements from the provided user image when generating this concept art.`;
    }
    imageGenPromptText += ` This image should serve as a central, representative piece for a mood board concept, evoking a "style collage" or "visual keynote" feel. Focus on compelling composition and artistic representation of the theme.`;
    
    const imageGenPayload = {
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: [{text: imageGenPromptText}] as PromptItem[],
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
 imageGenPayload.prompt = [
  { media: { url: input.imageDataUri } },
  { text: imageGenPromptText }
] as PromptItem[];
    }
    const imageGenerationTask = ai.generate(imageGenPayload);

    // Execute tasks in parallel
    const [textResult, imageResult] = await Promise.all([textGenerationTask, imageGenerationTask]);

    const { output: textOutputPartial } = textResult;
    if (!textOutputPartial) {
      throw new Error("Failed to generate textual components for the prototype.");
    }
    
    const output = textOutputPartial as PromptToPrototypeOutput; // Cast to include all fields

    // Assign image result
    if (!imageResult.media || !imageResult.media.url) {
        console.warn("Mood board image generation failed or returned no URL. Using placeholder.");
        output.moodBoardImage = "https://placehold.co/600x400.png?text=Image+Gen+Failed";
    } else {
        output.moodBoardImage = imageResult.media.url;
    }
    
    // Ensure moodBoardCells have titles if AI didn't provide them (as a fallback)
    // and ensure arrays are initialized for robust JSON stringification
    output.loglines = output.loglines || [];
    output.moodBoardCells = output.moodBoardCells || [];
    if (output.moodBoardCells.length === 9) {
        output.moodBoardCells.forEach((cell, index) => {
            if (!cell.title && THEME_LIST[index]) {
                cell.title = THEME_LIST[index];
            }
        });
    } else if (output.moodBoardCells.length !== 9 && output.moodBoardCells.length > 0) {
        // If AI provided some cells but not all 9, log a warning
        console.warn(`AI generated ${output.moodBoardCells.length} mood board cells instead of 9. Titles might be missing for some.`);
    } else {
        // If AI provided no cells, create placeholder cells
        output.moodBoardCells = THEME_LIST.map(themeTitle => ({
            title: themeTitle,
            description: "Description not generated."
        }));
    }


    // Populate the JSON and Markdown string fields
    output.loglinesJsonString = JSON.stringify(output.loglines, null, 2);
    output.moodBoardCellsJsonString = JSON.stringify(output.moodBoardCells, null, 2);
    output.shotListMarkdownString = output.shotList || ""; // Ensures it's a string
    
    // Assemble allTextAssetsJsonString
    const allTextAssets = {
      userInput: {
        prompt: input.prompt,
        stylePreset: input.stylePreset || null,
        imageProvided: !!input.imageDataUri,
      },
      generatedAssets: {
        loglines: output.loglines,
        moodBoardCells: output.moodBoardCells,
        shotList: output.shotList || "",
        proxyClipAnimaticDescription: output.proxyClipAnimaticDescription || "",
        pitchSummary: output.pitchSummary || "",
      }
    };
    output.allTextAssetsJsonString = JSON.stringify(allTextAssets, null, 2);
    
    return output;
    } catch (error) {
      console.error("Error within promptToPrototypeFlow:", error);
      throw error; // Re-throw the error to be caught by the API route
    }
  }
);

    