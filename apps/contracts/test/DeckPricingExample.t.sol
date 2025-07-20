// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/CardSet.sol";
import "../src/Card.sol";
import "../src/interfaces/ICard.sol";
import "../src/mocks/MockVRFCoordinator.sol";

/**
 * @dev Practical example showing all ways to check deck opening costs
 */
contract DeckPricingExample is Test {
    CardSet public cardSet;
    MockVRFCoordinator public vrfCoordinator;
    
    address public owner = address(0x101);
    address public player = address(0x102);

    function setUp() public {
        vm.startPrank(owner);
        vrfCoordinator = new MockVRFCoordinator();
        cardSet = new CardSet("Example Set", 999999990, address(vrfCoordinator), owner);
        
        // Create sample cards
        Card commonCard = new Card(1, "Lightning Bolt", ICard.Rarity.COMMON, 0, "ipfs://common", owner);
        Card rareCard = new Card(2, "Dragon Lord", ICard.Rarity.RARE, 0, "ipfs://rare", owner);
        Card mythicalCard = new Card(3, "Ancient Wisdom", ICard.Rarity.MYTHICAL, 0, "ipfs://mythical", owner);
        
        commonCard.addAuthorizedMinter(address(cardSet));
        rareCard.addAuthorizedMinter(address(cardSet));
        mythicalCard.addAuthorizedMinter(address(cardSet));
        
        cardSet.addCardContract(address(commonCard));
        cardSet.addCardContract(address(rareCard));
        cardSet.addCardContract(address(mythicalCard));
        
        // Create deck types with different pricing
        address[] memory starterCards = new address[](2);
        starterCards[0] = address(commonCard);
        starterCards[1] = address(rareCard);
        
        uint256[] memory starterQuantities = new uint256[](2);
        starterQuantities[0] = 50; // 50 common cards
        starterQuantities[1] = 10; // 10 rare cards
        
        cardSet.addDeckType("Starter Deck", starterCards, starterQuantities);
        cardSet.setDeckPrice("Starter Deck", 0.05 ether);
        
        // Premium deck
        address[] memory premiumCards = new address[](3);
        premiumCards[0] = address(commonCard);
        premiumCards[1] = address(rareCard);
        premiumCards[2] = address(mythicalCard);
        
        uint256[] memory premiumQuantities = new uint256[](3);
        premiumQuantities[0] = 30;
        premiumQuantities[1] = 25;
        premiumQuantities[2] = 5;
        
        cardSet.addDeckType("Premium Deck", premiumCards, premiumQuantities);
        cardSet.setDeckPrice("Premium Deck", 0.15 ether);
        
        // Budget deck
        address[] memory budgetCards = new address[](1);
        budgetCards[0] = address(commonCard);
        
        uint256[] memory budgetQuantities = new uint256[](1);
        budgetQuantities[0] = 60;
        
        cardSet.addDeckType("Budget Deck", budgetCards, budgetQuantities);
        cardSet.setDeckPrice("Budget Deck", 0.02 ether);
        
        vm.stopPrank();
    }

    /**
     * @dev Method 1: Quick price check for specific deck
     */
    function testMethod1_QuickPriceCheck() public view {
        console.log("=== METHOD 1: Quick Price Check ===");
        
        uint256 starterPrice = cardSet.getDeckPrice("Starter Deck");
        uint256 premiumPrice = cardSet.getDeckPrice("Premium Deck");
        uint256 budgetPrice = cardSet.getDeckPrice("Budget Deck");
        
        console.log("Starter Deck price:", starterPrice, "wei");
        console.log("Premium Deck price:", premiumPrice, "wei");
        console.log("Budget Deck price:", budgetPrice, "wei");
        
        // Convert to ETH for readability
        console.log("Starter Deck: %d ETH", starterPrice / 1e18);
        console.log("Premium Deck: %d ETH", premiumPrice / 1e18);
        console.log("Budget Deck: %d ETH", budgetPrice / 1e18);
    }

    /**
     * @dev Method 2: List all decks and their prices
     */
    function testMethod2_ListAllDecksAndPrices() public view {
        console.log("=== METHOD 2: All Decks and Prices ===");
        
        string[] memory deckNames = cardSet.getDeckTypeNames();
        console.log("Available decks:", deckNames.length);
        
        for (uint256 i = 0; i < deckNames.length; i++) {
            uint256 price = cardSet.getDeckPrice(deckNames[i]);
            console.log("Deck:", deckNames[i]);
            console.log("  Price:", price, "wei");
            console.log("  Price in ETH:", price / 1e18);
            console.log("");
        }
    }

    /**
     * @dev Method 3: Complete deck information
     */
    function testMethod3_CompleteDeckInformation() public view {
        console.log("=== METHOD 3: Complete Deck Information ===");
        
        string[] memory deckNames = cardSet.getDeckTypeNames();
        
        for (uint256 i = 0; i < deckNames.length; i++) {
            ICardSet.DeckType memory deck = cardSet.getDeckType(deckNames[i]);
            
            console.log("=== DECK:", deck.name, "===");
            console.log("Price:", deck.price, "wei");
            console.log("Total cards:", deck.totalCards);
            console.log("Card types:", deck.cardContracts.length);
            console.log("Active:", deck.active);
            
            // Show card breakdown
            for (uint256 j = 0; j < deck.cardContracts.length; j++) {
                string memory cardName = ICard(deck.cardContracts[j]).name();
                uint256 quantity = deck.quantities[j];
                console.log("  - Card:", cardName);
                console.log("    Quantity:", quantity);
            }
            console.log("");
        }
    }

    /**
     * @dev Method 4: Price comparison and recommendations
     */
    function testMethod4_PriceComparison() public view {
        console.log("=== METHOD 4: Price Comparison & Analysis ===");
        
        string[] memory deckNames = cardSet.getDeckTypeNames();
        uint256 cheapestPrice = type(uint256).max;
        uint256 mostExpensivePrice = 0;
        string memory cheapestDeck;
        string memory mostExpensiveDeck;
        
        // Find cheapest and most expensive
        for (uint256 i = 0; i < deckNames.length; i++) {
            uint256 price = cardSet.getDeckPrice(deckNames[i]);
            
            if (price < cheapestPrice) {
                cheapestPrice = price;
                cheapestDeck = deckNames[i];
            }
            
            if (price > mostExpensivePrice) {
                mostExpensivePrice = price;
                mostExpensiveDeck = deckNames[i];
            }
        }
        
        console.log("PRICE ANALYSIS:");
        console.log("Cheapest deck:", cheapestDeck);
        console.log("Cheapest price:", cheapestPrice, "wei");
        console.log("Most expensive:", mostExpensiveDeck);
        console.log("Most expensive price:", mostExpensivePrice, "wei");
        console.log("");
        
        // Value analysis
        for (uint256 i = 0; i < deckNames.length; i++) {
            ICardSet.DeckType memory deck = cardSet.getDeckType(deckNames[i]);
            uint256 pricePerCard = deck.price / deck.totalCards;
            
            console.log("Value analysis for", deck.name);
            console.log("  Price per card:", pricePerCard, "wei");
            console.log("  Total value:", deck.price, "wei");
            console.log("  Total cards:", deck.totalCards);
        }
    }

    /**
     * @dev Test that you have enough funds to buy a deck
     */
    function testCheckAffordability() public {
        console.log("=== AFFORDABILITY CHECK ===");
        
        uint256 playerBalance = 0.1 ether;
        vm.deal(player, playerBalance);
        
        string[] memory deckNames = cardSet.getDeckTypeNames();
        
        console.log("Player balance:", playerBalance, "wei");
        console.log("Affordable decks:");
        
        for (uint256 i = 0; i < deckNames.length; i++) {
            uint256 price = cardSet.getDeckPrice(deckNames[i]);
            
            if (playerBalance >= price) {
                console.log("AFFORDABLE:", deckNames[i]);
                console.log("Price:", price, "wei");
            } else {
                uint256 needed = price - playerBalance;
                console.log("TOO EXPENSIVE:", deckNames[i]);
                console.log("Need additional:", needed, "wei");
            }
        }
    }

    /**
     * @dev Simulate actual deck purchase to verify pricing
     */
    function testActualDeckPurchase() public {
        console.log("=== ACTUAL DECK PURCHASE TEST ===");
        
        vm.deal(player, 1 ether);
        
        // Check Starter Deck price
        uint256 starterPrice = cardSet.getDeckPrice("Starter Deck");
        console.log("Starter Deck costs:", starterPrice, "wei");
        
        uint256 balanceBefore = player.balance;
        console.log("Player balance before:", balanceBefore);
        
        // Purchase deck
        vm.prank(player);
        uint256[] memory tokenIds = cardSet.openDeck{value: starterPrice}("Starter Deck");
        
        uint256 balanceAfter = player.balance;
        console.log("Player balance after:", balanceAfter);
        console.log("Amount spent:", balanceBefore - balanceAfter);
        console.log("Cards received:", tokenIds.length);
        
        // Verify exact payment
        assertEq(balanceBefore - balanceAfter, starterPrice, "Should spend exact deck price");
        assertTrue(tokenIds.length > 0, "Should receive cards");
    }
} 