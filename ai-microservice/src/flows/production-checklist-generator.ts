import { ai } from '../genkit';
import { z } from 'genkit';
import { AnalyzeScriptOutputSchema } from './ai-script-analyzer'; // Assuming this can be imported

// Define Task Categories
const TaskCategorySchema = z.enum([
  "casting", "locations", "props", "wardrobe", "makeup",
  "sfx", "vfx", "stunts", "music", "setDressing", "animals", "unknown"
]);
export type TaskCategory = z.infer<typeof TaskCategorySchema>;

// Define the structure for a single production task
const ProductionTaskSchema = z.object({
  id: z.string().describe("A unique identifier for the task (e.g., task-001)."),
  type: TaskCategorySchema.describe("The category of the task."),
  description: z.string().describe("A human-readable description of the task."),
  sceneContext: z.string().optional().describe("The scene number or description where this task is relevant, if applicable."),
  notes: z.string().optional().describe("Any additional notes or details for the task."),
});
export type ProductionTask = z.infer<typeof ProductionTaskSchema>;

// Define the input schema for the production checklist generator
export const ProductionChecklistInputSchema = z.object({
  scriptAnalysis: AnalyzeScriptOutputSchema.describe("The JSON output from the Script Analyzer."),
  checklistRequirements: z.object({
    include: z.array(TaskCategorySchema).describe("An array of task categories to include in the checklist."),
  }).describe("Specifies which categories of tasks to generate."),
});
export type ProductionChecklistInput = z.infer<typeof ProductionChecklistInputSchema>;

// Define the output schema for the production checklist generator
export const ProductionChecklistOutputSchema = z.array(ProductionTaskSchema);
export type ProductionChecklistOutput = z.infer<typeof ProductionChecklistOutputSchema>;

// Define the Genkit prompt for extracting production tasks
const productionTaskPrompt = ai.definePrompt({
  name: 'productionTaskPrompt',
  input: { schema: ProductionChecklistInputSchema },
  output: { schema: ProductionChecklistOutputSchema },
  prompt: `
You are an AI assistant that generates a production checklist from a script analysis.
Based on the provided script analysis and checklist requirements, identify and list all relevant production tasks.

Script Analysis:
Analysis Text:
{{{scriptAnalysis.analysis}}}

Suggestions (may contain relevant script excerpts):
{{#each scriptAnalysis.suggestions}}
- Section: {{{section}}} (Issue: {{{issue}}})
{{/each}}

Checklist Requirements (categories to include):
{{#each checklistRequirements.include}}
- {{this}}
{{/each}}

Generate a list of tasks. For each task, provide:
- id: A unique ID string (e.g., "task-001", "task-002").
- type: The category of the task (must be one of: ${TaskCategorySchema.options.join(', ')}). If unsure, use "unknown".
- description: A concise description of the task (e.g., "Cast character: ANNA", "Find location: INT. COFFEE SHOP - DAY", "Acquire prop: RED NOTEBOOK").
- sceneContext (optional): The scene number or description where this task is relevant. Try to infer this from the script.
- notes (optional): Any important details or context for the task.

Focus on the categories specified in 'checklistRequirements.include'.
Extract information primarily from the 'Analysis Text'. The 'Suggestions' might also contain script parts that are relevant.

Example for a character task:
If script mentions "JOHN (30s, a weary detective)", and "casting" is required:
{ "id": "task-001", "type": "casting", "description": "Cast character: JOHN", "notes": "30s, weary detective" }

Example for a location task:
If script mentions "EXT. ABANDONED WAREHOUSE - NIGHT", and "locations" is required:
{ "id": "task-002", "type": "locations", "description": "Secure location: EXT. ABANDONED WAREHOUSE - NIGHT" }

Example for a prop task:
If script mentions "She nervously clicked a SILVER PEN", and "props" is required:
{ "id": "task-003", "type": "props", "description": "Acquire prop: SILVER PEN" }

Be thorough and extract as many relevant tasks as possible based on the requirements.
Return an empty array if no tasks are found or if the input is insufficient.
  `,
});

// Define the Genkit flow for generating the production checklist
export const generateProductionChecklistFlow = ai.defineFlow(
  {
    name: 'generateProductionChecklistFlow',
    inputSchema: ProductionChecklistInputSchema,
    outputSchema: ProductionChecklistOutputSchema,
  },
  async (input) => {
    // A simple validation, more can be added.
    if (!input.scriptAnalysis || !input.scriptAnalysis.analysis) {
        console.warn("Insufficient script analysis data provided.");
        return [];
    }
    if (!input.checklistRequirements || input.checklistRequirements.include.length === 0) {
        console.warn("No checklist requirements specified.");
        return [];
    }

    const { output } = await productionTaskPrompt(input);
    return output || []; // Ensure it returns an array, even if output is null/undefined
  }
);

// Example usage (for testing purposes, can be removed or kept for local testing)
/*
async function test() {
  const sampleInput: ProductionChecklistInput = {
    scriptAnalysis: {
      analysis: "SCENE 1: INT. COFFEE SHOP - DAY. ANNA (30s, wearing a RED SCARF) nervously sips her latte. She clutches a WORN LEATHER BAG. Outside, a POLICE SIREN wails. BOB (40s) enters. He needs a FAKE SCAR for his role.",
      suggestions: [
        { section: "ANNA (30s, wearing a RED SCARF)", issue: "Clarity", improvement: "Describe the scarf's importance." }
      ]
    },
    checklistRequirements: {
      include: ["casting", "locations", "props", "wardrobe", "sfx", "makeup"]
    }
  };

  try {
    const checklist = await generateProductionChecklistFlow(sampleInput);
    console.log("Generated Checklist:", JSON.stringify(checklist, null, 2));
  } catch (error) {
    console.error("Error generating checklist:", error);
  }
}

test();
*/
