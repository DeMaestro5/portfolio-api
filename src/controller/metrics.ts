import { Request, Response } from 'express';
import Logger from '../core/Logger';

import {
  ActivityMetric,
  CommitMetric,
  CommitSummary,
  ContributionsData,
  LanguageMetric,
  MetricsSummary,
  ProductivityMetrics,
  RepositoryMetric,
  RepositorySummary,
  StreakMetrics,
  TechnologiesData,
  TimelineMetrics,
} from '../types/metrics.types';
import { cacheService } from '../service/cache.service';
import { metricsService } from '../service/metrics.service';
import { PortfolioSuccessResponse } from '../core/ApiResponse';
import { v4 as uuidV4 } from 'uuid';
import asyncHandler from '../helpers/asyncHandler';

export const getLanguagesMetrics = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidV4();
    const startTime = Date.now();

    Logger.info('Languages request started', { requestId });

    await cacheService.del('metrics:languages');

    const cacheKey = 'metrics:languages';
    let languagesMetrics = await cacheService.get<LanguageMetric[]>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!languagesMetrics) {
      languagesMetrics = await metricsService.getLanguages();
      await cacheService.set(cacheKey, languagesMetrics, 60 * 60 * 24);
      cached = false;
    } else {
      cached = true;
      rateLimitInfo = undefined;
    }

    const response = new PortfolioSuccessResponse(
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
  },
);

export const getActivityMetrics = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidV4();
    const startTime = Date.now();

    Logger.info('Activity request started', { requestId });

    const cacheKey = 'metrics:activity';
    let activityMetrics = await cacheService.get<ActivityMetric>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!activityMetrics) {
      activityMetrics = await metricsService.getActivity();
      await cacheService.set(cacheKey, activityMetrics, 60 * 60 * 24);
      cached = false;
    } else {
      cached = true;
      rateLimitInfo = undefined;
    }

    const response = new PortfolioSuccessResponse(
      'Activity metrics fetched successfully',
      activityMetrics,
      cached,
      rateLimitInfo,
      requestId,
      startTime,
    );
    response.send(res);

    const duration = Date.now() - startTime;
    Logger.info('Activity request completed', {
      requestId,
      cached,
      duration: `${duration}ms`,
    });
  },
);

export const getCommitMetrics = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidV4();
    const startTime = Date.now();

    Logger.info('Commit request started', { requestId });

    const cacheKey = 'metrics:commit';
    let commitMetrics = await cacheService.get<{
      commitMetrics: CommitMetric[];
      commitSummary: CommitSummary;
    }>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!commitMetrics) {
      commitMetrics = await metricsService.getCommitActivity();
      await cacheService.set(cacheKey, commitMetrics, 60 * 60 * 24);
      cached = false;
    } else {
      cached = true;
      rateLimitInfo = undefined;
    }

    const response = new PortfolioSuccessResponse(
      'Commit metrics fetched successfully',
      commitMetrics,
      cached,
      rateLimitInfo,
      requestId,
      startTime,
    );
    response.send(res);

    const duration = Date.now() - startTime;
    Logger.info('Commit request completed', {
      requestId,
      cached,
      duration: `${duration}ms`,
    });
  },
);

export const getRepositoriesMetrics = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidV4();
    const startTime = Date.now();

    Logger.info('Repositories request started', { requestId });

    const cacheKey = 'metrics:repositories';
    let repositoriesMetrics = await cacheService.get<{
      repositories: RepositoryMetric[];
      summary: RepositorySummary;
    }>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!repositoriesMetrics) {
      repositoriesMetrics = await metricsService.getRepositoriesMetrics();
      await cacheService.set(cacheKey, repositoriesMetrics, 60 * 60 * 24);
      cached = false;
    } else {
      cached = true;
      rateLimitInfo = undefined;
    }

    const response = new PortfolioSuccessResponse(
      'Repositories metrics fetched successfully',
      repositoriesMetrics,
      cached,
      rateLimitInfo,
      requestId,
      startTime,
    );
    response.send(res);

    const duration = Date.now() - startTime;
    Logger.info('Repositories request completed', {
      requestId,
      cached,
      duration: `${duration}ms`,
    });
  },
);

export const getContributionsMetrics = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidV4();
    const startTime = Date.now();

    Logger.info('Contributions request started', { requestId });

    const cacheKey = 'metrics:contributions';
    let contributionsMetrics =
      await cacheService.get<ContributionsData>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!contributionsMetrics) {
      contributionsMetrics = await metricsService.getContributionsMetrics();
      await cacheService.set(cacheKey, contributionsMetrics, 60 * 60 * 24);
      cached = false;
    } else {
      cached = true;
      rateLimitInfo = undefined;
    }

    const response = new PortfolioSuccessResponse(
      'Contributions metrics fetched successfully',
      contributionsMetrics,
      cached,
      rateLimitInfo,
      requestId,
      startTime,
    );
    response.send(res);

    const duration = Date.now() - startTime;
    Logger.info('Contributions request completed', {
      requestId,
      cached,
      duration: `${duration}ms`,
    });
  },
);

export const getProductivityMetrics = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidV4();
    const startTime = Date.now();

    Logger.info('Productivity request started', { requestId });

    const cacheKey = 'metrics:productivity';
    let productivityMetrics =
      await cacheService.get<ProductivityMetrics>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!productivityMetrics) {
      productivityMetrics = await metricsService.getProductivityMetrics();
      await cacheService.set(cacheKey, productivityMetrics, 60 * 60 * 24);
      cached = false;
    } else {
      cached = true;
      rateLimitInfo = undefined;
    }

    const response = new PortfolioSuccessResponse(
      'Productivity metrics fetched successfully',
      productivityMetrics,
      cached,
      rateLimitInfo,
      requestId,
      startTime,
    );
    response.send(res);

    const duration = Date.now() - startTime;
    Logger.info('Productivity request completed', {
      requestId,
      cached,
      duration: `${duration}ms`,
    });
  },
);

export const getTechnologiesMetrics = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidV4();
    const startTime = Date.now();

    Logger.info('Technologies request started', { requestId });

    const cacheKey = 'metrics:technologies';
    let technologiesMetrics =
      await cacheService.get<TechnologiesData>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!technologiesMetrics) {
      technologiesMetrics = await metricsService.getTechnologiesMetrics();
      await cacheService.set(cacheKey, technologiesMetrics, 60 * 60 * 24);
      cached = false;
    } else {
      cached = true;
      rateLimitInfo = undefined;
    }

    const response = new PortfolioSuccessResponse(
      'Technologies metrics fetched successfully',
      technologiesMetrics,
      cached,
      rateLimitInfo,
      requestId,
      startTime,
    );
    response.send(res);

    const duration = Date.now() - startTime;
    Logger.info('Technologies request completed', {
      requestId,
      cached,
      duration: `${duration}ms`,
    });
  },
);

export const getStreakMetrics = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidV4();
    const startTime = Date.now();

    Logger.info('Streak request started', { requestId });

    const cacheKey = 'metrics:streak';
    let streakMetrics = await cacheService.get<StreakMetrics>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!streakMetrics) {
      streakMetrics = await metricsService.getStreakMetrics();
      await cacheService.set(cacheKey, streakMetrics, 60 * 60 * 24);
      cached = false;
    } else {
      cached = true;
      rateLimitInfo = undefined;
    }

    const response = new PortfolioSuccessResponse(
      'Streak metrics fetched successfully',
      streakMetrics,
      cached,
      rateLimitInfo,
      requestId,
      startTime,
    );
    response.send(res);

    const duration = Date.now() - startTime;
    Logger.info('Streak request completed', {
      requestId,
      cached,
      duration: `${duration}ms`,
    });
  },
);

export const getMetricsSummary = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidV4();
    const startTime = Date.now();

    Logger.info('Metrics summary request started', { requestId });

    const cacheKey = 'metrics:summary';
    let summary = await cacheService.get<MetricsSummary>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!summary) {
      summary = await metricsService.getMetricsSummary();
      await cacheService.set(cacheKey, summary, 60 * 60 * 24);
      cached = false;
    } else {
      cached = true;
      rateLimitInfo = undefined;
    }

    const response = new PortfolioSuccessResponse(
      'Metrics summary fetched successfully',
      summary,
      cached,
      rateLimitInfo,
      requestId,
      startTime,
    );
    response.send(res);

    const duration = Date.now() - startTime;
    Logger.info('Metrics summary request completed', {
      requestId,
      cached,
      duration: `${duration}ms`,
    });
  },
);

export const getTimelineMetrics = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidV4();
    const startTime = Date.now();

    Logger.info('Timeline request started', { requestId });

    const cacheKey = 'metrics:timeline';
    let timelineMetrics = await cacheService.get<TimelineMetrics>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!timelineMetrics) {
      timelineMetrics = await metricsService.getTimelineMetrics();
      await cacheService.set(cacheKey, timelineMetrics, 60 * 60 * 24);
      cached = false;
    } else {
      cached = true;
      rateLimitInfo = undefined;
    }

    const response = new PortfolioSuccessResponse(
      'Timeline metrics fetched successfully',
      timelineMetrics,
      cached,
      rateLimitInfo,
      requestId,
      startTime,
    );
    response.send(res);

    const duration = Date.now() - startTime;
    Logger.info('Timeline request completed', {
      requestId,
      cached,
      duration: `${duration}ms`,
    });
  },
);
