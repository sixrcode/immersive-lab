// packages/storyboard-studio/src/pages/api/storyboard/generate.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  // GenerateStoryboardProps, // Proper import from @isl/types later
  // StoryboardPackage, // Proper import from @isl/types later
  // StoryboardStreamResponse // Proper import from @isl/types later
} from '../../../../../../types/src/storyboard.types'; // Adjust path as necessary

import { generateStoryboardWithGenkit } from '../../../services/generation/genkitService'; // Adjust path as necessary

// Mocked types for now, to be replaced by imports from @isl/types
interface GenerateStoryboardProps {
  sceneDescription: string;
  panelCount: number;
  stylePreset?: string;
  referenceImage?: File | string; // In a real API, file handling would be more complex
}

interface StoryboardPackage {
  id: string;
  sceneDescription: string;
  panelCount: number;
  stylePreset?: string;
  panels: any[]; // Simplified Panel type for now
  createdAt: string;
  updatedAt: string;
}

type StoryboardStreamResponse =
  | { status: 'processing'; progress: number; message?: string; panelId?: string }
  | { status: 'success'; package: StoryboardPackage }
  | { status: 'error'; message: string };


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StoryboardStreamResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const {
    sceneDescription,
    panelCount,
    stylePreset,
    // referenceImage, // File handling needs robust implementation (e.g., multipart/form-data)
  } = req.body as GenerateStoryboardProps;

  // Basic validation
  if (!sceneDescription || typeof sceneDescription !== 'string') {
    return res.status(400).json({ error: 'sceneDescription is required and must be a string.' });
  }
  if (panelCount === undefined || typeof panelCount !== 'number' || panelCount < 2 || panelCount > 10) {
    return res.status(400).json({ error: 'panelCount is required and must be a number between 2 and 10.' });
  }
  if (stylePreset !== undefined && typeof stylePreset !== 'string') {
    return res.status(400).json({ error: 'stylePreset must be a string if provided.' });
  }

  try {
    // For streaming, we'd set up Server-Sent Events (SSE) or WebSockets.
    // Here's a simplified version that sends progress updates if the client supports it,
    // or just the final package.
    // For true streaming, the response headers and structure would be different.

    // Inform the client that we'll be streaming if possible (conceptual)
    res.setHeader('Content-Type', 'application/json'); // Or 'text/event-stream' for SSE
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive'); // For SSE

    const onProgress = (update: StoryboardStreamResponse) => {
      // For true SSE, you would write `res.write(`data: ${JSON.stringify(update)}\n\n`);`
      // For this simplified example, we'll log it and the client might get multiple JSON objects
      // if not handled carefully, or we just send the final one.
      // This part needs to be robustly implemented based on chosen streaming strategy.
      console.log('API Progress:', update);
      // If not using true SSE, sending multiple res.json() is not standard.
      // Instead, we collect updates and send them or use a proper streaming mechanism.
      // For now, we'll rely on the final response from generateStoryboardWithGenkit.
    };

    // For this initial version, we'll await the full package.
    // True streaming would involve a different flow with `res.write` for each update.
    const storyboardPackage = await generateStoryboardWithGenkit(
      { sceneDescription, panelCount, stylePreset /* referenceImage */ },
      (update) => {
        // If using SSE, this is where you would res.write()
        // Example: res.write(`data: ${JSON.stringify(update)}

`);
        // For now, just logging on the server. The client will get the final package.
        if (update.status === 'processing') {
          console.log(`API Progress: ${update.progress}% - ${update.message}`);
        }
      }
    );

    // Send the final successful package
    // Note: If true streaming was implemented with res.write,
    // you'd end the stream here with res.end() after the final 'success' message.
    return res.status(200).json({ status: 'success', package: storyboardPackage });

  } catch (error) {
    console.error('Error generating storyboard:', error);
    // Ensure error is an instance of Error to access message property safely
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(500).json({ status: 'error', message });
  }
}
