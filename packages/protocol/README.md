# TCG Protocol SDK

A flexible and extensible TypeScript SDK for managing Trading Card Game (TCG) cards, collections, and metadata across multiple blockchains.

## Features

### ✨ Core Capabilities

- **Multi-Blockchain Support**: Starting with Polygon, easily expandable to other networks
- **Flexible Data Sources**: Support for direct Web3 calls, indexing services, subgraphs, REST APIs, and GraphQL APIs
- **Advanced Filtering & Sorting**: Highly extensible system with custom filters and sorting mechanisms
- **Real-Time Updates**: Choose between WebSockets, Server-Sent Events, or polling
- **Configuration-Driven Metadata**: Flexible metadata generation based on customizable rules
- **Collection Management**: Create, manage, and analyze card collections with auto-generated insights
- **Developer-Friendly**: Works with any wallet, supports both hosted and self-hosted scenarios

### 🚀 Quick Start

#### Installation

```bash
npm install @tcg-magic/protocol
```

#### Basic Usage

```typescript
import { createTCGProtocol, QuickSetup } from "@tcg-magic/protocol";

// Quick setup for Polygon mainnet
const sdk = await QuickSetup.forPolygon([
  "0x1234...", // Your contract address
  "0x5678...", // Another contract address
]);

// Get cards owned by a wallet
const cards = await sdk.cards.getCardsByWallet("0xwallet...");
console.log(`Found ${cards.data.length} cards`);

// Search for rare cards
const rareCards = await sdk.cards.advancedSearch({
  filters: [
    { field: "rarity", operator: "in", value: ["rare", "legendary", "mythic"] },
  ],
  sort: [{ field: "rarity", direction: "desc" }],
});
```

### 🔧 Configuration

#### Basic Configuration

```typescript
import { createTCGProtocol, ProviderType } from "@tcg-magic/protocol";

const sdk = await createTCGProtocol({
  providers: [
    {
      type: ProviderType.WEB3_DIRECT,
      networkConfig: {
        chainId: 137,
        name: "Polygon",
        rpcUrl: "https://polygon-rpc.com",
        nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
      },
      contractAddresses: ["0x1234..."],
    },
  ],
  defaultProvider: ProviderType.WEB3_DIRECT,
  settings: {
    enableCaching: true,
    cacheSize: 1000,
    cacheTtl: 300,
    enableLogging: true,
    logLevel: "info",
  },
});
```

#### Advanced Configuration with Multiple Providers

```typescript
import { createConfigBuilder } from "@tcg-magic/protocol";

const sdk = await createConfigBuilder()
  .addWeb3Provider(137, ["0x1234..."]) // Polygon mainnet
  .addRestProvider("https://api.example.com", "your-api-key")
  .addGraphQLProvider("https://graphql.example.com")
  .setDefaultProvider(ProviderType.WEB3_DIRECT)
  .enableRealtime("websocket", "wss://realtime.example.com")
  .setSettings({
    enableCaching: true,
    retryAttempts: 3,
    timeout: 30000,
  })
  .create();
```

### 📊 Card Management

#### Searching and Filtering

```typescript
// Basic card search
const cards = await sdk.cards.getCardsByWallet("0xwallet...");

// Advanced filtering
const expensiveCreatures = await sdk.cards.advancedSearch({
  text: "dragon", // Text search in name, description, abilities
  filters: [
    { field: "type", operator: "eq", value: "creature" },
    { field: "cost", operator: "gte", value: 5 },
    { field: "rarity", operator: "in", value: ["rare", "legendary"] },
  ],
  sort: [
    { field: "cost", direction: "desc" },
    { field: "power", direction: "desc" },
  ],
  pagination: { page: 1, limit: 20 },
});

// Get cards from specific set
const setCards = await sdk.cards.getCardsBySet("SET001");

// Get cards from specific contract
const contractCards = await sdk.cards.getCardsByContract("0x1234...");
```

#### Custom Filters

```typescript
// Register a custom filter
import { cardFilterEngine } from "@tcg-magic/protocol";

cardFilterEngine.registerFilter(
  "power_greater_than_cost",
  (item, value) => {
    return (item.power || 0) > (item.cost || 0);
  },
  {
    description: "Cards where power is greater than cost",
    supportedTypes: ["object"],
  }
);

// Use the custom filter
const efficientCards = await sdk.cards.advancedSearch({
  filters: [
    { field: "power", operator: "power_greater_than_cost", value: true },
  ],
});
```

### 🗂️ Collection Management

```typescript
// Create a collection
const collection = await sdk.collections.createCollection(
  "My Legendary Deck",
  selectedCards,
  {
    description: "A powerful deck with legendary creatures",
    tags: ["competitive", "legendary"],
    generateMetadata: true,
  }
);

console.log("Collection metadata:", collection.metadata);
// Output: totalCards, averageCost, rarityDistribution, etc.

// Validate a collection
const validation = await sdk.collections.validateCollection(collection);
if (!validation.isValid) {
  console.log("Issues found:", validation.errors);
}

// Export collection
const decklistText = await sdk.collections.exportCollection(collection, "txt");
console.log(decklistText);
```

### 📈 Metadata Generation

#### Using Built-in Templates

```typescript
// Use a predefined metadata template
const metadata = await sdk.metadata.calculate(cards, {
  template: "competitive", // Built-in template for competitive analysis
});

console.log("Power level:", metadata.metadata.powerLevel);
console.log("Mana curve:", metadata.metadata.costDistribution);
```

#### Custom Metadata Rules

```typescript
// Define custom metadata rules
const customConfig = {
  version: "1.0",
  builtinRules: {
    totalCards: true,
    rarityDistribution: true,
    // ... other built-in rules
  },
  customRules: [
    {
      id: "average_power",
      name: "Average Power",
      enabled: true,
      field: "power",
      aggregation: "average",
      conditions: [{ field: "type", operator: "eq", value: "creature" }],
      output: {
        key: "averageCreaturePower",
        type: "number",
        format: "0.00",
      },
    },
  ],
};

const result = await sdk.metadata.calculate(cards, customConfig);
console.log("Average creature power:", result.metadata.averageCreaturePower);
```

### ⚡ Real-Time Updates

#### WebSocket Subscriptions

```typescript
// Subscribe to wallet updates
const subscriptionId = await sdk.realtime.subscribeToWallet(
  "0xwallet...",
  (event) => {
    console.log("Card event:", event.type, event.data);
  },
  [
    { field: "rarity", operator: "in", value: ["rare", "legendary"] }, // Only rare+ cards
  ]
);

// Subscribe to contract events
await sdk.realtime.subscribeToContracts(["0x1234...", "0x5678..."], (event) => {
  if (event.type === "card_minted") {
    console.log("New card minted:", event.data);
  }
});

// Unsubscribe
await sdk.realtime.unsubscribe(subscriptionId);
```

#### Polling Alternative

```typescript
import { QuickSetup } from "@tcg-magic/protocol";

const sdk = await QuickSetup.withRealtime(
  { type: "web3_direct" /* ... provider config */ },
  {
    type: "polling",
    endpoint: "https://api.example.com/events",
    options: { pollingInterval: 5000 }, // 5 seconds
  }
);
```

### 🔌 Provider System

#### Web3 Direct Provider

```typescript
import { Web3ProviderFactory } from "@tcg-magic/protocol";

// Create Polygon provider
const provider = Web3ProviderFactory.createPolygonProvider(
  ["0x1234..."], // Contract addresses
  "https://polygon-rpc.com", // Custom RPC URL
  false // false = mainnet, true = testnet
);

await provider.initialize();
const cards = await provider.getCardsByWallet("0xwallet...");
```

#### Adding Custom Networks

```typescript
import { Web3ProviderFactory, SUPPORTED_NETWORKS } from "@tcg-magic/protocol";

// Add a custom network
Web3ProviderFactory.addNetwork(42161, {
  chainId: 42161,
  name: "Arbitrum",
  rpcUrl: "https://arb1.arbitrum.io/rpc",
  blockExplorer: "https://arbiscan.io",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
});
```

### 🛠️ Utilities

```typescript
// Validate wallet address
const isValid = sdk.utils.validateWallet("0x1234...");

// Format card for display
const formatted = sdk.utils.formatCard(card, "detailed");

// Generate collection hash for caching
const hash = sdk.utils.generateCollectionHash(cards);

// Get supported networks
const networks = sdk.utils.getSupportedNetworks();
```

### 🔍 Error Handling

```typescript
try {
  const cards = await sdk.cards.getCardsByWallet("0xinvalid");
} catch (error) {
  if (error.message.includes("Invalid wallet address")) {
    console.log("Please provide a valid Ethereum address");
  }
}

// Listen for SDK events
sdk.on("provider_error", (error) => {
  console.error("Provider error:", error);
});

sdk.on("realtime_disconnected", () => {
  console.log("Real-time connection lost, attempting to reconnect...");
});
```

### 🏗️ Architecture

The SDK is built with extensibility in mind:

- **Modular Design**: Each component (providers, filters, metadata, etc.) can be extended independently
- **Plugin System**: Register custom filters, sorters, and metadata calculators
- **Provider Abstraction**: Unified interface for different data sources
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Event-Driven**: EventEmitter-based architecture for real-time updates

### 📦 Package Structure

```
src/
├── types/           # TypeScript type definitions
├── api/            # Unified API interfaces (REST/GraphQL)
├── providers/      # Data source providers (Web3, indexing, etc.)
├── filters/        # Filtering and sorting engine
├── metadata/       # Metadata calculation system
├── realtime/       # Real-time update management
├── collections/    # Collection management
├── sdk/           # Main SDK implementation
└── utils/         # Utility functions
```

### 🤝 Contributing

The SDK is designed to be easily extensible. You can:

1. **Add new providers** by implementing the `BaseProvider` interface
2. **Create custom filters** using the `FilterEngine.registerFilter()` method
3. **Build metadata calculators** with the `MetadataCalculator` system
4. **Extend real-time capabilities** through the `RealtimeManager`

### 📄 License

MIT License - see LICENSE file for details.

### 🔗 Links

- [API Documentation](./docs/api.md)
- [Examples](./examples/)
- [Contributing Guide](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)
