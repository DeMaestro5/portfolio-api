import {
  Project,
  ProjectCategory,
  ProjectStatus,
} from '../types/project.types';
import { GitHubRepository } from '../types/github.types';
import { githubService } from './github.service';
import Logger from '../core/Logger';

class ProjectService {
  async getAllProjects(): Promise<Project[]> {
    try {
      Logger.info('Fetching all projects');
      // get all repositories from github
      const repositories = await githubService.fetchRepositories();
      Logger.info(`Fetched ${repositories.length} repositories from GitHub`);

      // filter repositories to only include projects
      const projectRepos = this.filterRepositories(repositories);
      Logger.info(`Filtered to ${projectRepos.length} projects repository`);

      // transform repositories to projects
      const projects = projectRepos.map((repo) =>
        this.mapRepositoryToProject(repo),
      );
      Logger.info(`Transformed to ${projects.length} projects`);
      return projects;
    } catch (error) {
      Logger.error('Error fetching projects', error);
      throw error;
    }
  }

  private filterRepositories(
    repositories: GitHubRepository[],
  ): GitHubRepository[] {
    return repositories.filter((repo) => {
      // filter out private repositories and forks
      return !repo.is_private && !repo.name.includes('fork');
    });
  }

  private mapRepositoryToProject(repo: GitHubRepository): Project {
    return {
      id: repo.id,
      name: repo.name,
      description: repo.description,
      html_url: repo.html_url,
      language: repo.language,
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count,
      created_at: repo.created_at,
      updated_at: repo.updated_at,
      pushed_at: repo.pushed_at,
      topics: repo.topics,

      categories: this.determineCategories(repo),
      status: this.determineStatus(repo),
      featured: this.determineFeatured(repo),
      technologies: this.determineTechnologies(repo),
    };
  }

  private determineCategories(repo: GitHubRepository): ProjectCategory[] {
    const categories: ProjectCategory[] = [];

    // check topics for category indicators
    if (repo.topics) {
      // frontend indicators
      if (
        repo.topics.some((topic) =>
          ['react', 'vue', 'angular', 'frontend', 'ui', 'client'].includes(
            topic.toLocaleLowerCase(),
          ),
        )
      ) {
        categories.push('web-frontend');
      }
      // backend indicators
      if (
        repo.topics.some((topic) =>
          [
            'api',
            'backend',
            'server',
            'express',
            'node',
            'fastapi',
            'nestjs',
          ].includes(topic.toLocaleLowerCase()),
        )
      ) {
        categories.push('backend');
      }
      //full stack indicators
      if (
        repo.topics.some((topic) =>
          ['fullstack', 'full-stack', 'mern', 'mean', 'nextjs'].includes(
            topic.toLocaleLowerCase(),
          ),
        )
      ) {
        categories.push('fullstack');
      }
      // mobile indicators
      if (
        repo.topics.some((topic) =>
          [
            'mobile',
            'ios',
            'android',
            'flutter',
            'react-native',
            'swift',
            'kotlin',
          ].includes(topic.toLocaleLowerCase()),
        )
      ) {
        categories.push('mobile');
      }
      // desktop indicators
      if (
        repo.topics.some((topic) =>
          ['desktop', 'electron', 'windows', 'macos', 'linux'].includes(
            topic.toLocaleLowerCase(),
          ),
        )
      ) {
        categories.push('desktop');
      }
    }

    // check language for additional signals
    if (repo.language) {
      if (['TypeScript', 'JavaScript', 'CSS', 'HTML'].includes(repo.language)) {
        if (!categories.includes('web-frontend')) {
          categories.push('web-frontend');
        }
      }
    }
    return categories.length > 0 ? categories : ['other'];
  }

  private determineStatus(repo: GitHubRepository): ProjectStatus {
    const now = new Date();
    const pushedAt = repo.pushed_at ? new Date(repo.pushed_at) : null;

    // calculate days since last push
    const daysSinceLastPush = pushedAt
      ? Math.floor((now.getTime() - pushedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // determine status based on activity

    if (daysSinceLastPush === null) {
      return 'inactive';
    }

    if (daysSinceLastPush <= 7) {
      return 'active';
    } else if (daysSinceLastPush <= 30) {
      return 'in development';
    } else if (daysSinceLastPush <= 90) {
      return 'inactive';
    } else if (daysSinceLastPush <= 365) {
      return 'archived';
    } else {
      return 'completed';
    }
  }

  private determineFeatured(repo: GitHubRepository): boolean {
    // Featured criteria
    const hasStars = repo.stargazers_count && repo.stargazers_count > 0;
    const hasForks = repo.forks_count && repo.forks_count > 0;
    const hasDescription = repo.description && repo.description.length > 5;
    const hasTopics = repo.topics && repo.topics.length > 0;
    const isRecent =
      repo.pushed_at &&
      new Date(repo.pushed_at) >
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Featured if it meets multiple criteria
    const criteria = [hasStars, hasForks, hasDescription, hasTopics, isRecent];
    const metCriteria = criteria.filter(Boolean).length;
    return metCriteria >= 1;
  }

  private determineTechnologies(repo: GitHubRepository): string[] {
    const technologies: string[] = [];

    // Add primary language
    if (repo.language) {
      technologies.push(repo.language);
    }
    // Add topics
    if (repo.topics) {
      const techTopics = repo.topics.filter(
        (topic) =>
          // filter out non-tech topics
          ![
            'web',
            'mobile',
            'desktop',
            'backend',
            'frontend',
            'fullstack',
          ].includes(topic.toLocaleLowerCase()),
      );
      technologies.push(...techTopics);
    }
    //remove duplicates
    return Array.from(new Set(technologies));
  }

  public async getFeaturedProjects(): Promise<Project[]> {
    try {
      Logger.info('Fetching featured projects');
      const projects = await this.getAllProjects();
      const featuredProjects = projects.filter((project) => project.featured);
      Logger.info(`Found ${featuredProjects.length} featured projects`);
      return featuredProjects;
    } catch (error) {
      Logger.error('Error fetching featured projects', error);
      throw error;
    }
  }

  public async getProjectById(id: number): Promise<Project> {
    try {
      Logger.info('Fetching project by id', { id });

      const repository = await githubService.fetchRepositoryById(id);
      //check if it passes the filtering criteria
      if (this.filterRepositories([repository]).length === 0) {
        throw new Error(
          `Project with ID ${id} does not meet the filtering criteria`,
        );
      }
      // transform to project object
      const project: Project = {
        id: repository.id,
        name: repository.name,
        description: repository.description,
        html_url: repository.html_url,
        language: repository.language,
        stargazers_count: repository.stargazers_count,
        forks_count: repository.forks_count,
        created_at: repository.created_at,
        updated_at: repository.updated_at,
        pushed_at: repository.pushed_at,
        topics: repository.topics,
        categories: this.determineCategories(repository),
        status: this.determineStatus(repository),
        featured: this.determineFeatured(repository),
        technologies: this.determineTechnologies(repository),
      };

      Logger.info('Project fetched successfully', {
        id,
        name: project.name,
      });
      return project;
    } catch (error) {
      Logger.error('Error fetching project by id', error);
      throw error;
    }
  }

  public async getProjectsByLanguage(language: string): Promise<Project[]> {
    try {
      Logger.info('Fetching projects by language', { language });
      const repositories =
        await githubService.fetchRepositoriesByLanguage(language);

      if (repositories.length === 0) {
        Logger.info('No repositories found for language', { language });
        return [];
      }

      const filteredRepos = this.filterRepositories(repositories);

      const projects: Project[] = filteredRepos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        description: repo.description,
        html_url: repo.html_url,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        pushed_at: repo.pushed_at,
        topics: repo.topics,
        categories: this.determineCategories(repo),
        status: this.determineStatus(repo),
        featured: this.determineFeatured(repo),
        technologies: this.determineTechnologies(repo),
      }));

      Logger.info('Projects fetched successfully', {
        projects: projects.length,
      });
      return projects;
    } catch (error) {
      Logger.error('Error fetching projects by language', error);
      throw error;
    }
  }
}

export const projectService = new ProjectService();
