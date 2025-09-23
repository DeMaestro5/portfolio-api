import { githubService } from '../service/github.service';

export async function getRateLimit(): Promise<
  | {
      remaining: number;
      reset: string;
    }
  | undefined
> {
  try {
    const rateLimit = await githubService.getRateLimit();
    rateLimit > 0
      ? {
          remaining: rateLimit,
          reset: new Date(Date.now() + 3600000).toISOString(),
        }
      : undefined;
  } catch (error) {
    // if rate limit call fails, continue without it
    return undefined;
  }
}
