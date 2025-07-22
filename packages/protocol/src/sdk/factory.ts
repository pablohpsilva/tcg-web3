import {
  TCGProtocol,
  TCGProtocolConfig,
  TCGProtocolFactory as TCGProtocolFactoryInterface,
} from "../types/sdk.js";
import { TCGProtocolImpl } from "./tcg-protocol.js";
import { ProviderType, ProviderConfig } from "../types/providers.js";
import { SUPPORTED_NETWORKS } from "../providers/web3-provider.js";

/**
 * Default configuration for the SDK
 */
const DEFAULT_CONFIG: Partial<TCGProtocolConfig> = {
  settings: {
    enableCaching: true,
    cacheSize: 1000,
    cacheTtl: 300, // 5 minutes
    enableLogging: true,
    logLevel: "info",
    retryAttempts: 3,
    retryDelay: 1000,
    timeout: 30000, // 30 seconds
  },
};

/**
 * Main factory for creating TCG Protocol SDK instances
 */
export class TCGProtocolFactoryImpl implements TCGProtocolFactoryInterface {
  /**
   * Create a new SDK instance with the provided configuration
   */
  async create(config: TCGProtocolConfig): Promise<TCGProtocol> {
    // Validate configuration
    const validation = this.validateConfig(config);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(", ")}`);
    }

    // Merge with defaults
    const mergedConfig = this.mergeWithDefaults(config);

    // Create SDK instance
    const sdk = new TCGProtocolImpl(mergedConfig);

    // Initialize the SDK
    await sdk.initialize();

    return sdk;
  }

  /**
   * Create SDK with default configuration for quick setup
   */
  async createDefault(): Promise<TCGProtocol> {
    // Create a minimal configuration with Polygon testnet
    const defaultConfig: TCGProtocolConfig = {
      providers: [
        {
          type: ProviderType.WEB3_DIRECT,
          networkConfig: SUPPORTED_NETWORKS[80001], // Polygon Mumbai testnet
          contractAddresses: [], // Will need to be provided by user
        },
      ],
      defaultProvider: ProviderType.WEB3_DIRECT,
      ...DEFAULT_CONFIG,
    };

    return this.create(defaultConfig);
  }

  /**
   * Get available provider types
   */
  getAvailableProviders(): string[] {
    return Object.values(ProviderType);
  }

  /**
   * Validate configuration
   */
  validateConfig(config: TCGProtocolConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check if providers are configured
    if (!config.providers || config.providers.length === 0) {
      errors.push("At least one provider must be configured");
    }

    // Validate each provider configuration
    if (config.providers) {
      config.providers.forEach((provider, index) => {
        const providerErrors = this.validateProviderConfig(provider);
        if (providerErrors.length > 0) {
          errors.push(`Provider ${index}: ${providerErrors.join(", ")}`);
        }
      });
    }

    // Validate default provider
    if (config.defaultProvider) {
      const hasDefaultProvider = config.providers?.some(
        (p) => p.type === config.defaultProvider
      );
      if (!hasDefaultProvider) {
        errors.push("Default provider type not found in providers list");
      }
    }

    // Validate settings
    if (config.settings) {
      if (config.settings.cacheSize && config.settings.cacheSize <= 0) {
        errors.push("Cache size must be positive");
      }
      if (config.settings.cacheTtl && config.settings.cacheTtl <= 0) {
        errors.push("Cache TTL must be positive");
      }
      if (config.settings.retryAttempts && config.settings.retryAttempts < 0) {
        errors.push("Retry attempts must be non-negative");
      }
      if (config.settings.timeout && config.settings.timeout <= 0) {
        errors.push("Timeout must be positive");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate individual provider configuration
   */
  private validateProviderConfig(provider: ProviderConfig): string[] {
    const errors: string[] = [];

    switch (provider.type) {
      case ProviderType.WEB3_DIRECT:
        if (!provider.networkConfig) {
          errors.push("Network configuration is required for Web3 provider");
        }
        if (
          !provider.contractAddresses ||
          provider.contractAddresses.length === 0
        ) {
          errors.push("Contract addresses are required for Web3 provider");
        }
        break;

      case ProviderType.INDEXING_SERVICE:
        if (!provider.baseUrl) {
          errors.push("Base URL is required for indexing service provider");
        }
        if (!provider.chainId) {
          errors.push("Chain ID is required for indexing service provider");
        }
        break;

      case ProviderType.SUBGRAPH:
        if (!provider.subgraphUrl) {
          errors.push("Subgraph URL is required for subgraph provider");
        }
        if (!provider.chainId) {
          errors.push("Chain ID is required for subgraph provider");
        }
        break;

      case ProviderType.REST_API:
        if (!provider.baseUrl) {
          errors.push("Base URL is required for REST API provider");
        }
        break;

      case ProviderType.GRAPHQL_API:
        if (!provider.endpoint) {
          errors.push("Endpoint is required for GraphQL API provider");
        }
        break;

      default:
        errors.push(`Unsupported provider type: ${(provider as any).type}`);
    }

    return errors;
  }

  /**
   * Merge user configuration with defaults
   */
  private mergeWithDefaults(config: TCGProtocolConfig): TCGProtocolConfig {
    return {
      ...DEFAULT_CONFIG,
      ...config,
      settings: {
        ...DEFAULT_CONFIG.settings,
        ...config.settings,
      },
    };
  }
}

/**
 * Singleton factory instance
 */
const factoryInstance = new TCGProtocolFactoryImpl();

/**
 * Create a new TCG Protocol SDK instance
 */
export async function createTCGProtocol(
  config: TCGProtocolConfig
): Promise<TCGProtocol> {
  return factoryInstance.create(config);
}

/**
 * Create TCG Protocol SDK with default configuration
 */
export async function createDefaultTCGProtocol(): Promise<TCGProtocol> {
  return factoryInstance.createDefault();
}

/**
 * Quick setup functions for common scenarios
 */
export class QuickSetup {
  /**
   * Create SDK for Polygon mainnet
   */
  static async forPolygon(
    contractAddresses: string[],
    rpcUrl?: string
  ): Promise<TCGProtocol> {
    const config: TCGProtocolConfig = {
      providers: [
        {
          type: ProviderType.WEB3_DIRECT,
          networkConfig: SUPPORTED_NETWORKS[137], // Polygon mainnet
          contractAddresses,
          rpcUrl,
        },
      ],
      defaultProvider: ProviderType.WEB3_DIRECT,
    };

    return createTCGProtocol(config);
  }

  /**
   * Create SDK for Polygon testnet (Mumbai)
   */
  static async forPolygonTestnet(
    contractAddresses: string[],
    rpcUrl?: string
  ): Promise<TCGProtocol> {
    const config: TCGProtocolConfig = {
      providers: [
        {
          type: ProviderType.WEB3_DIRECT,
          networkConfig: SUPPORTED_NETWORKS[80001], // Polygon Mumbai
          contractAddresses,
          rpcUrl,
        },
      ],
      defaultProvider: ProviderType.WEB3_DIRECT,
    };

    return createTCGProtocol(config);
  }

  /**
   * Create SDK with multiple providers for redundancy
   */
  static async withMultipleProviders(configs: {
    web3?: { contractAddresses: string[]; chainId: number; rpcUrl?: string };
    indexing?: { baseUrl: string; apiKey?: string; chainId: number };
    subgraph?: { url: string; apiKey?: string; chainId: number };
  }): Promise<TCGProtocol> {
    const providers: ProviderConfig[] = [];

    if (configs.web3) {
      const networkConfig = SUPPORTED_NETWORKS[configs.web3.chainId];
      if (!networkConfig) {
        throw new Error(`Unsupported network: ${configs.web3.chainId}`);
      }

      providers.push({
        type: ProviderType.WEB3_DIRECT,
        networkConfig,
        contractAddresses: configs.web3.contractAddresses,
        rpcUrl: configs.web3.rpcUrl,
      });
    }

    if (configs.indexing) {
      providers.push({
        type: ProviderType.INDEXING_SERVICE,
        baseUrl: configs.indexing.baseUrl,
        apiKey: configs.indexing.apiKey,
        chainId: configs.indexing.chainId,
      });
    }

    if (configs.subgraph) {
      providers.push({
        type: ProviderType.SUBGRAPH,
        subgraphUrl: configs.subgraph.url,
        apiKey: configs.subgraph.apiKey,
        chainId: configs.subgraph.chainId,
      });
    }

    if (providers.length === 0) {
      throw new Error("At least one provider configuration must be provided");
    }

    const config: TCGProtocolConfig = {
      providers,
      defaultProvider: providers[0].type,
    };

    return createTCGProtocol(config);
  }

  /**
   * Create SDK with real-time capabilities
   */
  static async withRealtime(
    providerConfig: ProviderConfig,
    realtimeConfig: {
      type: "websocket" | "sse" | "polling";
      endpoint: string;
      options?: Record<string, any>;
    }
  ): Promise<TCGProtocol> {
    const config: TCGProtocolConfig = {
      providers: [providerConfig],
      defaultProvider: providerConfig.type,
      realtime: {
        connectionType: realtimeConfig.type as any,
        endpoint: realtimeConfig.endpoint,
        ...realtimeConfig.options,
      },
    };

    return createTCGProtocol(config);
  }
}

/**
 * Helper functions for configuration building
 */
export class ConfigBuilder {
  private config: Partial<TCGProtocolConfig> = {};

  /**
   * Add a Web3 provider
   */
  addWeb3Provider(
    chainId: number,
    contractAddresses: string[],
    rpcUrl?: string
  ): ConfigBuilder {
    const networkConfig = SUPPORTED_NETWORKS[chainId];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${chainId}`);
    }

    if (!this.config.providers) {
      this.config.providers = [];
    }

    this.config.providers.push({
      type: ProviderType.WEB3_DIRECT,
      networkConfig,
      contractAddresses,
      rpcUrl,
    });

    return this;
  }

  /**
   * Add a REST API provider
   */
  addRestProvider(baseUrl: string, apiKey?: string): ConfigBuilder {
    if (!this.config.providers) {
      this.config.providers = [];
    }

    this.config.providers.push({
      type: ProviderType.REST_API,
      baseUrl,
      apiKey,
    });

    return this;
  }

  /**
   * Add a GraphQL provider
   */
  addGraphQLProvider(endpoint: string, apiKey?: string): ConfigBuilder {
    if (!this.config.providers) {
      this.config.providers = [];
    }

    this.config.providers.push({
      type: ProviderType.GRAPHQL_API,
      endpoint,
      apiKey,
    });

    return this;
  }

  /**
   * Set the default provider
   */
  setDefaultProvider(type: ProviderType): ConfigBuilder {
    this.config.defaultProvider = type;
    return this;
  }

  /**
   * Configure real-time updates
   */
  enableRealtime(
    connectionType: "websocket" | "sse" | "polling",
    endpoint: string,
    options?: Record<string, any>
  ): ConfigBuilder {
    this.config.realtime = {
      connectionType: connectionType as any,
      endpoint,
      ...options,
    };

    return this;
  }

  /**
   * Configure settings
   */
  setSettings(settings: Partial<TCGProtocolConfig["settings"]>): ConfigBuilder {
    this.config.settings = {
      ...this.config.settings,
      ...settings,
    };

    return this;
  }

  /**
   * Build the configuration
   */
  build(): TCGProtocolConfig {
    if (!this.config.providers || this.config.providers.length === 0) {
      throw new Error("At least one provider must be configured");
    }

    return this.config as TCGProtocolConfig;
  }

  /**
   * Build and create SDK instance
   */
  async create(): Promise<TCGProtocol> {
    const config = this.build();
    return createTCGProtocol(config);
  }
}

/**
 * Create a new configuration builder
 */
export function createConfigBuilder(): ConfigBuilder {
  return new ConfigBuilder();
}

// Export factory instance for direct access
export { factoryInstance as TCGProtocolFactory };
