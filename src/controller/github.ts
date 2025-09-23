import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Logger from '../core/Logger';
import { cacheService } from '../service/cache.service';
import {
  ActivityFeed,
  GitHubActivity,
  GitHubOverview,
  GitHubProfile,
  GitHubRepository,
  GitHubStats,
} from '../types/github.types';
import {
  GitHubErrorResponse,
  GitHubSuccessResponse,
} from '../core/ApiResponse';
import { githubService } from '../service/github.service';
import { getRateLimit } from '../helpers/getRateLimit';

export const githubController = {
  async getProfile(req: Request, res: Response): Promise<void> {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      Logger.info('Github profile request started', { requestId });

      // try to get from cache first
      const cacheKey = 'github:profile';
      let profile = await cacheService.get<GitHubProfile>(cacheKey);
      let cached = false;
      let rateLimitInfo: { remaining: number; reset: string } | undefined;

      if (!profile) {
        // if not in cache, fetch from github api
        profile = await githubService.fetchProfile();
        //cache the result for 1 hour
        await cacheService.set(cacheKey, profile, 3600);
        cached = false;

        // only get rate limit info when making fresh api call
        rateLimitInfo = await getRateLimit();
      } else {
        cached = true;
        // For cached responses, omit rate limit info
        rateLimitInfo = undefined;
      }

      // build response
      const response = new GitHubSuccessResponse<GitHubProfile>(
        'Github profile fetched successfully',
        profile,
        cached,
        rateLimitInfo,
        requestId,
        startTime,
      );
      response.send(res);

      const duration = Date.now() - startTime;
      Logger.info('Github profile request completed', {
        requestId,
        cached,
        duration: `${duration}ms`,
        username: profile.login,
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      Logger.error('Github profile request failed', {
        requestId,
        error: error.message,
        duration: `${duration}ms`,
      });

      const errorResponse = new GitHubErrorResponse(
        'Failed to fetch github profile',
        error.message,
        undefined,
        requestId,
      );
      errorResponse.send(res);
    }
  },
};

export const getOverview = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const requestId = uuidv4();
  const startTime = Date.now();
  try {
    Logger.info('Github overview request started', requestId);

    const cacheKey = 'github:overview';
    let overview = await cacheService.get<GitHubOverview>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!overview) {
      overview = await githubService.getOverview();
      await cacheService.set(cacheKey, overview, 3600);
      cached = false;

      rateLimitInfo = await getRateLimit();
    } else {
      cached = true;
    }

    const response = new GitHubSuccessResponse<GitHubOverview>(
      'Github overview fetched successfully',
      overview,
      cached,
      rateLimitInfo,
      requestId,
      startTime,
    );
    response.send(res);

    const duration = Date.now() - startTime;
    Logger.info('Github overview request completed', {
      requestId,
      cached,
      duration: `${duration}ms`,
      username: overview.profile.login,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    Logger.error('Github overview request failed', {
      requestId,
      error: error.message,
      duration: `${duration}ms`,
    });

    const errorResponse = new GitHubErrorResponse(
      'Failed to fetch github overview',
      error.message,
      undefined,
      requestId,
    );
    errorResponse.send(res);
  }
};

export const getActivities = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const requestId = uuidv4();
  const startTime = Date.now();
  try {
    Logger.info('Github activities request started', requestId);

    const cacheKey = 'github:activities';
    let activities = await cacheService.get<GitHubActivity[]>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!activities) {
      activities = await githubService.fetchActivities();
      await cacheService.set(cacheKey, activities, 600);
      cached = false;

      rateLimitInfo = await getRateLimit();
    } else {
      cached = true;
      rateLimitInfo = undefined;
    }

    const activityFeed: ActivityFeed = {
      activities,
      totalCount: activities.length,
      lastUpdated: new Date().toISOString(),
    };

    const response = new GitHubSuccessResponse<ActivityFeed>(
      'Github activities fetched successfully',
      activityFeed,
      cached,
      rateLimitInfo,
      requestId,
      startTime,
    );
    response.send(res);

    const duration = Date.now() - startTime;
    Logger.info('Github activities request completed', {
      requestId,
      cached,
      duration: `${duration}ms`,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    Logger.error('Github activities request failed', {
      requestId,
      error: error.message,
      duration: `${duration}ms`,
    });

    const errorResponse = new GitHubErrorResponse(
      'Failed to fetch github activities',
      error.message,
      undefined,
      requestId,
    );
    errorResponse.send(res);
  }
};

export const getRepositories = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const requestId = uuidv4();
  const startTime = Date.now();
  try {
    Logger.info('Github repositories request started', requestId);

    const cacheKey = 'github:repositories';
    let repositories = await cacheService.get<GitHubRepository[]>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!repositories) {
      repositories = await githubService.fetchRepositories();
      await cacheService.set(cacheKey, repositories, 3600);
      cached = false;

      rateLimitInfo = await getRateLimit();
    } else {
      startTime;
      cached = true;
      rateLimitInfo = undefined;
    }

    const response = new GitHubSuccessResponse<GitHubRepository[]>(
      'Github repositories fetched successfully',
      repositories,
      cached,
      rateLimitInfo,
      requestId,
      startTime,
    );
    response.send(res);

    const duration = Date.now() - startTime;
    Logger.info('Github repositories request completed', {
      requestId,
      cached,
      duration: `${duration}ms`,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    Logger.error('Github repositories request failed', {
      requestId,
      error: error.message,
      duration: `${duration}ms`,
    });

    const errorResponse = new GitHubErrorResponse(
      'Failed to fetch github repositories',
      error.message,
      undefined,
      requestId,
    );
    errorResponse.send(res);
  }
};

export const getRepositoryByName = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const requestId = uuidv4();
  const startTime = Date.now();
  try {
    Logger.info('Github repository by name request started', requestId);

    const repoName = `${process.env.GITHUB_USERNAME}/${req.params.name}`;

    const cacheKey = `github:repository:${repoName}`;
    let repository = await cacheService.get<GitHubRepository>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!repository) {
      repository = await githubService.fetchRepositoryByName(repoName);
      await cacheService.set(cacheKey, repository, 3600);
      cached = false;

      rateLimitInfo = await getRateLimit();
    } else {
      cached = true;
      rateLimitInfo = undefined;
    }

    const response = new GitHubSuccessResponse<GitHubRepository>(
      'Github repository fetched successfully',
      repository,
      cached,
      rateLimitInfo,
      requestId,
      startTime,
    );
    response.send(res);

    const duration = Date.now() - startTime;
    Logger.info('Github repository request completed', {
      requestId,
      cached,
      duration: `${duration}ms`,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    Logger.error('Github repository request failed', {
      requestId,
      error: error.message,
      duration: `${duration}ms`,
    });
    const errorResponse = new GitHubErrorResponse(
      'Failed to fetch github repository',
      error.message,
      undefined,
      requestId,
    );
    errorResponse.send(res);
  }
};

export const getStats = async (req: Request, res: Response): Promise<void> => {
  const requestId = uuidv4();
  const startTime = Date.now();

  try {
    Logger.info('Github stats request started', requestId);
    const cacheKey = 'github:stats';
    let stats = await cacheService.get<GitHubStats>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    const repositories = await githubService.fetchRepositories();
    if (!stats) {
      stats = await githubService.calculateStats(repositories);
      await cacheService.set(cacheKey, stats, 3600);
      cached = false;

      rateLimitInfo = await getRateLimit();
    } else {
      cached = true;
      rateLimitInfo = undefined;
    }

    const response = new GitHubSuccessResponse<GitHubStats>(
      'Github stats fetched successfully',
      stats,
      cached,
      rateLimitInfo,
    );
    response.send(res);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    Logger.error('Github stats request failed', {
      requestId,
      error: error.message,
      duration: `${duration}ms`,
    });
  }
};
