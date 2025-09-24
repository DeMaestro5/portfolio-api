import Logger from '../core/Logger';
import { cacheService } from '../service/cache.service';

export async function processWebhookEvent(eventType: string, payload: any) {
  switch (eventType) {
    case 'push':
      await handlePushEvent(payload);
      break;
    case 'create':
      await handleCreateEvent(payload);
      break;
    case 'delete':
      await handleDeleteEvent(payload);
      break;
    case 'watch':
      await handleWatchEvent(payload);
      break;
    case 'fork':
      await handleForkEvent(payload);
      break;
    case 'issues':
      await handleIssuesEvent(payload);
      break;
    case 'pull_request':
      await handlePullRequestEvent(payload);
      break;
    default:
      Logger.info('Unhandled event type', {
        eventType,
      });
  }
}

async function handlePushEvent(payload: any) {
  // clear cache for affected data
  await cacheService.del('github:repositories');
  await cacheService.del('github:overview');
  await cacheService.del('github:stats');
  await cacheService.del('github:activities');

  Logger.info('Push event processed', {
    repository: payload.repository.name,
    commits: payload.commits.length,
  });
}

async function handleCreateEvent(payload: any) {
  // new repo created
  await cacheService.del('github:repositories');
  await cacheService.del('github:stats');

  Logger.info('Create event processed', {
    repository: payload.repository.name,
    ref: payload.ref,
  });
}

async function handleDeleteEvent(payload: any) {
  // repo deleted
  await cacheService.del('github:repositories');
  await cacheService.del('github:stats');

  Logger.info('Delete event processed', {
    repository: payload.repository.name,
    ref: payload.ref,
  });
}

async function handleWatchEvent(payload: any) {
  // repo starred/unstarred
  await cacheService.del('github:stats');

  Logger.info('Watch event processed', {
    repository: payload.repository.name,
    action: payload.action,
  });
}

async function handleForkEvent(payload: any) {
  // Repository forked
  await cacheService.del('github:stats');

  Logger.info('Fork event processed', {
    repository: payload.repository.name,
    forkee: payload.forkee.name,
  });
}

async function handleIssuesEvent(payload: any) {
  // Issue activity
  await cacheService.del('github:activities');

  Logger.info('Issues event processed', {
    repository: payload.repository.name,
    action: payload.action,
  });
}

async function handlePullRequestEvent(payload: any) {
  // Pull request activity
  await cacheService.del('github:activities');

  Logger.info('Pull request event processed', {
    repository: payload.repository.name,
    action: payload.action,
  });
}
