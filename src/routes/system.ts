import { Router } from 'express';
import { getHealth } from '../controller/system';

const router = Router();

// Health check endpoint
router.get('/health', getHealth);

export default router;
