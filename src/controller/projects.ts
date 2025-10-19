import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Logger from '../core/Logger';
import { projectService } from '../service/project.service';
import { cacheService } from '../service/cache.service';
import { Project } from '../types/project.types';
import { getRateLimit } from '../helpers/getRateLimit';
import {
  PortfolioSuccessResponse,
  GitHubErrorResponse,
} from '../core/ApiResponse';
import asyncHandler from '../helpers/asyncHandler';

export const getProjects = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidv4();
    const startTime = Date.now();

    Logger.info('Projects request started', { requestId });

    const cacheIsHealthy = await cacheService.isHealthy();
    if (!cacheIsHealthy) {
      throw new Error('Cache is not healthy');
    }

    const cacheKey = 'projects:all';
    let projects = await cacheService.get<Project[]>(cacheKey);

    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!projects) {
      projects = await projectService.getAllProjects();
      await cacheService.set(cacheKey, projects, 3600);
      cached = false;
      rateLimitInfo = await getRateLimit();
    } else {
      cached = true;
      rateLimitInfo = undefined;
    }

    const response = new PortfolioSuccessResponse(
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
  },
);

export const getFeaturedProjects = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidv4();
    const startTime = Date.now();

    Logger.info('Featured projects request started', { requestId });
    const isCacheHealthy = await cacheService.isHealthy();
    if (!isCacheHealthy) {
      throw new Error('Cache is not healthy');
    }

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

    const response = new PortfolioSuccessResponse(
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
  },
);

export const getProjectById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidv4();
    const startTime = Date.now();
    const { id } = req.params;

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

    const cacheKey = `project:${projectId}`;
    let cachedProject = await cacheService.get<Project>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!cachedProject) {
      cachedProject = await projectService.getProjectById(projectId);
      await cacheService.set(cacheKey, cachedProject, 3600);
      cached = false;
      rateLimitInfo = await getRateLimit();
    } else {
      cached = true;
      rateLimitInfo = undefined;
    }

    const response = new PortfolioSuccessResponse(
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
  },
);

export const getProjectsByLanguage = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidv4();
    const startTime = Date.now();
    const { language } = req.params;

    if (!language || language.trim() === '') {
      const response = new GitHubErrorResponse(
        '40000',
        'Language parameter is required',
      );
      response.send(res);
      return;
    }

    const cacheKey = `projects:language:${language}`;
    let cachedProjects = await cacheService.get<Project[]>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!cachedProjects) {
      cachedProjects = await projectService.getProjectsByLanguage(language);
      await cacheService.set(cacheKey, cachedProjects, 3600);
      cached = false;
      rateLimitInfo = await getRateLimit();
    } else {
      cached = true;
      rateLimitInfo = undefined;
    }

    const response = new PortfolioSuccessResponse(
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
  },
);

export const searchProjects = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestId = uuidv4();
    const startTime = Date.now();
    const { query } = req.query;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      const response = new GitHubErrorResponse(
        '40000',
        'Search query is required',
      );
      response.send(res);
      return;
    }

    const cacheKey = `projects:search:${query}`;
    let searchResults = await cacheService.get<Project[]>(cacheKey);
    let cached = false;
    let rateLimitInfo: { remaining: number; reset: string } | undefined;

    if (!searchResults) {
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

    const response = new PortfolioSuccessResponse(
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
  },
);
