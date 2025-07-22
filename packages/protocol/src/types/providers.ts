import {
  Card,
  Filter,
  SortConfig,
  PaginationConfig,
  QueryResult,
  UpdateEvent,
  NetworkConfig,
} from "./core.js";

/**
 * Provider types for different data sources
 */
export enum ProviderType {
  WEB3_DIRECT = "web3_direct",
  INDEXING_SERVICE = "indexing_service",
  SUBGRAPH = "subgraph",
  REST_API = "rest_api",
  GRAPHQL_API = "graphql_api",
}

/**
 * Base provider interface that all data providers must implement
 */
export interface BaseProvider {
  readonly type: ProviderType;
  readonly isConnected: boolean;

  /**
   * Initialize the provider
   */
  initialize(): Promise<void>;

  /**
   * Cleanup and disconnect
   */
  disconnect(): Promise<void>;

  /**
   * Get cards owned by a wallet
   */
  getCardsByWallet(
    wallet: string,
    filters?: Filter[],
    sort?: SortConfig[],
    pagination?: PaginationConfig
  ): Promise<QueryResult<Card>>;

  /**
   * Get a specific card by token ID and contract
   */
  getCard(contractAddress: string, tokenId: string): Promise<Card | null>;

  /**
   * Get cards by contract address
   */
  getCardsByContract(
    contractAddress: string,
    filters?: Filter[],
    sort?: SortConfig[],
    pagination?: PaginationConfig
  ): Promise<QueryResult<Card>>;

  /**
   * Get cards by set ID
   */
  getCardsBySet(
    setId: string,
    filters?: Filter[],
    sort?: SortConfig[],
    pagination?: PaginationConfig
  ): Promise<QueryResult<Card>>;

  /**
   * Search cards with flexible filters
   */
  searchCards(
    filters: Filter[],
    sort?: SortConfig[],
    pagination?: PaginationConfig
  ): Promise<QueryResult<Card>>;
}

/**
 * Provider that supports real-time updates
 */
export interface RealtimeProvider extends BaseProvider {
  /**
   * Subscribe to real-time updates
   */
  subscribe(
    events: string[],
    callback: (event: UpdateEvent) => void,
    filters?: Filter[]
  ): Promise<string>; // Returns subscription ID

  /**
   * Unsubscribe from updates
   */
  unsubscribe(subscriptionId: string): Promise<void>;

  /**
   * Unsubscribe from all updates
   */
  unsubscribeAll(): Promise<void>;
}

/**
 * Web3 direct provider configuration
 */
export interface Web3ProviderConfig {
  type: ProviderType.WEB3_DIRECT;
  networkConfig: NetworkConfig;
  contractAddresses: string[];
  rpcUrl?: string;
  provider?: any; // ethers Provider
}

/**
 * Indexing service provider configuration
 */
export interface IndexingProviderConfig {
  type: ProviderType.INDEXING_SERVICE;
  baseUrl: string;
  apiKey?: string;
  chainId: number;
  customHeaders?: Record<string, string>;
}

/**
 * Subgraph provider configuration
 */
export interface SubgraphProviderConfig {
  type: ProviderType.SUBGRAPH;
  subgraphUrl: string;
  apiKey?: string;
  chainId: number;
  customHeaders?: Record<string, string>;
}

/**
 * REST API provider configuration
 */
export interface RestApiProviderConfig {
  type: ProviderType.REST_API;
  baseUrl: string;
  apiKey?: string;
  customHeaders?: Record<string, string>;
  endpoints?: {
    cards?: string;
    wallet?: string;
    sets?: string;
    search?: string;
  };
}

/**
 * GraphQL API provider configuration
 */
export interface GraphqlProviderConfig {
  type: ProviderType.GRAPHQL_API;
  endpoint: string;
  apiKey?: string;
  customHeaders?: Record<string, string>;
  subscriptionEndpoint?: string; // For real-time updates
}

/**
 * Union type for all provider configurations
 */
export type ProviderConfig =
  | Web3ProviderConfig
  | IndexingProviderConfig
  | SubgraphProviderConfig
  | RestApiProviderConfig
  | GraphqlProviderConfig;

/**
 * Real-time connection types
 */
export enum RealtimeConnectionType {
  WEBSOCKET = "websocket",
  SERVER_SENT_EVENTS = "sse",
  POLLING = "polling",
}

/**
 * Real-time configuration
 */
export interface RealtimeConfig {
  connectionType: RealtimeConnectionType;
  endpoint?: string;
  pollingInterval?: number; // For polling mode (milliseconds)
  reconnectAttempts?: number;
  reconnectDelay?: number; // milliseconds
  customHeaders?: Record<string, string>;
}

/**
 * Provider factory interface
 */
export interface ProviderFactory {
  /**
   * Create a provider instance
   */
  createProvider(config: ProviderConfig): BaseProvider | RealtimeProvider;

  /**
   * Get supported provider types
   */
  getSupportedTypes(): ProviderType[];

  /**
   * Check if a provider type is supported
   */
  supportsType(type: ProviderType): boolean;
}

/**
 * Multi-provider interface for aggregating data from multiple sources
 */
export interface MultiProvider extends BaseProvider {
  /**
   * Add a provider to the multi-provider
   */
  addProvider(provider: BaseProvider, priority?: number): void;

  /**
   * Remove a provider
   */
  removeProvider(provider: BaseProvider): void;

  /**
   * Get all registered providers
   */
  getProviders(): BaseProvider[];

  /**
   * Set provider priorities for fallback handling
   */
  setProviderPriorities(priorities: Map<BaseProvider, number>): void;
}

/**
 * Provider health check interface
 */
export interface ProviderHealth {
  isHealthy: boolean;
  latency?: number; // milliseconds
  lastChecked: Date;
  errorCount: number;
  uptime?: number; // percentage
}

/**
 * Provider with health monitoring
 */
export interface MonitoredProvider extends BaseProvider {
  /**
   * Get provider health status
   */
  getHealth(): Promise<ProviderHealth>;

  /**
   * Enable/disable health monitoring
   */
  setHealthMonitoring(enabled: boolean, interval?: number): void;
}

/**
 * Cache configuration for providers
 */
export interface CacheConfig {
  enabled: boolean;
  ttl?: number; // Time to live in seconds
  maxSize?: number; // Maximum cache size
  strategy?: "lru" | "fifo" | "lfu";
}

/**
 * Cached provider interface
 */
export interface CachedProvider extends BaseProvider {
  /**
   * Configure caching
   */
  setCacheConfig(config: CacheConfig): void;

  /**
   * Clear cache
   */
  clearCache(): void;

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    hits: number;
    misses: number;
    size: number;
    hitRate: number;
  };
}
