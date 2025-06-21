import { Server as SocketIOServer, Socket } from 'socket.io';
import admin from '../firebaseAdmin'; // Import Firebase Admin auth
import { DecodedIdToken } from 'firebase-admin/auth'; // For DecodedIdToken type
import logger from '../logger'; // Import logger

// Extend Socket data with an optional user property
interface AuthenticatedSocket extends Socket {
  data: {
    user?: DecodedIdToken;
  }
}

export function initializeSocket(io: SocketIOServer) {
  io.on('connection', async (socket: AuthenticatedSocket) => { // Use AuthenticatedSocket
    logger.info(`Client attempting to connect: ${socket.id}`, { socketId: socket.id, ip: socket.handshake.address });

    const token = socket.handshake.query.token as string;

    if (!token) {
      logger.warn(`Socket ${socket.id} disconnected: No token provided in handshake query.`, { socketId: socket.id });
      socket.disconnect(true);
      return;
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      socket.data.user = decodedToken;
      logger.info(`Socket ${socket.id} authenticated for user ${decodedToken.uid}. Client connected.`, { socketId: socket.id, userId: decodedToken.uid });

      // Example: Join a room (e.g., a project room)
      // Ensure this and other handlers are only set up *after* successful authentication
      socket.on('joinProject', (projectId: string) => {
        socket.join(projectId);
        logger.info(`Socket ${socket.id} (User ${socket.data.user?.uid}) joined project room: ${projectId}`, { socketId: socket.id, userId: socket.data.user?.uid, projectId });
        socket.emit('joinedProject', projectId);
      });

      socket.on('leaveProject', (projectId: string) => {
        socket.leave(projectId);
        logger.info(`Socket ${socket.id} (User ${socket.data.user?.uid}) left project room: ${projectId}`, { socketId: socket.id, userId: socket.data.user?.uid, projectId });
        socket.emit('leftProject', projectId);
      });

      socket.on('documentChange', (data: { documentId: string; projectId: string, newContent: any }) => {
        logger.info(`Document ${data.documentId} changed by ${socket.id} (User ${socket.data.user?.uid})`, { documentId: data.documentId, socketId: socket.id, userId: socket.data.user?.uid, projectId: data.projectId });
        if (data.projectId) {
           socket.to(data.projectId).emit('documentUpdated', { documentId: data.documentId, content: data.newContent, updatedBy: socket.data.user?.uid || socket.id });
        } else {
          logger.warn(`Document change event for ${data.documentId} received without projectId.`, { documentId: data.documentId, socketId: socket.id, userId: socket.data.user?.uid });
        }
      });

      socket.on('sendChatMessage', (data: { projectId: string; message: string; senderId?: string }) => {
        logger.info(`Chat message for project ${data.projectId} from ${socket.id} (User ${socket.data.user?.uid}): ${data.message}`, { projectId: data.projectId, socketId: socket.id, userId: socket.data.user?.uid });
        const chatData = {
          message: data.message,
          senderId: socket.data.user?.uid || data.senderId || socket.id, // Prefer Firebase UID
          projectId: data.projectId,
          timestamp: new Date()
        };
        io.to(data.projectId).emit('newChatMessage', chatData);
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id} (User ${socket.data.user?.uid})`, { socketId: socket.id, userId: socket.data.user?.uid });
      });

    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Socket ${socket.id} authentication failed: ${error.message}`, { error, socketId: socket.id });
      } else {
        logger.error(`Socket ${socket.id} authentication failed: Unknown error`, { error, socketId: socket.id });
      }
      socket.disconnect(true);
      return;
    }

    // Error handling for sockets (basic) - this is now inside the try block or should be for authenticated sockets
    socket.on('error', (error) => {
      logger.error(`Socket Error from ${socket.id} (User ${socket.data.user?.uid}):`, { error, socketId: socket.id, userId: socket.data.user?.uid });
    });
  });
  logger.info('Socket.IO service initialized');
}

// Store the io instance globally within this module after initialization
let moduleIO: SocketIOServer | null = null;

export function initializeSocketService(ioInstance: SocketIOServer) {
  if (moduleIO) {
    logger.warn('Socket.IO service already initialized. Re-initializing (this might be an error in setup).');
  }
  moduleIO = ioInstance;
  initializeSocket(moduleIO); // Call the original connection handler setup
  logger.info('Socket.IO instance stored in socketService module.');
}

export function getIO(): SocketIOServer {
  if (!moduleIO) {
    // This state should ideally not be reached if initializeSocketService is called at startup.
    logger.error('Socket.IO getIO() called before initialization!');
    throw new Error('Socket.IO has not been initialized. Call initializeSocketService first.');
  }
  return moduleIO;
}

/**
 * Broadcasts a PRODUCTION_BOARD_CHANGED event to all clients in a specific project room.
 * @param projectId The ID of the project whose production board was changed.
 * @param updatedBySocketId Optional socket ID of the user who triggered the change, to avoid self-notification if needed.
 */
export function broadcastProductionBoardChange(projectId: string, updatedBySocketId?: string) {
  const io = getIO();
  if (io && projectId) {
    // The event payload can be simple if clients are expected to re-fetch.
    // Or it could contain specific details of the change.
    // For now, a simple notification.
    const eventData = {
      projectId,
      message: `Production board for project ${projectId} has been updated.`,
      timestamp: new Date().toISOString(),
      // If you want to avoid sending to the originator, but this is often handled client-side
      // updatedBy: updatedBySocketId
    };
    io.to(projectId).emit('PRODUCTION_BOARD_CHANGED', eventData);
    logger.info(`Broadcasted PRODUCTION_BOARD_CHANGED for project ${projectId}`, { projectId, eventData });
  } else {
    logger.warn('broadcastProductionBoardChange: Socket.IO not available or projectId missing.', { projectId });
  }
}
