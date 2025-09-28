import { Request, Response } from 'express';
import Logger from '../core/Logger';
import { LanguageMetric } from '../types/metrics.types';
import { cacheService } from '../service/cache.service';
import { metricsService } from '../service/metrics.service';
import {
  GitHubErrorResponse,
  GitHubSuccessResponse,
} from '../core/ApiResponse';
import { v4 as uuidV4 } from 'uuid';

export const MetricsController = {
  async getLanguagesMetrics(req: Request, res: Response): Promise<void> {
    const requestId = uuidV4();
    const startTime = Date.now();
    try {
      Logger.info('Languages request started', { requestId });

      // try to get from cache first
      const cacheKey = 'metrics:languages';
      let languagesMetrics = await cacheService.get<LanguageMetric[]>(cacheKey);
      let cached = false;
      let rateLimitInfo: { remaining: number; reset: string } | undefined;

      if (!languagesMetrics) {
        // if not in cache, fetch from metrics service
        languagesMetrics = await metricsService.getLanguages();
        await cacheService.set(cacheKey, languagesMetrics, 60 * 60 * 24);
        cached = false;
      } else {
        cached = true;
        rateLimitInfo = undefined;
      }

      const response = new GitHubSuccessResponse(
        'Languages metrics fetched successfully',
        languagesMetrics,
        cached,
        rateLimitInfo,
        requestId,
        startTime,
      );
      response.send(res);

      const duration = Date.now() - startTime;
      Logger.info('Languages request completed', {
        requestId,
        cached,
        duration: `${duration}ms`,
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      Logger.error('Languages request failed', {
        requestId,
        error: error.message,
        duration: `${duration}ms`,
      });

      const errorResponse = new GitHubErrorResponse(
        'Failed to fetch languages metrics',
        error.message,
        undefined,
        requestId,
      );
      errorResponse.send(res);
    }
  },
};
