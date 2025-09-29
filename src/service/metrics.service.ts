import Logger from '../core/Logger';
import {
  ActivityMetric,
  ActivityType,
  LanguageMetric,
} from '../types/metrics.types';
import { Project } from '../types/project.types';
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
}

export const metricsService = new MetricsService();
