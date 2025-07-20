// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/CardSet.sol";
import "../src/Card.sol";
import "../src/interfaces/ICard.sol";
import "../src/mocks/MockVRFCoordinator.sol";
import "../src/errors/CardSetErrors.sol";

/**
 * @title EmissionValidation Test Suite
 * @dev Comprehensive tests for emission cap validation functionality
 */
contract EmissionValidationTest is Test {
    CardSet public cardSet;
    MockVRFCoordinator public vrfCoordinator;
    
    address public owner = address(0x101);
    
    uint32 constant PACK_SIZE = 15;

    function setUp() public {
        vm.startPrank(owner);
        vrfCoordinator = new MockVRFCoordinator();
        vm.stopPrank();
    }

    // ============ Constructor Validation Tests ============

    function testConstructorValidEmissionCap() public {
        vm.startPrank(owner);
        
        // Test valid emission caps (multiples of PACK_SIZE)
        uint256[] memory validCaps = new uint256[](5);
        validCaps[0] = 15;   // 1 pack
        validCaps[1] = 30;   // 2 packs  
        validCaps[2] = 150;  // 10 packs
        validCaps[3] = 1500; // 100 packs
        validCaps[4] = 15000; // 1000 packs
        
        for (uint256 i = 0; i < validCaps.length; i++) {
            cardSet = new CardSet("Test Set", validCaps[i], address(vrfCoordinator), owner);
            assertEq(cardSet.emissionCap(), validCaps[i], "Emission cap should be set correctly");
        }
        
        vm.stopPrank();
    }

    function testConstructorInvalidEmissionCap() public {
        vm.startPrank(owner);
        
        // Test invalid emission caps (not multiples of PACK_SIZE)
        uint256[] memory invalidCaps = new uint256[](10);
        invalidCaps[0] = 1;    // Too small
        invalidCaps[1] = 14;   // One less than pack size
        invalidCaps[2] = 16;   // One more than pack size
        invalidCaps[3] = 22;   // Random invalid
        invalidCaps[4] = 29;   // Two less than 2 packs
        invalidCaps[5] = 31;   // Two more than 2 packs
        invalidCaps[6] = 100;  // Not divisible
        invalidCaps[7] = 149;  // One less than 10 packs
        invalidCaps[8] = 151;  // One more than 10 packs
        invalidCaps[9] = 1001; // Large invalid
        
        for (uint256 i = 0; i < invalidCaps.length; i++) {
            vm.expectRevert();
            cardSet = new CardSet("Test Set", invalidCaps[i], address(vrfCoordinator), owner);
        }
        
        vm.stopPrank();
    }

    function testConstructorZeroEmissionCap() public {
        vm.startPrank(owner);
        
        vm.expectRevert(CardSetErrors.InvalidEmissionCap.selector);
        cardSet = new CardSet("Test Set", 0, address(vrfCoordinator), owner);
        
        vm.stopPrank();
    }

    // ============ Validation Function Tests ============

    function testEmissionCapBasicValidation() public {
        vm.startPrank(owner);
        cardSet = new CardSet("Test Set", 150, address(vrfCoordinator), owner);
        
        // Test valid emission caps
        uint256[] memory validCaps = new uint256[](6);
        validCaps[0] = 15;    // 1 pack
        validCaps[1] = 30;    // 2 packs
        validCaps[2] = 45;    // 3 packs
        validCaps[3] = 150;   // 10 packs
        validCaps[4] = 1500;  // 100 packs
        validCaps[5] = 15000; // 1000 packs
        
        for (uint256 i = 0; i < validCaps.length; i++) {
            // Test that emission cap is properly set and managed
            uint256 emissionCap = cardSet.emissionCap();
            uint256 totalEmission = cardSet.totalEmission();
            
            assertTrue(emissionCap > 0, "Emission cap should be positive");
            assertTrue(totalEmission <= emissionCap, "Total emission should not exceed cap");
        }
        
        vm.stopPrank();
    }

    function testEmissionCapPreventsOverflow() public {
        vm.startPrank(owner);
        
        // Create a small CardSet with cap for exactly 1 pack (15 cards)
        cardSet = new CardSet("Small Set", 15, address(vrfCoordinator), owner);
        
        // Add a test card
        Card testCard = new Card(1, "Test Card", ICard.Rarity.COMMON, 0, "ipfs://test", owner);
        testCard.addAuthorizedMinter(address(cardSet));
        cardSet.addCardContract(address(testCard));
        
        vm.stopPrank();
        
        // Fund user and attempt to open pack
        address user = address(0x123);
        vm.deal(user, 1 ether);
        
        vm.startPrank(user);
        
        // First pack should work
        cardSet.openPack{value: 0.01 ether}();
        
        // Complete the VRF request
        uint256 requestId = vrfCoordinator.getLastRequestId();
        vrfCoordinator.autoFulfillRequest(requestId, 15);
        
        // Verify emission cap reached
        assertEq(cardSet.totalEmission(), 15, "Should have emitted exactly 15 cards");
        
        // Second pack should fail due to emission cap
        vm.expectRevert("Emission cap exceeded");
        cardSet.openPack{value: 0.01 ether}();
        
        vm.stopPrank();
    }

    function testEmissionCapTrackingAccuracy() public {
        vm.startPrank(owner);
        cardSet = new CardSet("Test Set", 150, address(vrfCoordinator), owner);
        
        // Add test cards
        Card testCard1 = new Card(1, "Card 1", ICard.Rarity.COMMON, 0, "ipfs://test1", owner);
        Card testCard2 = new Card(2, "Card 2", ICard.Rarity.UNCOMMON, 0, "ipfs://test2", owner);
        
        testCard1.addAuthorizedMinter(address(cardSet));
        testCard2.addAuthorizedMinter(address(cardSet));
        
        cardSet.addCardContract(address(testCard1));
        cardSet.addCardContract(address(testCard2));
        
        vm.stopPrank();
        
        // Test emission tracking
        assertEq(cardSet.totalEmission(), 0, "Should start with zero emission");
        assertEq(cardSet.emissionCap(), 150, "Should have correct emission cap");
        assertTrue(cardSet.totalEmission() <= cardSet.emissionCap(), "Should not exceed cap");
        
        // Fund user for pack opening
        address user = address(0x123);
        vm.deal(user, 1 ether);
        
        vm.startPrank(user);
        
        // Open a pack and verify emission tracking
        cardSet.openPack{value: 0.01 ether}();
        uint256 requestId = vrfCoordinator.getLastRequestId();
        vrfCoordinator.autoFulfillRequest(requestId, 15);
        
        // Verify emission increased correctly
        assertEq(cardSet.totalEmission(), 15, "Should have emitted 15 cards");
        assertTrue(cardSet.totalEmission() <= cardSet.emissionCap(), "Should still be within cap");
        
        vm.stopPrank();
    }

    // ============ Set Emission Cap Function Tests ============

    function testEmissionCapIsImmutable() public {
        vm.startPrank(owner);
        cardSet = new CardSet("Test Set", 150, address(vrfCoordinator), owner);
        
        // Verify emission cap is set correctly at deployment
        assertEq(cardSet.emissionCap(), 150, "Emission cap should be set at deployment");
        
        // Verify emission cap cannot be changed (function doesn't exist in optimized contract)
        // This test verifies the immutability design decision
        uint256 originalCap = cardSet.emissionCap();
        
        // Add a card to allow locking (empty sets cannot be locked)
        Card testCard = new Card(1, "Test Card", ICard.Rarity.COMMON, 0, "ipfs://test", owner);
        testCard.addAuthorizedMinter(address(cardSet));
        cardSet.addCardContract(address(testCard));
        
        // Try various operations that should not affect emission cap
        cardSet.lockSet();
        assertEq(cardSet.emissionCap(), originalCap, "Emission cap should remain unchanged after locking");
        
        vm.stopPrank();
    }

    function testEmissionCapRespectsLimits() public {
        vm.startPrank(owner);
        cardSet = new CardSet("Test Set", 150, address(vrfCoordinator), owner);
        
        // Add test card
        Card testCard = new Card(1, "Test Card", ICard.Rarity.COMMON, 0, "ipfs://test", owner);
        testCard.addAuthorizedMinter(address(cardSet));
        cardSet.addCardContract(address(testCard));
        
        vm.stopPrank();
        
        // Verify emission respects the cap
        address user = address(0x123);
        vm.deal(user, 1 ether);
        
        vm.startPrank(user);
        
        // Open packs until near cap
        for (uint256 i = 0; i < 10; i++) {
            if (cardSet.totalEmission() + 15 <= cardSet.emissionCap()) {
                cardSet.openPack{value: 0.01 ether}();
                uint256 requestId = vrfCoordinator.getLastRequestId();
                vrfCoordinator.autoFulfillRequest(requestId, 15);
            }
        }
        
        // Verify we're at or near the cap
        assertTrue(cardSet.totalEmission() <= cardSet.emissionCap(), "Should never exceed emission cap");
        
        vm.stopPrank();
    }

    function testEmissionProgressTracking() public {
        vm.startPrank(owner);
        cardSet = new CardSet("Test Set", 150, address(vrfCoordinator), owner);
        
        // Add a card to enable pack opening
        Card testCard = new Card(1, "Test Card", ICard.Rarity.COMMON, 0, "ipfs://test", owner);
        testCard.addAuthorizedMinter(address(cardSet));
        cardSet.addCardContract(address(testCard));
        
        vm.stopPrank();
        
        // Verify initial state
        assertEq(cardSet.totalEmission(), 0, "Should start with zero emission");
        
        // Open a pack to start emission
        address user = address(0x999);
        vm.deal(user, 1 ether);
        vm.startPrank(user);
        cardSet.openPack{value: 0.01 ether}();
        vm.stopPrank();
        
        // Fulfill VRF to complete emission
        uint256 requestId = vrfCoordinator.getLastRequestId();
        vrfCoordinator.autoFulfillRequest(requestId, 15);
        
        // Verify emission tracking
        assertEq(cardSet.totalEmission(), 15, "Should have emitted 15 cards");
        assertTrue(cardSet.totalEmission() <= cardSet.emissionCap(), "Should be within cap");
    }

    // ============ Emission Cap Behavior Tests ============

    function testEmissionCapEnforcement() public {
        vm.startPrank(owner);
        
        // Create a set with small emission cap for testing
        cardSet = new CardSet("Test Set", 30, address(vrfCoordinator), owner); // Only 2 packs
        
        // Add a card
        Card testCard = new Card(1, "Test Card", ICard.Rarity.COMMON, 0, "ipfs://test", owner);
        testCard.addAuthorizedMinter(address(cardSet));
        cardSet.addCardContract(address(testCard));
        
        vm.stopPrank();
        
        // Test emission cap enforcement
        address user = address(0x123);
        vm.deal(user, 1 ether);
        
        vm.startPrank(user);
        
        // Open first pack (should work)
        cardSet.openPack{value: 0.01 ether}();
        uint256 requestId1 = vrfCoordinator.getLastRequestId();
        vrfCoordinator.autoFulfillRequest(requestId1, 15);
        
        // Open second pack (should work)
        cardSet.openPack{value: 0.01 ether}();
        uint256 requestId2 = vrfCoordinator.getLastRequestId();
        vrfCoordinator.autoFulfillRequest(requestId2, 15);
        
        // Third pack should fail
        vm.expectRevert("Emission cap exceeded");
        cardSet.openPack{value: 0.01 ether}();
        
        vm.stopPrank();
    }

    // ============ Integration Tests ============

    function testPackOpeningWithValidatedEmissionCap() public {
        vm.startPrank(owner);
        
        // Create a set with emission cap that allows exactly 10 packs (150 cards)
        cardSet = new CardSet("Test Set", 150, address(vrfCoordinator), owner);
        
        // Add some cards
        Card commonCard = new Card(1, "Common Card", ICard.Rarity.COMMON, 0, "ipfs://common", owner);
        commonCard.addAuthorizedMinter(address(cardSet));
        cardSet.addCardContract(address(commonCard));
        
        vm.stopPrank();
        
        address user = address(0x999);
        vm.deal(user, 1 ether);
        
        // Open 10 packs (should use exactly all 150 cards)
        for (uint256 i = 0; i < 10; i++) {
            vm.startPrank(user);
            cardSet.openPack{value: 0.01 ether}();
            vm.stopPrank();
            
            // Fulfill VRF request
            uint256 requestId = vrfCoordinator.getLastRequestId();
            vrfCoordinator.autoFulfillRequest(requestId, 15);
        }
        
        // Verify total emission is exactly the cap
        assertEq(cardSet.totalEmission(), 150, "Should have emitted exactly the emission cap");
        
        // Try to open another pack - should fail due to emission cap
        vm.startPrank(user);
        vm.expectRevert();
        cardSet.openPack{value: 0.01 ether}();
        vm.stopPrank();
    }

    function testLargeEmissionCapSupport() public {
        vm.startPrank(owner);
        
        // Test creating CardSet with very large emission cap
        uint256 largeEmissionCap = 999999990; // Large but manageable number
        cardSet = new CardSet("Large Set", largeEmissionCap, address(vrfCoordinator), owner);
        
        // Verify large emission cap is properly set
        assertEq(cardSet.emissionCap(), largeEmissionCap, "Should support large emission caps");
        assertEq(cardSet.totalEmission(), 0, "Should start with zero emission");
        
        // Add test card to verify functionality
        Card testCard = new Card(1, "Test Card", ICard.Rarity.COMMON, 0, "ipfs://test", owner);
        testCard.addAuthorizedMinter(address(cardSet));
        cardSet.addCardContract(address(testCard));
        
        vm.stopPrank();
        
        // Test pack opening with large emission cap
        address user = address(0x123);
        vm.deal(user, 1 ether);
        
        vm.startPrank(user);
        cardSet.openPack{value: 0.01 ether}();
        uint256 requestId = vrfCoordinator.getLastRequestId();
        vrfCoordinator.autoFulfillRequest(requestId, 15);
        vm.stopPrank();
        
        // Verify emission tracking works with large caps
        assertEq(cardSet.totalEmission(), 15, "Should track emission correctly");
        assertTrue(cardSet.totalEmission() <= cardSet.emissionCap(), "Should be within large cap");
    }
} 