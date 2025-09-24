export interface GitHubProfile {
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  location: string | null;
  email: string | null;
  company: string | null;
  blog: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  repository: {
    name: string;
    full_name: string;
  };
}

export interface GitHubStats {
  totalRepos: number;
  totalStars: number;
  totalForks: number;
  languages: { [language: string]: number };
  recentActivity: {
    activeReposThisWeek: number;
    activeReposThisMonth: number;
  };
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null | undefined;
  stargazers_count: number | undefined;
  forks_count: number | undefined;
  size: number | undefined;
  created_at: string | undefined | null;
  updated_at: string | undefined | null;
  pushed_at: string | undefined | null;
  html_url: string | undefined | null;
  clone_url: string | undefined | null;
  topics: string[] | undefined;
  is_private: boolean;
}

export interface GitHubOverview {
  profile: GitHubProfile;
  stats: GitHubStats;
  commits: GitHubCommit[];
}

export interface GitHubActivity {
  id: string;
  type: string;
  actor: {
    login: string;
    avatar_url: string;
  };
  repo: {
    name: string;
    url: string;
  };
  payload: any;
  created_at: string;
  public: boolean;
}

export interface ActivityFeed {
  activities: GitHubActivity[];
  totalCount: number;
  lastUpdated: string;
}

export interface GitHubLanguage {
  language: string;
  bytes: number;
}

export interface GitHubContributor {
  login: string;
  avatar_url: string;
  contributions: number;
}

export interface GitHubEvents {
  id: string;
  type: string;
  actor: {
    login: string;
    avatar_url: string;
  };
  repo: {
    name: string;
  };
}
