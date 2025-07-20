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

    function testValidateEmissionCapForPackSizeValid() public {
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
            (bool isValid, uint256 suggestedLower, uint256 suggestedHigher) = 
                cardSet.validateEmissionCapForPackSize(validCaps[i]);
            
            assertTrue(isValid, "Should be valid");
            assertEq(suggestedLower, validCaps[i], "Suggested lower should equal input");
            assertEq(suggestedHigher, validCaps[i], "Suggested higher should equal input");
        }
        
        vm.stopPrank();
    }

    function testValidateEmissionCapForPackSizeInvalid() public {
        vm.startPrank(owner);
        cardSet = new CardSet("Test Set", 150, address(vrfCoordinator), owner);
        
        // Test case: 16 (should suggest 15 lower, 30 higher)
        (bool isValid, uint256 suggestedLower, uint256 suggestedHigher) = 
            cardSet.validateEmissionCapForPackSize(16);
        
        assertFalse(isValid, "Should be invalid");
        assertEq(suggestedLower, 15, "Should suggest 15 as lower");
        assertEq(suggestedHigher, 30, "Should suggest 30 as higher");
        
        // Test case: 29 (should suggest 15 lower, 30 higher)
        (isValid, suggestedLower, suggestedHigher) = 
            cardSet.validateEmissionCapForPackSize(29);
        
        assertFalse(isValid, "Should be invalid");
        assertEq(suggestedLower, 15, "Should suggest 15 as lower");
        assertEq(suggestedHigher, 30, "Should suggest 30 as higher");
        
        // Test case: 100 (should suggest 90 lower, 105 higher)
        (isValid, suggestedLower, suggestedHigher) = 
            cardSet.validateEmissionCapForPackSize(100);
        
        assertFalse(isValid, "Should be invalid");
        assertEq(suggestedLower, 90, "Should suggest 90 as lower");
        assertEq(suggestedHigher, 105, "Should suggest 105 as higher");
        
        // Test case: 1001 (should suggest 990 lower, 1005 higher)
        // 1001 / 15 = 66.73, so 66 * 15 = 990 (lower), 67 * 15 = 1005 (higher)
        (isValid, suggestedLower, suggestedHigher) = 
            cardSet.validateEmissionCapForPackSize(1001);
        
        assertFalse(isValid, "Should be invalid");
        assertEq(suggestedLower, 990, "Should suggest 990 as lower");
        assertEq(suggestedHigher, 1005, "Should suggest 1005 as higher");
        
        vm.stopPrank();
    }

    function testValidateEmissionCapForPackSizeEdgeCases() public {
        vm.startPrank(owner);
        cardSet = new CardSet("Test Set", 150, address(vrfCoordinator), owner);
        
        // Test case: 1 (less than pack size)
        (bool isValid, uint256 suggestedLower, uint256 suggestedHigher) = 
            cardSet.validateEmissionCapForPackSize(1);
        
        assertFalse(isValid, "Should be invalid");
        assertEq(suggestedLower, 0, "Should suggest 0 as lower for values < PACK_SIZE");
        assertEq(suggestedHigher, 15, "Should suggest 15 as higher");
        
        // Test case: 14 (one less than pack size)
        (isValid, suggestedLower, suggestedHigher) = 
            cardSet.validateEmissionCapForPackSize(14);
        
        assertFalse(isValid, "Should be invalid");
        assertEq(suggestedLower, 0, "Should suggest 0 as lower");
        assertEq(suggestedHigher, 15, "Should suggest 15 as higher");
        
        // Test case: 0 (should be handled specially)
        (isValid, suggestedLower, suggestedHigher) = 
            cardSet.validateEmissionCapForPackSize(0);
        
        assertFalse(isValid, "Should be invalid");
        assertEq(suggestedLower, 0, "Should suggest 0 as lower");
        assertEq(suggestedHigher, 15, "Should suggest 15 as higher");
        
        vm.stopPrank();
    }

    // ============ Set Emission Cap Function Tests ============

    function testSetEmissionCapValid() public {
        vm.startPrank(owner);
        cardSet = new CardSet("Test Set", 150, address(vrfCoordinator), owner);
        
        // Should be able to set valid emission cap
        cardSet.setEmissionCap(300);
        assertEq(cardSet.emissionCap(), 300, "Emission cap should be updated");
        
        // Should be able to set another valid emission cap
        cardSet.setEmissionCap(450);
        assertEq(cardSet.emissionCap(), 450, "Emission cap should be updated again");
        
        vm.stopPrank();
    }

    function testSetEmissionCapInvalid() public {
        vm.startPrank(owner);
        cardSet = new CardSet("Test Set", 150, address(vrfCoordinator), owner);
        
        // Should revert for invalid emission cap
        vm.expectRevert();
        cardSet.setEmissionCap(100); // Not divisible by 15
        
        vm.expectRevert();
        cardSet.setEmissionCap(151); // Not divisible by 15
        
        vm.expectRevert();
        cardSet.setEmissionCap(1); // Too small
        
        vm.stopPrank();
    }

    function testSetEmissionCapUnauthorized() public {
        vm.startPrank(owner);
        cardSet = new CardSet("Test Set", 150, address(vrfCoordinator), owner);
        vm.stopPrank();
        
        // Should revert for non-owner
        vm.startPrank(address(0x999));
        vm.expectRevert();
        cardSet.setEmissionCap(300);
        vm.stopPrank();
    }

    function testSetEmissionCapWhenLocked() public {
        vm.startPrank(owner);
        cardSet = new CardSet("Test Set", 150, address(vrfCoordinator), owner);
        
        // Add a card and lock the set
        Card testCard = new Card(1, "Test Card", ICard.Rarity.COMMON, 0, "ipfs://test", owner);
        testCard.addAuthorizedMinter(address(cardSet));
        cardSet.addCardContract(address(testCard));
        cardSet.lockSet();
        
        // Should revert when trying to change emission cap after locking
        vm.expectRevert(CardSetErrors.SetIsLocked.selector);
        cardSet.setEmissionCap(300);
        
        vm.stopPrank();
    }

    function testSetEmissionCapAfterEmissionStarted() public {
        vm.startPrank(owner);
        cardSet = new CardSet("Test Set", 150, address(vrfCoordinator), owner);
        
        // Add a card to enable pack opening
        Card testCard = new Card(1, "Test Card", ICard.Rarity.COMMON, 0, "ipfs://test", owner);
        testCard.addAuthorizedMinter(address(cardSet));
        cardSet.addCardContract(address(testCard));
        
        vm.stopPrank();
        
        // Open a pack to start emission
        address user = address(0x999);
        vm.deal(user, 1 ether);
        vm.startPrank(user);
        cardSet.openPack{value: 0.01 ether}();
        vm.stopPrank();
        
        // Fulfill VRF to complete emission
        uint256 requestId = vrfCoordinator.getLastRequestId();
        vrfCoordinator.autoFulfillRequest(requestId, 15);
        
        // Now try to change emission cap - should fail
        vm.startPrank(owner);
        vm.expectRevert(CardSetErrors.EmissionCapReached.selector);
        cardSet.setEmissionCap(300);
        vm.stopPrank();
    }

    // ============ Error Message Tests ============

    function testInvalidEmissionCapErrorMessage() public {
        vm.startPrank(owner);
        
        // Test specific error with suggestions for value 100
        // Expected: lower = 90, higher = 105
        vm.expectRevert(
            abi.encodeWithSelector(
                CardSetErrors.InvalidEmissionCapForPackSize.selector,
                100,  // provided
                90,   // suggestedLower
                105   // suggestedHigher
            )
        );
        cardSet = new CardSet("Test Set", 100, address(vrfCoordinator), owner);
        
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

    function testLargeEmissionCapCalculations() public {
        vm.startPrank(owner);
        cardSet = new CardSet("Test Set", 150, address(vrfCoordinator), owner);
        
        // Test very large numbers
        uint256 largeInvalid = 999999999; // Should suggest lower and higher
        (bool isValid, uint256 suggestedLower, uint256 suggestedHigher) = 
            cardSet.validateEmissionCapForPackSize(largeInvalid);
        
        assertFalse(isValid, "Large invalid number should be invalid");
        
        // Calculate expected values
        uint256 expectedLower = (largeInvalid / PACK_SIZE) * PACK_SIZE;
        uint256 expectedHigher = expectedLower + PACK_SIZE;
        
        assertEq(suggestedLower, expectedLower, "Should calculate correct lower suggestion");
        assertEq(suggestedHigher, expectedHigher, "Should calculate correct higher suggestion");
        
        vm.stopPrank();
    }
} 