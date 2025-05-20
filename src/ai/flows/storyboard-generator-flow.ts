
'use server';
/**
 * @fileOverview An AI agent for generating storyboards from scene descriptions.
 *
 * - generateStoryboard - A function that handles the storyboard generation process.
 * - StoryboardGeneratorInput - The input type for the generateStoryboard function.
 * - StoryboardGeneratorOutput - The return type for the generateStoryboard function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StoryboardPanelSchema = z.object({
  panelNumber: z.number().describe("The sequence number of this storyboard panel."),
  description: z.string().describe("A detailed textual description of the visual content for this panel, including character actions, expressions, and key background elements. This will be used to generate an image."),
  shotDetails: z.string().describe("Suggested camera shot type, angle, and movement (e.g., 'Medium shot, eye-level, static' or 'Tracking shot, low angle')."),
  dialogueOrSound: z.string().optional().describe("Brief dialogue, key sound effect, or music cue for this panel."),
});

const StoryboardPanelWithImageSchema = StoryboardPanelSchema.extend({
  imageDataUri: z.string().describe("The generated image for this panel, as a data URI. Expected format: 'data:image/png;base64,<encoded_data>'."),
});

export const StoryboardGeneratorInputSchema = z.object({
  sceneDescription: z.string().min(20, "Scene description must be at least 20 characters.").describe("A detailed description of the scene to be storyboarded, including setting, characters, key actions, and overall mood."),
  numPanels: z.number().min(2).max(10).default(6).describe("The desired number of storyboard panels to generate (between 2 and 10).").optional(),
  stylePreset: z.string().optional().describe("An optional style preset to guide the visual style of the generated images (e.g., 'Cinematic Noir', 'Anime Action', 'Whimsical Fantasy')."),
});
export type StoryboardGeneratorInput = z.infer<typeof StoryboardGeneratorInputSchema>;

export const StoryboardGeneratorOutputSchema = z.object({
  panels: z.array(StoryboardPanelWithImageSchema).describe("An array of generated storyboard panels, each containing a description, shot details, and an image."),
  titleSuggestion: z.string().optional().describe("A suggested title for the storyboard sequence based on the scene description."),
});
export type StoryboardGeneratorOutput = z.infer<typeof StoryboardGeneratorOutputSchema>;


export async function generateStoryboard(input: StoryboardGeneratorInput): Promise<StoryboardGeneratorOutput> {
  return storyboardGeneratorFlow(input);
}

const textGenerationPrompt = ai.definePrompt({
  name: 'storyboardTextGenerationPrompt',
  input: { schema: StoryboardGeneratorInputSchema },
  output: { schema: z.object({
      panels: z.array(StoryboardPanelSchema),
      titleSuggestion: z.string().optional(),
    })
  },
  prompt: `You are a storyboard assistant. Based on the user's scene description, number of panels, and optional style preset, generate textual details for each storyboard panel.

Scene Description:
{{{sceneDescription}}}

Number of Panels to Generate: {{numPanels}}

{{#if stylePreset}}
Visual Style Preset: "{{stylePreset}}" - This style should influence your descriptions and shot suggestions.
{{/if}}

For each panel, provide:
- panelNumber: The sequence number (starting from 1).
- description: A concise but vivid description of the visual scene for THIS SPECIFIC PANEL. Focus on what should be drawn. What are the characters doing? What is the key framing element?
- shotDetails: Suggest the camera shot type, angle (e.g., "Medium Close-Up, eye-level", "Wide Shot, high angle", "Point-of-View shot").
- dialogueOrSound: (Optional) A very brief line of dialogue, key sound effect, or music note for this panel.

Also provide a 'titleSuggestion' for the overall storyboard sequence.

Structure your output as a JSON object with a "panels" array (each element being an object with panelNumber, description, shotDetails, and optional dialogueOrSound) and a "titleSuggestion" string. Ensure panelNumber is sequential.
Example for one panel object:
{
  "panelNumber": 1,
  "description": "A lone astronaut stands on a desolate red planet, looking at a strange, glowing artifact half-buried in the sand. Two moons hang in the purple sky.",
  "shotDetails": "Establishing Shot, wide angle",
  "dialogueOrSound": "Sound: Eerie hum"
}
`,
});

const storyboardGeneratorFlow = ai.defineFlow(
  {
    name: 'storyboardGeneratorFlow',
    inputSchema: StoryboardGeneratorInputSchema,
    outputSchema: StoryboardGeneratorOutputSchema,
  },
  async (input) => {
    // 1. Generate textual descriptions for all panels
    const { output: textOutput } = await textGenerationPrompt(input);
    if (!textOutput || !textOutput.panels || textOutput.panels.length === 0) {
      throw new Error("Failed to generate textual descriptions for storyboard panels.");
    }

    // 2. For each panel description, generate an image
    const imageGenerationPromises = textOutput.panels.map(async (panelTextData) => {
      let imagePrompt = `Generate a storyboard panel image. Scene: ${panelTextData.description}. Shot: ${panelTextData.shotDetails}.`;
      if (input.stylePreset) {
        imagePrompt += ` Style: ${input.stylePreset}.`;
      }
      imagePrompt += ` Focus on clear visual storytelling for a storyboard frame. Simple lines or sketch style preferred if possible, but adhere to the core description.`;
      
      try {
        const { media } = await ai.generate({
          model: 'googleai/gemini-2.0-flash-exp',
          prompt: imagePrompt,
          config: {
            responseModalities: ['IMAGE'], // Request only IMAGE
             safetySettings: [
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            ],
          },
           // Add a timeout to prevent hanging indefinitely
          timeout: 30000, // 30 seconds
        });

        if (media && media.url) {
          return {
            ...panelTextData,
            imageDataUri: media.url,
          };
        } else {
           console.warn(`Image generation failed for panel ${panelTextData.panelNumber}. No media URL returned.`);
          return {
            ...panelTextData,
            imageDataUri: `https://placehold.co/512x384.png?text=Image+Gen+Failed+P${panelTextData.panelNumber}`,
          };
        }
      } catch (error) {
        console.error(`Error generating image for panel ${panelTextData.panelNumber}:`, error);
        return {
          ...panelTextData,
          imageDataUri: `https://placehold.co/512x384.png?text=Image+Error+P${panelTextData.panelNumber}`,
        };
      }
    });

    const panelsWithImages = await Promise.all(imageGenerationPromises);

    return {
      panels: panelsWithImages,
      titleSuggestion: textOutput.titleSuggestion,
    };
  }
);

