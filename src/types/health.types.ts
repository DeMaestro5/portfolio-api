export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  port: string;
  timezone: string;
  services: {
    redis: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    github: {
      status: 'healthy' | 'unhealthy' | 'degraded';
      responseTime?: number;
      error?: string;
    };
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    uptime: number;
  };
}
