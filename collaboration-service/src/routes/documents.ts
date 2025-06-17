import express, { Request, Response, Router } from 'express';
// import Document from '../models/Document'; // Models will be accessed via getModels
// import Project from '../models/Project'; // Models will be accessed via getModels
import { getModels } from '../models'; // Import getModels
// import { authenticateToken } from '../middleware/auth'; // Optional: if you have auth middleware

const router: Router = express.Router();

// --- Document Routes ---

// GET /api/projects/:projectId/documents - Get all documents for a project
router.get('/projects/:projectId/documents', async (req: Request, res: Response) => {
  const { Document } = getModels();
  try {
    const documents = await Document.find({ projectId: req.params.projectId });
    // .populate('createdBy', 'username email')
    // .populate('lastModifiedBy', 'username email');
    res.json(documents);
  } catch (err:any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/projects/:projectId/documents - Create a new document in a project
router.post('/projects/:projectId/documents', async (req: Request, res: Response) => {
  const { title, content, createdBy } = req.body; // Assuming createdBy (user ID) from auth/request
  const { projectId } = req.params;

  const { Document, Project } = getModels();
  try {
    // Optional: Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
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
    res.status(400).json({ message: err.message });
  }
});

// GET /api/documents/:documentId - Get a single document by ID
router.get('/:documentId', getDocument, (req: Request, res: Response) => {
  res.json(res.locals.document);
});

// PUT /api/documents/:documentId - Update a document
router.put('/:documentId', getDocument, async (req: Request, res: Response) => {
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
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/documents/:documentId - Delete a document
router.delete('/:documentId', getDocument, async (req: Request, res: Response) => {
  try {
    const deletedDocument = res.locals.document;
    await res.locals.document.deleteOne();
    // Consider emitting a socket event here for real-time updates
    // io.to(deletedDocument.projectId.toString()).emit('documentDeleted', { id: deletedDocument._id });
    res.json({ message: 'Document deleted' });
  } catch (err:any) {
    res.status(500).json({ message: err.message });
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
      res.status(404).json({ message: 'Cannot find document' });
      return;
    }
  } catch (err:any) {
    res.status(500).json({ message: err.message });
    return;
  }
  res.locals.document = document;
  next();
}

export default router;
