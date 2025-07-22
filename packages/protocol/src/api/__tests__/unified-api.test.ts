import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import WS from "ws";
import { RestAPI, GraphQLAPI, APIOperation } from "../unified-api.js";
import type {
  RestApiProviderConfig,
  GraphqlProviderConfig,
} from "../../types/providers.js";

// Mock axios
vi.mock("axios");
const mockAxios = vi.mocked(axios);

// Mock WebSocket
vi.mock("ws");
const mockWS = vi.mocked(WS);

describe("Unified API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("RestAPI", () => {
    const mockConfig: RestApiProviderConfig = {
      baseUrl: "https://api.example.com",
      apiKey: "test-key",
      customHeaders: { "Custom-Header": "value" },
    };

    const mockAxiosInstance = {
      request: vi.fn(),
    };

    beforeEach(() => {
      mockAxios.create.mockReturnValue(mockAxiosInstance as any);
    });

    it("should initialize with correct configuration", () => {
      const api = new RestAPI(mockConfig);

      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL: mockConfig.baseUrl,
        headers: {
          "Content-Type": "application/json",
          "Custom-Header": "value",
          Authorization: "Bearer test-key",
        },
      });
    });

    it("should handle GET requests correctly", async () => {
      const mockResponse = {
        data: { cards: [] },
        status: 200,
        headers: {},
      };
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const api = new RestAPI(mockConfig);
      const operation: APIOperation = {
        type: "query",
        endpoint: "/cards",
        method: "GET",
        params: { page: 1 },
      };

      const result = await api.query(operation);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        url: "/cards",
        method: "GET",
        params: { page: 1 },
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ cards: [] });
      expect(result.metadata.statusCode).toBe(200);
    });

    it("should handle POST requests with data", async () => {
      const mockResponse = {
        data: { id: "123" },
        status: 201,
        headers: {},
      };
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const api = new RestAPI(mockConfig);
      const operation: APIOperation = {
        type: "mutation",
        endpoint: "/collections",
        method: "POST",
        data: { name: "Test Collection" },
      };

      const result = await api.query(operation);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        url: "/collections",
        method: "POST",
        data: { name: "Test Collection" },
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: "123" });
      expect(result.metadata.statusCode).toBe(201);
    });

    it("should handle errors correctly", async () => {
      const mockError = new Error("Network Error");
      mockAxiosInstance.request.mockRejectedValue(mockError);

      const api = new RestAPI(mockConfig);
      const operation: APIOperation = {
        type: "query",
        endpoint: "/cards",
        method: "GET",
      };

      const result = await api.query(operation);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network Error");
    });

    it("should include timing information in metadata", async () => {
      const mockResponse = {
        data: {},
        status: 200,
        headers: {},
      };
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const api = new RestAPI(mockConfig);
      const operation: APIOperation = {
        type: "query",
        endpoint: "/test",
        method: "GET",
      };

      const result = await api.query(operation);

      expect(result.metadata.responseTime).toBeGreaterThan(0);
    });
  });

  describe("GraphQLAPI", () => {
    const mockConfig: GraphqlProviderConfig = {
      endpoint: "https://api.example.com/graphql",
      wsEndpoint: "wss://api.example.com/graphql",
      apiKey: "test-key",
      customHeaders: { "Custom-Header": "value" },
    };

    const mockAxiosInstance = {
      post: vi.fn(),
    };

    beforeEach(() => {
      mockAxios.create.mockReturnValue(mockAxiosInstance as any);
    });

    it("should initialize with correct configuration", () => {
      const api = new GraphQLAPI(mockConfig);

      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL: mockConfig.endpoint,
        headers: {
          "Content-Type": "application/json",
          "Custom-Header": "value",
          Authorization: "Bearer test-key",
        },
      });
    });

    it("should handle GraphQL queries correctly", async () => {
      const mockResponse = {
        data: {
          data: { cards: [] },
        },
        status: 200,
        headers: {},
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const api = new GraphQLAPI(mockConfig);
      const operation: APIOperation = {
        type: "query",
        query: "query GetCards { cards { id name } }",
        variables: { limit: 10 },
      };

      const result = await api.query(operation);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith("", {
        query: "query GetCards { cards { id name } }",
        variables: { limit: 10 },
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ cards: [] });
    });

    it("should handle GraphQL mutations correctly", async () => {
      const mockResponse = {
        data: {
          data: { createCollection: { id: "123" } },
        },
        status: 200,
        headers: {},
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const api = new GraphQLAPI(mockConfig);
      const operation: APIOperation = {
        type: "mutation",
        query:
          "mutation CreateCollection($name: String!) { createCollection(name: $name) { id } }",
        variables: { name: "Test Collection" },
      };

      const result = await api.query(operation);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ createCollection: { id: "123" } });
    });

    it("should handle GraphQL errors correctly", async () => {
      const mockResponse = {
        data: {
          errors: [{ message: "Field not found" }],
        },
        status: 200,
        headers: {},
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const api = new GraphQLAPI(mockConfig);
      const operation: APIOperation = {
        type: "query",
        query: "query InvalidQuery { invalidField }",
      };

      const result = await api.query(operation);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Field not found");
    });

    it("should handle network errors correctly", async () => {
      const mockError = new Error("Network Error");
      mockAxiosInstance.post.mockRejectedValue(mockError);

      const api = new GraphQLAPI(mockConfig);
      const operation: APIOperation = {
        type: "query",
        query: "query GetCards { cards { id } }",
      };

      const result = await api.query(operation);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network Error");
    });
  });

  describe("API Operation Types", () => {
    it("should support query operations", () => {
      const operation: APIOperation = {
        type: "query",
        endpoint: "/test",
        method: "GET",
      };

      expect(operation.type).toBe("query");
      expect(operation.endpoint).toBe("/test");
      expect(operation.method).toBe("GET");
    });

    it("should support mutation operations", () => {
      const operation: APIOperation = {
        type: "mutation",
        endpoint: "/test",
        method: "POST",
        data: { test: "data" },
      };

      expect(operation.type).toBe("mutation");
      expect(operation.data).toEqual({ test: "data" });
    });

    it("should support subscription operations", () => {
      const operation: APIOperation = {
        type: "subscription",
        query: "subscription { cardUpdates { id } }",
      };

      expect(operation.type).toBe("subscription");
      expect(operation.query).toContain("subscription");
    });
  });
});
