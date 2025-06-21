// Firebase Admin SDK initialization (used for Firestore, Auth, etc.)
const admin = require("firebase-admin");
const axios = require('axios'); // Import axios

// Firebase Functions v2 (modern HTTP functions + logging)
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
const { v4: uuidv4 } = require('uuid'); // Import uuid

const express = require('express');
const cors = require('cors');

// Set global options for all functions
// Ensure region matches where your collaboration service might be or a suitable default
setGlobalOptions({ region: 'us-west1', secrets: ["COLLABORATION_SERVICE_INTERNAL_URL"] });

// Helper function to notify collaboration service
// The COLLABORATION_SERVICE_INTERNAL_URL should be set as a secret in Firebase Functions environment
const notifyCollaborationService = async (projectId, updatedBySocketId) => {
  const collaborationServiceUrl = process.env.COLLABORATION_SERVICE_INTERNAL_URL;
  if (!collaborationServiceUrl) {
    logger.error("COLLABORATION_SERVICE_INTERNAL_URL is not set. Cannot notify collaboration service.");
    return;
  }
  try {
    const endpoint = `${collaborationServiceUrl}/api/internal/broadcast-board-change`;
    const params = { projectId };
    if (updatedBySocketId) {
      params.updatedBySocketId = updatedBySocketId;
    }
    // Use a timeout for the request to prevent function from hanging too long
    await axios.post(endpoint, null, { params, timeout: 3000 }); // 3 second timeout
    logger.info(`Successfully notified collaboration service for projectId: ${projectId}`);
  } catch (error) {
    let errorMessage = 'Failed to notify collaboration service.';
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      errorMessage = `Error from collaboration service: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
      logger.error(errorMessage, { status: error.response.status, data: error.response.data, projectId });
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = `No response from collaboration service: ${error.message}`;
      logger.error(errorMessage, { message: error.message, projectId });
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = `Error setting up notification to collaboration service: ${error.message}`;
      logger.error(errorMessage, { message: error.message, projectId });
    }
    // We don't want to fail the main operation if notification fails, so just log.
  }
};

// Assuming a global production board for now, use a fixed ID.
const GLOBAL_PRODUCTION_BOARD_PROJECT_ID = "globalProductionBoard";

// Initialize admin SDK (ensure it's only done once)
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const app = express();

// Middleware to enable CORS
app.use(cors({origin: true}));

// Middleware to parse JSON bodies
app.use(express.json());

// Authentication middleware (applied globally to all routes below)
async function authenticate(req, res, next) {
  // Bypass for testing with a specific mock token
  if (process.env.NODE_ENV === 'test') {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer mock-valid-token')) {
      req.user = { uid: 'test-uid', email: 'test@example.com' };
      return next();
    }
    // Allow tests to explicitly send no token or other tokens to test unauthenticated/error paths
  }

  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - No token provided or incorrect format.' });
  }
  const idToken = req.headers.authorization.split('Bearer ')[1];
  try {
    // This will now only be hit by actual tokens in non-test env, or by specific test tokens
    // not matching 'mock-valid-token' if we want to test the stubbed verifyIdToken behavior.
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // Add user to request
    next();
  } catch (error) {
    // This error is an authentication failure, so it's handled directly.
    // It doesn't pass to the global Express error handler via next(error)
    // because we want to send a 403 immediately.
    // For consistency, we can structure the log and response similarly.
    const errorId = uuidv4();
    logger.error(`Firebase ID token verification error - Error ID: ${errorId}`, {
      errorId: errorId,
      originalMessage: error.message,
      stack: error.stack,
      // Potentially log parts of the token if policy allows, for debugging, but be careful.
    });
    res.status(403).json({
      success: false,
      error: {
        id: errorId,
        message: 'Forbidden - Invalid or expired token.',
        code: 'TOKEN_VERIFICATION_FAILED',
      }
    });
  }
}

// Apply authentication middleware to all routes in this Express app
// Any new routes added to 'app' will be authenticated.
app.use(authenticate);

// --- Production Board API Endpoints ---

// Columns Endpoints
app.get('/production-board/columns', async (req, res) => {
  try {
    const columnsSnapshot = await db.collection('productionBoardColumns')
                                    .orderBy('createdAt', 'asc')
                                    .get();

    if (columnsSnapshot.empty) {
      return res.status(200).json([]);
    }

    const columnsData = [];
    for (const columnDoc of columnsSnapshot.docs) {
      const column = { id: columnDoc.id, ...columnDoc.data() };

      // Fetch cards for this column
      // Assuming cards have an 'orderInColumn' field for ordering
      // and 'columnId' field to link to the column.
      const cardsSnapshot = await db.collection('productionBoardCards')
                                    .where('columnId', '==', columnDoc.id)
                                    .orderBy('orderInColumn', 'asc')
                                    .get();

      column.cards = cardsSnapshot.docs.map(cardDoc => ({ id: cardDoc.id, ...cardDoc.data() }));
      columnsData.push(column);
    }

    res.status(200).json(columnsData);
  } catch (error) {
    // logger.error already called by the global handler if next(error) is used.
    // Here, we can add more specific context if needed before passing to global handler.
    error.status = error.status || 500;
    error.code = error.code || 'FETCH_COLUMNS_FAILED';
    next(error);
  }
});

app.post('/production-board/columns', async (req, res, next) => {
  try {
    const { title } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      const errorId = uuidv4();
      logger.warn(`Validation Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'} - Message: Title is required`, {
        errorId: errorId,
        route: req.path,
        userId: req.user ? req.user.uid : 'unknown',
        reason: "Title is required and must be a non-empty string."
      });
      return res.status(400).json({
        success: false,
        error: {
          id: errorId,
          message: "Title is required and must be a non-empty string.",
          code: "VALIDATION_ERROR",
        }
      });
    }

    const newColumnData = {
      title: title.trim(),
      cardOrder: [], // Initialize with an empty array for card IDs order
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const columnRef = await db.collection('productionBoardColumns').add(newColumnData);
    const columnDoc = await columnRef.get();

    res.status(201).json({ id: columnDoc.id, ...columnDoc.data() });
  } catch (error) {
    error.status = error.status || 500;
    error.code = error.code || 'CREATE_COLUMN_FAILED';
    next(error);
  }
});

app.put('/production-board/columns/:columnId', async (req, res, next) => {
  try {
    const { columnId } = req.params;
    const { title } = req.body;

    if (!columnId) {
      const errorId = uuidv4();
      logger.warn(`Validation Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'} - Message: Column ID is required`, { errorId, route: req.path, userId: req.user?.uid });
      return res.status(400).json({ success: false, error: { id: errorId, message: "Column ID is required.", code: "VALIDATION_ERROR" } });
    }

    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
      const errorId = uuidv4();
      logger.warn(`Validation Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'} - Message: Title must be non-empty`, { errorId, route: req.path, userId: req.user?.uid });
      return res.status(400).json({ success: false, error: { id: errorId, message: "Title, if provided, must be a non-empty string.", code: "VALIDATION_ERROR" } });
    }

    const columnRef = db.collection('productionBoardColumns').doc(columnId);
    const columnDoc = await columnRef.get();

    if (!columnDoc.exists) {
      const errorId = uuidv4();
      logger.warn(`Not Found Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'} - Message: Column not found`, { errorId, route: req.path, userId: req.user?.uid, columnId });
      return res.status(404).json({ success: false, error: { id: errorId, message: "Column not found.", code: "NOT_FOUND" } });
    }

    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (title !== undefined) {
      updateData.title = title.trim();
    }

    await columnRef.update(updateData);
    const updatedDoc = await columnRef.get();

    res.status(200).json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    error.status = error.status || 500;
    error.code = error.code || 'UPDATE_COLUMN_FAILED';
    next(error);
  }
});

app.delete('/production-board/columns/:columnId', async (req, res, next) => {
  try {
    const { columnId } = req.params;

    if (!columnId) {
      const errorId = uuidv4();
      logger.warn(`Validation Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'} - Message: Column ID required`, { errorId, route: req.path, userId: req.user?.uid });
      return res.status(400).json({ success: false, error: { id: errorId, message: "Column ID is required.", code: "VALIDATION_ERROR" } });
    }

    const columnRef = db.collection('productionBoardColumns').doc(columnId);
    const columnDoc = await columnRef.get();

    if (!columnDoc.exists) {
      const errorId = uuidv4();
      logger.warn(`Not Found Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'} - Message: Column not found`, { errorId, route: req.path, userId: req.user?.uid, columnId });
      return res.status(404).json({ success: false, error: { id: errorId, message: "Column not found.", code: "NOT_FOUND" } });
    }

    // Batch delete associated cards
    const cardsSnapshot = await db.collection('productionBoardCards')
                                  .where('columnId', '==', columnId)
                                  .get();

    const batch = db.batch();
    cardsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete the column itself
    batch.delete(columnRef);

    await batch.commit();

    res.status(204).send(); // Successfully deleted
  } catch (error) {
    error.status = error.status || 500;
    error.code = error.code || 'DELETE_COLUMN_FAILED';
    next(error);
  }
});

// Cards Endpoints
app.post('/production-board/columns/:columnId/cards', async (req, res, next) => {
  const { columnId } = req.params;
  const { title, description, priority, dueDate, coverImage, dataAiHint, orderInColumn } = req.body;

  if (!columnId) {
    const errorId = uuidv4();
    logger.warn(`Validation Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'} - Message: Column ID required`, { errorId, route: req.path, userId: req.user?.uid });
    return res.status(400).json({ success: false, error: { id: errorId, message: "Column ID is required.", code: "VALIDATION_ERROR" } });
  }
  if (!title || typeof title !== 'string' || title.trim() === '') {
    const errorId = uuidv4();
    logger.warn(`Validation Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'} - Message: Card title required`, { errorId, route: req.path, userId: req.user?.uid, columnId });
    return res.status(400).json({ success: false, error: { id: errorId, message: "Card title is required and must be a non-empty string.", code: "VALIDATION_ERROR" } });
  }

  const columnRef = db.collection('productionBoardColumns').doc(columnId);
  const newCardRef = db.collection('productionBoardCards').doc(); // Firestore auto-generates ID

  try {
    const newCardData = await db.runTransaction(async (transaction) => {
      const columnDoc = await transaction.get(columnRef);
      if (!columnDoc.exists) {
        throw { status: 404, message: "Column not found." }; // Custom error for transaction
      }

      let effectiveOrderInColumn = orderInColumn;
      if (effectiveOrderInColumn === undefined || effectiveOrderInColumn === null) {
        // Determine next order: current number of cards in cardOrder + 1, or 0 if cardOrder doesn't exist/is empty
        const currentCardOrder = columnDoc.data().cardOrder || [];
        effectiveOrderInColumn = currentCardOrder.length;
      }

      const cardData = {
        columnId,
        title: title.trim(),
        description: description || null,
        priority: priority || null,
        dueDate: dueDate || null,
        coverImage: coverImage || null,
        dataAiHint: dataAiHint || null,
        orderInColumn: effectiveOrderInColumn,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      transaction.set(newCardRef, cardData);

      // Add new card's ID to the column's cardOrder array
      // If a specific orderInColumn was provided, insert at that index. Otherwise, append.
      const existingCardOrder = columnDoc.data().cardOrder || [];
      const newCardOrder = [...existingCardOrder];
      newCardOrder.splice(effectiveOrderInColumn, 0, newCardRef.id);

      transaction.update(columnRef, {
        cardOrder: newCardOrder, // Use the modified array
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { id: newCardRef.id, ...cardData, createdAt: new Date(), updatedAt: new Date() }; // Approximate serverTimestamp for response
    });

    res.status(201).json(newCardData);
  } catch (error) {
    if (error.status === 404) { // Specific error from transaction
      const errorId = uuidv4();
      logger.warn(`Not Found Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'} - Message: ${error.message}`, { errorId, route: req.path, userId: req.user?.uid, columnId });
      return res.status(404).json({ success: false, error: { id: errorId, message: error.message, code: "NOT_FOUND" } });
    }
    error.status = error.status || 500;
    error.code = error.code || 'CREATE_CARD_FAILED';
    next(error);
  }
});

app.get('/production-board/cards/:cardId', async (req, res, next) => {
  try {
    const { cardId } = req.params;

    if (!cardId) {
      const errorId = uuidv4();
      logger.warn(`Validation Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'} - Message: Card ID required`, { errorId, route: req.path, userId: req.user?.uid });
      return res.status(400).json({ success: false, error: { id: errorId, message: "Card ID is required.", code: "VALIDATION_ERROR" } });
    }

    const cardRef = db.collection('productionBoardCards').doc(cardId);
    const cardDoc = await cardRef.get();

    if (!cardDoc.exists) {
      const errorId = uuidv4();
      logger.warn(`Not Found Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'} - Message: Card not found`, { errorId, route: req.path, userId: req.user?.uid, cardId });
      return res.status(404).json({ success: false, error: { id: errorId, message: "Card not found.", code: "NOT_FOUND" } });
    }

    res.status(200).json({ id: cardDoc.id, ...cardDoc.data() });
  } catch (error) {
    error.status = error.status || 500;
    error.code = error.code || 'FETCH_CARD_FAILED';
    next(error);
  }
});

app.put('/production-board/cards/:cardId', async (req, res, next) => {
  try {
    const { cardId } = req.params;
    const { title, description, priority, dueDate, coverImage, dataAiHint, orderInColumn, columnId: newColumnId } = req.body;

    if (!cardId) {
      const errorId = uuidv4();
      logger.warn(`Validation Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'} - Message: Card ID required`, { errorId, route: req.path, userId: req.user?.uid });
      return res.status(400).json({ success: false, error: { id: errorId, message: "Card ID is required.", code: "VALIDATION_ERROR" } });
    }

    const cardRef = db.collection('productionBoardCards').doc(cardId);

    const updateData = {};
    const allowedFields = { title, description, priority, dueDate, coverImage, dataAiHint, orderInColumn };

    for (const [key, value] of Object.entries(allowedFields)) {
      if (value !== undefined) {
        if (key === 'title' && (typeof value !== 'string' || value.trim() === '')) {
          const errorId = uuidv4();
          logger.warn(`Validation Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'} - Message: Title must be non-empty`, { errorId, route: req.path, userId: req.user?.uid, cardId });
          return res.status(400).json({ success: false, error: { id: errorId, message: "Title, if provided, must be a non-empty string.", code: "VALIDATION_ERROR" } });
        }
        updateData[key] = (typeof value === 'string') ? value.trim() : value;
      }
    }

    // If columnId is being changed, this should ideally be handled by the MOVE endpoint
    // as it requires updating cardOrder in two columns.
    // For now, this PUT will only update fields of the card itself.
    // If newColumnId is part of the request, we will ignore it here to prevent inconsistencies.
    // The dedicated MOVE endpoint is responsible for changing columnId and updating cardOrder arrays.
    if (newColumnId !== undefined) {
      // Log a warning or simply ignore. For now, ignoring.
      logger.warn(`Attempted to change columnId for card ${cardId} via PUT. This should be done via PATCH /move.`, { cardId, userId: req.user?.uid });
    }


    if (Object.keys(updateData).length === 0) {
      const errorId = uuidv4();
      logger.warn(`Validation Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'} - Message: No valid fields for update`, { errorId, route: req.path, userId: req.user?.uid, cardId });
      return res.status(400).json({ success: false, error: { id: errorId, message: "No valid fields provided for update.", code: "VALIDATION_ERROR" } });
    }

    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await db.runTransaction(async (transaction) => {
      const cardDoc = await transaction.get(cardRef);
      if (!cardDoc.exists) {
        throw { status: 404, message: "Card not found." };
      }
      transaction.update(cardRef, updateData);
    });

    const updatedCardDoc = await cardRef.get();
    res.status(200).json({ id: updatedCardDoc.id, ...updatedCardDoc.data() });

  } catch (error) {
    if (error.status === 404) { // Specific error from transaction
      const errorId = uuidv4();
      logger.warn(`Not Found Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'} - Message: ${error.message}`, { errorId, route: req.path, userId: req.user?.uid, cardId });
      return res.status(404).json({ success: false, error: { id: errorId, message: error.message, code: "NOT_FOUND" } });
    }
    error.status = error.status || 500;
    error.code = error.code || 'UPDATE_CARD_FAILED';
    next(error);
  }
});

app.delete('/production-board/cards/:cardId', async (req, res, next) => {
  try {
    const { cardId } = req.params;

    if (!cardId) {
      const errorId = uuidv4();
      logger.warn(`Validation Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'} - Message: Card ID required`, { errorId, route: req.path, userId: req.user?.uid });
      return res.status(400).json({ success: false, error: { id: errorId, message: "Card ID is required.", code: "VALIDATION_ERROR" } });
    }

    const cardRef = db.collection('productionBoardCards').doc(cardId);

    await db.runTransaction(async (transaction) => {
      const cardDoc = await transaction.get(cardRef);
      if (!cardDoc.exists) {
        throw { status: 404, message: "Card not found." };
      }

      const cardData = cardDoc.data();
      const { columnId } = cardData;

      if (columnId) {
        const columnRef = db.collection('productionBoardColumns').doc(columnId);
        // It's good practice to ensure column exists, though arrayRemove is safe if it doesn't
        const columnDoc = await transaction.get(columnRef);
        if (columnDoc.exists) {
            transaction.update(columnRef, {
                cardOrder: admin.firestore.FieldValue.arrayRemove(cardId),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } else {
            logger.warn(`Column ${columnId} not found when trying to remove card ${cardId} from its cardOrder.`, { cardId, columnId, userId: req.user?.uid });
        }
      } else {
        logger.warn(`Card ${cardId} does not have a columnId. Cannot update cardOrder.`, { cardId, userId: req.user?.uid });
      }

      transaction.delete(cardRef);
    });

    res.status(204).send();
  } catch (error) {
    if (error.status === 404) { // Specific error from transaction
      const errorId = uuidv4();
      logger.warn(`Not Found Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'} - Message: ${error.message}`, { errorId, route: req.path, userId: req.user?.uid, cardId });
      return res.status(404).json({ success: false, error: { id: errorId, message: error.message, code: "NOT_FOUND" } });
    }
    error.status = error.status || 500;
    error.code = error.code || 'DELETE_CARD_FAILED';
    next(error);
  }
});

app.patch('/production-board/cards/:cardId/move', async (req, res, next) => {
  const { cardId } = req.params;
  const { targetColumnId, newOrderInColumn } = req.body; // newOrderInColumn is the index in the target's cardOrder

  if (!cardId) {
    const errorId = uuidv4();
    logger.warn(`Validation Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'} - Message: Card ID required`, { errorId, route: req.path, userId: req.user?.uid });
    return res.status(400).json({ success: false, error: { id: errorId, message: "Card ID is required.", code: "VALIDATION_ERROR" } });
  }
  if (!targetColumnId) {
    const errorId = uuidv4();
    logger.warn(`Validation Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'} - Message: Target column ID required`, { errorId, route: req.path, userId: req.user?.uid, cardId });
    return res.status(400).json({ success: false, error: { id: errorId, message: "Target column ID is required.", code: "VALIDATION_ERROR" } });
  }
  // newOrderInColumn can be 0, so check for undefined
  if (newOrderInColumn !== undefined && (typeof newOrderInColumn !== 'number' || newOrderInColumn < 0)) {
    const errorId = uuidv4();
    logger.warn(`Validation Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'} - Message: Invalid order index`, { errorId, route: req.path, userId: req.user?.uid, cardId, newOrderInColumn });
    return res.status(400).json({ success: false, error: { id: errorId, message: "New order index must be a non-negative number.", code: "VALIDATION_ERROR" } });
  }

  const cardRef = db.collection('productionBoardCards').doc(cardId);
  const targetColumnRef = db.collection('productionBoardColumns').doc(targetColumnId);

  try {
    const updatedCardData = await db.runTransaction(async (transaction) => {
      const cardDoc = await transaction.get(cardRef);
      if (!cardDoc.exists) {
        throw { status: 404, message: "Card not found." };
      }
      const cardData = cardDoc.data();
      const sourceColumnId = cardData.columnId;

      const targetColumnDoc = await transaction.get(targetColumnRef);
      if (!targetColumnDoc.exists) {
        throw { status: 404, message: `Target column ${targetColumnId} not found.` };
      }

      let sourceColumnRef;
      let sourceColumnData;
      let sourceCardOrder = [];

      if (sourceColumnId) {
        sourceColumnRef = db.collection('productionBoardColumns').doc(sourceColumnId);
        // Only read source column if it's different from target
        if (sourceColumnId !== targetColumnId) {
          const sourceColumnDoc = await transaction.get(sourceColumnRef);
          if (sourceColumnDoc.exists) {
            sourceColumnData = sourceColumnDoc.data();
            sourceCardOrder = [...(sourceColumnData.cardOrder || [])];
          } else {
            functions.logger.warn(`Source column ${sourceColumnId} not found during card move. Card's columnId might be stale.`);
            // Proceed with removing from an empty array if source column is gone for some reason
          }
        } else { // Moving within the same column
          sourceColumnData = targetColumnDoc.data(); // Use target's data as source
          sourceCardOrder = [...(sourceColumnData.cardOrder || [])];
        }
      }

      let targetCardOrder = [...(targetColumnDoc.data().cardOrder || [])];

      // 1. Remove from source cardOrder
      const cardIndexInSource = sourceCardOrder.indexOf(cardId);
      if (cardIndexInSource > -1) {
        sourceCardOrder.splice(cardIndexInSource, 1);
      }

      // 2. Add to target cardOrder at newOrderInColumn
      let effectiveNewOrder = newOrderInColumn;
      if (effectiveNewOrder === undefined || effectiveNewOrder === null || effectiveNewOrder > targetCardOrder.length) {
        // If moving to a different column and order is not specified or out of bounds, add to end
        // If moving within the same column and order is out of bounds, also add to end.
        effectiveNewOrder = targetCardOrder.length;
      }

      // If the card was removed from targetCardOrder (i.e. same column move), adjust index
      if (sourceColumnId === targetColumnId && cardIndexInSource !== -1 && cardIndexInSource < effectiveNewOrder) {
        // No specific adjustment needed here as splice for add will handle it if targetCardOrder is already modified
      }

      targetCardOrder.splice(effectiveNewOrder, 0, cardId);


      // Transaction Updates
      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      // Update source column (if different)
      if (sourceColumnId && sourceColumnId !== targetColumnId && sourceColumnRef) {
         // Check if sourceColumnRef was defined (i.e. sourceColumnId existed)
        transaction.update(sourceColumnRef, { cardOrder: sourceCardOrder, updatedAt: timestamp });
      }

      // Update target column
      transaction.update(targetColumnRef, { cardOrder: targetCardOrder, updatedAt: timestamp });

      // Update card
      transaction.update(cardRef, {
        columnId: targetColumnId,
        orderInColumn: effectiveNewOrder, // This is the index in the cardOrder array
        updatedAt: timestamp
      });

      // Return data for the response
      return {
        id: cardId,
        ...cardData, // original card data
        columnId: targetColumnId, // updated columnId
        orderInColumn: effectiveNewOrder, // updated order
        updatedAt: new Date() // Approximate for response
      };
    });

    res.status(200).json(updatedCardData);

  } catch (error) {
    if (error.status === 404) { // Specific error from transaction
      const errorId = uuidv4();
      logger.warn(`Not Found Error ID: ${errorId} - Route: ${req.path} - User: ${req.user ? req.user.uid : 'unknown'} - Message: ${error.message}`, { errorId, route: req.path, userId: req.user?.uid, cardId, targetColumnId });
      return res.status(404).json({ success: false, error: { id: errorId, message: error.message, code: "NOT_FOUND" } });
    }
    error.status = error.status || 500;
    error.code = error.code || 'MOVE_CARD_FAILED';
    next(error);
  }
});

// Global error handler for the Express app 'api'
app.use((err, req, res, next) => {
  const errorId = err.errorId || uuidv4();
  const userId = req.user ? req.user.uid : 'unknown'; // From authenticate middleware
  const errorMessage = err.message || 'An unexpected error occurred in the API.';
  const errorCode = err.code || 'INTERNAL_API_ERROR';
  const errorStatus = typeof err.status === 'number' ? err.status : 500;

  // Log the error using firebase-functions/logger
  logger.error(`API Error ID: ${errorId} - User: ${userId} - Route: ${req.path} - Code: ${errorCode} - Message: ${errorMessage}`, {
    errorId: errorId,
    userId: userId,
    route: req.path,
    method: req.method,
    errorCode: errorCode,
    errorMessage: errorMessage,
    stack: err.stack,
    requestDetails: {
      params: req.params,
      query: req.query,
      // body: req.body, // Avoid logging sensitive PII by default
    }
  });

  // Send standardized JSON response
  if (res.headersSent) {
    return next(err); // Delegate to default if headers already sent
  }
  res.status(errorStatus).json({
    success: false,
    error: {
      id: errorId,
      message: errorMessage,
      code: errorCode,
    }
  });
});


// Expose Express app as a single Firebase Function
// admin.initializeApp(); // Already initialized at the top if (admin.apps.length === 0)
// setGlobalOptions({ region: "us-west1" }); // Already set at the top

/**
 * Main API export.
 * Handles all routes under `/api`, using an Express app.
 * Example route: `/api/production-board/columns`
 */
exports.api = onRequest(app);

/**
 * Conceptual Firestore Collections:
 *
 * 1. productionBoardColumns
 *    - Fields:
 *        name: string
 *        order: number
 *        createdAt: timestamp
 *        updatedAt: timestamp
 *        cardOrder: string[] (ordered card IDs)
 *
 * 2. productionBoardCards
 *    - Fields:
 *        columnId: string
 *        title: string
 *        description?: string
 *        order: number
 *        createdAt: timestamp
 *        updatedAt: timestamp
 *        assignee?: string
 *        dueDate?: timestamp
 */

/**
 * Optional simple function for testing or demos.
 * Not connected to the main Express API.
 */
exports.helloWorld = onRequest(async (req, res) => {
  const errorId = uuidv4(); // Generate errorId at the start for potential use
  try {
    logger.info("Hello logs!", { structuredData: true, userId: req.user?.uid }); // Example of adding userId if available
    res.status(200).json({ success: true, data: "Hello from Firebase!" });
  } catch (error) {
    const userId = req.user ? req.user.uid : (req.body && req.body.userId) || 'unknown';
    const errorMessage = error.message || 'An unexpected error occurred in helloWorld.';
    const errorCode = error.code || 'FUNCTION_EXECUTION_ERROR';
    const errorStatus = typeof error.status === 'number' ? error.status : 500;

    logger.error(`Function Error ID: ${errorId} - Function: helloWorld - User: ${userId} - Code: ${errorCode} - Message: ${errorMessage}`, {
      errorId: errorId,
      functionName: 'helloWorld',
      userId: userId,
      errorCode: errorCode,
      errorMessage: errorMessage,
      stack: error.stack,
      requestData: req.body // Log request data cautiously
    });

    res.status(errorStatus).json({
      success: false,
      error: {
        id: errorId,
        message: errorMessage,
        code: errorCode,
      }
    });
  }
});

/**
 * Expose internals for testing if needed.
 */
if (process.env.NODE_ENV === 'test') {
  exports.testableApp = app;
  exports.authenticate = authenticate;
}