import { Router } from 'express';
import logGithubApiReq from '../middleware/logGithubApiReq';
import { validateGithubProfile } from '../helpers/validator';
import {
  getActivities,
  getOverview,
  getRepositories,
  getRepositoryByName,
  getStats,
  githubController,
  getRepositoryCommits,
  getRepositoryLanguages,
  getRepositoryContributors,
  getEvents,
  syncGitHubData,
  handleGithubWebhook,
} from '../controller/github';
import { RateLimit, webhookRateLimit } from '../middleware/rateLimiter';

const router = Router();
router.use(logGithubApiReq);

// Specific routes first
router.get(
  '/profile',
  RateLimit,
  validateGithubProfile,
  githubController.getProfile,
);

router.get('/overview', RateLimit, getOverview);
router.get('/activities', RateLimit, getActivities);
router.get('/repositories', RateLimit, getRepositories);
router.get('/stats', RateLimit, getStats);
router.get('/events', RateLimit, getEvents);
router.post('/sync', RateLimit, syncGitHubData);
router.post('/webhook', webhookRateLimit, handleGithubWebhook);

// Parameter routes
router.get('/repository/:name', RateLimit, getRepositoryByName);
router.get('/repository/:name/commits', RateLimit, getRepositoryCommits);
router.get('/repository/:name/languages', RateLimit, getRepositoryLanguages);
router.get(
  '/repository/:name/contributors',
  RateLimit,
  getRepositoryContributors,
);

export default router;
