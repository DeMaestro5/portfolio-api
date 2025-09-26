import { Router } from 'express';
import { projectsController } from '../controller/projects';
import { RateLimit } from '../middleware/rateLimiter';
import logGithubApiReq from '../middleware/logGithubApiReq';

const router = Router();
router.use(logGithubApiReq);
// Specific routes first
router.get('/all-projects', RateLimit, projectsController.getProjects);
router.get('/featured', RateLimit, projectsController.getFeaturedProjects);
router.get(
  '/by-language/:language',
  RateLimit,
  projectsController.getProjectsByLanguage,
);
router.get('/search', RateLimit, projectsController.searchProjects);

// Parameter routes
router.get('/:id', RateLimit, projectsController.getProjectById);

export default router;
