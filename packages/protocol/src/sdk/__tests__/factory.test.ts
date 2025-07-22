import { describe, it, expect, beforeEach, vi } from "vitest";
import { TCGProtocolFactoryImpl } from "../factory.js";
import type { TCGProtocolConfig, NetworkConfig } from "../../types/sdk.js";
import type { RealtimeConnectionType } from "../../types/providers.js";

describe("TCGProtocolFactory", () => {
  let factory: TCGProtocolFactoryImpl;

  beforeEach(() => {
    factory = new TCGProtocolFactoryImpl();
  });

  describe("Configuration Validation", () => {
    it("should validate a complete configuration", () => {
      const config: TCGProtocolConfig = {
        networks: [
          {
            chainId: 137,
            name: "Polygon Mainnet",
            rpcUrl: "https://polygon-rpc.com",
            isMainnet: true,
          },
        ],
        providers: {
          web3: [
            {
              chainId: 137,
              contractAddresses: ["0x123"],
            },
          ],
        },
      };

      const result = factory.validateConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should detect missing networks", () => {
      const config: TCGProtocolConfig = {
        networks: [],
        providers: {},
      };

      const result = factory.validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "At least one network must be configured"
      );
    });

    it("should detect invalid network configuration", () => {
      const config: TCGProtocolConfig = {
        networks: [
          {
            chainId: 0, // Invalid chain ID
            name: "", // Empty name
            rpcUrl: "invalid-url", // Invalid URL
            isMainnet: true,
          },
        ],
        providers: {},
      };

      const result = factory.validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should detect missing providers", () => {
      const config: TCGProtocolConfig = {
        networks: [
          {
            chainId: 137,
            name: "Polygon",
            rpcUrl: "https://polygon-rpc.com",
            isMainnet: true,
          },
        ],
        providers: {}, // No providers configured
      };

      const result = factory.validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "At least one provider must be configured"
      );
    });

    it("should validate API provider configurations", () => {
      const config: TCGProtocolConfig = {
        networks: [
          {
            chainId: 137,
            name: "Polygon",
            rpcUrl: "https://polygon-rpc.com",
            isMainnet: true,
          },
        ],
        providers: {
          rest: [
            {
              baseUrl: "", // Invalid empty URL
            },
          ],
        },
      };

      const result = factory.validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.includes("baseUrl"))).toBe(
        true
      );
    });
  });

  describe("Configuration Merging", () => {
    it("should merge user config with defaults", () => {
      const userConfig: Partial<TCGProtocolConfig> = {
        networks: [
          {
            chainId: 137,
            name: "Polygon Mainnet",
            rpcUrl: "https://polygon-rpc.com",
            isMainnet: true,
          },
        ],
      };

      const merged = factory.mergeWithDefaults(userConfig);

      expect(merged.networks).toEqual(userConfig.networks);
      expect(merged.providers).toBeDefined();
      expect(merged.caching).toBeDefined();
      expect(merged.errorHandling).toBeDefined();
    });

    it("should not override user-provided values", () => {
      const userConfig: Partial<TCGProtocolConfig> = {
        networks: [
          {
            chainId: 137,
            name: "Polygon Mainnet",
            rpcUrl: "https://polygon-rpc.com",
            isMainnet: true,
          },
        ],
        caching: {
          enabled: false,
          ttl: 10000,
        },
      };

      const merged = factory.mergeWithDefaults(userConfig);

      expect(merged.caching?.enabled).toBe(false);
      expect(merged.caching?.ttl).toBe(10000);
    });

    it("should handle nested object merging", () => {
      const userConfig: Partial<TCGProtocolConfig> = {
        networks: [
          {
            chainId: 137,
            name: "Polygon Mainnet",
            rpcUrl: "https://polygon-rpc.com",
            isMainnet: true,
          },
        ],
        errorHandling: {
          retryCount: 5, // Override default
          // Don't specify retryDelay, should use default
        },
      };

      const merged = factory.mergeWithDefaults(userConfig);

      expect(merged.errorHandling?.retryCount).toBe(5);
      expect(merged.errorHandling?.retryDelay).toBeDefined(); // Should have default value
    });
  });

  describe("Quick Setup Functions", () => {
    it("should create Polygon mainnet configuration", () => {
      const config = factory.createPolygonMainnetConfig(
        ["0x123"],
        "test-api-key"
      );

      expect(config.networks).toHaveLength(1);
      expect(config.networks[0].chainId).toBe(137);
      expect(config.networks[0].name).toBe("Polygon Mainnet");
      expect(config.networks[0].isMainnet).toBe(true);
      expect(config.providers.web3).toHaveLength(1);
      expect(config.providers.web3![0].contractAddresses).toEqual(["0x123"]);
    });

    it("should create Polygon testnet configuration", () => {
      const config = factory.createPolygonTestnetConfig(
        ["0x456"],
        "test-api-key"
      );

      expect(config.networks).toHaveLength(1);
      expect(config.networks[0].chainId).toBe(80001);
      expect(config.networks[0].name).toBe("Polygon Mumbai Testnet");
      expect(config.networks[0].isMainnet).toBe(false);
      expect(config.providers.web3).toHaveLength(1);
      expect(config.providers.web3![0].contractAddresses).toEqual(["0x456"]);
    });

    it("should create multi-provider configuration", () => {
      const config = factory.createMultiProviderConfig(
        [
          {
            chainId: 137,
            name: "Polygon",
            rpcUrl: "https://polygon-rpc.com",
            isMainnet: true,
          },
        ],
        {
          web3Contracts: ["0x123"],
          restApiUrl: "https://api.example.com",
          graphqlEndpoint: "https://api.example.com/graphql",
          apiKey: "test-key",
        }
      );

      expect(config.networks).toHaveLength(1);
      expect(config.providers.web3).toBeDefined();
      expect(config.providers.rest).toBeDefined();
      expect(config.providers.graphql).toBeDefined();
      expect(config.providers.rest![0].baseUrl).toBe("https://api.example.com");
      expect(config.providers.graphql![0].endpoint).toBe(
        "https://api.example.com/graphql"
      );
    });

    it("should create real-time enabled configuration", () => {
      const baseConfig: TCGProtocolConfig = {
        networks: [
          {
            chainId: 137,
            name: "Polygon",
            rpcUrl: "https://polygon-rpc.com",
            isMainnet: true,
          },
        ],
        providers: {
          web3: [
            {
              chainId: 137,
              contractAddresses: ["0x123"],
            },
          ],
        },
      };

      const config = factory.enableRealtime(baseConfig, {
        connectionType: "websocket" as RealtimeConnectionType,
        wsEndpoint: "wss://api.example.com/ws",
      });

      expect(config.realtime).toBeDefined();
      expect(config.realtime?.connectionType).toBe("websocket");
      expect(config.realtime?.wsEndpoint).toBe("wss://api.example.com/ws");
    });
  });

  describe("SDK Creation", () => {
    it("should create SDK instance with valid configuration", async () => {
      const config: TCGProtocolConfig = {
        networks: [
          {
            chainId: 137,
            name: "Polygon Mainnet",
            rpcUrl: "https://polygon-rpc.com",
            isMainnet: true,
          },
        ],
        providers: {
          web3: [
            {
              chainId: 137,
              contractAddresses: ["0x123"],
            },
          ],
        },
      };

      const sdk = await factory.createSDK(config);

      expect(sdk).toBeDefined();
      expect(sdk.networks).toHaveLength(1);
      expect(sdk.isInitialized()).toBe(true);
    });

    it("should throw error for invalid configuration", async () => {
      const invalidConfig: TCGProtocolConfig = {
        networks: [], // Empty networks
        providers: {},
      };

      await expect(factory.createSDK(invalidConfig)).rejects.toThrow();
    });

    it("should initialize SDK with providers", async () => {
      const config: TCGProtocolConfig = {
        networks: [
          {
            chainId: 137,
            name: "Polygon",
            rpcUrl: "https://polygon-rpc.com",
            isMainnet: true,
          },
        ],
        providers: {
          web3: [
            {
              chainId: 137,
              contractAddresses: ["0x123"],
            },
          ],
          rest: [
            {
              baseUrl: "https://api.example.com",
              apiKey: "test-key",
            },
          ],
        },
      };

      const sdk = await factory.createSDK(config);

      expect(sdk.providers.getProvider("web3")).toBeDefined();
      expect(sdk.providers.getProvider("rest")).toBeDefined();
    });
  });

  describe("Quick Create Methods", () => {
    it("should quickly create Polygon mainnet SDK", async () => {
      const sdk = await factory.createPolygonMainnet(["0x123"], "test-api-key");

      expect(sdk).toBeDefined();
      expect(sdk.networks[0].chainId).toBe(137);
      expect(sdk.networks[0].isMainnet).toBe(true);
    });

    it("should quickly create Polygon testnet SDK", async () => {
      const sdk = await factory.createPolygonTestnet(["0x456"], "test-api-key");

      expect(sdk).toBeDefined();
      expect(sdk.networks[0].chainId).toBe(80001);
      expect(sdk.networks[0].isMainnet).toBe(false);
    });

    it("should quickly create multi-provider SDK", async () => {
      const networks: NetworkConfig[] = [
        {
          chainId: 137,
          name: "Polygon",
          rpcUrl: "https://polygon-rpc.com",
          isMainnet: true,
        },
      ];

      const sdk = await factory.createMultiProvider(networks, {
        web3Contracts: ["0x123"],
        restApiUrl: "https://api.example.com",
        apiKey: "test-key",
      });

      expect(sdk).toBeDefined();
      expect(sdk.providers.getProvider("web3")).toBeDefined();
      expect(sdk.providers.getProvider("rest")).toBeDefined();
    });

    it("should quickly create real-time enabled SDK", async () => {
      const baseConfig: TCGProtocolConfig = {
        networks: [
          {
            chainId: 137,
            name: "Polygon",
            rpcUrl: "https://polygon-rpc.com",
            isMainnet: true,
          },
        ],
        providers: {
          web3: [
            {
              chainId: 137,
              contractAddresses: ["0x123"],
            },
          ],
        },
      };

      const sdk = await factory.createWithRealtime(baseConfig, {
        connectionType: "websocket" as RealtimeConnectionType,
        wsEndpoint: "wss://api.example.com/ws",
      });

      expect(sdk).toBeDefined();
      expect(sdk.realtime).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should provide helpful error messages for invalid URLs", () => {
      const config: TCGProtocolConfig = {
        networks: [
          {
            chainId: 137,
            name: "Polygon",
            rpcUrl: "not-a-url",
            isMainnet: true,
          },
        ],
        providers: {
          web3: [
            {
              chainId: 137,
              contractAddresses: ["0x123"],
            },
          ],
        },
      };

      const result = factory.validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.includes("rpcUrl"))).toBe(
        true
      );
    });

    it("should validate contract address formats", () => {
      const config: TCGProtocolConfig = {
        networks: [
          {
            chainId: 137,
            name: "Polygon",
            rpcUrl: "https://polygon-rpc.com",
            isMainnet: true,
          },
        ],
        providers: {
          web3: [
            {
              chainId: 137,
              contractAddresses: ["invalid-address"],
            },
          ],
        },
      };

      const result = factory.validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.includes("contract"))).toBe(
        true
      );
    });

    it("should validate chain ID consistency", () => {
      const config: TCGProtocolConfig = {
        networks: [
          {
            chainId: 137,
            name: "Polygon",
            rpcUrl: "https://polygon-rpc.com",
            isMainnet: true,
          },
        ],
        providers: {
          web3: [
            {
              chainId: 1, // Different from network chain ID
              contractAddresses: ["0x123"],
            },
          ],
        },
      };

      const result = factory.validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.includes("chain"))).toBe(true);
    });
  });

  describe("Default Configurations", () => {
    it("should provide default caching configuration", () => {
      const config = factory.mergeWithDefaults({
        networks: [
          {
            chainId: 137,
            name: "Polygon",
            rpcUrl: "https://polygon-rpc.com",
            isMainnet: true,
          },
        ],
      });

      expect(config.caching).toBeDefined();
      expect(config.caching?.enabled).toBe(true);
      expect(config.caching?.ttl).toBeGreaterThan(0);
    });

    it("should provide default error handling configuration", () => {
      const config = factory.mergeWithDefaults({
        networks: [
          {
            chainId: 137,
            name: "Polygon",
            rpcUrl: "https://polygon-rpc.com",
            isMainnet: true,
          },
        ],
      });

      expect(config.errorHandling).toBeDefined();
      expect(config.errorHandling?.retryCount).toBeGreaterThan(0);
      expect(config.errorHandling?.retryDelay).toBeGreaterThan(0);
    });

    it("should provide empty providers object by default", () => {
      const config = factory.mergeWithDefaults({
        networks: [
          {
            chainId: 137,
            name: "Polygon",
            rpcUrl: "https://polygon-rpc.com",
            isMainnet: true,
          },
        ],
      });

      expect(config.providers).toBeDefined();
      expect(typeof config.providers).toBe("object");
    });
  });
});
