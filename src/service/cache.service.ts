import client from '../cache';
import Logger from '../core/Logger';

class CacheService {
  private client = client;

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      if (data) {
        Logger.info(`Cache HIT for key: ${key}`);
        return JSON.parse(data) as T;
      }
      Logger.info(`Cache MISS for key: ${key}`);
      return null;
    } catch (error) {
      Logger.error(`Cache GET error for key: ${key}`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<boolean> {
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      Logger.info(`Cache SET for key: ${key}, TTL: ${ttl}`);
      return true;
    } catch (error) {
      Logger.error(`Cache SET error for key: ${key}`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      Logger.info(`Cache DELETE for key: ${key}`);
      return true;
    } catch (error) {
      Logger.error(`Cache DELETE error for key: ${key}`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      Logger.error(`Cache EXISTS error for key: ${key}`, error);
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      Logger.error(`Cache KEYS error for pattern: ${pattern}`, error);
      return [];
    }
  }

  async flushAll(): Promise<boolean> {
    try {
      await this.client.flushAll();
      Logger.info(`Cache FLUSHALL`);
      return true;
    } catch (error) {
      Logger.error(`Cache FLUSHALL error`, error);
      return false;
    }
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      const result = await this.client.incrBy(key, amount);
      Logger.info(`Cache INCREMENT for key: ${key}, amount: ${amount}`);
      return result;
    } catch (error) {
      Logger.error(`Cache INCREMENT error for key: ${key}`, error);
      return 0;
    }
  }

  // GitHub-specific cache helpers
  async cacheGitHubProfile(profile: any, ttl: number = 3600): Promise<boolean> {
    return this.set('github:profile', profile, ttl);
  }

  async getGitHubProfile<T>(): Promise<T | null> {
    return this.get<T>('github:profile');
  }

  async cacheGitHubRepos(repos: any[], ttl: number = 1800): Promise<boolean> {
    return this.set('github:repositories', repos, ttl);
  }

  async getGitHubRepos<T>(): Promise<T | null> {
    return this.get<T>('github:repositories');
  }

  async cacheGitHubActivity(
    activity: any[],
    ttl: number = 900,
  ): Promise<boolean> {
    return this.set('github:activity', activity, ttl);
  }

  async cacheGitHubStats(stats: any, ttl: number = 7200): Promise<boolean> {
    return this.set('github:stats', stats, ttl);
  }

  async getGitHubStats<T>(): Promise<T | null> {
    return this.get<T>('github:stats');
  }

  // Visitor tracking
  async incrementVisitorCount(): Promise<number> {
    return this.increment('visitor:total');
  }

  async getVisitorCount(): Promise<number> {
    const count = await this.get<string>('visitor:total');
    return count ? parseInt(count) : 0;
  }

  // Cache health check
  async isHealthy(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      Logger.error(`Cache health check failed`, error);
      return false;
    }
  }

  async getInfo(): Promise<any> {
    try {
      const info = await this.client.info();
      return info;
    } catch (error) {
      Logger.error(`Cache INFO error`, error);
      return null;
    }
  }

  async clearProjectCache(): Promise<boolean> {
    try {
      await this.del('projects:all');
      await this.del('projects:featured');
      await this.del('projects:search');

      Logger.info('Project cache cleared');
      return true;
    } catch (error) {
      Logger.error('Error clearing project cache', error);
      return false;
    }
  }
}

export const cacheService = new CacheService();
