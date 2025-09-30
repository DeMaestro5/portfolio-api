import { GitHubCommit } from './github.types';

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

export type ActivityType =
  | 'recent'
  | 'monthly'
  | 'project'
  | 'technology'
  | 'commit'
  | 'deployment';

export interface ActivityMetric {
  type: ActivityType;
  period: string;
  count: number;
  projects: string[];
  details: Record<string, any>;
}

export interface CommitMetric {
  repository: string;
  commitCount: number;
  lastCommit: string;
  authors: string[];
  messages: string[];
}

export interface CommitSummary {
  totalCommits: number;
  totalRepositories: number;
  mostActiveRepository: string;
  mostActiveRepositoryCount: number;
  averageCommitsPerRepository: number;
  recentCommits: GitHubCommit[];
}
