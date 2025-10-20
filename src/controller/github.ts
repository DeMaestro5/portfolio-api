import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Logger from '../core/Logger';
import { cacheService } from '../service/cache.service';
import {
  ActivityFeed,
  GitHubActivity,
  GitHubCommit,
  GitHubContributor,
  GitHubEvents,
  GitHubLanguage,
  GitHubOverview,
  GitHubProfile,
  GitHubRepository,
  GitHubStats,
  SyncResult,
} from '../types/github.types';
import { PortfolioSuccessResponse } from '../core/ApiResponse';
import { githubService } from '../service/github.service';
import { getRateLimit } from '../helpers/getRateLimit';
import { syncService } from '../service/sync.service';
import { verifyWebhookSignature } from '../helpers/webhookSecurity';
import { processWebhookEvent } from '../helpers/webhookHandler';
import asyncHandler from '../helpers/asyncHandler';

export const getProfile = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidv4();
    const startTime = Date.now();

    Logger.info('Github profile request started', { requestId });

    const cacheKey = 'github:profile';
    let profile = await cacheService.get<GitHubProfile>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!profile) {
      profile = await githubService.fetchProfile();
      await cacheService.set(cacheKey, profile, 3600);
      cached = false;
      rateLimitInfo = await getRateLimit();
    } else {
      cached = true;
      rateLimitInfo = undefined;
    }

    const response = new PortfolioSuccessResponse<GitHubProfile>(
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
  },
);

export const getOverview = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidv4();
    const startTime = Date.now();

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

    const response = new PortfolioSuccessResponse<GitHubOverview>(
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
  },
);

export const getActivities = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidv4();
    const startTime = Date.now();

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

    const response = new PortfolioSuccessResponse<ActivityFeed>(
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
  },
);

export const getRepositories = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidv4();
    const startTime = Date.now();

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

    const response = new PortfolioSuccessResponse<GitHubRepository[]>(
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
  },
);

export const getRepositoriesPaginated = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidv4();
    const startTime = Date.now();

    const page = parseInt(req.query.page as string) || 1;
    const perPage = Math.min(parseInt(req.query.perPage as string) || 10, 50);

    Logger.info('Github repositories paginated request started', {
      requestId,
      page,
      perPage,
    });

    const cacheKey = `github:repositories:page:${page}:perPage:${perPage}`;
    let result = await cacheService.get<{
      repositories: GitHubRepository[];
      hasMore: boolean;
      totalCount: number;
    }>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!result) {
      result = await githubService.fetchRepositoriesPaginated(page, perPage);
      await cacheService.set(cacheKey, result, 3600);
      cached = false;
      rateLimitInfo = await getRateLimit();
    } else {
      cached = true;
      rateLimitInfo = undefined;
    }

    const response = new PortfolioSuccessResponse(
      'Github repositories fetched successfully',
      {
        ...result,
        pagination: {
          page,
          perPage,
          hasMore: result.hasMore,
          totalCount: result.totalCount,
        },
        cached,
        rateLimitInfo,
        requestId,
        startTime,
      },
    );
    response.send(res);

    const duration = Date.now() - startTime;
    Logger.info('Github repositories paginated request completed', {
      requestId,
      cached,
      duration: `${duration}ms`,
      repositoryCount: result.repositories.length,
      page,
      perPage,
    });
  },
);

export const getRepositoryByName = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidv4();
    const startTime = Date.now();

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

    const response = new PortfolioSuccessResponse<GitHubRepository>(
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
  },
);

export const getStats = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidv4();
    const startTime = Date.now();

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

    const response = new PortfolioSuccessResponse<GitHubStats>(
      'Github stats fetched successfully',
      stats,
      cached,
      rateLimitInfo,
      requestId,
      startTime,
    );
    response.send(res);
  },
);

export const getRepositoryCommits = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const requestId = uuidv4();
  const startTime = Date.now();
  try {
    Logger.info('Github repository commits request started', requestId);
    const repoName = `${process.env.GITHUB_USERNAME}/${req.params.name}`;
    const cacheKey = `github:repository:${repoName}/commits`;
    let commits = await cacheService.get<GitHubCommit[]>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!commits) {
      commits = await githubService.fetchRepositoryCommits(repoName);
      await cacheService.set(cacheKey, commits, 3600);
      cached = false;
    } else {
      cached = true;
      rateLimitInfo = undefined;
    }

    const response = new PortfolioSuccessResponse<GitHubCommit[]>(
      'Github repository commits fetched successfully',
      commits,
      cached,
      rateLimitInfo,
      requestId,
      startTime,
    );
    response.send(res);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    Logger.error('Github repository commits request failed', {
      requestId,
      error: error.message,
      duration: `${duration}ms`,
    });
  }
};

export const getRepositoryLanguages = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidv4();
    const startTime = Date.now();

    Logger.info('Github repository languages request started', requestId);
    const repoName = `${process.env.GITHUB_USERNAME}/${req.params.name}`;
    const cacheKey = `github:repository:${repoName}/languages`;
    let languages = await cacheService.get<GitHubLanguage[]>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!languages) {
      languages = await githubService.fetchRepositoryLanguages(repoName);
      await cacheService.set(cacheKey, languages, 3600);
      cached = false;
    } else {
      cached = true;
      rateLimitInfo = undefined;
    }

    const response = new PortfolioSuccessResponse<GitHubLanguage[]>(
      'Github repository languages fetched successfully',
      languages,
      cached,
      rateLimitInfo,
      requestId,
      startTime,
    );
    response.send(res);
  },
);

export const getRepositoryContributors = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidv4();
    const startTime = Date.now();

    Logger.info('Github repository contributors request started', requestId);
    const repoName = `${process.env.GITHUB_USERNAME}/${req.params.name}`;
    const cacheKey = `github:repository:${repoName}/contributors`;
    let contributors = await cacheService.get<GitHubContributor[]>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!contributors) {
      contributors = await githubService.fetchRepositoryContributors(repoName);
      await cacheService.set(cacheKey, contributors, 3600);
      cached = false;
    } else {
      cached = true;
      rateLimitInfo = undefined;
    }

    const response = new PortfolioSuccessResponse<GitHubContributor[]>(
      'Github repository contributors fetched successfully',
      contributors,
      cached,
      rateLimitInfo,
      requestId,
      startTime,
    );
    response.send(res);

    const duration = Date.now() - startTime;
    Logger.info('Github repository contributors request completed', {
      requestId,
      cached,
      duration: `${duration}ms`,
    });
  },
);

export const getEvents = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidv4();
    const startTime = Date.now();

    Logger.info('Github events request started', requestId);
    const cacheKey = 'github:events';
    let events = await cacheService.get<GitHubEvents[]>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!events) {
      events = await githubService.fetchEvents();
      await cacheService.set(cacheKey, events, 3600);
      cached = false;
    } else {
      cached = true;
      rateLimitInfo = undefined;
    }

    const response = new PortfolioSuccessResponse<GitHubEvents[]>(
      'Github events fetched successfully',
      events,
      cached,
      rateLimitInfo,
      requestId,
      startTime,
    );
    response.send(res);

    const duration = Date.now() - startTime;
    Logger.info('Github events request completed', {
      requestId,
      cached,
      duration: `${duration}ms`,
    });
  },
);

export const syncGitHubData = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidv4();
    const startTime = Date.now();

    Logger.info('Github data sync request started', requestId);
    const syncResult = await syncService.syncAllUserData();

    const response = new PortfolioSuccessResponse<SyncResult>(
      'Github data sync completed successfully',
      syncResult,
      false,
      undefined,
      requestId,
      startTime,
    );
    response.send(res);
  },
);

export const handleGithubWebhook = asyncHandler(
  async (req: Request, res: Response) => {
    const requestId = uuidv4();
    const startTime = Date.now();

    const signature = (req.headers['x-hub-signature-256'] as string) || '';

    let payload: Buffer;
    if ((req as any).rawBody) {
      payload = (req as any).rawBody as Buffer;
    } else {
      const bodyString = JSON.stringify(req.body);
      payload = Buffer.from(bodyString, 'utf8');
    }

    if (!signature || !payload) {
      return res.status(400).json({ message: 'Missing signature or payload' });
    }

    if (!verifyWebhookSignature(payload, signature)) {
      Logger.warn('Invalid Webhook Signature', { requestId });
      return res.status(401).json({
        message: 'Invalid Webhook Signature',
      });
    }

    const eventType = req.headers['x-github-event'] as string;
    const eventPayload = req.body;

    Logger.info('Github webhook received', {
      requestId,
      eventType,
      repository: eventPayload.repository?.name,
    });

    await processWebhookEvent(eventType, eventPayload);

    res.status(200).json({
      message: 'Webhook processed successfully',
    });

    const duration = Date.now() - startTime;
    Logger.info('Github webhook processed', {
      requestId,
      duration: `${duration}ms`,
    });
  },
);
