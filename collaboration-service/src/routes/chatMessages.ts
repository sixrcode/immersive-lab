import express, { Request, Response, Router } from 'express';
import { getModels } from '../models'; // Import getModels

const router: Router = express.Router();

// GET /api/projects/:projectId/chats - Get all chat messages for a project
router.get('/projects/:projectId/chats', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { limit = 50, before } = req.query;
  const { ChatMessage, Project } = getModels(); // Corrected: single destructuring

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    const query: any = { projectId };
    if (before) {
      query.timestamp = { $lt: new Date(before as string) };
    }

    const messages = await ChatMessage.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit));
      // .populate('senderId', 'username email'); // Removed populate

    res.json(messages.reverse());
  } catch (err:any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/projects/:projectId/chats - Post a new chat message in a project
router.post('/projects/:projectId/chats', async (req: Request, res: Response) => {
  const { message, senderId, documentId } = req.body;
  const { projectId } = req.params;
  const { ChatMessage, Project } = getModels(); // Corrected: single destructuring

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    const chatMessage = new ChatMessage({
      projectId,
      documentId,
      senderId,
      message,
    });

    const newChatMessage = await chatMessage.save();
    // await newChatMessage.populate('senderId', 'username email'); // Removed populate

    res.status(201).json(newChatMessage);
  } catch (err:any) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/documents/:documentId/chats - Get all chat messages for a specific document (comments)
router.get('/documents/:documentId/chats', async (req: Request, res: Response) => {
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

        res.json(messages.reverse());
    } catch (err:any) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
