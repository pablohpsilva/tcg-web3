import { describe, it, expect, beforeEach, vi } from "vitest";
import { TCGProtocolFactoryImpl } from "../factory.js";
import type { TCGProtocolConfig } from "../../types/sdk.js";
import {
  ProviderType,
  type RealtimeConnectionType,
} from "../../types/providers.js";
import { NetworkConfig } from "../../types/core.js";

describe("TCGProtocolFactory", () => {
  let factory: TCGProtocolFactoryImpl;

  beforeEach(() => {
    factory = new TCGProtocolFactoryImpl();
  });

  describe("Configuration Validation", () => {
    it("should validate a complete configuration", () => {
      const networkConfig: NetworkConfig = {
        chainId: 137,
        name: "Polygon Mainnet",
        rpcUrl: "https://polygon-rpc.com",
        nativeCurrency: {
          name: "MATIC",
          symbol: "MATIC",
          decimals: 18,
        },
      };

      const config: TCGProtocolConfig = {
        providers: [
          {
            type: ProviderType.WEB3_DIRECT,
            networkConfig,
            contractAddresses: ["0x123"],
          },
        ],
      };

      const result = factory.validateConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should detect missing networks", () => {
      const config: TCGProtocolConfig = {
        providers: [],
      };

      const result = factory.validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "At least one provider must be configured"
      );
    });

    it("should detect invalid network configuration", () => {
      const invalidNetworkConfig = {
        chainId: 137,
        name: "Polygon Mainnet",
        rpcUrl: "invalid-url",
        nativeCurrency: {
          name: "MATIC",
          symbol: "MATIC",
          decimals: 18,
        },
      };

      const config: TCGProtocolConfig = {
        providers: [
          {
            type: ProviderType.WEB3_DIRECT,
            networkConfig: invalidNetworkConfig as NetworkConfig,
            contractAddresses: ["0x123"],
          },
        ],
      };

      const result = factory.validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should detect missing providers", () => {
      const config: TCGProtocolConfig = {
        providers: [],
      };

      const result = factory.validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "At least one provider must be configured"
      );
    });

    it("should validate API provider configurations", () => {
      const config: TCGProtocolConfig = {
        providers: [
          {
            type: ProviderType.REST_API,
            baseUrl: "https://api.example.com",
            apiKey: "test-key",
          },
        ],
      };

      const result = factory.validateConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("Configuration Merging", () => {
    it("should merge user config with defaults", () => {
      const networkConfig: NetworkConfig = {
        chainId: 137,
        name: "Polygon Mainnet",
        rpcUrl: "https://polygon-rpc.com",
        nativeCurrency: {
          name: "MATIC",
          symbol: "MATIC",
          decimals: 18,
        },
      };

      const userConfig: TCGProtocolConfig = {
        providers: [
          {
            type: ProviderType.WEB3_DIRECT,
            networkConfig,
            contractAddresses: ["0x123"],
          },
        ],
      };

      const merged = factory.mergeWithDefaults(userConfig);

      expect(merged.providers).toBeDefined();
      expect(merged.settings).toBeDefined();
    });

    it("should handle nested object merging", () => {
      const networkConfig: NetworkConfig = {
        chainId: 137,
        name: "Polygon Mainnet",
        rpcUrl: "https://polygon-rpc.com",
        nativeCurrency: {
          name: "MATIC",
          symbol: "MATIC",
          decimals: 18,
        },
      };

      const userConfig: TCGProtocolConfig = {
        providers: [
          {
            type: ProviderType.WEB3_DIRECT,
            networkConfig,
            contractAddresses: ["0x123"],
          },
        ],
        settings: {
          retryAttempts: 5,
        },
      };

      const merged = factory.mergeWithDefaults(userConfig);

      expect(merged.settings?.retryAttempts).toBe(5);
      expect(merged.settings?.retryDelay).toBeDefined(); // Should have default value
    });
  });

  describe("Quick Setup Functions", () => {
    it("should create Polygon mainnet configuration", () => {
      const config = factory.createPolygonMainnetConfig(
        ["0x123"],
        "test-api-key"
      );

      expect(config.providers).toBeDefined();
      expect(config.providers.length).toBeGreaterThan(0);
      expect(config.providers[0].type).toBe(ProviderType.WEB3_DIRECT);
    });

    it("should create Polygon testnet configuration", () => {
      const config = factory.createPolygonTestnetConfig(
        ["0x456"],
        "test-api-key"
      );

      expect(config.providers).toBeDefined();
      expect(config.providers.length).toBeGreaterThan(0);
      expect(config.providers[0].type).toBe(ProviderType.WEB3_DIRECT);
    });

    it("should create multi-provider configuration", () => {
      const networks: NetworkConfig[] = [
        {
          chainId: 137,
          name: "Polygon Mainnet",
          rpcUrl: "https://polygon-rpc.com",
          nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
        },
        {
          chainId: 1,
          name: "Ethereum Mainnet",
          rpcUrl: "https://eth-rpc.com",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        },
      ];

      const config = factory.createMultiProviderConfig(networks, {
        web3Contracts: ["0x123"],
        restApiUrl: "https://api.example.com",
        apiKey: "test-api-key",
      });

      expect(config.providers).toBeDefined();
      expect(config.providers.length).toBeGreaterThan(0);
    });

    it("should create real-time enabled configuration", () => {
      const networkConfig: NetworkConfig = {
        chainId: 137,
        name: "Polygon Mainnet",
        rpcUrl: "https://polygon-rpc.com",
        nativeCurrency: {
          name: "MATIC",
          symbol: "MATIC",
          decimals: 18,
        },
      };

      const baseConfig: TCGProtocolConfig = {
        providers: [
          {
            type: ProviderType.WEB3_DIRECT,
            networkConfig,
            contractAddresses: ["0x123"],
          },
        ],
      };

      const config = factory.enableRealtime(baseConfig, {
        connectionType: "websocket" as RealtimeConnectionType,
        wsEndpoint: "wss://api.example.com/ws",
        autoReconnect: true,
        heartbeatInterval: 30000,
      });

      expect(config.realtime).toBeDefined();
      expect(config.realtime?.connectionType).toBe("websocket");
    });
  });

  describe("SDK Creation", () => {
    it("should create SDK instance with valid configuration", async () => {
      const networkConfig: NetworkConfig = {
        chainId: 137,
        name: "Polygon Mainnet",
        rpcUrl: "https://polygon-rpc.com",
        nativeCurrency: {
          name: "MATIC",
          symbol: "MATIC",
          decimals: 18,
        },
      };

      const config: TCGProtocolConfig = {
        providers: [
          {
            type: ProviderType.WEB3_DIRECT,
            networkConfig,
            contractAddresses: ["0x123"],
          },
        ],
      };

      const sdk = await factory.createSDK(config, { skipInitialization: true });

      expect(sdk).toBeDefined();
    });

    it("should throw error for invalid configuration", async () => {
      const invalidConfig: TCGProtocolConfig = {
        providers: [],
      };

      await expect(
        factory.createSDK(invalidConfig, { skipInitialization: true })
      ).rejects.toThrow();
    });

    it("should initialize SDK with providers", async () => {
      const networkConfig: NetworkConfig = {
        chainId: 137,
        name: "Polygon Mainnet",
        rpcUrl: "https://polygon-rpc.com",
        nativeCurrency: {
          name: "MATIC",
          symbol: "MATIC",
          decimals: 18,
        },
      };

      const config: TCGProtocolConfig = {
        providers: [
          {
            type: ProviderType.WEB3_DIRECT,
            networkConfig,
            contractAddresses: ["0x123"],
          },
        ],
      };

      const sdk = await factory.createSDK(config, { skipInitialization: true });

      expect(sdk.providers.getProvider("web3")).toBeDefined();
    });
  });

  describe("Quick Create Methods", () => {
    it("should quickly create Polygon mainnet SDK", async () => {
      const sdk = await factory.createPolygonMainnet(
        ["0x123"],
        "test-api-key",
        { skipInitialization: true }
      );

      expect(sdk).toBeDefined();
    });

    it("should quickly create Polygon testnet SDK", async () => {
      const sdk = await factory.createPolygonTestnet(
        ["0x456"],
        "test-api-key",
        { skipInitialization: true }
      );

      expect(sdk).toBeDefined();
    });

    it("should quickly create multi-provider SDK", async () => {
      const networks: NetworkConfig[] = [
        {
          chainId: 137,
          name: "Polygon Mainnet",
          rpcUrl: "https://polygon-rpc.com",
          nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
        },
        {
          chainId: 1,
          name: "Ethereum Mainnet",
          rpcUrl: "https://eth-rpc.com",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        },
      ];

      const sdk = await factory.createMultiProvider(networks, {
        web3Contracts: ["0x123"],
        restApiUrl: "https://api.example.com",
        apiKey: "test-api-key",
        skipInitialization: true,
      });

      expect(sdk).toBeDefined();
    });

    it("should quickly create real-time enabled SDK", async () => {
      const networkConfig: NetworkConfig = {
        chainId: 137,
        name: "Polygon Mainnet",
        rpcUrl: "https://polygon-rpc.com",
        nativeCurrency: {
          name: "MATIC",
          symbol: "MATIC",
          decimals: 18,
        },
      };

      const baseConfig: TCGProtocolConfig = {
        providers: [
          {
            type: ProviderType.WEB3_DIRECT,
            networkConfig,
            contractAddresses: ["0x123"],
          },
        ],
      };

      const sdk = await factory.createWithRealtime(
        baseConfig,
        {
          connectionType: "websocket" as RealtimeConnectionType,
          wsEndpoint: "wss://api.example.com/ws",
          autoReconnect: true,
          heartbeatInterval: 30000,
        },
        { skipInitialization: true }
      );

      expect(sdk).toBeDefined();
      expect(sdk.realtime).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should provide helpful error messages for invalid URLs", () => {
      const networkConfig: NetworkConfig = {
        chainId: 137,
        name: "Polygon Mainnet",
        rpcUrl: "invalid-url",
        nativeCurrency: {
          name: "MATIC",
          symbol: "MATIC",
          decimals: 18,
        },
      };

      const config: TCGProtocolConfig = {
        providers: [
          {
            type: ProviderType.WEB3_DIRECT,
            networkConfig,
            contractAddresses: ["0x123"],
          },
        ],
      };

      const result = factory.validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.includes("URL"))).toBe(true);
    });

    it("should validate contract address formats", () => {
      const networkConfig: NetworkConfig = {
        chainId: 137,
        name: "Polygon Mainnet",
        rpcUrl: "https://polygon-rpc.com",
        nativeCurrency: {
          name: "MATIC",
          symbol: "MATIC",
          decimals: 18,
        },
      };

      const config: TCGProtocolConfig = {
        providers: [
          {
            type: ProviderType.WEB3_DIRECT,
            networkConfig,
            contractAddresses: ["invalid-address"],
          },
        ],
      };

      const result = factory.validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.includes("address"))).toBe(
        true
      );
    });

    it("should validate chain ID consistency", () => {
      const networkConfig: NetworkConfig = {
        chainId: 137,
        name: "Polygon Mainnet",
        rpcUrl: "https://polygon-rpc.com",
        nativeCurrency: {
          name: "MATIC",
          symbol: "MATIC",
          decimals: 18,
        },
      };

      const config: TCGProtocolConfig = {
        providers: [
          {
            type: ProviderType.WEB3_DIRECT,
            networkConfig: {
              ...networkConfig,
              chainId: 1, // Inconsistent with expected chain (should be 137 for Polygon)
            },
            contractAddresses: ["0x123"],
          },
        ],
      };

      const result = factory.validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((error) => error.toLowerCase().includes("chain"))
      ).toBe(true);
    });
  });

  describe("Default Configurations", () => {
    it("should provide default caching configuration", () => {
      const networkConfig: NetworkConfig = {
        chainId: 137,
        name: "Polygon Mainnet",
        rpcUrl: "https://polygon-rpc.com",
        nativeCurrency: {
          name: "MATIC",
          symbol: "MATIC",
          decimals: 18,
        },
      };

      const config = factory.mergeWithDefaults({
        providers: [
          {
            type: ProviderType.WEB3_DIRECT,
            networkConfig,
            contractAddresses: ["0x123"],
          },
        ],
      });

      expect(config.settings).toBeDefined();
      expect(config.settings?.enableCaching).toBe(true);
      expect(config.settings?.cacheTtl).toBeGreaterThan(0);
    });

    it("should provide default error handling configuration", () => {
      const networkConfig: NetworkConfig = {
        chainId: 137,
        name: "Polygon Mainnet",
        rpcUrl: "https://polygon-rpc.com",
        nativeCurrency: {
          name: "MATIC",
          symbol: "MATIC",
          decimals: 18,
        },
      };

      const config = factory.mergeWithDefaults({
        providers: [
          {
            type: ProviderType.WEB3_DIRECT,
            networkConfig,
            contractAddresses: ["0x123"],
          },
        ],
      });

      expect(config.settings).toBeDefined();
      expect(config.settings?.retryAttempts).toBeGreaterThan(0);
      expect(config.settings?.retryDelay).toBeGreaterThan(0);
    });

    it("should provide empty providers object by default", () => {
      const networkConfig: NetworkConfig = {
        chainId: 137,
        name: "Polygon Mainnet",
        rpcUrl: "https://polygon-rpc.com",
        nativeCurrency: {
          name: "MATIC",
          symbol: "MATIC",
          decimals: 18,
        },
      };

      const config = factory.mergeWithDefaults({
        providers: [
          {
            type: ProviderType.WEB3_DIRECT,
            networkConfig,
            contractAddresses: ["0x123"],
          },
        ],
      });

      expect(config.providers).toBeDefined();
      expect(typeof config.providers).toBe("object");
    });
  });
});
