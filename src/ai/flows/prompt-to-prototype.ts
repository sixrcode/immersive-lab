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
  logline: z.string().describe('A concise logline for the project.'),
  moodBoardImage: z
    .string()
    .describe(
      'A URL of a generated mood board image as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Corrected description
    ),
  shotList: z.string().describe('A detailed shot list for the project.'),
  proxyClipDescription: z.string().describe('A description of a proxy clip for the project.'),
});

export type PromptToPrototypeOutput = z.infer<typeof PromptToPrototypeOutputSchema>;

export async function promptToPrototype(input: PromptToPrototypeInput): Promise<PromptToPrototypeOutput> {
  return promptToPrototypeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'promptToPrototypePrompt',
  input: {schema: PromptToPrototypeInputSchema},
  output: {schema: PromptToPrototypeOutputSchema},
  prompt: `You are a creative assistant helping to generate initial assets for a project based on a single prompt.

  Based on the following prompt, generate a logline, a mood board image, a shot list, and a description of a proxy clip.

  Prompt: {{{prompt}}}

  Here are the desired output formats:

  - Logline: A concise and engaging logline that captures the essence of the project.
  - Mood Board Image: A data URI of a mood board image that visually represents the project's aesthetic.
  - Shot List: A detailed shot list outlining key scenes and shots for the project.
  - Proxy Clip Description: A description of a proxy clip that can be used as a temporary placeholder for the final footage.
  `,
});

const promptToPrototypeFlow = ai.defineFlow(
  {
    name: 'promptToPrototypeFlow',
    inputSchema: PromptToPrototypeInputSchema,
    outputSchema: PromptToPrototypeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);

    // Generate mood board image using Gemini 2.0 Flash
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: [
        {text: `Generate a mood board image based on the following prompt: ${input.prompt}`},
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (output) {
      output.moodBoardImage = media.url;
    }

    return output!;
  }
);
