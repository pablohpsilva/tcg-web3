// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/CardBatch.sol";
import "../src/CardSetBatch.sol";
import "../src/interfaces/ICard.sol";
import "../src/mocks/MockVRFCoordinator.sol";

contract DeployCardBatch is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying contracts...");
        console.log("Deployer:", deployer);
        
        // Deploy MockVRFCoordinator
        MockVRFCoordinator vrfCoordinator = new MockVRFCoordinator();
        console.log("MockVRFCoordinator deployed at:", address(vrfCoordinator));
        
        // Prepare card data for CardBatch
        CardBatch.CardCreationData[] memory cards = new CardBatch.CardCreationData[](8);
        
        // Common Cards (4 cards)
        cards[0] = CardBatch.CardCreationData({
            cardId: 1,
            name: "Fire Sprite",
            rarity: ICard.Rarity.COMMON,
            maxSupply: 10000,
            metadataURI: "https://api.tcg-magic.com/cards/1"
        });
        
        cards[1] = CardBatch.CardCreationData({
            cardId: 2,
            name: "Water Elemental",
            rarity: ICard.Rarity.COMMON,
            maxSupply: 10000,
            metadataURI: "https://api.tcg-magic.com/cards/2"
        });
        
        cards[2] = CardBatch.CardCreationData({
            cardId: 3,
            name: "Earth Guardian",
            rarity: ICard.Rarity.COMMON,
            maxSupply: 10000,
            metadataURI: "https://api.tcg-magic.com/cards/3"
        });
        
        cards[3] = CardBatch.CardCreationData({
            cardId: 4,
            name: "Air Spirit",
            rarity: ICard.Rarity.COMMON,
            maxSupply: 10000,
            metadataURI: "https://api.tcg-magic.com/cards/4"
        });
        
        // Uncommon Cards (2 cards)
        cards[4] = CardBatch.CardCreationData({
            cardId: 5,
            name: "Lightning Bolt",
            rarity: ICard.Rarity.UNCOMMON,
            maxSupply: 5000,
            metadataURI: "https://api.tcg-magic.com/cards/5"
        });
        
        cards[5] = CardBatch.CardCreationData({
            cardId: 6,
            name: "Ice Storm",
            rarity: ICard.Rarity.UNCOMMON,
            maxSupply: 5000,
            metadataURI: "https://api.tcg-magic.com/cards/6"
        });
        
        // Rare Card (1 card)
        cards[6] = CardBatch.CardCreationData({
            cardId: 7,
            name: "Dragon Lord",
            rarity: ICard.Rarity.RARE,
            maxSupply: 1000,
            metadataURI: "https://api.tcg-magic.com/cards/7"
        });
        
        // Mythical Card (1 card)
        cards[7] = CardBatch.CardCreationData({
            cardId: 8,
            name: "Ancient Phoenix",
            rarity: ICard.Rarity.MYTHICAL,
            maxSupply: 100,
            metadataURI: "https://api.tcg-magic.com/cards/8"
        });
        
        // Deploy CardBatch
        CardBatch cardBatch = new CardBatch(
            "Elemental Legends Batch",
            cards,
            "https://api.tcg-magic.com/metadata/",
            deployer
        );
        console.log("CardBatch deployed at:", address(cardBatch));
        
        // Deploy CardSetBatch
        CardSetBatch cardSetBatch = new CardSetBatch(
            "Elemental Legends Set",
            15000, // emission cap (1000 packs * 15 cards each)
            address(vrfCoordinator),
            address(cardBatch),
            deployer
        );
        console.log("CardSetBatch deployed at:", address(cardSetBatch));
        
        // Add a starter deck type
        uint256[] memory starterTokenIds = new uint256[](4);
        uint256[] memory starterQuantities = new uint256[](4);
        
        starterTokenIds[0] = 1; // Fire Sprite
        starterTokenIds[1] = 2; // Water Elemental
        starterTokenIds[2] = 3; // Earth Guardian
        starterTokenIds[3] = 4; // Air Spirit
        
        starterQuantities[0] = 3;
        starterQuantities[1] = 3;
        starterQuantities[2] = 3;
        starterQuantities[3] = 3;
        
        cardSetBatch.addDeckType("Starter", starterTokenIds, starterQuantities);
        console.log("Starter deck type added");
        
        // Add a premium deck type
        uint256[] memory premiumTokenIds = new uint256[](6);
        uint256[] memory premiumQuantities = new uint256[](6);
        
        premiumTokenIds[0] = 1; // Fire Sprite
        premiumTokenIds[1] = 2; // Water Elemental
        premiumTokenIds[2] = 5; // Lightning Bolt
        premiumTokenIds[3] = 6; // Ice Storm
        premiumTokenIds[4] = 7; // Dragon Lord
        premiumTokenIds[5] = 8; // Ancient Phoenix
        
        premiumQuantities[0] = 2;
        premiumQuantities[1] = 2;
        premiumQuantities[2] = 2;
        premiumQuantities[3] = 2;
        premiumQuantities[4] = 1;
        premiumQuantities[5] = 1;
        
        cardSetBatch.addDeckType("Premium", premiumTokenIds, premiumQuantities);
        console.log("Premium deck type added");
        
        // Set deck prices
        cardSetBatch.setDeckPrice("Starter", 0.01 ether);
        cardSetBatch.setDeckPrice("Premium", 0.1 ether);
        console.log("Deck prices set");
        
        vm.stopBroadcast();
        
        console.log("\n=== Deployment Summary ===");
        console.log("MockVRFCoordinator:", address(vrfCoordinator));
        console.log("CardBatch:", address(cardBatch));
        console.log("CardSetBatch:", address(cardSetBatch));
        console.log("Total Cards in Batch:", cards.length);
        console.log("Starter Deck Price: 0.01 ETH");
        console.log("Premium Deck Price: 0.1 ETH");
        console.log("Pack Price: 0.01 ETH");
        
        console.log("\n=== Card Details ===");
        for (uint256 i = 0; i < cards.length; i++) {
            console.log("Card ID:", cards[i].cardId);
            console.log("Name:", cards[i].name);
            console.log("Rarity:", uint8(cards[i].rarity));
            console.log("Max Supply:", cards[i].maxSupply);
            console.log("---");
        }
        
        console.log("\n=== Next Steps ===");
        console.log("1. Open a pack: cardSetBatch.openPack() with 0.01 ETH");
        console.log("2. Open starter deck: cardSetBatch.openDeck('Starter') with 0.01 ETH");
        console.log("3. Open premium deck: cardSetBatch.openDeck('Premium') with 0.1 ETH");
        console.log("4. Check card balances: cardBatch.balanceOf(address, tokenId)");
    }
} 