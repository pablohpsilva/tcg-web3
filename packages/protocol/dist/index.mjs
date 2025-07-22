var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// src/types/core.ts
var CardRarity = /* @__PURE__ */ ((CardRarity2) => {
  CardRarity2["COMMON"] = "common";
  CardRarity2["UNCOMMON"] = "uncommon";
  CardRarity2["RARE"] = "rare";
  CardRarity2["EPIC"] = "epic";
  CardRarity2["LEGENDARY"] = "legendary";
  CardRarity2["MYTHIC"] = "mythic";
  return CardRarity2;
})(CardRarity || {});
var CardType = /* @__PURE__ */ ((CardType2) => {
  CardType2["CREATURE"] = "creature";
  CardType2["SPELL"] = "spell";
  CardType2["ARTIFACT"] = "artifact";
  CardType2["ENCHANTMENT"] = "enchantment";
  CardType2["LAND"] = "land";
  CardType2["PLANESWALKER"] = "planeswalker";
  return CardType2;
})(CardType || {});
var FilterOperator = /* @__PURE__ */ ((FilterOperator2) => {
  FilterOperator2["EQUALS"] = "eq";
  FilterOperator2["NOT_EQUALS"] = "neq";
  FilterOperator2["GREATER_THAN"] = "gt";
  FilterOperator2["GREATER_THAN_OR_EQUAL"] = "gte";
  FilterOperator2["LESS_THAN"] = "lt";
  FilterOperator2["LESS_THAN_OR_EQUAL"] = "lte";
  FilterOperator2["IN"] = "in";
  FilterOperator2["NOT_IN"] = "nin";
  FilterOperator2["CONTAINS"] = "contains";
  FilterOperator2["NOT_CONTAINS"] = "not_contains";
  FilterOperator2["STARTS_WITH"] = "starts_with";
  FilterOperator2["ENDS_WITH"] = "ends_with";
  FilterOperator2["REGEX"] = "regex";
  return FilterOperator2;
})(FilterOperator || {});
var LogicalOperator = /* @__PURE__ */ ((LogicalOperator2) => {
  LogicalOperator2["AND"] = "and";
  LogicalOperator2["OR"] = "or";
  return LogicalOperator2;
})(LogicalOperator || {});
var SortDirection = /* @__PURE__ */ ((SortDirection2) => {
  SortDirection2["ASC"] = "asc";
  SortDirection2["DESC"] = "desc";
  return SortDirection2;
})(SortDirection || {});
var UpdateType = /* @__PURE__ */ ((UpdateType2) => {
  UpdateType2["CARD_MINTED"] = "card_minted";
  UpdateType2["CARD_TRANSFERRED"] = "card_transferred";
  UpdateType2["CARD_BURNED"] = "card_burned";
  UpdateType2["CARD_METADATA_UPDATED"] = "card_metadata_updated";
  UpdateType2["SET_CREATED"] = "set_created";
  UpdateType2["SET_LOCKED"] = "set_locked";
  return UpdateType2;
})(UpdateType || {});

// src/types/providers.ts
var ProviderType = /* @__PURE__ */ ((ProviderType2) => {
  ProviderType2["WEB3_DIRECT"] = "web3_direct";
  ProviderType2["INDEXING_SERVICE"] = "indexing_service";
  ProviderType2["SUBGRAPH"] = "subgraph";
  ProviderType2["REST_API"] = "rest_api";
  ProviderType2["GRAPHQL_API"] = "graphql_api";
  return ProviderType2;
})(ProviderType || {});
var RealtimeConnectionType = /* @__PURE__ */ ((RealtimeConnectionType2) => {
  RealtimeConnectionType2["WEBSOCKET"] = "websocket";
  RealtimeConnectionType2["SERVER_SENT_EVENTS"] = "sse";
  RealtimeConnectionType2["POLLING"] = "polling";
  return RealtimeConnectionType2;
})(RealtimeConnectionType || {});

// src/types/metadata.ts
var AggregationType = /* @__PURE__ */ ((AggregationType2) => {
  AggregationType2["SUM"] = "sum";
  AggregationType2["AVERAGE"] = "average";
  AggregationType2["COUNT"] = "count";
  AggregationType2["MIN"] = "min";
  AggregationType2["MAX"] = "max";
  AggregationType2["MEDIAN"] = "median";
  AggregationType2["MODE"] = "mode";
  AggregationType2["UNIQUE_COUNT"] = "unique_count";
  AggregationType2["GROUP_BY"] = "group_by";
  AggregationType2["CUSTOM"] = "custom";
  return AggregationType2;
})(AggregationType || {});
var BuiltinTemplates = {
  BASIC: "basic",
  COMPETITIVE: "competitive",
  COLLECTOR: "collector",
  CASUAL: "casual",
  LIMITED: "limited"
};

// src/types/sdk.ts
var SDKEvents = {
  INITIALIZED: "initialized",
  PROVIDER_ADDED: "provider_added",
  PROVIDER_REMOVED: "provider_removed",
  PROVIDER_ERROR: "provider_error",
  CONFIG_UPDATED: "config_updated",
  REALTIME_CONNECTED: "realtime_connected",
  REALTIME_DISCONNECTED: "realtime_disconnected",
  CACHE_CLEARED: "cache_cleared",
  ERROR: "error"
};

// src/api/unified-api.ts
import axios from "axios";
var RestAPI = class {
  constructor(_config) {
    __publicField(this, "client");
    this.client = axios.create({
      baseURL: _config.baseUrl,
      headers: {
        "Content-Type": "application/json",
        ..._config.customHeaders,
        ..._config.apiKey && { Authorization: `Bearer ${_config.apiKey}` }
      }
    });
  }
  async query(operation) {
    const startTime = Date.now();
    try {
      if (!operation.restConfig) {
        throw new Error(
          "REST configuration is required for REST API operations"
        );
      }
      const requestConfig = {
        method: operation.restConfig.method,
        url: operation.restConfig.endpoint,
        headers: operation.restConfig.headers,
        ...operation.params && {
          [operation.restConfig.method === "GET" ? "params" : "data"]: operation.params
        }
      };
      const response = await this.client.request(requestConfig);
      const latency = Date.now() - startTime;
      let data = response.data;
      if (operation.transform) {
        data = operation.transform(data);
      }
      return {
        data,
        success: true,
        metadata: {
          timestamp: /* @__PURE__ */ new Date(),
          latency
        }
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        data: null,
        success: false,
        error: error.message || "Unknown error occurred",
        metadata: {
          timestamp: /* @__PURE__ */ new Date(),
          latency
        }
      };
    }
  }
  async batchQuery(operations) {
    const promises = operations.map((op) => this.query(op));
    return Promise.all(promises);
  }
  isConnected() {
    return true;
  }
  async getHealth() {
    const startTime = Date.now();
    try {
      await this.client.get("/health", { timeout: 5e3 });
      return {
        status: "healthy",
        latency: Date.now() - startTime
      };
    } catch {
      return { status: "unhealthy" };
    }
  }
};
var GraphQLAPI = class {
  constructor(config) {
    __publicField(this, "config");
    __publicField(this, "client");
    __publicField(this, "wsConnection");
    __publicField(this, "subscriptions", /* @__PURE__ */ new Map());
    this.config = config;
    this.client = axios.create({
      baseURL: config.endpoint,
      headers: {
        "Content-Type": "application/json",
        ...config.customHeaders,
        ...config.apiKey && { Authorization: `Bearer ${config.apiKey}` }
      }
    });
  }
  async query(operation) {
    const startTime = Date.now();
    try {
      if (!operation.graphqlConfig) {
        throw new Error(
          "GraphQL configuration is required for GraphQL API operations"
        );
      }
      const requestData = {
        query: operation.graphqlConfig.query,
        variables: operation.graphqlConfig.variables || {},
        operationName: operation.graphqlConfig.operationName
      };
      const response = await this.client.post("", requestData);
      const latency = Date.now() - startTime;
      if (response.data.errors) {
        return {
          data: null,
          success: false,
          error: response.data.errors.map((e) => e.message).join(", "),
          metadata: {
            timestamp: /* @__PURE__ */ new Date(),
            latency
          }
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
          timestamp: /* @__PURE__ */ new Date(),
          latency
        }
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        data: null,
        success: false,
        error: error.message || "Unknown error occurred",
        metadata: {
          timestamp: /* @__PURE__ */ new Date(),
          latency
        }
      };
    }
  }
  async batchQuery(operations) {
    if (operations.length === 1) {
      return [await this.query(operations[0])];
    }
    const promises = operations.map((op) => this.query(op));
    return Promise.all(promises);
  }
  async subscribe(operation, callback) {
    if (!this.config.subscriptionEndpoint) {
      throw new Error("Subscription endpoint not configured");
    }
    if (!operation.graphqlConfig) {
      throw new Error("GraphQL configuration required for subscription");
    }
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.subscriptions.set(subscriptionId, {
      callback,
      query: operation.graphqlConfig.query
    });
    if (!this.wsConnection) {
      await this.initializeWebSocket();
    }
    if (this.wsConnection) {
      this.wsConnection.send(
        JSON.stringify({
          id: subscriptionId,
          type: "start",
          payload: {
            query: operation.graphqlConfig.query,
            variables: operation.graphqlConfig.variables || {}
          }
        })
      );
    }
    return subscriptionId;
  }
  async unsubscribe(subscriptionId) {
    if (this.wsConnection && this.subscriptions.has(subscriptionId)) {
      this.wsConnection.send(
        JSON.stringify({
          id: subscriptionId,
          type: "stop"
        })
      );
    }
    this.subscriptions.delete(subscriptionId);
  }
  async initializeWebSocket() {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.subscriptionEndpoint.replace("http", "ws");
      this.wsConnection = new WebSocket(wsUrl, "graphql-ws");
      this.wsConnection.onopen = () => {
        this.wsConnection.send(JSON.stringify({ type: "connection_init" }));
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
  isConnected() {
    return this.wsConnection?.readyState === WebSocket.OPEN;
  }
  async getHealth() {
    const startTime = Date.now();
    try {
      const response = await this.query({
        type: "query",
        name: "health",
        graphqlConfig: {
          query: "{ __typename }"
        }
      });
      return {
        status: response.success ? "healthy" : "unhealthy",
        latency: Date.now() - startTime
      };
    } catch {
      return { status: "unhealthy" };
    }
  }
};
var UnifiedAPIFactory = class {
  static createRestAPI(config) {
    return new RestAPI(config);
  }
  static createGraphQLAPI(config) {
    return new GraphQLAPI(config);
  }
  static create(config) {
    switch (config.type) {
      case "rest_api":
        return this.createRestAPI(config);
      case "graphql_api":
        return this.createGraphQLAPI(config);
      default:
        throw new Error(`Unsupported API type: ${config.type}`);
    }
  }
};

// src/providers/web3-provider.ts
import { ethers, Contract } from "ethers";
var SUPPORTED_NETWORKS = {
  // Polygon Mainnet
  137: {
    chainId: 137,
    name: "Polygon",
    rpcUrl: "https://polygon-rpc.com",
    blockExplorer: "https://polygonscan.com",
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18
    }
  },
  // Polygon Mumbai Testnet
  80001: {
    chainId: 80001,
    name: "Polygon Mumbai",
    rpcUrl: "https://rpc-mumbai.maticvigil.com",
    blockExplorer: "https://mumbai.polygonscan.com",
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18
    }
  },
  // Ethereum Mainnet (for future expansion)
  1: {
    chainId: 1,
    name: "Ethereum",
    rpcUrl: "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
    blockExplorer: "https://etherscan.io",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18
    }
  }
};
var ERC721_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function tokenByIndex(uint256 index) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];
var TCG_CARD_ABI = [
  ...ERC721_ABI,
  "function getCardMetadata(uint256 tokenId) view returns (tuple(string name, string description, uint8 rarity, uint8 cardType, uint256 cost, uint256 power, uint256 toughness, string setId))",
  "function getCardSet(uint256 tokenId) view returns (string)",
  "function isCardInSet(uint256 tokenId, string setId) view returns (bool)"
];
var Web3Provider = class {
  constructor(config) {
    __publicField(this, "type", "web3_direct" /* WEB3_DIRECT */);
    __publicField(this, "config");
    __publicField(this, "provider");
    __publicField(this, "contracts", /* @__PURE__ */ new Map());
    __publicField(this, "_isConnected", false);
    this.config = config;
    if (config.provider) {
      this.provider = config.provider;
    } else if (config.rpcUrl) {
      this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    } else {
      const networkConfig = SUPPORTED_NETWORKS[config.networkConfig.chainId];
      if (!networkConfig) {
        throw new Error(`Unsupported network: ${config.networkConfig.chainId}`);
      }
      this.provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    }
  }
  get isConnected() {
    return this._isConnected;
  }
  async initialize() {
    try {
      await this.provider.getNetwork();
      for (const contractAddress of this.config.contractAddresses) {
        const contract = new Contract(
          contractAddress,
          TCG_CARD_ABI,
          this.provider
        );
        this.contracts.set(contractAddress.toLowerCase(), contract);
      }
      this._isConnected = true;
    } catch (error) {
      throw new Error(`Failed to initialize Web3 provider: ${error}`);
    }
  }
  async disconnect() {
    this.contracts.clear();
    this._isConnected = false;
  }
  async getCardsByWallet(wallet, filters, sort, pagination) {
    const allCards = [];
    for (const [contractAddress, contract] of this.contracts) {
      try {
        const balance = await contract.balanceOf(wallet);
        const balanceNumber = Number(balance);
        for (let i = 0; i < balanceNumber; i++) {
          try {
            const tokenId = await contract.tokenOfOwnerByIndex(wallet, i);
            const card = await this.getCardFromContract(
              contractAddress,
              tokenId.toString()
            );
            if (card) {
              allCards.push(card);
            }
          } catch (error) {
            console.warn(
              `Failed to get token ${i} for wallet ${wallet}:`,
              error
            );
          }
        }
      } catch (error) {
        console.warn(
          `Failed to get cards from contract ${contractAddress}:`,
          error
        );
      }
    }
    return this.processQueryResult(allCards, filters, sort, pagination);
  }
  async getCard(contractAddress, tokenId) {
    return this.getCardFromContract(contractAddress, tokenId);
  }
  async getCardsByContract(contractAddress, filters, sort, pagination) {
    const contract = this.contracts.get(contractAddress.toLowerCase());
    if (!contract) {
      throw new Error(`Contract ${contractAddress} not configured`);
    }
    const cards = [];
    try {
      const totalSupply = await contract.totalSupply();
      const totalSupplyNumber = Number(totalSupply);
      for (let i = 0; i < totalSupplyNumber; i++) {
        try {
          const tokenId = await contract.tokenByIndex(i);
          const card = await this.getCardFromContract(
            contractAddress,
            tokenId.toString()
          );
          if (card) {
            cards.push(card);
          }
        } catch (error) {
          console.warn(
            `Failed to get token ${i} from contract ${contractAddress}:`,
            error
          );
        }
      }
    } catch (error) {
      console.warn(
        `Failed to get total supply from contract ${contractAddress}:`,
        error
      );
    }
    return this.processQueryResult(cards, filters, sort, pagination);
  }
  async getCardsBySet(setId, filters, sort, pagination) {
    const allCards = [];
    for (const [contractAddress, contract] of this.contracts) {
      try {
        const totalSupply = await contract.totalSupply();
        const totalSupplyNumber = Number(totalSupply);
        for (let i = 0; i < totalSupplyNumber; i++) {
          try {
            const tokenId = await contract.tokenByIndex(i);
            try {
              const isInSet = await contract.isCardInSet(tokenId, setId);
              if (isInSet) {
                const card = await this.getCardFromContract(
                  contractAddress,
                  tokenId.toString()
                );
                if (card) {
                  allCards.push(card);
                }
              }
            } catch {
              const card = await this.getCardFromContract(
                contractAddress,
                tokenId.toString()
              );
              if (card && card.setId === setId) {
                allCards.push(card);
              }
            }
          } catch (error) {
            console.warn(`Failed to check token ${i} for set ${setId}:`, error);
          }
        }
      } catch (error) {
        console.warn(
          `Failed to search set ${setId} in contract ${contractAddress}:`,
          error
        );
      }
    }
    return this.processQueryResult(allCards, filters, sort, pagination);
  }
  async searchCards(filters, sort, pagination) {
    const allCards = [];
    for (const [contractAddress] of this.contracts) {
      const contractCards = await this.getCardsByContract(contractAddress);
      allCards.push(...contractCards.data);
    }
    return this.processQueryResult(allCards, filters, sort, pagination);
  }
  async getCardFromContract(contractAddress, tokenId) {
    const contract = this.contracts.get(contractAddress.toLowerCase());
    if (!contract) {
      return null;
    }
    try {
      const [owner, tokenURI] = await Promise.all([
        contract.ownerOf(tokenId),
        contract.tokenURI(tokenId)
      ]);
      let metadata = {};
      try {
        metadata = await contract.getCardMetadata(tokenId);
      } catch {
      }
      let metadataFromURI = {};
      if (tokenURI) {
        try {
          const response = await fetch(tokenURI);
          metadataFromURI = await response.json();
        } catch (error) {
          console.warn(`Failed to fetch metadata from URI ${tokenURI}:`, error);
        }
      }
      const combinedMetadata = { ...metadataFromURI, ...metadata };
      return {
        tokenId,
        contractAddress,
        chainId: this.config.networkConfig.chainId,
        name: combinedMetadata.name || `Card #${tokenId}`,
        description: combinedMetadata.description,
        image: combinedMetadata.image || "",
        rarity: this.parseRarity(combinedMetadata.rarity),
        type: this.parseCardType(
          combinedMetadata.cardType || combinedMetadata.type
        ),
        cost: Number(combinedMetadata.cost) || void 0,
        power: Number(combinedMetadata.power) || void 0,
        toughness: Number(combinedMetadata.toughness) || void 0,
        setId: combinedMetadata.setId || combinedMetadata.set || "unknown",
        setName: combinedMetadata.setName || combinedMetadata.setId || "Unknown Set",
        cardNumber: combinedMetadata.cardNumber,
        colors: combinedMetadata.colors,
        colorIdentity: combinedMetadata.colorIdentity,
        keywords: combinedMetadata.keywords,
        abilities: combinedMetadata.abilities,
        owner,
        attributes: combinedMetadata.attributes,
        mintedAt: combinedMetadata.mintedAt ? new Date(combinedMetadata.mintedAt) : void 0,
        lastTransferAt: /* @__PURE__ */ new Date()
        // We'd need to track this from events
      };
    } catch (error) {
      console.warn(
        `Failed to get card ${tokenId} from contract ${contractAddress}:`,
        error
      );
      return null;
    }
  }
  parseRarity(rarity) {
    if (typeof rarity === "number") {
      const rarityMap = [
        "common" /* COMMON */,
        "uncommon" /* UNCOMMON */,
        "rare" /* RARE */,
        "epic" /* EPIC */,
        "legendary" /* LEGENDARY */,
        "mythic" /* MYTHIC */
      ];
      return rarityMap[rarity] || "common" /* COMMON */;
    }
    if (typeof rarity === "string") {
      return rarity.toLowerCase() || "common" /* COMMON */;
    }
    return "common" /* COMMON */;
  }
  parseCardType(type) {
    if (typeof type === "number") {
      const typeMap = [
        "creature" /* CREATURE */,
        "spell" /* SPELL */,
        "artifact" /* ARTIFACT */,
        "enchantment" /* ENCHANTMENT */,
        "land" /* LAND */,
        "planeswalker" /* PLANESWALKER */
      ];
      return typeMap[type] || "creature" /* CREATURE */;
    }
    if (typeof type === "string") {
      return type.toLowerCase() || "creature" /* CREATURE */;
    }
    return "creature" /* CREATURE */;
  }
  processQueryResult(cards, filters, sort, pagination) {
    let filteredCards = [...cards];
    if (filters && filters.length > 0) {
      filteredCards = this.applyFilters(filteredCards, filters);
    }
    if (sort && sort.length > 0) {
      filteredCards = this.applySorting(filteredCards, sort);
    }
    const total = filteredCards.length;
    if (pagination) {
      const startIndex = (pagination.page - 1) * pagination.limit;
      const endIndex = startIndex + pagination.limit;
      filteredCards = filteredCards.slice(startIndex, endIndex);
    }
    return {
      data: filteredCards,
      pagination: {
        page: pagination?.page || 1,
        limit: pagination?.limit || total,
        total,
        totalPages: pagination ? Math.ceil(total / pagination.limit) : 1,
        hasNext: pagination ? pagination.page * pagination.limit < total : false,
        hasPrev: pagination ? pagination.page > 1 : false
      }
    };
  }
  applyFilters(cards, filters) {
    return cards.filter((card) => {
      return filters.every((filter) => this.evaluateFilter(card, filter));
    });
  }
  evaluateFilter(card, filter) {
    const value = this.getNestedValue(card, filter.field);
    switch (filter.operator) {
      case "eq":
        return value === filter.value;
      case "neq":
        return value !== filter.value;
      case "gt":
        return Number(value) > Number(filter.value);
      case "gte":
        return Number(value) >= Number(filter.value);
      case "lt":
        return Number(value) < Number(filter.value);
      case "lte":
        return Number(value) <= Number(filter.value);
      case "in":
        return Array.isArray(filter.value) && filter.value.includes(value);
      case "nin":
        return Array.isArray(filter.value) && !filter.value.includes(value);
      case "contains":
        return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
      case "not_contains":
        return !String(value).toLowerCase().includes(String(filter.value).toLowerCase());
      case "starts_with":
        return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase());
      case "ends_with":
        return String(value).toLowerCase().endsWith(String(filter.value).toLowerCase());
      case "regex":
        return new RegExp(filter.value).test(String(value));
      default:
        return true;
    }
  }
  applySorting(cards, sort) {
    return cards.sort((a, b) => {
      for (const sortConfig of sort) {
        const valueA = this.getNestedValue(a, sortConfig.field);
        const valueB = this.getNestedValue(b, sortConfig.field);
        let comparison = 0;
        if (valueA < valueB)
          comparison = -1;
        if (valueA > valueB)
          comparison = 1;
        if (comparison !== 0) {
          return sortConfig.direction === "desc" ? -comparison : comparison;
        }
      }
      return 0;
    });
  }
  getNestedValue(obj, path) {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }
};
var Web3ProviderFactory = class {
  static createPolygonProvider(contractAddresses, rpcUrl, isTestnet = false) {
    const chainId = isTestnet ? 80001 : 137;
    const networkConfig = SUPPORTED_NETWORKS[chainId];
    return new Web3Provider({
      type: "web3_direct" /* WEB3_DIRECT */,
      networkConfig,
      contractAddresses,
      rpcUrl: rpcUrl || networkConfig.rpcUrl
    });
  }
  static createEthereumProvider(contractAddresses, rpcUrl) {
    const networkConfig = SUPPORTED_NETWORKS[1];
    return new Web3Provider({
      type: "web3_direct" /* WEB3_DIRECT */,
      networkConfig,
      contractAddresses,
      rpcUrl: rpcUrl || networkConfig.rpcUrl
    });
  }
  static createCustomProvider(networkConfig, contractAddresses, rpcUrl, provider) {
    return new Web3Provider({
      type: "web3_direct" /* WEB3_DIRECT */,
      networkConfig,
      contractAddresses,
      rpcUrl,
      provider
    });
  }
  static getSupportedNetworks() {
    return { ...SUPPORTED_NETWORKS };
  }
  static addNetwork(chainId, config) {
    SUPPORTED_NETWORKS[chainId] = config;
  }
};

// src/filters/filter-engine.ts
var FilterEngine = class {
  constructor() {
    __publicField(this, "customFilters", /* @__PURE__ */ new Map());
    __publicField(this, "customSorters", /* @__PURE__ */ new Map());
    __publicField(this, "fieldRegistry", /* @__PURE__ */ new Map());
    __publicField(this, "presets", /* @__PURE__ */ new Map());
    this.registerBuiltinFilters();
    this.registerBuiltinSorters();
    this.registerCardFields();
  }
  /**
   * Apply filters to a dataset
   */
  applyFilters(items, filters, context) {
    if (!filters || filters.length === 0) {
      return items;
    }
    return items.filter((item, index) => {
      const itemContext = {
        ...context,
        allItems: items,
        currentIndex: index
      };
      return this.evaluateFilterGroup(item, filters, itemContext);
    });
  }
  /**
   * Apply sorting to a dataset
   */
  applySorting(items, sortConfigs) {
    if (!sortConfigs || sortConfigs.length === 0) {
      return items;
    }
    return [...items].sort((a, b) => {
      for (const sortConfig of sortConfigs) {
        const comparison = this.compareItems(a, b, sortConfig);
        if (comparison !== 0) {
          return comparison;
        }
      }
      return 0;
    });
  }
  /**
   * Register a custom filter operator
   */
  registerFilter(operator, handler, options) {
    this.customFilters.set(operator, {
      operator,
      handler,
      description: options?.description,
      supportedTypes: options?.supportedTypes
    });
  }
  /**
   * Register a custom sort function for a field
   */
  registerSort(field, handler, description) {
    this.customSorters.set(field, {
      field,
      handler,
      description
    });
  }
  /**
   * Register field information for better filtering
   */
  registerField(fieldPath, info) {
    this.fieldRegistry.set(fieldPath, info);
  }
  /**
   * Register a filter preset
   */
  registerPreset(preset) {
    this.presets.set(preset.id, preset);
  }
  /**
   * Get available filter operators
   */
  getAvailableOperators() {
    const operators = {};
    for (const [key, value] of this.customFilters) {
      operators[key] = value;
    }
    return operators;
  }
  /**
   * Get field registry
   */
  getFieldRegistry() {
    const fields = {};
    for (const [key, value] of this.fieldRegistry) {
      fields[key] = value;
    }
    return fields;
  }
  /**
   * Get available presets
   */
  getPresets() {
    const presets = {};
    for (const [key, value] of this.presets) {
      presets[key] = value;
    }
    return presets;
  }
  /**
   * Apply a filter preset
   */
  applyPreset(items, presetId, context) {
    const preset = this.presets.get(presetId);
    if (!preset) {
      throw new Error(`Filter preset '${presetId}' not found`);
    }
    return this.applyFilters(items, preset.filters, context);
  }
  /**
   * Validate a filter against field registry
   */
  validateFilter(filter) {
    const errors = [];
    const fieldInfo = this.fieldRegistry.get(filter.field);
    if (!fieldInfo) {
      errors.push(`Field '${filter.field}' is not registered`);
      return { isValid: false, errors };
    }
    const customFilter = this.customFilters.get(filter.operator);
    if (customFilter && customFilter.supportedTypes) {
      if (!customFilter.supportedTypes.includes(fieldInfo.type)) {
        errors.push(
          `Operator '${filter.operator}' is not supported for field type '${fieldInfo.type}'`
        );
      }
    }
    if (fieldInfo.validators) {
      for (const validator of fieldInfo.validators) {
        if (!validator(filter.value)) {
          errors.push(`Invalid value for field '${filter.field}'`);
        }
      }
    }
    if (fieldInfo.type === "enum" && fieldInfo.enum) {
      if (Array.isArray(filter.value)) {
        const invalidValues = filter.value.filter(
          (v) => !fieldInfo.enum.includes(v)
        );
        if (invalidValues.length > 0) {
          errors.push(`Invalid enum values: ${invalidValues.join(", ")}`);
        }
      } else if (!fieldInfo.enum.includes(filter.value)) {
        errors.push(`Invalid enum value: ${filter.value}`);
      }
    }
    return { isValid: errors.length === 0, errors };
  }
  /**
   * Build a filter query from a search string (for user-friendly filtering)
   */
  buildFiltersFromSearch(searchString, searchableFields) {
    const filters = [];
    if (searchString.trim()) {
      const orFilters = searchableFields.map((field) => ({
        field,
        operator: "contains" /* CONTAINS */,
        value: searchString.trim(),
        logicalOperator: "or" /* OR */
      }));
      filters.push(...orFilters);
    }
    return filters;
  }
  /**
   * Evaluate a group of filters with logical operators
   */
  evaluateFilterGroup(item, filters, context) {
    if (filters.length === 0)
      return true;
    let result = this.evaluateFilter(item, filters[0], context);
    for (let i = 1; i < filters.length; i++) {
      const filter = filters[i];
      const filterResult = this.evaluateFilter(item, filter, context);
      if (filter.logicalOperator === "or" /* OR */) {
        result = result || filterResult;
      } else {
        result = result && filterResult;
      }
    }
    return result;
  }
  /**
   * Evaluate a single filter
   */
  evaluateFilter(item, filter, context) {
    const value = this.getNestedValue(item, filter.field);
    const customFilter = this.customFilters.get(filter.operator);
    if (customFilter) {
      return customFilter.handler(item, filter.value, context);
    }
    switch (filter.operator) {
      case "eq" /* EQUALS */:
        return value === filter.value;
      case "neq" /* NOT_EQUALS */:
        return value !== filter.value;
      case "gt" /* GREATER_THAN */:
        return Number(value) > Number(filter.value);
      case "gte" /* GREATER_THAN_OR_EQUAL */:
        return Number(value) >= Number(filter.value);
      case "lt" /* LESS_THAN */:
        return Number(value) < Number(filter.value);
      case "lte" /* LESS_THAN_OR_EQUAL */:
        return Number(value) <= Number(filter.value);
      case "in" /* IN */:
        return Array.isArray(filter.value) && filter.value.includes(value);
      case "nin" /* NOT_IN */:
        return Array.isArray(filter.value) && !filter.value.includes(value);
      case "contains" /* CONTAINS */:
        return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
      case "not_contains" /* NOT_CONTAINS */:
        return !String(value).toLowerCase().includes(String(filter.value).toLowerCase());
      case "starts_with" /* STARTS_WITH */:
        return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase());
      case "ends_with" /* ENDS_WITH */:
        return String(value).toLowerCase().endsWith(String(filter.value).toLowerCase());
      case "regex" /* REGEX */:
        return new RegExp(filter.value, "i").test(String(value));
      default:
        return true;
    }
  }
  /**
   * Compare two items for sorting
   */
  compareItems(a, b, sortConfig) {
    const customSort = this.customSorters.get(sortConfig.field);
    if (customSort) {
      return customSort.handler(a, b, sortConfig.direction);
    }
    const valueA = this.getNestedValue(a, sortConfig.field);
    const valueB = this.getNestedValue(b, sortConfig.field);
    let comparison = 0;
    if (valueA == null && valueB == null)
      return 0;
    if (valueA == null)
      return 1;
    if (valueB == null)
      return -1;
    if (typeof valueA === "number" && typeof valueB === "number") {
      comparison = valueA - valueB;
    } else if (valueA instanceof Date && valueB instanceof Date) {
      comparison = valueA.getTime() - valueB.getTime();
    } else {
      comparison = String(valueA).localeCompare(String(valueB));
    }
    return sortConfig.direction === "desc" /* DESC */ ? -comparison : comparison;
  }
  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    return path.split(".").reduce((current, key) => {
      if (current == null)
        return void 0;
      if (key.includes("[") && key.includes("]")) {
        const arrayKey = key.substring(0, key.indexOf("["));
        const indexStr = key.substring(key.indexOf("[") + 1, key.indexOf("]"));
        const index = parseInt(indexStr, 10);
        if (Array.isArray(current[arrayKey])) {
          return current[arrayKey][index];
        }
      }
      return current[key];
    }, obj);
  }
  /**
   * Register built-in filter operators
   */
  registerBuiltinFilters() {
    this.registerFilter(
      "array_contains",
      (item, value) => {
        const fieldValue = this.getNestedValue(item, "field");
        return Array.isArray(fieldValue) && fieldValue.includes(value);
      },
      {
        description: "Check if array contains a value",
        supportedTypes: ["array"]
      }
    );
    this.registerFilter(
      "array_length",
      (item, value) => {
        const fieldValue = this.getNestedValue(item, "field");
        return Array.isArray(fieldValue) && fieldValue.length === value;
      },
      {
        description: "Check array length",
        supportedTypes: ["array"]
      }
    );
    this.registerFilter(
      "date_between",
      (item, value) => {
        const fieldValue = this.getNestedValue(item, "field");
        if (!(fieldValue instanceof Date) || !Array.isArray(value) || value.length !== 2) {
          return false;
        }
        const startDate = new Date(value[0]);
        const endDate = new Date(value[1]);
        return fieldValue >= startDate && fieldValue <= endDate;
      },
      {
        description: "Check if date is between two dates",
        supportedTypes: ["date"]
      }
    );
    this.registerFilter(
      "fuzzy_match",
      (item, value) => {
        const fieldValue = String(
          this.getNestedValue(item, "field")
        ).toLowerCase();
        const searchValue = String(value).toLowerCase();
        let j = 0;
        for (let i = 0; i < fieldValue.length && j < searchValue.length; i++) {
          if (fieldValue[i] === searchValue[j]) {
            j++;
          }
        }
        return j === searchValue.length;
      },
      {
        description: "Fuzzy string matching",
        supportedTypes: ["string"]
      }
    );
    this.registerFilter(
      "multiple_of",
      (item, value) => {
        const fieldValue = Number(this.getNestedValue(item, "field"));
        return !isNaN(fieldValue) && fieldValue % value === 0;
      },
      {
        description: "Check if number is multiple of value",
        supportedTypes: ["number"]
      }
    );
  }
  /**
   * Register built-in sort functions
   */
  registerBuiltinSorters() {
    this.registerSort(
      "rarity",
      (a, b, direction) => {
        const rarityOrder = [
          "common",
          "uncommon",
          "rare",
          "epic",
          "legendary",
          "mythic"
        ];
        const indexA = rarityOrder.indexOf(a.rarity?.toLowerCase());
        const indexB = rarityOrder.indexOf(b.rarity?.toLowerCase());
        const comparison = indexA - indexB;
        return direction === "desc" /* DESC */ ? -comparison : comparison;
      },
      "Sort by card rarity in TCG order"
    );
    this.registerSort(
      "array_length",
      (a, b, direction) => {
        const getValue = (obj, field) => {
          const value = this.getNestedValue(obj, field);
          return Array.isArray(value) ? value.length : 0;
        };
        const lengthA = getValue(a, "field");
        const lengthB = getValue(b, "field");
        const comparison = lengthA - lengthB;
        return direction === "desc" /* DESC */ ? -comparison : comparison;
      },
      "Sort by array length"
    );
  }
  /**
   * Register field information for Card type
   */
  registerCardFields() {
    const cardFields = {
      tokenId: { type: "string", description: "Unique token identifier" },
      contractAddress: { type: "string", description: "Contract address" },
      chainId: { type: "number", description: "Blockchain network ID" },
      name: { type: "string", description: "Card name" },
      description: { type: "string", description: "Card description" },
      image: { type: "string", description: "Card image URL" },
      rarity: {
        type: "enum",
        enum: ["common", "uncommon", "rare", "epic", "legendary", "mythic"],
        description: "Card rarity level"
      },
      type: {
        type: "enum",
        enum: [
          "creature",
          "spell",
          "artifact",
          "enchantment",
          "land",
          "planeswalker"
        ],
        description: "Card type"
      },
      cost: { type: "number", description: "Mana/energy cost" },
      power: { type: "number", description: "Creature power" },
      toughness: { type: "number", description: "Creature toughness" },
      setId: { type: "string", description: "Set identifier" },
      setName: { type: "string", description: "Set name" },
      cardNumber: { type: "string", description: "Card number in set" },
      colors: { type: "array", description: "Card colors" },
      colorIdentity: { type: "array", description: "Color identity" },
      keywords: { type: "array", description: "Card keywords" },
      abilities: { type: "array", description: "Card abilities" },
      owner: { type: "string", description: "Current owner address" },
      mintedAt: { type: "date", description: "Mint timestamp" },
      lastTransferAt: { type: "date", description: "Last transfer timestamp" }
    };
    for (const [field, info] of Object.entries(cardFields)) {
      this.registerField(field, info);
    }
  }
};
var BUILTIN_PRESETS = [
  {
    id: "high_value_cards",
    name: "High Value Cards",
    description: "Cards with rare or higher rarity",
    filters: [
      {
        field: "rarity",
        operator: "in" /* IN */,
        value: ["rare", "epic", "legendary", "mythic"]
      }
    ],
    tags: ["rarity", "value"]
  },
  {
    id: "low_cost_creatures",
    name: "Low Cost Creatures",
    description: "Creatures with cost 3 or less",
    filters: [
      {
        field: "type",
        operator: "eq" /* EQUALS */,
        value: "creature"
      },
      {
        field: "cost",
        operator: "lte" /* LESS_THAN_OR_EQUAL */,
        value: 3,
        logicalOperator: "and" /* AND */
      }
    ],
    tags: ["cost", "creatures"]
  },
  {
    id: "recent_cards",
    name: "Recently Minted",
    description: "Cards minted in the last 30 days",
    filters: [
      {
        field: "mintedAt",
        operator: "gte" /* GREATER_THAN_OR_EQUAL */,
        value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3)
      }
    ],
    tags: ["time", "recent"]
  }
];
var cardFilterEngine = new FilterEngine();
BUILTIN_PRESETS.forEach((preset) => cardFilterEngine.registerPreset(preset));

// src/sdk/tcg-protocol.ts
import { EventEmitter as EventEmitter2 } from "eventemitter3";

// src/realtime/realtime-manager.ts
import { EventEmitter } from "eventemitter3";
import WebSocket2 from "ws";
var RealtimeManager = class extends EventEmitter {
  constructor(config) {
    super();
    __publicField(this, "config");
    __publicField(this, "subscriptions", /* @__PURE__ */ new Map());
    __publicField(this, "connection");
    __publicField(this, "pollingInterval");
    __publicField(this, "status");
    __publicField(this, "reconnectTimeout");
    this.config = config;
    this.status = {
      isConnected: false,
      connectionType: config.connectionType,
      subscriptionCount: 0,
      reconnectAttempts: 0
    };
  }
  /**
   * Initialize the real-time connection
   */
  async initialize() {
    switch (this.config.connectionType) {
      case "websocket" /* WEBSOCKET */:
        await this.initializeWebSocket();
        break;
      case "sse" /* SERVER_SENT_EVENTS */:
        await this.initializeSSE();
        break;
      case "polling" /* POLLING */:
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
  async subscribeToWallet(wallet, callback, filters) {
    const events = [
      "card_transferred" /* CARD_TRANSFERRED */,
      "card_minted" /* CARD_MINTED */,
      "card_burned" /* CARD_BURNED */
    ];
    const walletFilters = [
      { field: "to", operator: "eq" /* EQUALS */, value: wallet },
      {
        field: "from",
        operator: "eq" /* EQUALS */,
        value: wallet,
        logicalOperator: "or" /* OR */
      }
    ];
    const combinedFilters = filters ? [...walletFilters, ...filters] : walletFilters;
    return this.subscribe(events, callback, combinedFilters);
  }
  /**
   * Subscribe to updates for specific contracts
   */
  async subscribeToContracts(contractAddresses, callback, filters) {
    const events = [
      "card_minted" /* CARD_MINTED */,
      "card_transferred" /* CARD_TRANSFERRED */,
      "card_burned" /* CARD_BURNED */,
      "card_metadata_updated" /* CARD_METADATA_UPDATED */
    ];
    const contractFilters = [
      {
        field: "contractAddress",
        operator: "in" /* IN */,
        value: contractAddresses
      }
    ];
    const combinedFilters = filters ? [...contractFilters, ...filters] : contractFilters;
    return this.subscribe(events, callback, combinedFilters);
  }
  /**
   * Subscribe to set updates
   */
  async subscribeToSets(setIds, callback) {
    const events = [
      "set_created" /* SET_CREATED */,
      "set_locked" /* SET_LOCKED */,
      "card_minted" /* CARD_MINTED */
    ];
    const setFilters = [
      { field: "setId", operator: "in" /* IN */, value: setIds }
    ];
    return this.subscribe(events, callback, setFilters);
  }
  /**
   * Subscribe to all updates with filters
   */
  async subscribe(events, callback, filters) {
    const subscriptionId = this.generateSubscriptionId();
    const subscription = {
      id: subscriptionId,
      events,
      callback,
      filters,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.subscriptions.set(subscriptionId, subscription);
    this.status.subscriptionCount = this.subscriptions.size;
    if (!this.status.isConnected) {
      await this.initialize();
    }
    if (this.config.connectionType === "websocket" /* WEBSOCKET */ && this.connection) {
      this.sendWebSocketMessage({
        type: "subscribe",
        subscriptionId,
        events,
        filters
      });
    }
    this.emit("subscription_created", { subscriptionId, events, filters });
    return subscriptionId;
  }
  /**
   * Unsubscribe from updates
   */
  async unsubscribe(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return;
    }
    this.subscriptions.delete(subscriptionId);
    this.status.subscriptionCount = this.subscriptions.size;
    if (this.config.connectionType === "websocket" /* WEBSOCKET */ && this.connection) {
      this.sendWebSocketMessage({
        type: "unsubscribe",
        subscriptionId
      });
    }
    this.emit("subscription_removed", { subscriptionId });
    if (this.subscriptions.size === 0) {
      await this.disconnect();
    }
  }
  /**
   * Unsubscribe from all updates
   */
  async unsubscribeAll() {
    const subscriptionIds = Array.from(this.subscriptions.keys());
    for (const subscriptionId of subscriptionIds) {
      await this.unsubscribe(subscriptionId);
    }
  }
  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.status.isConnected,
      connectionType: this.config.connectionType,
      subscriptionCount: this.status.subscriptionCount
    };
  }
  /**
   * Disconnect from real-time updates
   */
  async disconnect() {
    this.status.isConnected = false;
    this.status.lastDisconnected = /* @__PURE__ */ new Date();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = void 0;
    }
    switch (this.config.connectionType) {
      case "websocket" /* WEBSOCKET */:
        if (this.connection instanceof WebSocket2) {
          this.connection.close();
        }
        break;
      case "sse" /* SERVER_SENT_EVENTS */:
        if (this.connection instanceof EventSource) {
          this.connection.close();
        }
        break;
      case "polling" /* POLLING */:
        if (this.pollingInterval) {
          clearInterval(this.pollingInterval);
          this.pollingInterval = void 0;
        }
        break;
    }
    this.connection = void 0;
    this.emit("disconnected");
  }
  /**
   * Initialize WebSocket connection
   */
  async initializeWebSocket() {
    return new Promise((resolve, reject) => {
      if (!this.config.endpoint) {
        reject(new Error("WebSocket endpoint not configured"));
        return;
      }
      const ws = new WebSocket2(this.config.endpoint, {
        headers: this.config.customHeaders
      });
      ws.on("open", () => {
        this.connection = ws;
        this.status.isConnected = true;
        this.status.lastConnected = /* @__PURE__ */ new Date();
        this.status.reconnectAttempts = 0;
        this.emit("connected");
        resolve();
      });
      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      });
      ws.on("close", () => {
        this.status.isConnected = false;
        this.status.lastDisconnected = /* @__PURE__ */ new Date();
        this.emit("disconnected");
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
  async initializeSSE() {
    return new Promise((resolve, reject) => {
      if (!this.config.endpoint) {
        reject(new Error("SSE endpoint not configured"));
        return;
      }
      const eventSource = new EventSource(this.config.endpoint);
      eventSource.onopen = () => {
        this.connection = eventSource;
        this.status.isConnected = true;
        this.status.lastConnected = /* @__PURE__ */ new Date();
        this.status.reconnectAttempts = 0;
        this.emit("connected");
        resolve();
      };
      eventSource.onmessage = (event) => {
        try {
          const updateEvent = JSON.parse(event.data);
          this.handleUpdateEvent(updateEvent);
        } catch (error) {
          console.error("Failed to parse SSE message:", error);
        }
      };
      eventSource.onerror = (error) => {
        console.error("SSE error:", error);
        this.status.isConnected = false;
        this.emit("error", error);
        this.attemptReconnect();
      };
    });
  }
  /**
   * Initialize polling mechanism
   */
  async initializePolling() {
    if (!this.config.endpoint) {
      throw new Error("Polling endpoint not configured");
    }
    const interval = this.config.pollingInterval || 5e3;
    let lastTimestamp = Date.now();
    const poll = async () => {
      try {
        const response = await fetch(
          `${this.config.endpoint}?since=${lastTimestamp}`,
          {
            headers: this.config.customHeaders
          }
        );
        if (!response.ok) {
          throw new Error(`Polling failed: ${response.statusText}`);
        }
        const events = await response.json();
        for (const event of events) {
          this.handleUpdateEvent(event);
        }
        lastTimestamp = Date.now();
        if (!this.status.isConnected) {
          this.status.isConnected = true;
          this.status.lastConnected = /* @__PURE__ */ new Date();
          this.status.reconnectAttempts = 0;
          this.emit("connected");
        }
      } catch (error) {
        console.error("Polling error:", error);
        this.status.isConnected = false;
        this.emit("error", error);
      }
    };
    this.pollingInterval = setInterval(poll, interval);
    await poll();
  }
  /**
   * Handle WebSocket messages
   */
  handleWebSocketMessage(message) {
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
  handleUpdateEvent(event) {
    for (const subscription of this.subscriptions.values()) {
      if (this.shouldDeliverEvent(subscription, event)) {
        try {
          subscription.callback(event);
        } catch (error) {
          console.error("Error in subscription callback:", error);
          this.emit("callback_error", {
            subscriptionId: subscription.id,
            error
          });
        }
      }
    }
    this.emit("event_received", event);
  }
  /**
   * Check if an event should be delivered to a subscription
   */
  shouldDeliverEvent(subscription, event) {
    if (!subscription.events.includes(event.type)) {
      return false;
    }
    if (subscription.filters && subscription.filters.length > 0) {
      return this.applyFiltersToEvent(event, subscription.filters);
    }
    return true;
  }
  /**
   * Apply filters to an event
   */
  applyFiltersToEvent(event, filters) {
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
          return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
        default:
          return true;
      }
    });
  }
  /**
   * Send WebSocket message
   */
  sendWebSocketMessage(message) {
    if (this.connection instanceof WebSocket2 && this.connection.readyState === WebSocket2.OPEN) {
      this.connection.send(JSON.stringify(message));
    }
  }
  /**
   * Attempt to reconnect
   */
  attemptReconnect() {
    const maxAttempts = this.config.reconnectAttempts || 5;
    const delay = this.config.reconnectDelay || 1e3;
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
    }, delay * this.status.reconnectAttempts);
  }
  /**
   * Generate unique subscription ID
   */
  generateSubscriptionId() {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  /**
   * Get nested value from object
   */
  getNestedValue(obj, path) {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }
};
var RealtimeManagerFactory = class {
  static createWebSocketManager(endpoint, options) {
    return new RealtimeManager({
      connectionType: "websocket" /* WEBSOCKET */,
      endpoint,
      customHeaders: options?.customHeaders,
      reconnectAttempts: options?.reconnectAttempts,
      reconnectDelay: options?.reconnectDelay
    });
  }
  static createSSEManager(endpoint, options) {
    return new RealtimeManager({
      connectionType: "sse" /* SERVER_SENT_EVENTS */,
      endpoint,
      customHeaders: options?.customHeaders,
      reconnectAttempts: options?.reconnectAttempts,
      reconnectDelay: options?.reconnectDelay
    });
  }
  static createPollingManager(endpoint, options) {
    return new RealtimeManager({
      connectionType: "polling" /* POLLING */,
      endpoint,
      pollingInterval: options?.pollingInterval,
      customHeaders: options?.customHeaders
    });
  }
};

// src/metadata/metadata-calculator.ts
var DEFAULT_CONFIG = {
  version: "1.0.0",
  builtinRules: {
    totalCards: true,
    totalCost: true,
    averageCost: true,
    rarityDistribution: true,
    typeDistribution: true,
    colorDistribution: true,
    setDistribution: true,
    averagePower: true,
    averageToughness: true
  },
  customRules: [],
  distributionRules: [],
  powerLevelRules: [],
  customMetrics: [],
  settings: {
    includeEmptyValues: false,
    roundingPrecision: 2,
    cacheResults: true,
    cacheTtl: 300
    // 5 minutes
  }
};
var MetadataCalculator = class {
  constructor(config) {
    __publicField(this, "config");
    __publicField(this, "customCalculators", /* @__PURE__ */ new Map());
    __publicField(this, "cache", /* @__PURE__ */ new Map());
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registerBuiltinCalculators();
  }
  /**
   * Calculate metadata for a collection of cards
   */
  async calculate(cards, config) {
    const startTime = Date.now();
    const calculationConfig = config ? { ...this.config, ...config } : this.config;
    const cacheKey = this.generateCacheKey(cards, calculationConfig);
    if (calculationConfig.settings.cacheResults) {
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        return {
          metadata: cached,
          calculationTime: Date.now() - startTime,
          rulesApplied: ["cached"]
        };
      }
    }
    const metadata = {
      totalCards: 0,
      totalCost: 0,
      averageCost: 0,
      rarityDistribution: {},
      typeDistribution: {},
      setDistribution: {},
      customMetrics: {}
    };
    const rulesApplied = [];
    const errors = [];
    const warnings = [];
    try {
      if (calculationConfig.builtinRules.totalCards) {
        metadata.totalCards = this.calculateTotalCards(cards);
        rulesApplied.push("totalCards");
      }
      if (calculationConfig.builtinRules.totalCost) {
        metadata.totalCost = this.calculateTotalCost(cards);
        rulesApplied.push("totalCost");
      }
      if (calculationConfig.builtinRules.averageCost) {
        metadata.averageCost = this.calculateAverageCost(cards);
        rulesApplied.push("averageCost");
      }
      if (calculationConfig.builtinRules.rarityDistribution) {
        metadata.rarityDistribution = this.calculateRarityDistribution(cards);
        rulesApplied.push("rarityDistribution");
      }
      if (calculationConfig.builtinRules.typeDistribution) {
        metadata.typeDistribution = this.calculateTypeDistribution(cards);
        rulesApplied.push("typeDistribution");
      }
      if (calculationConfig.builtinRules.colorDistribution) {
        metadata.colorDistribution = this.calculateColorDistribution(cards);
        rulesApplied.push("colorDistribution");
      }
      if (calculationConfig.builtinRules.setDistribution) {
        metadata.setDistribution = this.calculateSetDistribution(cards);
        rulesApplied.push("setDistribution");
      }
      if (calculationConfig.builtinRules.averagePower) {
        metadata.averagePower = this.calculateAveragePower(cards);
        rulesApplied.push("averagePower");
      }
      if (calculationConfig.builtinRules.averageToughness) {
        metadata.averageToughness = this.calculateAverageToughness(cards);
        rulesApplied.push("averageToughness");
      }
      for (const rule of calculationConfig.customRules) {
        if (rule.enabled) {
          try {
            const result = await this.calculateWithRule(cards, rule);
            metadata.customMetrics[rule.output.key] = result;
            rulesApplied.push(rule.id);
          } catch (error) {
            errors.push(`Failed to apply rule '${rule.id}': ${error}`);
          }
        }
      }
      for (const rule of calculationConfig.powerLevelRules) {
        if (rule.enabled) {
          try {
            metadata.powerLevel = this.calculatePowerLevel(cards, rule);
            rulesApplied.push(rule.id);
          } catch (error) {
            errors.push(
              `Failed to apply power level rule '${rule.id}': ${error}`
            );
          }
        }
      }
      this.roundMetadata(
        metadata,
        calculationConfig.settings.roundingPrecision
      );
      if (calculationConfig.settings.cacheResults) {
        this.setCachedResult(
          cacheKey,
          metadata,
          calculationConfig.settings.cacheTtl
        );
      }
    } catch (error) {
      errors.push(`Calculation failed: ${error}`);
    }
    return {
      metadata,
      calculationTime: Date.now() - startTime,
      rulesApplied,
      errors: errors.length > 0 ? errors : void 0,
      warnings: warnings.length > 0 ? warnings : void 0
    };
  }
  /**
   * Calculate metadata with a specific rule
   */
  async calculateWithRule(cards, rule) {
    let filteredCards = cards;
    if (rule.conditions && rule.conditions.length > 0) {
      filteredCards = this.applyConditions(cards, rule.conditions);
    }
    switch (rule.aggregation) {
      case "sum" /* SUM */:
        return this.sum(filteredCards, rule.field);
      case "average" /* AVERAGE */:
        return this.average(filteredCards, rule.field);
      case "count" /* COUNT */:
        return filteredCards.length;
      case "min" /* MIN */:
        return this.min(filteredCards, rule.field);
      case "max" /* MAX */:
        return this.max(filteredCards, rule.field);
      case "median" /* MEDIAN */:
        return this.median(filteredCards, rule.field);
      case "mode" /* MODE */:
        return this.mode(filteredCards, rule.field);
      case "unique_count" /* UNIQUE_COUNT */:
        return this.uniqueCount(filteredCards, rule.field);
      case "custom" /* CUSTOM */:
        if (rule.customCalculator) {
          return rule.customCalculator(filteredCards);
        }
        throw new Error("Custom calculator not provided");
      default:
        throw new Error(`Unsupported aggregation type: ${rule.aggregation}`);
    }
  }
  /**
   * Validate a metadata configuration
   */
  validateConfig(config) {
    const errors = [];
    if (!config.version) {
      errors.push("Version is required");
    }
    for (const rule of config.customRules) {
      if (!rule.id || !rule.name) {
        errors.push(`Rule missing id or name: ${JSON.stringify(rule)}`);
      }
      if (!rule.field && rule.aggregation !== "custom" /* CUSTOM */) {
        errors.push(`Rule '${rule.id}' missing field`);
      }
      if (rule.aggregation === "custom" /* CUSTOM */ && !rule.customCalculator) {
        errors.push(
          `Rule '${rule.id}' requires customCalculator for CUSTOM aggregation`
        );
      }
    }
    if (config.settings.roundingPrecision !== void 0 && config.settings.roundingPrecision < 0) {
      errors.push("Rounding precision must be non-negative");
    }
    if (config.settings.cacheTtl !== void 0 && config.settings.cacheTtl <= 0) {
      errors.push("Cache TTL must be positive");
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  /**
   * Get available built-in calculators
   */
  getBuiltinCalculators() {
    const calculators = {};
    for (const [key, value] of this.customCalculators) {
      calculators[key] = value;
    }
    return calculators;
  }
  /**
   * Register a custom calculator
   */
  registerCustomCalculator(id, calculator) {
    this.customCalculators.set(id, calculator);
  }
  /**
   * Get the current configuration
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * Update the configuration
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
  }
  // Private helper methods
  calculateTotalCards(cards) {
    return cards.length;
  }
  calculateTotalCost(cards) {
    return cards.reduce((total, card) => total + (card.cost || 0), 0);
  }
  calculateAverageCost(cards) {
    if (cards.length === 0)
      return 0;
    return this.calculateTotalCost(cards) / cards.length;
  }
  calculateRarityDistribution(cards) {
    const distribution = {
      ["common" /* COMMON */]: 0,
      ["uncommon" /* UNCOMMON */]: 0,
      ["rare" /* RARE */]: 0,
      ["epic" /* EPIC */]: 0,
      ["legendary" /* LEGENDARY */]: 0,
      ["mythic" /* MYTHIC */]: 0
    };
    for (const card of cards) {
      if (card.rarity in distribution) {
        distribution[card.rarity]++;
      }
    }
    return distribution;
  }
  calculateTypeDistribution(cards) {
    const distribution = {
      ["creature" /* CREATURE */]: 0,
      ["spell" /* SPELL */]: 0,
      ["artifact" /* ARTIFACT */]: 0,
      ["enchantment" /* ENCHANTMENT */]: 0,
      ["land" /* LAND */]: 0,
      ["planeswalker" /* PLANESWALKER */]: 0
    };
    for (const card of cards) {
      if (card.type in distribution) {
        distribution[card.type]++;
      }
    }
    return distribution;
  }
  calculateColorDistribution(cards) {
    const distribution = {};
    for (const card of cards) {
      if (card.colors) {
        for (const color of card.colors) {
          distribution[color] = (distribution[color] || 0) + 1;
        }
      }
    }
    return distribution;
  }
  calculateSetDistribution(cards) {
    const distribution = {};
    for (const card of cards) {
      const setId = card.setId || "unknown";
      distribution[setId] = (distribution[setId] || 0) + 1;
    }
    return distribution;
  }
  calculateAveragePower(cards) {
    const creaturesWithPower = cards.filter(
      (card) => card.type === "creature" /* CREATURE */ && typeof card.power === "number"
    );
    if (creaturesWithPower.length === 0)
      return 0;
    const totalPower = creaturesWithPower.reduce(
      (total, card) => total + (card.power || 0),
      0
    );
    return totalPower / creaturesWithPower.length;
  }
  calculateAverageToughness(cards) {
    const creaturesWithToughness = cards.filter(
      (card) => card.type === "creature" /* CREATURE */ && typeof card.toughness === "number"
    );
    if (creaturesWithToughness.length === 0)
      return 0;
    const totalToughness = creaturesWithToughness.reduce(
      (total, card) => total + (card.toughness || 0),
      0
    );
    return totalToughness / creaturesWithToughness.length;
  }
  calculatePowerLevel(cards, _rule) {
    let powerLevel = 0;
    for (const card of cards) {
      let cardPower = 0;
      if (card.cost) {
        cardPower += card.cost * 0.5;
      }
      if (card.power) {
        cardPower += card.power * 0.3;
      }
      if (card.toughness) {
        cardPower += card.toughness * 0.2;
      }
      const rarityMultipliers = {
        ["common" /* COMMON */]: 1,
        ["uncommon" /* UNCOMMON */]: 1.2,
        ["rare" /* RARE */]: 1.5,
        ["epic" /* EPIC */]: 1.8,
        ["legendary" /* LEGENDARY */]: 2.2,
        ["mythic" /* MYTHIC */]: 2.5
      };
      cardPower *= rarityMultipliers[card.rarity] || 1;
      powerLevel += cardPower;
    }
    return powerLevel / Math.max(cards.length, 1);
  }
  applyConditions(cards, conditions) {
    return cards.filter((card) => {
      return conditions.every((condition) => {
        const value = this.getNestedValue(card, condition.field);
        switch (condition.operator) {
          case "eq":
            return value === condition.value;
          case "neq":
            return value !== condition.value;
          case "gt":
            return Number(value) > Number(condition.value);
          case "gte":
            return Number(value) >= Number(condition.value);
          case "lt":
            return Number(value) < Number(condition.value);
          case "lte":
            return Number(value) <= Number(condition.value);
          case "in":
            return Array.isArray(condition.value) && condition.value.includes(value);
          case "nin":
            return Array.isArray(condition.value) && !condition.value.includes(value);
          case "contains":
            return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
          case "regex":
            return new RegExp(condition.value).test(String(value));
          default:
            return true;
        }
      });
    });
  }
  sum(cards, field) {
    return cards.reduce((total, card) => {
      const value = this.getNestedValue(card, field);
      return total + (Number(value) || 0);
    }, 0);
  }
  average(cards, field) {
    if (cards.length === 0)
      return 0;
    return this.sum(cards, field) / cards.length;
  }
  min(cards, field) {
    const values = cards.map(
      (card) => Number(this.getNestedValue(card, field)) || 0
    );
    return values.length > 0 ? Math.min(...values) : 0;
  }
  max(cards, field) {
    const values = cards.map(
      (card) => Number(this.getNestedValue(card, field)) || 0
    );
    return values.length > 0 ? Math.max(...values) : 0;
  }
  median(cards, field) {
    const values = cards.map((card) => Number(this.getNestedValue(card, field))).filter((value) => !isNaN(value)).sort((a, b) => a - b);
    if (values.length === 0)
      return 0;
    const mid = Math.floor(values.length / 2);
    return values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
  }
  mode(cards, field) {
    const frequency = {};
    for (const card of cards) {
      const value = String(this.getNestedValue(card, field));
      frequency[value] = (frequency[value] || 0) + 1;
    }
    let maxCount = 0;
    let mode;
    for (const [value, count] of Object.entries(frequency)) {
      if (count > maxCount) {
        maxCount = count;
        mode = value;
      }
    }
    return mode;
  }
  uniqueCount(cards, field) {
    const unique = /* @__PURE__ */ new Set();
    for (const card of cards) {
      const value = this.getNestedValue(card, field);
      unique.add(value);
    }
    return unique.size;
  }
  getNestedValue(obj, path) {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }
  roundMetadata(metadata, precision) {
    const round = (value) => Number(value.toFixed(precision));
    if (typeof metadata.totalCost === "number") {
      metadata.totalCost = round(metadata.totalCost);
    }
    if (typeof metadata.averageCost === "number") {
      metadata.averageCost = round(metadata.averageCost);
    }
    if (typeof metadata.averagePower === "number") {
      metadata.averagePower = round(metadata.averagePower);
    }
    if (typeof metadata.averageToughness === "number") {
      metadata.averageToughness = round(metadata.averageToughness);
    }
    if (typeof metadata.powerLevel === "number") {
      metadata.powerLevel = round(metadata.powerLevel);
    }
  }
  generateCacheKey(cards, config) {
    const cardIds = cards.map((card) => `${card.contractAddress}:${card.tokenId}`).sort().join(",");
    const configHash = JSON.stringify(config);
    let hash = 0;
    const input = cardIds + configHash;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
  getCachedResult(key) {
    const cached = this.cache.get(key);
    if (!cached)
      return null;
    const now = Date.now();
    if (now - cached.timestamp > this.config.settings.cacheTtl * 1e3) {
      this.cache.delete(key);
      return null;
    }
    return cached.data;
  }
  setCachedResult(key, metadata, ttl) {
    this.cache.set(key, {
      data: metadata,
      timestamp: Date.now()
    });
    if (this.cache.size > 1e3) {
      const cutoff = Date.now() - ttl * 1e3;
      for (const [cacheKey, cached] of this.cache.entries()) {
        if (cached.timestamp < cutoff) {
          this.cache.delete(cacheKey);
        }
      }
    }
  }
  registerBuiltinCalculators() {
    this.registerCustomCalculator("deck_power", (cards) => {
      return cards.reduce((total, card) => {
        const cardPower = (card.power || 0) + (card.toughness || 0) + (card.cost || 0);
        return total + cardPower;
      }, 0);
    });
    this.registerCustomCalculator("creature_ratio", (cards) => {
      const creatures = cards.filter((card) => card.type === "creature" /* CREATURE */);
      return cards.length > 0 ? creatures.length / cards.length : 0;
    });
  }
};

// src/metadata/template-manager.ts
var TemplateManager = class {
  constructor() {
    __publicField(this, "templates", /* @__PURE__ */ new Map());
    this.registerBuiltinTemplates();
  }
  getTemplates() {
    return Array.from(this.templates.values());
  }
  getTemplate(id) {
    return this.templates.get(id) || null;
  }
  createTemplate(template) {
    const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullTemplate = { ...template, id };
    this.templates.set(id, fullTemplate);
    return id;
  }
  updateTemplate(id, template) {
    const existing = this.templates.get(id);
    if (!existing)
      return false;
    this.templates.set(id, { ...existing, ...template, id });
    return true;
  }
  deleteTemplate(id) {
    return this.templates.delete(id);
  }
  searchTemplates(query, tags) {
    const allTemplates = Array.from(this.templates.values());
    return allTemplates.filter((template) => {
      const matchesQuery = !query || template.name.toLowerCase().includes(query.toLowerCase()) || template.description.toLowerCase().includes(query.toLowerCase());
      const matchesTags = !tags || tags.length === 0 || tags.some((tag) => template.tags.includes(tag));
      return matchesQuery && matchesTags;
    });
  }
  registerBuiltinTemplates() {
    this.templates.set(BuiltinTemplates.BASIC, {
      id: BuiltinTemplates.BASIC,
      name: "Basic Analysis",
      description: "Basic card statistics and distributions",
      config: {
        version: "1.0.0",
        builtinRules: {
          totalCards: true,
          totalCost: true,
          averageCost: true,
          rarityDistribution: true,
          typeDistribution: true,
          colorDistribution: false,
          setDistribution: true,
          averagePower: false,
          averageToughness: false
        },
        customRules: [],
        distributionRules: [],
        powerLevelRules: [],
        customMetrics: [],
        settings: {
          includeEmptyValues: false,
          roundingPrecision: 2,
          cacheResults: true,
          cacheTtl: 300
        }
      },
      tags: ["basic", "simple"]
    });
  }
};

// src/collections/collection-manager.ts
var SimpleCollectionManager = class {
  constructor(metadataCalculator) {
    this.metadataCalculator = metadataCalculator;
  }
  async createCollection(name, cards, options) {
    const collection = {
      id: `collection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: options?.description,
      cards: [...cards],
      creator: "unknown",
      // Would need to be passed in or determined from context
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date(),
      tags: options?.tags,
      isPublic: false
    };
    if (options?.generateMetadata) {
      const result = await this.generateMetadata(cards, options.metadataConfig);
      collection.metadata = result.metadata;
    }
    return collection;
  }
  async updateCollection(collection, updates) {
    const updated = {
      ...collection,
      ...updates,
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (updates.cards && collection.metadata) {
      const result = await this.generateMetadata(updated.cards);
      updated.metadata = result.metadata;
    }
    return updated;
  }
  async generateMetadata(cards, config) {
    return this.metadataCalculator.calculate(cards, config);
  }
  async validateCollection(collection) {
    const errors = [];
    const warnings = [];
    const cardIds = /* @__PURE__ */ new Set();
    const duplicates = /* @__PURE__ */ new Set();
    for (const card of collection.cards) {
      const cardId = `${card.contractAddress}:${card.tokenId}`;
      if (cardIds.has(cardId)) {
        duplicates.add(cardId);
      }
      cardIds.add(cardId);
    }
    if (duplicates.size > 0) {
      warnings.push(
        `Duplicate cards found: ${Array.from(duplicates).join(", ")}`
      );
    }
    for (let i = 0; i < collection.cards.length; i++) {
      const card = collection.cards[i];
      if (!card.tokenId || !card.contractAddress) {
        errors.push(
          `Card at index ${i} missing required fields (tokenId, contractAddress)`
        );
      }
      if (!card.name) {
        warnings.push(`Card at index ${i} missing name`);
      }
    }
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  async exportCollection(collection, format) {
    switch (format) {
      case "json":
        return JSON.stringify(collection, null, 2);
      case "txt":
        return this.exportToText(collection);
      case "csv":
        return this.exportToCsv(collection);
      default:
        throw new Error(`Export format '${format}' not yet implemented`);
    }
  }
  async importCollection(data, format) {
    switch (format) {
      case "json":
        return JSON.parse(data);
      default:
        throw new Error(`Import format '${format}' not yet implemented`);
    }
  }
  exportToText(collection) {
    let output = `${collection.name}
`;
    output += `${"=".repeat(collection.name.length)}

`;
    if (collection.description) {
      output += `${collection.description}

`;
    }
    const cardsByType = /* @__PURE__ */ new Map();
    for (const card of collection.cards) {
      const type = card.type || "Unknown";
      if (!cardsByType.has(type)) {
        cardsByType.set(type, []);
      }
      cardsByType.get(type).push(card);
    }
    for (const [type, cards] of cardsByType) {
      output += `${type.charAt(0).toUpperCase() + type.slice(1)}s (${cards.length})
`;
      output += `-${"-".repeat(type.length + 8)}
`;
      for (const card of cards) {
        const cost = card.cost !== void 0 ? ` [${card.cost}]` : "";
        const power = card.power !== void 0 && card.toughness !== void 0 ? ` (${card.power}/${card.toughness})` : "";
        output += `${card.name}${cost}${power}
`;
      }
      output += "\n";
    }
    if (collection.metadata) {
      output += "Statistics\n";
      output += "----------\n";
      output += `Total Cards: ${collection.metadata.totalCards}
`;
      output += `Total Cost: ${collection.metadata.totalCost}
`;
      output += `Average Cost: ${collection.metadata.averageCost?.toFixed(
        2
      )}
`;
      if (collection.metadata.powerLevel) {
        output += `Power Level: ${collection.metadata.powerLevel.toFixed(2)}
`;
      }
    }
    return output;
  }
  exportToCsv(collection) {
    const headers = [
      "Name",
      "Type",
      "Rarity",
      "Cost",
      "Power",
      "Toughness",
      "Set",
      "Token ID",
      "Contract Address"
    ];
    let csv = headers.join(",") + "\n";
    for (const card of collection.cards) {
      const row = [
        this.escapeCsv(card.name),
        this.escapeCsv(card.type),
        this.escapeCsv(card.rarity),
        card.cost?.toString() || "",
        card.power?.toString() || "",
        card.toughness?.toString() || "",
        this.escapeCsv(card.setName || ""),
        this.escapeCsv(card.tokenId),
        this.escapeCsv(card.contractAddress)
      ];
      csv += row.join(",") + "\n";
    }
    return csv;
  }
  escapeCsv(value) {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
};

// src/sdk/tcg-protocol.ts
var TCGProtocolImpl = class extends EventEmitter2 {
  constructor(config) {
    super();
    __publicField(this, "config");
    __publicField(this, "providerMap", /* @__PURE__ */ new Map());
    __publicField(this, "defaultProvider");
    // Core managers
    __publicField(this, "cards");
    __publicField(this, "collections");
    __publicField(this, "metadata");
    __publicField(this, "realtime");
    __publicField(this, "templates");
    // Provider management
    __publicField(this, "providerManager", {
      getActiveProvider: () => {
        if (!this.defaultProvider) {
          throw new Error("No active provider available");
        }
        return this.defaultProvider;
      },
      getProvider: (type) => {
        return this.providerMap.get(type) || null;
      },
      addProvider: async (config) => {
        const provider = await this.createProvider(config);
        await provider.initialize();
        this.providerMap.set(config.type, provider);
        this.emit(SDKEvents.PROVIDER_ADDED, { type: config.type });
        return provider;
      },
      removeProvider: async (type) => {
        const provider = this.providerMap.get(type);
        if (provider) {
          await provider.disconnect();
          this.providerMap.delete(type);
          if (this.defaultProvider === provider) {
            const remainingProviders = Array.from(this.providerMap.values());
            this.defaultProvider = remainingProviders[0] || void 0;
          }
          this.emit(SDKEvents.PROVIDER_REMOVED, { type });
        }
      },
      setDefaultProvider: (type) => {
        const provider = this.providerMap.get(type);
        if (!provider) {
          throw new Error(`Provider of type '${type}' not found`);
        }
        this.defaultProvider = provider;
      }
    });
    // Utilities
    __publicField(this, "utils", {
      validateWallet: (address) => {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
      },
      formatCard: (card, format = "short") => {
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
      generateCollectionHash: (cards) => {
        const cardIds = cards.map((card) => `${card.contractAddress}:${card.tokenId}`).sort().join(",");
        let hash = 0;
        for (let i = 0; i < cardIds.length; i++) {
          const char = cardIds.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
      },
      parseImportData: async (_data, _format) => {
        throw new Error("Import functionality not yet implemented");
      },
      getSupportedNetworks: () => {
        return {
          1: "Ethereum",
          137: "Polygon",
          80001: "Polygon Mumbai"
        };
      }
    });
    this.config = config;
    this.metadata = new MetadataCalculator();
    this.templates = new TemplateManager();
    this.realtime = new RealtimeManager(
      config.realtime || {
        connectionType: "polling",
        pollingInterval: 1e4
      }
    );
    this.collections = new SimpleCollectionManager(this.metadata);
    this.cards = new CardSearcherImpl(this);
  }
  /**
   * Initialize the SDK
   */
  async initialize() {
    try {
      for (const providerConfig of this.config.providers) {
        const provider = await this.createProvider(providerConfig);
        await provider.initialize();
        this.providerMap.set(providerConfig.type, provider);
      }
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
  getConfig() {
    return { ...this.config };
  }
  /**
   * Update configuration
   */
  async updateConfig(config) {
    this.config = { ...this.config, ...config };
    this.emit(SDKEvents.CONFIG_UPDATED, this.config);
  }
  /**
   * Disconnect and cleanup
   */
  async disconnect() {
    for (const provider of this.providerMap.values()) {
      await provider.disconnect();
    }
    await this.realtime.disconnect();
    this.providerMap.clear();
    this.defaultProvider = void 0;
  }
  /**
   * Get health status
   */
  async getHealth() {
    const providers = {};
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
      lastCheck: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Create a provider instance
   */
  async createProvider(config) {
    switch (config.type) {
      case "web3_direct" /* WEB3_DIRECT */:
        return new Web3Provider(config);
      case "indexing_service" /* INDEXING_SERVICE */:
      case "subgraph" /* SUBGRAPH */:
      case "rest_api" /* REST_API */:
      case "graphql_api" /* GRAPHQL_API */:
        throw new Error(`Provider type '${config.type}' not yet implemented`);
      default:
        throw new Error(`Unsupported provider type: ${config.type}`);
    }
  }
  get providers() {
    return this.providerManager;
  }
};
var CardSearcherImpl = class {
  constructor(sdk) {
    this.sdk = sdk;
  }
  async search(query) {
    const provider = this.sdk.providerManager.getActiveProvider();
    if (query.filters && query.filters.length > 0) {
      return provider.searchCards(query.filters, query.sort, query.pagination);
    } else {
      throw new Error("Search without filters not yet implemented");
    }
  }
  async getCardsByWallet(wallet, query) {
    const provider = this.sdk.providerManager.getActiveProvider();
    return provider.getCardsByWallet(
      wallet,
      query?.filters,
      query?.sort,
      query?.pagination
    );
  }
  async getCard(contractAddress, tokenId) {
    const provider = this.sdk.providerManager.getActiveProvider();
    return provider.getCard(contractAddress, tokenId);
  }
  async getCardsByContract(contractAddress, query) {
    const provider = this.sdk.providerManager.getActiveProvider();
    return provider.getCardsByContract(
      contractAddress,
      query?.filters,
      query?.sort,
      query?.pagination
    );
  }
  async getCardsBySet(setId, query) {
    const provider = this.sdk.providerManager.getActiveProvider();
    return provider.getCardsBySet(
      setId,
      query?.filters,
      query?.sort,
      query?.pagination
    );
  }
  async advancedSearch(criteria) {
    let filters = criteria.filters || [];
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
  async getFilterableFields() {
    const fieldRegistry = cardFilterEngine.getFieldRegistry();
    const result = {};
    for (const [field, info] of Object.entries(fieldRegistry)) {
      result[field] = {
        type: info.type,
        enum: info.enum,
        description: info.description
      };
    }
    return result;
  }
};

// src/sdk/factory.ts
var DEFAULT_CONFIG2 = {
  settings: {
    enableCaching: true,
    cacheSize: 1e3,
    cacheTtl: 300,
    // 5 minutes
    enableLogging: true,
    logLevel: "info",
    retryAttempts: 3,
    retryDelay: 1e3,
    timeout: 3e4
    // 30 seconds
  }
};
var TCGProtocolFactoryImpl = class {
  /**
   * Create a new SDK instance with the provided configuration
   */
  async create(config) {
    const validation = this.validateConfig(config);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(", ")}`);
    }
    const mergedConfig = this.mergeWithDefaults(config);
    const sdk = new TCGProtocolImpl(mergedConfig);
    await sdk.initialize();
    return sdk;
  }
  /**
   * Create SDK with default configuration for quick setup
   */
  async createDefault() {
    const defaultConfig = {
      providers: [
        {
          type: "web3_direct" /* WEB3_DIRECT */,
          networkConfig: SUPPORTED_NETWORKS[80001],
          // Polygon Mumbai testnet
          contractAddresses: []
          // Will need to be provided by user
        }
      ],
      defaultProvider: "web3_direct" /* WEB3_DIRECT */,
      ...DEFAULT_CONFIG2
    };
    return this.create(defaultConfig);
  }
  /**
   * Get available provider types
   */
  getAvailableProviders() {
    return Object.values(ProviderType);
  }
  /**
   * Validate configuration
   */
  validateConfig(config) {
    const errors = [];
    if (!config.providers || config.providers.length === 0) {
      errors.push("At least one provider must be configured");
    }
    if (config.providers) {
      config.providers.forEach((provider, index) => {
        const providerErrors = this.validateProviderConfig(provider);
        if (providerErrors.length > 0) {
          errors.push(`Provider ${index}: ${providerErrors.join(", ")}`);
        }
      });
    }
    if (config.defaultProvider) {
      const hasDefaultProvider = config.providers?.some(
        (p) => p.type === config.defaultProvider
      );
      if (!hasDefaultProvider) {
        errors.push("Default provider type not found in providers list");
      }
    }
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
      errors
    };
  }
  /**
   * Validate individual provider configuration
   */
  validateProviderConfig(provider) {
    const errors = [];
    switch (provider.type) {
      case "web3_direct" /* WEB3_DIRECT */:
        if (!provider.networkConfig) {
          errors.push("Network configuration is required for Web3 provider");
        }
        if (!provider.contractAddresses || provider.contractAddresses.length === 0) {
          errors.push("Contract addresses are required for Web3 provider");
        }
        break;
      case "indexing_service" /* INDEXING_SERVICE */:
        if (!provider.baseUrl) {
          errors.push("Base URL is required for indexing service provider");
        }
        if (!provider.chainId) {
          errors.push("Chain ID is required for indexing service provider");
        }
        break;
      case "subgraph" /* SUBGRAPH */:
        if (!provider.subgraphUrl) {
          errors.push("Subgraph URL is required for subgraph provider");
        }
        if (!provider.chainId) {
          errors.push("Chain ID is required for subgraph provider");
        }
        break;
      case "rest_api" /* REST_API */:
        if (!provider.baseUrl) {
          errors.push("Base URL is required for REST API provider");
        }
        break;
      case "graphql_api" /* GRAPHQL_API */:
        if (!provider.endpoint) {
          errors.push("Endpoint is required for GraphQL API provider");
        }
        break;
      default:
        errors.push(`Unsupported provider type: ${provider.type}`);
    }
    return errors;
  }
  /**
   * Merge user configuration with defaults
   */
  mergeWithDefaults(config) {
    return {
      ...DEFAULT_CONFIG2,
      ...config,
      settings: {
        ...DEFAULT_CONFIG2.settings,
        ...config.settings
      }
    };
  }
};
var factoryInstance = new TCGProtocolFactoryImpl();
async function createTCGProtocol(config) {
  return factoryInstance.create(config);
}

// src/index.ts
var VERSION = "0.1.0";
export {
  AggregationType,
  BUILTIN_PRESETS,
  BuiltinTemplates,
  CardRarity,
  CardType,
  FilterEngine,
  FilterOperator,
  GraphQLAPI,
  LogicalOperator,
  MetadataCalculator,
  ProviderType,
  RealtimeConnectionType,
  RealtimeManager,
  RealtimeManagerFactory,
  RestAPI,
  SDKEvents,
  SUPPORTED_NETWORKS,
  SimpleCollectionManager,
  SortDirection,
  TCGProtocolImpl,
  TemplateManager,
  UnifiedAPIFactory,
  UpdateType,
  VERSION,
  Web3Provider,
  Web3ProviderFactory,
  cardFilterEngine,
  createTCGProtocol
};
