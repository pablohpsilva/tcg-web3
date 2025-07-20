// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/CardSet.sol";
import "../src/Card.sol";
import "../src/interfaces/ICard.sol";
import "../src/mocks/MockVRFCoordinator.sol";

/**
 * @dev Real-world cost calculator for deck opening
 * @notice Estimates total costs including gas fees for mainnet deployment
 */
contract RealWorldDeckCostCalculator is Test {
    CardSet public cardSet;
    MockVRFCoordinator public vrfCoordinator;
    
    address public owner = address(0x101);
    address public player = address(0x102);

    function setUp() public {
        vm.startPrank(owner);
        vrfCoordinator = new MockVRFCoordinator();
        cardSet = new CardSet("Cost Calculator Set", 999999990, address(vrfCoordinator), owner);
        
        // Create test cards
        Card commonCard = new Card(1, "Common Card", ICard.Rarity.COMMON, 0, "ipfs://common", owner);
        Card rareCard = new Card(2, "Rare Card", ICard.Rarity.RARE, 0, "ipfs://rare", owner);
        Card mythicalCard = new Card(3, "Mythical Card", ICard.Rarity.MYTHICAL, 0, "ipfs://mythical", owner);
        
        commonCard.addAuthorizedMinter(address(cardSet));
        rareCard.addAuthorizedMinter(address(cardSet));
        mythicalCard.addAuthorizedMinter(address(cardSet));
        
        cardSet.addCardContract(address(commonCard));
        cardSet.addCardContract(address(rareCard));
        cardSet.addCardContract(address(mythicalCard));
        
        // Create deck types
        address[] memory starterCards = new address[](2);
        starterCards[0] = address(commonCard);
        starterCards[1] = address(rareCard);
        uint256[] memory starterQuantities = new uint256[](2);
        starterQuantities[0] = 40;
        starterQuantities[1] = 20;
        cardSet.addDeckType("Starter Deck", starterCards, starterQuantities);
        cardSet.setDeckPrice("Starter Deck", 0.08 ether);
        
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
        
        vm.stopPrank();
    }

    /**
     * @dev Calculate realistic total costs for deck opening
     */
    function testRealWorldCostCalculation() public {
        console.log("=== REAL-WORLD DECK OPENING COST CALCULATOR ===");
        console.log("");
        console.log("This calculator estimates TOTAL costs including:");
        console.log("1. Deck price (paid to contract)");
        console.log("2. Gas fees (paid to network)");
        console.log("3. NFT minting costs (60 cards)");
        console.log("");
        
        // Realistic gas estimates based on similar NFT operations
        uint256 estimatedGasForDeckOpening = 3500000; // ~3.5M gas for 60 NFT mints + logic
        console.log("Estimated gas usage:", estimatedGasForDeckOpening, "units");
        console.log("(Based on: 60 NFT mints + deck logic + contract calls)");
        console.log("");
        
        string[] memory deckNames = cardSet.getDeckTypeNames();
        
        for (uint256 i = 0; i < deckNames.length; i++) {
            _calculateDeckCost(deckNames[i], estimatedGasForDeckOpening);
            console.log("");
        }
    }

    /**
     * @dev Calculate costs for a specific deck
     */
    function _calculateDeckCost(string memory deckName, uint256 estimatedGas) internal view {
        console.log("=== COST ANALYSIS:", deckName, "===");
        
        uint256 deckPrice = cardSet.getDeckPrice(deckName);
        ICardSet.DeckType memory deck = cardSet.getDeckType(deckName);
        
        console.log("Deck price:", deckPrice / 1e18, "ETH");
        console.log("Cards to mint:", deck.totalCards);
        console.log("");
        
        // Different gas price scenarios
        uint256[] memory gasPrices = new uint256[](5);
        gasPrices[0] = 10 gwei;   // Low
        gasPrices[1] = 20 gwei;   // Standard
        gasPrices[2] = 50 gwei;   // High
        gasPrices[3] = 100 gwei;  // Very high
        gasPrices[4] = 200 gwei;  // Extreme (NFT drop)
        
        string[] memory scenarios = new string[](5);
        scenarios[0] = "LOW";
        scenarios[1] = "STANDARD";
        scenarios[2] = "HIGH";
        scenarios[3] = "VERY HIGH";
        scenarios[4] = "EXTREME";
        
        console.log("TOTAL COSTS AT DIFFERENT GAS PRICES:");
        for (uint256 i = 0; i < gasPrices.length; i++) {
            uint256 gasCost = estimatedGas * gasPrices[i];
            uint256 totalCost = deckPrice + gasCost;
            
            console.log(scenarios[i], "gas (", gasPrices[i] / 1e9, "gwei):");
            console.log("  Gas cost:", gasCost / 1e18, "ETH");
            console.log("  TOTAL cost:", totalCost / 1e18, "ETH");
            console.log("  USD (ETH@$3000):", (totalCost * 3000) / 1e18);
        }
    }

    /**
     * @dev Compare deck values considering total costs
     */
    function testValueComparison() public view {
        console.log("=== DECK VALUE COMPARISON ===");
        console.log("");
        
        uint256 standardGasPrice = 20 gwei;
        uint256 estimatedGas = 3500000;
        uint256 baseGasCost = estimatedGas * standardGasPrice;
        
        console.log("Standard conditions (20 gwei gas):");
        console.log("Base gas cost:", baseGasCost / 1e18, "ETH");
        console.log("");
        
        string[] memory deckNames = cardSet.getDeckTypeNames();
        
        for (uint256 i = 0; i < deckNames.length; i++) {
            uint256 deckPrice = cardSet.getDeckPrice(deckNames[i]);
            uint256 totalCost = deckPrice + baseGasCost;
            ICardSet.DeckType memory deck = cardSet.getDeckType(deckNames[i]);
            uint256 costPerCard = totalCost / deck.totalCards;
            
            console.log(deckNames[i], ":");
            console.log("  Deck price:", deckPrice / 1e18, "ETH");
            console.log("  Total cost:", totalCost / 1e18, "ETH");
            console.log("  Cost per card:", costPerCard / 1e15, "milliETH");
            console.log("");
        }
    }

    /**
     * @dev Show gas cost breakdown
     */
    function testGasCostBreakdown() public pure {
        console.log("=== GAS COST BREAKDOWN ===");
        console.log("");
        
        console.log("Estimated gas usage for deck opening:");
        console.log("- Base transaction: ~21,000 gas");
        console.log("- Contract call overhead: ~50,000 gas");
        console.log("- Deck verification: ~100,000 gas");
        console.log("- 60 NFT mints: ~3,300,000 gas");
        console.log("  (55,000 gas per mint on average)");
        console.log("- Storage updates: ~30,000 gas");
        console.log("TOTAL: ~3,500,000 gas");
        console.log("");
        
        console.log("Gas cost examples:");
        console.log("At 20 gwei: 0.07 ETH (~$210)");
        console.log("At 50 gwei: 0.175 ETH (~$525)");
        console.log("At 100 gwei: 0.35 ETH (~$1,050)");
        console.log("");
        console.log("NOTE: Gas costs can be higher than deck price!");
    }

    /**
     * @dev Affordability calculator
     */
    function testAffordabilityCalculator() public view {
        console.log("=== AFFORDABILITY CALCULATOR ===");
        console.log("");
        
        uint256[] memory budgets = new uint256[](4);
        budgets[0] = 0.1 ether;   // Small budget
        budgets[1] = 0.2 ether;   // Medium budget
        budgets[2] = 0.5 ether;   // Large budget
        budgets[3] = 1.0 ether;   // Premium budget
        
        uint256 gasPrice = 20 gwei;
        uint256 gasCost = 3500000 * gasPrice;
        
        for (uint256 i = 0; i < budgets.length; i++) {
            console.log("Budget:", budgets[i] / 1e18, "ETH");
            console.log("Available for deck (after gas):", (budgets[i] - gasCost) / 1e18, "ETH");
            
            string[] memory deckNames = cardSet.getDeckTypeNames();
            for (uint256 j = 0; j < deckNames.length; j++) {
                uint256 deckPrice = cardSet.getDeckPrice(deckNames[j]);
                uint256 totalCost = deckPrice + gasCost;
                
                if (budgets[i] >= totalCost) {
                    console.log("  [YES] Can afford:", deckNames[j]);
                } else {
                    uint256 shortfall = totalCost - budgets[i];
                    console.log("  [NO] Cannot afford:", deckNames[j]);
                    console.log("    Need additional:", shortfall / 1e18, "ETH");
                }
            }
            console.log("");
        }
    }

    /**
     * @dev Best practices for minimizing costs
     */
    function testCostOptimizationTips() public pure {
        console.log("=== COST OPTIMIZATION TIPS ===");
        console.log("");
        console.log("1. TIMING STRATEGY:");
        console.log("   - Monitor gas prices using ETH Gas Station");
        console.log("   - Open decks during low network activity");
        console.log("   - Avoid weekend evenings (high NFT activity)");
        console.log("");
        console.log("2. GAS OPTIMIZATION:");
        console.log("   - Set reasonable gas limit: 4,000,000");
        console.log("   - Use standard gas price, not 'fast'");
        console.log("   - Consider gas price alerts");
        console.log("");
        console.log("3. ECONOMIC STRATEGY:");
        console.log("   - Compare total costs, not just deck prices");
        console.log("   - Factor gas into deck value analysis");
        console.log("   - Consider bulk purchases if available");
        console.log("");
        console.log("4. MONITORING TOOLS:");
        console.log("   - ETH Gas Station: ethgasstation.info");
        console.log("   - Gas Now: gasnow.org");
        console.log("   - DeFi Pulse Gas Tracker");
    }
} 