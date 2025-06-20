const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid'); // For generating unique package IDs

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore(); // Initialize Firestore

// Import AI flow functions and their Zod schemas
const { analyzeScript, AnalyzeScriptInputSchema } = require('./src/flows/ai-script-analyzer');
const { promptToPrototype, PromptToPrototypeInputSchema } = require('./src/flows/prompt-to-prototype');
const { generateStoryboard, StoryboardGeneratorInputSchema } = require('./src/flows/storyboard-generator-flow');

// Import utility and storage functions
const { dataUriToBuffer } = require('./src/utils');
const { uploadImageToStorage } = require('./src/storage');

// Import authentication middleware
const { authenticate } = require('./src/auth');

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' })); // Increase limit for potential base64 image data

// Apply authentication middleware to all routes below this line
app.use(authenticate);

// --- Endpoint for Script Analysis ---
app.post('/analyzeScript', async (req, res) => {
  const analysisId = uuidv4();
  const userId = req.user.uid; // Use authenticated user's ID

  try {
    const validationResult = AnalyzeScriptInputSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: "Invalid input", details: validationResult.error.format() });
    }

    const flowInput = validationResult.data;
    const flowOutput = await analyzeScript(flowInput);

    const scriptAnalysisPackage = {
      id: analysisId,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      script: flowInput.script,
      analysis: flowOutput,
    };

    await db.collection('scriptAnalyses').doc(analysisId).set(scriptAnalysisPackage);

    return res.status(200).json(scriptAnalysisPackage);
  } catch (error) {
    console.error(`Error in /analyzeScript endpoint for user ${userId}:`, error);
    if (error.code === 'FIRESTORE_ERROR') {
        return res.status(503).json({ error: "Firestore operation failed.", details: error.message });
    }
    return res.status(500).json({ error: "An unexpected error occurred.", details: error.message });
  }
});

// --- Endpoint for Prompt to Prototype ---
app.post('/promptToPrototype', async (req, res) => {
  const userId = req.user.uid; // Use authenticated user's ID
  const packageId = uuidv4();

  try {
    const validationResult = PromptToPrototypeInputSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: "Invalid input", details: validationResult.error.format() });
    }

    const originalInput = validationResult.data;
    let { imageDataUri, ...restInput } = originalInput;
    let processedInput = { ...restInput };
    let inputImageStorageUrl = null;

    if (imageDataUri) {
      const parts = dataUriToBuffer(imageDataUri);
      if (parts) {
        try {
          inputImageStorageUrl = await uploadImageToStorage(parts.buffer, parts.mimeType, parts.extension, userId, packageId, 'input_image_');
          processedInput.imageDataUri = inputImageStorageUrl;
        } catch (uploadError) {
          console.warn(`User ${userId} failed to upload user-provided image for package ${packageId}:`, uploadError);
          processedInput.imageDataUri = imageDataUri;
        }
      } else {
        console.warn(`Invalid data URI for input image from user ${userId} for package ${packageId}.`);
        processedInput.imageDataUri = imageDataUri;
      }
    }

    const flowOutput = await promptToPrototype(processedInput);

    if (flowOutput.moodBoardImage && flowOutput.moodBoardImage.startsWith('data:')) {
      const parts = dataUriToBuffer(flowOutput.moodBoardImage);
      if (parts) {
        try {
          flowOutput.moodBoardImage = await uploadImageToStorage(parts.buffer, parts.mimeType, parts.extension, userId, packageId, 'moodboard_output_');
        } catch (uploadError) {
          console.warn(`User ${userId} failed to upload generated mood board image for package ${packageId}:`, uploadError);
          flowOutput.moodBoardImage = 'https://placehold.co/600x400.png?text=Moodboard+Upload+Failed';
        }
      } else {
        console.warn(`Invalid data URI for generated mood board image from user ${userId} for package ${packageId}.`);
        flowOutput.moodBoardImage = 'https://placehold.co/600x400.png?text=Invalid+Moodboard+URI';
      }
    }

    const promptPackage = {
      id: packageId,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      originalPrompt: originalInput.prompt,
      stylePreset: originalInput.stylePreset || null,
      inputImageUrl: inputImageStorageUrl,
      loglines: flowOutput.loglines,
      loglinesJsonString: flowOutput.loglinesJsonString,
      moodBoardCells: flowOutput.moodBoardCells,
      moodBoardCellsJsonString: flowOutput.moodBoardCellsJsonString,
      moodBoardImage: flowOutput.moodBoardImage,
      shotList: flowOutput.shotList,
      shotListMarkdownString: flowOutput.shotListMarkdownString,
      proxyClipAnimaticDescription: flowOutput.proxyClipAnimaticDescription,
      pitchSummary: flowOutput.pitchSummary,
      allTextAssetsJsonString: flowOutput.allTextAssetsJsonString,
    };

    await db.collection('promptPackages').doc(packageId).set(promptPackage);

    return res.status(200).json(promptPackage);
  } catch (error) {
    console.error(`Error in /promptToPrototype endpoint for user ${userId}, package ${packageId}:`, error);
     if (error.code === 'FIRESTORE_ERROR') {
        return res.status(503).json({ error: "Firestore operation failed.", details: error.message });
    }
    return res.status(500).json({ error: "An unexpected error occurred.", details: error.message });
  }
});

// --- Endpoint for Storyboard Generation ---
app.post('/generateStoryboard', async (req, res) => {
  const userId = req.user.uid; // Use authenticated user's ID
  const packageId = uuidv4();

  try {
    const validationResult = StoryboardGeneratorInputSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: "Invalid input", details: validationResult.error.format() });
    }

    const flowInput = validationResult.data;
    const flowOutput = await generateStoryboard(flowInput);

    if (flowOutput.panels && flowOutput.panels.length > 0) {
      const panelImageUploadPromises = flowOutput.panels.map(async (panel, index) => {
        if (panel.imageDataUri && panel.imageDataUri.startsWith('data:')) {
          const parts = dataUriToBuffer(panel.imageDataUri);
          if (parts) {
            try {
              return {
                ...panel,
                imageDataUri: await uploadImageToStorage(parts.buffer, parts.mimeType, parts.extension, userId, packageId, `panel_${index + 1}_`),
              };
            } catch (uploadError) {
              console.warn(`User ${userId} failed to upload image for panel ${index + 1} for package ${packageId}:`, uploadError);
              return { ...panel, imageDataUri: `https://placehold.co/512x384.png?text=Panel+${index + 1}+Upload+Failed` };
            }
          } else {
            console.warn(`Invalid data URI for panel ${index + 1} image from user ${userId} for package ${packageId}.`);
            return { ...panel, imageDataUri: `https://placehold.co/512x384.png?text=Invalid+Panel+${index + 1}+URI` };
          }
        }
        return panel;
      });
      flowOutput.panels = await Promise.all(panelImageUploadPromises);
    }

    const storyboardPackage = {
      id: packageId,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      sceneDescription: flowInput.sceneDescription,
      numPanels: flowInput.numPanels || (flowOutput.panels ? flowOutput.panels.length : 0),
      stylePreset: flowInput.stylePreset || null,
      titleSuggestion: flowOutput.titleSuggestion,
      panels: flowOutput.panels,
    };

    await db.collection('storyboards').doc(packageId).set(storyboardPackage);

    return res.status(200).json(storyboardPackage);
  } catch (error) {
    console.error(`Error in /generateStoryboard endpoint for user ${userId}, package ${packageId}:`, error);
    if (error.code === 'FIRESTORE_ERROR') {
        return res.status(503).json({ error: "Firestore operation failed.", details: error.message });
    }
    return res.status(500).json({ error: "An unexpected error occurred.", details: error.message });
  }
});

// Export the Express app as a single Firebase Function
exports.aiApi = functions.region('us-west1').https.onRequest(app);

// Export the raw app for testing purposes
exports.app = app;
