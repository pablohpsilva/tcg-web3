import {
  MetadataCalculatorInterface,
  MetadataConfig,
  MetadataCalculationResult,
  MetadataRule,
  MetadataCalculatorFunction as Calculator,
  AggregationType,
} from "../types/metadata.js";
import {
  Card,
  CollectionMetadata,
  CardRarity,
  CardType,
} from "../types/core.js";

/**
 * Default metadata configuration
 */
const DEFAULT_CONFIG: MetadataConfig = {
  version: "1.0.0",
  builtinRules: {
    totalCards: true,
    totalCost: true,
    averageCost: true,
    rarityDistribution: true,
    typeDistribution: true,
    colorDistribution: true,
    setDistribution: true,
    averagePower: true,
    averageToughness: true,
  },
  customRules: [],
  distributionRules: [],
  powerLevelRules: [],
  customMetrics: [],
  settings: {
    includeEmptyValues: false,
    roundingPrecision: 2,
    cacheResults: true,
    cacheTtl: 300, // 5 minutes
  },
};

/**
 * Metadata calculator implementation
 */
export class MetadataCalculator implements MetadataCalculatorInterface {
  private config: MetadataConfig;
  private customCalculators = new Map<string, Calculator>();
  private cache = new Map<
    string,
    { data: MetadataCalculationResult; timestamp: number }
  >();

  constructor(config?: Partial<MetadataConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registerBuiltinCalculators();
  }

  /**
   * Calculate metadata for a collection of cards
   */
  async calculate(
    cards: Card[],
    config?: Partial<MetadataConfig>
  ): Promise<MetadataCalculationResult> {
    const startTime = Date.now();
    const calculationConfig = config
      ? { ...this.config, ...config }
      : this.config;

    // Generate cache key
    const cacheKey = this.generateCacheKey(cards, calculationConfig);

    // Check cache
    if (calculationConfig.settings.cacheResults) {
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const metadata: any = {
      customMetrics: {},
    };

    const rulesApplied: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Apply built-in rules
      if (calculationConfig.builtinRules.totalCards) {
        metadata.totalCards = this.calculateTotalCards(cards);
        rulesApplied.push("totalCards");
      }

      if (calculationConfig.builtinRules.totalCost) {
        metadata.totalCost = this.calculateTotalCost(cards);
        rulesApplied.push("totalCost");
      }

      if (calculationConfig.builtinRules.averageCost) {
        metadata.averageCost = this.calculateAverageCost(cards);
        rulesApplied.push("averageCost");
      }

      if (calculationConfig.builtinRules.rarityDistribution) {
        metadata.rarityDistribution = this.calculateRarityDistribution(cards);
        rulesApplied.push("rarityDistribution");
      }

      if (calculationConfig.builtinRules.typeDistribution) {
        metadata.typeDistribution = this.calculateTypeDistribution(cards);
        rulesApplied.push("typeDistribution");
      }

      if (calculationConfig.builtinRules.colorDistribution) {
        metadata.colorDistribution = this.calculateColorDistribution(cards);
        rulesApplied.push("colorDistribution");
      }

      if (calculationConfig.builtinRules.setDistribution) {
        metadata.setDistribution = this.calculateSetDistribution(cards);
        rulesApplied.push("setDistribution");
      }

      if (calculationConfig.builtinRules.averagePower) {
        metadata.averagePower = this.calculateAveragePower(cards);
        rulesApplied.push("averagePower");
      }

      if (calculationConfig.builtinRules.averageToughness) {
        metadata.averageToughness = this.calculateAverageToughness(cards);
        rulesApplied.push("averageToughness");
      }

      // Apply custom rules
      for (const rule of calculationConfig.customRules) {
        if (rule.enabled) {
          try {
            const result = await this.calculateWithRule(cards, rule);
            (metadata.customMetrics as any)[rule.output.key] = result;
            rulesApplied.push(rule.id);
          } catch (error) {
            errors.push(`Failed to apply rule '${rule.id}': ${error}`);
          }
        }
      }

      // Apply power level rules
      for (const rule of calculationConfig.powerLevelRules) {
        if (rule.enabled) {
          try {
            metadata.powerLevel = this.calculatePowerLevel(cards, rule);
            rulesApplied.push(rule.id);
          } catch (error) {
            errors.push(
              `Failed to apply power level rule '${rule.id}': ${error}`
            );
          }
        }
      }

      // Round numeric values
      this.roundMetadata(
        metadata,
        calculationConfig.settings.roundingPrecision
      );
    } catch (error) {
      errors.push(`Calculation failed: ${error}`);
    }

    const result = {
      metadata,
      calculationTime: Date.now() - startTime,
      rulesApplied,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };

    // Cache result
    if (calculationConfig.settings.cacheResults) {
      this.setCachedResult(
        cacheKey,
        result,
        calculationConfig.settings.cacheTtl
      );
    }

    return result;
  }

  /**
   * Calculate metadata with a specific rule
   */
  async calculateWithRule(cards: Card[], rule: MetadataRule): Promise<any> {
    // Filter cards based on conditions
    let filteredCards = cards;
    if (rule.conditions && rule.conditions.length > 0) {
      filteredCards = this.applyConditions(cards, rule.conditions);
    }

    // Apply aggregation
    switch (rule.aggregation) {
      case AggregationType.SUM:
        return this.sum(filteredCards, rule.field);
      case AggregationType.AVERAGE:
        return this.average(filteredCards, rule.field);
      case AggregationType.COUNT:
        return filteredCards.length;
      case AggregationType.MIN:
        return this.min(filteredCards, rule.field);
      case AggregationType.MAX:
        return this.max(filteredCards, rule.field);
      case AggregationType.MEDIAN:
        return this.median(filteredCards, rule.field);
      case AggregationType.MODE:
        return this.mode(filteredCards, rule.field);
      case AggregationType.UNIQUE_COUNT:
        return this.uniqueCount(filteredCards, rule.field);
      case AggregationType.CUSTOM:
        if (rule.customCalculator) {
          return rule.customCalculator(filteredCards);
        }
        throw new Error("Custom calculator not provided");
      default:
        throw new Error(`Unsupported aggregation type: ${rule.aggregation}`);
    }
  }

  /**
   * Validate a metadata configuration
   */
  validateConfig(config: MetadataConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check version
    if (!config.version) {
      errors.push("Version is required");
    }

    // Validate custom rules
    for (const rule of config.customRules) {
      if (!rule.id || !rule.name) {
        errors.push(`Rule missing id or name: ${JSON.stringify(rule)}`);
      }

      if (!rule.field && rule.aggregation !== AggregationType.CUSTOM) {
        errors.push(`Rule '${rule.id}' missing field`);
      }

      if (
        rule.aggregation === AggregationType.CUSTOM &&
        !rule.customCalculator
      ) {
        errors.push(
          `Rule '${rule.id}' requires customCalculator for CUSTOM aggregation`
        );
      }
    }

    // Validate settings
    if (
      config.settings.roundingPrecision !== undefined &&
      config.settings.roundingPrecision < 0
    ) {
      errors.push("Rounding precision must be non-negative");
    }

    if (
      config.settings.cacheTtl !== undefined &&
      config.settings.cacheTtl <= 0
    ) {
      errors.push("Cache TTL must be positive");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get available built-in calculators
   */
  getBuiltinCalculators(): Record<string, Calculator> {
    const calculators: Record<string, Calculator> = {};
    for (const [key, value] of this.customCalculators) {
      calculators[key] = value;
    }
    return calculators;
  }

  /**
   * Register a custom calculator
   */
  registerCustomCalculator(id: string, calculator: Calculator): void {
    this.customCalculators.set(id, calculator);
  }

  /**
   * Get the current configuration
   */
  getConfig(): MetadataConfig {
    return { ...this.config };
  }

  /**
   * Update the configuration
   */
  updateConfig(config: Partial<MetadataConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  // Private helper methods

  private calculateTotalCards(cards: Card[]): number {
    return cards.length;
  }

  private calculateTotalCost(cards: Card[]): number {
    return cards.reduce((total, card) => total + (card.cost || 0), 0);
  }

  private calculateAverageCost(cards: Card[]): number {
    if (cards.length === 0) return 0;
    return this.calculateTotalCost(cards) / cards.length;
  }

  private calculateRarityDistribution(
    cards: Card[]
  ): Record<CardRarity, number> {
    const distribution: Record<CardRarity, number> = {
      [CardRarity.COMMON]: 0,
      [CardRarity.UNCOMMON]: 0,
      [CardRarity.RARE]: 0,
      [CardRarity.EPIC]: 0,
      [CardRarity.LEGENDARY]: 0,
      [CardRarity.MYTHIC]: 0,
    };

    for (const card of cards) {
      distribution[card.rarity] = (distribution[card.rarity] || 0) + 1;
    }

    return distribution;
  }

  private calculateTypeDistribution(cards: Card[]): Record<CardType, number> {
    const distribution: Record<CardType, number> = {
      [CardType.CREATURE]: 0,
      [CardType.SPELL]: 0,
      [CardType.ARTIFACT]: 0,
      [CardType.ENCHANTMENT]: 0,
      [CardType.LAND]: 0,
      [CardType.PLANESWALKER]: 0,
    };

    for (const card of cards) {
      distribution[card.type] = (distribution[card.type] || 0) + 1;
    }

    return distribution;
  }

  private calculateColorDistribution(cards: Card[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const card of cards) {
      if (card.colors) {
        for (const color of card.colors) {
          distribution[color] = (distribution[color] || 0) + 1;
        }
      }
    }

    return distribution;
  }

  private calculateSetDistribution(cards: Card[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const card of cards) {
      const setId = card.setId || "unknown";
      distribution[setId] = (distribution[setId] || 0) + 1;
    }

    return distribution;
  }

  private calculateAveragePower(cards: Card[]): number {
    const creaturesWithPower = cards.filter(
      (card) =>
        card.type === CardType.CREATURE && typeof card.power === "number"
    );

    if (creaturesWithPower.length === 0) return 0;

    const totalPower = creaturesWithPower.reduce(
      (total, card) => total + (card.power || 0),
      0
    );
    return totalPower / creaturesWithPower.length;
  }

  private calculateAverageToughness(cards: Card[]): number {
    const creaturesWithToughness = cards.filter(
      (card) =>
        card.type === CardType.CREATURE && typeof card.toughness === "number"
    );

    if (creaturesWithToughness.length === 0) return 0;

    const totalToughness = creaturesWithToughness.reduce(
      (total, card) => total + (card.toughness || 0),
      0
    );
    return totalToughness / creaturesWithToughness.length;
  }

  private calculatePowerLevel(cards: Card[], rule: any): number {
    // Basic power level calculation
    // This would be more sophisticated in a real implementation
    let powerLevel = 0;

    for (const card of cards) {
      let cardPower = 0;

      // Base power from cost
      if (card.cost) {
        cardPower += card.cost * 0.5;
      }

      // Power from creature stats
      if (card.power) {
        cardPower += card.power * 0.3;
      }

      if (card.toughness) {
        cardPower += card.toughness * 0.2;
      }

      // Rarity multiplier
      const rarityMultipliers: Record<CardRarity, number> = {
        [CardRarity.COMMON]: 1.0,
        [CardRarity.UNCOMMON]: 1.2,
        [CardRarity.RARE]: 1.5,
        [CardRarity.EPIC]: 1.8,
        [CardRarity.LEGENDARY]: 2.2,
        [CardRarity.MYTHIC]: 2.5,
      };

      cardPower *= rarityMultipliers[card.rarity] || 1.0;
      powerLevel += cardPower;
    }

    return Math.min(
      powerLevel / Math.max(cards.length, 1),
      rule.powerLevelConfig?.maxPowerLevel || 10
    );
  }

  // Aggregation helper methods
  private sum(cards: Card[], field: string): number {
    return cards.reduce((total, card) => {
      const value = (card as any)[field];
      return total + (typeof value === "number" ? value : 0);
    }, 0);
  }

  private average(cards: Card[], field: string): number {
    if (cards.length === 0) return 0;
    return this.sum(cards, field) / cards.length;
  }

  private min(cards: Card[], field: string): number {
    if (cards.length === 0) return 0;
    const values = cards
      .map((card) => (card as any)[field])
      .filter((value) => typeof value === "number");
    return values.length > 0 ? Math.min(...values) : 0;
  }

  private max(cards: Card[], field: string): number {
    if (cards.length === 0) return 0;
    const values = cards
      .map((card) => (card as any)[field])
      .filter((value) => typeof value === "number");
    return values.length > 0 ? Math.max(...values) : 0;
  }

  private median(cards: Card[], field: string): number {
    if (cards.length === 0) return 0;
    const values = cards
      .map((card) => (card as any)[field])
      .filter((value) => typeof value === "number")
      .sort((a, b) => a - b);

    if (values.length === 0) return 0;

    const mid = Math.floor(values.length / 2);
    return values.length % 2 === 0
      ? (values[mid - 1] + values[mid]) / 2
      : values[mid];
  }

  private mode(cards: Card[], field: string): number {
    if (cards.length === 0) return 0;
    const values = cards
      .map((card) => (card as any)[field])
      .filter((value) => typeof value === "number");

    if (values.length === 0) return 0;

    const frequency: Record<number, number> = {};
    for (const value of values) {
      frequency[value] = (frequency[value] || 0) + 1;
    }

    let mode = values[0];
    let maxCount = 0;
    for (const [value, count] of Object.entries(frequency)) {
      if (count > maxCount) {
        maxCount = count;
        mode = Number(value);
      }
    }

    return mode;
  }

  private uniqueCount(cards: Card[], field: string): number {
    if (cards.length === 0) return 0;
    const values = cards
      .map((card) => (card as any)[field])
      .filter((value) => typeof value === "number");

    return new Set(values).size;
  }

  private applyConditions(cards: Card[], conditions: any[]): Card[] {
    return cards.filter((card) => {
      return conditions.every((condition) => {
        const fieldValue = (card as any)[condition.field];
        switch (condition.operator) {
          case "eq":
            return fieldValue === condition.value;
          case "neq":
            return fieldValue !== condition.value;
          case "gt":
            return fieldValue > condition.value;
          case "gte":
            return fieldValue >= condition.value;
          case "lt":
            return fieldValue < condition.value;
          case "lte":
            return fieldValue <= condition.value;
          case "in":
            return (
              Array.isArray(condition.value) &&
              condition.value.includes(fieldValue)
            );
          case "nin":
            return (
              Array.isArray(condition.value) &&
              !condition.value.includes(fieldValue)
            );
          case "contains":
            return String(fieldValue).includes(String(condition.value));
          case "regex":
            return new RegExp(condition.value).test(String(fieldValue));
          default:
            return true;
        }
      });
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  private roundMetadata(metadata: CollectionMetadata, precision: number): void {
    const round = (value: number) => Number(value.toFixed(precision));

    if (typeof metadata.totalCost === "number") {
      metadata.totalCost = round(metadata.totalCost);
    }

    if (typeof metadata.averageCost === "number") {
      metadata.averageCost = round(metadata.averageCost);
    }

    if (typeof metadata.averagePower === "number") {
      metadata.averagePower = round(metadata.averagePower);
    }

    if (typeof metadata.averageToughness === "number") {
      metadata.averageToughness = round(metadata.averageToughness);
    }

    if (typeof metadata.powerLevel === "number") {
      metadata.powerLevel = round(metadata.powerLevel);
    }
  }

  private generateCacheKey(cards: Card[], config: MetadataConfig): string {
    const cardIds = cards
      .map((card) => `${card.contractAddress}:${card.tokenId}`)
      .sort()
      .join(",");

    const configHash = JSON.stringify(config);

    // Simple hash function
    let hash = 0;
    const input = cardIds + configHash;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return Math.abs(hash).toString(16);
  }

  private getCachedResult(key: string): MetadataCalculationResult | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.config.settings.cacheTtl * 1000) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCachedResult(
    key: string,
    result: MetadataCalculationResult,
    ttl: number
  ): void {
    this.cache.set(key, {
      data: result,
      timestamp: Date.now(),
    });

    // Clean up old cache entries periodically
    if (this.cache.size > 1000) {
      const cutoff = Date.now() - ttl * 1000;
      for (const [cacheKey, cached] of this.cache.entries()) {
        if (cached.timestamp < cutoff) {
          this.cache.delete(cacheKey);
        }
      }
    }
  }

  private registerBuiltinCalculators(): void {
    // Register some built-in calculators
    this.registerCustomCalculator("deck_power", (cards: Card[]) => {
      return cards.reduce((total, card) => {
        const cardPower =
          (card.power || 0) + (card.toughness || 0) + (card.cost || 0);
        return total + cardPower;
      }, 0);
    });

    this.registerCustomCalculator("creature_ratio", (cards: Card[]) => {
      const creatures = cards.filter((card) => card.type === CardType.CREATURE);
      return cards.length > 0 ? creatures.length / cards.length : 0;
    });
  }
}
