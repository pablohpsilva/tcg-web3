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
}

/**
 * Custom filter registration
 */
export interface CustomFilter {
  operator: string;
  handler: FilterFunction;
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
  }

  /**
   * Apply filters to a dataset
   */
  applyFilters(items: T[], filters: Filter[], context?: FilterContext): T[] {
    if (!filters || filters.length === 0) {
      return items;
    }

    return items.filter((item, index) => {
      const itemContext = {
        ...context,
        allItems: items,
        currentIndex: index,
      };

      return this.evaluateFilterGroup(item, filters, itemContext);
    });
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
   * Apply a filter preset
   */
  applyPreset(items: T[], presetId: string, context?: FilterContext): T[] {
    const preset = this.presets.get(presetId);
    if (!preset) {
      throw new Error(`Filter preset '${presetId}' not found`);
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
      return customFilter.handler(item, filter.value, context);
    }

    // Fallback to built-in filters
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
      case FilterOperator.IN:
        return Array.isArray(filter.value) && filter.value.includes(value);
      case FilterOperator.NOT_IN:
        return Array.isArray(filter.value) && !filter.value.includes(value);
      case FilterOperator.CONTAINS:
        return String(value)
          .toLowerCase()
          .includes(String(filter.value).toLowerCase());
      case FilterOperator.NOT_CONTAINS:
        return !String(value)
          .toLowerCase()
          .includes(String(filter.value).toLowerCase());
      case FilterOperator.STARTS_WITH:
        return String(value)
          .toLowerCase()
          .startsWith(String(filter.value).toLowerCase());
      case FilterOperator.ENDS_WITH:
        return String(value)
          .toLowerCase()
          .endsWith(String(filter.value).toLowerCase());
      case FilterOperator.REGEX:
        return new RegExp(filter.value, "i").test(String(value));
      default:
        return true;
    }
  }

  /**
   * Compare two items for sorting
   */
  private compareItems(a: T, b: T, sortConfig: SortConfig): number {
    // Check for custom sorter
    const customSort = this.customSorters.get(sortConfig.field);
    if (customSort) {
      return customSort.handler(a, b, sortConfig.direction);
    }

    // Default sorting
    const valueA = this.getNestedValue(a, sortConfig.field);
    const valueB = this.getNestedValue(b, sortConfig.field);

    let comparison = 0;

    // Handle null/undefined values
    if (valueA == null && valueB == null) return 0;
    if (valueA == null) return 1;
    if (valueB == null) return -1;

    // Type-specific comparison
    if (typeof valueA === "number" && typeof valueB === "number") {
      comparison = valueA - valueB;
    } else if (valueA instanceof Date && valueB instanceof Date) {
      comparison = valueA.getTime() - valueB.getTime();
    } else {
      comparison = String(valueA).localeCompare(String(valueB));
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
    // Array-specific filters
    this.registerFilter(
      "array_contains",
      (item, value) => {
        const fieldValue = this.getNestedValue(item, "field");
        return Array.isArray(fieldValue) && fieldValue.includes(value);
      },
      {
        description: "Check if array contains a value",
        supportedTypes: ["array"],
      }
    );

    this.registerFilter(
      "array_length",
      (item, value) => {
        const fieldValue = this.getNestedValue(item, "field");
        return Array.isArray(fieldValue) && fieldValue.length === value;
      },
      {
        description: "Check array length",
        supportedTypes: ["array"],
      }
    );

    // Date-specific filters
    this.registerFilter(
      "date_between",
      (item, value) => {
        const fieldValue = this.getNestedValue(item, "field");
        if (
          !(fieldValue instanceof Date) ||
          !Array.isArray(value) ||
          value.length !== 2
        ) {
          return false;
        }
        const startDate = new Date(value[0]);
        const endDate = new Date(value[1]);
        return fieldValue >= startDate && fieldValue <= endDate;
      },
      {
        description: "Check if date is between two dates",
        supportedTypes: ["date"],
      }
    );

    // String-specific filters
    this.registerFilter(
      "fuzzy_match",
      (item, value) => {
        const fieldValue = String(
          this.getNestedValue(item, "field")
        ).toLowerCase();
        const searchValue = String(value).toLowerCase();

        // Simple fuzzy matching algorithm
        let j = 0;
        for (let i = 0; i < fieldValue.length && j < searchValue.length; i++) {
          if (fieldValue[i] === searchValue[j]) {
            j++;
          }
        }
        return j === searchValue.length;
      },
      {
        description: "Fuzzy string matching",
        supportedTypes: ["string"],
      }
    );

    // Numeric filters
    this.registerFilter(
      "multiple_of",
      (item, value) => {
        const fieldValue = Number(this.getNestedValue(item, "field"));
        return !isNaN(fieldValue) && fieldValue % value === 0;
      },
      {
        description: "Check if number is multiple of value",
        supportedTypes: ["number"],
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
