const fs = require("fs");
const path = require("path");

// Read the LEA JSON file
const inputFile = path.join(
  __dirname,
  "downloaded-sets",
  "LEA_Limited_Edition_Alpha.json"
);
const outputFile = path.join(__dirname, "extracted-cards.json");

console.log("🔍 Reading MTG JSON data...");

try {
  const rawData = fs.readFileSync(inputFile, "utf8");
  const mtgData = JSON.parse(rawData);

  console.log("📊 Extracting card data...");

  // Extract cards array
  const cards = mtgData.data.cards;
  console.log(`Found ${cards.length} cards in the set`);

  // Map rarity strings to enum values for Card.sol
  const rarityMapping = {
    common: 0, // Common
    uncommon: 1, // Uncommon
    rare: 2, // Rare
    mythic: 3, // Epic (mythic doesn't exist in Alpha, but mapping for future)
    special: 4, // Legendary (special doesn't exist in Alpha, but mapping for future)
  };

  // Extract and format card data
  const extractedCards = cards.map((card, index) => {
    // Generate a unique cardId using the card number or index
    const cardId = parseInt(card.number) || index + 1;

    // Map rarity to enum value
    const rarityValue = rarityMapping[card.rarity.toLowerCase()] || 0;

    // Set max supply based on rarity (you can adjust these values)
    let maxSupply;
    switch (rarityValue) {
      case 0: // Common
        maxSupply = 0;
        break;
      case 1: // Uncommon
        maxSupply = 0;
        break;
      case 2: // Rare
        maxSupply = 0;
        break;
      case 3: // Epic/Mythic
        maxSupply = 0;
        break;
      case 4: // Legendary
        maxSupply = 10000;
        break;
      default:
        maxSupply = 100;
    }

    // Create base metadata URI (you can customize this)
    const baseURI = `https://api.tcg-magic.com/cards/LEA`;

    return {
      // Card.sol constructor parameters
      cardId: cardId,
      name: card.name,
      rarity: rarityValue,
      maxSupply: maxSupply,
      baseURI: baseURI,

      // Additional metadata for reference
      metadata: {
        image: `http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=${card.identifiers.multiverseId}&type=card`,
        manaCost: card.manaCost || "",
        manaValue: card.manaValue || 0,
        type: card.type || "",
        text: card.text || "",
        originalText: card.originalText || "",
      },
    };
  });

  // Sort by cardId for better organization
  extractedCards.sort((a, b) => a.cardId - b.cardId);

  // Create the output structure
  const output = {
    setInfo: {
      name: "Limited Edition Alpha",
      code: "LEA",
      baseSetSize: mtgData.data.baseSetSize,
      block: mtgData.data.block,
      extractedAt: new Date().toISOString(),
      totalCards: extractedCards.length,
    },
    cards: extractedCards,

    // Summary statistics
    statistics: {
      totalCards: extractedCards.length,
      rarityBreakdown: {
        common: extractedCards.filter((c) => c.rarity === 0).length,
        uncommon: extractedCards.filter((c) => c.rarity === 1).length,
        rare: extractedCards.filter((c) => c.rarity === 2).length,
        epic: extractedCards.filter((c) => c.rarity === 3).length,
        legendary: extractedCards.filter((c) => c.rarity === 4).length,
      },
      totalMaxSupply: extractedCards.reduce(
        (sum, card) => sum + card.maxSupply,
        0
      ),
    },

    // Contract deployment helper
    contractDeploymentData: extractedCards.map((card) => ({
      cardId: card.cardId,
      name: card.name,
      rarity: card.rarity,
      maxSupply: card.maxSupply,
      baseURI: card.baseURI,
    })),
  };

  // Write the extracted data
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));

  console.log("✅ Extraction completed!");
  console.log(`📁 Output file: ${outputFile}`);
  console.log(`📈 Statistics:`);
  console.log(`   - Total cards: ${output.statistics.totalCards}`);
  console.log(`   - Common: ${output.statistics.rarityBreakdown.common}`);
  console.log(`   - Uncommon: ${output.statistics.rarityBreakdown.uncommon}`);
  console.log(`   - Rare: ${output.statistics.rarityBreakdown.rare}`);
  console.log(
    `   - Total max supply: ${output.statistics.totalMaxSupply.toLocaleString()}`
  );

  // Create a sample deployment script snippet
  const sampleCards = extractedCards.slice(0, 5);
  console.log("\n📋 Sample Card Data (first 5 cards):");
  sampleCards.forEach((card) => {
    console.log(
      `   ${card.cardId}: "${card.name}" (${
        ["Common", "Uncommon", "Rare", "Epic", "Legendary"][card.rarity]
      }, Max: ${card.maxSupply})`
    );
  });

  console.log("\n🚀 Ready for use with Card.sol contract!");
  console.log("💡 The extracted data includes:");
  console.log(
    "   - contractDeploymentData: Array ready for Card.sol constructor"
  );
  console.log("   - cards: Full card data with metadata");
  console.log("   - statistics: Set overview and breakdowns");
} catch (error) {
  console.error("❌ Error extracting card data:", error.message);
  process.exit(1);
}
