import express, { Request, Response, Router, NextFunction } from 'express';
// import Document from '../models/Document'; // Models will be accessed via getModels
// import Project from '../models/Project'; // Models will be accessed via getModels
import { getModels } from '../models'; // Import getModels
import logger from '../logger'; // Import logger
// import { authenticateToken } from '../middleware/auth'; // Optional: if you have auth middleware

const router: Router = express.Router();

// --- Document Routes ---

// GET /api/projects/:projectId/documents - Get all documents for a project
router.get('/projects/:projectId/documents', async (req: Request, res: Response, next: NextFunction) => {
  const { Document } = getModels();
  try {
    const documents = await Document.find({ projectId: req.params.projectId });
    // .populate('createdBy', 'username email')
    // .populate('lastModifiedBy', 'username email');
    res.json(documents);
  } catch (err:any) {
    logger.error(`Error fetching documents for project ${req.params.projectId}`, { error: err, projectId: req.params.projectId });
    next(err);
  }
});

// POST /api/projects/:projectId/documents - Create a new document in a project
router.post('/projects/:projectId/documents', async (req: Request, res: Response, next: NextFunction) => {
  const { title, content, createdBy } = req.body; // Assuming createdBy (user ID) from auth/request
  const { projectId } = req.params;

  const { Document, Project } = getModels();
  try {
    // Optional: Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      // It's good practice to log this specific case
      logger.warn(`Attempt to create document for non-existent project ${projectId}`, { projectId, body: req.body });
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    const document = new Document({
      title,
      content: content || '',
      projectId,
      createdBy, // This should ideally come from an authenticated user session
      lastModifiedBy: createdBy, // Creator is the first modifier
    });

    const newDocument = await document.save();
    res.status(201).json(newDocument);
  } catch (err:any) {
    logger.error(`Error creating document for project ${projectId}`, { error: err, projectId, body: req.body });
    err.status = 400;
    next(err);
  }
});

// GET /api/documents/:documentId - Get a single document by ID
router.get('/:documentId', getDocument, (req: Request, res: Response) => {
  res.json(res.locals.document);
});

// PUT /api/documents/:documentId - Update a document
router.put('/:documentId', getDocument, async (req: Request, res: Response, next: NextFunction) => {
  const { title, content, lastModifiedBy } = req.body; // Assuming lastModifiedBy from auth/request

  if (title != null) {
    res.locals.document.title = title;
  }
  if (content != null) {
    res.locals.document.content = content;
  }
  if (lastModifiedBy != null) {
    res.locals.document.lastModifiedBy = lastModifiedBy; // Update who last modified it
  }
  // Add more fields to update as needed

  try {
    const updatedDocument = await res.locals.document.save();
    // Consider emitting a socket event here for real-time updates
    // io.to(updatedDocument.projectId.toString()).emit('documentUpdated', updatedDocument);
    res.json(updatedDocument);
  } catch (err:any) {
    logger.error(`Error updating document ${req.params.documentId}`, { error: err, documentId: req.params.documentId, body: req.body });
    err.status = 400;
    next(err);
  }
});

// DELETE /api/documents/:documentId - Delete a document
router.delete('/:documentId', getDocument, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deletedDocument = res.locals.document;
    await res.locals.document.deleteOne();
    // Consider emitting a socket event here for real-time updates
    // io.to(deletedDocument.projectId.toString()).emit('documentDeleted', { id: deletedDocument._id });
    res.json({ message: 'Document deleted' });
  } catch (err:any) {
    logger.error(`Error deleting document ${req.params.documentId}`, { error: err, documentId: req.params.documentId });
    next(err);
  }
});

// --- Middleware to get a document by ID ---
async function getDocument(req: Request, res: Response, next: express.NextFunction) {
  const { Document } = getModels();
  let document;
  try {
    document = await Document.findById(req.params.documentId);
    // .populate('createdBy', 'username email')
    // .populate('lastModifiedBy', 'username email');
    if (document == null) {
      logger.warn(`Document not found with ID: ${req.params.documentId}`, { documentId: req.params.documentId });
      res.status(404).json({ message: 'Cannot find document' });
      return;
    }
  } catch (err:any) {
    logger.error(`Error in getDocument middleware while fetching document ${req.params.documentId}`, { error: err, documentId: req.params.documentId });
    // Pass error to the global error handler, ensuring it has a status if not already set
    if (!err.status) err.status = 500;
    next(err);
    return;
  }
  res.locals.document = document;
  next();
}

export default router;
