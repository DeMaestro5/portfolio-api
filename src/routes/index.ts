import express from 'express';
import githubRouter from './github';
import projectsRouter from './projects';
import metricsRouter from './metrics';
import systemRouter from './system';

const router = express.Router();

router.use('/github', githubRouter);
router.use('/projects', projectsRouter);
router.use('/metrics', metricsRouter);
router.use('/system', systemRouter);

export default router;
