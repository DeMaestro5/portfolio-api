import { Router } from 'express';
import {
  getProjects,
  getFeaturedProjects,
  getProjectsByLanguage,
  searchProjects,
  getProjectById,
} from '../controller/projects';
import { RateLimit } from '../middleware/rateLimiter';
import logGithubApiReq from '../middleware/logGithubApiReq';

const router = Router();
router.use(logGithubApiReq);
// Specific routes first
router.get('/all-projects', RateLimit, getProjects);
router.get('/featured', RateLimit, getFeaturedProjects);
router.get('/by-language/:language', RateLimit, getProjectsByLanguage);
router.get('/search', RateLimit, searchProjects);

// Parameter routes
router.get('/:id', RateLimit, getProjectById);

export default router;
