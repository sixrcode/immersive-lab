import { Server as SocketIOServer, Socket } from 'socket.io';

export function initializeSocket(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Example: Join a room (e.g., a project room)
    socket.on('joinProject', (projectId: string) => {
      socket.join(projectId);
      console.log(`Socket ${socket.id} joined project room: ${projectId}`);
      // Optionally, acknowledge to the client
      socket.emit('joinedProject', projectId);
      // Broadcast to others in the room (optional)
      // socket.to(projectId).emit('userJoined', { userId: socket.id, projectId });
    });

    // Example: Leave a room
    socket.on('leaveProject', (projectId: string) => {
      socket.leave(projectId);
      console.log(`Socket ${socket.id} left project room: ${projectId}`);
      // Optionally, acknowledge to the client
      socket.emit('leftProject', projectId);
      // Broadcast to others in the room (optional)
      // socket.to(projectId).emit('userLeft', { userId: socket.id, projectId });
    });

    // Handle document changes (example placeholder)
    socket.on('documentChange', (data: { documentId: string; projectId: string, newContent: any }) => {
      console.log(`Document ${data.documentId} changed by ${socket.id}:`, data.newContent);
      // Broadcast to the project room (or a document-specific room if preferred)
      // Ensure projectId is provided by the client or fetched based on documentId
      if (data.projectId) {
         socket.to(data.projectId).emit('documentUpdated', { documentId: data.documentId, content: data.newContent, updatedBy: socket.id });
      } else {
        // Handle cases where projectId is not directly available, maybe emit to a general channel or error
        console.warn(`Document change event for ${data.documentId} received without projectId.`);
      }
    });

    // Handle chat messages (example placeholder)
    // This is often handled via REST API first, then broadcasted by the server.
    // However, direct WebSocket chat is also possible.
    socket.on('sendChatMessage', (data: { projectId: string; message: string; senderId?: string }) => {
      console.log(`Chat message for project ${data.projectId} from ${socket.id}: ${data.message}`);
      // The actual ChatMessage model saving should happen in the API route.
      // The API route would then call a service function that uses `io.to(projectId).emit(...)`
      // This is just a listener for direct socket messages if that pattern is chosen.
      const chatData = {
        message: data.message,
        senderId: data.senderId || socket.id, // Use provided senderId or socket.id as fallback
        projectId: data.projectId,
        timestamp: new Date()
      };
      io.to(data.projectId).emit('newChatMessage', chatData);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      // Perform cleanup if necessary, e.g., notify users in rooms
    });

    // Error handling for sockets (basic)
    socket.on('error', (error) => {
      console.error(`Socket Error from ${socket.id}:`, error);
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
