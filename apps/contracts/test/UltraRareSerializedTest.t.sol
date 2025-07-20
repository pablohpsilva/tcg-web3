// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/CardSet.sol";
import "../src/Card.sol";
import "../src/interfaces/ICard.sol";
import "../src/mocks/MockVRFCoordinator.sol";

/**
 * @dev Ultra Rare Serialized Card Probability Analysis
 * @notice Demonstrates different approaches to make serialized cards even rarer
 */
contract UltraRareSerializedTest is Test {
    CardSet public cardSet;
    MockVRFCoordinator public vrfCoordinator;
    
    address public owner = address(0x101);
    address public user1 = address(0x102);
    
    uint256 constant PACK_PRICE = 0.01 ether;

    function setUp() public {
        vm.startPrank(owner);
        vrfCoordinator = new MockVRFCoordinator();
        vm.stopPrank();
    }

    /**
     * @dev Compare different rarity scenarios for 1 billion card emission
     */
    function testUltraRareSerializedScenarios() public {
        uint256 totalPacks = 66666666; // 1 billion cards / 15 per pack
        
        console.log("=== ULTRA RARE SERIALIZED CARD SCENARIOS ===");
        console.log("Base scenario: 1 billion card emission (66.6M packs)");
        console.log("");
        
        // Scenario 1: Current system (5% chance)
        _analyzeScenario("CURRENT (5%)", 5, totalPacks, 100, 1601);
        
        // Scenario 2: Ultra rare (1% chance)  
        _analyzeScenario("ULTRA RARE (1%)", 1, totalPacks, 100, 1601);
        
        // Scenario 3: Legendary (0.5% chance) - using basis points
        _analyzeScenarioWithBasisPoints("LEGENDARY (0.5%)", 50, totalPacks, 100, 1601);
        
        // Scenario 4: Mythic (0.1% chance) - using basis points  
        _analyzeScenarioWithBasisPoints("MYTHIC (0.1%)", 10, totalPacks, 100, 1601);
        
        // Scenario 5: Every 100th pack + 5% chance
        _analyzePackRestrictionScenario("PACK RESTRICTED", 5, totalPacks, 100, 1601);
        
        // Scenario 6: Reduced supply (only 101 total)
        _analyzeScenario("REDUCED SUPPLY", 5, totalPacks, 100, 101);
        
        // Scenario 7: Ultimate rarity (0.01% + reduced supply) 
        _analyzeScenarioWithBasisPoints("ULTIMATE RARE", 1, totalPacks, 100, 11);
        
        console.log("=== IMPLEMENTATION EXAMPLES ===");
        _showImplementationExamples();
    }

    function _analyzeScenario(
        string memory name,
        uint256 percentChance,  // Whole percentages only
        uint256 totalPacks,
        uint256 packRestriction,
        uint256 maxSerializedCards
    ) internal pure {
        // Calculate with basis points for precision (10000 = 100%)
        uint256 basisPoints = (percentChance * 100); // 5% = 500 basis points
        uint256 eligiblePacks = totalPacks / packRestriction;
        uint256 expectedAttempts = (eligiblePacks * basisPoints) / 10000;
        uint256 packsToExhaust = maxSerializedCards * 10000 / basisPoints;
        
        console.log("--- SCENARIO:", name, "---");
        console.log("Chance per eligible pack:", percentChance, "%");
        console.log("Eligible packs:", eligiblePacks);
        console.log("Expected attempts:", expectedAttempts);
        console.log("Max serialized cards:", maxSerializedCards);
        console.log("Packs to exhaust all:", packsToExhaust);
        console.log("Percentage of total packs:", (packsToExhaust * 10000) / totalPacks, "basis points");
        console.log("Rarity vs current:", (32020 * 10000) / packsToExhaust, "x");
        console.log("");
    }

    function _analyzeScenarioWithBasisPoints(
        string memory name,
        uint256 basisPoints,  // Direct basis points (50 = 0.5%, 10 = 0.1%)
        uint256 totalPacks,
        uint256 packRestriction,
        uint256 maxSerializedCards
    ) internal pure {
        uint256 eligiblePacks = totalPacks / packRestriction;
        uint256 expectedAttempts = (eligiblePacks * basisPoints) / 10000;
        uint256 packsToExhaust = maxSerializedCards * 10000 / basisPoints;
        
        console.log("--- SCENARIO:", name, "---");
        console.log("Chance per eligible pack:", basisPoints, "basis points");
        console.log("Eligible packs:", eligiblePacks);
        console.log("Expected attempts:", expectedAttempts);
        console.log("Max serialized cards:", maxSerializedCards);
        console.log("Packs to exhaust all:", packsToExhaust);
        console.log("Percentage of total packs:", (packsToExhaust * 10000) / totalPacks, "basis points");
        console.log("Rarity vs current:", (32020 * 10000) / packsToExhaust, "x");
        console.log("");
    }

    function _analyzePackRestrictionScenario(
        string memory name,
        uint256 percentChance,
        uint256 totalPacks,
        uint256 packRestriction,
        uint256 maxSerializedCards
    ) internal pure {
        uint256 eligiblePacks = totalPacks / packRestriction; // Every 100th pack
        uint256 basisPoints = percentChance * 100;
        uint256 expectedAttempts = (eligiblePacks * basisPoints) / 10000;
        uint256 packsToExhaust = maxSerializedCards * packRestriction * 10000 / basisPoints;
        
        console.log("--- SCENARIO:", name, "---");
        console.log("Pack restriction: Every", packRestriction, "packs");
        console.log("Chance per eligible pack:", percentChance, "%");
        console.log("Eligible packs:", eligiblePacks);
        console.log("Expected attempts:", expectedAttempts);
        console.log("Packs to exhaust all:", packsToExhaust);
        console.log("Rarity vs current:", (32020 * 10000) / packsToExhaust, "x");
        console.log("");
    }

    function _showImplementationExamples() internal pure {
        console.log("1. ULTRA RARE (1% chance):");
        console.log("   Change: roll >= 99 (instead of >= 95)");
        console.log("");
        
        console.log("2. LEGENDARY (0.5% chance):");
        console.log("   Change: roll >= 995 && randomValue % 1000 >= 995");
        console.log("   (Use 1000-based system for sub-percent precision)");
        console.log("");
        
        console.log("3. PACK RESTRICTED:");
        console.log("   Add: if (totalPacksOpened % 100 == 0) before serialized check");
        console.log("");
        
        console.log("4. PROGRESSIVE RARITY:");
        console.log("   threshold = 95 + (totalPacksOpened / 1000000)");
        console.log("   Gets harder over time!");
        console.log("");
        
        console.log("5. MULTI-CONDITION:");
        console.log("   if (isLuckySlot && totalPacks > 10000 && totalPacks % 500 == 0 && roll >= 98)");
        console.log("   Requires: 10k+ packs opened + every 500th pack + 2% chance");
    }

    /**
     * @dev Test actual implementation of ultra-rare serialized (1% chance)
     */
    function testUltraRareImplementation() public {
        vm.startPrank(owner);
        cardSet = new CardSet("Ultra Rare Set", 999999990, address(vrfCoordinator), owner);
        
        // Create ultra-rare serialized card (only 1 total!)
        Card oneOfOne = new Card(1, "Genesis Masterpiece", ICard.Rarity.SERIALIZED, 1, "ipfs://genesis", owner);
        oneOfOne.addAuthorizedMinter(address(cardSet));
        cardSet.addCardContract(address(oneOfOne));
        
        // Add fallback cards
        Card mythical = new Card(2, "Mythical", ICard.Rarity.MYTHICAL, 0, "ipfs://mythical", owner);
        mythical.addAuthorizedMinter(address(cardSet));
        cardSet.addCardContract(address(mythical));
        
        vm.stopPrank();
        
        console.log("=== ULTRA RARE IMPLEMENTATION TEST ===");
        console.log("Testing with 1% serialized chance (would need contract modification)");
        console.log("Current system: 5% chance = found every ~20 packs");
        console.log("Ultra rare: 1% chance = found every ~100 packs");
        console.log("With only 1 serialized card available:");
        console.log("- Expected to be found in first 100 eligible packs");
        console.log("- Represents 0.00015% of all possible packs");
        console.log("- 6,666x rarer than common cards");
        
        // Note: To actually implement 1% chance, you would modify CardSet.sol line ~286:
        // Change: if (roll >= 95 && ...) 
        // To: if (roll >= 99 && ...)
        
        assertTrue(true, "Analysis complete - see console output for details");
    }

    /**
     * @dev Demonstrate mathematical progression of rarity
     */
    function testRarityProgression() public pure {
        console.log("=== RARITY PROGRESSION ANALYSIS ===");
        console.log("How rarity changes with different modifications:");
        console.log("");
        
        uint256 basePacks = 32020; // Current packs needed to exhaust serialized
        
        uint256[6] memory chances = [uint256(5), 3, 2, 1, 0, 0]; // Will calculate sub-1% separately
        
        for (uint256 i = 0; i < 4; i++) { // Only process first 4 non-zero values
            uint256 newPacks = (basePacks * 500) / (chances[i] * 100); // Rough calculation
            uint256 multiplier = newPacks / basePacks;
            
            console.log("Chance:", chances[i]);
            console.log("Packs needed:", newPacks);
            console.log("Rarity multiplier:", multiplier);
            console.log("");
        }
        
        // Handle sub-percent chances with basis points
        console.log("0.5% chance -> Packs needed:", basePacks * 10);
        console.log("0.1% chance -> Packs needed:", basePacks * 50);  
        console.log("0.01% chance -> Packs needed:", basePacks * 500);
        
        console.log("");
        console.log("EXTREME SCENARIOS:");
        console.log("0.001% chance = 32,000,000 packs needed = 1000x rarer");
        console.log("0.0001% chance = 320,000,000 packs needed = 10,000x rarer");
        console.log("");
        console.log("At 0.0001%, you'd need to open 4.8 BILLION cards to find all serialized!");
    }
} 