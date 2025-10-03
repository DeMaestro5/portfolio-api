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

export interface TechnologiesMetric {
  name: string;
  count: number;
  percentage: number;
  projects: string[];
}

export interface TechnologiesSummary {
  totalTechnologies: number;
  totalProjects: number;
  averageTechnologiesPerProject: number;
  mostUsedTechnology: string;
  mostUsedTechnologyCount: number;
  technologyDiversity: number;
}

export interface TechnologiesData {
  technologies: TechnologiesMetric[];
  summary: TechnologiesSummary;
}

export interface CurrentStreakMetric {
  start: Date;
  end: Date;
  days: number;
}

export interface LongestStreakMetric {
  start: Date;
  end: Date;
  days: number;
}

export interface StreakMetrics {
  totalCommits: number;
  firstCommit: Date;
  lastCommit: Date;
  currentStreak: CurrentStreakMetric;
  longestStreak: LongestStreakMetric;
  commitsDays: number;
}

export interface MetricsSummary {
  portfolio: {
    totalProjects: number;
    totalCommits: number;
    totalTechnologies: number;
    totalLanguages: number;
  };

  activity: {
    currentStreak: number;
    longestStreak: number;
    activeDaysThisMonth: number;
    commitsThisMonth: number;
    mostActiveRepository: string;
  };

  techStack: {
    mostUsedLanguage: string;
    mostUsedTechnology: string;
    languageDiversity: number;
    technologyDiversity: number;
    averageTechnologiesPerProject: number;
  };

  productivity: {
    averageCommitsPerDay: number;
    averageCommitsPerRepository: number;
    consistency: 'high' | 'medium' | 'low';
  };

  recent: {
    lastActivity: string;
    recentCommits: number;
    recentProjects: number;
    recentTechnologies: string[];
  };
}

export interface TimelineEvent {
  date: string;
  type:
    | 'project_created'
    | 'project_updated'
    | 'commit_milestone'
    | 'activity_peak'
    | 'star_received'
    | 'fork_received';
  project?: string;
  description: string;
  metadata?: {
    commits?: number;
    stars?: number;
    forks?: number;
    language?: string;
    size?: number;
  };
}

export interface TimelineMetrics {
  events: TimelineEvent[];
  summary: {
    totalProjects: number;
    totalCommits: number;
    developmentSpan: {
      start: string;
      end: string;
      days: number;
    };
    mostActiveMonth: string;
    leastActiveMonth: string;
    averageProjectsPerMonth: number;
  };
  trends: {
    projectOverTime: Array<{ month: string; count: number }>;
    commitsOverTime: Array<{ month: string; count: number }>;
    activityGrowth: 'increasing' | 'decreasing' | 'stable';
  };
}
