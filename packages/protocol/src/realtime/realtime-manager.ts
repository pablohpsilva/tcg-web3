import { EventEmitter } from "eventemitter3";
import WebSocket from "ws";
import {
  UpdateEvent,
  UpdateType,
  Filter,
  FilterOperator,
  LogicalOperator,
} from "../types/core.js";
import { RealtimeConnectionType, RealtimeConfig } from "../types/providers.js";
import { RealtimeManagerInterface as IRealtimeManager } from "../types/sdk.js";

/**
 * Subscription details
 */
interface Subscription {
  id: string;
  events: string[];
  callback: (event: UpdateEvent) => void;
  filters?: Filter[];
  createdAt: Date;
}

/**
 * Connection status
 */
interface ConnectionStatus {
  isConnected: boolean;
  connectionType: RealtimeConnectionType;
  subscriptionCount: number;
  lastConnected?: Date;
  lastDisconnected?: Date;
  reconnectAttempts: number;
}

/**
 * Real-time manager implementation
 */
export class RealtimeManager extends EventEmitter implements IRealtimeManager {
  private config: RealtimeConfig;
  private subscriptions = new Map<string, Subscription>();
  private connection?: WebSocket | EventSource;
  private pollingInterval?: NodeJS.Timeout;
  private status: ConnectionStatus;
  private reconnectTimeout?: NodeJS.Timeout;

  constructor(config: RealtimeConfig) {
    super();
    this.config = config;
    this.status = {
      isConnected: false,
      connectionType: config.connectionType,
      subscriptionCount: 0,
      reconnectAttempts: 0,
    };
  }

  /**
   * Initialize the real-time connection
   */
  async initialize(): Promise<void> {
    switch (this.config.connectionType) {
      case RealtimeConnectionType.WEBSOCKET:
        await this.initializeWebSocket();
        break;
      case RealtimeConnectionType.SERVER_SENT_EVENTS:
        await this.initializeSSE();
        break;
      case RealtimeConnectionType.POLLING:
        await this.initializePolling();
        break;
      default:
        throw new Error(
          `Unsupported connection type: ${this.config.connectionType}`
        );
    }
  }

  /**
   * Subscribe to card updates for a wallet
   */
  async subscribeToWallet(
    wallet: string,
    callback: (event: UpdateEvent) => void,
    filters?: Filter[]
  ): Promise<string> {
    const events = [
      UpdateType.CARD_TRANSFERRED,
      UpdateType.CARD_MINTED,
      UpdateType.CARD_BURNED,
    ];

    const walletFilters: Filter[] = [
      { field: "to", operator: FilterOperator.EQUALS, value: wallet },
      {
        field: "from",
        operator: FilterOperator.EQUALS,
        value: wallet,
        logicalOperator: LogicalOperator.OR,
      },
    ];

    const combinedFilters = filters
      ? [...walletFilters, ...filters]
      : walletFilters;

    return this.subscribe(events, callback, combinedFilters);
  }

  /**
   * Subscribe to updates for specific contracts
   */
  async subscribeToContracts(
    contractAddresses: string[],
    callback: (event: UpdateEvent) => void,
    filters?: Filter[]
  ): Promise<string> {
    const events = [
      UpdateType.CARD_MINTED,
      UpdateType.CARD_TRANSFERRED,
      UpdateType.CARD_BURNED,
      UpdateType.CARD_METADATA_UPDATED,
    ];

    const contractFilters: Filter[] = [
      {
        field: "contractAddress",
        operator: FilterOperator.IN,
        value: contractAddresses,
      },
    ];

    const combinedFilters = filters
      ? [...contractFilters, ...filters]
      : contractFilters;

    return this.subscribe(events, callback, combinedFilters);
  }

  /**
   * Subscribe to set updates
   */
  async subscribeToSets(
    setIds: string[],
    callback: (event: UpdateEvent) => void
  ): Promise<string> {
    const events = [
      UpdateType.SET_CREATED,
      UpdateType.SET_LOCKED,
      UpdateType.CARD_MINTED,
    ];

    const setFilters: Filter[] = [
      { field: "setId", operator: FilterOperator.IN, value: setIds },
    ];

    return this.subscribe(events, callback, setFilters);
  }

  /**
   * Subscribe to all updates with filters
   */
  async subscribe(
    events: string[],
    callback: (event: UpdateEvent) => void,
    filters?: Filter[]
  ): Promise<string> {
    const subscriptionId = this.generateSubscriptionId();

    const subscription: Subscription = {
      id: subscriptionId,
      events,
      callback,
      filters,
      createdAt: new Date(),
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.status.subscriptionCount = this.subscriptions.size;

    // If not connected, initialize connection
    if (!this.status.isConnected) {
      await this.initialize();
    }

    // Send subscription message if using WebSocket
    if (
      this.config.connectionType === RealtimeConnectionType.WEBSOCKET &&
      this.connection
    ) {
      this.sendWebSocketMessage({
        type: "subscribe",
        subscriptionId,
        events,
        filters,
      });
    }

    this.emit("subscription_created", { subscriptionId, events, filters });

    return subscriptionId;
  }

  /**
   * Unsubscribe from updates
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return;
    }

    this.subscriptions.delete(subscriptionId);
    this.status.subscriptionCount = this.subscriptions.size;

    // Send unsubscribe message if using WebSocket
    if (
      this.config.connectionType === RealtimeConnectionType.WEBSOCKET &&
      this.connection
    ) {
      this.sendWebSocketMessage({
        type: "unsubscribe",
        subscriptionId,
      });
    }

    this.emit("subscription_removed", { subscriptionId });

    // If no more subscriptions, disconnect
    if (this.subscriptions.size === 0) {
      await this.disconnect();
    }
  }

  /**
   * Unsubscribe from all updates
   */
  async unsubscribeAll(): Promise<void> {
    const subscriptionIds = Array.from(this.subscriptions.keys());

    for (const subscriptionId of subscriptionIds) {
      await this.unsubscribe(subscriptionId);
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    isConnected: boolean;
    connectionType: string;
    subscriptionCount: number;
  } {
    return {
      isConnected: this.status.isConnected,
      connectionType: this.config.connectionType,
      subscriptionCount: this.status.subscriptionCount,
    };
  }

  /**
   * Disconnect from real-time updates
   */
  async disconnect(): Promise<void> {
    this.status.isConnected = false;
    this.status.lastDisconnected = new Date();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    switch (this.config.connectionType) {
      case RealtimeConnectionType.WEBSOCKET:
        if (this.connection instanceof WebSocket) {
          this.connection.close();
        }
        break;
      case RealtimeConnectionType.SERVER_SENT_EVENTS:
        if (this.connection instanceof EventSource) {
          this.connection.close();
        }
        break;
      case RealtimeConnectionType.POLLING:
        if (this.pollingInterval) {
          clearInterval(this.pollingInterval);
          this.pollingInterval = undefined;
        }
        break;
    }

    this.connection = undefined;
    this.emit("disconnected");
  }

  /**
   * Initialize WebSocket connection
   */
  private async initializeWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.config.endpoint) {
        reject(new Error("WebSocket endpoint not configured"));
        return;
      }

      const ws = new WebSocket(this.config.endpoint, {
        headers: this.config.customHeaders,
      });

      ws.on("open", () => {
        this.connection = ws;
        this.status.isConnected = true;
        this.status.lastConnected = new Date();
        this.status.reconnectAttempts = 0;

        this.emit("connected");
        resolve();
      });

      ws.on("message", (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      });

      ws.on("close", () => {
        this.status.isConnected = false;
        this.status.lastDisconnected = new Date();
        this.emit("disconnected");

        // Attempt to reconnect if configured
        this.attemptReconnect();
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        this.emit("error", error);
        reject(error);
      });
    });
  }

  /**
   * Initialize Server-Sent Events connection
   */
  private async initializeSSE(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.config.endpoint) {
        reject(new Error("SSE endpoint not configured"));
        return;
      }

      // Note: In a real implementation, you'd use the browser's EventSource
      // For Node.js, you might use a library like 'eventsource'
      const eventSource = new EventSource(this.config.endpoint);

      eventSource.onopen = () => {
        this.connection = eventSource;
        this.status.isConnected = true;
        this.status.lastConnected = new Date();
        this.status.reconnectAttempts = 0;

        this.emit("connected");
        resolve();
      };

      eventSource.onmessage = (event: MessageEvent) => {
        try {
          const updateEvent = JSON.parse(event.data) as UpdateEvent;
          this.handleUpdateEvent(updateEvent);
        } catch (error) {
          console.error("Failed to parse SSE message:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE error:", error);
        this.status.isConnected = false;
        this.emit("error", error);

        // Attempt to reconnect
        this.attemptReconnect();
      };
    });
  }

  /**
   * Initialize polling mechanism
   */
  private async initializePolling(): Promise<void> {
    if (!this.config.endpoint) {
      throw new Error("Polling endpoint not configured");
    }

    const interval = this.config.pollingInterval || 5000; // Default 5 seconds
    let lastTimestamp = Date.now();

    const poll = async () => {
      try {
        const response = await fetch(
          `${this.config.endpoint}?since=${lastTimestamp}`,
          {
            headers: this.config.customHeaders,
          }
        );

        if (!response.ok) {
          throw new Error(`Polling failed: ${response.statusText}`);
        }

        const events = (await response.json()) as UpdateEvent[];

        for (const event of events) {
          this.handleUpdateEvent(event);
        }

        lastTimestamp = Date.now();

        if (!this.status.isConnected) {
          this.status.isConnected = true;
          this.status.lastConnected = new Date();
          this.status.reconnectAttempts = 0;
          this.emit("connected");
        }
      } catch (error) {
        console.error("Polling error:", error);
        this.status.isConnected = false;
        this.emit("error", error);
      }
    };

    // Start polling
    this.pollingInterval = setInterval(poll, interval);

    // Initial poll
    await poll();
  }

  /**
   * Handle WebSocket messages
   */
  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case "event":
        this.handleUpdateEvent(message.data);
        break;
      case "subscription_confirmed":
        this.emit("subscription_confirmed", message);
        break;
      case "error":
        this.emit("error", new Error(message.error));
        break;
    }
  }

  /**
   * Handle incoming update events
   */
  private handleUpdateEvent(event: UpdateEvent): void {
    // Find matching subscriptions
    for (const subscription of this.subscriptions.values()) {
      if (this.shouldDeliverEvent(subscription, event)) {
        try {
          subscription.callback(event);
        } catch (error) {
          console.error("Error in subscription callback:", error);
          this.emit("callback_error", {
            subscriptionId: subscription.id,
            error,
          });
        }
      }
    }

    this.emit("event_received", event);
  }

  /**
   * Check if an event should be delivered to a subscription
   */
  private shouldDeliverEvent(
    subscription: Subscription,
    event: UpdateEvent
  ): boolean {
    // Check if event type matches
    if (!subscription.events.includes(event.type)) {
      return false;
    }

    // Apply filters if any
    if (subscription.filters && subscription.filters.length > 0) {
      return this.applyFiltersToEvent(event, subscription.filters);
    }

    return true;
  }

  /**
   * Apply filters to an event
   */
  private applyFiltersToEvent(event: UpdateEvent, filters: Filter[]): boolean {
    return filters.every((filter) => {
      const value = this.getNestedValue(event.data, filter.field);

      switch (filter.operator) {
        case "eq":
          return value === filter.value;
        case "neq":
          return value !== filter.value;
        case "in":
          return Array.isArray(filter.value) && filter.value.includes(value);
        case "nin":
          return Array.isArray(filter.value) && !filter.value.includes(value);
        case "contains":
          return String(value)
            .toLowerCase()
            .includes(String(filter.value).toLowerCase());
        default:
          return true;
      }
    });
  }

  /**
   * Send WebSocket message
   */
  private sendWebSocketMessage(message: any): void {
    if (
      this.connection instanceof WebSocket &&
      this.connection.readyState === WebSocket.OPEN
    ) {
      this.connection.send(JSON.stringify(message));
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    const maxAttempts = this.config.reconnectAttempts || 5;
    const delay = this.config.reconnectDelay || 1000;

    if (this.status.reconnectAttempts >= maxAttempts) {
      this.emit("max_reconnect_attempts_reached");
      return;
    }

    this.status.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.initialize();
        this.emit("reconnected");
      } catch (error) {
        console.error("Reconnection failed:", error);
        this.attemptReconnect();
      }
    }, delay * this.status.reconnectAttempts); // Exponential backoff
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }
}

/**
 * Factory for creating real-time managers
 */
export class RealtimeManagerFactory {
  static createWebSocketManager(
    endpoint: string,
    options?: {
      customHeaders?: Record<string, string>;
      reconnectAttempts?: number;
      reconnectDelay?: number;
    }
  ): RealtimeManager {
    return new RealtimeManager({
      connectionType: RealtimeConnectionType.WEBSOCKET,
      endpoint,
      customHeaders: options?.customHeaders,
      reconnectAttempts: options?.reconnectAttempts,
      reconnectDelay: options?.reconnectDelay,
    });
  }

  static createSSEManager(
    endpoint: string,
    options?: {
      customHeaders?: Record<string, string>;
      reconnectAttempts?: number;
      reconnectDelay?: number;
    }
  ): RealtimeManager {
    return new RealtimeManager({
      connectionType: RealtimeConnectionType.SERVER_SENT_EVENTS,
      endpoint,
      customHeaders: options?.customHeaders,
      reconnectAttempts: options?.reconnectAttempts,
      reconnectDelay: options?.reconnectDelay,
    });
  }

  static createPollingManager(
    endpoint: string,
    options?: {
      pollingInterval?: number;
      customHeaders?: Record<string, string>;
    }
  ): RealtimeManager {
    return new RealtimeManager({
      connectionType: RealtimeConnectionType.POLLING,
      endpoint,
      pollingInterval: options?.pollingInterval,
      customHeaders: options?.customHeaders,
    });
  }
}
