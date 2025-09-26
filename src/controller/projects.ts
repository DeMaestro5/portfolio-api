import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Logger from '../core/Logger';
import { projectService } from '../service/project.service';
import { cacheService } from '../service/cache.service';
import { Project } from '../types/project.types';
import { getRateLimit } from '../helpers/getRateLimit';
import {
  GitHubSuccessResponse,
  GitHubErrorResponse,
} from '../core/ApiResponse';

export const projectsController = {
  async getProjects(req: Request, res: Response): Promise<void> {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      Logger.info('Projects request started', { requestId });

      // check if cache is healthy
      const cacheIsHealthy = await cacheService.isHealthy();
      if (!cacheIsHealthy) {
        throw new Error('Cache is not healthy');
      }

      // try to get from cache first
      const cacheKey = 'projects:all';
      let projects = await cacheService.get<Project[]>(cacheKey);

      let cached = false;
      let rateLimitInfo: { remaining: number; reset: string } | undefined;

      if (!projects) {
        // if not in cache, fetch from service
        projects = await projectService.getAllProjects();
        await cacheService.set(cacheKey, projects, 3600);
        cached = false;
        rateLimitInfo = await getRateLimit();
      } else {
        cached = true;
        rateLimitInfo = undefined;
      }

      const response = new GitHubSuccessResponse(
        'Projects fetched successfully',
        projects,
        cached,
        rateLimitInfo,
        requestId,
        startTime,
      );
      response.send(res);

      // Log completion
      const duration = Date.now() - startTime;
      Logger.info('Projects request completed', {
        requestId,
        cached,
        duration: `${duration}ms`,
        projectCount: projects?.length,
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      Logger.error('Projects request failed', {
        requestId,
        error: error.message,
        duration: `${duration}ms`,
      });

      const errorResponse = new GitHubErrorResponse(
        'Failed to fetch projects',
        error.message,
        undefined,
        requestId,
      );
      errorResponse.send(res);
    }
  },

  async getFeaturedProjects(req: Request, res: Response): Promise<void> {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      Logger.info('Featured projects request started', { requestId });
      const isCacheHealthy = await cacheService.isHealthy();
      if (!isCacheHealthy) {
        throw new Error('Cache is not healthy');
      }

      await cacheService.clearProjectCache();

      const cacheKey = 'projects:featured';
      let featuredProjects = await cacheService.get<Project[]>(cacheKey);

      let cached = false;
      let rateLimitInfo: { remaining: number; reset: string } | undefined;

      if (!featuredProjects) {
        featuredProjects = await projectService.getFeaturedProjects();
        await cacheService.set(cacheKey, featuredProjects, 3600);
        cached = false;
        rateLimitInfo = await getRateLimit();
      } else {
        cached = true;
        rateLimitInfo = undefined;
      }

      const response = new GitHubSuccessResponse(
        'Featured projects fetched successfully',
        featuredProjects,
        cached,
        rateLimitInfo,
        requestId,
        startTime,
      );
      response.send(res);

      const duration = Date.now() - startTime;
      Logger.info('Featured projects request completed', {
        requestId,
        cached,
        duration: `${duration}ms`,
        projectCount: featuredProjects?.length,
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      Logger.error('Featured projects request failed', {
        requestId,
        error: error.message,
        duration: `${duration}ms`,
      });

      const errorResponse = new GitHubErrorResponse(
        'Failed to fetch featured projects',
        error.message,
        undefined,
        requestId,
      );
      errorResponse.send(res);
    }
  },
};
