import express, { Request, Response, Router, NextFunction } from 'express';
import { getModels } from '../models'; // Import getModels
import logger from '../logger'; // Import logger

const router: Router = express.Router();

// GET /api/projects/:projectId/chats - Get all chat messages for a project
router.get('/projects/:projectId/chats', async (req: Request, res: Response, next: NextFunction) => {
  const { projectId } = req.params;
  const { limit = 50, before } = req.query;
  const { ChatMessage, Project } = getModels(); // Corrected: single destructuring

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const query: any = { projectId };
    if (before) {
      query.timestamp = { $lt: new Date(before as string) };
    }

    const messages = await ChatMessage.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit));
      // .populate('senderId', 'username email'); // Removed populate

    return res.json(messages.reverse());
  } catch (err:any) {
    logger.error(`Error fetching chat messages for project ${projectId}`, { error: err, projectId, query: req.query });
    return next(err); // Pass to global error handler
  }
});

// POST /api/projects/:projectId/chats - Post a new chat message in a project
router.post('/projects/:projectId/chats', async (req: Request, res: Response, next: NextFunction) => {
  const { message, senderId, documentId } = req.body;
  const { projectId } = req.params;
  const { ChatMessage, Project } = getModels(); // Corrected: single destructuring

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const chatMessage = new ChatMessage({
      projectId,
      documentId,
      senderId,
      message,
    });

    const newChatMessage = await chatMessage.save();
    // await newChatMessage.populate('senderId', 'username email'); // Removed populate

    return res.status(201).json(newChatMessage);
  } catch (err:any) {
    logger.error(`Error posting chat message for project ${projectId}`, { error: err, projectId, body: req.body });
    err.status = 400; // Set status for bad request
    return next(err); // Pass to global error handler
  }
});

// GET /api/documents/:documentId/chats - Get all chat messages for a specific document (comments)
router.get('/documents/:documentId/chats', async (req: Request, res: Response, next: NextFunction) => {
    const { documentId } = req.params;
    const { limit = 50, before } = req.query;
    const { ChatMessage } = getModels();

    try {
        const query: any = { documentId };
        if (before) {
            query.timestamp = { $lt: new Date(before as string) };
        }

        const messages = await ChatMessage.find(query)
            .sort({ timestamp: -1 })
            .limit(Number(limit));
            // .populate('senderId', 'username email'); // Removed populate

        return res.json(messages.reverse());
    } catch (err:any) {
        logger.error(`Error fetching chat messages for document ${documentId}`, { error: err, documentId, query: req.query });
        return next(err); // Pass to global error handler
    }
});

export default router;
