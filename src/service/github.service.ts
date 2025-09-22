import { Octokit } from '@octokit/rest';
import { RequestError } from '@octokit/request-error';
import { GitHubProfile } from '../types/github.types';
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
