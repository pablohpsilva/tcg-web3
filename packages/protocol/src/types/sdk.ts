import {
  Card,
  Collection,
  Filter,
  SortConfig,
  PaginationConfig,
  QueryResult,
  UpdateEvent,
  AuthConfig,
} from "./core.js";
import { BaseProvider, ProviderConfig, RealtimeConfig } from "./providers.js";
import {
  MetadataCalculatorInterface,
  MetadataConfig,
  MetadataCalculationResult,
  MetadataTemplateManager,
} from "./metadata.js";

/**
 * Main SDK configuration
 */
export interface TCGProtocolConfig {
  // Provider configuration
  providers: ProviderConfig[];

  // Default provider to use
  defaultProvider?: string; // Provider type

  // Real-time updates configuration
  realtime?: RealtimeConfig;

  // Metadata calculation configuration
  metadata?: Partial<MetadataConfig>;

  // Authentication configuration
  auth?: AuthConfig;

  // Global settings
  settings?: {
    enableCaching?: boolean;
    cacheSize?: number;
    cacheTtl?: number;
    enableLogging?: boolean;
    logLevel?: "debug" | "info" | "warn" | "error";
    retryAttempts?: number;
    retryDelay?: number;
    timeout?: number;
  };
}

/**
 * Card query interface for flexible searching
 */
export interface CardQuery {
  // Basic filters
  filters?: Filter[];

  // Sorting
  sort?: SortConfig[];

  // Pagination
  pagination?: PaginationConfig;

  // Include metadata calculation
  includeMetadata?: boolean;

  // Specific fields to include/exclude
  fields?: {
    include?: string[];
    exclude?: string[];
  };
}

/**
 * Collection management interface
 */
export interface CollectionManager {
  /**
   * Create a new collection
   */
  createCollection(
    name: string,
    cards: Card[],
    options?: {
      description?: string;
      tags?: string[];
      generateMetadata?: boolean;
      metadataConfig?: Partial<MetadataConfig>;
    }
  ): Promise<Collection>;

  /**
   * Update an existing collection
   */
  updateCollection(
    collection: Collection,
    updates: Partial<
      Pick<Collection, "name" | "description" | "cards" | "tags">
    >
  ): Promise<Collection>;

  /**
   * Generate metadata for a collection
   */
  generateMetadata(
    cards: Card[],
    config?: Partial<MetadataConfig>
  ): Promise<MetadataCalculationResult>;

  /**
   * Validate a collection (check for duplicates, invalid cards, etc.)
   */
  validateCollection(collection: Collection): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * Export collection in various formats
   */
  exportCollection(
    collection: Collection,
    format: "json" | "csv" | "txt" | "mtga" | "mtgo"
  ): Promise<string>;

  /**
   * Import collection from various formats
   */
  importCollection(
    data: string,
    format: "json" | "csv" | "txt" | "mtga" | "mtgo"
  ): Promise<Collection>;
}

/**
 * Card search and filtering interface
 */
export interface CardSearcher {
  /**
   * Search cards with a query
   */
  search(query: CardQuery): Promise<QueryResult<Card>>;

  /**
   * Get cards owned by a wallet
   */
  getCardsByWallet(
    wallet: string,
    query?: CardQuery
  ): Promise<QueryResult<Card>>;

  /**
   * Get a specific card
   */
  getCard(contractAddress: string, tokenId: string): Promise<Card | null>;

  /**
   * Get cards by contract
   */
  getCardsByContract(
    contractAddress: string,
    query?: CardQuery
  ): Promise<QueryResult<Card>>;

  /**
   * Get cards by set
   */
  getCardsBySet(setId: string, query?: CardQuery): Promise<QueryResult<Card>>;

  /**
   * Advanced search with multiple criteria
   */
  advancedSearch(criteria: {
    text?: string; // Full-text search
    filters?: Filter[];
    sort?: SortConfig[];
    pagination?: PaginationConfig;
  }): Promise<QueryResult<Card>>;

  /**
   * Get available filter fields and their types
   */
  getFilterableFields(): Promise<
    Record<
      string,
      {
        type: "string" | "number" | "boolean" | "date" | "enum";
        enum?: string[];
        description?: string;
      }
    >
  >;
}

/**
 * Real-time updates interface
 */
export interface RealtimeManagerInterface {
  /**
   * Subscribe to card updates for a wallet
   */
  subscribeToWallet(
    wallet: string,
    callback: (event: UpdateEvent) => void,
    filters?: Filter[]
  ): Promise<string>;

  /**
   * Subscribe to updates for specific contracts
   */
  subscribeToContracts(
    contractAddresses: string[],
    callback: (event: UpdateEvent) => void,
    filters?: Filter[]
  ): Promise<string>;

  /**
   * Subscribe to set updates
   */
  subscribeToSets(
    setIds: string[],
    callback: (event: UpdateEvent) => void
  ): Promise<string>;

  /**
   * Subscribe to all updates with filters
   */
  subscribe(
    events: string[],
    callback: (event: UpdateEvent) => void,
    filters?: Filter[]
  ): Promise<string>;

  /**
   * Unsubscribe from updates
   */
  unsubscribe(subscriptionId: string): Promise<void>;

  /**
   * Unsubscribe from all updates
   */
  unsubscribeAll(): Promise<void>;

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    isConnected: boolean;
    connectionType: string;
    subscriptionCount: number;
  };

  /**
   * Disconnect from real-time updates
   */
  disconnect(): Promise<void>;
}

/**
 * Main TCG Protocol SDK interface
 */
export interface TCGProtocol {
  // Core managers
  readonly cards: CardSearcher;
  readonly collections: CollectionManager;
  readonly metadata: MetadataCalculatorInterface;
  readonly realtime: RealtimeManagerInterface;
  readonly templates: MetadataTemplateManager;

  // Provider management
  readonly providers: {
    getActiveProvider(): BaseProvider;
    getProvider(type: string): BaseProvider | null;
    addProvider(config: ProviderConfig): Promise<BaseProvider>;
    removeProvider(type: string): Promise<void>;
    setDefaultProvider(type: string): void;
  };

  // Configuration
  getConfig(): TCGProtocolConfig;
  updateConfig(config: Partial<TCGProtocolConfig>): Promise<void>;

  // Initialization and cleanup
  initialize(): Promise<void>;
  disconnect(): Promise<void>;

  // Health and status
  getHealth(): Promise<{
    isHealthy: boolean;
    providers: Record<string, boolean>;
    lastCheck: Date;
  }>;

  // Utilities
  utils: {
    /**
     * Validate a wallet address
     */
    validateWallet(address: string): boolean;

    /**
     * Format card data for display
     */
    formatCard(card: Card, format?: "short" | "detailed"): string;

    /**
     * Generate a collection hash for caching
     */
    generateCollectionHash(cards: Card[]): string;

    /**
     * Parse imported collection data
     */
    parseImportData(data: string, format: string): Promise<Card[]>;

    /**
     * Get supported networks
     */
    getSupportedNetworks(): Record<number, string>;
  };
}

/**
 * SDK factory interface for creating SDK instances
 */
export interface TCGProtocolFactory {
  /**
   * Create a new SDK instance
   */
  create(config: TCGProtocolConfig): Promise<TCGProtocol>;

  /**
   * Create SDK with default configuration
   */
  createDefault(): Promise<TCGProtocol>;

  /**
   * Get available provider types
   */
  getAvailableProviders(): string[];

  /**
   * Validate configuration
   */
  validateConfig(config: TCGProtocolConfig): {
    isValid: boolean;
    errors: string[];
  };
}

/**
 * Plugin interface for extending the SDK
 */
export interface TCGProtocolPlugin {
  name: string;
  version: string;
  description?: string;

  /**
   * Initialize the plugin
   */
  initialize(sdk: TCGProtocol): Promise<void>;

  /**
   * Cleanup the plugin
   */
  cleanup(): Promise<void>;

  /**
   * Plugin configuration
   */
  config?: Record<string, any>;
}

/**
 * Plugin manager interface
 */
export interface PluginManager {
  /**
   * Register a plugin
   */
  register(plugin: TCGProtocolPlugin): Promise<void>;

  /**
   * Unregister a plugin
   */
  unregister(name: string): Promise<void>;

  /**
   * Get registered plugins
   */
  getPlugins(): TCGProtocolPlugin[];

  /**
   * Get a specific plugin
   */
  getPlugin(name: string): TCGProtocolPlugin | null;

  /**
   * Enable/disable a plugin
   */
  setPluginEnabled(name: string, enabled: boolean): Promise<void>;
}

/**
 * Event system interface
 */
export interface EventSystem {
  /**
   * Subscribe to SDK events
   */
  on(event: string, callback: (...args: any[]) => void): void;

  /**
   * Unsubscribe from events
   */
  off(event: string, callback: (...args: any[]) => void): void;

  /**
   * Emit an event
   */
  emit(event: string, ...args: any[]): void;

  /**
   * Subscribe once to an event
   */
  once(event: string, callback: (...args: any[]) => void): void;
}

/**
 * SDK events
 */
export const SDKEvents = {
  INITIALIZED: "initialized",
  PROVIDER_ADDED: "provider_added",
  PROVIDER_REMOVED: "provider_removed",
  PROVIDER_ERROR: "provider_error",
  CONFIG_UPDATED: "config_updated",
  REALTIME_CONNECTED: "realtime_connected",
  REALTIME_DISCONNECTED: "realtime_disconnected",
  CACHE_CLEARED: "cache_cleared",
  ERROR: "error",
} as const;
