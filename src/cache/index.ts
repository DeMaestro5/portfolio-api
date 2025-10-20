import { redis } from '../config';
import { createClient } from 'redis';
import Logger from '../core/Logger';

// Prefer full URL (REDIS_URL). Fall back to host/port/password if not provided.
const connectionUrl =
  redis.url && redis.url.length > 0
    ? redis.url
    : `redis://:${redis.password}@${redis.host}:${redis.port}`;

const client = createClient(
  redis.isTls
    ? { url: connectionUrl, socket: { tls: true, rejectUnauthorized: false } }
    : { url: connectionUrl },
);

client.on('connect', () => Logger.info('Cache is connecting'));
client.on('ready', () => Logger.info('Cache is ready'));
client.on('end', () => Logger.info('Cache disconnected'));
client.on('reconnecting', () => Logger.info('Cache is reconnecting'));
client.on('error', (e) => Logger.error(e));

(async () => {
  try {
    await client.connect();
  } catch (e) {
    Logger.error('Redis connect failed; continuing without cache', e as Error);
  }
})();

// If the Node process ends, close the Cache connection
process.on('SIGINT', async () => {
  try {
    await client.disconnect();
  } catch (_) {
    // ignore
  }
});

export default client;
