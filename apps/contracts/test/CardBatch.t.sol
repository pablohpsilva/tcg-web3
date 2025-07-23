// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/CardBatch.sol";
import "../src/CardSetBatch.sol";
import "../src/interfaces/ICard.sol";
import "../src/mocks/MockVRFCoordinator.sol";

contract CardBatchTest is Test {
    CardBatch public cardBatch;
    CardSetBatch public cardSetBatch;
    MockVRFCoordinator public vrfCoordinator;
    
    address public owner = address(0x1);
    address public user = address(0x2);
    address public user2 = address(0x3);
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy VRF Coordinator
        vrfCoordinator = new MockVRFCoordinator();
        
        // Prepare card data
        CardBatch.CardCreationData[] memory cards = new CardBatch.CardCreationData[](6);
        
        cards[0] = CardBatch.CardCreationData({
            cardId: 1,
            name: "Fire Sprite",
            rarity: ICard.Rarity.COMMON,
            maxSupply: 1000,
            metadataURI: "https://api.tcg.com/1"
        });
        
        cards[1] = CardBatch.CardCreationData({
            cardId: 2,
            name: "Water Elemental",
            rarity: ICard.Rarity.COMMON,
            maxSupply: 1000,
            metadataURI: "https://api.tcg.com/2"
        });
        
        cards[2] = CardBatch.CardCreationData({
            cardId: 3,
            name: "Lightning Bolt",
            rarity: ICard.Rarity.UNCOMMON,
            maxSupply: 500,
            metadataURI: "https://api.tcg.com/3"
        });
        
        cards[3] = CardBatch.CardCreationData({
            cardId: 4,
            name: "Ice Storm",
            rarity: ICard.Rarity.UNCOMMON,
            maxSupply: 500,
            metadataURI: "https://api.tcg.com/4"
        });
        
        cards[4] = CardBatch.CardCreationData({
            cardId: 5,
            name: "Dragon Lord",
            rarity: ICard.Rarity.RARE,
            maxSupply: 100,
            metadataURI: "https://api.tcg.com/5"
        });
        
        cards[5] = CardBatch.CardCreationData({
            cardId: 6,
            name: "Ancient Phoenix",
            rarity: ICard.Rarity.MYTHICAL,
            maxSupply: 10,
            metadataURI: "https://api.tcg.com/6"
        });
        
        // Deploy CardBatch
        cardBatch = new CardBatch(
            "Test Batch",
            cards,
            "https://api.tcg.com/",
            owner
        );
        
        // Deploy CardSetBatch
        cardSetBatch = new CardSetBatch(
            "Test Set",
            1500, // 100 packs * 15 cards each
            address(vrfCoordinator),
            address(cardBatch),
            owner
        );
        
        // Add deck types
        uint256[] memory starterIds = new uint256[](2);
        uint256[] memory starterQuantities = new uint256[](2);
        starterIds[0] = 1;
        starterIds[1] = 2;
        starterQuantities[0] = 3;
        starterQuantities[1] = 3;
        
        cardSetBatch.addDeckType("Starter", starterIds, starterQuantities);
        
        uint256[] memory premiumIds = new uint256[](4);
        uint256[] memory premiumQuantities = new uint256[](4);
        premiumIds[0] = 3;
        premiumIds[1] = 4;
        premiumIds[2] = 5;
        premiumIds[3] = 6;
        premiumQuantities[0] = 2;
        premiumQuantities[1] = 2;
        premiumQuantities[2] = 1;
        premiumQuantities[3] = 1;
        
        cardSetBatch.addDeckType("Premium", premiumIds, premiumQuantities);
        
        vm.stopPrank();
        
        // Fund test accounts
        vm.deal(user, 10 ether);
        vm.deal(user2, 10 ether);
    }
    
    function testCardBatchDeployment() public {
        assertEq(cardBatch.batchName(), "Test Batch");
        assertEq(cardBatch.getTotalCards(), 6);
        assertEq(cardBatch.owner(), owner);
        
        // Check card info
        ICard.CardInfo memory cardInfo = cardBatch.getCardInfo(1);
        assertEq(cardInfo.name, "Fire Sprite");
        assertEq(uint8(cardInfo.rarity), uint8(ICard.Rarity.COMMON));
        assertEq(cardInfo.maxSupply, 1000);
        assertEq(cardInfo.currentSupply, 0);
        assertTrue(cardInfo.active);
    }
    
    function testCardSetBatchDeployment() public {
        assertEq(cardSetBatch.setName(), "Test Set");
        assertEq(cardSetBatch.emissionCap(), 1500);
        assertEq(cardSetBatch.totalEmission(), 0);
        assertEq(cardSetBatch.packPrice(), 0.01 ether);
        assertEq(address(cardSetBatch.cardBatch()), address(cardBatch));
        assertFalse(cardSetBatch.isLocked());
    }
    
    function testGetCardsByRarity() public {
        uint256[] memory commonCards = cardBatch.getCardsByRarity(ICard.Rarity.COMMON);
        assertEq(commonCards.length, 2);
        assertEq(commonCards[0], 1);
        assertEq(commonCards[1], 2);
        
        uint256[] memory rareCards = cardBatch.getCardsByRarity(ICard.Rarity.RARE);
        assertEq(rareCards.length, 1);
        assertEq(rareCards[0], 5);
    }
    
    function testCardAddressGeneration() public {
        address cardAddress1 = cardBatch.getCardAddress(1);
        address cardAddress2 = cardBatch.getCardAddress(2);
        
        assertTrue(cardAddress1 != address(0));
        assertTrue(cardAddress2 != address(0));
        assertTrue(cardAddress1 != cardAddress2);
        
        // Test reverse lookup
        uint256 tokenId = cardBatch.getTokenIdByAddress(cardAddress1);
        assertEq(tokenId, 1);
    }
    
    function testDirectCardMinting() public {
        vm.prank(owner);
        cardBatch.addAuthorizedMinter(user);
        
        vm.prank(user);
        uint256[] memory tokenIds = cardBatch.batchMint(user2, 1, 5);
        
        assertEq(tokenIds.length, 5);
        assertEq(cardBatch.balanceOf(user2, 1), 5);
        
        ICard.CardInfo memory cardInfo = cardBatch.getCardInfo(1);
        assertEq(cardInfo.currentSupply, 5);
    }
    
    function testDeckOpening() public {
        vm.prank(user);
        uint256[] memory tokenIds = cardSetBatch.openDeck{value: 0.05 ether}("Starter");
        
        assertEq(tokenIds.length, 6); // 3 of card 1 + 3 of card 2
        
        // Check balances
        assertEq(cardBatch.balanceOf(user, 1), 3);
        assertEq(cardBatch.balanceOf(user, 2), 3);
        
        // Check deck stats
        (uint256 packsOpened, uint256 decksOpened) = cardSetBatch.getUserStats(user);
        assertEq(packsOpened, 0);
        assertEq(decksOpened, 1);
    }
    
    function testPremiumDeckOpening() public {
        vm.prank(user);
        uint256[] memory tokenIds = cardSetBatch.openDeck{value: 0.05 ether}("Premium");
        
        assertEq(tokenIds.length, 6); // 2+2+1+1
        
        // Check balances
        assertEq(cardBatch.balanceOf(user, 3), 2); // Lightning Bolt
        assertEq(cardBatch.balanceOf(user, 4), 2); // Ice Storm
        assertEq(cardBatch.balanceOf(user, 5), 1); // Dragon Lord
        assertEq(cardBatch.balanceOf(user, 6), 1); // Ancient Phoenix
    }
    
    function testPackOpening() public {
        // We need to mock VRF response for pack opening
        vm.prank(user);
        cardSetBatch.openPack{value: 0.01 ether}();
        
        // Simulate VRF response
        uint256[] memory randomWords = new uint256[](15);
        for (uint256 i = 0; i < 15; i++) {
            randomWords[i] = uint256(keccak256(abi.encode(i, block.timestamp)));
        }
        
        vm.prank(address(vrfCoordinator));
        cardSetBatch.rawFulfillRandomWords(1, randomWords);
        
        // Check that cards were minted
        bool hasCards = false;
        for (uint256 i = 1; i <= 6; i++) {
            if (cardBatch.balanceOf(user, i) > 0) {
                hasCards = true;
                break;
            }
        }
        assertTrue(hasCards, "User should have received cards from pack opening");
        
        // Check stats
        (uint256 packsOpened, uint256 decksOpened) = cardSetBatch.getUserStats(user);
        assertEq(packsOpened, 1);
        assertEq(decksOpened, 0);
    }
    
    function testBatchDeckOpening() public {
        string[] memory deckTypes = new string[](2);
        deckTypes[0] = "Starter";
        deckTypes[1] = "Premium";
        
        vm.prank(user);
        uint256[][] memory allTokenIds = cardSetBatch.openDecksBatch{value: 0.1 ether}(deckTypes);
        
        assertEq(allTokenIds.length, 2);
        assertEq(allTokenIds[0].length, 6); // Starter deck
        assertEq(allTokenIds[1].length, 6); // Premium deck
        
        // Check total balances
        assertEq(cardBatch.balanceOf(user, 1), 3); // Fire Sprite from Starter
        assertEq(cardBatch.balanceOf(user, 2), 3); // Water Elemental from Starter
        assertEq(cardBatch.balanceOf(user, 3), 2); // Lightning Bolt from Premium
        assertEq(cardBatch.balanceOf(user, 4), 2); // Ice Storm from Premium
        assertEq(cardBatch.balanceOf(user, 5), 1); // Dragon Lord from Premium
        assertEq(cardBatch.balanceOf(user, 6), 1); // Ancient Phoenix from Premium
    }
    
    function testCardBatchMultipleMint() public {
        vm.prank(owner);
        cardBatch.addAuthorizedMinter(user);
        
        uint256[] memory tokenIds = new uint256[](3);
        uint256[] memory amounts = new uint256[](3);
        
        tokenIds[0] = 1;
        tokenIds[1] = 2;
        tokenIds[2] = 3;
        amounts[0] = 5;
        amounts[1] = 3;
        amounts[2] = 2;
        
        vm.prank(user);
        uint256[][] memory result = cardBatch.batchMintMultiple(user2, tokenIds, amounts);
        
        assertEq(result.length, 3);
        assertEq(cardBatch.balanceOf(user2, 1), 5);
        assertEq(cardBatch.balanceOf(user2, 2), 3);
        assertEq(cardBatch.balanceOf(user2, 3), 2);
    }
    
    function testSecurityFeatures() public {
        // Test emergency pause
        vm.prank(owner);
        cardSetBatch.emergencyPause();
        
        vm.expectRevert();
        vm.prank(user);
        cardSetBatch.openDeck{value: 0.05 ether}("Starter");
    }
    
    function testPriceManagement() public {
        vm.prank(owner);
        cardSetBatch.setPackPrice(0.02 ether);
        
        assertEq(cardSetBatch.packPrice(), 0.02 ether);
        
        vm.prank(owner);
        cardSetBatch.setDeckPrice("Starter", 0.03 ether);
        
        assertEq(cardSetBatch.getDeckPrice("Starter"), 0.03 ether);
    }
    
    function testRoyaltySystem() public {
        vm.prank(owner);
        cardBatch.setRoyalty(500); // 5%
        
        (uint96 percentage, bool isActive) = cardBatch.getRoyaltyPercentage();
        assertEq(percentage, 500);
        assertTrue(isActive);
        
        (address recipient, uint256 amount, bool royaltyActive) = cardBatch.getRoyaltyInfo(1 ether);
        assertEq(recipient, owner);
        assertEq(amount, 0.05 ether); // 5% of 1 ether
        assertTrue(royaltyActive);
    }
    
    function testAccessControl() public {
        // Test unauthorized minting
        vm.expectRevert();
        vm.prank(user);
        cardBatch.batchMint(user2, 1, 5);
        
        // Test unauthorized deck addition
        uint256[] memory ids = new uint256[](1);
        uint256[] memory quantities = new uint256[](1);
        ids[0] = 1;
        quantities[0] = 1;
        
        vm.expectRevert();
        vm.prank(user);
        cardSetBatch.addDeckType("Test", ids, quantities);
    }
    
    function testOptimizationStats() public {
        (uint256 totalPacksOpened, uint256 totalDecksOpened, uint256 totalCardTypes, bool optimizationsEnabled) = 
            cardSetBatch.getOptimizationStats();
        
        assertEq(totalPacksOpened, 0);
        assertEq(totalDecksOpened, 0);
        assertEq(totalCardTypes, 6);
        assertTrue(optimizationsEnabled);
    }
    
    function testGasOptimization() public {
        // Test gas consumption for batch operations
        vm.prank(owner);
        cardBatch.addAuthorizedMinter(user);
        
        // Measure gas for single mint
        uint256 gasBefore = gasleft();
        vm.prank(user);
        cardBatch.batchMint(user2, 1, 1);
        uint256 gasUsedSingle = gasBefore - gasleft();
        
        // Measure gas for batch mint
        gasBefore = gasleft();
        vm.prank(user);
        cardBatch.batchMint(user2, 2, 10);
        uint256 gasUsedBatch = gasBefore - gasleft();
        
        // Batch minting should be more gas efficient per card
        uint256 gasPerCardSingle = gasUsedSingle;
        uint256 gasPerCardBatch = gasUsedBatch / 10;
        
        assertLt(gasPerCardBatch, gasPerCardSingle, "Batch minting should be more gas efficient");
    }
    
    function testFailInvalidTokenId() public {
        vm.expectRevert();
        cardBatch.getCardInfo(999); // Non-existent token ID
    }
    
    function testFailInsufficientPayment() public {
        vm.expectRevert();
        vm.prank(user);
        cardSetBatch.openDeck{value: 0.001 ether}("Starter"); // Insufficient payment
    }
    
    function testCardBatchIntegration() public {
        // Test that CardSetBatch properly integrates with CardBatch
        uint256[] memory allTokenIds = cardBatch.getAllCardIds();
        assertEq(allTokenIds.length, 6);
        
        address cardBatchAddr = cardSetBatch.getCardBatchContract();
        assertEq(cardBatchAddr, address(cardBatch));
        
        // Test token ID lookup from CardSetBatch
        uint256[] memory commonTokenIds = cardSetBatch.getTokenIdsByRarity(ICard.Rarity.COMMON);
        assertEq(commonTokenIds.length, 2);
    }
} 