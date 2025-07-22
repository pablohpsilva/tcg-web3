import {
  createTCGProtocol,
  QuickSetup,
  createConfigBuilder,
  ProviderType,
  FilterOperator,
  CardRarity,
} from "@tcg-magic/protocol";

/**
 * Example: Basic SDK usage with Polygon testnet
 */
async function basicExample() {
  console.log("🚀 TCG Protocol SDK - Basic Example");

  // Quick setup for Polygon testnet
  const sdk = await QuickSetup.forPolygonTestnet([
    "0x1234567890123456789012345678901234567890", // Replace with actual contract address
  ]);

  console.log("✅ SDK initialized");

  // Get cards owned by a wallet
  const walletAddress = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
  console.log(`\n📋 Getting cards for wallet: ${walletAddress}`);

  try {
    const walletCards = await sdk.cards.getCardsByWallet(walletAddress, {
      pagination: { page: 1, limit: 10 },
    });

    console.log(
      `Found ${walletCards.data.length} cards (${walletCards.pagination.total} total)`
    );

    // Display first few cards
    walletCards.data.slice(0, 3).forEach((card, index) => {
      console.log(
        `  ${index + 1}. ${card.name} (${card.rarity}) - ${card.type}`
      );
    });
  } catch (error) {
    console.log(
      "Note: This example requires actual contract addresses and wallet with cards"
    );
  }

  await sdk.disconnect();
}

/**
 * Example: Advanced filtering and searching
 */
async function advancedFilteringExample() {
  console.log("\n🔍 TCG Protocol SDK - Advanced Filtering Example");

  const sdk = await createConfigBuilder()
    .addWeb3Provider(80001, ["0x1234567890123456789012345678901234567890"])
    .setDefaultProvider(ProviderType.WEB3_DIRECT)
    .create();

  console.log("✅ SDK initialized with custom configuration");

  // Advanced search example
  try {
    const rareCreatures = await sdk.cards.advancedSearch({
      text: "dragon", // Search for dragons
      filters: [
        { field: "type", operator: FilterOperator.EQUALS, value: "creature" },
        {
          field: "rarity",
          operator: FilterOperator.IN,
          value: [CardRarity.RARE, CardRarity.LEGENDARY],
        },
        {
          field: "cost",
          operator: FilterOperator.GREATER_THAN_OR_EQUAL,
          value: 4,
        },
      ],
      sort: [
        { field: "rarity", direction: "desc" },
        { field: "cost", direction: "asc" },
      ],
      pagination: { page: 1, limit: 5 },
    });

    console.log(
      `\n🐉 Found ${rareCreatures.data.length} rare dragon creatures with cost >= 4`
    );
  } catch (error) {
    console.log("Note: This example requires actual contract data");
  }

  await sdk.disconnect();
}

/**
 * Example: Collection management and metadata
 */
async function collectionExample() {
  console.log("\n📚 TCG Protocol SDK - Collection Management Example");

  const sdk = await QuickSetup.forPolygonTestnet([
    "0x1234567890123456789012345678901234567890",
  ]);

  // Create sample cards (in real usage, these would come from blockchain)
  const sampleCards = [
    {
      tokenId: "1",
      contractAddress: "0x1234567890123456789012345678901234567890",
      chainId: 80001,
      name: "Lightning Dragon",
      description: "A powerful dragon that commands lightning",
      image: "https://example.com/dragon.png",
      rarity: CardRarity.LEGENDARY,
      type: "creature" as any,
      cost: 7,
      power: 6,
      toughness: 5,
      setId: "SET001",
      setName: "Elemental Forces",
      owner: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      colors: ["red", "blue"],
      keywords: ["flying", "haste"],
      abilities: [
        "When Lightning Dragon enters play, deal 3 damage to any target",
      ],
    },
    {
      tokenId: "2",
      contractAddress: "0x1234567890123456789012345678901234567890",
      chainId: 80001,
      name: "Forest Guardian",
      description: "A wise protector of ancient forests",
      image: "https://example.com/guardian.png",
      rarity: CardRarity.RARE,
      type: "creature" as any,
      cost: 4,
      power: 3,
      toughness: 6,
      setId: "SET001",
      setName: "Elemental Forces",
      owner: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      colors: ["green"],
      keywords: ["reach"],
      abilities: ["Other creatures you control get +0/+1"],
    },
  ];

  // Create a collection
  console.log("\n📦 Creating collection...");
  const collection = await sdk.collections.createCollection(
    "My Legendary Deck",
    sampleCards as any,
    {
      description: "A deck focused on powerful creatures",
      tags: ["competitive", "creatures"],
      generateMetadata: true,
    }
  );

  console.log(
    `✅ Collection "${collection.name}" created with ${collection.cards.length} cards`
  );

  // Display metadata
  if (collection.metadata) {
    console.log("\n📊 Collection Metadata:");
    console.log(`  Total Cards: ${collection.metadata.totalCards}`);
    console.log(`  Total Cost: ${collection.metadata.totalCost}`);
    console.log(
      `  Average Cost: ${collection.metadata.averageCost.toFixed(2)}`
    );
    console.log(
      `  Average Power: ${collection.metadata.averagePower?.toFixed(2)}`
    );
    console.log(
      `  Rarity Distribution:`,
      collection.metadata.rarityDistribution
    );
  }

  // Validate collection
  const validation = await sdk.collections.validateCollection(collection);
  console.log(
    `\n✅ Collection validation: ${validation.isValid ? "Valid" : "Invalid"}`
  );
  if (validation.warnings.length > 0) {
    console.log("⚠️  Warnings:", validation.warnings);
  }

  // Export collection
  const textExport = await sdk.collections.exportCollection(collection, "txt");
  console.log("\n📄 Collection export (first 200 chars):");
  console.log(textExport.substring(0, 200) + "...");

  await sdk.disconnect();
}

/**
 * Example: Real-time updates
 */
async function realtimeExample() {
  console.log("\n⚡ TCG Protocol SDK - Real-time Updates Example");

  const sdk = await QuickSetup.withRealtime(
    {
      type: ProviderType.WEB3_DIRECT,
      networkConfig: {
        chainId: 80001,
        name: "Polygon Mumbai",
        rpcUrl: "https://rpc-mumbai.maticvigil.com",
        nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
      },
      contractAddresses: ["0x1234567890123456789012345678901234567890"],
    },
    {
      type: "polling",
      endpoint: "https://api.example.com/events",
      options: { pollingInterval: 10000 },
    }
  );

  console.log("✅ SDK initialized with real-time updates");

  // Subscribe to wallet updates
  const walletAddress = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
  console.log(`\n👂 Subscribing to updates for wallet: ${walletAddress}`);

  try {
    const subscriptionId = await sdk.realtime.subscribeToWallet(
      walletAddress,
      (event) => {
        console.log(`📡 Real-time event: ${event.type}`, event.data);
      },
      [
        {
          field: "rarity",
          operator: FilterOperator.IN,
          value: [CardRarity.RARE, CardRarity.LEGENDARY],
        },
      ]
    );

    console.log(`✅ Subscribed with ID: ${subscriptionId}`);
    console.log("📡 Listening for rare card events...");

    // In a real application, you would keep the process running
    // For this example, we'll unsubscribe after a short time
    setTimeout(async () => {
      await sdk.realtime.unsubscribe(subscriptionId);
      console.log("🔇 Unsubscribed from updates");
      await sdk.disconnect();
    }, 5000);
  } catch (error) {
    console.log(
      "Note: Real-time features require proper endpoint configuration"
    );
    await sdk.disconnect();
  }
}

/**
 * Example: Custom filters and metadata
 */
async function customizationExample() {
  console.log("\n🔧 TCG Protocol SDK - Customization Example");

  const sdk = await QuickSetup.forPolygonTestnet([
    "0x1234567890123456789012345678901234567890",
  ]);

  // Register a custom filter
  console.log("\n🎯 Registering custom filter...");
  const { cardFilterEngine } = await import("@tcg-magic/protocol");

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

  console.log('✅ Custom filter "power_greater_than_cost" registered');

  // Register a custom metadata calculator
  sdk.metadata.registerCustomCalculator("deck_synergy", (cards) => {
    const keywords = new Set();
    cards.forEach((card) => {
      if (card.keywords) {
        card.keywords.forEach((keyword) => keywords.add(keyword));
      }
    });
    return keywords.size; // Simple synergy metric based on unique keywords
  });

  console.log('✅ Custom metadata calculator "deck_synergy" registered');

  await sdk.disconnect();
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    await basicExample();
    await advancedFilteringExample();
    await collectionExample();
    await realtimeExample();
    await customizationExample();

    console.log("\n🎉 All examples completed successfully!");
    console.log("\n📚 Next steps:");
    console.log("  1. Replace contract addresses with your actual contracts");
    console.log("  2. Configure real-time endpoints for your use case");
    console.log("  3. Customize filters and metadata for your game logic");
    console.log("  4. Integrate with your frontend application");
  } catch (error) {
    console.error("❌ Example failed:", error);
  }
}

// Export for use in other files
export {
  basicExample,
  advancedFilteringExample,
  collectionExample,
  realtimeExample,
  customizationExample,
  runAllExamples,
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}
