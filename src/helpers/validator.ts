import { Request, Response, NextFunction } from 'express';
import Logger from '../core/Logger';

export const validateGithubProfile = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // we also dont need params validation for this endpoint
  // but we can add header validation or other checks if needed

  Logger.info('Validating github profile request', {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    endpoint: req.path,
  });
  next();
};
