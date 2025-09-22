import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Logger from '../core/Logger';
import { cacheService } from '../service/cache.service';
import { GitHubProfile } from '../types/github.types';
import {
  GitHubErrorResponse,
  GitHubSuccessResponse,
} from '../core/ApiResponse';
import { githubService } from '../service/github.service';

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

      if (!profile) {
        // if not in cache, fetch from github api
        profile = await githubService.fetchProfile();
        //cache the result for 1 hour
        await cacheService.set(cacheKey, profile, 3600);
        cached = false;
      } else {
        cached = true;
      }
      // build response
      const response = new GitHubSuccessResponse<GitHubProfile>(
        'Github profile fetched successfully',
        profile,
        cached,
        {
          remaining: 60,
          reset: new Date(Date.now() + 60000).toISOString(),
        },
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
