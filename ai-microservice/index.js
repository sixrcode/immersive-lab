const functions = require('firebase-functions');
const logger = require('firebase-functions/logger');
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
const { generateProductionChecklistFlow, ProductionChecklistInputSchema } = require('./src/flows/production-checklist-generator');

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
      const errorId = uuidv4();
      logger.warn(`Validation Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'}`, {
        errorId: errorId,
        route: req.path,
        userId: req.user ? req.user.uid : 'unknown',
        validationErrors: validationResult.error.format()
      });
      return res.status(400).json({
        success: false,
        error: {
          id: errorId,
          message: "Invalid input",
          code: "VALIDATION_ERROR",
          details: validationResult.error.format()
        }
      });
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
    // Add status to the error object if it's a specific type of error known here
    if (error.code === 'FIRESTORE_ERROR') {
      error.status = 503; // Service Unavailable
      error.code = 'FIRESTORE_OPERATION_FAILED'; // More specific error code
    } else {
      error.status = error.status || 500; // Keep existing status or default
    }
    next(error); // Pass to global error handler
  }
});

// --- Endpoint for Production Checklist Generation ---
app.post('/productionChecklist', async (req, res, next) => {
  const checklistId = uuidv4();
  const userId = req.user.uid; // Use authenticated user's ID

  try {
    const validationResult = ProductionChecklistInputSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorId = uuidv4();
      logger.warn(`Validation Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'}`, {
        errorId: errorId,
        route: req.path,
        userId: req.user ? req.user.uid : 'unknown',
        validationErrors: validationResult.error.format()
      });
      return res.status(400).json({
        success: false,
        error: {
          id: errorId,
          message: "Invalid input for production checklist",
          code: "VALIDATION_ERROR",
          details: validationResult.error.format()
        }
      });
    }

    const flowInput = validationResult.data;
    const flowOutput = await generateProductionChecklistFlow(flowInput);

    const productionChecklistPackage = {
      id: checklistId,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      scriptAnalysisId: flowInput.scriptAnalysis.id || null, // Assuming scriptAnalysis might have an ID
      checklistRequirements: flowInput.checklistRequirements,
      tasks: flowOutput, // This is an array of tasks
    };

    await db.collection('productionChecklists').doc(checklistId).set(productionChecklistPackage);

    return res.status(200).json(productionChecklistPackage);
  } catch (error) {
    if (error.code === 'FIRESTORE_ERROR') {
      error.status = 503;
      error.code = 'FIRESTORE_OPERATION_FAILED';
    } else {
      error.status = error.status || 500;
    }
    next(error); // Pass to global error handler
  }
});

// --- Endpoint for Prompt to Prototype ---
app.post('/promptToPrototype', async (req, res) => {
  const userId = req.user.uid; // Use authenticated user's ID
  const packageId = uuidv4();

  try {
    const validationResult = PromptToPrototypeInputSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorId = uuidv4();
      logger.warn(`Validation Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'}`, {
        errorId: errorId,
        route: req.path,
        userId: req.user ? req.user.uid : 'unknown',
        validationErrors: validationResult.error.format()
      });
      return res.status(400).json({
        success: false,
        error: {
          id: errorId,
          message: "Invalid input",
          code: "VALIDATION_ERROR",
          details: validationResult.error.format()
        }
      });
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
          logger.warn(`User ${userId} failed to upload user-provided image for package ${packageId}:`, { error: uploadError, userId, packageId });
          processedInput.imageDataUri = imageDataUri;
        }
      } else {
        logger.warn(`Invalid data URI for input image from user ${userId} for package ${packageId}.`, { userId, packageId });
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
          logger.warn(`User ${userId} failed to upload generated mood board image for package ${packageId}:`, { error: uploadError, userId, packageId });
          flowOutput.moodBoardImage = 'https://placehold.co/600x400.png?text=Moodboard+Upload+Failed';
        }
      } else {
        logger.warn(`Invalid data URI for generated mood board image from user ${userId} for package ${packageId}.`, { userId, packageId });
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
    // Add status to the error object if it's a specific type of error known here
    if (error.code === 'FIRESTORE_ERROR') {
      error.status = 503; // Service Unavailable
      error.code = 'FIRESTORE_OPERATION_FAILED'; // More specific error code
    } else {
      error.status = error.status || 500; // Keep existing status or default
    }
    next(error); // Pass to global error handler
  }
});

// --- Endpoint for Storyboard Generation ---
app.post('/generateStoryboard', async (req, res) => {
  const userId = req.user.uid; // Use authenticated user's ID
  const packageId = uuidv4();

  try {
    const validationResult = StoryboardGeneratorInputSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorId = uuidv4();
      logger.warn(`Validation Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'}`, {
        errorId: errorId,
        route: req.path,
        userId: req.user ? req.user.uid : 'unknown',
        validationErrors: validationResult.error.format()
      });
      return res.status(400).json({
        success: false,
        error: {
          id: errorId,
          message: "Invalid input",
          code: "VALIDATION_ERROR",
          details: validationResult.error.format()
        }
      });
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
              logger.warn(`User ${userId} failed to upload image for panel ${index + 1} for package ${packageId}:`, { error: uploadError, userId, packageId, panelIndex: index + 1 });
              return { ...panel, imageDataUri: `https://placehold.co/512x384.png?text=Panel+${index + 1}+Upload+Failed` };
            }
          } else {
            logger.warn(`Invalid data URI for panel ${index + 1} image from user ${userId} for package ${packageId}.`, { userId, packageId, panelIndex: index + 1 });
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
    // Add status to the error object if it's a specific type of error known here
    if (error.code === 'FIRESTORE_ERROR') {
      error.status = 503; // Service Unavailable
      error.code = 'FIRESTORE_OPERATION_FAILED'; // More specific error code
    } else {
      error.status = error.status || 500; // Keep existing status or default
    }
    next(error); // Pass to global error handler
  }
});

// Global error handler
app.use((err, req, res, next) => {
  const errorId = uuidv4(); // Generate a unique ID for this error instance
  const userId = req.user ? req.user.uid : 'unknown';
  const errorMessage = err.message || 'An unexpected error occurred.';
  const errorCode = err.code || 'INTERNAL_ERROR'; // General error code unless specified
  const errorStatus = typeof err.status === 'number' ? err.status : 500;

  // Log the error with structured data
  logger.error(`Error ID: ${errorId} - User: ${userId} - Route: ${req.path} - Code: ${errorCode} - Message: ${errorMessage}`, {
    errorId: errorId,
    userId: userId,
    route: req.path,
    method: req.method,
    errorCode: errorCode,
    errorMessage: errorMessage,
    stack: err.stack, // Include stack trace for detailed debugging
    requestDetails: { // Optional: include parts of the request if safe and useful
      body: req.body, // Be cautious with logging sensitive data from body
      params: req.params,
      query: req.query,
    }
  });

  // Send standardized JSON response
  res.status(errorStatus).json({
    success: false,
    error: {
      id: errorId,
      message: errorMessage,
      code: errorCode,
    }
  });
});

// Export the Express app as a single Firebase Function
exports.aiApi = functions.region('us-west1').https.onRequest(app);

// Export the raw app for testing purposes
exports.app = app;
