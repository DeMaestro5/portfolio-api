export interface LanguageMetric {
  name: string;
  count: number;
  percentage: number;
  projects: string[];
}

export interface LanguageSummary {
  mostUsed: string;
  totalLanguages: number;
  totalProjects: number;
  averageProjectsPerLanguage: number;
}

export interface LanguageMetricsData {
  languages: LanguageMetric[];
  summary: LanguageSummary;
}

export interface LanguageMetricsResponse {
  message: string;
  data: LanguageMetricsData;
  cached: boolean;
  rateLimitInfo?: {
    remaining: number;
    reset: number;
  };
  requestId: string;
  startTime: number;
}
