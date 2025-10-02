import { Router } from 'express';
import { MetricsController } from '../controller/metrics';
import { RateLimit } from '../middleware/rateLimiter';

const router = Router();

router.get('/languages', RateLimit, MetricsController.getLanguagesMetrics);
router.get('/activities', RateLimit, MetricsController.getActivityMetrics);
router.get('/commits', RateLimit, MetricsController.getCommitMetrics);
router.get(
  '/repositories',
  RateLimit,
  MetricsController.getRepositoriesMetrics,
);
router.get(
  '/contributions',
  RateLimit,
  MetricsController.getContributionsMetrics,
);
router.get(
  '/productivity',
  RateLimit,
  MetricsController.getProductivityMetrics,
);
router.get(
  '/technologies',
  RateLimit,
  MetricsController.getTechnologiesMetrics,
);
router.get('/streak', RateLimit, MetricsController.getStreakMetrics);

export default router;
