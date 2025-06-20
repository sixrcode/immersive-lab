import express, { Request, Response, Router } from 'express';
// import Project from '../models/Project'; // Models will be accessed via getModels
import { getModels } from '../models'; // Import getModels
// import { authenticateToken } from '../middleware/auth'; // Optional: if you have auth middleware
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router: Router = express.Router();

// --- Project Routes ---

// GET /api/projects - Get all projects (consider pagination for large datasets)
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { Project } = getModels();
  try {
    const projects = await Project.find(); // Populate creator's info
    res.json(projects);
  } catch (err:any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/projects - Create a new project
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { Project } = getModels();
  // const { name, description, createdBy } = req.body; // Assuming createdBy (user ID) comes from auth or request
  if (!req.body.name || typeof req.body.name !== 'string' || req.body.name.trim() === '') {
    return res.status(400).json({ message: 'Project name is required and cannot be empty.' });
  }
  const project = new Project({
    name: req.body.name,
    description: req.body.description,
    createdBy: req.user.uid, // This should ideally come from an authenticated user session
    members: [req.user.uid], // Creator is a member by default
  });

  try {
    const newProject = await project.save();
    res.status(201).json(newProject);
  } catch (err:any) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/projects/:projectId - Get a single project by ID
router.get('/:projectId', authenticate, getProject, (req: AuthenticatedRequest, res: Response) => {
  if (!res.locals.project.members.map((id: any) => id.toString()).includes(req.user.uid)) {
    return res.status(403).json({ message: 'Forbidden: User is not a member of this project' });
  }
  res.json(res.locals.project);
});

// PUT /api/projects/:projectId - Update a project
router.put('/:projectId', authenticate, getProject, async (req: AuthenticatedRequest, res: Response) => {
  if (!res.locals.project.members.map((id: any) => id.toString()).includes(req.user.uid)) {
    return res.status(403).json({ message: 'Forbidden: User is not a member of this project' });
  }
  if (req.body.name != null) {
    if (typeof req.body.name !== 'string' || req.body.name.trim() === '') {
      return res.status(400).json({ message: 'Project name cannot be empty.' });
    }
    res.locals.project.name = req.body.name;
  }
  if (req.body.description != null) {
    res.locals.project.description = req.body.description;
  }
  // Add more fields to update as needed, e.g., members

  try {
    const updatedProject = await res.locals.project.save();
    res.json(updatedProject);
  } catch (err:any) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/projects/:projectId - Delete a project
router.delete('/:projectId', authenticate, getProject, async (req: AuthenticatedRequest, res: Response) => {
  if (!res.locals.project.members.map((id: any) => id.toString()).includes(req.user.uid)) {
    return res.status(403).json({ message: 'Forbidden: User is not a member of this project' });
  }
  try {
    await res.locals.project.deleteOne();
    res.json({ message: 'Project deleted' });
  } catch (err:any) {
    res.status(500).json({ message: err.message });
  }
});

// --- Middleware to get a project by ID ---
async function getProject(req: AuthenticatedRequest, res: Response, next: express.NextFunction) {
  const { Project } = getModels();
  let project;
  try {
    project = await Project.findById(req.params.projectId); // .populate('members', 'username email');
    if (project == null) {
      res.status(404).json({ message: 'Cannot find project' });
      return;
    }
  } catch (err:any) {
    res.status(500).json({ message: err.message });
    return;
  }
  res.locals.project = project;
  next();
}

// --- Project Membership Routes ---

// POST /api/projects/:projectId/members - Add a member to a project
router.post('/:projectId/members', authenticate, getProject, async (req: AuthenticatedRequest, res: Response) => {
  if (!res.locals.project.members.map((id: any) => id.toString()).includes(req.user.uid)) {
    return res.status(403).json({ message: 'Forbidden: User is not a member of this project' });
  }
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ message: 'User ID is required' });
    return;
  }

  try {
    // Check if user is already a member
    if (res.locals.project.members.map((id: any) => id.toString()).includes(userId)) {
      res.status(400).json({ message: 'User is already a member of this project' });
      return;
    }
    res.locals.project.members.push(userId);
    await res.locals.project.save();
    res.status(201).json(res.locals.project);
  } catch (err:any) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/projects/:projectId/members/:userId - Remove a member from a project
router.delete('/:projectId/members/:userId', authenticate, getProject, async (req: AuthenticatedRequest, res: Response) => {
  if (!res.locals.project.members.map((id: any) => id.toString()).includes(req.user.uid)) {
    return res.status(403).json({ message: 'Forbidden: User is not a member of this project' });
  }
  const { userId } = req.params;
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
