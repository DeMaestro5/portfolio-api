import { NextFunction, Response, Request } from 'express';
import Logger from '../core/Logger';

export const memoryMonitor = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);

  if (heapUsedMB > 400) {
    Logger.warn(`High memory usage detected: ${heapUsedMB}MB`);
  }
  next();
};
