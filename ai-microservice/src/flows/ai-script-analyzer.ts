
// This is an autogenerated file from Firebase Studio.

/**
 * @fileOverview An AI agent for analyzing script and dialogue, flagging unclear or off-tone sections and suggesting improvements.
 *
 * - analyzeScript - A function that handles the script analysis process.
 * - AnalyzeScriptInput - The input type for the analyzeScript function.
 * - AnalyzeScriptOutput - The return type for the analyzeScript function.
 */

import {ai} from '../genkit';
import {z} from 'genkit';

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
  dialogueIssues: z.number().optional().describe('The number of dialogue issues found in the script.'),
});
export type AnalyzeScriptOutput = z.infer<typeof AnalyzeScriptOutputSchema>;

export async function analyzeScript(input: AnalyzeScriptInput): Promise<AnalyzeScriptOutput> {
  return analyzeScriptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeScriptPrompt',
  input: {schema: AnalyzeScriptInputSchema},
  output: {schema: AnalyzeScriptOutputSchema},
  prompt: `You are an AI script analyzer that reviews scripts and provides feedback.

Analyze the following script for clarity, tone, consistency, and overall quality.

Script:
{{{script}}}

Identify any sections that are unclear, off-tone, or inconsistent, and suggest specific improvements.
Also, analyze the dialogue for unnatural sentences. For example, a long series of statements without any questions might be considered unnatural.
Count the number of such dialogue issues and include it in the 'dialogueIssues' field of your response.

For each suggestion, provide:
- 'section': The *exact, verbatim text* of the script segment you are addressing. This text is CRITICAL for the 'Apply Suggestion' feature and MUST be an exact quote from the original script. Do NOT paraphrase or summarize this section. Do NOT add your own surrounding quotation marks to this 'section' field unless those quotation marks are part of the original script segment itself. If the problematic text is common, try to make your quoted 'section' distinctive enough if possible.
- 'issue': A clear description of the issue identified in that section.
- 'improvement': A specific suggestion for how to improve that section.

Ensure the overall output is a detailed analysis, a list of specific suggestions for improvement, and the count of dialogue issues.
Follow the schema documentation provided in the AnalyzeScriptOutputSchema for how to format your response.
`,
});

const analyzeScriptFlow = ai.defineFlow(
  {
    name: 'analyzeScriptFlow',
    inputSchema: AnalyzeScriptInputSchema,
    outputSchema: AnalyzeScriptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

