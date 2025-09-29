import { Router } from 'express';
import { MetricsController } from '../controller/metrics';
import { RateLimit } from '../middleware/rateLimiter';

const router = Router();

router.get('/languages', RateLimit, MetricsController.getLanguagesMetrics);
router.get('/activities', RateLimit, MetricsController.getActivityMetrics);

export default router;
