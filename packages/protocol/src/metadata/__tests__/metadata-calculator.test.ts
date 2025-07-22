import { describe, it, expect, beforeEach, vi } from "vitest";
import { MetadataCalculator } from "../metadata-calculator.js";
import { CardRarity, CardType, type Card } from "../../types/core.js";
import {
  type MetadataConfig,
  AggregationType,
  type MetadataRule,
} from "../../types/metadata.js";

describe("MetadataCalculator", () => {
  let calculator: MetadataCalculator;
  let sampleCards: Card[];

  beforeEach(() => {
    calculator = new MetadataCalculator();

    sampleCards = [
      {
        tokenId: "1",
        contractAddress: "0x123",
        chainId: 137,
        name: "Lightning Bolt",
        image: "bolt.png",
        rarity: CardRarity.COMMON,
        type: CardType.SPELL,
        cost: 1,
        setId: "set1",
        setName: "Core Set",
        owner: "0xowner1",
      },
      {
        tokenId: "2",
        contractAddress: "0x123",
        chainId: 137,
        name: "Dragon Lord",
        image: "dragon.png",
        rarity: CardRarity.LEGENDARY,
        type: CardType.CREATURE,
        cost: 5,
        power: 7,
        toughness: 7,
        setId: "set1",
        setName: "Core Set",
        owner: "0xowner1",
      },
      {
        tokenId: "3",
        contractAddress: "0x123",
        chainId: 137,
        name: "Forest",
        image: "forest.png",
        rarity: CardRarity.COMMON,
        type: CardType.LAND,
        cost: 0,
        setId: "set2",
        setName: "Expansion",
        owner: "0xowner1",
      },
      {
        tokenId: "4",
        contractAddress: "0x123",
        chainId: 137,
        name: "Mountain",
        image: "mountain.png",
        rarity: CardRarity.COMMON,
        type: CardType.LAND,
        cost: 0,
        setId: "set2",
        setName: "Expansion",
        owner: "0xowner1",
      },
    ];
  });

  describe("Built-in Rules", () => {
    it("should calculate total cards correctly", async () => {
      const config: Partial<MetadataConfig> = {
        builtinRules: {
          totalCards: true,
          totalCost: false,
          averageCost: false,
          rarityDistribution: false,
          typeDistribution: false,
          colorDistribution: false,
          setDistribution: false,
          averagePower: false,
          averageToughness: false,
        },
      };

      const result = await calculator.calculate(sampleCards, config);

      expect(result.metadata.totalCards).toBe(4);
    });

    it("should calculate total cost correctly", async () => {
      const config: Partial<MetadataConfig> = {
        builtinRules: {
          totalCards: false,
          totalCost: true,
          averageCost: false,
          rarityDistribution: false,
          typeDistribution: false,
          colorDistribution: false,
          setDistribution: false,
          averagePower: false,
          averageToughness: false,
        },
      };

      const result = await calculator.calculate(sampleCards, config);

      expect(result.metadata.totalCost).toBe(6); // 1 + 5 + 0 + 0
    });

    it("should calculate average cost correctly", async () => {
      const config: Partial<MetadataConfig> = {
        builtinRules: {
          totalCards: false,
          totalCost: false,
          averageCost: true,
          rarityDistribution: false,
          typeDistribution: false,
          colorDistribution: false,
          setDistribution: false,
          averagePower: false,
          averageToughness: false,
        },
      };

      const result = await calculator.calculate(sampleCards, config);

      expect(result.metadata.averageCost).toBe(1.5); // 6 / 4
    });

    it("should calculate rarity distribution correctly", async () => {
      const config: Partial<MetadataConfig> = {
        builtinRules: {
          totalCards: false,
          totalCost: false,
          averageCost: false,
          rarityDistribution: true,
          typeDistribution: false,
          colorDistribution: false,
          setDistribution: false,
          averagePower: false,
          averageToughness: false,
        },
      };

      const result = await calculator.calculate(sampleCards, config);

      expect(result.metadata.rarityDistribution).toEqual({
        [CardRarity.COMMON]: 3,
        [CardRarity.UNCOMMON]: 0,
        [CardRarity.RARE]: 0,
        [CardRarity.EPIC]: 0,
        [CardRarity.LEGENDARY]: 1,
        [CardRarity.MYTHIC]: 0,
      });
    });

    it("should calculate type distribution correctly", async () => {
      const config: Partial<MetadataConfig> = {
        builtinRules: {
          totalCards: false,
          totalCost: false,
          averageCost: false,
          rarityDistribution: false,
          typeDistribution: true,
          colorDistribution: false,
          setDistribution: false,
          averagePower: false,
          averageToughness: false,
        },
      };

      const result = await calculator.calculate(sampleCards, config);

      expect(result.metadata.typeDistribution).toEqual({
        [CardType.CREATURE]: 1,
        [CardType.SPELL]: 1,
        [CardType.ARTIFACT]: 0,
        [CardType.ENCHANTMENT]: 0,
        [CardType.PLANESWALKER]: 0,
        [CardType.LAND]: 2,
      });
    });

    it("should calculate power level correctly", async () => {
      const config: Partial<MetadataConfig> = {
        builtinRules: {
          totalCards: false,
          totalCost: false,
          averageCost: false,
          rarityDistribution: false,
          typeDistribution: false,
          colorDistribution: false,
          setDistribution: false,
          averagePower: false,
          averageToughness: false,
        },
        powerLevelRules: [
          {
            id: "basic_power_level",
            name: "Basic Power Level",
            enabled: true,
            field: "cost",
            aggregation: AggregationType.AVERAGE,
            output: {
              key: "powerLevel",
              type: "number",
            },
            powerLevelConfig: {
              baseFields: {
                cost: { weight: 1, field: "cost" },
                power: { weight: 1, field: "power" },
                toughness: { weight: 1, field: "toughness" },
                rarity: {
                  weight: 1,
                  field: "rarity",
                  rarityValues: {
                    [CardRarity.COMMON]: 1,
                    [CardRarity.UNCOMMON]: 2,
                    [CardRarity.RARE]: 3,
                    [CardRarity.EPIC]: 4,
                    [CardRarity.LEGENDARY]: 5,
                    [CardRarity.MYTHIC]: 6,
                  },
                },
              },
              normalizationFactor: 1,
              maxPowerLevel: 10,
            },
          },
        ],
      };

      const result = await calculator.calculate(sampleCards, config);

      expect(result.metadata.powerLevel).toBeGreaterThan(0);
      expect(result.metadata.powerLevel).toBeLessThanOrEqual(10);
    });

    it("should calculate mana curve correctly", async () => {
      const config: Partial<MetadataConfig> = {
        builtinRules: {
          totalCards: false,
          totalCost: false,
          averageCost: false,
          rarityDistribution: false,
          typeDistribution: false,
          colorDistribution: false,
          setDistribution: false,
          averagePower: false,
          averageToughness: false,
        },
        customRules: [
          {
            id: "mana_curve",
            name: "Mana Curve",
            enabled: true,
            field: "cost",
            aggregation: AggregationType.GROUP_BY,
            output: {
              key: "manaCurve",
              type: "object",
            },
          },
        ],
      };

      const result = await calculator.calculate(sampleCards, config);

      expect(result.metadata.customMetrics?.manaCurve).toEqual({
        0: 2, // Mountain and Forest
        1: 1, // Lightning Bolt
        5: 1, // Dragon Lord
      });
    });

    it("should calculate set distribution correctly", async () => {
      const config: Partial<MetadataConfig> = {
        builtinRules: {
          totalCards: false,
          totalCost: false,
          averageCost: false,
          rarityDistribution: false,
          typeDistribution: false,
          colorDistribution: false,
          setDistribution: true,
          averagePower: false,
          averageToughness: false,
        },
      };

      const result = await calculator.calculate(sampleCards, config);

      expect(result.metadata.setDistribution).toEqual({
        set1: 2,
        set2: 2,
      });
    });
  });

  describe("Custom Rules", () => {
    it("should apply custom aggregation rules", async () => {
      const customRule: MetadataRule = {
        id: "max_cost",
        name: "max_cost",
        enabled: true,
        field: "cost",
        aggregation: AggregationType.MAX,
        output: {
          key: "max_cost",
          type: "number",
        },
      };

      const config: Partial<MetadataConfig> = {
        builtinRules: {
          totalCards: false,
          totalCost: false,
          averageCost: false,
          rarityDistribution: false,
          typeDistribution: false,
          colorDistribution: false,
          setDistribution: false,
          averagePower: false,
          averageToughness: false,
        },
        customRules: [customRule],
      };

      const result = await calculator.calculate(sampleCards, config);

      expect(result.metadata.customMetrics?.max_cost).toBe(5);
    });

    it("should apply min aggregation", async () => {
      const customRule: MetadataRule = {
        id: "min_cost",
        name: "min_cost",
        enabled: true,
        field: "cost",
        aggregation: AggregationType.MIN,
        output: {
          key: "min_cost",
          type: "number",
        },
      };

      const config: Partial<MetadataConfig> = {
        builtinRules: {
          totalCards: false,
          totalCost: false,
          averageCost: false,
          rarityDistribution: false,
          typeDistribution: false,
          colorDistribution: false,
          setDistribution: false,
          averagePower: false,
          averageToughness: false,
        },
        customRules: [customRule],
      };

      const result = await calculator.calculate(sampleCards, config);

      expect(result.metadata.customMetrics?.min_cost).toBe(0);
    });

    it("should apply median aggregation", async () => {
      const customRule: MetadataRule = {
        id: "median_cost",
        name: "median_cost",
        enabled: true,
        field: "cost",
        aggregation: AggregationType.MEDIAN,
        output: {
          key: "median_cost",
          type: "number",
        },
      };

      const config: Partial<MetadataConfig> = {
        builtinRules: {
          totalCards: false,
          totalCost: false,
          averageCost: false,
          rarityDistribution: false,
          typeDistribution: false,
          colorDistribution: false,
          setDistribution: false,
          averagePower: false,
          averageToughness: false,
        },
        customRules: [customRule],
      };

      const result = await calculator.calculate(sampleCards, config);

      expect(result.metadata.customMetrics?.median_cost).toBe(0.5); // Median of [0, 0, 1, 5]
    });

    it("should apply mode aggregation", async () => {
      const customRule: MetadataRule = {
        id: "mode_cost",
        name: "mode_cost",
        enabled: true,
        field: "cost",
        aggregation: AggregationType.MODE,
        output: {
          key: "mode_cost",
          type: "number",
        },
      };

      const config: Partial<MetadataConfig> = {
        builtinRules: {
          totalCards: false,
          totalCost: false,
          averageCost: false,
          rarityDistribution: false,
          typeDistribution: false,
          colorDistribution: false,
          setDistribution: false,
          averagePower: false,
          averageToughness: false,
        },
        customRules: [customRule],
      };

      const result = await calculator.calculate(sampleCards, config);

      expect(result.metadata.customMetrics?.mode_cost).toBe(0); // 0 appears twice
    });

    it("should apply unique count aggregation", async () => {
      const customRule: MetadataRule = {
        id: "unique_costs",
        name: "unique_costs",
        enabled: true,
        field: "cost",
        aggregation: AggregationType.UNIQUE_COUNT,
        output: {
          key: "unique_costs",
          type: "number",
        },
      };

      const config: Partial<MetadataConfig> = {
        builtinRules: {
          totalCards: false,
          totalCost: false,
          averageCost: false,
          rarityDistribution: false,
          typeDistribution: false,
          colorDistribution: false,
          setDistribution: false,
          averagePower: false,
          averageToughness: false,
        },
        customRules: [customRule],
      };

      const result = await calculator.calculate(sampleCards, config);

      expect(result.metadata.customMetrics?.unique_costs).toBe(3); // 0, 1, 5
    });

    it("should skip disabled rules", async () => {
      const config: Partial<MetadataConfig> = {
        builtinRules: {
          totalCards: false,
          totalCost: true,
          averageCost: false,
          rarityDistribution: false,
          typeDistribution: false,
          colorDistribution: false,
          setDistribution: false,
          averagePower: false,
          averageToughness: false,
        },
      };

      const result = await calculator.calculate(sampleCards, config);

      expect(result.metadata.totalCards).toBeUndefined();
      expect(result.metadata.totalCost).toBe(6);
    });
  });

  describe("Custom Calculators", () => {
    it("should register and use custom calculators", async () => {
      const customCalculator = vi.fn((cards: Card[]) => {
        return cards.filter((card) => (card.power || 0) > 5).length;
      });

      calculator.registerCustomCalculator("highPowerCards", customCalculator);

      const customRule: MetadataRule = {
        id: "high_power_cards",
        name: "high_power_cards",
        enabled: true,
        field: "",
        aggregation: AggregationType.CUSTOM,
        customCalculator: customCalculator,
        output: {
          key: "highPowerCards",
          type: "number",
        },
      };

      const config: Partial<MetadataConfig> = {
        builtinRules: {
          totalCards: false,
          totalCost: false,
          averageCost: false,
          rarityDistribution: false,
          typeDistribution: false,
          colorDistribution: false,
          setDistribution: false,
          averagePower: false,
          averageToughness: false,
        },
        customRules: [customRule],
      };

      const result = await calculator.calculate(sampleCards, config);

      expect(customCalculator).toHaveBeenCalledWith(sampleCards);
      expect(result.metadata.customMetrics?.highPowerCards).toBe(1);
    });

    it("should handle multiple custom calculators", async () => {
      calculator.registerCustomCalculator("metric1", () => 10);
      calculator.registerCustomCalculator("metric2", () => 20);

      const config: Partial<MetadataConfig> = {
        builtinRules: {
          totalCards: false,
          totalCost: false,
          averageCost: false,
          rarityDistribution: false,
          typeDistribution: false,
          colorDistribution: false,
          setDistribution: false,
          averagePower: false,
          averageToughness: false,
        },
        customRules: [
          {
            id: "metric1",
            name: "metric1",
            enabled: true,
            field: "",
            aggregation: AggregationType.CUSTOM,
            customCalculator: () => 10,
            output: { key: "metric1", type: "number" },
          },
          {
            id: "metric2",
            name: "metric2",
            enabled: true,
            field: "",
            aggregation: AggregationType.CUSTOM,
            customCalculator: () => 20,
            output: { key: "metric2", type: "number" },
          },
        ],
      };

      const result = await calculator.calculate(sampleCards, config);

      expect(result.metadata.customMetrics?.metric1).toBe(10);
      expect(result.metadata.customMetrics?.metric2).toBe(20);
    });
  });

  describe("Caching", () => {
    it("should cache results when caching is enabled", async () => {
      const config: Partial<MetadataConfig> = {
        builtinRules: {
          totalCards: true,
          totalCost: false,
          averageCost: false,
          rarityDistribution: false,
          typeDistribution: false,
          colorDistribution: false,
          setDistribution: false,
          averagePower: false,
          averageToughness: false,
        },
        settings: {
          includeEmptyValues: false,
          roundingPrecision: 2,
          cacheResults: true,
          cacheTtl: 300,
        },
      };

      const result1 = await calculator.calculate(sampleCards, config);
      const result2 = await calculator.calculate(sampleCards, config);

      expect(result1.metadata.totalCards).toBe(4);
      expect(result2.metadata.totalCards).toBe(4);
      expect(result1).toBe(result2); // Should be exact same object from cache
    });

    it("should not cache when caching is disabled", async () => {
      const config: Partial<MetadataConfig> = {
        builtinRules: {
          totalCards: true,
          totalCost: false,
          averageCost: false,
          rarityDistribution: false,
          typeDistribution: false,
          colorDistribution: false,
          setDistribution: false,
          averagePower: false,
          averageToughness: false,
        },
        settings: {
          includeEmptyValues: false,
          roundingPrecision: 2,
          cacheResults: false,
          cacheTtl: 300,
        },
      };

      const result1 = await calculator.calculate(sampleCards, config);
      const result2 = await calculator.calculate(sampleCards, config);

      expect(result1.metadata.totalCards).toBe(4);
      expect(result2.metadata.totalCards).toBe(4);
      expect(result1).not.toBe(result2); // Should be different objects
    });

    it("should clear cache", async () => {
      const config: Partial<MetadataConfig> = {
        builtinRules: {
          totalCards: true,
          totalCost: false,
          averageCost: false,
          rarityDistribution: false,
          typeDistribution: false,
          colorDistribution: false,
          setDistribution: false,
          averagePower: false,
          averageToughness: false,
        },
        settings: {
          includeEmptyValues: false,
          roundingPrecision: 2,
          cacheResults: true,
          cacheTtl: 300,
        },
      };

      const result1 = await calculator.calculate(sampleCards, config);
      calculator.clearCache();
      const result2 = await calculator.calculate(sampleCards, config);

      expect(result1.metadata.totalCards).toBe(4);
      expect(result2.metadata.totalCards).toBe(4);
      expect(result1).not.toBe(result2); // Should be different objects after cache clear
    });
  });

  describe("Error Handling", () => {
    it("should handle empty card collection", async () => {
      const config: Partial<MetadataConfig> = {
        builtinRules: {
          totalCards: true,
          totalCost: true,
          averageCost: false,
          rarityDistribution: false,
          typeDistribution: false,
          colorDistribution: false,
          setDistribution: false,
          averagePower: false,
          averageToughness: false,
        },
      };

      const result = await calculator.calculate([], config);

      expect(result.metadata.totalCards).toBe(0);
      expect(result.metadata.totalCost).toBe(0);
    });

    it("should handle invalid custom rules gracefully", async () => {
      const invalidRule: MetadataRule = {
        id: "invalid_rule",
        name: "invalid_rule",
        enabled: true,
        field: "nonexistent_field",
        aggregation: AggregationType.SUM,
        output: {
          key: "invalid_metric",
          type: "number",
        },
      };

      const config: Partial<MetadataConfig> = {
        builtinRules: {
          totalCards: false,
          totalCost: false,
          averageCost: false,
          rarityDistribution: false,
          typeDistribution: false,
          colorDistribution: false,
          setDistribution: false,
          averagePower: false,
          averageToughness: false,
        },
        customRules: [invalidRule],
      };

      const result = await calculator.calculate(sampleCards, config);

      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle all rules enabled", async () => {
      const config: Partial<MetadataConfig> = {
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
      };

      const result = await calculator.calculate(sampleCards, config);

      expect(result.metadata.totalCards).toBe(4);
      expect(result.metadata.totalCost).toBe(6);
      expect(result.metadata.averageCost).toBe(1.5);
      expect(result.metadata.rarityDistribution).toBeDefined();
      expect(result.metadata.typeDistribution).toBeDefined();
      expect(result.metadata.setDistribution).toBeDefined();
    });

    it("should handle mixed custom rules and built-in rules", async () => {
      const customRule: MetadataRule = {
        id: "legendary_count",
        name: "legendary_count",
        enabled: true,
        field: "rarity",
        aggregation: AggregationType.COUNT,
        conditions: [
          {
            field: "rarity",
            operator: "eq",
            value: CardRarity.LEGENDARY,
          },
        ],
        output: {
          key: "legendary_count",
          type: "number",
        },
      };

      const config: Partial<MetadataConfig> = {
        builtinRules: {
          totalCards: true,
          totalCost: false,
          averageCost: false,
          rarityDistribution: false,
          typeDistribution: false,
          colorDistribution: false,
          setDistribution: false,
          averagePower: false,
          averageToughness: false,
        },
        customRules: [customRule],
      };

      const result = await calculator.calculate(sampleCards, config);

      expect(result.metadata.totalCards).toBe(4);
      expect(result.metadata.customMetrics?.legendary_count).toBe(1);
    });
  });
});
