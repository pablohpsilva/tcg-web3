import { describe, it, expect, beforeEach, vi } from "vitest";
import { MetadataCalculator } from "../metadata-calculator.js";
import { CardRarity, CardType, type Card } from "../../types/core.js";
import type {
  MetadataConfig,
  AggregationType,
  MetadataRule,
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
    it("should calculate total cards correctly", () => {
      const config: MetadataConfig = {
        rules: [{ name: "total_cards", enabled: true }],
      };

      const result = calculator.calculate(sampleCards, config);

      expect(result.totalCards).toBe(4);
    });

    it("should calculate total cost correctly", () => {
      const config: MetadataConfig = {
        rules: [{ name: "total_cost", enabled: true }],
      };

      const result = calculator.calculate(sampleCards, config);

      expect(result.totalCost).toBe(6); // 1 + 5 + 0 + 0
    });

    it("should calculate average cost correctly", () => {
      const config: MetadataConfig = {
        rules: [{ name: "average_cost", enabled: true }],
      };

      const result = calculator.calculate(sampleCards, config);

      expect(result.averageCost).toBe(1.5); // 6 / 4
    });

    it("should calculate rarity distribution correctly", () => {
      const config: MetadataConfig = {
        rules: [{ name: "rarity_distribution", enabled: true }],
      };

      const result = calculator.calculate(sampleCards, config);

      expect(result.rarityDistribution).toEqual({
        [CardRarity.COMMON]: 3,
        [CardRarity.UNCOMMON]: 0,
        [CardRarity.RARE]: 0,
        [CardRarity.EPIC]: 0,
        [CardRarity.LEGENDARY]: 1,
        [CardRarity.MYTHIC]: 0,
      });
    });

    it("should calculate type distribution correctly", () => {
      const config: MetadataConfig = {
        rules: [{ name: "type_distribution", enabled: true }],
      };

      const result = calculator.calculate(sampleCards, config);

      expect(result.typeDistribution).toEqual({
        [CardType.CREATURE]: 1,
        [CardType.SPELL]: 1,
        [CardType.ARTIFACT]: 0,
        [CardType.ENCHANTMENT]: 0,
        [CardType.PLANESWALKER]: 0,
        [CardType.LAND]: 2,
      });
    });

    it("should calculate power level correctly", () => {
      const config: MetadataConfig = {
        rules: [{ name: "power_level", enabled: true }],
      };

      const result = calculator.calculate(sampleCards, config);

      expect(result.powerLevel).toBeGreaterThan(0);
      expect(result.powerLevel).toBeLessThanOrEqual(10);
    });

    it("should calculate mana curve correctly", () => {
      const config: MetadataConfig = {
        rules: [{ name: "mana_curve", enabled: true }],
      };

      const result = calculator.calculate(sampleCards, config);

      expect(result.manaCurve).toEqual({
        0: 1, // Mountain
        1: 1, // Lightning Bolt
        5: 1, // Dragon Lord
      });
    });

    it("should calculate set distribution correctly", () => {
      const config: MetadataConfig = {
        rules: [{ name: "set_distribution", enabled: true }],
      };

      const result = calculator.calculate(sampleCards, config);

      expect(result.setDistribution).toEqual({
        set1: 2,
        set2: 2,
      });
    });
  });

  describe("Custom Rules", () => {
    it("should apply custom aggregation rules", () => {
      const customRule: MetadataRule = {
        name: "max_cost",
        enabled: true,
        field: "cost",
        aggregationType: "max" as AggregationType,
      };

      const config: MetadataConfig = {
        rules: [customRule],
      };

      const result = calculator.calculate(sampleCards, config);

      expect(result.customMetrics?.max_cost).toBe(5);
    });

    it("should apply min aggregation", () => {
      const customRule: MetadataRule = {
        name: "min_cost",
        enabled: true,
        field: "cost",
        aggregationType: "min" as AggregationType,
      };

      const config: MetadataConfig = {
        rules: [customRule],
      };

      const result = calculator.calculate(sampleCards, config);

      expect(result.customMetrics?.min_cost).toBe(0);
    });

    it("should apply median aggregation", () => {
      const customRule: MetadataRule = {
        name: "median_cost",
        enabled: true,
        field: "cost",
        aggregationType: "median" as AggregationType,
      };

      const config: MetadataConfig = {
        rules: [customRule],
      };

      const result = calculator.calculate(sampleCards, config);

      expect(result.customMetrics?.median_cost).toBe(0.5); // Median of [0, 0, 1, 5]
    });

    it("should apply mode aggregation", () => {
      const customRule: MetadataRule = {
        name: "mode_cost",
        enabled: true,
        field: "cost",
        aggregationType: "mode" as AggregationType,
      };

      const config: MetadataConfig = {
        rules: [customRule],
      };

      const result = calculator.calculate(sampleCards, config);

      expect(result.customMetrics?.mode_cost).toBe(0); // 0 appears twice
    });

    it("should apply unique count aggregation", () => {
      const customRule: MetadataRule = {
        name: "unique_costs",
        enabled: true,
        field: "cost",
        aggregationType: "unique_count" as AggregationType,
      };

      const config: MetadataConfig = {
        rules: [customRule],
      };

      const result = calculator.calculate(sampleCards, config);

      expect(result.customMetrics?.unique_costs).toBe(3); // 0, 1, 5
    });

    it("should skip disabled rules", () => {
      const config: MetadataConfig = {
        rules: [
          { name: "total_cards", enabled: false },
          { name: "total_cost", enabled: true },
        ],
      };

      const result = calculator.calculate(sampleCards, config);

      expect(result.totalCards).toBeUndefined();
      expect(result.totalCost).toBe(6);
    });
  });

  describe("Custom Calculators", () => {
    it("should register and use custom calculators", () => {
      const customCalculator = vi.fn((cards: Card[]) => ({
        highPowerCards: cards.filter((card) => (card.power || 0) > 5).length,
      }));

      calculator.registerCustomCalculator(
        "high_power_analysis",
        customCalculator
      );

      const config: MetadataConfig = {
        rules: [],
        customCalculators: ["high_power_analysis"],
      };

      const result = calculator.calculate(sampleCards, config);

      expect(customCalculator).toHaveBeenCalledWith(sampleCards);
      expect(result.customMetrics?.highPowerCards).toBe(1);
    });

    it("should handle multiple custom calculators", () => {
      const calculator1 = vi.fn(() => ({ metric1: 10 }));
      const calculator2 = vi.fn(() => ({ metric2: 20 }));

      calculator.registerCustomCalculator("calc1", calculator1);
      calculator.registerCustomCalculator("calc2", calculator2);

      const config: MetadataConfig = {
        rules: [],
        customCalculators: ["calc1", "calc2"],
      };

      const result = calculator.calculate(sampleCards, config);

      expect(result.customMetrics?.metric1).toBe(10);
      expect(result.customMetrics?.metric2).toBe(20);
    });
  });

  describe("Caching", () => {
    it("should cache results when caching is enabled", () => {
      const config: MetadataConfig = {
        rules: [{ name: "total_cards", enabled: true }],
        caching: {
          enabled: true,
          ttl: 60000,
        },
      };

      // First calculation
      const result1 = calculator.calculate(sampleCards, config);

      // Second calculation with same input should use cache
      const result2 = calculator.calculate(sampleCards, config);

      expect(result1.totalCards).toBe(4);
      expect(result2.totalCards).toBe(4);
      expect(result1).toBe(result2); // Should be exact same object from cache
    });

    it("should not cache when caching is disabled", () => {
      const config: MetadataConfig = {
        rules: [{ name: "total_cards", enabled: true }],
        caching: {
          enabled: false,
        },
      };

      const result1 = calculator.calculate(sampleCards, config);
      const result2 = calculator.calculate(sampleCards, config);

      expect(result1.totalCards).toBe(4);
      expect(result2.totalCards).toBe(4);
      expect(result1).not.toBe(result2); // Should be different objects
    });

    it("should clear cache", () => {
      const config: MetadataConfig = {
        rules: [{ name: "total_cards", enabled: true }],
        caching: {
          enabled: true,
          ttl: 60000,
        },
      };

      const result1 = calculator.calculate(sampleCards, config);
      calculator.clearCache();
      const result2 = calculator.calculate(sampleCards, config);

      expect(result1.totalCards).toBe(4);
      expect(result2.totalCards).toBe(4);
      expect(result1).not.toBe(result2); // Should be different objects after cache clear
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid field in custom rule", () => {
      const customRule: MetadataRule = {
        name: "invalid_field",
        enabled: true,
        field: "nonexistentField",
        aggregationType: "sum" as AggregationType,
      };

      const config: MetadataConfig = {
        rules: [customRule],
      };

      expect(() => {
        calculator.calculate(sampleCards, config);
      }).not.toThrow(); // Should handle gracefully
    });

    it("should handle empty card collection", () => {
      const config: MetadataConfig = {
        rules: [
          { name: "total_cards", enabled: true },
          { name: "total_cost", enabled: true },
        ],
      };

      const result = calculator.calculate([], config);

      expect(result.totalCards).toBe(0);
      expect(result.totalCost).toBe(0);
    });

    it("should handle unknown custom calculator", () => {
      const config: MetadataConfig = {
        rules: [],
        customCalculators: ["nonexistent_calculator"],
      };

      expect(() => {
        calculator.calculate(sampleCards, config);
      }).not.toThrow(); // Should handle gracefully
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle all rules enabled", () => {
      const config: MetadataConfig = {
        rules: [
          { name: "total_cards", enabled: true },
          { name: "total_cost", enabled: true },
          { name: "average_cost", enabled: true },
          { name: "rarity_distribution", enabled: true },
          { name: "type_distribution", enabled: true },
          { name: "power_level", enabled: true },
          { name: "mana_curve", enabled: true },
          { name: "set_distribution", enabled: true },
        ],
      };

      const result = calculator.calculate(sampleCards, config);

      expect(result.totalCards).toBe(4);
      expect(result.totalCost).toBe(6);
      expect(result.averageCost).toBe(1.5);
      expect(result.rarityDistribution).toBeDefined();
      expect(result.typeDistribution).toBeDefined();
      expect(result.powerLevel).toBeDefined();
      expect(result.manaCurve).toBeDefined();
      expect(result.setDistribution).toBeDefined();
    });

    it("should handle mixed custom rules and built-in rules", () => {
      const customRule: MetadataRule = {
        name: "legendary_count",
        enabled: true,
        field: "rarity",
        aggregationType: "count" as AggregationType,
        condition: {
          field: "rarity",
          operator: "eq",
          value: CardRarity.LEGENDARY,
        },
      };

      const config: MetadataConfig = {
        rules: [{ name: "total_cards", enabled: true }, customRule],
      };

      const result = calculator.calculate(sampleCards, config);

      expect(result.totalCards).toBe(4);
      expect(result.customMetrics?.legendary_count).toBe(1);
    });
  });
});
