import {
  GitHubActivity,
  GitHubOverview,
  GitHubProfile,
  GitHubRepository,
  GitHubStats,
  SyncResult,
} from '../types/github.types';
import { cacheService } from './cache.service';
import { githubService } from './github.service';

class SyncService {
  async syncAllUserData(): Promise<SyncResult> {
    const startTime = Date.now();
    const results: SyncResult = {
      success: true,
      syncedData: [],
      errors: [],
      duration: 0,
    };

    try {
      // 1. Clear all GitHub cache
      await this.clearAllGitHubCache();

      // 2. Fetch fresh data for all endpoints
      const [profile, repositories, activities] = await Promise.all([
        this.syncProfile(),
        this.syncRepositories(),
        this.syncActivities(),
      ]);

      // 3. Calculate stats from fresh repositories
      const stats = await this.syncStats(repositories);

      // 4. Build overview from fresh data
      const overview = await this.syncOverview(
        profile,
        repositories,
        stats,
        activities,
      );

      results.syncedData = [
        'profile',
        'repositories',
        'activities',
        'stats',
        'overview',
      ];
      results.duration = Date.now() - startTime;

      const result: SyncResult = {
        success: results.success,
        syncedData: results.syncedData,
        errors: results.errors,
        duration: results.duration,
        overview,
      };

      return result;
    } catch (error: any) {
      results.success = false;
      results.errors.push(error.message);
      results.duration = Date.now() - startTime;
      return results;
    }
  }

  private async clearAllGitHubCache(): Promise<void> {
    const cacheKeys = [
      'github:profile',
      'github:repositories',
      'github:activities',
      'github:stats',
      'github:overview',
    ];

    await Promise.all(cacheKeys.map((key) => cacheService.del(key)));
  }

  private async syncProfile(): Promise<GitHubProfile> {
    const profile = await githubService.fetchProfile();
    await cacheService.set('github:profile', profile, 3600);
    return profile;
  }

  private async syncRepositories(): Promise<GitHubRepository[]> {
    const repositories = await githubService.fetchAllRepositoriesInBatches(
      20,
      10,
    );
    await cacheService.set('github:repositories', repositories, 1800);
    return repositories;
  }

  private async syncActivities(): Promise<GitHubActivity[]> {
    const activities = await githubService.fetchActivities();
    await cacheService.set('github:activities', activities, 600);
    return activities;
  }

  private async syncStats(
    repositories: GitHubRepository[],
  ): Promise<GitHubStats> {
    const stats = await githubService.calculateStats(repositories);
    await cacheService.set('github:stats', stats, 7200);
    return stats;
  }

  private async syncOverview(
    profile: GitHubProfile,
    repositories: GitHubRepository[],
    stats: GitHubStats,
    activities: GitHubActivity[],
  ): Promise<GitHubOverview> {
    const overview: GitHubOverview = {
      profile,
      stats,
      commits: await githubService.fetchRecentCommits(repositories),
      activities,
    };

    await cacheService.set('github:overview', overview, 900);
    return overview;
  }
}

export const syncService = new SyncService();
