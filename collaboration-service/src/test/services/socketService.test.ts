import ClientIO, { type Socket as SocketIOClientSocket } from 'socket.io-client'; // Aliased Socket type, imported as type
// import type { DisconnectReason } from 'socket.io-client'; // DisconnectReason not found, using string
import { Server as SocketIOServer, Socket as ServerSocket } from 'socket.io';
import { server as httpServer, io as serverIOInstance, startServer, app } from '../../index'; // Import your HTTP server and Socket.IO instance
import http from 'http';

interface DocumentUpdatedData {
  documentId: string;
  content: string;
  updatedBy?: string; // Assuming updatedBy might be sent
}

describe('Socket.IO Service Tests', () => {
  let clientSocket: SocketIOClientSocket; // Use aliased type
  let anotherClientSocket: SocketIOClientSocket; // Use aliased type
  const port = process.env.PORT || 3001; // Ensure it matches the server port
  const socketURL = `http://localhost:${port}`;

  // Global Mongoose connection is handled by globalSetup.ts
  // Models are initialized in beforeAll of this suite
  // HTTP Server for Socket.IO is managed here.

  beforeAll(async () => {
    // Initialize models (if any service being tested interacts with them directly)
    // For socketService directly, it might not be needed unless handlers use models.
    // const globalMongooseInstance = (global as any).__MONGOOSE_INSTANCE__;
    // if (!globalMongooseInstance) throw new Error('Global Mongoose instance not found.');
    // initModels(globalMongooseInstance);

    // Ensure the server is started if not already (e.g. if running this test file alone)
    // The startServer function in index.ts should be idempotent or managed.
    // Our current setup has startServer creating the http server and io instance.
    // If startServer was already called by another test suite's beforeAll in the same jest run,
    // this might try to re-listen. However, Jest typically runs test files in separate processes
    // unless --runInBand is used. With globalSetup/Teardown managing the core DB,
    // and per-suite server management, this should be fine.
    if (!httpServer.listening) { // `server` is `httpServer` exported from index.ts
        console.log('SocketServiceTests: Server not listening, calling startServer()');
        await startServer(); // This will make `httpServer` listen.
    } else {
        console.log('SocketServiceTests: Server already listening.');
    }
  });

  afterAll(() => {
    // Close the main server's Socket.IO instance and HTTP server
    // This is tricky because globalTeardown also tries to close them.
    // For per-suite server management, this should be fine if tests run serially.
    // If globalTeardown also runs, it should handle already closed server gracefully.
    if (serverIOInstance) {
      serverIOInstance.close();
      // console.log('Main Socket.IO server instance closed by SocketServiceTests.');
    }
    if (httpServer && httpServer.listening) {
      httpServer.close();
      // console.log('Main HTTP server closed by SocketServiceTests.');
    }
  });

  beforeEach((done) => {
    // Ensure client sockets are disconnected before each test
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    if (anotherClientSocket && anotherClientSocket.connected) {
        anotherClientSocket.disconnect();
    }
    // Connect a new client before each test
    clientSocket = ClientIO(socketURL, { reconnectionAttempts: 3, timeout: 5000 }); // Use ClientIO for value
    clientSocket.on('connect', () => done());
    clientSocket.on('connect_error', (err: Error) => {
        console.error('Client connection error in beforeEach:', err.message);
        done(err); // Fail the test if connection error occurs
    });
  });

  afterEach(() => {
    // Disconnect clients after each test
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
     if (anotherClientSocket && anotherClientSocket.connected) {
        anotherClientSocket.disconnect();
    }
  });

  it('should allow a client to connect successfully', (done) => {
    expect(clientSocket.connected).toBe(true);
    done();
  });

  it('should handle client disconnection', (done) => {
    clientSocket.on('disconnect', (reason: string) => { // Using string for reason
      // console.log('Client disconnected:', reason);
      expect(reason).toBeDefined(); // Or specific reasons if applicable
      done();
    });
    clientSocket.disconnect();
  });

  it('should allow a client to join a project room', (done) => {
    const projectId = 'testProjectRoom123';
    clientSocket.emit('joinProject', projectId);

    // Listen for an acknowledgment or a specific event that confirms room join
    // For this example, we'll use a custom event 'joinedProject' from socketService.ts
    let timeoutId: NodeJS.Timeout | null = null;

    clientSocket.on('joinedProject', (joinedRoomId: string) => {
      if (timeoutId) clearTimeout(timeoutId);
      expect(joinedRoomId).toBe(projectId);
      done();
    });

    // Timeout if no response
    timeoutId = setTimeout(() => {
      done(new Error('Timeout waiting for joinedProject event'));
    }, 3000);
  });

  it('should broadcast documentUpdated event to clients in a project room', (done) => {
    const projectId = 'projectDocUpdateRoom';
    const documentId = 'doc123';
    const eventData = { documentId, projectId, newContent: 'Test content update' };

    // Setup another client to join the same room
    anotherClientSocket = ClientIO(socketURL); // Use ClientIO for value
    anotherClientSocket.on('connect', () => {
      anotherClientSocket.emit('joinProject', projectId);

      // Wait for the second client to confirm join (if server sends confirmation)
      // or just assume join is quick for this test.

      // Client 1 (clientSocket) joins the project room first
      clientSocket.emit('joinProject', projectId);
      clientSocket.on('joinedProject', (joinedRoomId1: string) => {
        if (joinedRoomId1 !== projectId) return done(new Error('Client 1 failed to join correct room'));

        // Client 1 is now in the room and sets up its listener
        clientSocket.on('documentUpdated', (data: DocumentUpdatedData) => {
          expect(data.documentId).toBe(documentId);
          expect(data.content).toBe(eventData.newContent);
          // Ensure it's not the emitter itself (anotherClientSocket)
          // The server-side logic `socket.to().emit()` excludes the sender.
          // `data.updatedBy` should be anotherClientSocket.id if the server sends it.
          // For this test, we are primarily concerned that clientSocket received it.
          if (data.updatedBy === clientSocket.id) {
            return done(new Error('Broadcast received by the emitter, but should be excluded by socket.to() if sender was anotherClientSocket'));
          }
          done();
        });

        // Now that Client 1 has joined and is listening, Client 2 (anotherClientSocket) emits the change
        anotherClientSocket.emit('documentChange', eventData);
      });
    });
    anotherClientSocket.on('connect_error', (err: Error) => done(err)); // Handle connection error for client 2

    // Add a timeout for the test itself to prevent hanging indefinitely
    // This is redundant if Jest's global testTimeout is sufficient, but can be useful for specific async tests.
    // jest.setTimeout(10000); // e.g., 10 seconds, if needed. Default is 30s now.
  });

  // TODO: Add more tests:
  // - Test leaving a room
  // - Test broadcasting new chat messages
  // - Test that users not in a room do not receive messages for that room
});
