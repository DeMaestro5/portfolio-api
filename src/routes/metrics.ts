import { Router } from 'express';

import { RateLimit } from '../middleware/rateLimiter';
import {
  getLanguagesMetrics,
  getStreakMetrics,
  getTechnologiesMetrics,
  getMetricsSummary,
  getTimelineMetrics,
  getActivityMetrics,
  getRepositoriesMetrics,
  getContributionsMetrics,
  getProductivityMetrics,
} from '../controller/metrics';
import { getCommitMetrics } from '../controller/metrics';

const router = Router();

router.get('/languages', RateLimit, getLanguagesMetrics);
router.get('/activities', RateLimit, getActivityMetrics);
router.get('/commits', RateLimit, getCommitMetrics);
router.get('/repositories', RateLimit, getRepositoriesMetrics);
router.get('/contributions', RateLimit, getContributionsMetrics);
router.get('/productivity', RateLimit, getProductivityMetrics);
router.get('/technologies', RateLimit, getTechnologiesMetrics);
router.get('/streak', RateLimit, getStreakMetrics);
router.get('/summary', RateLimit, getMetricsSummary);
router.get('/timeline', RateLimit, getTimelineMetrics);

export default router;
