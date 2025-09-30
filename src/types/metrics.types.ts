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

export interface RepositoryMetric {
  name: string;
  description: string | null;
  url: string | null;
  stars: number | null;
  forks: number;
  size: number;
  createdAt: string;
  updatedAt: string;
  lastPushed: string;
  topics: string[];
  isPrivate: boolean;
  activityScore: number;
}

export interface RepositorySummary {
  totalRepositories: number;
  publicRepositories: number;
  privateRepositories: number;
  mostStarredRepository: string;
  mostStarredRepositoryStars: number;
  averageStarsPerRepository: number;
  totalStars: number;
  totalForks: number;
  mostUsedLanguage: string;
  languageDistribution: { [language: string]: number };
  recentRepositories: RepositoryMetric[];
}

export interface RepositoryContribution {
  repository: string;
  contributionCount: number;
  lastContribution: string;
  authors: string[];
  recentCommits: GitHubCommit[];
}

export interface ContributionsSummary {
  totalContributions: number;
  totalRepositories: number;
  mostContributedRepository: string;
  mostContributedRepositoryContributions: number;
  averageContributionsPerRepository: number;
  totalAuthors: number;
  mostActiveAuthor: string;
  recentContributions: GitHubCommit[];
}

export interface ContributionsData {
  repositories: RepositoryContribution[];
  summary: ContributionsSummary;
}

export interface ProductivityMetrics {
  totalCommits: number;
  totalRepositories: number;
  mostActiveRepository: string;
  mostActiveRepositoryCount: number;
  averageCommitsPerRepository: number;
  recentCommits: GitHubCommit[];

  commitsThisWeek: number;
  commitsThisMonth: number;
  lastActivityDate: string;
  activeDaysThisMonth: number;
}
