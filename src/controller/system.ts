import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Logger from '../core/Logger';
import { cacheService } from '../service/cache.service';
import { githubService } from '../service/github.service';
import { SuccessResponse } from '../core/ApiResponse';
import { environment, port, timezone } from '../config';
import { HealthCheck } from '../types/health.types';
import asyncHandler from '../helpers/asyncHandler';

export const getHealth = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidv4();
    const startTime = Date.now();

    Logger.info('Health check request started', { requestId });

    const healthCheck: HealthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: environment || 'development',
      version: process.env.npm_package_version || '1.0.0',
      port: port || '3000',
      timezone: timezone || 'UTC',
      services: {
        redis: { status: 'unhealthy' },
        github: { status: 'unhealthy' },
      },
      system: {
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          percentage: Math.round(
            (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) *
              100,
          ),
        },
        uptime: process.uptime(),
      },
    };

    // Check Redis health

    const redisStartTime = Date.now();
    const redisHealthy = await cacheService.isHealthy();
    const redisResponseTime = Date.now() - redisStartTime;

    healthCheck.services.redis = {
      status: redisHealthy ? 'healthy' : 'unhealthy',
      responseTime: redisResponseTime,
    };

    if (!redisHealthy) {
      healthCheck.status = 'degraded';
    }

    // Check GitHub API health (lightweight check)

    const githubStartTime = Date.now();
    // Simple check - just verify we can make a request to GitHub API
    const githubHealthy = await githubService.checkHealth();
    const githubResponseTime = Date.now() - githubStartTime;

    healthCheck.services.github = {
      status: githubHealthy ? 'healthy' : 'degraded',
      responseTime: githubResponseTime,
    };

    if (!githubHealthy && healthCheck.status === 'healthy') {
      healthCheck.status = 'degraded';
    }

    // Determine overall status
    const overallStatus =
      healthCheck.services.redis.status === 'unhealthy'
        ? 'unhealthy'
        : healthCheck.status;

    const response = new SuccessResponse(
      `System health check completed - Status: ${overallStatus}`,
      {
        ...healthCheck,
        status: overallStatus,
      },
      undefined,
      {
        timestamp: new Date().toISOString(),
        requestId,
        duration: `${Date.now() - startTime}ms`,
      },
    );

    response.send(res);

    const duration = Date.now() - startTime;
    Logger.info('Health check completed', {
      requestId,
      status: overallStatus,
      duration: `${duration}ms`,
      redis: healthCheck.services.redis.status,
      github: healthCheck.services.github.status,
    });
  },
);
