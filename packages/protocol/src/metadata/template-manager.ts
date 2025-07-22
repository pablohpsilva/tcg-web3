import {
  MetadataTemplateManager,
  MetadataTemplate,
  BuiltinTemplates,
} from "../types/metadata.js";

/**
 * Simple template manager implementation
 */
export class TemplateManager implements MetadataTemplateManager {
  private templates = new Map<string, MetadataTemplate>();

  constructor() {
    this.registerBuiltinTemplates();
  }

  getTemplates(): MetadataTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplate(id: string): MetadataTemplate | null {
    return this.templates.get(id) || null;
  }

  createTemplate(template: Omit<MetadataTemplate, "id">): string {
    const id = `template_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const fullTemplate: MetadataTemplate = { ...template, id };
    this.templates.set(id, fullTemplate);
    return id;
  }

  updateTemplate(id: string, template: Partial<MetadataTemplate>): boolean {
    const existing = this.templates.get(id);
    if (!existing) return false;

    this.templates.set(id, { ...existing, ...template, id });
    return true;
  }

  deleteTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  searchTemplates(query: string, tags?: string[]): MetadataTemplate[] {
    const allTemplates = Array.from(this.templates.values());

    return allTemplates.filter((template) => {
      const matchesQuery =
        !query ||
        template.name.toLowerCase().includes(query.toLowerCase()) ||
        template.description.toLowerCase().includes(query.toLowerCase());

      const matchesTags =
        !tags ||
        tags.length === 0 ||
        tags.some((tag) => template.tags.includes(tag));

      return matchesQuery && matchesTags;
    });
  }

  private registerBuiltinTemplates(): void {
    // Basic template
    this.templates.set(BuiltinTemplates.BASIC, {
      id: BuiltinTemplates.BASIC,
      name: "Basic Analysis",
      description: "Basic card statistics and distributions",
      config: {
        version: "1.0.0",
        builtinRules: {
          totalCards: true,
          totalCost: true,
          averageCost: true,
          rarityDistribution: true,
          typeDistribution: true,
          colorDistribution: false,
          setDistribution: true,
          averagePower: false,
          averageToughness: false,
        },
        customRules: [],
        distributionRules: [],
        powerLevelRules: [],
        customMetrics: [],
        settings: {
          includeEmptyValues: false,
          roundingPrecision: 2,
          cacheResults: true,
          cacheTtl: 300,
        },
      },
      tags: ["basic", "simple"],
    });

    // Add other templates...
  }
}
