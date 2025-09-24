import { Router } from 'express';
import logGithubApiReq from '../../middleware/logGithubApiReq';
import { validateGithubProfile } from '../../helpers/validator';
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
} from '../../controller/github';
import {
  githubRateLimit,
  webhookRateLimit,
} from '../../middleware/rateLimiter';

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
router.get('/repositories', githubRateLimit, getRepositories);
router.get('/stats', githubRateLimit, getStats);
router.get('/repository/:name', githubRateLimit, getRepositoryByName);
router.get('/repository/:name/commits', githubRateLimit, getRepositoryCommits);
router.get(
  '/repository/:name/languages',
  githubRateLimit,
  getRepositoryLanguages,
);
router.get(
  '/repository/:name/contributors',
  githubRateLimit,
  getRepositoryContributors,
);
router.get('/events', githubRateLimit, getEvents);
router.post('/sync', githubRateLimit, syncGitHubData);
router.post('/webhook', webhookRateLimit, handleGithubWebhook);

export default router;
