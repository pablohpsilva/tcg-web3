import { Card } from "../types/core.js";
import {
  Filter,
  FilterOperator,
  LogicalOperator,
  SortConfig,
  SortDirection,
} from "../types/core.js";

/**
 * Type for filter function
 */
export type FilterFunction<T = any> = (
  item: T,
  value: any,
  context?: FilterContext
) => boolean;

/**
 * Type for sort comparison function
 */
export type SortFunction<T = any> = (
  a: T,
  b: T,
  direction: SortDirection
) => number;

/**
 * Filter context for advanced filtering
 */
export interface FilterContext {
  allItems?: any[];
  currentIndex?: number;
  metadata?: Record<string, any>;
  page?: number;
  pageSize?: number;
}

/**
 * Custom sorter registration
 */
export interface CustomSorter {
  name: string;
  apply: (a: any, b: any) => number;
  description?: string;
}

/**
 * Custom filter registration
 */
export interface CustomFilter {
  operator: string;
  apply: FilterFunction;
  description?: string;
  supportedTypes?: (
    | "string"
    | "number"
    | "boolean"
    | "date"
    | "array"
    | "object"
    | "enum"
  )[];
}

/**
 * Custom sort registration
 */
export interface CustomSort {
  field: string;
  handler: SortFunction;
  description?: string;
}

/**
 * Field type information for better filtering
 */
export interface FieldInfo {
  type: "string" | "number" | "boolean" | "date" | "enum" | "array" | "object";
  enum?: string[];
  description?: string;
  isNested?: boolean;
  nestedFields?: Record<string, FieldInfo>;
  validators?: ((value: any) => boolean)[];
}

/**
 * Filter preset for common filter combinations
 */
export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  filters: Filter[];
  tags?: string[];
}

/**
 * Advanced filter engine with extensible filtering and sorting capabilities
 */
export class FilterEngine<T = any> {
  private customFilters = new Map<string, CustomFilter>();
  private customSorters = new Map<string, CustomSort>();
  private fieldRegistry = new Map<string, FieldInfo>();
  private presets = new Map<string, FilterPreset>();

  constructor() {
    this.registerBuiltinFilters();
    this.registerBuiltinSorters();
    this.registerCardFields();
    this.registerDefaultPresets();
  }

  /**
   * Apply filters to a dataset
   */
  applyFilters(items: T[], filters: Filter[], context?: FilterContext): T[] {
    let result = items;

    if (filters && filters.length > 0) {
      result = items.filter((item, index) => {
        const itemContext = {
          ...context,
          allItems: items,
          currentIndex: index,
        };

        return this.evaluateFilterGroup(item, filters, itemContext);
      });
    }

    // Apply pagination if specified in context
    if (context?.page && context?.pageSize) {
      const startIndex = (context.page - 1) * context.pageSize;
      const endIndex = startIndex + context.pageSize;
      result = result.slice(startIndex, endIndex);
    }

    return result;
  }

  /**
   * Apply sorting to a dataset
   */
  applySorting(items: T[], sortConfigs: SortConfig[]): T[] {
    if (!sortConfigs || sortConfigs.length === 0) {
      return items;
    }

    return [...items].sort((a, b) => {
      for (const sortConfig of sortConfigs) {
        const comparison = this.compareItems(a, b, sortConfig);
        if (comparison !== 0) {
          return comparison;
        }
      }
      return 0;
    });
  }

  /**
   * Register a custom filter operator
   */
  registerFilter(
    operator: string,
    handler: FilterFunction,
    options?: {
      description?: string;
      supportedTypes?: (
        | "string"
        | "number"
        | "boolean"
        | "date"
        | "array"
        | "object"
      )[];
    }
  ): void {
    this.customFilters.set(operator, {
      operator,
      handler,
      description: options?.description,
      supportedTypes: options?.supportedTypes,
    });
  }

  /**
   * Register a custom filter operator (alias for registerFilter)
   */
  registerCustomFilter(filter: CustomFilter): void {
    this.registerFilter(filter.operator, filter.apply, {
      description: filter.description,
      supportedTypes: filter.supportedTypes,
    });
  }

  /**
   * Register a custom sort function for a field
   */
  registerSort(
    field: string,
    handler: SortFunction,
    description?: string
  ): void {
    this.customSorters.set(field, {
      field,
      handler,
      description,
    });
  }

  /**
   * Register a custom sorter
   */
  registerCustomSorter(sorter: CustomSorter): void {
    this.customSorters.set(sorter.name, {
      name: sorter.name,
      handler: sorter.apply,
      description: sorter.description,
    });
  }

  /**
   * Register field information for better filtering
   */
  registerField(fieldPath: string, info: FieldInfo): void {
    this.fieldRegistry.set(fieldPath, info);
  }

  /**
   * Register a filter preset
   */
  registerPreset(preset: FilterPreset): void {
    this.presets.set(preset.id, preset);
  }

  /**
   * Register default filter presets
   */
  private registerDefaultPresets(): void {
    // High value cards preset
    this.presets.set("high_value_cards", {
      id: "high_value_cards",
      name: "High Value Cards",
      description: "Cards with high cost or legendary rarity",
      filters: [
        {
          field: "cost",
          operator: FilterOperator.GREATER_THAN_OR_EQUAL,
          value: 5,
          logicalOperator: LogicalOperator.OR,
        },
        {
          field: "rarity",
          operator: FilterOperator.EQUALS,
          value: "legendary",
        },
      ],
    });

    // Recent cards preset
    this.presets.set("recent_cards", {
      id: "recent_cards",
      name: "Recent Cards",
      description: "Recently added cards",
      filters: [
        {
          field: "createdAt",
          operator: FilterOperator.GREATER_THAN,
          value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      ],
    });
  }

  /**
   * Get available filter operators
   */
  getAvailableOperators(): Record<string, CustomFilter> {
    const operators: Record<string, CustomFilter> = {};
    for (const [key, value] of this.customFilters) {
      operators[key] = value;
    }
    return operators;
  }

  /**
   * Get field registry
   */
  getFieldRegistry(): Record<string, FieldInfo> {
    const fields: Record<string, FieldInfo> = {};
    for (const [key, value] of this.fieldRegistry) {
      fields[key] = value;
    }
    return fields;
  }

  /**
   * Get available presets
   */
  getPresets(): Record<string, FilterPreset> {
    const presets: Record<string, FilterPreset> = {};
    for (const [key, value] of this.presets) {
      presets[key] = value;
    }
    return presets;
  }

  /**
   * Apply a preset filter configuration
   */
  applyPreset(items: T[], presetId: string, context?: FilterContext): T[] {
    const preset = this.presets.get(presetId);
    if (!preset) {
      // Return empty array for unknown presets instead of throwing
      return [];
    }

    return this.applyFilters(items, preset.filters, context);
  }

  /**
   * Validate a filter against field registry
   */
  validateFilter(filter: Filter): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if field exists in registry
    const fieldInfo = this.fieldRegistry.get(filter.field);
    if (!fieldInfo) {
      errors.push(`Field '${filter.field}' is not registered`);
      return { isValid: false, errors };
    }

    // Check if operator is supported for this field type
    const customFilter = this.customFilters.get(filter.operator);
    if (customFilter && customFilter.supportedTypes) {
      if (!customFilter.supportedTypes.includes(fieldInfo.type)) {
        errors.push(
          `Operator '${filter.operator}' is not supported for field type '${fieldInfo.type}'`
        );
      }
    }

    // Run field validators if available
    if (fieldInfo.validators) {
      for (const validator of fieldInfo.validators) {
        if (!validator(filter.value)) {
          errors.push(`Invalid value for field '${filter.field}'`);
        }
      }
    }

    // Validate enum values
    if (fieldInfo.type === "enum" && fieldInfo.enum) {
      if (Array.isArray(filter.value)) {
        const invalidValues = filter.value.filter(
          (v) => !fieldInfo.enum!.includes(v)
        );
        if (invalidValues.length > 0) {
          errors.push(`Invalid enum values: ${invalidValues.join(", ")}`);
        }
      } else if (!fieldInfo.enum.includes(filter.value)) {
        errors.push(`Invalid enum value: ${filter.value}`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Build a filter query from a search string (for user-friendly filtering)
   */
  buildFiltersFromSearch(
    searchString: string,
    searchableFields: string[]
  ): Filter[] {
    const filters: Filter[] = [];

    // Simple implementation - can be extended for complex query parsing
    if (searchString.trim()) {
      const orFilters: Filter[] = searchableFields.map((field) => ({
        field,
        operator: FilterOperator.CONTAINS,
        value: searchString.trim(),
        logicalOperator: LogicalOperator.OR,
      }));

      filters.push(...orFilters);
    }

    return filters;
  }

  /**
   * Evaluate a group of filters with logical operators
   */
  private evaluateFilterGroup(
    item: T,
    filters: Filter[],
    context?: FilterContext
  ): boolean {
    if (filters.length === 0) return true;

    let result = this.evaluateFilter(item, filters[0], context);

    for (let i = 1; i < filters.length; i++) {
      const filter = filters[i];
      const filterResult = this.evaluateFilter(item, filter, context);

      if (filter.logicalOperator === LogicalOperator.OR) {
        result = result || filterResult;
      } else {
        // Default to AND
        result = result && filterResult;
      }
    }

    return result;
  }

  /**
   * Evaluate a single filter
   */
  private evaluateFilter(
    item: T,
    filter: Filter,
    context?: FilterContext
  ): boolean {
    const value = this.getNestedValue(item, filter.field);

    // Check for custom filter
    const customFilter = this.customFilters.get(filter.operator);
    if (customFilter) {
      return customFilter.handler(value, filter.value, context);
    }

    // Fallback to built-in filters (shouldn't be reached since all are registered as custom)
    switch (filter.operator) {
      case FilterOperator.EQUALS:
        return value === filter.value;
      case FilterOperator.NOT_EQUALS:
        return value !== filter.value;
      case FilterOperator.GREATER_THAN:
        return Number(value) > Number(filter.value);
      case FilterOperator.GREATER_THAN_OR_EQUAL:
        return Number(value) >= Number(filter.value);
      case FilterOperator.LESS_THAN:
        return Number(value) < Number(filter.value);
      case FilterOperator.LESS_THAN_OR_EQUAL:
        return Number(value) <= Number(filter.value);
      case FilterOperator.CONTAINS:
        if (typeof value === "string" && typeof filter.value === "string") {
          return value.toLowerCase().includes(filter.value.toLowerCase());
        }
        if (Array.isArray(value)) {
          return value.includes(filter.value);
        }
        return false;
      case FilterOperator.NOT_CONTAINS:
        if (typeof value === "string" && typeof filter.value === "string") {
          return !value.toLowerCase().includes(filter.value.toLowerCase());
        }
        if (Array.isArray(value)) {
          return !value.includes(filter.value);
        }
        return true;
      case FilterOperator.IN:
        if (Array.isArray(filter.value)) {
          return filter.value.includes(value);
        }
        return false;
      case FilterOperator.NOT_IN:
        if (Array.isArray(filter.value)) {
          return !filter.value.includes(value);
        }
        return true;
      case FilterOperator.STARTS_WITH:
        return String(value)
          .toLowerCase()
          .startsWith(String(filter.value).toLowerCase());
      case FilterOperator.ENDS_WITH:
        return String(value)
          .toLowerCase()
          .endsWith(String(filter.value).toLowerCase());
      default:
        return false;
    }
  }

  /**
   * Compare two items based on sort configuration
   */
  private compareItems(a: T, b: T, sortConfig: SortConfig): number {
    // Check if a custom sorter is specified
    if (sortConfig.customSorter) {
      const customSorter = this.customSorters.get(sortConfig.customSorter);
      if (customSorter) {
        const result = customSorter.handler(a, b);
        return sortConfig.direction === SortDirection.DESC ? -result : result;
      }
    }

    const aValue = this.getNestedValue(a, sortConfig.field);
    const bValue = this.getNestedValue(b, sortConfig.field);

    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    // Compare values
    let comparison = 0;
    if (typeof aValue === "string" && typeof bValue === "string") {
      comparison = aValue.localeCompare(bValue);
    } else if (typeof aValue === "number" && typeof bValue === "number") {
      comparison = aValue - bValue;
    } else if (aValue instanceof Date && bValue instanceof Date) {
      comparison = aValue.getTime() - bValue.getTime();
    } else {
      // Fallback to string comparison
      comparison = String(aValue).localeCompare(String(bValue));
    }

    return sortConfig.direction === SortDirection.DESC
      ? -comparison
      : comparison;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => {
      if (current == null) return undefined;

      // Handle array access with bracket notation
      if (key.includes("[") && key.includes("]")) {
        const arrayKey = key.substring(0, key.indexOf("["));
        const indexStr = key.substring(key.indexOf("[") + 1, key.indexOf("]"));
        const index = parseInt(indexStr, 10);

        if (Array.isArray(current[arrayKey])) {
          return current[arrayKey][index];
        }
      }

      return current[key];
    }, obj);
  }

  /**
   * Register built-in filter operators
   */
  private registerBuiltinFilters(): void {
    // Basic operators
    this.registerFilter(
      FilterOperator.EQUALS,
      (value, filterValue) => value === filterValue,
      {
        description: "Exact equality match",
        supportedTypes: ["string", "number", "boolean"],
      }
    );

    this.registerFilter(
      FilterOperator.NOT_EQUALS,
      (value, filterValue) => value !== filterValue,
      {
        description: "Not equal comparison",
        supportedTypes: ["string", "number", "boolean"],
      }
    );

    this.registerFilter(
      FilterOperator.GREATER_THAN,
      (value, filterValue) => {
        if (typeof value === "number" && typeof filterValue === "number") {
          return value > filterValue;
        }
        if (value instanceof Date && filterValue instanceof Date) {
          return value.getTime() > filterValue.getTime();
        }
        return false;
      },
      {
        description: "Greater than comparison",
        supportedTypes: ["number", "date"],
      }
    );

    this.registerFilter(
      FilterOperator.GREATER_THAN_OR_EQUAL,
      (value, filterValue) => {
        if (typeof value === "number" && typeof filterValue === "number") {
          return value >= filterValue;
        }
        if (value instanceof Date && filterValue instanceof Date) {
          return value.getTime() >= filterValue.getTime();
        }
        return false;
      },
      {
        description: "Greater than or equal comparison",
        supportedTypes: ["number", "date"],
      }
    );

    this.registerFilter(
      FilterOperator.LESS_THAN,
      (value, filterValue) => {
        if (typeof value === "number" && typeof filterValue === "number") {
          return value < filterValue;
        }
        if (value instanceof Date && filterValue instanceof Date) {
          return value.getTime() < filterValue.getTime();
        }
        return false;
      },
      {
        description: "Less than comparison",
        supportedTypes: ["number", "date"],
      }
    );

    this.registerFilter(
      FilterOperator.LESS_THAN_OR_EQUAL,
      (value, filterValue) => {
        if (typeof value === "number" && typeof filterValue === "number") {
          return value <= filterValue;
        }
        if (value instanceof Date && filterValue instanceof Date) {
          return value.getTime() <= filterValue.getTime();
        }
        return false;
      },
      {
        description: "Less than or equal comparison",
        supportedTypes: ["number", "date"],
      }
    );

    this.registerFilter(
      FilterOperator.CONTAINS,
      (value, filterValue) => {
        if (typeof value === "string" && typeof filterValue === "string") {
          return value.toLowerCase().includes(filterValue.toLowerCase());
        }
        if (Array.isArray(value)) {
          return value.includes(filterValue);
        }
        return false;
      },
      {
        description: "Contains substring or array element",
        supportedTypes: ["string", "array"],
      }
    );

    this.registerFilter(
      FilterOperator.IN,
      (value, filterValue) => {
        if (Array.isArray(filterValue)) {
          return filterValue.includes(value);
        }
        return false;
      },
      {
        description: "Value is in array",
        supportedTypes: ["string", "number", "boolean"],
      }
    );

    // Add fuzzy matching filter
    this.registerFilter(
      "fuzzy_match" as FilterOperator,
      (value, filterValue) => {
        if (typeof value !== "string" || typeof filterValue !== "string") {
          return false;
        }

        const valueLower = value.toLowerCase();
        const filterLower = filterValue.toLowerCase();

        // Simple fuzzy matching: allow 1 character difference
        if (Math.abs(valueLower.length - filterLower.length) > 1) {
          return false;
        }

        let differences = 0;
        const maxLength = Math.max(valueLower.length, filterLower.length);

        for (let i = 0; i < maxLength; i++) {
          if (valueLower[i] !== filterLower[i]) {
            differences++;
            if (differences > 1) return false;
          }
        }

        return differences <= 1;
      },
      {
        description: "Fuzzy string matching",
        supportedTypes: ["string"],
      }
    );

    // Add date between filter
    this.registerFilter(
      "date_between" as FilterOperator,
      (value, filterValue) => {
        if (
          !(value instanceof Date) ||
          !Array.isArray(filterValue) ||
          filterValue.length !== 2
        ) {
          return false;
        }

        const [start, end] = filterValue;
        const time = value.getTime();

        return time >= start.getTime() && time <= end.getTime();
      },
      {
        description: "Date is between two dates",
        supportedTypes: ["date"],
      }
    );

    // Add array contains filter
    this.registerFilter(
      "array_contains_keyword" as FilterOperator,
      (value, filterValue) => {
        if (!Array.isArray(value) || typeof filterValue !== "string") {
          return false;
        }

        return value.includes(filterValue);
      },
      {
        description: "Array contains specific value",
        supportedTypes: ["array"],
      }
    );
  }

  /**
   * Register built-in sort functions
   */
  private registerBuiltinSorters(): void {
    // Custom sort for card rarity (following typical TCG rarity order)
    this.registerSort(
      "rarity",
      (a: any, b: any, direction) => {
        const rarityOrder = [
          "common",
          "uncommon",
          "rare",
          "epic",
          "legendary",
          "mythic",
        ];
        const indexA = rarityOrder.indexOf(a.rarity?.toLowerCase());
        const indexB = rarityOrder.indexOf(b.rarity?.toLowerCase());

        const comparison = indexA - indexB;
        return direction === SortDirection.DESC ? -comparison : comparison;
      },
      "Sort by card rarity in TCG order"
    );

    // Custom sort for arrays by length
    this.registerSort(
      "array_length",
      (a: any, b: any, direction) => {
        const getValue = (obj: any, field: string) => {
          const value = this.getNestedValue(obj, field);
          return Array.isArray(value) ? value.length : 0;
        };

        const lengthA = getValue(a, "field");
        const lengthB = getValue(b, "field");

        const comparison = lengthA - lengthB;
        return direction === SortDirection.DESC ? -comparison : comparison;
      },
      "Sort by array length"
    );
  }

  /**
   * Register field information for Card type
   */
  private registerCardFields(): void {
    const cardFields: Record<string, FieldInfo> = {
      tokenId: { type: "string", description: "Unique token identifier" },
      contractAddress: { type: "string", description: "Contract address" },
      chainId: { type: "number", description: "Blockchain network ID" },
      name: { type: "string", description: "Card name" },
      description: { type: "string", description: "Card description" },
      image: { type: "string", description: "Card image URL" },
      rarity: {
        type: "enum",
        enum: ["common", "uncommon", "rare", "epic", "legendary", "mythic"],
        description: "Card rarity level",
      },
      type: {
        type: "enum",
        enum: [
          "creature",
          "spell",
          "artifact",
          "enchantment",
          "land",
          "planeswalker",
        ],
        description: "Card type",
      },
      cost: { type: "number", description: "Mana/energy cost" },
      power: { type: "number", description: "Creature power" },
      toughness: { type: "number", description: "Creature toughness" },
      setId: { type: "string", description: "Set identifier" },
      setName: { type: "string", description: "Set name" },
      cardNumber: { type: "string", description: "Card number in set" },
      colors: { type: "array", description: "Card colors" },
      colorIdentity: { type: "array", description: "Color identity" },
      keywords: { type: "array", description: "Card keywords" },
      abilities: { type: "array", description: "Card abilities" },
      owner: { type: "string", description: "Current owner address" },
      mintedAt: { type: "date", description: "Mint timestamp" },
      lastTransferAt: { type: "date", description: "Last transfer timestamp" },
    };

    for (const [field, info] of Object.entries(cardFields)) {
      this.registerField(field, info);
    }
  }
}

/**
 * Pre-built filter presets for common use cases
 */
export const BUILTIN_PRESETS: FilterPreset[] = [
  {
    id: "high_value_cards",
    name: "High Value Cards",
    description: "Cards with rare or higher rarity",
    filters: [
      {
        field: "rarity",
        operator: FilterOperator.IN,
        value: ["rare", "epic", "legendary", "mythic"],
      },
    ],
    tags: ["rarity", "value"],
  },
  {
    id: "low_cost_creatures",
    name: "Low Cost Creatures",
    description: "Creatures with cost 3 or less",
    filters: [
      {
        field: "type",
        operator: FilterOperator.EQUALS,
        value: "creature",
      },
      {
        field: "cost",
        operator: FilterOperator.LESS_THAN_OR_EQUAL,
        value: 3,
        logicalOperator: LogicalOperator.AND,
      },
    ],
    tags: ["cost", "creatures"],
  },
  {
    id: "recent_cards",
    name: "Recently Minted",
    description: "Cards minted in the last 30 days",
    filters: [
      {
        field: "mintedAt",
        operator: FilterOperator.GREATER_THAN_OR_EQUAL,
        value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    ],
    tags: ["time", "recent"],
  },
];

// Export a singleton instance for the Card type
export const cardFilterEngine = new FilterEngine<Card>();

// Register the built-in presets
BUILTIN_PRESETS.forEach((preset) => cardFilterEngine.registerPreset(preset));
