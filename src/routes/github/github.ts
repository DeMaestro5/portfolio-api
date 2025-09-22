import { Router } from 'express';
import logGithubApiReq from '../../middleware/logGithubApiReq';
import { validateGithubProfile } from '../../helpers/validator';
import { githubController } from '../../controller/github';
import { githubRateLimit } from '../../middleware/rateLimiter';

const router = Router();
router.use(logGithubApiReq);

router.get(
  '/profile',
  githubRateLimit,
  validateGithubProfile,
  githubController.getProfile,
);

export default router;
