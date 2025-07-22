import { EventEmitter } from "eventemitter3";
import {
  TCGProtocol,
  TCGProtocolConfig,
  CardSearcher,
  CollectionManager,
  RealtimeManagerInterface as IRealtimeManager,
  CardQuery,
  SDKEvents,
} from "../types/sdk.js";
import {
  Card,
  QueryResult,
  Filter,
  SortConfig,
  PaginationConfig,
} from "../types/core.js";
import {
  BaseProvider,
  ProviderConfig,
  ProviderType,
} from "../types/providers.js";
import {
  MetadataCalculatorInterface,
  MetadataTemplateManager,
} from "../types/metadata.js";

import { Web3Provider } from "../providers/web3-provider.js";
import { cardFilterEngine } from "../filters/filter-engine.js";
import { RealtimeManager } from "../realtime/realtime-manager.js";
import { MetadataCalculator } from "../metadata/metadata-calculator.js";
import { TemplateManager } from "../metadata/template-manager.js";
import { SimpleCollectionManager } from "../collections/collection-manager.js";

/**
 * Main TCG Protocol SDK implementation
 */
export class TCGProtocolImpl extends EventEmitter implements TCGProtocol {
  private config: TCGProtocolConfig;
  private providerMap = new Map<string, BaseProvider>();
  private defaultProvider?: BaseProvider;

  // Core managers
  readonly cards: CardSearcher;
  readonly collections: CollectionManager;
  readonly metadata: MetadataCalculatorInterface;
  readonly realtime: IRealtimeManager;
  readonly templates: MetadataTemplateManager;

  // Provider management
  readonly providerManager = {
    getActiveProvider: (): BaseProvider => {
      if (!this.defaultProvider) {
        throw new Error("No active provider available");
      }
      return this.defaultProvider;
    },

    getProvider: (type: string): BaseProvider | null => {
      return this.providerMap.get(type) || null;
    },

    addProvider: async (config: ProviderConfig): Promise<BaseProvider> => {
      const provider = await this.createProvider(config);
      await provider.initialize();
      this.providerMap.set(config.type, provider);
      this.emit(SDKEvents.PROVIDER_ADDED, { type: config.type });
      return provider;
    },

    removeProvider: async (type: string): Promise<void> => {
      const provider = this.providerMap.get(type);
      if (provider) {
        await provider.disconnect();
        this.providerMap.delete(type);

        // If this was the default provider, set a new one
        if (this.defaultProvider === provider) {
          const remainingProviders = Array.from(this.providerMap.values());
          this.defaultProvider = remainingProviders[0] || undefined;
        }

        this.emit(SDKEvents.PROVIDER_REMOVED, { type });
      }
    },

    setDefaultProvider: (type: string): void => {
      const provider = this.providerMap.get(type);
      if (!provider) {
        throw new Error(`Provider of type '${type}' not found`);
      }
      this.defaultProvider = provider;
    },
  };

  // Utilities
  readonly utils = {
    validateWallet: (address: string): boolean => {
      // Basic Ethereum address validation
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    },

    formatCard: (
      card: Card,
      format: "short" | "detailed" = "short"
    ): string => {
      if (format === "short") {
        return `${card.name} (${card.rarity})`;
      }

      return `${card.name}
Type: ${card.type}
Rarity: ${card.rarity}
Cost: ${card.cost || "N/A"}
Power/Toughness: ${card.power || "N/A"}/${card.toughness || "N/A"}
Set: ${card.setName}
Owner: ${card.owner}`;
    },

    generateCollectionHash: (cards: Card[]): string => {
      const cardIds = cards
        .map((card) => `${card.contractAddress}:${card.tokenId}`)
        .sort()
        .join(",");

      // Simple hash function
      let hash = 0;
      for (let i = 0; i < cardIds.length; i++) {
        const char = cardIds.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
      }

      return Math.abs(hash).toString(16);
    },

    parseImportData: async (
      _data: string,
      _format: string
    ): Promise<Card[]> => {
      // This would be implemented based on the specific format
      throw new Error("Import functionality not yet implemented");
    },

    getSupportedNetworks: (): Record<number, string> => {
      return {
        1: "Ethereum",
        137: "Polygon",
        80001: "Polygon Mumbai",
      };
    },
  };

  constructor(config: TCGProtocolConfig) {
    super();
    this.config = config;

    // Initialize managers
    this.metadata = new MetadataCalculator();
    this.templates = new TemplateManager();
    this.realtime = new RealtimeManager(
      config.realtime || {
        connectionType: "polling" as any,
        pollingInterval: 10000,
      }
    );
    this.collections = new SimpleCollectionManager(this.metadata);
    this.cards = new CardSearcherImpl(this);
  }

  /**
   * Initialize the SDK
   */
  async initialize(): Promise<void> {
    try {
      // Initialize providers
      for (const providerConfig of this.config.providers) {
        const provider = await this.createProvider(providerConfig);
        await provider.initialize();
        this.providerMap.set(providerConfig.type, provider);
      }

      // Set default provider
      if (this.config.defaultProvider) {
        this.defaultProvider = this.providerMap.get(
          this.config.defaultProvider
        );
      } else if (this.providerMap.size > 0) {
        this.defaultProvider = Array.from(this.providerMap.values())[0];
      }

      if (!this.defaultProvider) {
        throw new Error("No providers available after initialization");
      }

      this.emit(SDKEvents.INITIALIZED);
    } catch (error) {
      this.emit(SDKEvents.ERROR, error);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): TCGProtocolConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<TCGProtocolConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    this.emit(SDKEvents.CONFIG_UPDATED, this.config);
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    // Disconnect all providers
    for (const provider of this.providerMap.values()) {
      await provider.disconnect();
    }

    // Disconnect real-time
    await this.realtime.disconnect();

    this.providerMap.clear();
    this.defaultProvider = undefined;
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<{
    isHealthy: boolean;
    providers: Record<string, boolean>;
    lastCheck: Date;
  }> {
    const providers: Record<string, boolean> = {};
    let overallHealthy = true;

    for (const [type, provider] of this.providerMap) {
      const isHealthy = provider.isConnected;
      providers[type] = isHealthy;
      if (!isHealthy) {
        overallHealthy = false;
      }
    }

    return {
      isHealthy: overallHealthy,
      providers,
      lastCheck: new Date(),
    };
  }

  /**
   * Create a provider instance
   */
  private async createProvider(config: ProviderConfig): Promise<BaseProvider> {
    switch (config.type) {
      case ProviderType.WEB3_DIRECT:
        return new Web3Provider(config);

      case ProviderType.INDEXING_SERVICE:
      case ProviderType.SUBGRAPH:
      case ProviderType.REST_API:
      case ProviderType.GRAPHQL_API:
        throw new Error(`Provider type '${config.type}' not yet implemented`);

      default:
        throw new Error(`Unsupported provider type: ${(config as any).type}`);
    }
  }

  get providers() {
    return this.providerManager;
  }
}

/**
 * Card searcher implementation
 */
class CardSearcherImpl implements CardSearcher {
  constructor(private sdk: TCGProtocolImpl) {}

  async search(query: CardQuery): Promise<QueryResult<Card>> {
    const provider = this.sdk.providerManager.getActiveProvider();

    // Use search method if filters are provided, otherwise get all cards
    if (query.filters && query.filters.length > 0) {
      return provider.searchCards(query.filters, query.sort, query.pagination);
    } else {
      // This would need to be implemented based on the specific provider
      throw new Error("Search without filters not yet implemented");
    }
  }

  async getCardsByWallet(
    wallet: string,
    query?: CardQuery
  ): Promise<QueryResult<Card>> {
    const provider = this.sdk.providerManager.getActiveProvider();
    return provider.getCardsByWallet(
      wallet,
      query?.filters,
      query?.sort,
      query?.pagination
    );
  }

  async getCard(
    contractAddress: string,
    tokenId: string
  ): Promise<Card | null> {
    const provider = this.sdk.providerManager.getActiveProvider();
    return provider.getCard(contractAddress, tokenId);
  }

  async getCardsByContract(
    contractAddress: string,
    query?: CardQuery
  ): Promise<QueryResult<Card>> {
    const provider = this.sdk.providerManager.getActiveProvider();
    return provider.getCardsByContract(
      contractAddress,
      query?.filters,
      query?.sort,
      query?.pagination
    );
  }

  async getCardsBySet(
    setId: string,
    query?: CardQuery
  ): Promise<QueryResult<Card>> {
    const provider = this.sdk.providerManager.getActiveProvider();
    return provider.getCardsBySet(
      setId,
      query?.filters,
      query?.sort,
      query?.pagination
    );
  }

  async advancedSearch(criteria: {
    text?: string;
    filters?: Filter[];
    sort?: SortConfig[];
    pagination?: PaginationConfig;
  }): Promise<QueryResult<Card>> {
    let filters = criteria.filters || [];

    // Add text search filters if provided
    if (criteria.text) {
      const textFilters = cardFilterEngine.buildFiltersFromSearch(
        criteria.text,
        ["name", "description", "abilities"]
      );
      filters = [...filters, ...textFilters];
    }

    const provider = this.sdk.providerManager.getActiveProvider();
    return provider.searchCards(filters, criteria.sort, criteria.pagination);
  }

  async getFilterableFields(): Promise<
    Record<
      string,
      {
        type: "string" | "number" | "boolean" | "date" | "enum";
        enum?: string[];
        description?: string;
      }
    >
  > {
    const fieldRegistry = cardFilterEngine.getFieldRegistry();
    const result: Record<string, any> = {};

    for (const [field, info] of Object.entries(fieldRegistry)) {
      result[field] = {
        type: info.type,
        enum: info.enum,
        description: info.description,
      };
    }

    return result;
  }
}
