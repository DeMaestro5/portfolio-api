import { Router } from 'express';
import { MetricsController } from '../controller/metrics';
import { RateLimit } from '../middleware/rateLimiter';

const router = Router();

router.get('/languages', RateLimit, MetricsController.getLanguagesMetrics);

export default router;
