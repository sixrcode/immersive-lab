import express, { Request, Response } from 'express';
import logger from '../logger';
import { broadcastProductionBoardChange } from '../services/socketService';
// Potentially add some form of service-to-service authentication middleware here if needed in future.

const router = express.Router();

/**
 * @route POST /api/internal/broadcast-board-change
 * @desc Receives a notification (e.g., from Next.js backend) that a production board has changed
 *       and triggers a WebSocket broadcast to relevant clients.
 * @access Internal (should be protected if exposed publicly)
 *
 * Query Parameters:
 *  - projectId: string (required) - The ID of the project whose board changed.
 *  - updatedBySocketId: string (optional) - The socket ID of the client who initiated the change.
 */
router.post('/broadcast-board-change', (req: Request, res: Response) => {
  const { projectId, updatedBySocketId } = req.query;

  if (!projectId || typeof projectId !== 'string') {
    logger.warn('Internal broadcast-board-change: Missing or invalid projectId query parameter.', { query: req.query });
    return res.status(400).json({ success: false, message: 'projectId query parameter is required and must be a string.' });
  }

  try {
    broadcastProductionBoardChange(projectId, updatedBySocketId as string | undefined);
    logger.info(`Internal broadcast-board-change: Successfully triggered broadcast for projectId: ${projectId}`, { projectId, updatedBySocketId });
    return res.status(200).json({ success: true, message: 'Broadcast for production board change initiated.' });
  } catch (error) {
    logger.error('Internal broadcast-board-change: Error triggering broadcast.', { projectId, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return res.status(500).json({ success: false, message: 'Failed to initiate broadcast.' });
  }
});

export default router;
