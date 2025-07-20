// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/CardSet.sol";
import "../src/Card.sol";
import "../src/mocks/MockVRFCoordinator.sol";
import "../src/interfaces/ICardSet.sol";
import "../src/interfaces/ICard.sol";

/**
 * @title BatchCreationAndLock Test Suite
 * @dev Comprehensive tests for batch card creation and set locking functionality
 */
contract BatchCreationAndLockTest is Test {
    CardSet public cardSet;
    MockVRFCoordinator public vrfCoordinator;
    
    address public owner = address(0x101);
    address public user1 = address(0x102);
    
    uint256 constant EMISSION_CAP = 1005; // Multiple of PACK_SIZE (15)
    uint256 constant PACK_PRICE = 0.01 ether;

    event CardContractsBatchCreated(address[] cardContracts, uint256[] cardIds, string[] names, ICard.Rarity[] rarities);
    event SetLocked(address indexed owner, uint256 totalCardContracts);

    function setUp() public {
        vm.startPrank(owner);
        
        vrfCoordinator = new MockVRFCoordinator();
        cardSet = new CardSet("Test Set", EMISSION_CAP, address(vrfCoordinator), owner);
        
        vm.stopPrank();
    }

    // ============ Batch Creation Tests ============

    function testBatchCreateAndAddCards() public {
        vm.startPrank(owner);
        
        // Prepare batch data
        ICardSet.CardCreationData[] memory cardData = new ICardSet.CardCreationData[](3);
        cardData[0] = ICardSet.CardCreationData({
            cardId: 1,
            name: "Test Common",
            rarity: ICard.Rarity.COMMON,
            maxSupply: 0,
            metadataURI: "ipfs://common"
        });
        cardData[1] = ICardSet.CardCreationData({
            cardId: 2,
            name: "Test Rare",
            rarity: ICard.Rarity.RARE,
            maxSupply: 0,
            metadataURI: "ipfs://rare"
        });
        cardData[2] = ICardSet.CardCreationData({
            cardId: 3,
            name: "Test Serialized",
            rarity: ICard.Rarity.SERIALIZED,
            maxSupply: 100,
            metadataURI: "ipfs://serialized"
        });
        
        // Expect event emission
        vm.expectEmit(false, false, false, false); // We'll check the event was emitted
        emit CardContractsBatchCreated(new address[](0), new uint256[](0), new string[](0), new ICard.Rarity[](0));
        
        // Execute batch creation
        cardSet.batchCreateAndAddCards(cardData);
        
        // Verify cards were added
        address[] memory cardContracts = cardSet.getCardContracts();
        assertEq(cardContracts.length, 3, "Should have 3 cards");
        
        // Verify cards by rarity
        address[] memory commons = cardSet.getCardContractsByRarity(ICard.Rarity.COMMON);
        address[] memory rares = cardSet.getCardContractsByRarity(ICard.Rarity.RARE);
        address[] memory serialized = cardSet.getCardContractsByRarity(ICard.Rarity.SERIALIZED);
        
        assertEq(commons.length, 1, "Should have 1 common");
        assertEq(rares.length, 1, "Should have 1 rare");
        assertEq(serialized.length, 1, "Should have 1 serialized");
        
        // Verify card properties
        ICard.CardInfo memory commonInfo = ICard(commons[0]).cardInfo();
        assertEq(commonInfo.cardId, 1);
        assertEq(commonInfo.name, "Test Common");
        assertTrue(commonInfo.rarity == ICard.Rarity.COMMON);
        assertEq(commonInfo.maxSupply, 0);
        
        ICard.CardInfo memory serializedInfo = ICard(serialized[0]).cardInfo();
        assertEq(serializedInfo.cardId, 3);
        assertEq(serializedInfo.name, "Test Serialized");
        assertTrue(serializedInfo.rarity == ICard.Rarity.SERIALIZED);
        assertEq(serializedInfo.maxSupply, 100);
        
        vm.stopPrank();
    }

    function testBatchCreateLargeSet() public {
        vm.startPrank(owner);
        
        // Create a larger batch (20 cards)
        ICardSet.CardCreationData[] memory cardData = new ICardSet.CardCreationData[](20);
        
        for (uint256 i = 0; i < 20; i++) {
            cardData[i] = ICardSet.CardCreationData({
                cardId: i + 1,
                name: string(abi.encodePacked("Card ", vm.toString(i + 1))),
                rarity: i < 15 ? ICard.Rarity.COMMON : ICard.Rarity.RARE,
                maxSupply: 0,
                metadataURI: string(abi.encodePacked("ipfs://card", vm.toString(i + 1)))
            });
        }
        
        cardSet.batchCreateAndAddCards(cardData);
        
        // Verify all cards were created
        address[] memory cardContracts = cardSet.getCardContracts();
        assertEq(cardContracts.length, 20, "Should have 20 cards");
        
        address[] memory commons = cardSet.getCardContractsByRarity(ICard.Rarity.COMMON);
        address[] memory rares = cardSet.getCardContractsByRarity(ICard.Rarity.RARE);
        
        assertEq(commons.length, 15, "Should have 15 commons");
        assertEq(rares.length, 5, "Should have 5 rares");
        
        vm.stopPrank();
    }

    function testBatchCreateEmptyArray() public {
        vm.startPrank(owner);
        
        ICardSet.CardCreationData[] memory emptyData = new ICardSet.CardCreationData[](0);
        
        vm.expectRevert();
        cardSet.batchCreateAndAddCards(emptyData);
        
        vm.stopPrank();
    }

    function testBatchCreateTooLarge() public {
        vm.startPrank(owner);
        
        // Try to create more than the limit (51 cards)
        ICardSet.CardCreationData[] memory tooLargeData = new ICardSet.CardCreationData[](51);
        
        for (uint256 i = 0; i < 51; i++) {
            tooLargeData[i] = ICardSet.CardCreationData({
                cardId: i + 1,
                name: "Test Card",
                rarity: ICard.Rarity.COMMON,
                maxSupply: 0,
                metadataURI: "ipfs://test"
            });
        }
        
        vm.expectRevert();
        cardSet.batchCreateAndAddCards(tooLargeData);
        
        vm.stopPrank();
    }

    function testBatchCreateUnauthorized() public {
        vm.startPrank(user1);
        
        ICardSet.CardCreationData[] memory cardData = new ICardSet.CardCreationData[](1);
        cardData[0] = ICardSet.CardCreationData({
            cardId: 1,
            name: "Test",
            rarity: ICard.Rarity.COMMON,
            maxSupply: 0,
            metadataURI: "ipfs://test"
        });
        
        vm.expectRevert();
        cardSet.batchCreateAndAddCards(cardData);
        
        vm.stopPrank();
    }

    function testBatchCreateGasEfficiency() public {
        vm.startPrank(owner);
        
        // Measure gas for batch creation vs individual creation
        ICardSet.CardCreationData[] memory cardData = new ICardSet.CardCreationData[](5);
        
        for (uint256 i = 0; i < 5; i++) {
            cardData[i] = ICardSet.CardCreationData({
                cardId: i + 1,
                name: string(abi.encodePacked("Card ", vm.toString(i + 1))),
                rarity: ICard.Rarity.COMMON,
                maxSupply: 0,
                metadataURI: "ipfs://test"
            });
        }
        
        uint256 gasBefore = gasleft();
        cardSet.batchCreateAndAddCards(cardData);
        uint256 gasUsed = gasBefore - gasleft();
        
        // Gas usage should be reasonable for 5 cards
        console.log("Gas used for batch creating 5 cards:", gasUsed);
        
        // Verify all cards were created
        assertEq(cardSet.getCardContracts().length, 5, "Should have 5 cards");
        
        vm.stopPrank();
    }

    // ============ Lock Functionality Tests ============

    function testLockSet() public {
        vm.startPrank(owner);
        
        // Add some cards first
        ICardSet.CardCreationData[] memory cardData = new ICardSet.CardCreationData[](2);
        cardData[0] = ICardSet.CardCreationData({
            cardId: 1,
            name: "Test Card 1",
            rarity: ICard.Rarity.COMMON,
            maxSupply: 0,
            metadataURI: "ipfs://test1"
        });
        cardData[1] = ICardSet.CardCreationData({
            cardId: 2,
            name: "Test Card 2",
            rarity: ICard.Rarity.RARE,
            maxSupply: 0,
            metadataURI: "ipfs://test2"
        });
        
        cardSet.batchCreateAndAddCards(cardData);
        
        // Verify set is not locked initially
        ICardSet.SetInfo memory infoBefore = cardSet.getSetInfo();
        assertFalse(infoBefore.isLocked, "Set should not be locked initially");
        
        // Lock the set
        vm.expectEmit(true, false, false, true);
        emit SetLocked(owner, 2);
        
        cardSet.lockSet();
        
        // Verify set is locked
        ICardSet.SetInfo memory infoAfter = cardSet.getSetInfo();
        assertTrue(infoAfter.isLocked, "Set should be locked");
        
        vm.stopPrank();
    }

    function testLockEmptySet() public {
        vm.startPrank(owner);
        
        // Try to lock a set without any cards
        vm.expectRevert();
        cardSet.lockSet();
        
        vm.stopPrank();
    }

    function testLockSetUnauthorized() public {
        vm.startPrank(owner);
        
        // Add a card first
        ICardSet.CardCreationData[] memory cardData = new ICardSet.CardCreationData[](1);
        cardData[0] = ICardSet.CardCreationData({
            cardId: 1,
            name: "Test Card",
            rarity: ICard.Rarity.COMMON,
            maxSupply: 0,
            metadataURI: "ipfs://test"
        });
        cardSet.batchCreateAndAddCards(cardData);
        
        vm.stopPrank();
        
        // Try to lock as non-owner
        vm.startPrank(user1);
        vm.expectRevert();
        cardSet.lockSet();
        vm.stopPrank();
    }

    function testLockSetTwice() public {
        vm.startPrank(owner);
        
        // Add a card first
        ICardSet.CardCreationData[] memory cardData = new ICardSet.CardCreationData[](1);
        cardData[0] = ICardSet.CardCreationData({
            cardId: 1,
            name: "Test Card",
            rarity: ICard.Rarity.COMMON,
            maxSupply: 0,
            metadataURI: "ipfs://test"
        });
        cardSet.batchCreateAndAddCards(cardData);
        
        // Lock the set once
        cardSet.lockSet();
        
        // Try to lock again
        vm.expectRevert();
        cardSet.lockSet();
        
        vm.stopPrank();
    }

    function testAddCardAfterLock() public {
        vm.startPrank(owner);
        
        // Add and lock the set
        ICardSet.CardCreationData[] memory cardData = new ICardSet.CardCreationData[](1);
        cardData[0] = ICardSet.CardCreationData({
            cardId: 1,
            name: "Test Card",
            rarity: ICard.Rarity.COMMON,
            maxSupply: 0,
            metadataURI: "ipfs://test"
        });
        cardSet.batchCreateAndAddCards(cardData);
        cardSet.lockSet();
        
        // Try to add more cards after locking
        ICardSet.CardCreationData[] memory moreCards = new ICardSet.CardCreationData[](1);
        moreCards[0] = ICardSet.CardCreationData({
            cardId: 2,
            name: "Another Card",
            rarity: ICard.Rarity.COMMON,
            maxSupply: 0,
            metadataURI: "ipfs://test2"
        });
        
        vm.expectRevert();
        cardSet.batchCreateAndAddCards(moreCards);
        
        vm.stopPrank();
    }

    function testRemoveCardAfterLock() public {
        vm.startPrank(owner);
        
        // Add cards and lock the set
        ICardSet.CardCreationData[] memory cardData = new ICardSet.CardCreationData[](1);
        cardData[0] = ICardSet.CardCreationData({
            cardId: 1,
            name: "Test Card",
            rarity: ICard.Rarity.COMMON,
            maxSupply: 0,
            metadataURI: "ipfs://test"
        });
        cardSet.batchCreateAndAddCards(cardData);
        
        address[] memory cardContracts = cardSet.getCardContracts();
        address cardContract = cardContracts[0];
        
        cardSet.lockSet();
        
        // Try to remove card after locking
        vm.expectRevert();
        cardSet.removeCardContract(cardContract);
        
        vm.stopPrank();
    }

    function testAddSingleCardAfterLock() public {
        vm.startPrank(owner);
        
        // Add cards and lock the set
        ICardSet.CardCreationData[] memory cardData = new ICardSet.CardCreationData[](1);
        cardData[0] = ICardSet.CardCreationData({
            cardId: 1,
            name: "Test Card",
            rarity: ICard.Rarity.COMMON,
            maxSupply: 0,
            metadataURI: "ipfs://test"
        });
        cardSet.batchCreateAndAddCards(cardData);
        cardSet.lockSet();
        
        // Try to add single card after locking
        Card newCard = new Card(2, "New Card", ICard.Rarity.COMMON, 0, "ipfs://new", owner);
        newCard.addAuthorizedMinter(address(cardSet));
        
        vm.expectRevert();
        cardSet.addCardContract(address(newCard));
        
        vm.stopPrank();
    }

    // ============ Integration Tests ============

    function testBatchCreateThenLockThenPackOpening() public {
        vm.startPrank(owner);
        
        // Batch create cards
        ICardSet.CardCreationData[] memory cardData = new ICardSet.CardCreationData[](10);
        for (uint256 i = 0; i < 10; i++) {
            cardData[i] = ICardSet.CardCreationData({
                cardId: i + 1,
                name: string(abi.encodePacked("Card ", vm.toString(i + 1))),
                rarity: ICard.Rarity.COMMON,
                maxSupply: 0,
                metadataURI: "ipfs://test"
            });
        }
        cardSet.batchCreateAndAddCards(cardData);
        
        // Lock the set
        cardSet.lockSet();
        
        vm.stopPrank();
        
        // Test pack opening still works after lock
        vm.deal(user1, 1 ether);
        vm.startPrank(user1);
        
        cardSet.openPack{value: PACK_PRICE}();
        
        // Fulfill VRF
        uint256 requestId = vrfCoordinator.getLastRequestId();
        vrfCoordinator.autoFulfillRequest(requestId, 15);
        
        // Verify cards were minted
        assertTrue(cardSet.totalEmission() == 15, "Should have emitted 15 cards");
        
        vm.stopPrank();
    }

    function testCompleteBatchWorkflow() public {
        vm.startPrank(owner);
        
        // Step 1: Batch create diverse card types
        ICardSet.CardCreationData[] memory cardData = new ICardSet.CardCreationData[](8);
        
        // Commons
        for (uint256 i = 0; i < 5; i++) {
            cardData[i] = ICardSet.CardCreationData({
                cardId: i + 1,
                name: string(abi.encodePacked("Common ", vm.toString(i + 1))),
                rarity: ICard.Rarity.COMMON,
                maxSupply: 0,
                metadataURI: "ipfs://common"
            });
        }
        
        // Rares
        for (uint256 i = 5; i < 7; i++) {
            cardData[i] = ICardSet.CardCreationData({
                cardId: i + 1,
                name: string(abi.encodePacked("Rare ", vm.toString(i + 1))),
                rarity: ICard.Rarity.RARE,
                maxSupply: 0,
                metadataURI: "ipfs://rare"
            });
        }
        
        // Serialized
        cardData[7] = ICardSet.CardCreationData({
            cardId: 8,
            name: "Ultra Rare Dragon",
            rarity: ICard.Rarity.SERIALIZED,
            maxSupply: 10,
            metadataURI: "ipfs://serialized"
        });
        
        // Execute batch creation
        cardSet.batchCreateAndAddCards(cardData);
        
        // Step 2: Create deck using batch-created cards
        address[] memory commons = cardSet.getCardContractsByRarity(ICard.Rarity.COMMON);
        address[] memory rares = cardSet.getCardContractsByRarity(ICard.Rarity.RARE);
        
        address[] memory deckCards = new address[](2);
        uint256[] memory deckQuantities = new uint256[](2);
        
        deckCards[0] = commons[0];
        deckQuantities[0] = 50;
        deckCards[1] = rares[0];
        deckQuantities[1] = 10;
        
        cardSet.addDeckType("Test Deck", deckCards, deckQuantities);
        
        // Step 3: Lock the set
        cardSet.lockSet();
        
        // Step 4: Verify everything works
        ICardSet.SetInfo memory setInfo = cardSet.getSetInfo();
        assertTrue(setInfo.isLocked, "Set should be locked");
        assertEq(setInfo.cardContracts.length, 8, "Should have 8 cards");
        
        assertEq(commons.length, 5, "Should have 5 commons");
        assertEq(rares.length, 2, "Should have 2 rares");
        
        address[] memory serialized = cardSet.getCardContractsByRarity(ICard.Rarity.SERIALIZED);
        assertEq(serialized.length, 1, "Should have 1 serialized");
        
        ICard.CardInfo memory serializedInfo = ICard(serialized[0]).cardInfo();
        assertEq(serializedInfo.maxSupply, 10, "Serialized should have max supply of 10");
        
        vm.stopPrank();
    }
} 