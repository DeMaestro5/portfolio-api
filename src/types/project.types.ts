export interface Project {
  id: number;
  name: string;
  description: string | null;
  html_url: string | null | undefined;
  language: string | null | undefined;
  stargazers_count: number | null | undefined;
  forks_count: number | null | undefined;
  created_at: string | null | undefined;
  updated_at: string | null | undefined;
  categories: ProjectCategory[];
  status: ProjectStatus;
  featured: boolean;
  demo_url?: string;
  technologies: string[];
  pushed_at: string | null | undefined;
  topics: string[] | undefined;
}

export type ProjectCategory =
  | 'web'
  | 'fullstack'
  | 'web-frontend'
  | 'web-backend'
  | 'mobile'
  | 'desktop'
  | 'backend'
  | 'database'
  | 'other';

export type ProjectStatus =
  | 'active'
  | 'inactive'
  | 'archived'
  | 'completed'
  | 'in development'
  | 'experimental';
