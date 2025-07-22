import { describe, it, expect, beforeEach, vi } from "vitest";
import { SimpleCollectionManager } from "../collection-manager.js";
import { MetadataCalculator } from "../../metadata/metadata-calculator.js";
import {
  CardRarity,
  CardType,
  type Card,
  type Collection,
} from "../../types/core.js";
import type { MetadataConfig } from "../../types/metadata.js";

// Mock the MetadataCalculator
vi.mock("../../metadata/metadata-calculator.js");

describe("CollectionManager", () => {
  let collectionManager: SimpleCollectionManager;
  let mockMetadataCalculator: any;
  let sampleCards: Card[];

  beforeEach(() => {
    mockMetadataCalculator = new MetadataCalculator();
    mockMetadataCalculator.calculate = vi.fn().mockReturnValue({
      totalCards: 3,
      totalCost: 6,
      averageCost: 2,
      rarityDistribution: {
        [CardRarity.COMMON]: 2,
        [CardRarity.LEGENDARY]: 1,
      },
    });

    collectionManager = new SimpleCollectionManager(mockMetadataCalculator);

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
    ];
  });

  describe("Collection Creation", () => {
    it("should create a collection with cards", () => {
      const collection = collectionManager.createCollection(
        "My Deck",
        ["1", "2", "3"],
        "0xowner1"
      );

      expect(collection.name).toBe("My Deck");
      expect(collection.cards).toEqual(["1", "2", "3"]);
      expect(collection.owner).toBe("0xowner1");
      expect(collection.id).toBeDefined();
      expect(collection.createdAt).toBeInstanceOf(Date);
      expect(collection.updatedAt).toBeInstanceOf(Date);
    });

    it("should create an empty collection", () => {
      const collection = collectionManager.createCollection(
        "Empty Deck",
        [],
        "0xowner1"
      );

      expect(collection.name).toBe("Empty Deck");
      expect(collection.cards).toEqual([]);
      expect(collection.owner).toBe("0xowner1");
    });

    it("should generate unique IDs for different collections", () => {
      const collection1 = collectionManager.createCollection(
        "Deck 1",
        [],
        "0xowner1"
      );
      const collection2 = collectionManager.createCollection(
        "Deck 2",
        [],
        "0xowner1"
      );

      expect(collection1.id).not.toBe(collection2.id);
    });

    it("should set creation and update timestamps", () => {
      const beforeCreation = new Date();
      const collection = collectionManager.createCollection(
        "Test Deck",
        [],
        "0xowner1"
      );
      const afterCreation = new Date();

      expect(collection.createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreation.getTime()
      );
      expect(collection.createdAt.getTime()).toBeLessThanOrEqual(
        afterCreation.getTime()
      );
      expect(collection.updatedAt.getTime()).toEqual(
        collection.createdAt.getTime()
      );
    });
  });

  describe("Collection Updates", () => {
    let collection: Collection;

    beforeEach(() => {
      collection = collectionManager.createCollection(
        "Test Deck",
        ["1", "2"],
        "0xowner1"
      );
    });

    it("should update collection name", () => {
      const originalUpdatedAt = collection.updatedAt;

      // Wait a bit to ensure timestamp difference
      const updated = collectionManager.updateCollection(collection.id, {
        name: "Updated Deck Name",
      });

      expect(updated.name).toBe("Updated Deck Name");
      expect(updated.cards).toEqual(["1", "2"]); // Cards unchanged
      expect(updated.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
      expect(updated.createdAt).toEqual(collection.createdAt); // Creation time unchanged
    });

    it("should update collection cards", () => {
      const updated = collectionManager.updateCollection(collection.id, {
        cards: ["1", "2", "3"],
      });

      expect(updated.cards).toEqual(["1", "2", "3"]);
      expect(updated.name).toBe("Test Deck"); // Name unchanged
    });

    it("should update multiple fields", () => {
      const updated = collectionManager.updateCollection(collection.id, {
        name: "New Name",
        cards: ["3", "4", "5"],
        description: "New description",
      });

      expect(updated.name).toBe("New Name");
      expect(updated.cards).toEqual(["3", "4", "5"]);
      expect(updated.description).toBe("New description");
    });

    it("should throw error for non-existent collection", () => {
      expect(() => {
        collectionManager.updateCollection("non-existent-id", {
          name: "New Name",
        });
      }).toThrow("Collection not found");
    });
  });

  describe("Collection Retrieval", () => {
    let collection1: Collection;
    let collection2: Collection;

    beforeEach(() => {
      collection1 = collectionManager.createCollection(
        "Deck 1",
        ["1", "2"],
        "0xowner1"
      );
      collection2 = collectionManager.createCollection(
        "Deck 2",
        ["3"],
        "0xowner2"
      );
    });

    it("should get collection by ID", () => {
      const retrieved = collectionManager.getCollection(collection1.id);

      expect(retrieved).toEqual(collection1);
    });

    it("should return undefined for non-existent collection", () => {
      const retrieved = collectionManager.getCollection("non-existent-id");

      expect(retrieved).toBeUndefined();
    });

    it("should list collections for a specific owner", () => {
      const owner1Collections = collectionManager.listCollections("0xowner1");
      const owner2Collections = collectionManager.listCollections("0xowner2");

      expect(owner1Collections).toHaveLength(1);
      expect(owner1Collections[0].id).toBe(collection1.id);

      expect(owner2Collections).toHaveLength(1);
      expect(owner2Collections[0].id).toBe(collection2.id);
    });

    it("should return empty array for owner with no collections", () => {
      const collections = collectionManager.listCollections("0xnonexistent");

      expect(collections).toEqual([]);
    });

    it("should list all collections when no owner specified", () => {
      const allCollections = collectionManager.listCollections();

      expect(allCollections).toHaveLength(2);
    });
  });

  describe("Collection Deletion", () => {
    let collection: Collection;

    beforeEach(() => {
      collection = collectionManager.createCollection(
        "Test Deck",
        ["1", "2"],
        "0xowner1"
      );
    });

    it("should delete a collection", () => {
      const deleted = collectionManager.deleteCollection(collection.id);

      expect(deleted).toBe(true);
      expect(collectionManager.getCollection(collection.id)).toBeUndefined();
    });

    it("should return false for non-existent collection", () => {
      const deleted = collectionManager.deleteCollection("non-existent-id");

      expect(deleted).toBe(false);
    });
  });

  describe("Collection Validation", () => {
    it("should validate a valid collection", () => {
      const collection = collectionManager.createCollection(
        "Valid Deck",
        ["1", "2"],
        "0xowner1"
      );

      const result = collectionManager.validateCollection(collection);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should detect missing name", () => {
      const collection = collectionManager.createCollection(
        "",
        ["1", "2"],
        "0xowner1"
      );

      const result = collectionManager.validateCollection(collection);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Collection name is required");
    });

    it("should detect missing owner", () => {
      const collection = collectionManager.createCollection(
        "Test Deck",
        ["1", "2"],
        ""
      );

      const result = collectionManager.validateCollection(collection);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Collection owner is required");
    });

    it("should detect duplicate card IDs", () => {
      const collection = collectionManager.createCollection(
        "Test Deck",
        ["1", "2", "1"],
        "0xowner1"
      );

      const result = collectionManager.validateCollection(collection);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Duplicate cards found in collection");
    });

    it("should handle multiple validation errors", () => {
      const collection = collectionManager.createCollection("", ["1", "1"], "");

      const result = collectionManager.validateCollection(collection);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain("Collection name is required");
      expect(result.errors).toContain("Collection owner is required");
      expect(result.errors).toContain("Duplicate cards found in collection");
    });
  });

  describe("Metadata Generation", () => {
    let collection: Collection;

    beforeEach(() => {
      collection = collectionManager.createCollection(
        "Test Deck",
        ["1", "2", "3"],
        "0xowner1"
      );
    });

    it("should generate metadata for a collection", () => {
      const config: MetadataConfig = {
        rules: [{ name: "total_cards", enabled: true }],
      };

      const metadata = collectionManager.generateMetadata(
        collection,
        sampleCards,
        config
      );

      expect(mockMetadataCalculator.calculate).toHaveBeenCalledWith(
        sampleCards,
        config
      );
      expect(metadata.totalCards).toBe(3);
      expect(metadata.totalCost).toBe(6);
    });

    it("should handle empty collection metadata", () => {
      const emptyCollection = collectionManager.createCollection(
        "Empty Deck",
        [],
        "0xowner1"
      );
      const config: MetadataConfig = {
        rules: [{ name: "total_cards", enabled: true }],
      };

      mockMetadataCalculator.calculate.mockReturnValue({ totalCards: 0 });

      const metadata = collectionManager.generateMetadata(
        emptyCollection,
        [],
        config
      );

      expect(metadata.totalCards).toBe(0);
    });
  });

  describe("Collection Export", () => {
    let collection: Collection;

    beforeEach(() => {
      collection = collectionManager.createCollection(
        "Test Deck",
        ["1", "2", "3"],
        "0xowner1"
      );
    });

    it("should export collection as JSON", () => {
      const exported = collectionManager.exportCollection(collection, "json");

      const parsed = JSON.parse(exported);
      expect(parsed.id).toBe(collection.id);
      expect(parsed.name).toBe(collection.name);
      expect(parsed.cards).toEqual(collection.cards);
    });

    it("should export collection as CSV", () => {
      const exported = collectionManager.exportCollection(collection, "csv");

      expect(exported).toContain("id,name,cards,owner");
      expect(exported).toContain(collection.id);
      expect(exported).toContain(collection.name);
      expect(exported).toContain('"1,2,3"'); // Cards array as string
    });

    it("should export collection as TXT", () => {
      const exported = collectionManager.exportCollection(collection, "txt");

      expect(exported).toContain(`Collection: ${collection.name}`);
      expect(exported).toContain(`Owner: ${collection.owner}`);
      expect(exported).toContain("Cards: 1, 2, 3");
    });

    it("should throw error for unsupported format", () => {
      expect(() => {
        collectionManager.exportCollection(collection, "xml" as any);
      }).toThrow("Unsupported export format: xml");
    });
  });

  describe("Collection Import", () => {
    it("should import collection from JSON", () => {
      const jsonData = JSON.stringify({
        name: "Imported Deck",
        cards: ["4", "5", "6"],
        owner: "0ximporter",
        description: "An imported deck",
      });

      const imported = collectionManager.importCollection(jsonData, "json");

      expect(imported.name).toBe("Imported Deck");
      expect(imported.cards).toEqual(["4", "5", "6"]);
      expect(imported.owner).toBe("0ximporter");
      expect(imported.description).toBe("An imported deck");
      expect(imported.id).toBeDefined();
    });

    it("should import collection from CSV", () => {
      const csvData =
        'name,cards,owner,description\n"Test Deck","7,8,9","0ximporter","CSV imported deck"';

      const imported = collectionManager.importCollection(csvData, "csv");

      expect(imported.name).toBe("Test Deck");
      expect(imported.cards).toEqual(["7", "8", "9"]);
      expect(imported.owner).toBe("0ximporter");
      expect(imported.description).toBe("CSV imported deck");
    });

    it("should import collection from TXT", () => {
      const txtData = `Collection: TXT Deck
Owner: 0ximporter
Description: Text imported deck
Cards: 10, 11, 12`;

      const imported = collectionManager.importCollection(txtData, "txt");

      expect(imported.name).toBe("TXT Deck");
      expect(imported.cards).toEqual(["10", "11", "12"]);
      expect(imported.owner).toBe("0ximporter");
      expect(imported.description).toBe("Text imported deck");
    });

    it("should throw error for invalid JSON", () => {
      const invalidJson = "{ invalid json }";

      expect(() => {
        collectionManager.importCollection(invalidJson, "json");
      }).toThrow();
    });

    it("should throw error for unsupported import format", () => {
      expect(() => {
        collectionManager.importCollection("data", "xml" as any);
      }).toThrow("Unsupported import format: xml");
    });

    it("should handle missing required fields in import", () => {
      const incompleteJson = JSON.stringify({
        name: "Incomplete Deck",
        // Missing cards and owner
      });

      const imported = collectionManager.importCollection(
        incompleteJson,
        "json"
      );

      expect(imported.name).toBe("Incomplete Deck");
      expect(imported.cards).toEqual([]); // Default to empty array
      expect(imported.owner).toBe(""); // Default to empty string
    });
  });

  describe("Edge Cases", () => {
    it("should handle very large collection", () => {
      const largeCardList = Array.from(
        { length: 10000 },
        (_, i) => `card-${i}`
      );

      const collection = collectionManager.createCollection(
        "Large Deck",
        largeCardList,
        "0xowner1"
      );

      expect(collection.cards).toHaveLength(10000);
      expect(collection.cards[0]).toBe("card-0");
      expect(collection.cards[9999]).toBe("card-9999");
    });

    it("should handle special characters in collection name", () => {
      const collection = collectionManager.createCollection(
        "Deck with 特殊字符 and émojis 🃏",
        ["1"],
        "0xowner1"
      );

      expect(collection.name).toBe("Deck with 特殊字符 and émojis 🃏");
    });

    it("should handle very long card IDs", () => {
      const longCardId = "a".repeat(1000);

      const collection = collectionManager.createCollection(
        "Test Deck",
        [longCardId],
        "0xowner1"
      );

      expect(collection.cards[0]).toBe(longCardId);
    });
  });
});
