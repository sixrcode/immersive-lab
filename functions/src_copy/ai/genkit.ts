import {genkit} from 'genkit';
import {googleAI, gemini15Flash} from '@genkit-ai/googleai'; // Added gemini15Flash

export const ai = genkit({
  plugins: [googleAI()],
  model: gemini15Flash, // Changed from 'googleai/gemini-2.0-flash'
});
