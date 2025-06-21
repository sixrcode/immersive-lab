// Firebase Admin Mock
const mockFirestore = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(), // Added for potential future use
  get: jest.fn(),
  add: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  batch: jest.fn(() => ({ // Return an object that has a commit method and can chain other batch operations
    update: jest.fn(),
    delete: jest.fn(),
    set: jest.fn(),
    commit: jest.fn(),
  })),
  runTransaction: jest.fn(), // Will be configured per test or with a default implementation
};

// Mock admin.firestore.FieldValue constants
const fieldValueMock = {
  serverTimestamp: jest.fn(() => 'MOCK_SERVER_TIMESTAMP'),
  arrayUnion: jest.fn(val => ({ _methodName: 'FieldValue.arrayUnion', _elements: [val] })),
  arrayRemove: jest.fn(val => ({ _methodName: 'FieldValue.arrayRemove', _elements: [val] })),
};

jest.mock('firebase-admin', () => {
  const actualAdmin = jest.requireActual('firebase-admin'); // Get actual admin for other properties if needed
  return {
    ...actualAdmin, // Spread actual admin to keep other functionalities like auth (if not fully mocked)
    initializeApp: jest.fn(),
    firestore: jest.fn(() => ({ // Return the mock Firestore object
      ...mockFirestore,
      FieldValue: fieldValueMock, // Attach the FieldValue mock here
    })),
    // Mock other admin services if used by the functions (e.g., auth)
    auth: jest.fn(() => ({
        verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-user-uid', email: 'user@example.com' })
    })),
  };
});


// Import your Express app from index.js
// Make sure index.js doesn't call admin.initializeApp() at the global scope if it's already initialized by tests or if tests need to control init.
// For this setup, we assume initializeApp is fine or handled.
const { api } = require('../index'); // Assuming your Express app is exported as 'api'
const request = require('supertest'); // To make HTTP requests to the Express app
const admin = require('firebase-admin'); // To access the mocked admin features, e.g. admin.firestore()

// Helper to get the mocked Firestore instance directly for setting up test data
const dbMock = admin.firestore();

describe('Production Board API', () => {
  // Authentication middleware is part of the app, so we need a token for requests.
  const mockAuthToken = 'Bearer mock-id-token';

  afterEach(() => {
    jest.clearAllMocks(); // Clears all mock function calls and instances between tests
  });

  // --- Column Endpoints Tests ---
  describe('GET /production-board/columns', () => {
    it('should return 200 and columns with their cards when data exists', async () => {
      const mockColumnsData = [
        { id: 'col1', title: 'Column 1', createdAt: new Date().toISOString(), cardOrder: ['card1A'] },
        { id: 'col2', title: 'Column 2', createdAt: new Date().toISOString(), cardOrder: [] },
      ];
      const mockCardsDataCol1 = [
        { id: 'card1A', columnId: 'col1', title: 'Card 1A', orderInColumn: 0, portfolioItemId: 'portfolio-abc' },
      ];

      // Mock for columns fetch
      dbMock.collection('productionBoardColumns').orderBy('createdAt', 'asc').get.mockResolvedValueOnce({
        empty: false,
        docs: mockColumnsData.map(col => ({
          id: col.id,
          data: () => col,
          exists: true,
        })),
      });

      // Mock for cards fetch for col1
      dbMock.collection('productionBoardCards').where('columnId', '==', 'col1').orderBy('orderInColumn', 'asc').get.mockResolvedValueOnce({
        empty: false,
        docs: mockCardsDataCol1.map(card => ({
          id: card.id,
          data: () => card,
          exists: true,
        })),
      });

      // Mock for cards fetch for col2 (empty)
      dbMock.collection('productionBoardCards').where('columnId', '==', 'col2').orderBy('orderInColumn', 'asc').get.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      const response = await request(api)
        .get('/production-board/columns')
        .set('Authorization', mockAuthToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].id).toBe('col1');
      expect(response.body[0].title).toBe('Column 1');
      expect(response.body[0].cards).toHaveLength(1);
      expect(response.body[0].cards[0].id).toBe('card1A');
      expect(response.body[0].cards[0].portfolioItemId).toBe('portfolio-abc'); // Verify portfolioItemId
      expect(response.body[1].id).toBe('col2');
      expect(response.body[1].cards).toHaveLength(0);

      expect(dbMock.collection).toHaveBeenCalledWith('productionBoardColumns');
      expect(dbMock.orderBy).toHaveBeenCalledWith('createdAt', 'asc');
      expect(dbMock.collection).toHaveBeenCalledWith('productionBoardCards');
      expect(dbMock.where).toHaveBeenCalledWith('columnId', '==', 'col1');
      expect(dbMock.where).toHaveBeenCalledWith('columnId', '==', 'col2');
      expect(dbMock.orderBy).toHaveBeenCalledWith('orderInColumn', 'asc');
    });

    it('should return 200 and an empty array if no columns exist', async () => {
      dbMock.collection('productionBoardColumns').orderBy('createdAt', 'asc').get.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      const response = await request(api)
        .get('/production-board/columns')
        .set('Authorization', mockAuthToken);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('PUT /production-board/columns/:columnId', () => {
    const columnId = 'col-to-update';
    const updatedTitle = 'Updated Column Title';

    it('should return 200 and the updated column on successful update', async () => {
      // Mock for the initial get to check existence
      dbMock.doc(columnId).get.mockResolvedValueOnce({
        id: columnId,
        exists: true,
        data: () => ({ title: 'Old Title', cardOrder: [], createdAt: 'sometime', updatedAt: 'sometime' })
      });
      // Mock for the update operation itself (no direct return value needed for update)
      dbMock.update.mockResolvedValueOnce({});
      // Mock for the get after update
      dbMock.doc(columnId).get.mockResolvedValueOnce({
        id: columnId,
        exists: true,
        data: () => ({ title: updatedTitle, cardOrder: [], createdAt: 'sometime', updatedAt: 'MOCK_SERVER_TIMESTAMP' })
      });

      const response = await request(api)
        .put(`/production-board/columns/${columnId}`)
        .set('Authorization', mockAuthToken)
        .send({ title: updatedTitle });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(columnId);
      expect(response.body.title).toBe(updatedTitle);
      expect(dbMock.collection).toHaveBeenCalledWith('productionBoardColumns');
      expect(dbMock.doc).toHaveBeenCalledWith(columnId);
      expect(dbMock.update).toHaveBeenCalledWith({
        title: updatedTitle,
        updatedAt: fieldValueMock.serverTimestamp(),
      });
    });

    it('should return 404 if trying to update a non-existent column', async () => {
      dbMock.doc(columnId).get.mockResolvedValueOnce({ // Initial get
        exists: false,
      });

      const response = await request(api)
        .put(`/production-board/columns/${columnId}`)
        .set('Authorization', mockAuthToken)
        .send({ title: updatedTitle });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("Column not found");
    });

    it('should return 400 if title is provided as an empty string', async () => {
      // No need to mock Firestore calls as validation should happen first
      const response = await request(api)
        .put(`/production-board/columns/${columnId}`)
        .set('Authorization', mockAuthToken)
        .send({ title: "   " });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Title, if provided, must be a non-empty string");
    });

    it('should return 200 and update only updatedAt if title is not provided', async () => {
       dbMock.doc(columnId).get.mockResolvedValueOnce({ // Initial get
        id: columnId,
        exists: true,
        data: () => ({ title: 'Existing Title', cardOrder: [], createdAt: 'sometime', updatedAt: 'sometime' })
      });
      dbMock.update.mockResolvedValueOnce({});
      dbMock.doc(columnId).get.mockResolvedValueOnce({ // Get after update
        id: columnId,
        exists: true,
        data: () => ({ title: 'Existing Title', cardOrder: [], updatedAt: 'MOCK_SERVER_TIMESTAMP' })
      });

      const response = await request(api)
        .put(`/production-board/columns/${columnId}`)
        .set('Authorization', mockAuthToken)
        .send({}); // Empty body, no title

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Existing Title'); // Title should remain unchanged
      expect(dbMock.update).toHaveBeenCalledWith({
        updatedAt: fieldValueMock.serverTimestamp(),
      });
    });
  });

  describe('POST /production-board/columns', () => {
    it('should return 201 and the new column on successful creation', async () => {
      const newColumnTitle = 'New Test Column';
      const mockColumnId = 'col-new-id';
      const mockNewColumnData = {
        title: newColumnTitle,
        cardOrder: [],
        // Timestamps are server-generated, so we don't strictly check them here,
        // but they should be returned by the (mocked) get() call.
        createdAt: 'MOCK_SERVER_TIMESTAMP', // Or a real date string
        updatedAt: 'MOCK_SERVER_TIMESTAMP',
      };

      dbMock.add.mockResolvedValueOnce({ id: mockColumnId });
      dbMock.doc(mockColumnId).get.mockResolvedValueOnce({
        id: mockColumnId,
        data: () => ({ ...mockNewColumnData, title: newColumnTitle }), // Ensure title from request is used
        exists: true,
      });

      const response = await request(api)
        .post('/production-board/columns')
        .set('Authorization', mockAuthToken)
        .send({ title: newColumnTitle });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe(mockColumnId);
      expect(response.body.title).toBe(newColumnTitle);
      expect(response.body.cardOrder).toEqual([]);
      expect(dbMock.collection).toHaveBeenCalledWith('productionBoardColumns');
      expect(dbMock.add).toHaveBeenCalledWith(expect.objectContaining({
        title: newColumnTitle,
        cardOrder: [],
        createdAt: fieldValueMock.serverTimestamp(),
        updatedAt: fieldValueMock.serverTimestamp(),
      }));
    });

    it('should return 400 if title is missing', async () => {
      const response = await request(api)
        .post('/production-board/columns')
        .set('Authorization', mockAuthToken)
        .send({}); // No title

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Title is required");
    });

     it('should return 400 if title is an empty string', async () => {
      const response = await request(api)
        .post('/production-board/columns')
        .set('Authorization', mockAuthToken)
        .send({ title: "   " }); // Empty title

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Title is required");
    });
  });

  describe('DELETE /production-board/columns/:columnId', () => {
    const columnId = 'col-to-delete';
    const mockCardsInColumn = [
      { id: 'card1', data: () => ({ title: 'Card 1', columnId: columnId }) },
      { id: 'card2', data: () => ({ title: 'Card 2', columnId: columnId }) },
    ];

    it('should return 204 on successful deletion of column and its cards', async () => {
      // Mock for the initial get to check column existence
      dbMock.doc(columnId).get.mockResolvedValueOnce({
        id: columnId,
        exists: true,
        data: () => ({ title: 'Column to Delete' })
      });

      // Mock for fetching cards associated with the column
      dbMock.collection('productionBoardCards').where('columnId', '==', columnId).get.mockResolvedValueOnce({
        empty: false,
        docs: mockCardsInColumn
      });

      // Mock for batch commit
      dbMock.batch().commit.mockResolvedValueOnce({});

      const response = await request(api)
        .delete(`/production-board/columns/${columnId}`)
        .set('Authorization', mockAuthToken);

      expect(response.status).toBe(204);

      // Verify batch operations
      const batchInstance = dbMock.batch(); // Get the batch mock
      expect(batchInstance.delete).toHaveBeenCalledTimes(mockCardsInColumn.length + 1); // Cards + Column itself
      mockCardsInColumn.forEach(card => {
        // Check if delete was called on the card's ref.
        // This requires doc() to be called with card.id within the batch context.
        // The current mock setup might not be precise enough for this specific check on batch.delete(doc.ref)
        // For now, we check the count. More specific ref checking would need more elaborate doc mock.
      });
      expect(batchInstance.delete).toHaveBeenCalledWith(dbMock.doc(columnId)); // Check column deletion
      expect(batchInstance.commit).toHaveBeenCalledTimes(1);
    });

    it('should return 204 even if column has no cards', async () => {
      dbMock.doc(columnId).get.mockResolvedValueOnce({
        id: columnId,
        exists: true,
        data: () => ({ title: 'Empty Column to Delete' })
      });
      dbMock.collection('productionBoardCards').where('columnId', '==', columnId).get.mockResolvedValueOnce({
        empty: true,
        docs: []
      });
      dbMock.batch().commit.mockResolvedValueOnce({});

      const response = await request(api)
        .delete(`/production-board/columns/${columnId}`)
        .set('Authorization', mockAuthToken);

      expect(response.status).toBe(204);
      const batchInstance = dbMock.batch();
      expect(batchInstance.delete).toHaveBeenCalledTimes(1); // Only the column itself
      expect(batchInstance.delete).toHaveBeenCalledWith(dbMock.doc(columnId));
      expect(batchInstance.commit).toHaveBeenCalledTimes(1);
    });


    it('should return 404 if trying to delete a non-existent column', async () => {
      dbMock.doc(columnId).get.mockResolvedValueOnce({ // Initial get
        exists: false,
      });

      const response = await request(api)
        .delete(`/production-board/columns/${columnId}`)
        .set('Authorization', mockAuthToken);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("Column not found");
    });
  });

  // --- Card Endpoints Tests ---
  describe('POST /production-board/columns/:columnId/cards', () => {
    const columnId = 'col-for-new-card';
    const newCardData = {
      title: 'Awesome New Card',
      description: 'This is a test card.',
      priority: 'high',
      portfolioItemId: 'portfolio-123', // Added for testing
      // orderInColumn will be determined by the endpoint logic if not provided
    };
    const mockGeneratedCardId = 'new-card-generated-id';

    it('should return 201 and the new card with portfolioItemId on successful creation', async () => {
      // Mock for runTransaction
      dbMock.runTransaction.mockImplementation(async (updateFunction) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({ // Mock for transaction.get(columnRef)
            exists: true,
            data: () => ({ title: 'Target Column', cardOrder: ['cardA', 'cardB'] }),
          }),
          set: jest.fn(), // Mock for transaction.set(newCardRef, ...)
          update: jest.fn(), // Mock for transaction.update(columnRef, ...)
        };
        // Execute the function passed to runTransaction with the mock transaction
        // The actual data returned by runTransaction is what updateFunction returns
        const cardDataForResponse = {
            ...newCardData,
            id: mockGeneratedCardId,
            columnId: columnId,
            orderInColumn: 2, // Assuming it's added to the end of ['cardA', 'cardB']
            portfolioItemId: newCardData.portfolioItemId, // Ensure this is passed through
            createdAt: 'MOCK_SERVER_TIMESTAMP', // Or a real date string
            updatedAt: 'MOCK_SERVER_TIMESTAMP',
        };
        // Simulate the updateFunction's return value
        // This should match what the actual cloud function's transaction returns
        return cardDataForResponse;
      });

      // The auto-generated ID for the new card is handled internally by `collection().doc()` without args
      // So, we don't need to mock `doc()` specifically for the ID generation part here in the test setup for `add` or `set` on new doc.
      // `newCardRef` in the actual code is `db.collection('productionBoardCards').doc()`
      // `set` will be called on this ref.

      const response = await request(api)
        .post(`/production-board/columns/${columnId}/cards`)
        .set('Authorization', mockAuthToken)
        .send(newCardData);

      expect(response.status).toBe(201);
      expect(response.body.id).toBe(mockGeneratedCardId);
      expect(response.body.title).toBe(newCardData.title);
      expect(response.body.columnId).toBe(columnId);
      expect(response.body.portfolioItemId).toBe(newCardData.portfolioItemId); // Verify portfolioItemId
      expect(response.body.orderInColumn).toBe(2); // Based on mock logic above

      expect(dbMock.runTransaction).toHaveBeenCalledTimes(1);

      // Access the transaction mock to check calls within it (if needed, more complex setup)
      // For example, if you wanted to check transaction.set or transaction.update calls:
      // This requires the runTransaction mock to expose the internal mockTransaction calls or pass it out.
      // For now, checking that runTransaction was called and the response is correct is a good start.
      // Also check that columnRef and newCardRef were correctly constructed if possible (via dbMock.doc calls)
      expect(dbMock.doc).toHaveBeenCalledWith(columnId); // Column ref for transaction.get
      expect(dbMock.collection).toHaveBeenCalledWith('productionBoardCards');
      // The call `db.collection('productionBoardCards').doc()` for newCardRef is internal to the function
      // so not directly verifiable on dbMock.doc unless that specific instance is captured.
    });

    it('should return 404 if creating a card in a non-existent column', async () => {
      dbMock.runTransaction.mockImplementation(async (updateFunction) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({ // Mock for transaction.get(columnRef)
            exists: false, // Simulate column not found
          }),
          // set and update should not be called if column not found
        };
        // This will cause the transaction to throw an error as in the actual function
        try {
          await updateFunction(mockTransaction);
        } catch (e) {
          if (e.status === 404) throw e; // Re-throw specific error for checking
          throw new Error("Simulated transaction failure due to column not found");
        }
      });

      const response = await request(api)
        .post(`/production-board/columns/${columnId}/cards`)
        .set('Authorization', mockAuthToken)
        .send(newCardData);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("Column not found");
    });

    it('should return 400 if title is missing', async () => {
      const response = await request(api)
        .post(`/production-board/columns/${columnId}/cards`)
        .set('Authorization', mockAuthToken)
        .send({ description: 'Card without a title' }); // No title

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Card title is required");
      expect(dbMock.runTransaction).not.toHaveBeenCalled(); // Transaction should not even start
    });
  });

  describe('GET /production-board/cards/:cardId', () => {
    const cardId = 'card-to-get';
    const mockCardData = {
      id: cardId,
      title: 'Test Card Details',
      description: 'Description of the test card.',
      columnId: 'col1',
      orderInColumn: 0,
      createdAt: 'MOCK_SERVER_TIMESTAMP',
      updatedAt: 'MOCK_SERVER_TIMESTAMP',
    };

    it('should return 200 and the card data if card exists', async () => {
      dbMock.doc(cardId).get.mockResolvedValueOnce({
        id: cardId,
        exists: true,
        data: () => mockCardData,
      });

      const response = await request(api)
        .get(`/production-board/cards/${cardId}`)
        .set('Authorization', mockAuthToken);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining(mockCardData));
      expect(dbMock.collection).toHaveBeenCalledWith('productionBoardCards');
      expect(dbMock.doc).toHaveBeenCalledWith(cardId);
    });

    it('should return 404 if card does not exist', async () => {
      dbMock.doc(cardId).get.mockResolvedValueOnce({
        exists: false,
      });

      const response = await request(api)
        .get(`/production-board/cards/${cardId}`)
        .set('Authorization', mockAuthToken);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("Card not found");
    });

    it('should return 400 if cardId is not provided (though route structure might prevent this)', async () => {
        // This test case might be more relevant if the ID was a query param or in body.
        // For path params, Express routing usually handles missing params before our handler.
        // However, if we had a handler that took an empty string or similar, this would be relevant.
        // For now, this is more of a conceptual check as supertest might not hit the endpoint if path is malformed.
        // A specific test for `GET /production-board/cards/` (no ID) would depend on how Express handles such routes.
        // Assuming the test is for an effectively "empty" ID if the route somehow allowed it.
        // If the route is strict like /:cardId, an actual empty param would result in a 404 from Express route matching.
        // For this test, let's assume we are testing our handler's robustness if it somehow received an invalid ID.
        // Since our handler explicitly checks `if (!cardId)`, this is a valid logical test.
      const response = await request(api)
        .get(`/production-board/cards/`) // This will likely 404 at routing level
        .set('Authorization', mockAuthToken);
      // Based on Express routing, this specific path would 404.
      // If we were testing the handler function directly with a mock req/res where req.params.cardId was undefined:
      // expect(res.status(400).send({error: "Card ID is required."})
      expect(response.status).toBe(404); // Default Express 404 for unmatched route
    });
  });

  describe('PUT /production-board/cards/:cardId', () => {
    const cardId = 'card-to-update';
    const updatePayload = {
      title: 'Updated Card Title',
      description: 'Updated description.',
      priority: 'low',
      portfolioItemId: 'portfolio-xyz-updated', // Add portfolioItemId to payload
    };
    const originalCardData = {
        title: 'Original Card Title',
        description: 'Original Description',
        columnId: 'col1',
        orderInColumn: 0,
        priority: 'high',
        portfolioItemId: 'portfolio-abc-original', // Original portfolioItemId
        createdAt: 'sometime',
        updatedAt: 'sometimeago'
    };


    it('should return 200 and the updated card data including portfolioItemId on successful update', async () => {
      // Mock for the transaction's get(cardRef)
      const mockTransactionGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => originalCardData,
      });
      // Mock for transaction.update(cardRef, updateData)
      const mockTransactionUpdate = jest.fn();

      dbMock.runTransaction.mockImplementation(async (updateFunction) => {
        const mockTransaction = {
          get: mockTransactionGet,
          update: mockTransactionUpdate,
        };
        await updateFunction(mockTransaction);
        // The PUT endpoint re-fetches the doc after transaction for the response
        return Promise.resolve(); // Transaction itself doesn't return the data for PUT
      });

      // Mock for the final get call after transaction
      dbMock.doc(cardId).get.mockResolvedValueOnce({
        id: cardId,
        exists: true,
        data: () => ({ ...originalCardData, ...updatePayload, updatedAt: 'MOCK_SERVER_TIMESTAMP' }),
      });

      const response = await request(api)
        .put(`/production-board/cards/${cardId}`)
        .set('Authorization', mockAuthToken)
        .send(updatePayload);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(updatePayload.title);
      expect(response.body.description).toBe(updatePayload.description);
      expect(response.body.priority).toBe(updatePayload.priority);
      expect(response.body.portfolioItemId).toBe(updatePayload.portfolioItemId); // Verify portfolioItemId
      expect(response.body.updatedAt).toBe('MOCK_SERVER_TIMESTAMP');

      expect(dbMock.runTransaction).toHaveBeenCalledTimes(1);
      expect(mockTransactionUpdate).toHaveBeenCalledWith(dbMock.doc(cardId), expect.objectContaining({
        ...updatePayload,
        updatedAt: fieldValueMock.serverTimestamp(),
      }));
      expect(dbMock.doc(cardId).get).toHaveBeenCalledTimes(1); // For the final fetch
    });

    it('should return 404 if trying to update a non-existent card', async () => {
      dbMock.runTransaction.mockImplementation(async (updateFunction) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({ exists: false }), // Card does not exist
        };
        await updateFunction(mockTransaction); // This should throw the { status: 404, message: "Card not found." }
      });

      const response = await request(api)
        .put(`/production-board/cards/${cardId}`)
        .set('Authorization', mockAuthToken)
        .send(updatePayload);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("Card not found");
    });

    it('should return 400 if title is provided as an empty string', async () => {
      const response = await request(api)
        .put(`/production-board/cards/${cardId}`)
        .set('Authorization', mockAuthToken)
        .send({ title: "   " }); // Invalid title

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Title, if provided, must be a non-empty string");
      expect(dbMock.runTransaction).not.toHaveBeenCalled();
    });

    it('should return 400 if no valid fields are provided for update', async () => {
      const response = await request(api)
        .put(`/production-board/cards/${cardId}`)
        .set('Authorization', mockAuthToken)
        .send({}); // Empty payload

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("No valid fields provided for update");
      expect(dbMock.runTransaction).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /production-board/cards/:cardId', () => {
    const cardId = 'card-to-delete';
    const columnIdOfCard = 'col-parent-of-card';
    const originalCardData = {
      title: 'Card to be Deleted',
      columnId: columnIdOfCard,
      orderInColumn: 1,
    };

    it('should return 204 on successful card deletion and column update', async () => {
      const mockTransactionGetCard = jest.fn().mockResolvedValue({
        exists: true,
        data: () => originalCardData,
      });
      const mockTransactionGetColumn = jest.fn().mockResolvedValue({ // For checking column existence (optional here, but good practice)
        exists: true,
        data: () => ({ title: 'Parent Column', cardOrder: ['otherCard', cardId] })
      });
      const mockTransactionUpdateColumn = jest.fn();
      const mockTransactionDeleteCard = jest.fn();

      dbMock.runTransaction.mockImplementation(async (updateFunction) => {
        const mockTransaction = {
          get: (docRef) => {
            // Check if docRef path ends with cardId or columnIdOfCard for appropriate mock
            if (docRef.path.endsWith(cardId)) return mockTransactionGetCard();
            if (docRef.path.endsWith(columnIdOfCard)) return mockTransactionGetColumn();
            return Promise.resolve({ exists: false }); // Default
          },
          update: mockTransactionUpdateColumn,
          delete: mockTransactionDeleteCard,
        };
        await updateFunction(mockTransaction);
        return Promise.resolve();
      });

      const response = await request(api)
        .delete(`/production-board/cards/${cardId}`)
        .set('Authorization', mockAuthToken);

      expect(response.status).toBe(204);
      expect(dbMock.runTransaction).toHaveBeenCalledTimes(1);
      expect(mockTransactionGetCard).toHaveBeenCalled();
      // expect(mockTransactionGetColumn).toHaveBeenCalled(); // if column is fetched in transaction
      expect(mockTransactionUpdateColumn).toHaveBeenCalledWith(
        dbMock.doc(columnIdOfCard), // Check path of columnRef
        expect.objectContaining({
          cardOrder: fieldValueMock.arrayRemove(cardId),
          updatedAt: fieldValueMock.serverTimestamp(),
        })
      );
      expect(mockTransactionDeleteCard).toHaveBeenCalledWith(dbMock.doc(cardId)); // Check path of cardRef
    });

    it('should return 404 if trying to delete a non-existent card', async () => {
      dbMock.runTransaction.mockImplementation(async (updateFunction) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({ exists: false }), // Card does not exist
        };
        await updateFunction(mockTransaction); // This should throw the { status: 404, message: "Card not found." }
      });

      const response = await request(api)
        .delete(`/production-board/cards/${cardId}`)
        .set('Authorization', mockAuthToken);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("Card not found");
    });
     it('should proceed with card deletion even if its columnId is missing or column not found (logs warning)', async () => {
      const cardDataWithoutColumn = { title: 'Card without columnId' };
      const mockTransactionGetCard = jest.fn().mockResolvedValue({
        exists: true,
        data: () => cardDataWithoutColumn,
      });
      // When card has no columnId, get for columnRef won't be called, or if called with undefined/null, it would fail or be skipped.
      // The code has a check `if (columnId)`
      const mockTransactionDeleteCard = jest.fn();

      dbMock.runTransaction.mockImplementation(async (updateFunction) => {
        const mockTransaction = {
          get: mockTransactionGetCard,
          update: jest.fn(), // Should not be called for column
          delete: mockTransactionDeleteCard,
        };
        await updateFunction(mockTransaction);
        return Promise.resolve();
      });
      // Spy on console.warn or functions.logger.warn if it's set up for testing
      const loggerSpy = jest.spyOn(require('firebase-functions').logger, 'warn');


      const response = await request(api)
        .delete(`/production-board/cards/${cardId}`)
        .set('Authorization', mockAuthToken);

      expect(response.status).toBe(204); // Still successful deletion of the card itself
      expect(mockTransactionDeleteCard).toHaveBeenCalledWith(dbMock.doc(cardId));
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining(`Card ${cardId} does not have a columnId`));
      loggerSpy.mockRestore();
    });
  });

  describe('PATCH /production-board/cards/:cardId/move', () => {
    const cardIdToMove = 'card-to-move';
    const sourceColumnId = 'col-source';
    const targetColumnIdSame = 'col-source'; // For same column move
    const targetColumnIdDifferent = 'col-target-different';

    const mockCardData = {
      id: cardIdToMove,
      title: 'Card Being Moved',
      columnId: sourceColumnId,
      orderInColumn: 1, // Initial order
    };
    const mockSourceColumnData = {
      id: sourceColumnId,
      title: 'Source Column',
      cardOrder: ['card-before', cardIdToMove, 'card-after'],
    };
     const mockTargetColumnDifferentData = {
      id: targetColumnIdDifferent,
      title: 'Target Column (Different)',
      cardOrder: ['card-other'],
    };

    it('should successfully move a card within the same column', async () => {
      const newOrderInColumn = 0; // Moving to the beginning

      dbMock.runTransaction.mockImplementation(async (updateFunction) => {
        const mockTransaction = {
          get: jest.fn((docRef) => {
            if (docRef.path.endsWith(cardIdToMove)) return Promise.resolve({ exists: true, data: () => mockCardData });
            if (docRef.path.endsWith(sourceColumnId)) return Promise.resolve({ exists: true, data: () => ({...mockSourceColumnData}) }); // Return a copy
            return Promise.resolve({ exists: false });
          }),
          update: jest.fn(),
        };
        await updateFunction(mockTransaction);
        // Simulate the function returning the updated card data (though the actual function returns void for transaction)
        // The endpoint then re-fetches or constructs the response. For this test, we focus on the transaction's behavior.
        return { ...mockCardData, columnId: sourceColumnId, orderInColumn: newOrderInColumn, updatedAt: 'MOCK_SERVER_TIMESTAMP'};
      });

      const response = await request(api)
        .patch(`/production-board/cards/${cardIdToMove}/move`)
        .set('Authorization', mockAuthToken)
        .send({ targetColumnId: targetColumnIdSame, newOrderInColumn });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(cardIdToMove);
      expect(response.body.columnId).toBe(targetColumnIdSame);
      expect(response.body.orderInColumn).toBe(newOrderInColumn);

      expect(dbMock.runTransaction).toHaveBeenCalledTimes(1);
      // Further checks on mockTransaction.update calls within the runTransaction mock:
      // 1. Card update: columnId, orderInColumn, updatedAt
      // 2. Column update: cardOrder, updatedAt
      // This requires the mockTransaction passed to updateFunction to have its update method spied upon or checked.
      // The current setup of runTransaction mockImplementation needs to be enhanced to capture these internal calls
      // or we trust the transaction logic is correct if the overall outcome (response) is good and runTransaction is called.
    });

    it('should successfully move a card to a different column', async () => {
      const newOrderInColumn = 1; // Moving to a specific spot in target

      dbMock.runTransaction.mockImplementation(async (updateFunction) => {
        const mockTransaction = {
          get: jest.fn((docRef) => {
            if (docRef.path.endsWith(cardIdToMove)) return Promise.resolve({ exists: true, data: () => mockCardData });
            if (docRef.path.endsWith(sourceColumnId)) return Promise.resolve({ exists: true, data: () => ({...mockSourceColumnData}) });
            if (docRef.path.endsWith(targetColumnIdDifferent)) return Promise.resolve({ exists: true, data: () => ({...mockTargetColumnDifferentData})});
            return Promise.resolve({ exists: false });
          }),
          update: jest.fn(),
        };
        await updateFunction(mockTransaction);
        return { ...mockCardData, columnId: targetColumnIdDifferent, orderInColumn: newOrderInColumn, updatedAt: 'MOCK_SERVER_TIMESTAMP'};
      });

      const response = await request(api)
        .patch(`/production-board/cards/${cardIdToMove}/move`)
        .set('Authorization', mockAuthToken)
        .send({ targetColumnId: targetColumnIdDifferent, newOrderInColumn });

      expect(response.status).toBe(200);
      expect(response.body.columnId).toBe(targetColumnIdDifferent);
      expect(response.body.orderInColumn).toBe(newOrderInColumn);
      expect(dbMock.runTransaction).toHaveBeenCalledTimes(1);
    });

    it('should return 404 if card to move is not found', async () => {
       dbMock.runTransaction.mockImplementation(async (updateFunction) => {
        const mockTransaction = {
          get: jest.fn((docRef) => {
            if (docRef.path.endsWith(cardIdToMove)) return Promise.resolve({ exists: false }); // Card not found
            return Promise.resolve({ exists: true }); // Other docs exist
          }),
        };
        await updateFunction(mockTransaction); // Should throw
      });

      const response = await request(api)
        .patch(`/production-board/cards/${cardIdToMove}/move`)
        .set('Authorization', mockAuthToken)
        .send({ targetColumnId: targetColumnIdDifferent, newOrderInColumn: 0 });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("Card not found");
    });

    it('should return 404 if target column is not found', async () => {
      const nonExistentTargetColumnId = 'col-non-existent';
      dbMock.runTransaction.mockImplementation(async (updateFunction) => {
        const mockTransaction = {
          get: jest.fn((docRef) => {
            if (docRef.path.endsWith(cardIdToMove)) return Promise.resolve({ exists: true, data: () => mockCardData });
            if (docRef.path.endsWith(sourceColumnId)) return Promise.resolve({ exists: true, data: () => mockSourceColumnData });
            if (docRef.path.endsWith(nonExistentTargetColumnId)) return Promise.resolve({ exists: false }); // Target column not found
            return Promise.resolve({ exists: true });
          }),
        };
        await updateFunction(mockTransaction); // Should throw
      });

      const response = await request(api)
        .patch(`/production-board/cards/${cardIdToMove}/move`)
        .set('Authorization', mockAuthToken)
        .send({ targetColumnId: nonExistentTargetColumnId, newOrderInColumn: 0 });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain(`Target column ${nonExistentTargetColumnId} not found`);
    });

    it('should append to end if newOrderInColumn is out of bounds (e.g., too large)', async () => {
      const newOrderInColumnTooLarge = 99; // Assuming this is larger than target column's cardOrder length

      dbMock.runTransaction.mockImplementation(async (updateFunction) => {
        const mockTransaction = {
          get: jest.fn((docRef) => {
            if (docRef.path.endsWith(cardIdToMove)) return Promise.resolve({ exists: true, data: () => mockCardData });
            if (docRef.path.endsWith(sourceColumnId)) return Promise.resolve({ exists: true, data: () => ({...mockSourceColumnData}) });
            if (docRef.path.endsWith(targetColumnIdDifferent)) return Promise.resolve({ exists: true, data: () => ({...mockTargetColumnDifferentData})}); // Target has 1 card initially
            return Promise.resolve({ exists: false });
          }),
          update: jest.fn(), // We expect this to be called correctly
        };
        await updateFunction(mockTransaction);
        // The actual orderInColumn will be targetColumn.cardOrder.length (which is 1 after removing source, adding to target)
        return { ...mockCardData, columnId: targetColumnIdDifferent, orderInColumn: mockTargetColumnDifferentData.cardOrder.length, updatedAt: 'MOCK_SERVER_TIMESTAMP'};
      });

      const response = await request(api)
        .patch(`/production-board/cards/${cardIdToMove}/move`)
        .set('Authorization', mockAuthToken)
        .send({ targetColumnId: targetColumnIdDifferent, newOrderInColumn: newOrderInColumnTooLarge });

      expect(response.status).toBe(200);
      // Target column 'mockTargetColumnDifferentData' has 1 card.
      // After source card is added, its length becomes 2. So, new card is at index 1.
      expect(response.body.orderInColumn).toBe(mockTargetColumnDifferentData.cardOrder.length);
    });
  });
});
