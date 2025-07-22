import { Card, CollectionMetadata } from "./core.js";

/**
 * Metadata calculation function type
 */
export type MetadataCalculatorFunction<T = any> = (cards: Card[]) => T;

/**
 * Aggregation operations for metadata calculations
 */
export enum AggregationType {
  SUM = "sum",
  AVERAGE = "average",
  COUNT = "count",
  MIN = "min",
  MAX = "max",
  MEDIAN = "median",
  MODE = "mode",
  UNIQUE_COUNT = "unique_count",
  GROUP_BY = "group_by",
  CUSTOM = "custom",
}

/**
 * Base metadata rule configuration
 */
export interface MetadataRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;

  // Field to operate on
  field: string;

  // How to aggregate the data
  aggregation: AggregationType;

  // Optional conditions/filters
  conditions?: MetadataCondition[];

  // Output configuration
  output: {
    key: string; // Key in the metadata object
    type: "number" | "string" | "boolean" | "object" | "array";
    format?: string; // For formatting numbers/dates
  };

  // For custom calculations
  customCalculator?: MetadataCalculatorFunction;
}

/**
 * Condition for filtering cards before calculation
 */
export interface MetadataCondition {
  field: string;
  operator:
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "in"
    | "nin"
    | "contains"
    | "regex";
  value: any;
  logicalOperator?: "and" | "or";
}

/**
 * Distribution calculation configuration
 */
export interface DistributionRule extends Omit<MetadataRule, "aggregation"> {
  aggregation: AggregationType.GROUP_BY;
  distributionConfig: {
    groupByField: string;
    valueField?: string; // If not provided, counts occurrences
    includePercentages?: boolean;
    sortBy?: "key" | "value" | "count";
    sortDirection?: "asc" | "desc";
    topN?: number; // Only include top N results
  };
}

/**
 * Custom metric configuration
 */
export interface CustomMetricRule
  extends Omit<MetadataRule, "aggregation" | "field"> {
  aggregation: AggregationType.CUSTOM;
  customCalculator: MetadataCalculatorFunction;
  dependencies?: string[]; // Field names this metric depends on
}

/**
 * Power level calculation configuration
 */
export interface PowerLevelRule extends Omit<MetadataRule, "aggregation"> {
  powerLevelConfig: {
    baseFields: {
      cost?: { weight: number; field: string };
      power?: { weight: number; field: string };
      toughness?: { weight: number; field: string };
      rarity?: {
        weight: number;
        field: string;
        rarityValues: Record<string, number>;
      };
    };
    modifiers?: {
      keywords?: { weight: number; keywordValues: Record<string, number> };
      abilities?: { weight: number; abilityValues: Record<string, number> };
      synergies?: {
        weight: number;
        synergyCalculator: MetadataCalculatorFunction;
      };
    };
    normalizationFactor?: number;
    maxPowerLevel?: number;
  };
}

/**
 * Complete metadata configuration
 */
export interface MetadataConfig {
  version: string;

  // Built-in rules that are always calculated
  builtinRules: {
    totalCards: boolean;
    totalCost: boolean;
    averageCost: boolean;
    rarityDistribution: boolean;
    typeDistribution: boolean;
    colorDistribution: boolean;
    setDistribution: boolean;
    averagePower: boolean;
    averageToughness: boolean;
  };

  // Custom rules
  customRules: MetadataRule[];

  // Distribution rules
  distributionRules: DistributionRule[];

  // Power level calculation
  powerLevelRules: PowerLevelRule[];

  // Custom metrics
  customMetrics: CustomMetricRule[];

  // Global settings
  settings: {
    includeEmptyValues: boolean;
    roundingPrecision: number;
    cacheResults: boolean;
    cacheTtl: number; // seconds
  };
}

/**
 * Metadata calculation result
 */
export interface MetadataCalculationResult {
  metadata: CollectionMetadata;
  calculationTime: number; // milliseconds
  rulesApplied: string[]; // Rule IDs that were applied
  errors?: string[]; // Any errors during calculation
  warnings?: string[]; // Any warnings during calculation
}

/**
 * Metadata calculator interface
 */
export interface MetadataCalculatorInterface {
  /**
   * Calculate metadata for a collection of cards
   */
  calculate(
    cards: Card[],
    config?: Partial<MetadataConfig>
  ): Promise<MetadataCalculationResult>;

  /**
   * Calculate metadata with a specific rule
   */
  calculateWithRule(cards: Card[], rule: MetadataRule): Promise<any>;

  /**
   * Validate a metadata configuration
   */
  validateConfig(config: MetadataConfig): {
    isValid: boolean;
    errors: string[];
  };

  /**
   * Get available built-in calculators
   */
  getBuiltinCalculators(): Record<string, MetadataCalculatorFunction>;

  /**
   * Register a custom calculator
   */
  registerCustomCalculator(
    id: string,
    calculator: MetadataCalculatorFunction
  ): void;

  /**
   * Get the current configuration
   */
  getConfig(): MetadataConfig;

  /**
   * Update the configuration
   */
  updateConfig(config: Partial<MetadataConfig>): void;
}

/**
 * Predefined metadata templates for common use cases
 */
export interface MetadataTemplate {
  id: string;
  name: string;
  description: string;
  config: MetadataConfig;
  tags: string[];
}

/**
 * Metadata template manager interface
 */
export interface MetadataTemplateManager {
  /**
   * Get all available templates
   */
  getTemplates(): MetadataTemplate[];

  /**
   * Get a template by ID
   */
  getTemplate(id: string): MetadataTemplate | null;

  /**
   * Create a new template
   */
  createTemplate(template: Omit<MetadataTemplate, "id">): string; // Returns template ID

  /**
   * Update an existing template
   */
  updateTemplate(id: string, template: Partial<MetadataTemplate>): boolean;

  /**
   * Delete a template
   */
  deleteTemplate(id: string): boolean;

  /**
   * Search templates by tags or name
   */
  searchTemplates(query: string, tags?: string[]): MetadataTemplate[];
}

/**
 * Built-in metadata templates
 */
export const BuiltinTemplates = {
  BASIC: "basic",
  COMPETITIVE: "competitive",
  COLLECTOR: "collector",
  CASUAL: "casual",
  LIMITED: "limited",
} as const;

/**
 * Metadata cache interface
 */
export interface MetadataCache {
  /**
   * Get cached metadata
   */
  get(key: string): CollectionMetadata | null;

  /**
   * Set cached metadata
   */
  set(key: string, metadata: CollectionMetadata, ttl?: number): void;

  /**
   * Clear cache
   */
  clear(): void;

  /**
   * Generate cache key for a collection
   */
  generateKey(cards: Card[], configHash: string): string;
}
