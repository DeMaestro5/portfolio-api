import { Octokit } from '@octokit/rest';
import { RequestError } from '@octokit/request-error';
import {
  GitHubActivity,
  GitHubCommit,
  GitHubContributor,
  GitHubEvents,
  GitHubLanguage,
  GitHubOverview,
  GitHubProfile,
  GitHubRepository,
  GitHubStats,
} from '../types/github.types';
import Logger from '../core/Logger';

class GitHubService {
  private octokit: Octokit;

  constructor() {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error('GitHub token is not set');
    }
    if (!process.env.GITHUB_USERNAME) {
      throw new Error('GitHub username is not set');
    }

    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
  }

  async checkHealth(): Promise<boolean> {
    try {
      // Simple health check - just verify we can make a request to GitHub API
      await this.octokit.rest.rateLimit.get();
      return true;
    } catch (error) {
      Logger.warn('GitHub API health check failed', { error });
      return false;
    }
  }

  async fetchProfile(): Promise<GitHubProfile> {
    try {
      Logger.info('Fetching GitHub profile');

      const response = await this.octokit.rest.users.getByUsername({
        username: process.env.GITHUB_USERNAME!,
      });

      const profile: GitHubProfile = {
        login: response.data.login,
        name: response.data.name,
        bio: response.data.bio,
        avatar_url: response.data.avatar_url,
        location: response.data.location || null,
        email: response.data.email || null,
        company: response.data.company || null,
        blog: response.data.blog || null,
        twitter_username: response.data.twitter_username || null,
        public_gists: response.data.public_gists,
        public_repos: response.data.public_repos,
        followers: response.data.followers,
        following: response.data.following,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
      };

      Logger.info('GitHub profile fetched successfully', {
        login: profile.login,
        repos: profile.public_repos,
        followers: profile.followers,
      });

      return profile;
    } catch (error: unknown) {
      if (error instanceof RequestError) {
        Logger.error('Failed to fetch GitHub profile', {
          error: error.message,
          status: error.status,
          rateLimit: error.response?.headers?.['x-ratelimit-remaining'],
        });
        throw new Error(`GitHub API error: ${error.message}`);
      }

      Logger.error('Unexpected error while fetching GitHub profile', error);
      throw error;
    }
  }

  async fetchRepositories(): Promise<GitHubRepository[]> {
    try {
      Logger.info('Fetching GitHub repositories');
      const response = await this.octokit.rest.repos.listForUser({
        username: process.env.GITHUB_USERNAME!,
      });

      const repositories: GitHubRepository[] = response.data.map((repo) => {
        return {
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          language: repo.language,
          stargazers_count: repo.stargazers_count,
          forks_count: repo.forks_count,
          size: repo.size,
          created_at: repo.created_at,
          updated_at: repo.updated_at,
          pushed_at: repo.pushed_at,
          html_url: repo.html_url,
          clone_url: repo.clone_url,
          topics: repo.topics,
          is_private: repo.private,
        };
      });

      Logger.info('Github repositories fetch successfully', {
        repositories: repositories.length,
      });

      return repositories;
    } catch (error: unknown) {
      if (error instanceof RequestError) {
        Logger.error('Failed to fetch GitHub repositories', {
          error: error.message,
          status: error.status,
          rateLimit: error.response?.headers?.['x-ratelimit-remaining'],
        });
        throw new Error(`GitHub API error: ${error.message}`);
      }

      Logger.error(
        'Unexpected error while fetching GitHub repositories',
        error,
      );
      throw error;
    }
  }

  async fetchRepositoriesPaginated(
    page: number = 1,
    perPage: number = 10,
  ): Promise<{
    repositories: GitHubRepository[];
    hasMore: boolean;
    totalCount: number;
  }> {
    try {
      Logger.info('Fetching Github repositories with pagination', {
        page,
        perPage,
      });

      const response = await this.octokit.rest.repos.listForUser({
        username: process.env.GITHUB_USERNAME!,
        page: page,
        per_page: perPage,
        sort: 'updated',
        direction: 'desc',
      });

      const linkHeader = response.headers.link;
      const hasMore = linkHeader?.includes('rel="next"') || false;

      const totalCount =
        response.data.length === perPage && hasMore
          ? page * perPage + 1
          : (page - 1) * perPage + response.data.length;

      const repositories: GitHubRepository[] = response.data.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        size: repo.size,
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        pushed_at: repo.pushed_at,
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        topics: repo.topics,
        is_private: repo.private,
      }));

      Logger.info('GitHub repositories fetched successfully with pagination', {
        page,
        perPage,
        repositories: repositories.length,
        hasMore,
        totalCount,
      });

      return {
        repositories,
        hasMore,
        totalCount,
      };
    } catch (error: unknown) {
      if (error instanceof RequestError) {
        Logger.error('Failed to fetch GitHub repositories with pagination', {
          error: error.message,
          status: error.status,
          page,
          perPage,
        });
        throw new Error(`GitHub API error: ${error.message}`);
      }
      throw error;
    }
  }

  async fetchAllRepositoriesInBatches(
    batchSize: number = 20,
    maxBatches: number = 10,
  ): Promise<GitHubRepository[]> {
    try {
      Logger.info('Fetch All repositories in batches', {
        batchSize,
        maxBatches,
      });

      const allRepositories: GitHubRepository[] = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore && currentPage <= maxBatches) {
        const result = await this.fetchRepositoriesPaginated(
          currentPage,
          batchSize,
        );
        allRepositories.push(...result.repositories);
        hasMore = result.hasMore;
        currentPage++;

        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);

        if (heapUsedMB > 300) {
          Logger.warn('Memory usage high, stopping batch fetch', {
            heapUsedMB,
            currentPage,
            totalRepositories: allRepositories.length,
          });
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      Logger.info('Batch fetch completed', {
        totalRepositories: allRepositories.length,
        batchProcessed: currentPage - 1,
      });
      return allRepositories;
    } catch (error: unknown) {
      Logger.error('Failed to fetch repositories in batches', error);
      throw error;
    }
  }

  async fetchRepositoryByName(name: string): Promise<GitHubRepository> {
    try {
      Logger.info('Fetching GitHub repository by name', { name });

      const [owner, repo] = name.split('/');
      if (!owner || !repo) {
        throw new Error(
          `Invalid repo name format: "${name}". Expected "owner/repo".`,
        );
      }

      const response = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      const repository: GitHubRepository = {
        id: response.data.id,
        name: response.data.name,
        full_name: response.data.full_name,
        description: response.data.description,
        language: response.data.language,
        stargazers_count: response.data.stargazers_count,
        forks_count: response.data.forks_count,
        size: response.data.size,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
        pushed_at: response.data.pushed_at,
        html_url: response.data.html_url,
        clone_url: response.data.clone_url,
        topics: response.data.topics,
        is_private: response.data.private,
      };

      return repository;
    } catch (error: unknown) {
      if (error instanceof RequestError) {
        Logger.error('Failed to fetch GitHub repository by id', {
          error: error.message,
          status: error.status,
          rateLimit: error.response?.headers?.['x-ratelimit-remaining'],
        });
        throw new Error(`GitHub API error: ${error.message}`);
      }
      Logger.error(
        'Unexpected error while fetching GitHub repository by id',
        error,
      );
      throw error;
    }
  }

  async fetchRepositoryCommits(name: string): Promise<GitHubCommit[]> {
    try {
      Logger.info('Fetching commits by name', { name });
      const [owner, repo] = name.split('/');
      if (!owner || !repo) {
        throw new Error(
          `Invalid repo name format: "${name}". Expected "owner/repo".`,
        );
      }

      const response = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
      });

      const commits: GitHubCommit[] = response.data.map((commit) => {
        return {
          sha: commit.sha,
          message: commit.commit.message,
          author: {
            name: commit.commit.author?.name ?? '',
            email: commit.commit.author?.email ?? '',
            date: commit.commit.author?.date ?? '',
          },
          repository: {
            name: repo,
            full_name: name,
          },
        };
      });

      Logger.info('Github commits fetched successfully', {
        commits: commits.length,
      });

      return commits;
    } catch (error: unknown) {
      if (error instanceof RequestError) {
        Logger.error('Failed to fetch GitHub commits', {
          error: error.message,
        });
        throw new Error(`GitHub API error: ${error.message}`);
      }
      Logger.error('Unexpected error while fetching GitHub commits', error);
      throw error;
    }
  }

  async calculateStats(repositories: GitHubRepository[]): Promise<GitHubStats> {
    try {
      const stats: GitHubStats = {
        totalRepos: repositories.length,
        totalStars: repositories.reduce(
          (sum, repo) => sum + (repo.stargazers_count ?? 0),
          0,
        ),
        totalForks: repositories.reduce(
          (sum, repo) => sum + (repo.forks_count ?? 0),
          0,
        ),
        languages: repositories.reduce(
          (languages, repo) => {
            languages[repo.language ?? ''] =
              (languages[repo.language ?? ''] ?? 0) + 1;
            return languages;
          },
          {} as { [key: string]: number },
        ),
        recentActivity: {
          activeReposThisWeek: repositories.filter((repo) => {
            if (!repo.pushed_at) return false;
            const pushDate = new Date(repo.pushed_at);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return pushDate > weekAgo;
          }).length,

          activeReposThisMonth: repositories.filter((repo) => {
            if (!repo.pushed_at) return false;
            const pushDate = new Date(repo.pushed_at);
            const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            return pushDate > monthAgo;
          }).length,
        },
      };

      Logger.info('Github stats calculated successfully', {
        stats,
      });

      return stats;
    } catch (error: unknown) {
      if (error instanceof RequestError) {
        Logger.error('Failed to calculate GitHub stats', {
          error: error.message,
          status: error.status,
          rateLimit: error.response?.headers?.['x-ratelimit-remaining'],
        });
        throw new Error(`GitHub API error: ${error.message}`);
      }
      throw error;
    }
  }

  async fetchRepositoryLanguages(name: string): Promise<GitHubLanguage[]> {
    try {
      Logger.info('Fetching languages by name', { name });
      const [owner, repo] = name.split('/');
      if (!owner || !repo) {
        throw new Error(
          `Invalid repo name format: "${name}". Expected "owner/repo".`,
        );
      }

      const response = await this.octokit.rest.repos.listLanguages({
        owner,
        repo,
      });

      const languages: GitHubLanguage[] = Object.entries(response.data).map(
        ([language, bytes]) => {
          return {
            language,
            bytes,
          };
        },
      );

      Logger.info('Github languages fetched successfully', {
        languages: languages.length,
      });

      return languages;
    } catch (error: unknown) {
      if (error instanceof RequestError) {
        Logger.error('Failed to fetch GitHub languages', {
          error: error.message,
        });
        throw new Error(`GitHub API error: ${error.message}`);
      }
      Logger.error('Unexpected error while fetching GitHub languages', error);
      throw error;
    }
  }

  async fetchRepositoryContributors(
    name: string,
  ): Promise<GitHubContributor[]> {
    try {
      Logger.info('Fetching contributors by name', { name });
      const [owner, repo] = name.split('/');
      if (!owner || !repo) {
        throw new Error(
          `Invalid repo name format: "${name}". Expected "owner/repo".`,
        );
      }

      const response = await this.octokit.rest.repos.listContributors({
        owner,
        repo,
      });

      const contributors: GitHubContributor[] = response.data.map(
        (contributor) => {
          return {
            login: contributor.login || '',
            avatar_url: contributor.avatar_url || '',
            contributions: contributor.contributions || 0,
          };
        },
      );

      Logger.info('Github contributors fetched successfully', {
        contributors: contributors.length,
      });

      return contributors;
    } catch (error: unknown) {
      if (error instanceof RequestError) {
        Logger.error('Failed to fetch GitHub contributors', {
          error: error.message,
        });
        throw new Error(`GitHub API error: ${error.message}`);
      }
      throw error;
    }
  }

  async fetchEvents(): Promise<GitHubEvents[]> {
    try {
      Logger.info('Fetching GitHub events');
      const response = await this.octokit.rest.activity.listPublicEventsForUser(
        {
          username: process.env.GITHUB_USERNAME!,
          per_page: 50,
        },
      );
      const events: GitHubEvents[] = response.data.map((event) => {
        return {
          id: event.id.toString(),
          type: event.type || '',
          actor: {
            login: event.actor?.login || '',
            avatar_url: event.actor?.avatar_url || '',
          },
          repo: {
            name: event.repo?.name || '',
          },
        };
      });

      Logger.info('Github events fetched successfully', {
        events: events.length,
      });

      return events;
    } catch (error: unknown) {
      if (error instanceof RequestError) {
        Logger.error('Failed to fetch GitHub events', {
          error: error.message,
        });
        throw new Error(`GitHub API error: ${error.message}`);
      }
      throw error;
    }
  }

  async fetchRecentCommits(
    repositories: GitHubRepository[],
    limit: number = 20,
    daysBack: number = 30,
  ): Promise<GitHubCommit[]> {
    try {
      // Get most recently updated repositories (limit to 10 for performance)
      const recentRepos = repositories
        .filter((repo) => repo.pushed_at) // Only repos with recent activity
        .sort(
          (a, b) =>
            new Date(b.pushed_at!).getTime() - new Date(a.pushed_at!).getTime(),
        )
        .slice(0, 10);

      // Fetch commits from each repo in parallel
      const commitPromises = recentRepos.map(async (repo) => {
        try {
          const response = await this.octokit.rest.repos.listCommits({
            owner: repo.full_name.split('/')[0],
            repo: repo.full_name.split('/')[1],
            per_page: 5, // Only 5 commits per repo
            since: new Date(
              Date.now() - daysBack * 24 * 60 * 60 * 1000,
            ).toISOString(),
          });

          return response.data.map((commit) => ({
            sha: commit.sha,
            message: commit.commit.message,
            author: {
              name: commit.commit.author?.name ?? '',
              email: commit.commit.author?.email ?? '',
              date: commit.commit.author?.date ?? '',
            },
            repository: {
              name: repo.name,
              full_name: repo.full_name,
            },
          }));
        } catch (error) {
          Logger.warn(`Failed to fetch commits from ${repo.name}`, { error });
          return []; // Return empty array if one repo fails
        }
      });

      const allCommits = await Promise.all(commitPromises);
      const flattenedCommits = allCommits.flat();

      // Sort by date and limit total commits
      const sortedCommits = flattenedCommits
        .sort(
          (a, b) =>
            new Date(b.author.date).getTime() -
            new Date(a.author.date).getTime(),
        )
        .slice(0, limit);

      Logger.info('Recent commits fetched successfully', {
        totalCommits: sortedCommits.length,
        repositoriesChecked: recentRepos.length,
      });

      return sortedCommits;
    } catch (error: unknown) {
      Logger.error('Failed to fetch GitHub commits', error);
      throw error;
    }
  }

  async getOverview(): Promise<GitHubOverview> {
    try {
      const [profile, repositories] = await Promise.all([
        this.fetchProfile(),
        this.fetchRepositories(),
      ]);
      const [stats, commits] = await Promise.all([
        this.calculateStats(repositories),
        this.fetchRecentCommits(repositories),
      ]);

      const overview: GitHubOverview = {
        profile,
        stats,
        commits,
      };

      Logger.info('Github overview fetched successfully', {
        profile: profile.login,
        stats: stats.totalRepos,
        commits: commits.length,
      });

      return overview;
    } catch (error: unknown) {
      if (error instanceof RequestError) {
        Logger.error('Failed to fetch GitHub overview', {
          error: error.message,
          status: error.status,
          rateLimit: error.response?.headers?.['x-ratelimit-remaining'],
        });
        throw new Error(`GitHub API error: ${error.message}`);
      }

      Logger.error('Unexpected error while fetching GitHub overview', error);
      throw error;
    }
  }

  async fetchActivities(limit: number = 50): Promise<GitHubActivity[]> {
    try {
      Logger.info('Fetching GitHub activities');
      const activities =
        await this.octokit.rest.activity.listPublicEventsForUser({
          username: process.env.GITHUB_USERNAME!,
          per_page: limit,
        });

      const relevantEventTypes = [
        'PushEvent',
        'PullRequestEvent',
        'IssueCommentEvent',
        'PullRequestReviewCommentEvent',
        'PullRequestReviewEvent',
      ];

      const filteredActivities = activities.data
        .filter((activity) => relevantEventTypes.includes(activity.type ?? ''))
        .sort(
          (a, b) =>
            new Date(b.created_at ?? '').getTime() -
            new Date(a.created_at ?? '').getTime(),
        )
        .slice(0, limit);

      const transformedActivities: GitHubActivity[] = filteredActivities.map(
        (activity) => ({
          id: activity.id.toString() ?? '',
          type: activity.type ?? '',
          actor: {
            login: activity.actor?.login ?? '',
            avatar_url: activity.actor?.avatar_url ?? '',
          },
          repo: {
            name: activity.repo?.name ?? '',
            url: activity.repo?.url ?? '',
          },
          payload: activity.payload ?? {},
          created_at: activity.created_at ?? '',
          public: activity.public ?? false,
        }),
      );

      Logger.info('Raw GitHub activity data structure:', {
        totalEvents: activities.data.length,
        sampleEvent: activities.data[0],
        eventTypes: activities.data.map((event) => event.type),
      });

      return transformedActivities;
    } catch (error: unknown) {
      if (error instanceof RequestError) {
        Logger.error('Failed to fetch GitHub activities', {
          error: error.message,
          status: error.status,
          rateLimit: error.response?.headers?.['x-ratelimit-remaining'],
        });
        throw new Error(`GitHub API error: ${error.message}`);
      }

      Logger.error('Unexpected error while fetching GitHub activities', error);
      throw error;
    }
  }
  async getRateLimit(): Promise<number> {
    try {
      const response = await this.octokit.rest.rateLimit.get();
      return response.data.rate?.remaining ?? 0;
    } catch (error: unknown) {
      Logger.error('Failed to get rate limit', error);
      return 0;
    }
  }

  async fetchRepositoryById(id: number): Promise<GitHubRepository> {
    try {
      Logger.info('Fetching GitHub repository by id', { id });
      // fetch all repositories to find the one with the matching id
      const repositories = await this.fetchRepositories();
      const repository = repositories.find((repo) => repo.id === id);

      if (!repository) {
        throw new Error(`Repository with id ${id} not found`);
      }
      // get detailed information about the repository
      const [owner, repo] = repository.full_name.split('/');
      const response = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      const detailedRepository: GitHubRepository = {
        id: response.data.id,
        name: response.data.name,
        full_name: response.data.full_name,
        description: response.data.description,
        language: response.data.language,
        stargazers_count: response.data.stargazers_count,
        forks_count: response.data.forks_count,
        size: response.data.size,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
        pushed_at: response.data.pushed_at,
        html_url: response.data.html_url,
        clone_url: response.data.clone_url,
        topics: response.data.topics,
        is_private: response.data.private,
      };
      Logger.info('Github repository fetched successfully', {
        id,
        name: detailedRepository.name,
      });
      return detailedRepository;
    } catch (error) {
      Logger.error('Failed to fetch GitHub repository by id', error);
      throw error;
    }
  }

  async fetchRepositoriesByLanguage(
    language: string,
  ): Promise<GitHubRepository[]> {
    try {
      Logger.info('Fetching repositories by language', { language });
      const repositories = await this.fetchRepositories();
      const filteredRepos = repositories.filter(
        (repo) =>
          repo.language &&
          repo.language.toLowerCase() === language.toLowerCase(),
      );
      Logger.info('Github repositories fetched successfully', {
        repositories: filteredRepos.length,
      });
      return filteredRepos;
    } catch (error) {
      Logger.error('Failed to fetch repositories by language', error);
      throw error;
    }
  }
  // In your GitHub service, add:
  async fetchAllCommits(
    repositories: GitHubRepository[],
    daysBack: number = 365,
  ): Promise<GitHubCommit[]> {
    try {
      const repositoriesWithCommits = repositories.filter(
        (repo) => (repo.size && repo.size > 0) || repo.pushed_at,
      );

      const commitPromises = repositoriesWithCommits.map(async (repo) => {
        try {
          const response = await this.octokit.rest.repos.listCommits({
            owner: repo.full_name.split('/')[0],
            repo: repo.full_name.split('/')[1],
            per_page: 100,
            since: new Date(
              Date.now() - daysBack * 24 * 60 * 60 * 1000,
            ).toISOString(),
          });

          return response.data.map((commit) => ({
            sha: commit.sha,
            message: commit.commit.message,
            author: {
              name: commit.commit.author?.name ?? '',
              email: commit.commit.author?.email ?? '',
              date: commit.commit.author?.date ?? '',
            },
            repository: {
              name: repo.name,
              full_name: repo.full_name,
            },
          }));
        } catch (error) {
          Logger.warn(`Failed to fetch commits from ${repo.name}`, { error });
          return [];
        }
      });

      const allCommits = await Promise.all(commitPromises);
      return allCommits.flat();
    } catch (error) {
      Logger.error('Error fetching all commits:', error);
      throw error;
    }
  }

  async fetchRepositoryCommitsByProject(
    repository: GitHubRepository,
    perPage: number = 100,
  ): Promise<GitHubCommit[]> {
    try {
      Logger.info('Fetching commits for repository', {
        repositoryName: repository.name,
      });

      const response = await this.octokit.rest.repos.listCommits({
        owner: repository.full_name.split('/')[0],
        repo: repository.full_name.split('/')[1],
        per_page: perPage,
      });

      const commits: GitHubCommit[] = response.data.map((commit) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author?.name ?? '',
          email: commit.commit.author?.email ?? '',
          date: commit.commit.author?.date ?? '',
        },
        repository: {
          name: repository.name,
          full_name: repository.full_name,
        },
      }));

      Logger.info('Repository commits fetched successfully', {
        repositoryName: repository.name,
        commitsCount: commits.length,
      });
      return commits;
    } catch (error) {
      Logger.warn('Failed to fetch commits for repository', {
        repositoryName: repository.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return []; // Return empty array if commits can't be fetched
    }
  }
}

export const githubService = new GitHubService();
