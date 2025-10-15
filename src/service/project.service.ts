import {
  Project,
  ProjectCategory,
  ProjectStatus,
  RelatedProject,
} from '../types/project.types';
import { GitHubRepository, GitHubCommit } from '../types/github.types';
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

      // Fetch commits for this specific project
      const commits = await this.fetchProjectCommits(repository);

      // Get complete tech stack (builtWith)
      const builtWith = await this.getCompleteTechStack(repository);

      // Extract key features from commits and repository data
      const keyFeatures = this.extractKeyFeaturesFromCommits(
        commits,
        repository,
      );

      // Find related projects
      const relatedProjects = await this.findRelatedProjects(repository);

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
        technologies: builtWith,
        commits: commits,
        builtWith: builtWith,
        keyFeatures: keyFeatures,
        relatedProjects: relatedProjects,
      };

      Logger.info('Project fetched successfully', {
        id,
        name: project.name,
        commitsCount: commits.length,
        technologiesCount: builtWith.length,
        featuresCount: keyFeatures.length,
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

  private async fetchProjectCommits(
    repository: GitHubRepository,
  ): Promise<GitHubCommit[]> {
    try {
      Logger.info('Fetching commits for project', {
        projectName: repository.name,
      });

      const commits = await githubService.fetchRepositoryCommitsByProject(
        repository,
        100,
      );

      Logger.info('Commits fetched successfully', {
        projectName: repository.name,
        commitsCount: commits.length,
      });
      return commits;
    } catch (error) {
      Logger.warn('Failed to fetch commits for project', {
        projectName: repository.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return []; // Return empty array if commits can't be fetched
    }
  }

  private extractKeyFeaturesFromCommits(
    commits: GitHubCommit[],
    repository: GitHubRepository,
  ): string[] {
    const featureCounts = new Map<string, number>();

    // 1. Analyze commit messages for features
    commits.forEach((commit) => {
      const message = commit.message.toLowerCase();

      // Feature patterns from commit messages
      const featurePatterns = [
        // Authentication & User Management
        {
          pattern:
            /(?:add|implement|create|build).*?(?:auth|login|signup|register)/i,
          feature: 'Authentication',
        },
        {
          pattern: /(?:add|implement|create).*?(?:user|profile|account)/i,
          feature: 'User Management',
        },
        {
          pattern: /(?:add|implement|create).*?(?:jwt|token|session)/i,
          feature: 'JWT Authentication',
        },
        {
          pattern:
            /(?:add|implement|create).*?(?:oauth|google|facebook|github)/i,
          feature: 'OAuth Login',
        },

        // UI/UX Features
        {
          pattern:
            /(?:add|implement|create|design).*?(?:responsive|mobile|responsive design)/i,
          feature: 'Responsive Design',
        },
        {
          pattern:
            /(?:add|implement|create).*?(?:dark mode|dark theme|light mode)/i,
          feature: 'Dark Mode',
        },
        {
          pattern:
            /(?:add|implement|create).*?(?:theme|customizable|customization)/i,
          feature: 'Customizable',
        },
        {
          pattern: /(?:add|implement|create).*?(?:ui|ux|interface|design)/i,
          feature: 'User Interface',
        },

        // Data & API Features
        {
          pattern: /(?:add|implement|create|build).*?(?:api|endpoint|route)/i,
          feature: 'API',
        },
        {
          pattern:
            /(?:add|implement|create).*?(?:crud|create|read|update|delete)/i,
          feature: 'CRUD Operations',
        },
        {
          pattern: /(?:add|implement|create).*?(?:search|filter|sort)/i,
          feature: 'Search & Filter',
        },
        {
          pattern: /(?:add|implement|create).*?(?:pagination|page|limit)/i,
          feature: 'Pagination',
        },
        {
          pattern: /(?:add|implement|create).*?(?:database|db|data)/i,
          feature: 'Database',
        },

        // E-commerce Features
        {
          pattern: /(?:add|implement|create).*?(?:cart|shopping|basket)/i,
          feature: 'Shopping Cart',
        },
        {
          pattern:
            /(?:add|implement|create).*?(?:payment|checkout|stripe|paypal)/i,
          feature: 'Payment',
        },
        {
          pattern: /(?:add|implement|create).*?(?:order|purchase|buy)/i,
          feature: 'Order Management',
        },
        {
          pattern: /(?:add|implement|create).*?(?:product|catalog|inventory)/i,
          feature: 'Product Catalog',
        },

        // Real-time Features
        {
          pattern:
            /(?:add|implement|create).*?(?:websocket|socket|real-time|live)/i,
          feature: 'Real-Time',
        },
        {
          pattern: /(?:add|implement|create).*?(?:notification|alert|push)/i,
          feature: 'Notifications',
        },
        {
          pattern: /(?:add|implement|create).*?(?:chat|messaging|message)/i,
          feature: 'Chat',
        },

        // Performance & Optimization
        {
          pattern: /(?:add|implement|create|optimize).*?(?:cache|caching)/i,
          feature: 'Caching',
        },
        {
          pattern:
            /(?:add|implement|create|optimize).*?(?:performance|speed|fast)/i,
          feature: 'Performance',
        },
        {
          pattern:
            /(?:add|implement|create).*?(?:lazy loading|code splitting)/i,
          feature: 'Lazy Loading',
        },

        // Admin & Management
        {
          pattern: /(?:add|implement|create).*?(?:admin|dashboard|panel)/i,
          feature: 'Admin Panel',
        },
        {
          pattern: /(?:add|implement|create).*?(?:role|permission|access)/i,
          feature: 'Role-Based Access',
        },
        {
          pattern:
            /(?:add|implement|create).*?(?:settings|config|configuration)/i,
          feature: 'Settings',
        },

        // Content & Media
        {
          pattern: /(?:add|implement|create).*?(?:upload|file|image|media)/i,
          feature: 'File Upload',
        },
        {
          pattern: /(?:add|implement|create).*?(?:gallery|photo|video)/i,
          feature: 'Media Gallery',
        },
        {
          pattern: /(?:add|implement|create).*?(?:cms|content management)/i,
          feature: 'Content Management',
        },

        // Social Features
        {
          pattern: /(?:add|implement|create).*?(?:comment|like|follow|share)/i,
          feature: 'Social Features',
        },
        {
          pattern: /(?:add|implement|create).*?(?:collaboration|team|group)/i,
          feature: 'Collaboration',
        },

        // Testing & Quality
        {
          pattern: /(?:add|implement|create).*?(?:test|testing|spec)/i,
          feature: 'Testing',
        },
        {
          pattern: /(?:add|implement|create).*?(?:validation|validate)/i,
          feature: 'Validation',
        },

        // Security
        {
          pattern: /(?:add|implement|create).*?(?:security|secure|encrypt)/i,
          feature: 'Security',
        },
        {
          pattern: /(?:add|implement|create).*?(?:rate limit|throttle)/i,
          feature: 'Rate Limiting',
        },

        // Analytics & Monitoring
        {
          pattern: /(?:add|implement|create).*?(?:analytics|tracking|metrics)/i,
          feature: 'Analytics',
        },
        {
          pattern: /(?:add|implement|create).*?(?:logging|log|monitor)/i,
          feature: 'Logging',
        },
        {
          pattern: /(?:add|implement|create).*?(?:dashboard|report)/i,
          feature: 'Dashboard',
        },
      ];

      featurePatterns.forEach(({ pattern, feature }) => {
        if (pattern.test(message)) {
          featureCounts.set(feature, (featureCounts.get(feature) || 0) + 1);
        }
      });
    });

    // 2. Add features from repository description as fallback
    if (repository.description) {
      const description = repository.description.toLowerCase();
      const descriptionFeatures = [
        'responsive design',
        'authentication',
        'api',
        'database',
        'real-time',
        'shopping cart',
        'payment',
        'admin panel',
        'user management',
        'search',
        'notifications',
        'chat',
        'file upload',
        'analytics',
        'dashboard',
      ];

      descriptionFeatures.forEach((feature) => {
        if (description.includes(feature) && !featureCounts.has(feature)) {
          featureCounts.set(feature, 1);
        }
      });
    }

    // 3. Add features from topics (non-tech topics only)
    if (repository.topics) {
      const featureTopics = repository.topics.filter((topic) => {
        const lowerTopic = topic.toLowerCase();
        const techKeywords = [
          'web',
          'mobile',
          'desktop',
          'backend',
          'frontend',
          'fullstack',
          'react',
          'vue',
          'angular',
          'node',
          'express',
          'mongodb',
          'postgresql',
          'typescript',
          'javascript',
          'python',
          'java',
          'php',
          'ruby',
          'docker',
          'kubernetes',
          'aws',
          'azure',
          'gcp',
          'heroku',
          'html',
          'css',
          'sass',
          'less',
          'bootstrap',
          'tailwind',
          'git',
          'github',
          'gitlab',
          'bitbucket',
          'npm',
          'yarn',
        ];
        return !techKeywords.includes(lowerTopic);
      });

      featureTopics.forEach((topic) => {
        if (!featureCounts.has(topic)) {
          featureCounts.set(topic, 1);
        }
      });
    }

    // 4. Sort by frequency and return top features
    const sortedFeatures = Array.from(featureCounts.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by frequency
      .map(([feature]) => feature)
      .slice(0, 8); // Limit to 8 features

    Logger.info('Key features extracted from commits', {
      repositoryName: repository.name,
      totalCommits: commits.length,
      featuresFound: sortedFeatures.length,
      features: sortedFeatures,
    });

    return sortedFeatures;
  }

  private async getCompleteTechStack(
    repository: GitHubRepository,
  ): Promise<string[]> {
    const techStack: string[] = [];

    try {
      // 1. Add primary language
      if (repository.language) {
        techStack.push(repository.language);
      }

      // 2. Fetch all languages used in the repository
      const languages = await githubService.fetchRepositoryLanguages(
        repository.full_name,
      );
      const languageNames = languages.map((lang) => lang.language);
      techStack.push(...languageNames);

      // 3. Add technologies from topics (filter for actual tech, not features)
      if (repository.topics) {
        const techTopics = repository.topics.filter((topic) => {
          const lowerTopic = topic.toLowerCase();
          // Include technology-related topics
          const techKeywords = [
            // Frontend
            'react',
            'vue',
            'angular',
            'svelte',
            'nextjs',
            'nuxt',
            'gatsby',
            'html',
            'css',
            'sass',
            'scss',
            'less',
            'stylus',
            'bootstrap',
            'tailwind',
            'material-ui',
            'antd',
            'chakra',
            'webpack',
            'vite',
            'parcel',
            'rollup',

            // Backend
            'node',
            'express',
            'fastify',
            'koa',
            'hapi',
            'python',
            'django',
            'flask',
            'fastapi',
            'java',
            'spring',
            'springboot',
            'php',
            'laravel',
            'symfony',
            'codeigniter',
            'ruby',
            'rails',
            'sinatra',
            'go',
            'gin',
            'echo',
            'fiber',
            'rust',
            'actix',
            'rocket',
            'csharp',
            'dotnet',
            'aspnet',

            // Databases
            'mongodb',
            'postgresql',
            'mysql',
            'sqlite',
            'redis',
            'elasticsearch',
            'cassandra',
            'dynamodb',
            'prisma',
            'sequelize',
            'mongoose',
            'typeorm',

            // Cloud & DevOps
            'docker',
            'kubernetes',
            'jenkins',
            'github-actions',
            'aws',
            'azure',
            'gcp',
            'heroku',
            'vercel',
            'netlify',
            'terraform',
            'ansible',
            'circleci',
            'travis',

            // APIs & Services
            'graphql',
            'rest',
            'grpc',
            'webhook',
            'stripe',
            'paypal',
            'twilio',
            'sendgrid',
            'firebase',
            'supabase',
            'auth0',

            // Testing
            'jest',
            'mocha',
            'chai',
            'cypress',
            'playwright',
            'testing-library',
            'enzyme',
            'karma',

            // Tools & Libraries
            'typescript',
            'javascript',
            'es6',
            'es2015',
            'npm',
            'yarn',
            'pnpm',
            'lerna',
            'git',
            'github',
            'gitlab',
            'bitbucket',
            'eslint',
            'prettier',
            'husky',
            'lint-staged',
            'babel',
            'typescript',
            'swc',

            // Mobile
            'react-native',
            'flutter',
            'ionic',
            'cordova',
            'swift',
            'kotlin',
            'java',
            'objective-c',

            // Desktop
            'electron',
            'tauri',
            'qt',
            'gtk',

            // Other
            'pwa',
            'spa',
            'ssr',
            'ssg',
            'jamstack',
            'microservices',
            'serverless',
            'lambda',
            'blockchain',
            'web3',
            'ethereum',
            'solidity',
          ];
          return techKeywords.includes(lowerTopic);
        });
        techStack.push(...techTopics);
      }

      // 4. Add common technologies based on repository patterns
      if (repository.name.toLowerCase().includes('api')) {
        techStack.push('REST API');
      }
      if (
        repository.name.toLowerCase().includes('frontend') ||
        repository.name.toLowerCase().includes('client')
      ) {
        techStack.push('Frontend');
      }
      if (
        repository.name.toLowerCase().includes('backend') ||
        repository.name.toLowerCase().includes('server')
      ) {
        techStack.push('Backend');
      }
      if (
        repository.name.toLowerCase().includes('fullstack') ||
        repository.name.toLowerCase().includes('full-stack')
      ) {
        techStack.push('Full Stack');
      }

      // 5. Remove duplicates and sort
      const uniqueTechStack = Array.from(new Set(techStack));

      // Sort by importance (primary language first, then alphabetically)
      const sortedTechStack = uniqueTechStack.sort((a, b) => {
        if (a === repository.language) return -1;
        if (b === repository.language) return 1;
        return a.localeCompare(b);
      });

      Logger.info('Complete tech stack extracted', {
        repositoryName: repository.name,
        techStackCount: sortedTechStack.length,
        techStack: sortedTechStack,
      });

      return sortedTechStack.slice(0, 15); // Limit to 15 technologies
    } catch (error) {
      Logger.warn('Failed to get complete tech stack', {
        repositoryName: repository.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fallback to basic technologies
      const fallbackTech = [];
      if (repository.language) fallbackTech.push(repository.language);
      if (repository.topics) {
        fallbackTech.push(...repository.topics.slice(0, 5));
      }
      return Array.from(new Set(fallbackTech));
    }
  }

  private async findRelatedProjects(
    currentRepository: GitHubRepository,
  ): Promise<RelatedProject[]> {
    try {
      Logger.info('Finding related projects', {
        currentProject: currentRepository.name,
      });

      // Get all projects
      const allProjects = await this.getAllProjects();

      // Filter out the current project
      const otherProjects = allProjects.filter(
        (project) => project.id !== currentRepository.id,
      );

      if (otherProjects.length === 0) {
        return [];
      }

      // Calculate similarity scores for each project
      const projectScores = otherProjects.map((project) => {
        const score = this.calculateProjectSimilarity(
          currentRepository,
          project,
        );
        return { project, score };
      });

      // Sort by similarity score (highest first) and take top 3
      const relatedProjects = projectScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(({ project }) => this.mapToRelatedProject(project));

      Logger.info('Related projects found', {
        currentProject: currentRepository.name,
        relatedCount: relatedProjects.length,
        relatedProjects: relatedProjects.map((p) => p.name),
      });

      return relatedProjects;
    } catch (error) {
      Logger.warn('Failed to find related projects', {
        currentProject: currentRepository.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  private calculateProjectSimilarity(
    currentRepo: GitHubRepository,
    otherProject: Project,
  ): number {
    let score = 0;

    // 1. Language similarity (40% weight)
    if (
      currentRepo.language &&
      otherProject.language &&
      currentRepo.language === otherProject.language
    ) {
      score += 40;
    }

    // 2. Category similarity (30% weight)
    const currentCategories = this.determineCategories(currentRepo);
    const categoryMatches = currentCategories.filter((cat) =>
      otherProject.categories.includes(cat),
    ).length;
    if (categoryMatches > 0) {
      score += (categoryMatches / currentCategories.length) * 30;
    }

    // 3. Technology similarity (20% weight)
    const currentTech = this.determineTechnologies(currentRepo);
    const techMatches = currentTech.filter((tech) =>
      otherProject.technologies.includes(tech),
    ).length;
    if (techMatches > 0) {
      score +=
        (techMatches /
          Math.max(currentTech.length, otherProject.technologies.length)) *
        20;
    }

    // 4. Topic similarity (10% weight)
    if (currentRepo.topics && otherProject.topics) {
      const topicMatches = currentRepo.topics.filter(
        (topic) => otherProject.topics?.includes(topic),
      ).length;
      if (topicMatches > 0) {
        score +=
          (topicMatches /
            Math.max(currentRepo.topics.length, otherProject.topics.length)) *
          10;
      }
    }

    // 5. Bonus for featured projects
    if (otherProject.featured) {
      score += 5;
    }

    // 6. Bonus for projects with descriptions
    if (otherProject.description && otherProject.description.length > 10) {
      score += 3;
    }

    // 7. Bonus for recent projects (last 6 months)
    if (otherProject.updated_at) {
      const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
      const updatedAt = new Date(otherProject.updated_at);
      if (updatedAt > sixMonthsAgo) {
        score += 2;
      }
    }

    return Math.min(score, 100); // Cap at 100
  }

  private mapToRelatedProject(project: Project): RelatedProject {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      html_url: project.html_url,
      language: project.language,
      stargazers_count: project.stargazers_count,
      categories: project.categories,
      status: project.status,
      featured: project.featured,
    };
  }
}

export const projectService = new ProjectService();
