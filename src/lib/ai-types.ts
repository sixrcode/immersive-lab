import { z } from 'zod';

// --- From ai-script-analyzer.ts ---
export const AnalyzeScriptInputSchema = z.object({
  script: z
    .string()
    .describe('The script to be analyzed, including dialogue and scene descriptions.'),
});
export type AnalyzeScriptInput = z.infer<typeof AnalyzeScriptInputSchema>;

export const AnalyzeScriptOutputSchema = z.object({
  analysis: z
    .string()
    .describe(
      'A detailed analysis of the script, flagging unclear or off-tone sections and suggesting improvements.'
    ),
  suggestions: z.array(
    z.object({
      section: z.string().describe('The *exact, verbatim text* of the script segment being addressed. This text MUST be an exact quote from the original script to ensure the "Apply Suggestion" feature works correctly. Do not paraphrase or summarize this section. Do NOT add your own surrounding quotation marks to this field unless those quotation marks are part of the original script segment itself.'),
      issue: z.string().describe('The issue identified in the section.'),
      improvement: z.string().describe('A suggestion for improving the section.'),
    })
  ).describe('A list of specific suggestions for improving the script.'),
});
export type AnalyzeScriptOutput = z.infer<typeof AnalyzeScriptOutputSchema>;


// --- From prompt-to-prototype.ts ---
export const PromptToPrototypeInputSchema = z.object({
  prompt: z.string().describe('A single prompt describing the desired project.'),
  imageDataUri: z.string().optional().describe(
    "An optional image provided by the user, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  stylePreset: z.string().optional().describe('An optional style preset selected by the user (e.g., "A24 Cinematic", "Afrofuturist Urban"). This style should be consistently reflected in loglines, mood board cell content, shot lists, animatic descriptions, and the pitch summary.'),
});
export type PromptToPrototypeInput = z.infer<typeof PromptToPrototypeInputSchema>;

export const MoodBoardCellSchema = z.object({
  title: z.string().describe("The specific theme/category for this mood board cell (e.g., 'Key Character Focus', 'Environment Details'). This title MUST be one of the 9 predefined themes from the THEME_LIST provided in the prompt."),
  description: z.string().describe(
    "A detailed textual description for this specific cell, related to its assigned theme. This should elaborate on the visual and conceptual elements relevant to the theme."
  )
});
export type MoodBoardCell = z.infer<typeof MoodBoardCellSchema>;


export const LoglineSchema = z.object({
    tone: z.string().describe("The tone of the logline (e.g., whimsical, gritty, dramatic)."),
    text: z.string().describe("The logline text."),
  });
export type Logline = z.infer<typeof LoglineSchema>;

export const PromptToPrototypeOutputSchema = z.object({
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
  allTextAssetsJsonString: z.string().describe('A JSON string containing the user inputs (prompt, stylePreset, imageProvided flag) and all generated textual assets (loglines, moodBoardCells, shotList, proxyClipAnimaticDescription, pitchSummary). This field describes the structure of the JSON: { userInput: { prompt: string, stylePreset: string | null, imageProvided: boolean }, generatedAssets: { loglines: LoglineSchema[], moodBoardCells: MoodBoardCellSchema[], shotList: string, proxyClipAnimaticDescription: string, pitchSummary: string } }.'),
});
export type PromptToPrototypeOutput = z.infer<typeof PromptToPrototypeOutputSchema>;


// --- From storyboard-generator-flow.ts ---
export const StoryboardPanelSchema = z.object({
  panelNumber: z.number().describe("The sequence number of this storyboard panel."),
  description: z.string().describe("A detailed textual description of the visual content for this panel, including character actions, expressions, and key background elements. This will be used to generate an image."),
  shotDetails: z.string().describe("Suggested camera shot type, angle, and movement (e.g., 'Medium shot, eye-level, static' or 'Tracking shot, low angle')."),
  dialogueOrSound: z.string().optional().describe("Brief dialogue, key sound effect, or music cue for this panel."),
});
export type StoryboardPanel = z.infer<typeof StoryboardPanelSchema>;

export const StoryboardPanelWithImageSchema = StoryboardPanelSchema.extend({
  imageDataUri: z.string().describe("The generated image for this panel, as a data URI. Expected format: 'data:image/png;base64,<encoded_data>'."),
  alt: z.string().describe("Descriptive alt text for the panel image, derived from its visual description."),
});
export type StoryboardPanelWithImage = z.infer<typeof StoryboardPanelWithImageSchema>;

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
