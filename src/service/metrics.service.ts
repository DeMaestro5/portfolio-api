import Logger from '../core/Logger';
import { LanguageMetric } from '../types/metrics.types';
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
}

export const metricsService = new MetricsService();
