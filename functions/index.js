// Firebase Admin SDK initialization (used for Firestore, Auth, etc.)
const admin = require("firebase-admin");

// Firebase Functions v2 (modern HTTP functions + logging)
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");

const express = require('express');
const cors = require('cors');
// For now, assuming a common root or that the build places it correctly.
// MODIFIED: Path updated to point to the copied files within functions directory

// Set global options for all functions
setGlobalOptions({ region: 'us-west1' });

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
    logger.error("Error while verifying Firebase ID token:", error);
    res.status(403).json({ error: 'Forbidden - Invalid or expired token.' });
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
    functions.logger.error("Error fetching columns and cards:", error);
    res.status(500).json({ error: "Failed to fetch columns and their cards." });
  }
});

app.post('/production-board/columns', async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: "Title is required and must be a non-empty string." });
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
    functions.logger.error("Error creating new column:", error);
    res.status(500).json({ error: "Failed to create new column." });
  }
});

app.put('/production-board/columns/:columnId', async (req, res) => {
  try {
    const { columnId } = req.params;
    const { title } = req.body;

    if (!columnId) {
      return res.status(400).json({ error: "Column ID is required." });
    }

    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
      return res.status(400).json({ error: "Title, if provided, must be a non-empty string." });
    }

    const columnRef = db.collection('productionBoardColumns').doc(columnId);
    const columnDoc = await columnRef.get();

    if (!columnDoc.exists) {
      return res.status(404).json({ error: "Column not found." });
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
    functions.logger.error(`Error updating column ${req.params.columnId}:`, error);
    res.status(500).json({ error: "Failed to update column." });
  }
});

app.delete('/production-board/columns/:columnId', async (req, res) => {
  try {
    const { columnId } = req.params;

    if (!columnId) {
      return res.status(400).json({ error: "Column ID is required." });
    }

    const columnRef = db.collection('productionBoardColumns').doc(columnId);
    const columnDoc = await columnRef.get();

    if (!columnDoc.exists) {
      return res.status(404).json({ error: "Column not found." });
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
    functions.logger.error(`Error deleting column ${req.params.columnId} and its cards:`, error);
    res.status(500).json({ error: "Failed to delete column and its cards." });
  }
});

// Cards Endpoints
app.post('/production-board/columns/:columnId/cards', async (req, res) => {
  const { columnId } = req.params;
  const { title, description, priority, dueDate, coverImage, dataAiHint, orderInColumn } = req.body;

  if (!columnId) {
    return res.status(400).json({ error: "Column ID is required." });
  }
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: "Card title is required and must be a non-empty string." });
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
    functions.logger.error(`Error creating card in column ${columnId}:`, error);
    if (error.status === 404) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to create new card." });
  }
});

app.get('/production-board/cards/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;

    if (!cardId) {
      return res.status(400).json({ error: "Card ID is required." });
    }

    const cardRef = db.collection('productionBoardCards').doc(cardId);
    const cardDoc = await cardRef.get();

    if (!cardDoc.exists) {
      return res.status(404).json({ error: "Card not found." });
    }

    res.status(200).json({ id: cardDoc.id, ...cardDoc.data() });
  } catch (error) {
    functions.logger.error(`Error fetching card ${req.params.cardId}:`, error);
    res.status(500).json({ error: "Failed to fetch card." });
  }
});

app.put('/production-board/cards/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    const { title, description, priority, dueDate, coverImage, dataAiHint, orderInColumn, columnId: newColumnId } = req.body;

    if (!cardId) {
      return res.status(400).json({ error: "Card ID is required." });
    }

    const cardRef = db.collection('productionBoardCards').doc(cardId);

    const updateData = {};
    const allowedFields = { title, description, priority, dueDate, coverImage, dataAiHint, orderInColumn };

    for (const [key, value] of Object.entries(allowedFields)) {
      if (value !== undefined) {
        if (key === 'title' && (typeof value !== 'string' || value.trim() === '')) {
          return res.status(400).json({ error: "Title, if provided, must be a non-empty string." });
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
      functions.logger.warn(`Attempted to change columnId for card ${cardId} via PUT. This should be done via PATCH /move.`);
    }


    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No valid fields provided for update." });
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
    functions.logger.error(`Error updating card ${req.params.cardId}:`, error);
    if (error.status === 404) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to update card." });
  }
});

app.delete('/production-board/cards/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;

    if (!cardId) {
      return res.status(400).json({ error: "Card ID is required." });
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
            functions.logger.warn(`Column ${columnId} not found when trying to remove card ${cardId} from its cardOrder.`);
        }
      } else {
        functions.logger.warn(`Card ${cardId} does not have a columnId. Cannot update cardOrder.`);
      }

      transaction.delete(cardRef);
    });

    res.status(204).send();
  } catch (error) {
    functions.logger.error(`Error deleting card ${req.params.cardId}:`, error);
    if (error.status === 404) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to delete card." });
  }
});

app.patch('/production-board/cards/:cardId/move', async (req, res) => {
  const { cardId } = req.params;
  const { targetColumnId, newOrderInColumn } = req.body; // newOrderInColumn is the index in the target's cardOrder

  if (!cardId) {
    return res.status(400).json({ error: "Card ID is required." });
  }
  if (!targetColumnId) {
    return res.status(400).json({ error: "Target column ID is required." });
  }
  // newOrderInColumn can be 0, so check for undefined
  if (newOrderInColumn !== undefined && (typeof newOrderInColumn !== 'number' || newOrderInColumn < 0)) {
    return res.status(400).json({ error: "New order index must be a non-negative number." });
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
    functions.logger.error(`Error moving card ${cardId} to column ${targetColumnId}:`, error);
    if (error.status === 404) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to move card." });
  }
});

// Expose Express app as a single Firebase Function
admin.initializeApp();
setGlobalOptions({ region: "us-west1" });

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
exports.helloWorld = onRequest((req, res) => {
  logger.info("Hello logs!", { structuredData: true });
  res.send("Hello from Firebase!");
});

/**
 * Expose internals for testing if needed.
 */
if (process.env.NODE_ENV === 'test') {
  exports.testableApp = app;
  exports.authenticate = authenticate;
}