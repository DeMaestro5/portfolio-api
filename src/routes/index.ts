import express from 'express';
import githubRouter from './github';
import projectsRouter from './projects';
import metricsRouter from './metrics';

const router = express.Router();

router.use('/github', githubRouter);
router.use('/projects', projectsRouter);
router.use('/metrics', metricsRouter);

export default router;
