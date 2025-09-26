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

  async getProjectById(req: Request, res: Response): Promise<void> {
    const requestId = uuidv4();
    const startTime = Date.now();
    const { id } = req.params;

    try {
      //validate id parameter
      const projectId = parseInt(id);
      if (isNaN(projectId)) {
        const response = new GitHubErrorResponse(
          '40000',
          'Invalid project ID. Must be a number',
        );
        response.send(res);
        return;
      }

      //check cache first
      const cacheKey = `project:${projectId}`;
      let cachedProject = await cacheService.get<Project>(cacheKey);
      let cached = false;
      let rateLimitInfo: { remaining: number; reset: string } | undefined;

      if (!cachedProject) {
        //if not in cache, fetch from service
        cachedProject = await projectService.getProjectById(projectId);
        await cacheService.set(cacheKey, cachedProject, 3600);
        cached = false;
        rateLimitInfo = await getRateLimit();
      } else {
        cached = true;
        rateLimitInfo = undefined;
      }

      const response = new GitHubSuccessResponse(
        'Project fetched successfully',
        cachedProject,
        cached,
        rateLimitInfo,
        requestId,
        startTime,
      );
      response.send(res);

      const duration = Date.now() - startTime;
      Logger.info('Project by id request completed', {
        requestId,
        cached,
        duration: `${duration}ms`,
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      Logger.error('Project by id request failed', {
        requestId,
        error: error.message,
        duration: `${duration}ms`,
      });

      const errorResponse = new GitHubErrorResponse(
        'Failed to fetch project by id',
        error.message,
        undefined,
        requestId,
      );
      errorResponse.send(res);
      return;
    }
  },

  async getProjectsByLanguage(req: Request, res: Response): Promise<void> {
    const requestId = uuidv4();
    const startTime = Date.now();
    const { language } = req.params;

    try {
      // validate language parameter
      if (!language || language.trim() === '') {
        const response = new GitHubErrorResponse(
          '40000',
          'Language parameter is required',
        );
        response.send(res);
        return;
      }

      // check cache first
      const cacheKey = `projects:language:${language}`;
      let cachedProjects = await cacheService.get<Project[]>(cacheKey);
      let cached = false;
      let rateLimitInfo: { remaining: number; reset: string } | undefined;

      if (!cachedProjects) {
        // if not in cache, fetch from service
        cachedProjects = await projectService.getProjectsByLanguage(language);
        await cacheService.set(cacheKey, cachedProjects, 3600);
        cached = false;
        rateLimitInfo = await getRateLimit();
      } else {
        cached = true;
        rateLimitInfo = undefined;
      }

      const response = new GitHubSuccessResponse(
        'Projects fetched successfully',
        cachedProjects,
        cached,
        rateLimitInfo,
        requestId,
        startTime,
      );
      response.send(res);

      const duration = Date.now() - startTime;
      Logger.info('Projects by language request completed', {
        requestId,
        cached,
        duration: `${duration}ms`,
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      Logger.error('Projects by language request failed', {
        requestId,
        error: error.message,
        duration: `${duration}ms`,
      });

      const errorResponse = new GitHubErrorResponse(
        'Failed to fetch projects by language',
        error.message,
        undefined,
        requestId,
      );
      errorResponse.send(res);
      return;
    }
  },

  async searchProjects(req: Request, res: Response): Promise<void> {
    const requestId = uuidv4();
    const startTime = Date.now();
    const { query } = req.query;

    try {
      // validate query parameter
      if (!query || typeof query !== 'string' || query.trim() === '') {
        const response = new GitHubErrorResponse(
          '40000',
          'Search query is required',
        );
        response.send(res);
        return;
      }

      // check cache first
      const cacheKey = `projects:search:${query}`;
      let searchResults = await cacheService.get<Project[]>(cacheKey);
      let cached = false;
      let rateLimitInfo: { remaining: number; reset: string } | undefined;

      if (!searchResults) {
        // if not in cache, fetch from service
        searchResults = await projectService.getAllProjects();

        searchResults = searchResults.filter((project) => {
          const searchQuery = query.toLowerCase();
          const nameMatch = project.name.toLowerCase().includes(searchQuery);
          const descriptionMatch =
            project.description &&
            project.description.toLowerCase().includes(searchQuery);

          const technologiesMatch = project.technologies.some((tech) =>
            tech.toLowerCase().includes(searchQuery),
          );

          const searchCategories = project.categories.some((category) =>
            category.toLowerCase().includes(searchQuery),
          );
          const topicsMatch = project.topics?.some((topic) =>
            topic.toLowerCase().includes(searchQuery),
          );

          return (
            nameMatch ||
            descriptionMatch ||
            technologiesMatch ||
            searchCategories ||
            topicsMatch
          );
        });
        await cacheService.set(cacheKey, searchResults, 1800);
        cached = false;
        rateLimitInfo = await getRateLimit();
      } else {
        cached = true;
        rateLimitInfo = undefined;
      }

      const response = new GitHubSuccessResponse(
        'Projects search request completed',
        searchResults,
        cached,
        rateLimitInfo,
        requestId,
        startTime,
      );
      response.send(res);

      const duration = Date.now() - startTime;
      Logger.info('Projects search request completed', {
        requestId,
        cached,
        duration: `${duration}ms`,
        projectCount: searchResults?.length,
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      Logger.error('Projects search request failed', {
        requestId,
        error: error.message,
        duration: `${duration}ms`,
      });
    }
  },
};
