import { Router } from 'express';
import { systemController } from '../controller/system';

const router = Router();

// Health check endpoint
router.get('/health', systemController.getHealth);

export default router;
