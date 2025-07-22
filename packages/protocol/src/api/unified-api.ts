import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import {
  RestApiProviderConfig,
  GraphqlProviderConfig,
} from "../types/providers.js";

/**
 * Unified API interface that abstracts REST and GraphQL communication
 */
export interface UnifiedAPI {
  /**
   * Execute a query (works for both REST and GraphQL)
   */
  query<T = any>(operation: APIOperation): Promise<APIResponse<T>>;

  /**
   * Execute multiple queries in batch
   */
  batchQuery<T = any>(operations: APIOperation[]): Promise<APIResponse<T>[]>;

  /**
   * Subscribe to real-time updates (GraphQL only)
   */
  subscribe?(
    operation: APIOperation,
    callback: (data: any) => void
  ): Promise<string>;

  /**
   * Unsubscribe from updates (GraphQL only)
   */
  unsubscribe?(subscriptionId: string): Promise<void>;

  /**
   * Check if the API is connected
   */
  isConnected(): boolean;

  /**
   * Get API health status
   */
  getHealth(): Promise<{ status: "healthy" | "unhealthy"; latency?: number }>;
}

/**
 * API operation configuration
 */
export interface APIOperation {
  // Operation type
  type: "query" | "mutation" | "subscription";

  // For REST APIs
  endpoint?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  params?: Record<string, any>;
  data?: any;
  headers?: Record<string, string>;

  // For GraphQL APIs
  query?: string;
  variables?: Record<string, any>;
  operationName?: string;

  // Response transformation
  transform?: (data: any) => any;
}

/**
 * Unified API response
 */
export interface APIResponse<T = any> {
  data: T;
  success: boolean;
  error?: string;
  metadata: {
    requestId?: string;
    timestamp: Date;
    responseTime: number;
    statusCode?: number;
  };
}

/**
 * REST API implementation
 */
export class RestAPI implements UnifiedAPI {
  private client: AxiosInstance;
  private config: RestApiProviderConfig;

  constructor(_config: RestApiProviderConfig) {
    this.config = _config;
    this.client = axios.create({
      baseURL: _config.baseUrl,
      headers: {
        "Content-Type": "application/json",
        ..._config.customHeaders,
        ...(_config.apiKey && { Authorization: `Bearer ${_config.apiKey}` }),
      },
    });
  }

  async query<T = any>(operation: APIOperation): Promise<APIResponse<T>> {
    const startTime = Date.now();

    try {
      if (!operation.endpoint) {
        throw new Error("Endpoint is required for REST API operations");
      }

      const method = operation.method || "GET";
      const requestConfig: AxiosRequestConfig = {
        method,
        url: operation.endpoint,
        headers: operation.headers,
      };

      // Add params or data based on method
      if (method === "GET" && operation.params) {
        requestConfig.params = operation.params;
      } else if (operation.data) {
        requestConfig.data = operation.data;
      } else if (operation.params && method !== "GET") {
        requestConfig.data = operation.params;
      }

      const response = await this.client.request(requestConfig);
      const responseTime = Date.now() - startTime;

      let data = response.data;
      if (operation.transform) {
        data = operation.transform(data);
      }

      return {
        data,
        success: true,
        metadata: {
          timestamp: new Date(),
          responseTime,
          statusCode: response.status,
        },
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        data: null as T,
        success: false,
        error: error.message || "Unknown error occurred",
        metadata: {
          timestamp: new Date(),
          responseTime,
          statusCode: error.response?.status,
        },
      };
    }
  }

  async batchQuery<T = any>(
    operations: APIOperation[]
  ): Promise<APIResponse<T>[]> {
    // Execute all operations in parallel for REST
    const promises = operations.map((op) => this.query<T>(op));
    return Promise.all(promises);
  }

  isConnected(): boolean {
    return true; // REST APIs are stateless
  }

  async getHealth(): Promise<{
    status: "healthy" | "unhealthy";
    latency?: number;
  }> {
    const startTime = Date.now();
    try {
      await this.client.get("/health", { timeout: 5000 });
      return {
        status: "healthy",
        latency: Date.now() - startTime,
      };
    } catch {
      return { status: "unhealthy" };
    }
  }
}

/**
 * GraphQL API implementation
 */
export class GraphQLAPI implements UnifiedAPI {
  private config: GraphqlProviderConfig;
  private client: AxiosInstance;
  private wsConnection?: WebSocket;
  private subscriptions = new Map<
    string,
    { callback: (data: any) => void; query: string }
  >();

  constructor(config: GraphqlProviderConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.endpoint,
      headers: {
        "Content-Type": "application/json",
        ...config.customHeaders,
        ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
      },
    });
  }

  async query<T = any>(operation: APIOperation): Promise<APIResponse<T>> {
    const startTime = Date.now();

    try {
      if (!operation.query) {
        throw new Error("Query is required for GraphQL API operations");
      }

      const requestData = {
        query: operation.query,
        variables: operation.variables || {},
        operationName: operation.operationName,
      };

      const response = await this.client.post("", requestData);
      const responseTime = Date.now() - startTime;

      if (response.data.errors) {
        return {
          data: null as T,
          success: false,
          error: response.data.errors[0].message,
          metadata: {
            timestamp: new Date(),
            responseTime,
            statusCode: response.status,
          },
        };
      }

      let data = response.data.data;
      if (operation.transform) {
        data = operation.transform(data);
      }

      return {
        data,
        success: true,
        metadata: {
          timestamp: new Date(),
          responseTime,
          statusCode: response.status,
        },
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        data: null as T,
        success: false,
        error: error.message || "Unknown error occurred",
        metadata: {
          timestamp: new Date(),
          responseTime,
          statusCode: error.response?.status,
        },
      };
    }
  }

  async batchQuery<T = any>(
    operations: APIOperation[]
  ): Promise<APIResponse<T>[]> {
    // For GraphQL, we can use batch queries or execute in parallel
    if (operations.length === 1) {
      return [await this.query<T>(operations[0])];
    }

    // For simplicity, execute in parallel (could be optimized with batch queries)
    const promises = operations.map((op) => this.query<T>(op));
    return Promise.all(promises);
  }

  async subscribe(
    operation: APIOperation,
    callback: (data: any) => void
  ): Promise<string> {
    if (!this.config.wsEndpoint) {
      throw new Error("WebSocket endpoint not configured");
    }

    if (!operation.query) {
      throw new Error("Query is required for GraphQL subscription");
    }

    const subscriptionId = `sub_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Store subscription info
    this.subscriptions.set(subscriptionId, {
      callback,
      query: operation.query,
    });

    // Initialize WebSocket connection if not exists
    if (!this.wsConnection) {
      await this.initializeWebSocket();
    }

    // Send subscription message
    if (this.wsConnection) {
      this.wsConnection.send(
        JSON.stringify({
          id: subscriptionId,
          type: "start",
          payload: {
            query: operation.query,
            variables: operation.variables || {},
          },
        })
      );
    }

    return subscriptionId;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    if (this.wsConnection && this.subscriptions.has(subscriptionId)) {
      this.wsConnection.send(
        JSON.stringify({
          id: subscriptionId,
          type: "stop",
        })
      );
    }

    this.subscriptions.delete(subscriptionId);
  }

  private async initializeWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.wsEndpoint!.replace("http", "ws");
      this.wsConnection = new WebSocket(wsUrl, "graphql-ws");

      this.wsConnection.onopen = () => {
        this.wsConnection!.send(JSON.stringify({ type: "connection_init" }));
        resolve();
      };

      this.wsConnection.onmessage = (event) => {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case "data":
            const subscription = this.subscriptions.get(message.id);
            if (subscription) {
              subscription.callback(message.payload.data);
            }
            break;
          case "error":
            console.error("GraphQL subscription error:", message.payload);
            break;
        }
      };

      this.wsConnection.onerror = (error) => {
        console.error("WebSocket error:", error);
        reject(error);
      };
    });
  }

  isConnected(): boolean {
    return this.wsConnection?.readyState === WebSocket.OPEN;
  }

  async getHealth(): Promise<{
    status: "healthy" | "unhealthy";
    latency?: number;
  }> {
    const startTime = Date.now();
    try {
      // Simple introspection query to check health
      const response = await this.query({
        type: "query",
        query: "{ __typename }",
      });

      return {
        status: response.success ? "healthy" : "unhealthy",
        latency: Date.now() - startTime,
      };
    } catch {
      return { status: "unhealthy" };
    }
  }
}

/**
 * Factory for creating unified API instances
 */
export class UnifiedAPIFactory {
  static createRestAPI(config: RestApiProviderConfig): UnifiedAPI {
    return new RestAPI(config);
  }

  static createGraphQLAPI(config: GraphqlProviderConfig): UnifiedAPI {
    return new GraphQLAPI(config);
  }

  static create(
    config: RestApiProviderConfig | GraphqlProviderConfig
  ): UnifiedAPI {
    if ("baseUrl" in config) {
      return this.createRestAPI(config as RestApiProviderConfig);
    } else if ("endpoint" in config) {
      return this.createGraphQLAPI(config as GraphqlProviderConfig);
    } else {
      throw new Error(`Unsupported API configuration`);
    }
  }
}
