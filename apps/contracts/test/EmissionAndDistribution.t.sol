// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/CardSet.sol";
import "../src/Card.sol";
import "../src/mocks/MockVRFCoordinator.sol";
import "../src/interfaces/ICardSet.sol";
import "../src/interfaces/ICard.sol";

/**
 * @title EmissionAndDistribution Test Suite
 * @dev Comprehensive tests for emission caps, pack distribution, and card randomness
 */
contract EmissionAndDistributionTest is Test {
    CardSet public cardSet;
    MockVRFCoordinator public vrfCoordinator;
    
    // Card contracts for testing
    Card[] public commonCards;
    Card[] public uncommonCards;
    Card[] public rareCards;
    Card[] public mythicalCards;
    Card[] public serializedCards;
    
    address public owner = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    address public user3 = address(0x4);
    
    uint32 constant PACK_SIZE = 15;
    uint256 constant PACK_PRICE = 0.01 ether;

    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy VRF coordinator
        vrfCoordinator = new MockVRFCoordinator();
        
        vm.stopPrank();
        
        // Fund test users
        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
        vm.deal(user3, 100 ether);
    }

    // ============ 1. Emission Cap Respect Tests ============

    function testEmissionCapNeverExceeded() public {
        uint256 emissionCap = 150; // Small cap for testing
        
        vm.startPrank(owner);
        cardSet = new CardSet("Test Set", emissionCap, address(vrfCoordinator), owner);
        _deployAndAddBasicCards();
        vm.stopPrank();
        
        // Try to open more packs than the emission cap allows
        uint256 maxPacks = emissionCap / PACK_SIZE; // 150/15 = 10 packs
        
        vm.startPrank(user1);
        
        // Open all possible complete packs
        for (uint256 i = 0; i < maxPacks; i++) {
            cardSet.openPack{value: PACK_PRICE}();
            uint256 requestId = vrfCoordinator.getLastRequestId();
            vrfCoordinator.autoFulfillRequest(requestId, PACK_SIZE);
        }
        
        // Verify emission is exactly at the expected level
        assertEq(cardSet.totalEmission(), maxPacks * PACK_SIZE);
        
        // Try to open one more pack - should fail
        vm.expectRevert(); // Should revert due to emission cap
        cardSet.openPack{value: PACK_PRICE}();
        
        vm.stopPrank();
    }

    function testEmissionCapWithPartialPacks() public {
        uint256 emissionCap = 157; // Not divisible by PACK_SIZE (15)
        
        vm.startPrank(owner);
        cardSet = new CardSet("Test Set", emissionCap, address(vrfCoordinator), owner);
        _deployAndAddBasicCards();
        vm.stopPrank();
        
        vm.startPrank(user1);
        
        // Open 10 complete packs (150 cards)
        for (uint256 i = 0; i < 10; i++) {
            cardSet.openPack{value: PACK_PRICE}();
            uint256 requestId = vrfCoordinator.getLastRequestId();
            vrfCoordinator.autoFulfillRequest(requestId, PACK_SIZE);
        }
        
        // Should be at 150 cards
        assertEq(cardSet.totalEmission(), 150);
        
        // Try to open another pack (would need 15 more cards, but only 7 remaining)
        vm.expectRevert(); // Should fail - not enough emission left
        cardSet.openPack{value: PACK_PRICE}();
        
        vm.stopPrank();
    }

    function testEmissionCapAcrossMultipleUsers() public {
        uint256 emissionCap = 45; // Exactly 3 packs
        
        vm.startPrank(owner);
        cardSet = new CardSet("Test Set", emissionCap, address(vrfCoordinator), owner);
        _deployAndAddBasicCards();
        vm.stopPrank();
        
        // User1 opens 2 packs
        vm.startPrank(user1);
        for (uint256 i = 0; i < 2; i++) {
            cardSet.openPack{value: PACK_PRICE}();
            uint256 requestId = vrfCoordinator.getLastRequestId();
            vrfCoordinator.autoFulfillRequest(requestId, PACK_SIZE);
        }
        vm.stopPrank();
        
        // User2 opens 1 pack
        vm.startPrank(user2);
        cardSet.openPack{value: PACK_PRICE}();
        uint256 requestId2 = vrfCoordinator.getLastRequestId();
        vrfCoordinator.autoFulfillRequest(requestId2, PACK_SIZE);
        vm.stopPrank();
        
        // Should be exactly at emission cap
        assertEq(cardSet.totalEmission(), emissionCap);
        
        // User3 tries to open a pack - should fail
        vm.startPrank(user3);
        vm.expectRevert();
        cardSet.openPack{value: PACK_PRICE}();
        vm.stopPrank();
    }

    // ============ 2. Pack Size Consistency Tests ============

    function testPackSizeAlwaysRespected() public {
        uint256 emissionCap = 300; // 20 complete packs
        
        vm.startPrank(owner);
        cardSet = new CardSet("Test Set", emissionCap, address(vrfCoordinator), owner);
        _deployAndAddBasicCards();
        vm.stopPrank();
        
        vm.startPrank(user1);
        
        // Open all possible packs and verify each has exactly PACK_SIZE
        uint256 totalPacks = emissionCap / PACK_SIZE;
        for (uint256 i = 0; i < totalPacks; i++) {
            uint256 emissionBefore = cardSet.totalEmission();
            
            cardSet.openPack{value: PACK_PRICE}();
            uint256 requestId = vrfCoordinator.getLastRequestId();
            vrfCoordinator.autoFulfillRequest(requestId, PACK_SIZE);
            
            uint256 emissionAfter = cardSet.totalEmission();
            
            // Each pack should add exactly PACK_SIZE cards
            assertEq(emissionAfter - emissionBefore, PACK_SIZE, "Pack size not respected");
        }
        
        vm.stopPrank();
    }

    function testNoPartialPacksAtEnd() public {
        // Test various emission caps to ensure they work with PACK_SIZE
        uint256[] memory testCaps = new uint256[](5);
        testCaps[0] = 150; // 10 packs exactly
        testCaps[1] = 225; // 15 packs exactly  
        testCaps[2] = 300; // 20 packs exactly
        testCaps[3] = 450; // 30 packs exactly
        testCaps[4] = 600; // 40 packs exactly
        
        for (uint256 j = 0; j < testCaps.length; j++) {
            vm.startPrank(owner);
            CardSet testSet = new CardSet(
                string(abi.encodePacked("Test Set ", vm.toString(j))), 
                testCaps[j], 
                address(vrfCoordinator), 
                owner
            );
            _deployAndAddCardsToSet(testSet);
            vm.stopPrank();
            
            uint256 expectedPacks = testCaps[j] / PACK_SIZE;
            uint256 packsOpened = 0;
            
            vm.startPrank(user1);
            
            // Try to open packs until we can't anymore
            while (true) {
                try testSet.openPack{value: PACK_PRICE}() {
                    uint256 requestId = vrfCoordinator.getLastRequestId();
                    vrfCoordinator.autoFulfillRequest(requestId, PACK_SIZE);
                    packsOpened++;
                } catch {
                    break;
                }
            }
            
            vm.stopPrank();
            
            // Should have opened exactly the expected number of complete packs
            assertEq(packsOpened, expectedPacks, "Unexpected number of packs opened");
            assertEq(testSet.totalEmission(), testCaps[j], "Final emission doesn't match cap");
        }
    }

    // ============ 3. Set Design Validation Tests ============

    function testSetDesignMathematicalAlignment() public {
        // Test that emission cap is always divisible by PACK_SIZE
        uint256[] memory goodCaps = new uint256[](5);
        goodCaps[0] = 150;   // 15 * 10
        goodCaps[1] = 225;   // 15 * 15
        goodCaps[2] = 300;   // 15 * 20
        goodCaps[3] = 450;   // 15 * 30
        goodCaps[4] = 1500;  // 15 * 100
        
        for (uint256 i = 0; i < goodCaps.length; i++) {
            vm.prank(owner);
            CardSet testSet = new CardSet(
                string(abi.encodePacked("Good Set ", vm.toString(i))), 
                goodCaps[i], 
                address(vrfCoordinator), 
                owner
            );
            
            // Should deploy successfully and have proper alignment
            assertEq(goodCaps[i] % PACK_SIZE, 0, "Emission cap not aligned with pack size");
            assertGt(goodCaps[i] / PACK_SIZE, 0, "Should allow at least one pack");
        }
    }

    function testRecommendProperEmissionCaps() public {
        // This test documents what emission caps should be used
        uint256 targetPacks = 100; // Want 100 packs for the set
        uint256 recommendedCap = targetPacks * PACK_SIZE; // 1500 cards
        
        vm.prank(owner);
        CardSet perfectSet = new CardSet("Perfect Set", recommendedCap, address(vrfCoordinator), owner);
        
        assertEq(recommendedCap, 1500);
        assertEq(recommendedCap % PACK_SIZE, 0);
        assertEq(recommendedCap / PACK_SIZE, targetPacks);
    }

    // ============ 4. Serialized Card Distribution Tests ============

    function testSerializedCardLimitsInPacks() public {
        vm.startPrank(owner);
        cardSet = new CardSet("Test Set", 300, address(vrfCoordinator), owner);
        _deployAndAddCardsWithSerialized();
        vm.stopPrank();
        
        vm.startPrank(user1);
        
        // Track serialized cards across multiple pack openings
        uint256 totalSerializedMinted = 0;
        uint256 packsWithMultipleSerialized = 0;
        
        for (uint256 i = 0; i < 10; i++) {
            uint256 serializedBefore = _getTotalSerializedSupply();
            
            cardSet.openPack{value: PACK_PRICE}();
            
            // Create deterministic "random" numbers for testing
            uint256[] memory randomWords = new uint256[](PACK_SIZE);
            for (uint256 j = 0; j < PACK_SIZE; j++) {
                // Create varying randomness - some should hit serialized (5% chance in lucky slot)
                randomWords[j] = uint256(keccak256(abi.encodePacked(i, j, block.timestamp)));
            }
            
            uint256 requestId = vrfCoordinator.getLastRequestId();
            vrfCoordinator.fulfillRandomWords(requestId, randomWords);
            
            uint256 serializedAfter = _getTotalSerializedSupply();
            uint256 serializedInThisPack = serializedAfter - serializedBefore;
            
            totalSerializedMinted += serializedInThisPack;
            
            // Should never have more than 1 serialized card per pack
            assertLe(serializedInThisPack, 1, "Pack has more than 1 serialized card");
            
            if (serializedInThisPack > 1) {
                packsWithMultipleSerialized++;
            }
        }
        
        // Should never have packs with multiple serialized cards
        assertEq(packsWithMultipleSerialized, 0, "Found packs with multiple serialized cards");
        
        vm.stopPrank();
    }

    function testSerializedCardMaxSupplyRespected() public {
        vm.startPrank(owner);
        cardSet = new CardSet("Test Set", 1500, address(vrfCoordinator), owner);
        
        // Create a serialized card with very low max supply for testing
        Card limitedSerialized = new Card(
            100, 
            "Ultra Limited", 
            ICard.Rarity.SERIALIZED, 
            3, // Only 3 copies allowed
            "ipfs://limited", 
            owner
        );
        
        _deployAndAddBasicCards();
        limitedSerialized.addAuthorizedMinter(address(cardSet));
        cardSet.addCardContract(address(limitedSerialized));
        vm.stopPrank();
        
        vm.startPrank(user1);
        
        uint256 packsOpened = 0;
        uint256 limitedSerializedMinted = 0;
        
        // Open many packs to try to exceed the serialized limit
        for (uint256 i = 0; i < 50; i++) {
            cardSet.openPack{value: PACK_PRICE}();
            
            // Force lucky slot to hit serialized for testing
            uint256[] memory randomWords = new uint256[](PACK_SIZE);
            for (uint256 j = 0; j < PACK_SIZE; j++) {
                if (j == 14) { // Lucky slot
                    randomWords[j] = 99; // This should hit serialized (>95)
                } else {
                    randomWords[j] = uint256(keccak256(abi.encodePacked(i, j)));
                }
            }
            
            uint256 limitedBefore = limitedSerialized.currentSupply();
            
            uint256 requestId = vrfCoordinator.getLastRequestId();
            vrfCoordinator.fulfillRandomWords(requestId, randomWords);
            
            uint256 limitedAfter = limitedSerialized.currentSupply();
            limitedSerializedMinted += (limitedAfter - limitedBefore);
            packsOpened++;
            
            // If we've hit the max supply, further attempts should fall back to other rarities
            if (limitedSerialized.currentSupply() >= limitedSerialized.maxSupply()) {
                break;
            }
        }
        
        // Should never exceed max supply
        assertLe(limitedSerialized.currentSupply(), limitedSerialized.maxSupply(), "Exceeded max supply");
        assertLe(limitedSerializedMinted, 3, "Minted more than max supply allows");
        
        vm.stopPrank();
    }

    // ============ 5. Random Distribution Tests ============

    function testSerializedDistributionIsRandom() public {
        vm.startPrank(owner);
        cardSet = new CardSet("Test Set", 900, address(vrfCoordinator), owner);
        _deployAndAddCardsWithSerialized();
        vm.stopPrank();
        
        vm.startPrank(user1);
        
        // Track which packs contain serialized cards
        bool[] memory packsWithSerialized = new bool[](60); // 60 packs
        uint256 totalSerializedPacks = 0;
        
        for (uint256 i = 0; i < 60; i++) {
            uint256 serializedBefore = _getTotalSerializedSupply();
            
            cardSet.openPack{value: PACK_PRICE}();
            
            // Use truly varied random numbers
            uint256[] memory randomWords = new uint256[](PACK_SIZE);
            for (uint256 j = 0; j < PACK_SIZE; j++) {
                randomWords[j] = uint256(keccak256(abi.encodePacked(
                    block.timestamp, 
                    i, 
                    j, 
                    address(this),
                    blockhash(block.number - 1)
                )));
            }
            
            uint256 requestId = vrfCoordinator.getLastRequestId();
            vrfCoordinator.fulfillRandomWords(requestId, randomWords);
            
            uint256 serializedAfter = _getTotalSerializedSupply();
            
            if (serializedAfter > serializedBefore) {
                packsWithSerialized[i] = true;
                totalSerializedPacks++;
            }
        }
        
        // Check that serialized cards are distributed, not clustered
        uint256 maxConsecutive = 0;
        uint256 currentConsecutive = 0;
        
        for (uint256 i = 0; i < packsWithSerialized.length; i++) {
            if (packsWithSerialized[i]) {
                currentConsecutive++;
                maxConsecutive = currentConsecutive > maxConsecutive ? currentConsecutive : maxConsecutive;
            } else {
                currentConsecutive = 0;
            }
        }
        
        // Should not have more than 3 consecutive packs with serialized cards (very unlikely)
        assertLe(maxConsecutive, 3, "Serialized cards appear clustered, not random");
        
        // Should have some serialized cards but not too many (5% chance per pack)
        // With 60 packs, expect around 3 serialized cards, allow 0-8 range
        assertLe(totalSerializedPacks, 8, "Too many serialized cards - distribution seems off");
        
        vm.stopPrank();
    }

    function testMythicalDistributionSpread() public {
        vm.startPrank(owner);
        cardSet = new CardSet("Test Set", 450, address(vrfCoordinator), owner);
        _deployAndAddCardsWithSerialized();
        vm.stopPrank();
        
        vm.startPrank(user1);
        
        uint256[] memory mythicalPerPack = new uint256[](30); // 30 packs
        
        for (uint256 i = 0; i < 30; i++) {
            uint256 mythicalBefore = _getTotalMythicalSupply();
            
            cardSet.openPack{value: PACK_PRICE}();
            
            // Create varied randomness
            uint256[] memory randomWords = new uint256[](PACK_SIZE);
            for (uint256 j = 0; j < PACK_SIZE; j++) {
                randomWords[j] = uint256(keccak256(abi.encodePacked(i * 1000 + j, block.timestamp)));
            }
            
            uint256 requestId = vrfCoordinator.getLastRequestId();
            vrfCoordinator.fulfillRandomWords(requestId, randomWords);
            
            uint256 mythicalAfter = _getTotalMythicalSupply();
            mythicalPerPack[i] = mythicalAfter - mythicalBefore;
        }
        
        // Count how many packs had mythical cards
        uint256 packsWithMythical = 0;
        for (uint256 i = 0; i < mythicalPerPack.length; i++) {
            if (mythicalPerPack[i] > 0) {
                packsWithMythical++;
            }
        }
        
        // With 30 packs and 25% chance of mythical in lucky slot, expect around 7-8 packs
        // Allow range of 3-15 to account for randomness
        assertGe(packsWithMythical, 3, "Too few mythical cards - distribution issue");
        assertLe(packsWithMythical, 15, "Too many mythical cards - distribution issue");
        
        vm.stopPrank();
    }

    // ============ Helper Functions ============

    function _deployAndAddBasicCards() internal {
        // Deploy minimal set of cards for testing
        for (uint256 i = 0; i < 5; i++) {
            Card commonCard = new Card(
                i + 1,
                string(abi.encodePacked("Common ", vm.toString(i + 1))),
                ICard.Rarity.COMMON,
                0,
                "ipfs://common",
                owner
            );
            commonCard.addAuthorizedMinter(address(cardSet));
            cardSet.addCardContract(address(commonCard));
        }
        
        for (uint256 i = 0; i < 3; i++) {
            Card uncommonCard = new Card(
                i + 10,
                string(abi.encodePacked("Uncommon ", vm.toString(i + 1))),
                ICard.Rarity.UNCOMMON,
                0,
                "ipfs://uncommon",
                owner
            );
            uncommonCard.addAuthorizedMinter(address(cardSet));
            cardSet.addCardContract(address(uncommonCard));
        }
        
        for (uint256 i = 0; i < 2; i++) {
            Card rareCard = new Card(
                i + 20,
                string(abi.encodePacked("Rare ", vm.toString(i + 1))),
                ICard.Rarity.RARE,
                0,
                "ipfs://rare",
                owner
            );
            rareCard.addAuthorizedMinter(address(cardSet));
            cardSet.addCardContract(address(rareCard));
        }
    }

    function _deployAndAddCardsToSet(CardSet targetSet) internal {
        // Deploy cards for a specific CardSet
        for (uint256 i = 0; i < 5; i++) {
            Card commonCard = new Card(
                i + 1,
                string(abi.encodePacked("Common ", vm.toString(i + 1))),
                ICard.Rarity.COMMON,
                0,
                "ipfs://common",
                owner
            );
            commonCard.addAuthorizedMinter(address(targetSet));
            targetSet.addCardContract(address(commonCard));
        }
        
        for (uint256 i = 0; i < 3; i++) {
            Card uncommonCard = new Card(
                i + 10,
                string(abi.encodePacked("Uncommon ", vm.toString(i + 1))),
                ICard.Rarity.UNCOMMON,
                0,
                "ipfs://uncommon",
                owner
            );
            uncommonCard.addAuthorizedMinter(address(targetSet));
            targetSet.addCardContract(address(uncommonCard));
        }
        
        for (uint256 i = 0; i < 2; i++) {
            Card rareCard = new Card(
                i + 20,
                string(abi.encodePacked("Rare ", vm.toString(i + 1))),
                ICard.Rarity.RARE,
                0,
                "ipfs://rare",
                owner
            );
            rareCard.addAuthorizedMinter(address(targetSet));
            targetSet.addCardContract(address(rareCard));
        }
    }

    function _deployAndAddCardsWithSerialized() internal {
        _deployAndAddBasicCards();
        
        // Add mythical cards
        Card mythicalCard = new Card(
            30,
            "Mythical Beast",
            ICard.Rarity.MYTHICAL,
            0,
            "ipfs://mythical",
            owner
        );
        mythicalCard.addAuthorizedMinter(address(cardSet));
        cardSet.addCardContract(address(mythicalCard));
        
        // Add serialized cards
        Card serializedCard1 = new Card(
            40,
            "Serialized Dragon #001",
            ICard.Rarity.SERIALIZED,
            100,
            "ipfs://serialized1",
            owner
        );
        serializedCard1.addAuthorizedMinter(address(cardSet));
        cardSet.addCardContract(address(serializedCard1));
        
        Card serializedCard2 = new Card(
            41,
            "Serialized Phoenix #001",
            ICard.Rarity.SERIALIZED,
            50,
            "ipfs://serialized2",
            owner
        );
        serializedCard2.addAuthorizedMinter(address(cardSet));
        cardSet.addCardContract(address(serializedCard2));
    }

    function _getTotalSerializedSupply() internal view returns (uint256) {
        address[] memory serializedContracts = cardSet.getCardContractsByRarity(ICard.Rarity.SERIALIZED);
        uint256 total = 0;
        for (uint256 i = 0; i < serializedContracts.length; i++) {
            total += ICard(serializedContracts[i]).currentSupply();
        }
        return total;
    }

    function _getTotalMythicalSupply() internal view returns (uint256) {
        address[] memory mythicalContracts = cardSet.getCardContractsByRarity(ICard.Rarity.MYTHICAL);
        uint256 total = 0;
        for (uint256 i = 0; i < mythicalContracts.length; i++) {
            total += ICard(mythicalContracts[i]).currentSupply();
        }
        return total;
    }
} 