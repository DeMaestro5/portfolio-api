import { Router } from 'express';
import Logger from '../core/Logger';

const router = Router();

router.use((req, res, next) => {
  Logger.info('GitHub Api Request', {
    ip: req.ip,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
  });
  next();
});

export default router;
