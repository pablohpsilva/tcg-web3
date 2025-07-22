import { EventEmitter } from 'eventemitter3';

/**
 * Core blockchain network configuration
 */
interface NetworkConfig {
    chainId: number;
    name: string;
    rpcUrl: string;
    blockExplorer?: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
}
/**
 * Card rarity levels
 */
declare enum CardRarity {
    COMMON = "common",
    UNCOMMON = "uncommon",
    RARE = "rare",
    EPIC = "epic",
    LEGENDARY = "legendary",
    MYTHIC = "mythic"
}
/**
 * Card types/categories
 */
declare enum CardType {
    CREATURE = "creature",
    SPELL = "spell",
    ARTIFACT = "artifact",
    ENCHANTMENT = "enchantment",
    LAND = "land",
    PLANESWALKER = "planeswalker"
}
/**
 * Base card interface representing a single card
 */
interface Card {
    tokenId: string;
    contractAddress: string;
    chainId: number;
    name: string;
    description?: string;
    image: string;
    rarity: CardRarity;
    type: CardType;
    cost?: number;
    power?: number;
    toughness?: number;
    setId: string;
    setName: string;
    cardNumber?: string;
    colors?: string[];
    colorIdentity?: string[];
    keywords?: string[];
    abilities?: string[];
    owner: string;
    attributes?: Record<string, any>;
    mintedAt?: Date;
    lastTransferAt?: Date;
}
/**
 * Collection/Deck interface
 */
interface Collection {
    id: string;
    name: string;
    description?: string;
    cards: Card[];
    metadata?: CollectionMetadata;
    creator: string;
    createdAt: Date;
    updatedAt: Date;
    tags?: string[];
    isPublic?: boolean;
}
/**
 * Auto-generated collection metadata
 */
interface CollectionMetadata {
    totalCards: number;
    totalCost: number;
    averageCost: number;
    rarityDistribution: Record<CardRarity, number>;
    typeDistribution: Record<CardType, number>;
    colorDistribution?: Record<string, number>;
    powerLevel?: number;
    averagePower?: number;
    averageToughness?: number;
    setDistribution: Record<string, number>;
    customMetrics?: Record<string, any>;
}
/**
 * Wallet information
 */
interface Wallet {
    address: string;
    chainId: number;
    provider?: any;
}
/**
 * Generic filter interface
 */
interface Filter {
    field: string;
    operator: FilterOperator;
    value: any;
    logicalOperator?: LogicalOperator;
}
/**
 * Filter operators
 */
declare enum FilterOperator {
    EQUALS = "eq",
    NOT_EQUALS = "neq",
    GREATER_THAN = "gt",
    GREATER_THAN_OR_EQUAL = "gte",
    LESS_THAN = "lt",
    LESS_THAN_OR_EQUAL = "lte",
    IN = "in",
    NOT_IN = "nin",
    CONTAINS = "contains",
    NOT_CONTAINS = "not_contains",
    STARTS_WITH = "starts_with",
    ENDS_WITH = "ends_with",
    REGEX = "regex"
}
/**
 * Logical operators for combining filters
 */
declare enum LogicalOperator {
    AND = "and",
    OR = "or"
}
/**
 * Sorting configuration
 */
interface SortConfig {
    field: string;
    direction: SortDirection;
}
/**
 * Sort directions
 */
declare enum SortDirection {
    ASC = "asc",
    DESC = "desc"
}
/**
 * Pagination configuration
 */
interface PaginationConfig {
    page: number;
    limit: number;
    offset?: number;
}
/**
 * Query result interface
 */
interface QueryResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}
/**
 * Real-time update types
 */
declare enum UpdateType {
    CARD_MINTED = "card_minted",
    CARD_TRANSFERRED = "card_transferred",
    CARD_BURNED = "card_burned",
    CARD_METADATA_UPDATED = "card_metadata_updated",
    SET_CREATED = "set_created",
    SET_LOCKED = "set_locked"
}
/**
 * Real-time update event
 */
interface UpdateEvent {
    type: UpdateType;
    data: any;
    timestamp: Date;
    blockNumber?: number;
    transactionHash?: string;
}
/**
 * API authentication configuration
 */
interface AuthConfig {
    apiKey?: string;
    baseUrl?: string;
    customHeaders?: Record<string, string>;
}

/**
 * Provider types for different data sources
 */
declare enum ProviderType {
    WEB3_DIRECT = "web3_direct",
    INDEXING_SERVICE = "indexing_service",
    SUBGRAPH = "subgraph",
    REST_API = "rest_api",
    GRAPHQL_API = "graphql_api"
}
/**
 * Base provider interface that all data providers must implement
 */
interface BaseProvider {
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
    getCardsByWallet(wallet: string, filters?: Filter[], sort?: SortConfig[], pagination?: PaginationConfig): Promise<QueryResult<Card>>;
    /**
     * Get a specific card by token ID and contract
     */
    getCard(contractAddress: string, tokenId: string): Promise<Card | null>;
    /**
     * Get cards by contract address
     */
    getCardsByContract(contractAddress: string, filters?: Filter[], sort?: SortConfig[], pagination?: PaginationConfig): Promise<QueryResult<Card>>;
    /**
     * Get cards by set ID
     */
    getCardsBySet(setId: string, filters?: Filter[], sort?: SortConfig[], pagination?: PaginationConfig): Promise<QueryResult<Card>>;
    /**
     * Search cards with flexible filters
     */
    searchCards(filters: Filter[], sort?: SortConfig[], pagination?: PaginationConfig): Promise<QueryResult<Card>>;
}
/**
 * Provider that supports real-time updates
 */
interface RealtimeProvider extends BaseProvider {
    /**
     * Subscribe to real-time updates
     */
    subscribe(events: string[], callback: (event: UpdateEvent) => void, filters?: Filter[]): Promise<string>;
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
interface Web3ProviderConfig {
    type: ProviderType.WEB3_DIRECT;
    networkConfig: NetworkConfig;
    contractAddresses: string[];
    rpcUrl?: string;
    provider?: any;
}
/**
 * Indexing service provider configuration
 */
interface IndexingProviderConfig {
    type: ProviderType.INDEXING_SERVICE;
    baseUrl: string;
    apiKey?: string;
    chainId: number;
    customHeaders?: Record<string, string>;
}
/**
 * Subgraph provider configuration
 */
interface SubgraphProviderConfig {
    type: ProviderType.SUBGRAPH;
    subgraphUrl: string;
    apiKey?: string;
    chainId: number;
    customHeaders?: Record<string, string>;
}
/**
 * REST API provider configuration
 */
interface RestApiProviderConfig {
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
interface GraphqlProviderConfig {
    type: ProviderType.GRAPHQL_API;
    endpoint: string;
    apiKey?: string;
    customHeaders?: Record<string, string>;
    subscriptionEndpoint?: string;
}
/**
 * Union type for all provider configurations
 */
type ProviderConfig = Web3ProviderConfig | IndexingProviderConfig | SubgraphProviderConfig | RestApiProviderConfig | GraphqlProviderConfig;
/**
 * Real-time connection types
 */
declare enum RealtimeConnectionType {
    WEBSOCKET = "websocket",
    SERVER_SENT_EVENTS = "sse",
    POLLING = "polling"
}
/**
 * Real-time configuration
 */
interface RealtimeConfig {
    connectionType: RealtimeConnectionType;
    endpoint?: string;
    pollingInterval?: number;
    reconnectAttempts?: number;
    reconnectDelay?: number;
    customHeaders?: Record<string, string>;
}
/**
 * Provider factory interface
 */
interface ProviderFactory {
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
interface MultiProvider extends BaseProvider {
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
interface ProviderHealth {
    isHealthy: boolean;
    latency?: number;
    lastChecked: Date;
    errorCount: number;
    uptime?: number;
}
/**
 * Provider with health monitoring
 */
interface MonitoredProvider extends BaseProvider {
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
interface CacheConfig {
    enabled: boolean;
    ttl?: number;
    maxSize?: number;
    strategy?: "lru" | "fifo" | "lfu";
}
/**
 * Cached provider interface
 */
interface CachedProvider extends BaseProvider {
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

/**
 * Metadata calculation function type
 */
type MetadataCalculatorFunction<T = any> = (cards: Card[]) => T;
/**
 * Aggregation operations for metadata calculations
 */
declare enum AggregationType {
    SUM = "sum",
    AVERAGE = "average",
    COUNT = "count",
    MIN = "min",
    MAX = "max",
    MEDIAN = "median",
    MODE = "mode",
    UNIQUE_COUNT = "unique_count",
    GROUP_BY = "group_by",
    CUSTOM = "custom"
}
/**
 * Base metadata rule configuration
 */
interface MetadataRule {
    id: string;
    name: string;
    description?: string;
    enabled: boolean;
    field: string;
    aggregation: AggregationType;
    conditions?: MetadataCondition[];
    output: {
        key: string;
        type: "number" | "string" | "boolean" | "object" | "array";
        format?: string;
    };
    customCalculator?: MetadataCalculatorFunction;
}
/**
 * Condition for filtering cards before calculation
 */
interface MetadataCondition {
    field: string;
    operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "nin" | "contains" | "regex";
    value: any;
    logicalOperator?: "and" | "or";
}
/**
 * Distribution calculation configuration
 */
interface DistributionRule extends Omit<MetadataRule, "aggregation"> {
    aggregation: AggregationType.GROUP_BY;
    distributionConfig: {
        groupByField: string;
        valueField?: string;
        includePercentages?: boolean;
        sortBy?: "key" | "value" | "count";
        sortDirection?: "asc" | "desc";
        topN?: number;
    };
}
/**
 * Custom metric configuration
 */
interface CustomMetricRule extends Omit<MetadataRule, "aggregation" | "field"> {
    aggregation: AggregationType.CUSTOM;
    customCalculator: MetadataCalculatorFunction;
    dependencies?: string[];
}
/**
 * Power level calculation configuration
 */
interface PowerLevelRule extends Omit<MetadataRule, "aggregation"> {
    powerLevelConfig: {
        baseFields: {
            cost?: {
                weight: number;
                field: string;
            };
            power?: {
                weight: number;
                field: string;
            };
            toughness?: {
                weight: number;
                field: string;
            };
            rarity?: {
                weight: number;
                field: string;
                rarityValues: Record<string, number>;
            };
        };
        modifiers?: {
            keywords?: {
                weight: number;
                keywordValues: Record<string, number>;
            };
            abilities?: {
                weight: number;
                abilityValues: Record<string, number>;
            };
            synergies?: {
                weight: number;
                synergyCalculator: MetadataCalculatorFunction;
            };
        };
        normalizationFactor?: number;
        maxPowerLevel?: number;
    };
}
/**
 * Complete metadata configuration
 */
interface MetadataConfig {
    version: string;
    builtinRules: {
        totalCards: boolean;
        totalCost: boolean;
        averageCost: boolean;
        rarityDistribution: boolean;
        typeDistribution: boolean;
        colorDistribution: boolean;
        setDistribution: boolean;
        averagePower: boolean;
        averageToughness: boolean;
    };
    customRules: MetadataRule[];
    distributionRules: DistributionRule[];
    powerLevelRules: PowerLevelRule[];
    customMetrics: CustomMetricRule[];
    settings: {
        includeEmptyValues: boolean;
        roundingPrecision: number;
        cacheResults: boolean;
        cacheTtl: number;
    };
}
/**
 * Metadata calculation result
 */
interface MetadataCalculationResult {
    metadata: CollectionMetadata;
    calculationTime: number;
    rulesApplied: string[];
    errors?: string[];
    warnings?: string[];
}
/**
 * Metadata calculator interface
 */
interface MetadataCalculatorInterface {
    /**
     * Calculate metadata for a collection of cards
     */
    calculate(cards: Card[], config?: Partial<MetadataConfig>): Promise<MetadataCalculationResult>;
    /**
     * Calculate metadata with a specific rule
     */
    calculateWithRule(cards: Card[], rule: MetadataRule): Promise<any>;
    /**
     * Validate a metadata configuration
     */
    validateConfig(config: MetadataConfig): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Get available built-in calculators
     */
    getBuiltinCalculators(): Record<string, MetadataCalculatorFunction>;
    /**
     * Register a custom calculator
     */
    registerCustomCalculator(id: string, calculator: MetadataCalculatorFunction): void;
    /**
     * Get the current configuration
     */
    getConfig(): MetadataConfig;
    /**
     * Update the configuration
     */
    updateConfig(config: Partial<MetadataConfig>): void;
}
/**
 * Predefined metadata templates for common use cases
 */
interface MetadataTemplate {
    id: string;
    name: string;
    description: string;
    config: MetadataConfig;
    tags: string[];
}
/**
 * Metadata template manager interface
 */
interface MetadataTemplateManager {
    /**
     * Get all available templates
     */
    getTemplates(): MetadataTemplate[];
    /**
     * Get a template by ID
     */
    getTemplate(id: string): MetadataTemplate | null;
    /**
     * Create a new template
     */
    createTemplate(template: Omit<MetadataTemplate, "id">): string;
    /**
     * Update an existing template
     */
    updateTemplate(id: string, template: Partial<MetadataTemplate>): boolean;
    /**
     * Delete a template
     */
    deleteTemplate(id: string): boolean;
    /**
     * Search templates by tags or name
     */
    searchTemplates(query: string, tags?: string[]): MetadataTemplate[];
}
/**
 * Built-in metadata templates
 */
declare const BuiltinTemplates: {
    readonly BASIC: "basic";
    readonly COMPETITIVE: "competitive";
    readonly COLLECTOR: "collector";
    readonly CASUAL: "casual";
    readonly LIMITED: "limited";
};
/**
 * Metadata cache interface
 */
interface MetadataCache {
    /**
     * Get cached metadata
     */
    get(key: string): CollectionMetadata | null;
    /**
     * Set cached metadata
     */
    set(key: string, metadata: CollectionMetadata, ttl?: number): void;
    /**
     * Clear cache
     */
    clear(): void;
    /**
     * Generate cache key for a collection
     */
    generateKey(cards: Card[], configHash: string): string;
}

/**
 * Main SDK configuration
 */
interface TCGProtocolConfig {
    providers: ProviderConfig[];
    defaultProvider?: string;
    realtime?: RealtimeConfig;
    metadata?: Partial<MetadataConfig>;
    auth?: AuthConfig;
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
interface CardQuery {
    filters?: Filter[];
    sort?: SortConfig[];
    pagination?: PaginationConfig;
    includeMetadata?: boolean;
    fields?: {
        include?: string[];
        exclude?: string[];
    };
}
/**
 * Collection management interface
 */
interface CollectionManager {
    /**
     * Create a new collection
     */
    createCollection(name: string, cards: Card[], options?: {
        description?: string;
        tags?: string[];
        generateMetadata?: boolean;
        metadataConfig?: Partial<MetadataConfig>;
    }): Promise<Collection>;
    /**
     * Update an existing collection
     */
    updateCollection(collection: Collection, updates: Partial<Pick<Collection, "name" | "description" | "cards" | "tags">>): Promise<Collection>;
    /**
     * Generate metadata for a collection
     */
    generateMetadata(cards: Card[], config?: Partial<MetadataConfig>): Promise<MetadataCalculationResult>;
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
    exportCollection(collection: Collection, format: "json" | "csv" | "txt" | "mtga" | "mtgo"): Promise<string>;
    /**
     * Import collection from various formats
     */
    importCollection(data: string, format: "json" | "csv" | "txt" | "mtga" | "mtgo"): Promise<Collection>;
}
/**
 * Card search and filtering interface
 */
interface CardSearcher {
    /**
     * Search cards with a query
     */
    search(query: CardQuery): Promise<QueryResult<Card>>;
    /**
     * Get cards owned by a wallet
     */
    getCardsByWallet(wallet: string, query?: CardQuery): Promise<QueryResult<Card>>;
    /**
     * Get a specific card
     */
    getCard(contractAddress: string, tokenId: string): Promise<Card | null>;
    /**
     * Get cards by contract
     */
    getCardsByContract(contractAddress: string, query?: CardQuery): Promise<QueryResult<Card>>;
    /**
     * Get cards by set
     */
    getCardsBySet(setId: string, query?: CardQuery): Promise<QueryResult<Card>>;
    /**
     * Advanced search with multiple criteria
     */
    advancedSearch(criteria: {
        text?: string;
        filters?: Filter[];
        sort?: SortConfig[];
        pagination?: PaginationConfig;
    }): Promise<QueryResult<Card>>;
    /**
     * Get available filter fields and their types
     */
    getFilterableFields(): Promise<Record<string, {
        type: "string" | "number" | "boolean" | "date" | "enum";
        enum?: string[];
        description?: string;
    }>>;
}
/**
 * Real-time updates interface
 */
interface RealtimeManagerInterface {
    /**
     * Subscribe to card updates for a wallet
     */
    subscribeToWallet(wallet: string, callback: (event: UpdateEvent) => void, filters?: Filter[]): Promise<string>;
    /**
     * Subscribe to updates for specific contracts
     */
    subscribeToContracts(contractAddresses: string[], callback: (event: UpdateEvent) => void, filters?: Filter[]): Promise<string>;
    /**
     * Subscribe to set updates
     */
    subscribeToSets(setIds: string[], callback: (event: UpdateEvent) => void): Promise<string>;
    /**
     * Subscribe to all updates with filters
     */
    subscribe(events: string[], callback: (event: UpdateEvent) => void, filters?: Filter[]): Promise<string>;
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
interface TCGProtocol {
    readonly cards: CardSearcher;
    readonly collections: CollectionManager;
    readonly metadata: MetadataCalculatorInterface;
    readonly realtime: RealtimeManagerInterface;
    readonly templates: MetadataTemplateManager;
    readonly providers: {
        getActiveProvider(): BaseProvider;
        getProvider(type: string): BaseProvider | null;
        addProvider(config: ProviderConfig): Promise<BaseProvider>;
        removeProvider(type: string): Promise<void>;
        setDefaultProvider(type: string): void;
    };
    getConfig(): TCGProtocolConfig;
    updateConfig(config: Partial<TCGProtocolConfig>): Promise<void>;
    initialize(): Promise<void>;
    disconnect(): Promise<void>;
    getHealth(): Promise<{
        isHealthy: boolean;
        providers: Record<string, boolean>;
        lastCheck: Date;
    }>;
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
interface TCGProtocolFactory {
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
interface TCGProtocolPlugin {
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
interface PluginManager {
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
interface EventSystem {
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
declare const SDKEvents: {
    readonly INITIALIZED: "initialized";
    readonly PROVIDER_ADDED: "provider_added";
    readonly PROVIDER_REMOVED: "provider_removed";
    readonly PROVIDER_ERROR: "provider_error";
    readonly CONFIG_UPDATED: "config_updated";
    readonly REALTIME_CONNECTED: "realtime_connected";
    readonly REALTIME_DISCONNECTED: "realtime_disconnected";
    readonly CACHE_CLEARED: "cache_cleared";
    readonly ERROR: "error";
};

/**
 * Unified API interface that abstracts REST and GraphQL communication
 */
interface UnifiedAPI {
    /**
     * Execute a query (works for both REST and GraphQL)
     */
    query<T = any>(operation: APIOperation): Promise<APIResponse<T>>;
    /**
     * Execute multiple queries in batch
     */
    batchQuery<T = any>(operations: APIOperation[]): Promise<APIResponse<T>[]>;
    /**
     * Subscribe to real-time updates
     */
    subscribe?(operation: APIOperation, callback: (data: any) => void): Promise<string>;
    /**
     * Unsubscribe from updates
     */
    unsubscribe?(subscriptionId: string): Promise<void>;
    /**
     * Check if the API is connected
     */
    isConnected(): boolean;
    /**
     * Get API health status
     */
    getHealth(): Promise<{
        status: "healthy" | "unhealthy";
        latency?: number;
    }>;
}
/**
 * API operation configuration
 */
interface APIOperation {
    type: "query" | "mutation" | "subscription";
    name: string;
    params?: Record<string, any>;
    restConfig?: {
        method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
        endpoint: string;
        headers?: Record<string, string>;
    };
    graphqlConfig?: {
        query: string;
        variables?: Record<string, any>;
        operationName?: string;
    };
    transform?: (data: any) => any;
}
/**
 * Unified API response
 */
interface APIResponse<T = any> {
    data: T;
    success: boolean;
    error?: string;
    metadata?: {
        requestId?: string;
        timestamp: Date;
        latency: number;
    };
}
/**
 * REST API implementation
 */
declare class RestAPI implements UnifiedAPI {
    private client;
    constructor(_config: RestApiProviderConfig);
    query<T = any>(operation: APIOperation): Promise<APIResponse<T>>;
    batchQuery<T = any>(operations: APIOperation[]): Promise<APIResponse<T>[]>;
    isConnected(): boolean;
    getHealth(): Promise<{
        status: "healthy" | "unhealthy";
        latency?: number;
    }>;
}
/**
 * GraphQL API implementation
 */
declare class GraphQLAPI implements UnifiedAPI {
    private config;
    private client;
    private wsConnection?;
    private subscriptions;
    constructor(config: GraphqlProviderConfig);
    query<T = any>(operation: APIOperation): Promise<APIResponse<T>>;
    batchQuery<T = any>(operations: APIOperation[]): Promise<APIResponse<T>[]>;
    subscribe(operation: APIOperation, callback: (data: any) => void): Promise<string>;
    unsubscribe(subscriptionId: string): Promise<void>;
    private initializeWebSocket;
    isConnected(): boolean;
    getHealth(): Promise<{
        status: "healthy" | "unhealthy";
        latency?: number;
    }>;
}
/**
 * Factory for creating unified API instances
 */
declare class UnifiedAPIFactory {
    static createRestAPI(config: RestApiProviderConfig): UnifiedAPI;
    static createGraphQLAPI(config: GraphqlProviderConfig): UnifiedAPI;
    static create(config: RestApiProviderConfig | GraphqlProviderConfig): UnifiedAPI;
}

/**
 * Supported networks configuration
 */
declare const SUPPORTED_NETWORKS: Record<number, NetworkConfig>;
/**
 * Web3 provider for direct blockchain interaction
 */
declare class Web3Provider implements BaseProvider {
    readonly type = ProviderType.WEB3_DIRECT;
    private config;
    private provider;
    private contracts;
    private _isConnected;
    constructor(config: Web3ProviderConfig);
    get isConnected(): boolean;
    initialize(): Promise<void>;
    disconnect(): Promise<void>;
    getCardsByWallet(wallet: string, filters?: Filter[], sort?: SortConfig[], pagination?: PaginationConfig): Promise<QueryResult<Card>>;
    getCard(contractAddress: string, tokenId: string): Promise<Card | null>;
    getCardsByContract(contractAddress: string, filters?: Filter[], sort?: SortConfig[], pagination?: PaginationConfig): Promise<QueryResult<Card>>;
    getCardsBySet(setId: string, filters?: Filter[], sort?: SortConfig[], pagination?: PaginationConfig): Promise<QueryResult<Card>>;
    searchCards(filters: Filter[], sort?: SortConfig[], pagination?: PaginationConfig): Promise<QueryResult<Card>>;
    private getCardFromContract;
    private parseRarity;
    private parseCardType;
    private processQueryResult;
    private applyFilters;
    private evaluateFilter;
    private applySorting;
    private getNestedValue;
}
/**
 * Factory for creating Web3 providers for different networks
 */
declare class Web3ProviderFactory {
    static createPolygonProvider(contractAddresses: string[], rpcUrl?: string, isTestnet?: boolean): Web3Provider;
    static createEthereumProvider(contractAddresses: string[], rpcUrl?: string): Web3Provider;
    static createCustomProvider(networkConfig: NetworkConfig, contractAddresses: string[], rpcUrl?: string, provider?: any): Web3Provider;
    static getSupportedNetworks(): Record<number, NetworkConfig>;
    static addNetwork(chainId: number, config: NetworkConfig): void;
}

/**
 * Type for filter function
 */
type FilterFunction<T = any> = (item: T, value: any, context?: FilterContext) => boolean;
/**
 * Type for sort comparison function
 */
type SortFunction<T = any> = (a: T, b: T, direction: SortDirection) => number;
/**
 * Filter context for advanced filtering
 */
interface FilterContext {
    allItems?: any[];
    currentIndex?: number;
    metadata?: Record<string, any>;
}
/**
 * Custom filter registration
 */
interface CustomFilter {
    operator: string;
    handler: FilterFunction;
    description?: string;
    supportedTypes?: ("string" | "number" | "boolean" | "date" | "array" | "object" | "enum")[];
}
/**
 * Custom sort registration
 */
interface CustomSort {
    field: string;
    handler: SortFunction;
    description?: string;
}
/**
 * Field type information for better filtering
 */
interface FieldInfo {
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
interface FilterPreset {
    id: string;
    name: string;
    description: string;
    filters: Filter[];
    tags?: string[];
}
/**
 * Advanced filter engine with extensible filtering and sorting capabilities
 */
declare class FilterEngine<T = any> {
    private customFilters;
    private customSorters;
    private fieldRegistry;
    private presets;
    constructor();
    /**
     * Apply filters to a dataset
     */
    applyFilters(items: T[], filters: Filter[], context?: FilterContext): T[];
    /**
     * Apply sorting to a dataset
     */
    applySorting(items: T[], sortConfigs: SortConfig[]): T[];
    /**
     * Register a custom filter operator
     */
    registerFilter(operator: string, handler: FilterFunction, options?: {
        description?: string;
        supportedTypes?: ("string" | "number" | "boolean" | "date" | "array" | "object")[];
    }): void;
    /**
     * Register a custom sort function for a field
     */
    registerSort(field: string, handler: SortFunction, description?: string): void;
    /**
     * Register field information for better filtering
     */
    registerField(fieldPath: string, info: FieldInfo): void;
    /**
     * Register a filter preset
     */
    registerPreset(preset: FilterPreset): void;
    /**
     * Get available filter operators
     */
    getAvailableOperators(): Record<string, CustomFilter>;
    /**
     * Get field registry
     */
    getFieldRegistry(): Record<string, FieldInfo>;
    /**
     * Get available presets
     */
    getPresets(): Record<string, FilterPreset>;
    /**
     * Apply a filter preset
     */
    applyPreset(items: T[], presetId: string, context?: FilterContext): T[];
    /**
     * Validate a filter against field registry
     */
    validateFilter(filter: Filter): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Build a filter query from a search string (for user-friendly filtering)
     */
    buildFiltersFromSearch(searchString: string, searchableFields: string[]): Filter[];
    /**
     * Evaluate a group of filters with logical operators
     */
    private evaluateFilterGroup;
    /**
     * Evaluate a single filter
     */
    private evaluateFilter;
    /**
     * Compare two items for sorting
     */
    private compareItems;
    /**
     * Get nested value from object using dot notation
     */
    private getNestedValue;
    /**
     * Register built-in filter operators
     */
    private registerBuiltinFilters;
    /**
     * Register built-in sort functions
     */
    private registerBuiltinSorters;
    /**
     * Register field information for Card type
     */
    private registerCardFields;
}
/**
 * Pre-built filter presets for common use cases
 */
declare const BUILTIN_PRESETS: FilterPreset[];
declare const cardFilterEngine: FilterEngine<Card>;

/**
 * Main TCG Protocol SDK implementation
 */
declare class TCGProtocolImpl extends EventEmitter implements TCGProtocol {
    private config;
    private providerMap;
    private defaultProvider?;
    readonly cards: CardSearcher;
    readonly collections: CollectionManager;
    readonly metadata: MetadataCalculatorInterface;
    readonly realtime: RealtimeManagerInterface;
    readonly templates: MetadataTemplateManager;
    readonly providerManager: {
        getActiveProvider: () => BaseProvider;
        getProvider: (type: string) => BaseProvider | null;
        addProvider: (config: ProviderConfig) => Promise<BaseProvider>;
        removeProvider: (type: string) => Promise<void>;
        setDefaultProvider: (type: string) => void;
    };
    readonly utils: {
        validateWallet: (address: string) => boolean;
        formatCard: (card: Card, format?: "short" | "detailed") => string;
        generateCollectionHash: (cards: Card[]) => string;
        parseImportData: (_data: string, _format: string) => Promise<Card[]>;
        getSupportedNetworks: () => Record<number, string>;
    };
    constructor(config: TCGProtocolConfig);
    /**
     * Initialize the SDK
     */
    initialize(): Promise<void>;
    /**
     * Get current configuration
     */
    getConfig(): TCGProtocolConfig;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<TCGProtocolConfig>): Promise<void>;
    /**
     * Disconnect and cleanup
     */
    disconnect(): Promise<void>;
    /**
     * Get health status
     */
    getHealth(): Promise<{
        isHealthy: boolean;
        providers: Record<string, boolean>;
        lastCheck: Date;
    }>;
    /**
     * Create a provider instance
     */
    private createProvider;
    get providers(): {
        getActiveProvider: () => BaseProvider;
        getProvider: (type: string) => BaseProvider | null;
        addProvider: (config: ProviderConfig) => Promise<BaseProvider>;
        removeProvider: (type: string) => Promise<void>;
        setDefaultProvider: (type: string) => void;
    };
}

/**
 * Metadata calculator implementation
 */
declare class MetadataCalculator implements MetadataCalculatorInterface {
    private config;
    private customCalculators;
    private cache;
    constructor(config?: Partial<MetadataConfig>);
    /**
     * Calculate metadata for a collection of cards
     */
    calculate(cards: Card[], config?: Partial<MetadataConfig>): Promise<MetadataCalculationResult>;
    /**
     * Calculate metadata with a specific rule
     */
    calculateWithRule(cards: Card[], rule: MetadataRule): Promise<any>;
    /**
     * Validate a metadata configuration
     */
    validateConfig(config: MetadataConfig): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Get available built-in calculators
     */
    getBuiltinCalculators(): Record<string, MetadataCalculatorFunction>;
    /**
     * Register a custom calculator
     */
    registerCustomCalculator(id: string, calculator: MetadataCalculatorFunction): void;
    /**
     * Get the current configuration
     */
    getConfig(): MetadataConfig;
    /**
     * Update the configuration
     */
    updateConfig(config: Partial<MetadataConfig>): void;
    private calculateTotalCards;
    private calculateTotalCost;
    private calculateAverageCost;
    private calculateRarityDistribution;
    private calculateTypeDistribution;
    private calculateColorDistribution;
    private calculateSetDistribution;
    private calculateAveragePower;
    private calculateAverageToughness;
    private calculatePowerLevel;
    private applyConditions;
    private sum;
    private average;
    private min;
    private max;
    private median;
    private mode;
    private uniqueCount;
    private getNestedValue;
    private roundMetadata;
    private generateCacheKey;
    private getCachedResult;
    private setCachedResult;
    private registerBuiltinCalculators;
}

/**
 * Simple template manager implementation
 */
declare class TemplateManager implements MetadataTemplateManager {
    private templates;
    constructor();
    getTemplates(): MetadataTemplate[];
    getTemplate(id: string): MetadataTemplate | null;
    createTemplate(template: Omit<MetadataTemplate, "id">): string;
    updateTemplate(id: string, template: Partial<MetadataTemplate>): boolean;
    deleteTemplate(id: string): boolean;
    searchTemplates(query: string, tags?: string[]): MetadataTemplate[];
    private registerBuiltinTemplates;
}

/**
 * Simple collection manager implementation
 */
declare class SimpleCollectionManager implements CollectionManager {
    private metadataCalculator;
    constructor(metadataCalculator: MetadataCalculatorInterface);
    createCollection(name: string, cards: Card[], options?: {
        description?: string;
        tags?: string[];
        generateMetadata?: boolean;
        metadataConfig?: Partial<MetadataConfig>;
    }): Promise<Collection>;
    updateCollection(collection: Collection, updates: Partial<Pick<Collection, "name" | "description" | "cards" | "tags">>): Promise<Collection>;
    generateMetadata(cards: Card[], config?: Partial<MetadataConfig>): Promise<MetadataCalculationResult>;
    validateCollection(collection: Collection): Promise<{
        isValid: boolean;
        errors: string[];
        warnings: string[];
    }>;
    exportCollection(collection: Collection, format: "json" | "csv" | "txt" | "mtga" | "mtgo"): Promise<string>;
    importCollection(data: string, format: "json" | "csv" | "txt" | "mtga" | "mtgo"): Promise<Collection>;
    private exportToText;
    private exportToCsv;
    private escapeCsv;
}

/**
 * Real-time manager implementation
 */
declare class RealtimeManager extends EventEmitter implements RealtimeManagerInterface {
    private config;
    private subscriptions;
    private connection?;
    private pollingInterval?;
    private status;
    private reconnectTimeout?;
    constructor(config: RealtimeConfig);
    /**
     * Initialize the real-time connection
     */
    initialize(): Promise<void>;
    /**
     * Subscribe to card updates for a wallet
     */
    subscribeToWallet(wallet: string, callback: (event: UpdateEvent) => void, filters?: Filter[]): Promise<string>;
    /**
     * Subscribe to updates for specific contracts
     */
    subscribeToContracts(contractAddresses: string[], callback: (event: UpdateEvent) => void, filters?: Filter[]): Promise<string>;
    /**
     * Subscribe to set updates
     */
    subscribeToSets(setIds: string[], callback: (event: UpdateEvent) => void): Promise<string>;
    /**
     * Subscribe to all updates with filters
     */
    subscribe(events: string[], callback: (event: UpdateEvent) => void, filters?: Filter[]): Promise<string>;
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
    /**
     * Initialize WebSocket connection
     */
    private initializeWebSocket;
    /**
     * Initialize Server-Sent Events connection
     */
    private initializeSSE;
    /**
     * Initialize polling mechanism
     */
    private initializePolling;
    /**
     * Handle WebSocket messages
     */
    private handleWebSocketMessage;
    /**
     * Handle incoming update events
     */
    private handleUpdateEvent;
    /**
     * Check if an event should be delivered to a subscription
     */
    private shouldDeliverEvent;
    /**
     * Apply filters to an event
     */
    private applyFiltersToEvent;
    /**
     * Send WebSocket message
     */
    private sendWebSocketMessage;
    /**
     * Attempt to reconnect
     */
    private attemptReconnect;
    /**
     * Generate unique subscription ID
     */
    private generateSubscriptionId;
    /**
     * Get nested value from object
     */
    private getNestedValue;
}
/**
 * Factory for creating real-time managers
 */
declare class RealtimeManagerFactory {
    static createWebSocketManager(endpoint: string, options?: {
        customHeaders?: Record<string, string>;
        reconnectAttempts?: number;
        reconnectDelay?: number;
    }): RealtimeManager;
    static createSSEManager(endpoint: string, options?: {
        customHeaders?: Record<string, string>;
        reconnectAttempts?: number;
        reconnectDelay?: number;
    }): RealtimeManager;
    static createPollingManager(endpoint: string, options?: {
        pollingInterval?: number;
        customHeaders?: Record<string, string>;
    }): RealtimeManager;
}

/**
 * Create a new TCG Protocol SDK instance
 */
declare function createTCGProtocol(config: TCGProtocolConfig): Promise<TCGProtocol>;

declare const VERSION = "0.1.0";

export { APIOperation, APIResponse, AggregationType, AuthConfig, BUILTIN_PRESETS, BaseProvider, BuiltinTemplates, CacheConfig, CachedProvider, Card, CardQuery, CardRarity, CardSearcher, CardType, Collection, CollectionManager, CollectionMetadata, CustomFilter, CustomMetricRule, CustomSort, DistributionRule, EventSystem, FieldInfo, Filter, FilterContext, FilterEngine, FilterFunction, FilterOperator, FilterPreset, GraphQLAPI, GraphqlProviderConfig, IndexingProviderConfig, LogicalOperator, MetadataCache, MetadataCalculationResult, MetadataCalculator, MetadataCalculatorFunction, MetadataCalculatorInterface, MetadataCondition, MetadataConfig, MetadataRule, MetadataTemplate, MetadataTemplateManager, MonitoredProvider, MultiProvider, NetworkConfig, PaginationConfig, PluginManager, PowerLevelRule, ProviderConfig, ProviderFactory, ProviderHealth, ProviderType, QueryResult, RealtimeConfig, RealtimeConnectionType, RealtimeManager, RealtimeManagerFactory, RealtimeManagerInterface, RealtimeProvider, RestAPI, RestApiProviderConfig, SDKEvents, SUPPORTED_NETWORKS, SimpleCollectionManager, SortConfig, SortDirection, SortFunction, SubgraphProviderConfig, TCGProtocol, TCGProtocolConfig, TCGProtocolFactory, TCGProtocolImpl, TCGProtocolPlugin, TemplateManager, UnifiedAPI, UnifiedAPIFactory, UpdateEvent, UpdateType, VERSION, Wallet, Web3Provider, Web3ProviderConfig, Web3ProviderFactory, cardFilterEngine, createTCGProtocol };
