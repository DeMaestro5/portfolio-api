import Logger from '../core/Logger';
import { GitHubCommit, GitHubRepository } from '../types/github.types';
import {
  ActivityMetric,
  ActivityType,
  CommitMetric,
  CommitSummary,
  ContributionsData,
  ContributionsSummary,
  CurrentStreakMetric,
  LanguageMetric,
  LongestStreakMetric,
  MetricsSummary,
  ProductivityMetrics,
  RepositoryContribution,
  RepositoryMetric,
  RepositorySummary,
  StreakMetrics,
  TechnologiesData,
  TechnologiesMetric,
  TechnologiesSummary,
  TimelineEvent,
  TimelineMetrics,
} from '../types/metrics.types';
import { Project } from '../types/project.types';
import { githubService } from './github.service';
import { projectService } from './project.service';

class MetricsService {
  async getLanguages(): Promise<LanguageMetric[]> {
    try {
      Logger.info('Fetching languages metrics');
      const projects = await projectService.getAllProjects();

      // Map to store language -> array of project names
      const languageMap = new Map<string, string[]>();

      projects.forEach((project) => {
        if (project.language) {
          const projectName =
            project.name || `Project-${project.id}` || 'Unknown';

          if (!languageMap.has(project.language)) {
            languageMap.set(project.language, []);
          }
          languageMap.get(project.language)!.push(projectName);
        }
      });

      // Calculate total projects with languages
      const totalProjectsWithLanguage = Array.from(languageMap.values()).reduce(
        (acc, projects) => acc + projects.length,
        0,
      );

      // Convert to LanguageMetric array
      const languageMetrics: LanguageMetric[] = Array.from(
        languageMap.entries(),
      ).map(([languageName, projectsForLanguage]) => ({
        name: languageName,
        count: projectsForLanguage.length,
        percentage:
          Math.round(
            (projectsForLanguage.length / totalProjectsWithLanguage) * 10000,
          ) / 100,
        projects: projectsForLanguage,
      }));

      return languageMetrics;
    } catch (error) {
      Logger.error('Error fetching language metrics:', error);
      throw error;
    }
  }

  async getActivity(type: ActivityType = 'recent'): Promise<ActivityMetric> {
    try {
      Logger.info('Fetching activity metrics');
      const projects = await projectService.getAllProjects();

      switch (type) {
        case 'recent':
          return this.getRecentActivity(projects);
        case 'monthly':
          return this.getMonthlyActivity(projects);
        case 'project':
          return this.getProjectActivity(projects);
        case 'technology':
          return this.getTechnologyActivity(projects);

        default:
          throw new Error('Invalid activity type');
      }
    } catch (error) {
      Logger.error('Error fetching activity metrics:', error);
      throw error;
    }
  }

  private getRecentActivity(projects: Project[]): ActivityMetric {
    const recentProjects = projects.filter(
      (project) =>
        project.created_at &&
        new Date(project.created_at) >
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    );

    return {
      type: 'recent',
      period: 'last 30 days',
      count: recentProjects.length,
      projects: recentProjects.map((project) => project.name),
      details: {},
    };
  }

  private getMonthlyActivity(project: Project[]): ActivityMetric {
    const monthlyProjects = project.filter((project) => {
      const projectDate = new Date(project.created_at || '');
      const currentDate = new Date();
      const monthDiff =
        currentDate.getMonth() -
        projectDate.getMonth() +
        12 * (currentDate.getFullYear() - projectDate.getFullYear());

      return monthDiff <= 1;
    });

    return {
      type: 'monthly',
      period: 'last month',
      count: monthlyProjects.length,
      projects: monthlyProjects.map((project) => project.name),
      details: {},
    };
  }

  private getProjectActivity(project: Project[]): ActivityMetric {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const activeProjects = project.filter((project) => {
      if (!project.updated_at) return false;
      return new Date(project.updated_at) > thirtyDaysAgo;
    });

    const recentlyPushed = project.filter((project) => {
      if (!project.pushed_at) return false;
      return new Date(project.pushed_at) > thirtyDaysAgo;
    });

    const totalProjects = project.length;
    const activeCount = activeProjects.length;
    const activityRate =
      totalProjects > 0 ? (activeCount / totalProjects) * 100 : 0;

    return {
      type: 'project',
      period: 'last 30 days',
      count: activeProjects.length,
      projects: activeProjects.map((project) => project.name),
      details: {
        totalProjects,
        activeProjects: activeCount,
        recentlyPushed: recentlyPushed.length,
        activityRate: Math.round(activityRate * 100) / 100,
        mostRecentUpdate:
          activeProjects.length > 0
            ? activeProjects.sort(
                (a, b) =>
                  new Date(b.updated_at!).getTime() -
                  new Date(a.updated_at!).getTime(),
              )[0].name
            : null,
      },
    };
  }

  private getTechnologyActivity(project: Project[]): ActivityMetric {
    const techCount = new Map<string, number>();
    const techProjects = new Map<string, string[]>();

    project.forEach((project) => {
      if (project.technologies && project.technologies.length > 0) {
        project.technologies.forEach((tech) => {
          techCount.set(tech, (techCount.get(tech) || 0) + 1);

          if (!techProjects.has(tech)) {
            techProjects.set(tech, []);
          }
          techProjects.get(tech)!.push(project.name);
        });
      }
    });

    const techActivity = Array.from(techCount.entries())
      .map(([tech, count]) => ({
        technology: tech,
        count,
        projects: techProjects.get(tech) || [],
        percentage: Math.round((count / project.length) * 10000) / 100,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      type: 'technology',
      period: 'last 30 days',
      count: techActivity.length,
      projects: techActivity.map((tech) => tech.technology),
      details: {
        totalTechnologies: techActivity.length,
        mostUsedTechnology: techActivity[0]?.technology,
        mostUsedTechnologyCount: techActivity[0]?.count,
        mostUsedTechnologyProjects: techActivity[0]?.projects,
        mostUsedTechnologyPercentage: techActivity[0]?.percentage,
        leastUsedTechnology: techActivity[techActivity.length - 1]?.technology,
        leastUsedTechnologyCount: techActivity[techActivity.length - 1]?.count,
        leastUsedTechnologyProjects:
          techActivity[techActivity.length - 1]?.projects,
        leastUsedTechnologyPercentage:
          techActivity[techActivity.length - 1]?.percentage,
        averageUsage:
          techActivity.length > 0
            ? Math.round(
                (techActivity.reduce((sum, tech) => sum + tech.count, 0) /
                  techActivity.length) *
                  100,
              ) / 100
            : 0,
      },
    };
  }

  async getCommitActivity(): Promise<{
    commitMetrics: CommitMetric[];
    commitSummary: CommitSummary;
  }> {
    try {
      Logger.info('Fetching commit activity metrics');

      const repositories = await githubService.fetchAllRepositoriesInBatches(
        15,
        8,
      );

      const commits = await this.fetchCommitsInBatches(repositories);

      const commitMap = new Map<string, GitHubCommit[]>();

      commits.forEach((commit) => {
        const repoName = commit.repository.name;
        if (!commitMap.has(repoName)) {
          commitMap.set(repoName, []);
        }
        commitMap.get(repoName)!.push(commit);
      });

      const commitMetrics: CommitMetric[] = Array.from(commitMap.entries())
        .map(([repoName, repoCommits]) => ({
          repository: repoName,
          commitCount: repoCommits.length,
          lastCommit: repoCommits[0]?.author.date || '',
          authors: [...new Set(repoCommits.map((c) => c.author.name))],
          messages: repoCommits.map((c) => c.message),
        }))
        .sort((a, b) => b.commitCount - a.commitCount);

      const commitSummary: CommitSummary = {
        totalCommits: commits.length,
        totalRepositories: repositories.length,
        mostActiveRepository: commitMetrics[0]?.repository || '',
        mostActiveRepositoryCount: commitMetrics[0]?.commitCount || 0,
        averageCommitsPerRepository:
          repositories.length > 0
            ? Math.round(commits.length / repositories.length)
            : 0,
        recentCommits: commits.slice(0, 5),
      };

      return {
        commitMetrics,
        commitSummary,
      };
    } catch (error) {
      Logger.error('Error fetching commit activity metrics:', error);
      throw error;
    }
  }

  private async fetchCommitsInBatches(
    repositories: GitHubRepository[],
    batchSize: number = 5,
  ): Promise<GitHubCommit[]> {
    const allCommits: GitHubCommit[] = [];

    for (let i = 0; i < repositories.length; i += batchSize) {
      const batch = repositories.slice(i, i + batchSize);

      const batchPromises = batch.map(async (repo) => {
        try {
          return await githubService.fetchRepositoryCommitsByProject(repo, 50);
        } catch (error) {
          Logger.warn(`Failed to fetch commits for ${repo.name}`, { error });
          return [];
        }
      });

      const batchResults = await Promise.all(batchPromises);
      allCommits.push(...batchResults.flat());

      // Memory check
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);

      if (heapUsedMB > 350) {
        Logger.warn('Memory usage high during commit processing', {
          heapUsedMB,
        });
        break;
      }

      // Small delay between batches
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return allCommits;
  }

  async getRepositoriesMetrics(): Promise<{
    repositories: RepositoryMetric[];
    summary: RepositorySummary;
  }> {
    try {
      Logger.info('Fetching repositories metrics');
      const repositories = await githubService.fetchAllRepositoriesInBatches(
        20,
        10,
      );
      const repositoryMetrics = repositories
        .map((repository) => this.transformRepository(repository))
        .sort((a, b) => (b.stars || 0) - (a.stars || 0));

      const summary = await this.getRepositoriesSummary(
        repositories,
        repositoryMetrics,
      );

      return {
        repositories: repositoryMetrics,
        summary,
      };
    } catch (error) {
      Logger.error('Error fetching repositories metrics:', error);
      throw error;
    }
  }

  private calculateActivityScore(repository: GitHubRepository): number {
    let score = 0;

    if (repository.updated_at) {
      const daysSinceUpdate =
        (Date.now() - new Date(repository.updated_at).getTime()) /
        (1000 * 60 * 60 * 24);
      score += Math.max(0, 30 - daysSinceUpdate);
    }
    score += (repository.stargazers_count || 0) * 2;
    score += (repository.forks_count || 0) * 3;

    return Math.round(score);
  }
  private async getRepositoriesSummary(
    repositories: GitHubRepository[],
    repositoryMetrics: RepositoryMetric[],
  ): Promise<RepositorySummary> {
    try {
      // Calculate language distribution
      const languageMap = new Map<string, number>();
      repositories.forEach((repo) => {
        if (repo.language) {
          languageMap.set(repo.name, (languageMap.get(repo.name) || 0) + 1);
        }
      });

      const totalStars = repositories.reduce(
        (sum, repo) => sum + (repo.stargazers_count || 0),
        0,
      );
      const totalForks = repositories.reduce(
        (sum, repo) => sum + (repo.forks_count || 0),
        0,
      );

      const sortedByStars = [...repositories].sort(
        (a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0),
      );

      return {
        totalRepositories: repositoryMetrics.length,
        publicRepositories: repositoryMetrics.filter((r) => !r.isPrivate)
          .length,
        privateRepositories: repositoryMetrics.filter((r) => r.isPrivate)
          .length,
        mostStarredRepository: sortedByStars[0]?.name || '',
        mostStarredRepositoryStars: sortedByStars[0]?.stargazers_count || 0,
        averageStarsPerRepository:
          repositories.length > 0
            ? Math.round(totalStars / repositories.length)
            : 0,
        totalStars,
        totalForks,
        mostUsedLanguage:
          Array.from(languageMap.entries()).sort(
            (a, b) => b[1] - a[1],
          )[0]?.[0] || 'None',
        languageDistribution: Object.fromEntries(languageMap),
        recentRepositories: repositoryMetrics.slice(0, 5),
      };
    } catch (error) {
      Logger.error('Error fetching repository summary:', error);
      throw error;
    }
  }
  private transformRepository(repository: GitHubRepository): RepositoryMetric {
    return {
      name: repository.name,
      description: repository.description,
      url: repository.html_url || null,
      stars: repository.stargazers_count || 0,
      forks: repository.forks_count || 0,
      size: repository.size || 0,
      createdAt: repository.created_at || '',
      updatedAt: repository.updated_at || '',
      lastPushed: repository.pushed_at || '',
      topics: repository.topics || [],
      isPrivate: repository.is_private,
      activityScore: this.calculateActivityScore(repository),
    };
  }

  async getContributionsMetrics(): Promise<ContributionsData> {
    try {
      Logger.info('Fetching contributions metrics');
      const repositories = await githubService.fetchRepositories();
      const commits = await githubService.fetchAllCommits(repositories, 365);

      const commitMap = new Map<string, GitHubCommit[]>();

      commits.forEach((commit) => {
        const repoName = commit.repository.name;
        if (!commitMap.has(repoName)) {
          commitMap.set(repoName, []);
        }
        commitMap.get(repoName)!.push(commit);
      });

      const repositoryContributions: RepositoryContribution[] = Array.from(
        commitMap.entries(),
      )
        .map(([repoName, repoCommits]) => ({
          repository: repoName,
          contributionCount: repoCommits.length,
          lastContribution: repoCommits[0]?.author.date || '',
          authors: [...new Set(repoCommits.map((c) => c.author.name))],
          recentCommits: repoCommits.slice(0, 3),
        }))
        .sort((a, b) => b.contributionCount - a.contributionCount);

      const summary = this.calculateContributionsSummary(
        commits,
        repositoryContributions,
      );

      return {
        repositories: repositoryContributions,
        summary,
      };
    } catch (error) {
      Logger.error('Error fetching contributions metrics:', error);
      throw error;
    }
  }
  private calculateContributionsSummary(
    commits: GitHubCommit[],
    repositoryContributions: RepositoryContribution[],
  ): ContributionsSummary {
    const totalContributions = commits.length;
    const totalRepositories = repositoryContributions.length;
    const totalAuthors = [...new Set(commits.map((c) => c.author.name))].length;

    const mostContributedRepository = repositoryContributions[0] || {
      repository: 'Unknown',
      contributionCount: 0,
      lastContribution: '',
      authors: [],
      recentCommits: [],
    };

    const authorMap = new Map<string, number>();
    commits.forEach((commit) => {
      const authorName = commit.author.name;
      authorMap.set(authorName, (authorMap.get(authorName) || 0) + 1);
    });

    const mostActiveAuthor =
      Array.from(authorMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      'Unknown';

    return {
      totalContributions,
      totalRepositories,
      totalAuthors,
      mostActiveAuthor,
      mostContributedRepository: mostContributedRepository.repository,
      mostContributedRepositoryContributions:
        mostContributedRepository.contributionCount,
      averageContributionsPerRepository:
        totalRepositories > 0
          ? Math.round(totalContributions / totalRepositories)
          : 0,
      recentContributions: commits.slice(0, 5),
    };
  }

  async getProductivityMetrics(): Promise<ProductivityMetrics> {
    try {
      const repositories = await githubService.fetchRepositories();
      const commits = await githubService.fetchAllCommits(repositories, 365);

      // calculate time based metrics

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const commitsThisWeek = commits.filter(
        (commit) => new Date(commit.author.date) > oneWeekAgo,
      );

      const commitsThisMonth = commits.filter(
        (commit) => new Date(commit.author.date) > oneMonthAgo,
      );

      const activeDays = new Set(
        commitsThisMonth.map((commit) =>
          new Date(commit.author.date).toDateString(),
        ),
      ).size;

      const repoMap = new Map<string, GitHubCommit[]>();

      commits.forEach((commit) => {
        const repoName = commit.repository.name;
        if (!repoMap.has(repoName)) {
          repoMap.set(repoName, []);
        }
        repoMap.get(repoName)!.push(commit);
      });

      const mostActive = Array.from(repoMap.entries()).sort(
        (a, b) => b[1].length - a[1].length,
      )[0];

      return {
        totalCommits: commits.length,
        totalRepositories: repositories.length,
        mostActiveRepository: mostActive?.[0] || 'Unknown',
        mostActiveRepositoryCount: mostActive?.[1].length || 0,
        averageCommitsPerRepository:
          repositories.length > 0
            ? Math.round(commits.length / repositories.length)
            : 0,
        recentCommits: commits.slice(0, 5),
        commitsThisWeek: commitsThisWeek.length,
        commitsThisMonth: commitsThisMonth.length,
        activeDaysThisMonth: activeDays,
        lastActivityDate: commits[0]?.author.date || '',
      };
    } catch (error: any) {
      Logger.error('Error fetching productivity metrics:', error);
      throw error;
    }
  }

  async getTechnologiesMetrics(): Promise<TechnologiesData> {
    try {
      Logger.info('Fetching technologies metrics');

      const projects = await projectService.getAllProjects();

      const techMap = new Map<string, string[]>();

      projects.forEach((project) => {
        if (!project.technologies) return;
        project.technologies.forEach((tech) => {
          if (!techMap.has(tech)) {
            techMap.set(tech, []);
          }
          techMap.get(tech)!.push(project.name);
        });
      });

      const totalProjectsWithTech = new Set(
        projects.filter(
          (project) => project.technologies && project.technologies.length > 0,
        ),
      ).size;

      const technologiesMetrics: TechnologiesMetric[] = Array.from(
        techMap.entries(),
      ).map(([techName, projectsForTech]) => ({
        name: techName,
        count: projectsForTech.length,
        percentage:
          Math.round((projectsForTech.length / totalProjectsWithTech) * 10000) /
          100,
        projects: projectsForTech,
      }));

      const summary = this.calculateTechnologiesSummary(
        technologiesMetrics,
        projects,
      );

      const techResult: TechnologiesData = {
        technologies: technologiesMetrics,
        summary,
      };

      return techResult;
    } catch (error: any) {
      Logger.error('Error fetching technologies metrics:', error);
      throw error;
    }
  }
  private calculateTechnologiesSummary(
    technologies: TechnologiesMetric[],
    projects: Project[],
  ): TechnologiesSummary {
    const totalTechnologies = technologies.length;
    const totalTechnologyUsage = technologies.reduce(
      (sum, tech) => sum + tech.count,
      0,
    );
    const totalProjects = projects.length;

    const mostUsedTechnology = [...technologies].sort(
      (a, b) => b.count - a.count,
    )[0];

    return {
      totalTechnologies,
      totalProjects,
      averageTechnologiesPerProject:
        totalProjects > 0
          ? Math.round((totalTechnologyUsage / totalProjects) * 100) / 100
          : 0,
      mostUsedTechnology: mostUsedTechnology?.name || 'None',
      mostUsedTechnologyCount: mostUsedTechnology?.count || 0,
      technologyDiversity: technologies.length,
    };
  }

  async getStreakMetrics(): Promise<StreakMetrics> {
    try {
      const repositories = await githubService.fetchRepositories();
      const commits = await githubService.fetchAllCommits(repositories, 365);

      const commitMap = new Map<string, GitHubCommit[]>();

      commits.forEach((commit) => {
        const day = new Date(commit.author.date).toDateString();
        if (!commitMap.has(day)) {
          commitMap.set(day, []);
        }
        commitMap.get(day)!.push(commit);
      });

      const commitDays = Array.from(commitMap.keys())
        .map((day) => new Date(day))
        .sort((a, b) => a.getTime() - b.getTime());

      const streaks = this.calculateStreaks(commitDays);

      return {
        totalCommits: commits.length,
        firstCommit: commitDays[0] || new Date(),
        lastCommit: commitDays[commitDays.length - 1] || new Date(),
        currentStreak: streaks.currentStreak,
        longestStreak: streaks.longestStreak,
        commitsDays: commitDays.length,
      };
    } catch (error: any) {
      Logger.error('Error fetching streak metrics:', error);
      throw error;
    }
  }
  private calculateStreaks(commitDays: Date[]): {
    currentStreak: CurrentStreakMetric;
    longestStreak: LongestStreakMetric;
  } {
    if (commitDays.length === 0) {
      return {
        currentStreak: { start: new Date(), end: new Date(), days: 0 },
        longestStreak: { start: new Date(), end: new Date(), days: 0 },
      };
    }

    if (commitDays.length === 1) {
      return {
        currentStreak: { start: commitDays[0], end: commitDays[0], days: 1 },
        longestStreak: { start: commitDays[0], end: commitDays[0], days: 1 },
      };
    }

    const streaks = this.findConsecutiveDays(commitDays);
    const currentStreak = this.getCurrentStreak([...commitDays].reverse());

    const longestStreak =
      streaks.length > 0
        ? streaks.reduce((longest, streak) =>
            streak.days > longest.days ? streak : longest,
          )
        : { start: new Date(), end: new Date(), days: 0 };

    return {
      currentStreak,
      longestStreak,
    };
  }
  private findConsecutiveDays(
    dates: Date[],
  ): Array<{ start: Date; end: Date; days: number }> {
    const streaks = [];
    let currentStreak = [dates[0]];

    for (let i = 1; i < dates.length; i++) {
      const currentDate = dates[i];
      const previousDate = dates[i - 1];
      const dayDiff =
        (currentDate.getTime() - previousDate.getTime()) /
        (1000 * 60 * 60 * 24);

      if (dayDiff === 1) {
        // consecutive days
        currentStreak.push(currentDate);
      } else {
        // streak broken
        if (currentStreak.length > 1) {
          streaks.push({
            start: currentStreak[0],
            end: currentStreak[currentStreak.length - 1],
            days: currentStreak.length,
          });
        }
        currentStreak = [currentDate];
      }
    }

    // add the last streak
    if (currentStreak.length > 1) {
      streaks.push({
        start: currentStreak[0],
        end: currentStreak[currentStreak.length - 1],
        days: currentStreak.length,
      });
    }

    return streaks;
  }

  private getCurrentStreak(dates: Date[]): CurrentStreakMetric {
    if (dates.length === 0) {
      return { start: new Date(), end: new Date(), days: 0 };
    }

    // Normalize dates to midnight for accurate day comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mostRecentCommit = new Date(dates[0]);
    mostRecentCommit.setHours(0, 0, 0, 0);

    // Calculate days between today and most recent commit
    const daysSinceLastCommit = Math.floor(
      (today.getTime() - mostRecentCommit.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Streak is broken if last commit was more than 1 day ago
    // (allows for today or yesterday to maintain current streak)
    if (daysSinceLastCommit > 1) {
      return { start: new Date(), end: new Date(), days: 0 };
    }

    // Count consecutive days backwards from the most recent commit
    let streakCount = 1;
    let streakStart = dates[0];

    for (let i = 1; i < dates.length; i++) {
      const currentDate = new Date(dates[i]);
      currentDate.setHours(0, 0, 0, 0);

      const previousDate = new Date(dates[i - 1]);
      previousDate.setHours(0, 0, 0, 0);

      const dayDiff = Math.floor(
        (previousDate.getTime() - currentDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      // Check if dates are consecutive (1 day apart)
      if (dayDiff === 1) {
        streakCount++;
        streakStart = dates[i];
      } else {
        break;
      }
    }

    return {
      start: streakStart,
      end: dates[0], // End is the most recent commit date
      days: streakCount,
    };
  }
  private aggregateSummary(data: {
    languages: LanguageMetric[];
    technologies: TechnologiesData;
    repositories: {
      repositories: RepositoryMetric[];
      summary: RepositorySummary;
    };
    commits: CommitMetric[];
    activity: ActivityMetric;
    productivity: ProductivityMetrics;
    streak: StreakMetrics;
  }): MetricsSummary {
    return {
      portfolio: {
        totalProjects: data.repositories.summary.totalRepositories,
        totalCommits: data.productivity.totalCommits,
        totalTechnologies: data.technologies.summary.totalTechnologies,
        totalLanguages: data.languages.length,
      },
      activity: {
        currentStreak: data.streak.currentStreak.days,
        longestStreak: data.streak.longestStreak.days,
        activeDaysThisMonth: data.productivity.activeDaysThisMonth,
        commitsThisMonth: data.productivity.commitsThisMonth,
        mostActiveRepository: data.commits[0]?.repository || 'None',
      },
      techStack: {
        mostUsedLanguage: data.languages[0]?.name || 'None',
        mostUsedTechnology:
          data.technologies.summary.mostUsedTechnology || 'None',
        languageDiversity: data.languages.length,
        technologyDiversity: data.technologies.summary.totalTechnologies,
        averageTechnologiesPerProject:
          data.technologies.summary.averageTechnologiesPerProject,
      },
      productivity: {
        averageCommitsPerDay: this.calculateAverageCommitsPerDay(
          data.productivity,
        ),
        averageCommitsPerRepository:
          data.productivity.averageCommitsPerRepository,
        consistency: this.determineConsistency(data.streak),
      },
      recent: {
        lastActivity: data.productivity.lastActivityDate,
        recentCommits: data.productivity.commitsThisWeek,
        recentProjects: data.activity.count,
        recentTechnologies: data.technologies.technologies
          .slice(0, 5)
          .map((t) => t.name),
      },
    };
  }
  private calculateAverageCommitsPerDay(
    productivity: ProductivityMetrics,
  ): number {
    const totalDays = productivity.activeDaysThisMonth;
    const totalCommits = productivity.commitsThisMonth;
    return Math.floor(totalCommits / totalDays);
  }

  private determineConsistency(
    streak: StreakMetrics,
  ): 'high' | 'medium' | 'low' {
    const days = streak.longestStreak.days;
    if (days >= 10) return 'high';
    if (days >= 5) return 'medium';
    return 'low';
  }

  async getMetricsSummary(): Promise<MetricsSummary> {
    try {
      const [
        languages,
        technologies,
        repositories,
        commits,
        activity,
        productivity,
        streak,
      ] = await Promise.all([
        this.getLanguages(),
        this.getTechnologiesMetrics(),
        this.getRepositoriesMetrics(),
        this.getCommitActivity(),
        this.getActivity('recent'),
        this.getProductivityMetrics(),
        this.getStreakMetrics(),
      ]);

      const summary = this.aggregateSummary({
        languages,
        technologies,
        repositories,
        commits: commits.commitMetrics,
        activity,
        productivity,
        streak,
      });

      return summary;
    } catch (error) {
      Logger.error('Error fetching metrics summary:', error);
      throw error;
    }
  }

  async getTimelineMetrics(): Promise<TimelineMetrics> {
    try {
      Logger.info('Fetching timeline metrics');

      const repositories = await githubService.fetchRepositories();
      const commits = await githubService.fetchAllCommits(repositories, 365);

      // create timeline events
      const events = this.createTimeLineEvents(repositories, commits);

      // calculate summary metrics
      const summary = this.calculateTimelineSummary(
        repositories,
        commits,
        events,
      );

      // calculate trends
      const trends = this.calculateTimelineTrends(repositories, commits);

      const timeLineResult = {
        events: events.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
        summary,
        trends,
      };

      return timeLineResult;
    } catch (error: any) {
      Logger.error('Error fetching timeline metrics:', error);
      throw error;
    }
  }
  private createTimeLineEvents(
    repositories: GitHubRepository[],
    commits: GitHubCommit[],
  ): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    // create project creation events
    repositories.forEach((repo) => {
      if (repo.created_at) {
        events.push({
          date: repo.created_at || '',
          type: 'project_created',
          project: repo.name,
          description: `Project ${repo.name} created`,
          metadata: {
            language: repo.language || undefined,
            size: repo.size || 0,
          },
        });
      }

      // add star event (if any)
      if (repo.stargazers_count && repo.stargazers_count > 0) {
        events.push({
          date: repo.pushed_at || '',
          type: 'star_received',
          project: repo.name,
          description: `Project ${repo.name} received ${repo.stargazers_count} stars`,
          metadata: {
            stars: repo.stargazers_count,
          },
        });
      }

      // add fork event (if any)
      if (repo.forks_count && repo.forks_count > 0) {
        events.push({
          date: repo.pushed_at || '',
          type: 'fork_received',
          project: repo.name,
          description: `Project ${repo.name} received ${repo.forks_count} forks`,
          metadata: {
            forks: repo.forks_count,
          },
        });
      }
    });

    //add commit milestones(every 10th commit per repository)
    const commitMap = new Map<string, GitHubCommit[]>();

    commits.forEach((commit) => {
      const repoName = commit.repository.name;
      if (!commitMap.has(repoName)) {
        commitMap.set(repoName, []);
      }
      commitMap.get(repoName)!.push(commit);
    });

    commitMap.forEach((repoCommits, repoName) => {
      //sort commits by date
      const sortedCommits = [...repoCommits].sort(
        (a, b) =>
          new Date(b.author.date).getTime() - new Date(a.author.date).getTime(),
      );

      //add milestone events
      for (let i = 9; i < sortedCommits.length; i += 10) {
        events.push({
          date: sortedCommits[i].author.date,
          type: 'commit_milestone',
          project: repoName,
          description: `Project ${repoName} reached ${i + 1} commits`,
          metadata: {
            commits: i + 1,
          },
        });
      }
    });

    return events;
  }

  private calculateTimelineSummary(
    repositories: GitHubRepository[],
    commits: GitHubCommit[],
    events: TimelineEvent[],
  ): TimelineMetrics['summary'] {
    const projectEvents = events.filter((e) => e.type === 'project_created');
    const dates = projectEvents
      .map((e) => new Date(e.date))
      .sort((a, b) => a.getTime() - b.getTime());

    const start = dates[0] || new Date();
    const end = dates[dates.length - 1] || new Date();
    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );

    // calculate most/least active months
    const monthlyActivity = new Map<string, number>();
    commits.forEach((commit) => {
      const month = new Date(commit.author.date)
        .toLocaleString()
        .substring(0, 7);
      monthlyActivity.set(month, (monthlyActivity.get(month) || 0) + 1);
    });

    let mostActiveMonth = '';
    let leastActiveMonth = '';
    let maxActivity = 0;
    let minActivity = Infinity;

    monthlyActivity.forEach((count, month) => {
      if (count > maxActivity) {
        maxActivity = count;
        mostActiveMonth = month;
      }
      if (count < minActivity) {
        minActivity = count;
        leastActiveMonth = month;
      }
    });
    const result = {
      totalProjects: repositories.length,
      totalCommits: commits.length,
      developmentSpan: {
        start: start.toISOString(),
        end: end.toISOString(),
        days,
      },
      mostActiveMonth,
      leastActiveMonth,
      averageProjectsPerMonth:
        days > 0
          ? Math.round((repositories.length / (days / 30)) * 100) / 100
          : 0,
    };

    return result;
  }

  private calculateTimelineTrends(
    repositories: GitHubRepository[],
    commits: GitHubCommit[],
  ): TimelineMetrics['trends'] {
    //projects over time
    const projectsOverTime = new Map<string, number>();
    repositories.forEach((repo) => {
      const month = new Date(repo.created_at || '')
        .toLocaleString()
        .substring(0, 7);
      projectsOverTime.set(month, (projectsOverTime.get(month) || 0) + 1);
    });
    // commits over time
    const commitsOverTime = new Map<string, number>();
    commits.forEach((commit) => {
      const month = new Date(commit.author.date)
        .toLocaleString()
        .substring(0, 7);
      commitsOverTime.set(month, (commitsOverTime.get(month) || 0) + 1);
    });

    // determine activity growth trend
    const commitCounts = Array.from(commitsOverTime.values()).sort(
      (a, b) => b - a,
    );
    const recent =
      commitCounts.slice(-3).reduce((sum, count) => sum + count, 0) / 3;
    const older =
      commitCounts.slice(0, 3).reduce((sum, count) => sum + count, 0) / 3;

    let activityGrowth: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recent > older * 1.2) activityGrowth = 'increasing';
    else if (recent < older * 0.8) activityGrowth = 'decreasing';

    const result = {
      projectOverTime: Array.from(projectsOverTime.entries())
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      commitsOverTime: Array.from(commitsOverTime.entries())
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      activityGrowth,
    };
    return result;
  }
}
export const metricsService = new MetricsService();
