import express, { Request, Response, Router, NextFunction } from 'express';
// import Project from '../models/Project'; // Models will be accessed via getModels
import { getModels } from '../models'; // Import getModels
import logger from '../logger'; // Import logger
// import { authenticateToken } from '../middleware/auth'; // Optional: if you have auth middleware
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { handleProjectDeleted, handleProjectRenamed } from '../services/firestoreSyncService';

const router: Router = express.Router();

// --- Project Routes ---

// GET /api/projects - Get all projects (consider pagination for large datasets)
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { Project } = getModels();
  try {
    const projects = await Project.find(); // Populate creator's info
    res.json(projects);
  } catch (err:any) {
    logger.error('Error fetching all projects', { error: err, userId: req.user?.uid });
    next(err);
  }
});

// POST /api/projects - Create a new project
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { Project } = getModels();
  // const { name, description, createdBy } = req.body; // Assuming createdBy (user ID) comes from auth or request
  if (!req.body.name || typeof req.body.name !== 'string' || req.body.name.trim() === '') {
    logger.warn('Project creation attempt with empty name', { body: req.body, userId: req.user?.uid });
    res.status(400).json({ message: 'Project name is required and cannot be empty.' });
    return;
  }
  const project = new Project({
    name: req.body.name,
    description: req.body.description,
    createdBy: req.user!.uid, // This should ideally come from an authenticated user session
    members: [req.user!.uid], // Creator is a member by default
  });

  try {
    const newProject = await project.save();
    res.status(201).json(newProject);
  } catch (err:any) {
    logger.error('Error creating project', { error: err, body: req.body, userId: req.user?.uid });
    err.status = 400;
    next(err);
  }
});

// GET /api/projects/:projectId - Get a single project by ID
router.get('/:projectId', authenticate, getProject, (req: AuthenticatedRequest, res: Response) => {
  // Note: getProject middleware already handles not found and other errors.
  // Access control check:
  if (!res.locals.project.members.map((id: any) => id.toString()).includes(req.user!.uid)) {
    logger.warn(`Forbidden access attempt to project ${req.params.projectId} by user ${req.user!.uid}`, { projectId: req.params.projectId, userId: req.user!.uid });
    res.status(403).json({ message: 'Forbidden: User is not a member of this project' });
    return;
  }
  res.json(res.locals.project);
});

// PUT /api/projects/:projectId - Update a project
router.put('/:projectId', authenticate, getProject, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Access control check:
  if (!res.locals.project.members.map((id: any) => id.toString()).includes(req.user!.uid)) {
    logger.warn(`Forbidden update attempt on project ${req.params.projectId} by user ${req.user!.uid}`, { projectId: req.params.projectId, userId: req.user!.uid });
    res.status(403).json({ message: 'Forbidden: User is not a member of this project' });
    return;
  }
  if (req.body.name != null) {
    if (typeof req.body.name !== 'string' || req.body.name.trim() === '') {
      logger.warn(`Project update attempt with empty name for project ${req.params.projectId}`, { body: req.body, userId: req.user?.uid, projectId: req.params.projectId });
      res.status(400).json({ message: 'Project name cannot be empty.' });
      return;
    }
    const oldName = res.locals.project.name; // Capture old name for potential logging or different event structure if needed
    res.locals.project.name = req.body.name;

    // Notify Firestore sync service about project rename
    if (oldName !== req.body.name) { // Only call if the name actually changed
      await handleProjectRenamed({ projectId: res.locals.project._id.toString(), newName: req.body.name });
    }
  }
  if (req.body.description != null) {
    res.locals.project.description = req.body.description;
  }
  // Add more fields to update as needed, e.g., members

  try {
    const updatedProject = await res.locals.project.save();
    res.json(updatedProject);
  } catch (err:any) {
    logger.error(`Error updating project ${req.params.projectId}`, { error: err, body: req.body, userId: req.user?.uid, projectId: req.params.projectId });
    err.status = 400;
    next(err);
  }
});

// DELETE /api/projects/:projectId - Delete a project
router.delete('/:projectId', authenticate, getProject, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Access control check:
  if (!res.locals.project.members.map((id: any) => id.toString()).includes(req.user!.uid)) {
    logger.warn(`Forbidden delete attempt on project ${req.params.projectId} by user ${req.user!.uid}`, { projectId: req.params.projectId, userId: req.user!.uid });
    res.status(403).json({ message: 'Forbidden: User is not a member of this project' });
    return;
  }
  try {
    // Notify Firestore sync service about project deletion
    await handleProjectDeleted({ projectId: res.locals.project._id.toString() });

    await res.locals.project.deleteOne();
    res.json({ message: 'Project deleted' });
  } catch (err:any) {
    logger.error(`Error deleting project ${req.params.projectId}`, { error: err, userId: req.user?.uid, projectId: req.params.projectId });
    next(err);
  }
});

// --- Middleware to get a project by ID ---
async function getProject(req: AuthenticatedRequest, res: Response, next: express.NextFunction) {
  const { Project } = getModels();
  let project;
  try {
    project = await Project.findById(req.params.projectId); // .populate('members', 'username email');
    if (project == null) {
      logger.warn(`Project not found with ID: ${req.params.projectId}`, { projectId: req.params.projectId, userId: req.user?.uid });
      // No return res.status(...), just res.status(...) and then return;
      res.status(404).json({ message: 'Cannot find project' });
      return;
    }
  } catch (err:any) {
    logger.error(`Error in getProject middleware while fetching project ${req.params.projectId}`, { error: err, projectId: req.params.projectId, userId: req.user?.uid });
    if (!err.status) err.status = 500;
    next(err);
    return;
  }
  res.locals.project = project;
  next();
}

// --- Project Membership Routes ---

// POST /api/projects/:projectId/members - Add a member to a project
router.post('/:projectId/members', authenticate, getProject, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Access control check:
  if (!res.locals.project.members.map((id: any) => id.toString()).includes(req.user!.uid)) {
    logger.warn(`Forbidden attempt to add member to project ${req.params.projectId} by non-member ${req.user!.uid}`, { projectId: req.params.projectId, userId: req.user!.uid, memberToAdd: req.body.userId });
    res.status(403).json({ message: 'Forbidden: User is not a member of this project' });
    return;
  }
  const { userId } = req.body; // User ID to add
  if (!userId) {
    logger.warn(`Add member attempt without userId for project ${req.params.projectId}`, { body: req.body, projectId: req.params.projectId, requester: req.user!.uid });
    res.status(400).json({ message: 'User ID is required' });
    return;
  }

  try {
    // Check if user is already a member
    if (res.locals.project.members.map((id: any) => id.toString()).includes(userId)) {
      logger.warn(`Attempt to add existing member ${userId} to project ${req.params.projectId}`, { projectId: req.params.projectId, userId, requester: req.user!.uid });
      res.status(400).json({ message: 'User is already a member of this project' });
      return;
    }
    res.locals.project.members.push(userId);
    await res.locals.project.save();
    res.status(201).json(res.locals.project);
  } catch (err:any) {
    logger.error(`Error adding member ${userId} to project ${req.params.projectId}`, { error: err, projectId: req.params.projectId, userId, requester: req.user!.uid });
    next(err);
  }
});

// DELETE /api/projects/:projectId/members/:userId - Remove a member from a project
router.delete('/:projectId/members/:userId', authenticate, getProject, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Access control check:
  if (!res.locals.project.members.map((id: any) => id.toString()).includes(req.user!.uid)) {
    logger.warn(`Forbidden attempt to remove member from project ${req.params.projectId} by non-member ${req.user!.uid}`, { projectId: req.params.projectId, userId: req.user!.uid, memberToRemove: req.params.userId });
    res.status(403).json({ message: 'Forbidden: User is not a member of this project' });
    return;
  }
  const { userId } = req.params; // User ID to remove
  try {
    res.locals.project.members = res.locals.project.members.filter(
      (memberId: any) => memberId.toString() !== userId
    );
    await res.locals.project.save();
    res.json({ message: 'Member removed' });
  } catch (err:any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
