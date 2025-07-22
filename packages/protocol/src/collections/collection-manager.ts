import { Collection, Card, CollectionMetadata } from "../types/core.js";
import type { MetadataConfig } from "../types/metadata.js";
import type {
  CollectionManager as CollectionManagerInterface,
  MetadataCalculatorInterface,
} from "../types/sdk.js";

/**
 * Simple in-memory collection manager implementation
 */
export class SimpleCollectionManager implements CollectionManagerInterface {
  private collections = new Map<string, Collection>();

  constructor(private metadataCalculator: MetadataCalculatorInterface) {}

  /**
   * Create a new collection
   */
  createCollection(
    name: string,
    cards: string[],
    creator: string,
    description?: string
  ): Collection {
    const collection: Collection = {
      id: `collection-${Date.now()}-${Math.random().toString(36).substring(2)}`,
      name,
      description,
      cards: [...cards], // Copy the array
      creator,
      owner: creator,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store the collection
    this.collections.set(collection.id, collection);

    return collection;
  }

  /**
   * Get a collection by ID
   */
  getCollection(id: string): Collection | undefined {
    return this.collections.get(id);
  }

  /**
   * List collections, optionally filtered by owner
   */
  listCollections(owner?: string): Collection[] {
    const allCollections = Array.from(this.collections.values());

    if (owner) {
      return allCollections.filter(
        (collection) =>
          collection.creator === owner || collection.owner === owner
      );
    }

    return allCollections;
  }

  /**
   * Delete a collection
   */
  deleteCollection(id: string): boolean {
    return this.collections.delete(id);
  }

  /**
   * Update an existing collection
   */
  updateCollection(
    id: string,
    updates: Partial<Pick<Collection, "name" | "description" | "cards">>
  ): Collection {
    const existingCollection = this.collections.get(id);
    if (!existingCollection) {
      throw new Error("Collection not found");
    }

    // Ensure timestamp difference by adding a small delay
    const now = new Date();
    if (now.getTime() === existingCollection.updatedAt.getTime()) {
      now.setTime(now.getTime() + 1);
    }

    const updated = { ...existingCollection, ...updates, updatedAt: now };

    // Update in storage
    this.collections.set(id, updated);

    return updated;
  }

  /**
   * Generate metadata for a collection
   */
  generateMetadata(
    collection: Collection,
    cards: Card[],
    config?: MetadataConfig
  ): CollectionMetadata {
    // Use the provided Card objects with the metadata calculator
    if (cards && cards.length > 0) {
      const result = this.metadataCalculator.calculate(cards, config);

      // Handle both real calculator format { metadata: {...} } and mock format { ... }
      if (result && typeof result === "object") {
        if ("metadata" in result) {
          return result.metadata;
        } else {
          // Mock returns metadata properties directly
          return result as CollectionMetadata;
        }
      }
    }

    // Otherwise, generate basic metadata from collection's card IDs
    const metadata: CollectionMetadata = {
      totalCards: collection.cards.length,
      totalCost: 0, // Can't calculate without card data
      averageCost: 0, // Can't calculate without card data
      rarityDistribution: {} as any,
      typeDistribution: {} as any,
      setDistribution: {},
      customMetrics: {},
    };

    return metadata;
  }

  /**
   * Validate a collection
   */
  validateCollection(collection: Collection): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!collection.name || collection.name.trim() === "") {
      errors.push("Collection name is required");
    }

    // Check for owner (or creator as fallback)
    if (
      (!collection.owner || collection.owner.trim() === "") &&
      (!collection.creator || collection.creator.trim() === "")
    ) {
      errors.push("Collection owner is required");
    }

    if (!collection.cards || !Array.isArray(collection.cards)) {
      errors.push("Collection must have a cards array");
    } else {
      // Validate card IDs format
      const cardIds = new Set<string>();
      const duplicates = new Set<string>();

      for (const cardId of collection.cards) {
        if (typeof cardId !== "string") {
          errors.push(`Invalid card ID format: ${cardId}`);
          continue;
        }

        if (cardIds.has(cardId)) {
          duplicates.add(cardId);
        } else {
          cardIds.add(cardId);
        }
      }

      if (duplicates.size > 0) {
        errors.push("Duplicate cards found in collection");
      }

      if (collection.cards.length === 0) {
        warnings.push("Collection is empty");
      }

      if (collection.cards.length > 10000) {
        warnings.push("Collection is very large (>10000 cards)");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Export collection to various formats
   */
  exportCollection(
    collection: Collection,
    format: "json" | "csv" | "txt" | "mtga" | "mtgo"
  ): string {
    switch (format) {
      case "json":
        return JSON.stringify(collection, null, 2);

      case "txt":
        return this.exportToText(collection);

      case "csv":
        return this.exportToCsv(collection);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Import collection from various formats
   */
  importCollection(
    data: string,
    format: "json" | "csv" | "txt" | "mtga" | "mtgo"
  ): Collection {
    switch (format) {
      case "json":
        try {
          const parsed = JSON.parse(data) as Partial<Collection>;
          return {
            id:
              parsed.id ||
              `collection-${Date.now()}-${Math.random()
                .toString(36)
                .substring(2)}`,
            name: parsed.name || "Imported Collection",
            description: parsed.description || undefined,
            cards: parsed.cards || [],
            creator: parsed.creator || parsed.owner || "",
            owner: parsed.owner || parsed.creator || "",
            createdAt: parsed.createdAt
              ? new Date(parsed.createdAt)
              : new Date(),
            updatedAt: new Date(),
          };
        } catch (error) {
          throw new Error(`Invalid JSON format: ${error}`);
        }

      case "csv":
        return this.importFromCsv(data);

      case "txt":
        return this.importFromTxt(data);

      default:
        throw new Error(`Unsupported import format: ${format}`);
    }
  }

  private exportToText(collection: Collection): string {
    if (!collection.name) {
      throw new Error("Collection name is required for text export");
    }

    let output = `Collection: ${collection.name}\n`;
    output += `${"=".repeat(collection.name.length + 12)}\n\n`; // +12 for "Collection: "

    if (collection.description) {
      output += `${collection.description}\n\n`;
    }

    output += `Owner: ${collection.owner || collection.creator}\n`;
    output += `Cards: ${collection.cards.join(", ")}\n`;
    output += `Total Cards: ${collection.cards.length}\n`;

    return output;
  }

  private exportToCsv(collection: Collection): string {
    const headers = [
      "id",
      "name",
      "cards",
      "owner",
      "description",
      "created_at",
    ];

    let csv = headers.join(",") + "\n";

    const row = [
      this.escapeCsv(collection.id || ""),
      this.escapeCsv(collection.name || ""),
      this.escapeCsv(collection.cards.join(",")),
      this.escapeCsv(collection.owner || collection.creator || ""),
      this.escapeCsv(collection.description || ""),
      this.escapeCsv(collection.createdAt?.toISOString() || ""),
    ];

    csv += row.join(",") + "\n";
    return csv;
  }

  private importFromCsv(data: string): Collection {
    const lines = data.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("Invalid CSV format");
    }

    const headers = this.parseCsvLine(lines[0]);
    const values = this.parseCsvLine(lines[1]);

    const getValueByHeader = (header: string): string => {
      const index = headers.indexOf(header);
      return index >= 0 ? values[index] || "" : "";
    };

    const cardsString = getValueByHeader("cards");
    const cards = cardsString
      ? cardsString
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c)
      : [];

    return {
      id: getValueByHeader("id") || `collection-${Date.now()}`,
      name: getValueByHeader("name") || "Imported Collection",
      description: getValueByHeader("description") || undefined,
      cards,
      creator: getValueByHeader("owner") || "",
      owner: getValueByHeader("owner") || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Handle escaped quotes
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    // Add the last field
    result.push(current.trim());

    return result;
  }

  private importFromTxt(data: string): Collection {
    const lines = data.trim().split("\n");
    let name = "Imported Collection";
    let description = "";
    let owner = "";
    let cards: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("Collection:")) {
        name = trimmed.replace("Collection:", "").trim();
      } else if (trimmed.startsWith("Owner:")) {
        owner = trimmed.replace("Owner:", "").trim();
      } else if (trimmed.startsWith("Cards:")) {
        const cardsStr = trimmed.replace("Cards:", "").trim();
        cards = cardsStr
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c);
      } else if (trimmed.startsWith("Description:")) {
        description = trimmed.replace("Description:", "").trim();
      } else if (
        trimmed &&
        !trimmed.startsWith("=") &&
        !trimmed.startsWith("Total") &&
        !trimmed.startsWith("Collection:") &&
        !trimmed.startsWith("Owner:") &&
        !trimmed.startsWith("Cards:") &&
        !trimmed.startsWith("Description:")
      ) {
        // Only add to description if it's not a recognized field and not empty
        if (!description) {
          description = trimmed;
        } else {
          description += " " + trimmed;
        }
      }
    }

    return {
      id: `collection-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
      cards,
      creator: owner,
      owner,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private escapeCsv(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
