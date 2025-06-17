import express, { Express, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import projectRoutes from './routes/projects';
import documentRoutes from './routes/documents';
import chatMessageRoutes from './routes/chatMessages';
import { initializeSocket } from './services/socketService'; // Placeholder for socket service

const app: Express = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json()); // For parsing application/json

// CORS Middleware (simple example, configure as needed for security)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*'); // Allow all origins (for development)
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Database Connection
// const mongoURI = process.env.MONGODB_URI; // Will be accessed in startServer

// if (!mongoURI) { // This check will also move to startServer
//   console.error('FATAL ERROR: MONGODB_URI is not defined.');
//   process.exit(1);
// }

// mongoose.connect(mongoURI) // This will move to startServer
//   .then(() => console.log('MongoDB connected successfully.'))
//   .catch(err => {
//     console.error('MongoDB connection error:', err);
//     process.exit(1);
//   });

// API Routes
app.use('/api/projects', projectRoutes);
app.use('/api/documents', documentRoutes); // Nested under /api/documents for clarity for document-specific actions
app.use('/api/chats', chatMessageRoutes); // For project/document specific chats, routes handle filtering

// Basic Route
app.get('/', (req: Request, res: Response) => {
  res.send('Collaboration Service Running');
});

// HTTP server setup for Socket.IO
const server = http.createServer(app);

// Socket.IO setup
const io = new SocketIOServer(server, {
  cors: {
    origin: "*", // Allow all origins (for development, restrict in production)
    methods: ["GET", "POST"]
  }
});

// Initialize Socket.IO service (passing the io instance)
initializeSocket(io); // This function will be in src/services/socketService.ts

// Global error handler (optional, basic example)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server logic wrapped in a function
export async function startServer() {
  // Mongoose connection is now handled globally for tests, or by the direct execution block below.
  const currentPort = process.env.PORT || 3001;

  // For tests, Mongoose connection is assumed to be handled by globalSetup.
  // For direct execution, Mongoose connection is handled before calling startServer.
  // Thus, no explicit Mongoose connection call or check within startServer itself.
  console.log('startServer called. Mongoose connection assumed to be handled externally.');

  return new Promise<void>((resolve, reject) => {
    server.on('error', (err) => {
      console.error('Server failed to start:', err);
      if (process.env.NODE_ENV === 'test') {
        reject(err);
      } else {
        process.exit(1);
      }
    });
    server.listen(currentPort, () => {
      console.log(`Collaboration service is listening on port ${currentPort}`);
      console.log(`Socket.IO initialized and listening on port ${currentPort}`);
      resolve();
    });
  });
  // No catch block for mongoose.connect here as it's not called here.
}

// If running directly (e.g. `node dist/index.js`), start the server.
// This allows the application to run normally outside of a test environment.
if (process.env.NODE_ENV !== 'test') {
  const mongoURI_direct = process.env.MONGODB_URI;
  if (!mongoURI_direct) {
    console.error('FATAL ERROR: MONGODB_URI is not defined. Cannot start server for direct execution.');
    process.exit(1);
  }

  const connectAndStart = async () => {
    try {
      if (mongoose.connection.readyState !== 1 && mongoose.connection.readyState !== 2) { // 1=connected, 2=connecting
        console.log('MongoDB not connected, attempting to connect for direct execution...');
        await mongoose.connect(mongoURI_direct);
        console.log('MongoDB connected successfully for direct execution.');
      } else {
        console.log(`MongoDB already connected or connecting (readyState: ${mongoose.connection.readyState}). Skipping new connection.`);
      }

      // Initialize models after Mongoose connection for direct execution
      const { initModels } = await import('./models'); // Adjust path as necessary
      initModels(mongoose); // Pass the connected mongoose instance
      console.log('Models initialized for direct execution.');

      await startServer(); // Now start the server
    } catch (err) {
      console.error("Failed to connect MongoDB or start server for direct execution:", err);
      process.exit(1);
    }
  };
  connectAndStart();
}


export { app, server, io }; // Export for potential testing or other uses
