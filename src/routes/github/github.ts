import { Router } from 'express';
import logGithubApiReq from '../../middleware/logGithubApiReq';
import { validateGithubProfile } from '../../helpers/validator';
import {
  getActivities,
  getOverview,
  githubController,
} from '../../controller/github';
import { githubRateLimit } from '../../middleware/rateLimiter';

const router = Router();
router.use(logGithubApiReq);

router.get(
  '/profile',
  githubRateLimit,
  validateGithubProfile,
  githubController.getProfile,
);

router.get('/overview', githubRateLimit, getOverview);
router.get('/activities', githubRateLimit, getActivities);

export default router;
