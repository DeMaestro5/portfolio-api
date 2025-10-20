// Mapper for environment variables
export const environment = process.env.NODE_ENV;
export const port = process.env.PORT;
export const timezone = process.env.TZ;

export const corsUrl = process.env.CORS_URL;

export const logDirectory = process.env.LOG_DIR;

export const redis = {
  // Prefer full URL when provided (e.g., redis://user:pass@host:port or rediss://...)
  url: process.env.REDIS_URL,
  host: process.env.REDIS_HOST || '',
  port: parseInt(process.env.REDIS_PORT || '0'),
  password: process.env.REDIS_PASSWORD || '',
  isTls:
    (process.env.REDIS_URL || '').toLowerCase().startsWith('rediss://') ||
    false,
};

export const caching = {
  contentCacheDuration: parseInt(
    process.env.CONTENT_CACHE_DURATION_MILLIS || '600000',
  ),
};
