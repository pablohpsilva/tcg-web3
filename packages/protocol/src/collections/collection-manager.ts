import { CollectionManager } from "../types/sdk.js";
import { Card, Collection } from "../types/core.js";
import {
  MetadataCalculatorInterface,
  MetadataConfig,
  MetadataCalculationResult,
} from "../types/metadata.js";

/**
 * Simple collection manager implementation
 */
export class SimpleCollectionManager implements CollectionManager {
  constructor(private metadataCalculator: MetadataCalculatorInterface) {}

  async createCollection(
    name: string,
    cards: Card[],
    options?: {
      description?: string;
      tags?: string[];
      generateMetadata?: boolean;
      metadataConfig?: Partial<MetadataConfig>;
    }
  ): Promise<Collection> {
    const collection: Collection = {
      id: `collection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: options?.description,
      cards: [...cards],
      creator: "unknown", // Would need to be passed in or determined from context
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: options?.tags,
      isPublic: false,
    };

    if (options?.generateMetadata) {
      const result = await this.generateMetadata(cards, options.metadataConfig);
      collection.metadata = result.metadata;
    }

    return collection;
  }

  async updateCollection(
    collection: Collection,
    updates: Partial<
      Pick<Collection, "name" | "description" | "cards" | "tags">
    >
  ): Promise<Collection> {
    const updated: Collection = {
      ...collection,
      ...updates,
      updatedAt: new Date(),
    };

    // Regenerate metadata if cards changed
    if (updates.cards && collection.metadata) {
      const result = await this.generateMetadata(updated.cards);
      updated.metadata = result.metadata;
    }

    return updated;
  }

  async generateMetadata(
    cards: Card[],
    config?: Partial<MetadataConfig>
  ): Promise<MetadataCalculationResult> {
    return this.metadataCalculator.calculate(cards, config);
  }

  async validateCollection(collection: Collection): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate cards
    const cardIds = new Set<string>();
    const duplicates = new Set<string>();

    for (const card of collection.cards) {
      const cardId = `${card.contractAddress}:${card.tokenId}`;
      if (cardIds.has(cardId)) {
        duplicates.add(cardId);
      }
      cardIds.add(cardId);
    }

    if (duplicates.size > 0) {
      warnings.push(
        `Duplicate cards found: ${Array.from(duplicates).join(", ")}`
      );
    }

    // Check for invalid cards (missing required fields)
    for (let i = 0; i < collection.cards.length; i++) {
      const card = collection.cards[i];
      if (!card.tokenId || !card.contractAddress) {
        errors.push(
          `Card at index ${i} missing required fields (tokenId, contractAddress)`
        );
      }
      if (!card.name) {
        warnings.push(`Card at index ${i} missing name`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async exportCollection(
    collection: Collection,
    format: "json" | "csv" | "txt" | "mtga" | "mtgo"
  ): Promise<string> {
    switch (format) {
      case "json":
        return JSON.stringify(collection, null, 2);

      case "txt":
        return this.exportToText(collection);

      case "csv":
        return this.exportToCsv(collection);

      default:
        throw new Error(`Export format '${format}' not yet implemented`);
    }
  }

  async importCollection(
    data: string,
    format: "json" | "csv" | "txt" | "mtga" | "mtgo"
  ): Promise<Collection> {
    switch (format) {
      case "json":
        return JSON.parse(data) as Collection;

      default:
        throw new Error(`Import format '${format}' not yet implemented`);
    }
  }

  private exportToText(collection: Collection): string {
    let output = `${collection.name}\n`;
    output += `${"=".repeat(collection.name.length)}\n\n`;

    if (collection.description) {
      output += `${collection.description}\n\n`;
    }

    // Group cards by type
    const cardsByType = new Map<string, Card[]>();
    for (const card of collection.cards) {
      const type = card.type || "Unknown";
      if (!cardsByType.has(type)) {
        cardsByType.set(type, []);
      }
      cardsByType.get(type)!.push(card);
    }

    for (const [type, cards] of cardsByType) {
      output += `${type.charAt(0).toUpperCase() + type.slice(1)}s (${
        cards.length
      })\n`;
      output += `-${"-".repeat(type.length + 8)}\n`;

      for (const card of cards) {
        const cost = card.cost !== undefined ? ` [${card.cost}]` : "";
        const power =
          card.power !== undefined && card.toughness !== undefined
            ? ` (${card.power}/${card.toughness})`
            : "";
        output += `${card.name}${cost}${power}\n`;
      }
      output += "\n";
    }

    if (collection.metadata) {
      output += "Statistics\n";
      output += "----------\n";
      output += `Total Cards: ${collection.metadata.totalCards}\n`;
      output += `Total Cost: ${collection.metadata.totalCost}\n`;
      output += `Average Cost: ${collection.metadata.averageCost?.toFixed(
        2
      )}\n`;
      if (collection.metadata.powerLevel) {
        output += `Power Level: ${collection.metadata.powerLevel.toFixed(2)}\n`;
      }
    }

    return output;
  }

  private exportToCsv(collection: Collection): string {
    const headers = [
      "Name",
      "Type",
      "Rarity",
      "Cost",
      "Power",
      "Toughness",
      "Set",
      "Token ID",
      "Contract Address",
    ];
    let csv = headers.join(",") + "\n";

    for (const card of collection.cards) {
      const row = [
        this.escapeCsv(card.name),
        this.escapeCsv(card.type),
        this.escapeCsv(card.rarity),
        card.cost?.toString() || "",
        card.power?.toString() || "",
        card.toughness?.toString() || "",
        this.escapeCsv(card.setName || ""),
        this.escapeCsv(card.tokenId),
        this.escapeCsv(card.contractAddress),
      ];
      csv += row.join(",") + "\n";
    }

    return csv;
  }

  private escapeCsv(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
