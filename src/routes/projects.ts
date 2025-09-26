import { Router } from 'express';
import { projectsController } from '../controller/projects';
import { RateLimit } from '../middleware/rateLimiter';
import logGithubApiReq from '../middleware/logGithubApiReq';

const router = Router();
router.use(logGithubApiReq);

router.get('/all-projects', RateLimit, projectsController.getProjects);
router.get('/featured', RateLimit, projectsController.getFeaturedProjects);
router.get('/:id', RateLimit, projectsController.getProjectById);

export default router;
