import { Server as SocketIOServer, Socket } from 'socket.io';
import { auth } from '../firebaseAdmin'; // Import Firebase Admin auth
import * as admin from 'firebase-admin'; // For DecodedIdToken type

// Extend Socket data with an optional user property
interface AuthenticatedSocket extends Socket {
  data: {
    user?: admin.auth.DecodedIdToken;
  }
}

export function initializeSocket(io: SocketIOServer) {
  io.on('connection', async (socket: AuthenticatedSocket) => { // Use AuthenticatedSocket
    console.log(`Client attempting to connect: ${socket.id}`);

    const token = socket.handshake.query.token as string;

    if (!token) {
      console.log(`Socket ${socket.id} disconnected: No token provided in handshake query.`);
      socket.disconnect(true);
      return;
    }

    try {
      const decodedToken = await auth.verifyIdToken(token);
      socket.data.user = decodedToken;
      console.log(`Socket ${socket.id} authenticated for user ${decodedToken.uid}. Client connected.`);

      // Example: Join a room (e.g., a project room)
      // Ensure this and other handlers are only set up *after* successful authentication
      socket.on('joinProject', (projectId: string) => {
        socket.join(projectId);
        console.log(`Socket ${socket.id} (User ${socket.data.user?.uid}) joined project room: ${projectId}`);
        socket.emit('joinedProject', projectId);
      });

      socket.on('leaveProject', (projectId: string) => {
        socket.leave(projectId);
        console.log(`Socket ${socket.id} (User ${socket.data.user?.uid}) left project room: ${projectId}`);
        socket.emit('leftProject', projectId);
      });

      socket.on('documentChange', (data: { documentId: string; projectId: string, newContent: any }) => {
        console.log(`Document ${data.documentId} changed by ${socket.id} (User ${socket.data.user?.uid}):`, data.newContent);
        if (data.projectId) {
           socket.to(data.projectId).emit('documentUpdated', { documentId: data.documentId, content: data.newContent, updatedBy: socket.data.user?.uid || socket.id });
        } else {
          console.warn(`Document change event for ${data.documentId} received without projectId.`);
        }
      });

      socket.on('sendChatMessage', (data: { projectId: string; message: string; senderId?: string }) => {
        console.log(`Chat message for project ${data.projectId} from ${socket.id} (User ${socket.data.user?.uid}): ${data.message}`);
        const chatData = {
          message: data.message,
          senderId: socket.data.user?.uid || data.senderId || socket.id, // Prefer Firebase UID
          projectId: data.projectId,
          timestamp: new Date()
        };
        io.to(data.projectId).emit('newChatMessage', chatData);
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id} (User ${socket.data.user?.uid})`);
      });

    } catch (error) {
      console.error(`Socket ${socket.id} authentication failed:`, error.message);
      socket.disconnect(true);
      return;
    }

    // Error handling for sockets (basic) - this is now inside the try block or should be for authenticated sockets
    socket.on('error', (error) => {
      console.error(`Socket Error from ${socket.id} (User ${socket.data.user?.uid}):`, error);
    });
  });
  console.log('Socket.IO service initialized');
}

// You might also want to export `io` if other services need to emit events globally
// For now, keeping it encapsulated. If a chat service or document service needs to emit,
// they could be passed the `io` instance, or this `socketService` could expose methods
// like `broadcastToProject(projectId, eventName, data)`.

// Example of an exported broadcast function (if needed by other services)
// let globalIO: SocketIOServer | null = null;
// export function initializeSocket(io: SocketIOServer) {
//   globalIO = io;
//   // ... rest of the connection logic
// }
// export function getIO(): SocketIOServer {
//   if (!globalIO) throw new Error("Socket.IO not initialized!");
//   return globalIO;
// }
// export function broadcastToRoom(roomId: string, event: string, data: any) {
//   console.log(`Broadcasting ${event} to room ${roomId}`, data);
//   getIO().to(roomId).emit(event, data);
// }

  console.log('Socket.IO service initialized');
}

// You might also want to export `io` if other services need to emit events globally
// For now, keeping it encapsulated. If a chat service or document service needs to emit,
// they could be passed the `io` instance, or this `socketService` could expose methods
// like `broadcastToProject(projectId, eventName, data)`.

// Example of an exported broadcast function (if needed by other services)
// let globalIO: SocketIOServer | null = null;
// export function initializeSocket(io: SocketIOServer) {
//   globalIO = io;
//   // ... rest of the connection logic
// }
// export function getIO(): SocketIOServer {
//   if (!globalIO) throw new Error("Socket.IO not initialized!");
//   return globalIO;
// }
// export function broadcastToRoom(roomId: string, event: string, data: any) {
//   console.log(`Broadcasting ${event} to room ${roomId}`, data);
//   getIO().to(roomId).emit(event, data);
// }
