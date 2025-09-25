import express from 'express';
import githubRouter from './github';
import projectsRouter from './projects';

const router = express.Router();

router.use('/github', githubRouter);
router.use('/projects', projectsRouter);

export default router;
