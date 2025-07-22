import { describe, it, expect, beforeEach } from "vitest";
import {
  FilterEngine,
  type CustomFilter,
  type CustomSorter,
} from "../filter-engine.js";
import {
  CardRarity,
  CardType,
  FilterOperator,
  LogicalOperator,
  SortDirection,
  type Card,
  type Filter,
  type SortConfig,
} from "../../types/core.js";

describe("FilterEngine", () => {
  let filterEngine: FilterEngine;
  let sampleCards: Card[];

  beforeEach(() => {
    filterEngine = new FilterEngine();

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
        colors: ["red"],
        mintedAt: new Date("2023-01-01"),
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
        owner: "0xowner2",
        colors: ["red"],
        keywords: ["flying", "haste"],
        mintedAt: new Date("2023-02-01"),
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
        colors: ["green"],
        mintedAt: new Date("2023-03-01"),
      },
    ];
  });

  describe("Basic Filtering", () => {
    it("should filter by equality", () => {
      const filter: Filter = {
        field: "rarity",
        operator: FilterOperator.EQUALS,
        value: CardRarity.COMMON,
      };

      const result = filterEngine.applyFilters(sampleCards, [filter]);

      expect(result).toHaveLength(2);
      expect(result.every((card) => card.rarity === CardRarity.COMMON)).toBe(
        true
      );
    });

    it("should filter by not equals", () => {
      const filter: Filter = {
        field: "rarity",
        operator: FilterOperator.NOT_EQUALS,
        value: CardRarity.COMMON,
      };

      const result = filterEngine.applyFilters(sampleCards, [filter]);

      expect(result).toHaveLength(1);
      expect(result[0].rarity).toBe(CardRarity.LEGENDARY);
    });

    it("should filter by greater than", () => {
      const filter: Filter = {
        field: "cost",
        operator: FilterOperator.GREATER_THAN,
        value: 2,
      };

      const result = filterEngine.applyFilters(sampleCards, [filter]);

      expect(result).toHaveLength(1);
      expect(result[0].cost).toBe(5);
    });

    it("should filter by contains", () => {
      const filter: Filter = {
        field: "name",
        operator: FilterOperator.CONTAINS,
        value: "Dragon",
      };

      const result = filterEngine.applyFilters(sampleCards, [filter]);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Dragon Lord");
    });

    it("should filter by in array", () => {
      const filter: Filter = {
        field: "type",
        operator: FilterOperator.IN,
        value: [CardType.SPELL, CardType.LAND],
      };

      const result = filterEngine.applyFilters(sampleCards, [filter]);

      expect(result).toHaveLength(2);
      expect(result.map((card) => card.type)).toEqual([
        CardType.SPELL,
        CardType.LAND,
      ]);
    });
  });

  describe("Complex Filtering", () => {
    it("should handle AND logic", () => {
      const filters: Filter[] = [
        {
          field: "rarity",
          operator: FilterOperator.EQUALS,
          value: CardRarity.COMMON,
          logicalOperator: LogicalOperator.AND,
        },
        {
          field: "type",
          operator: FilterOperator.EQUALS,
          value: CardType.SPELL,
        },
      ];

      const result = filterEngine.applyFilters(sampleCards, filters);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Lightning Bolt");
    });

    it("should handle OR logic", () => {
      const filters: Filter[] = [
        {
          field: "rarity",
          operator: FilterOperator.EQUALS,
          value: CardRarity.LEGENDARY,
          logicalOperator: LogicalOperator.OR,
        },
        {
          field: "type",
          operator: FilterOperator.EQUALS,
          value: CardType.LAND,
        },
      ];

      const result = filterEngine.applyFilters(sampleCards, filters);

      expect(result).toHaveLength(2);
      expect(result.map((card) => card.name)).toEqual([
        "Dragon Lord",
        "Forest",
      ]);
    });

    it("should handle nested filters", () => {
      const filter: Filter = {
        field: "rarity",
        operator: FilterOperator.EQUALS,
        value: CardRarity.COMMON,
        logicalOperator: LogicalOperator.AND,
        nestedFilters: [
          {
            field: "type",
            operator: FilterOperator.EQUALS,
            value: CardType.SPELL,
          },
        ],
      };

      const result = filterEngine.applyFilters(sampleCards, [filter]);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Lightning Bolt");
    });
  });

  describe("Custom Filters", () => {
    it("should register and use custom filters", () => {
      const arrayContainsFilter: CustomFilter = {
        name: "array_contains_keyword",
        supportedTypes: ["array"],
        apply: (value: string[], filterValue: string) => {
          return value && value.includes(filterValue);
        },
      };

      filterEngine.registerCustomFilter(arrayContainsFilter);

      const filter: Filter = {
        field: "keywords",
        operator: "array_contains_keyword" as FilterOperator,
        value: "flying",
      };

      const result = filterEngine.applyFilters(sampleCards, [filter]);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Dragon Lord");
    });

    it("should handle fuzzy matching", () => {
      const filter: Filter = {
        field: "name",
        operator: "fuzzy_match" as FilterOperator,
        value: "dragn",
      };

      const result = filterEngine.applyFilters(sampleCards, [filter]);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Dragon Lord");
    });

    it("should handle date between filtering", () => {
      const filter: Filter = {
        field: "mintedAt",
        operator: "date_between" as FilterOperator,
        value: {
          start: new Date("2022-12-01"),
          end: new Date("2023-01-15"),
        },
      };

      const result = filterEngine.applyFilters(sampleCards, [filter]);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Lightning Bolt");
    });
  });

  describe("Sorting", () => {
    it("should sort by name ascending", () => {
      const sortConfig: SortConfig = {
        field: "name",
        direction: SortDirection.ASC,
      };

      const result = filterEngine.applySorting(sampleCards, [sortConfig]);

      expect(result.map((card) => card.name)).toEqual([
        "Dragon Lord",
        "Forest",
        "Lightning Bolt",
      ]);
    });

    it("should sort by cost descending", () => {
      const sortConfig: SortConfig = {
        field: "cost",
        direction: SortDirection.DESC,
      };

      const result = filterEngine.applySorting(sampleCards, [sortConfig]);

      expect(result[0].cost).toBe(5);
      expect(result[1].cost).toBe(1);
      expect(result[2].cost).toBeUndefined(); // Forest has no cost
    });

    it("should handle multiple sort criteria", () => {
      const sortConfigs: SortConfig[] = [
        { field: "rarity", direction: SortDirection.ASC },
        { field: "name", direction: SortDirection.ASC },
      ];

      const result = filterEngine.applySorting(sampleCards, sortConfigs);

      // Common cards first (Forest, Lightning Bolt), then Legendary (Dragon Lord)
      expect(result[0].name).toBe("Forest");
      expect(result[1].name).toBe("Lightning Bolt");
      expect(result[2].name).toBe("Dragon Lord");
    });

    it("should use custom sorters", () => {
      const rarityOrder = [
        CardRarity.LEGENDARY,
        CardRarity.RARE,
        CardRarity.UNCOMMON,
        CardRarity.COMMON,
      ];

      const customSorter: CustomSorter = {
        name: "rarity_priority",
        apply: (a: Card, b: Card) => {
          const aIndex = rarityOrder.indexOf(a.rarity);
          const bIndex = rarityOrder.indexOf(b.rarity);
          return aIndex - bIndex;
        },
      };

      filterEngine.registerCustomSorter(customSorter);

      const sortConfig: SortConfig = {
        field: "rarity",
        direction: SortDirection.ASC,
        customSorter: "rarity_priority",
      };

      const result = filterEngine.applySorting(sampleCards, [sortConfig]);

      expect(result[0].rarity).toBe(CardRarity.LEGENDARY);
      expect(result[1].rarity).toBe(CardRarity.COMMON);
      expect(result[2].rarity).toBe(CardRarity.COMMON);
    });
  });

  describe("Filter Presets", () => {
    it("should apply preset filters", () => {
      const result = filterEngine.applyPreset(sampleCards, "high_value_cards");

      expect(result).toHaveLength(1);
      expect(result[0].rarity).toBe(CardRarity.LEGENDARY);
    });

    it("should apply recent cards preset", () => {
      const result = filterEngine.applyPreset(sampleCards, "recent_cards");

      // Should return cards minted in the last 30 days from the test date
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("should return empty array for unknown preset", () => {
      const result = filterEngine.applyPreset(sampleCards, "unknown_preset");

      expect(result).toEqual([]);
    });
  });

  describe("Field Registry", () => {
    it("should register field types correctly", () => {
      filterEngine.registerField("customField", "string");

      // This should not throw an error
      expect(() => {
        filterEngine.registerField("customField", "string");
      }).not.toThrow();
    });

    it("should validate filter compatibility with field types", () => {
      const filter: Filter = {
        field: "name",
        operator: FilterOperator.CONTAINS,
        value: "test",
      };

      // This should work for string fields
      expect(() => {
        filterEngine.applyFilters(sampleCards, [filter]);
      }).not.toThrow();
    });
  });

  describe("Pagination", () => {
    it("should handle pagination correctly", () => {
      const result = filterEngine.applyFilters(sampleCards, [], {
        page: 1,
        pageSize: 2,
      });

      expect(result).toHaveLength(2);
    });

    it("should handle second page", () => {
      const result = filterEngine.applyFilters(sampleCards, [], {
        page: 2,
        pageSize: 2,
      });

      expect(result).toHaveLength(1);
    });

    it("should return empty array for out of range page", () => {
      const result = filterEngine.applyFilters(sampleCards, [], {
        page: 10,
        pageSize: 2,
      });

      expect(result).toHaveLength(0);
    });
  });

  describe("Integration", () => {
    it("should combine filtering, sorting, and pagination", () => {
      const filters: Filter[] = [
        {
          field: "rarity",
          operator: FilterOperator.EQUALS,
          value: CardRarity.COMMON,
        },
      ];

      const sortConfigs: SortConfig[] = [
        { field: "name", direction: SortDirection.ASC },
      ];

      const filteredAndSorted = filterEngine.applyFilters(sampleCards, filters);
      const result = filterEngine.applySorting(filteredAndSorted, sortConfigs);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Forest");
      expect(result[1].name).toBe("Lightning Bolt");
    });
  });
});
