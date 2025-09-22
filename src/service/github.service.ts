import { Octokit } from '@octokit/rest';
import { RequestError } from '@octokit/request-error';
import {
  GitHubCommit,
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
  async getRateLimit(): Promise<number> {
    try {
      const response = await this.octokit.rest.rateLimit.get();
      return response.data.rate?.remaining ?? 0;
    } catch (error: unknown) {
      Logger.error('Failed to get rate limit', error);
      return 0;
    }
  }
}

export const githubService = new GitHubService();
