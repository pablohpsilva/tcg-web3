// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/CardSet.sol";
import "../src/Card.sol";
import "../src/mocks/MockVRFCoordinator.sol";
import "../src/interfaces/ICardSet.sol";
import "../src/interfaces/ICard.sol";

contract CardSetTest is Test {
    CardSet public cardSet;
    MockVRFCoordinator public vrfCoordinator;
    
    // Card contracts for testing
    Card public commonCard1;
    Card public commonCard2;
    Card public uncommonCard1;
    Card public uncommonCard2;
    Card public rareCard1;
    Card public mythicalCard1;
    Card public serializedCard1;
    
    address public owner = address(0x101);
    address public user1 = address(0x102);
    address public user2 = address(0x103);
    
    string constant SET_NAME = "Test Set S1";
    uint256 constant EMISSION_CAP = 1000005; // Multiple of PACK_SIZE (15)
    uint256 constant PACK_PRICE = 0.01 ether;
    uint256 constant DECK_PRICE = 0.05 ether;
    
    event PackOpened(address indexed user, address[] cardContracts, uint256[] tokenIds);
    event DeckOpened(address indexed user, string deckType, address[] cardContracts, uint256[] tokenIds);
    event CardContractAdded(address indexed cardContract, ICard.Rarity rarity);

    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy VRF coordinator
        vrfCoordinator = new MockVRFCoordinator();
        
        // Deploy CardSet
        cardSet = new CardSet(
            SET_NAME,
            EMISSION_CAP,
            address(vrfCoordinator),
            owner
        );
        
        // Deploy Card contracts
        _deployTestCards();
        
        // Add Card contracts to the set
        _addCardsToSet();
        
        // Add test deck types
        _addTestDecks();
        
        vm.stopPrank();
        
        // Fund test users
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
    }

    function _deployTestCards() internal {
        // Deploy common cards
        commonCard1 = new Card(1, "Forest Sprite", ICard.Rarity.COMMON, 0, "ipfs://common1", owner);
        commonCard2 = new Card(2, "Stone Golem", ICard.Rarity.COMMON, 0, "ipfs://common2", owner);
        
        // Deploy uncommon cards
        uncommonCard1 = new Card(11, "Storm Mage", ICard.Rarity.UNCOMMON, 0, "ipfs://uncommon1", owner);
        uncommonCard2 = new Card(12, "Crystal Guardian", ICard.Rarity.UNCOMMON, 0, "ipfs://uncommon2", owner);
        
        // Deploy rare cards
        rareCard1 = new Card(21, "Dragon Lord", ICard.Rarity.RARE, 0, "ipfs://rare1", owner);
        
        // Deploy mythical cards
        mythicalCard1 = new Card(31, "Planar Sovereign", ICard.Rarity.MYTHICAL, 0, "ipfs://mythical1", owner);
        
        // Deploy serialized cards
        serializedCard1 = new Card(41, "Genesis Dragon #001", ICard.Rarity.SERIALIZED, 100, "ipfs://serialized1", owner);
    }

    function _addCardsToSet() internal {
        // Pre-authorize CardSet to manage these cards before adding them
        commonCard1.addAuthorizedMinter(address(cardSet));
        commonCard2.addAuthorizedMinter(address(cardSet));
        uncommonCard1.addAuthorizedMinter(address(cardSet));
        uncommonCard2.addAuthorizedMinter(address(cardSet));
        rareCard1.addAuthorizedMinter(address(cardSet));
        mythicalCard1.addAuthorizedMinter(address(cardSet));
        serializedCard1.addAuthorizedMinter(address(cardSet));
        
        cardSet.addCardContract(address(commonCard1));
        cardSet.addCardContract(address(commonCard2));
        cardSet.addCardContract(address(uncommonCard1));
        cardSet.addCardContract(address(uncommonCard2));
        cardSet.addCardContract(address(rareCard1));
        cardSet.addCardContract(address(mythicalCard1));
        cardSet.addCardContract(address(serializedCard1));
    }

    function _addTestDecks() internal {
        address[] memory deckCardContracts = new address[](4);
        uint256[] memory deckQuantities = new uint256[](4);
        
        // 30 commons, 20 uncommons, 8 rares, 2 mythicals = 60 cards
        deckCardContracts[0] = address(commonCard1);
        deckQuantities[0] = 30;
        
        deckCardContracts[1] = address(uncommonCard1);
        deckQuantities[1] = 20;
        
        deckCardContracts[2] = address(rareCard1);
        deckQuantities[2] = 8;
        
        deckCardContracts[3] = address(mythicalCard1);
        deckQuantities[3] = 2;
        
        cardSet.addDeckType("Starter Deck", deckCardContracts, deckQuantities);
    }

    // ============ Constructor Tests ============

    function testConstructor() public view {
        assertEq(cardSet.setName(), SET_NAME);
        assertEq(cardSet.emissionCap(), EMISSION_CAP);
        assertEq(cardSet.totalEmission(), 0);
        assertEq(cardSet.owner(), owner);
        assertEq(cardSet.packPrice(), PACK_PRICE);
    }

    function testConstructorInvalidParameters() public {
        vm.expectRevert();
        new CardSet("", EMISSION_CAP, address(vrfCoordinator), owner);
        
        vm.expectRevert();
        new CardSet(SET_NAME, 0, address(vrfCoordinator), owner);
        
        vm.expectRevert();
        new CardSet(SET_NAME, EMISSION_CAP, address(0), owner);
    }

    // ============ Card Management Tests ============

    function testAddCardContract() public {
        vm.startPrank(owner);
        Card newCard = new Card(99, "Test Card", ICard.Rarity.COMMON, 0, "ipfs://test", owner);
        
        // First authorize the CardSet to mint from this card
        newCard.addAuthorizedMinter(address(cardSet));
        
        vm.expectEmit(true, false, false, true);
        emit CardContractAdded(address(newCard), ICard.Rarity.COMMON);
        
        cardSet.addCardContract(address(newCard));
        vm.stopPrank();
        
        address[] memory cardContracts = cardSet.getCardContracts();
        bool found = false;
        for (uint256 i = 0; i < cardContracts.length; i++) {
            if (cardContracts[i] == address(newCard)) {
                found = true;
                break;
            }
        }
        assertTrue(found);
    }

    function testAddCardContractUnauthorized() public {
        vm.prank(owner);
        Card newCard = new Card(99, "Test Card", ICard.Rarity.COMMON, 0, "ipfs://test", owner);
        
        vm.prank(user1);
        vm.expectRevert();
        cardSet.addCardContract(address(newCard));
    }

    function testAddDuplicateCardContract() public {
        vm.prank(owner);
        vm.expectRevert();
        cardSet.addCardContract(address(commonCard1)); // Already added in setup
    }

    function testRemoveCardContract() public {
        vm.prank(owner);
        cardSet.removeCardContract(address(commonCard1));
        
        address[] memory cardContracts = cardSet.getCardContracts();
        for (uint256 i = 0; i < cardContracts.length; i++) {
            assertTrue(cardContracts[i] != address(commonCard1));
        }
    }

    // ============ Deck Management Tests ============

    function testAddDeckType() public {
        vm.prank(owner);
        
        address[] memory cardContracts = new address[](2);
        uint256[] memory quantities = new uint256[](2);
        
        cardContracts[0] = address(commonCard1);
        quantities[0] = 40;
        cardContracts[1] = address(uncommonCard1);
        quantities[1] = 20;
        
        cardSet.addDeckType("Test Deck", cardContracts, quantities);
        
        ICardSet.DeckType memory deck = cardSet.getDeckType("Test Deck");
        assertEq(deck.name, "Test Deck");
        assertTrue(deck.active);
        assertEq(deck.cardContracts.length, 2);
        assertEq(deck.cardContracts[0], address(commonCard1));
        assertEq(deck.quantities[0], 40);
    }

    function testAddDeckTypeUnauthorized() public {
        vm.prank(user1);
        
        address[] memory cardContracts = new address[](1);
        uint256[] memory quantities = new uint256[](1);
        cardContracts[0] = address(commonCard1);
        quantities[0] = 60;
        
        vm.expectRevert();
        cardSet.addDeckType("Unauthorized Deck", cardContracts, quantities);
    }

    function testGetNonexistentDeckType() public {
        vm.expectRevert();
        cardSet.getDeckType("Nonexistent Deck");
    }

    // ============ Pack Opening Tests ============

    function testOpenPack() public {
        uint256 balanceBefore = user1.balance;
        uint256 emissionBefore = cardSet.totalEmission();
        
        vm.prank(user1);
        cardSet.openPack{value: PACK_PRICE}();
        
        // Check payment was deducted
        assertEq(user1.balance, balanceBefore - PACK_PRICE);
        
        // Manually fulfill VRF request
        uint256 requestId = vrfCoordinator.getLastRequestId();
        vrfCoordinator.autoFulfillRequest(requestId, 15);
        
        // Check emission increased
        assertEq(cardSet.totalEmission(), emissionBefore + 15);
        
        // Check user received cards from various Card contracts
        assertTrue(commonCard1.balanceOf(user1, 1) > 0 || commonCard2.balanceOf(user1, 2) > 0);
    }

    function testOpenPackInsufficientPayment() public {
        vm.prank(user1);
        vm.expectRevert();
        cardSet.openPack{value: PACK_PRICE - 1}();
    }

    function testOpenPackEmissionCapExceeded() public {
        // Create a CardSet with emission cap for exactly 1 pack (15 cards)
        vm.startPrank(owner);
        CardSet smallSet = new CardSet("Small Set", 15, address(vrfCoordinator), owner);
        
        // Add a card to enable pack opening
        Card testCard = new Card(1, "Test Card", ICard.Rarity.COMMON, 0, "ipfs://test", owner);
        testCard.addAuthorizedMinter(address(smallSet));
        smallSet.addCardContract(address(testCard));
        vm.stopPrank();
        
        // First pack should succeed
        vm.prank(user1);
        smallSet.openPack{value: PACK_PRICE}();
        
        // Fulfill VRF to complete the pack opening
        uint256 requestId = vrfCoordinator.getLastRequestId();
        vrfCoordinator.autoFulfillRequest(requestId, 15);
        
        // Second pack should fail due to emission cap reached
        vm.prank(user1);
        vm.expectRevert();
        smallSet.openPack{value: PACK_PRICE}();
    }

    function testOpenPackNoCards() public {
        vm.prank(owner);
        CardSet emptySet = new CardSet("Empty Set", EMISSION_CAP, address(vrfCoordinator), owner);
        
        vm.prank(user1);
        vm.expectRevert();
        emptySet.openPack{value: PACK_PRICE}();
    }

    // ============ Deck Opening Tests ============

    function testOpenDeck() public {
        uint256 balanceBefore = user1.balance;
        
        vm.prank(user1);
        uint256[] memory tokenIds = cardSet.openDeck{value: DECK_PRICE}("Starter Deck");
        
        // Check payment was deducted
        assertEq(user1.balance, balanceBefore - DECK_PRICE);
        
        // Check user received 60 cards
        assertEq(tokenIds.length, 60);
        
        // Check specific allocations
        assertEq(commonCard1.balanceOf(user1, 1), 30);
        assertEq(uncommonCard1.balanceOf(user1, 11), 20);
        assertEq(rareCard1.balanceOf(user1, 21), 8);
        assertEq(mythicalCard1.balanceOf(user1, 31), 2);
    }

    function testOpenDeckInsufficientPayment() public {
        vm.prank(user1);
        vm.expectRevert();
        cardSet.openDeck{value: DECK_PRICE - 1}("Starter Deck");
    }

    function testOpenDeckNonexistent() public {
        vm.prank(user1);
        vm.expectRevert();
        cardSet.openDeck{value: DECK_PRICE}("Nonexistent Deck");
    }

    // ============ Pricing Tests ============

    function testSetPackPrice() public {
        vm.prank(owner);
        cardSet.setPackPrice(0.02 ether);
        assertEq(cardSet.packPrice(), 0.02 ether);
    }

    function testSetPackPriceUnauthorized() public {
        vm.prank(user1);
        vm.expectRevert();
        cardSet.setPackPrice(0.02 ether);
    }

    function testSetDeckPrice() public {
        vm.prank(owner);
        cardSet.setDeckPrice("Starter Deck", 0.1 ether);
        assertEq(cardSet.getDeckPrice("Starter Deck"), 0.1 ether);
    }

    function testSetDeckPriceUnauthorized() public {
        vm.prank(user1);
        vm.expectRevert();
        cardSet.setDeckPrice("Starter Deck", 0.1 ether);
    }

    // ============ Withdrawal Tests ============

    function testWithdraw() public {
        // Open a pack to generate some revenue
        vm.prank(user1);
        cardSet.openPack{value: PACK_PRICE}();
        
        // Manually fulfill VRF request
        uint256 requestId = vrfCoordinator.getLastRequestId();
        vrfCoordinator.autoFulfillRequest(requestId, 15);
        
        uint256 contractBalance = address(cardSet).balance;
        uint256 ownerBalanceBefore = owner.balance;
        
        vm.prank(owner);
        cardSet.withdraw();
        
        assertEq(address(cardSet).balance, 0);
        assertEq(owner.balance, ownerBalanceBefore + contractBalance);
    }

    function testWithdrawUnauthorized() public {
        vm.prank(user1);
        vm.expectRevert();
        cardSet.withdraw();
    }

    // ============ Pause Tests ============

    function testPause() public {
        vm.prank(owner);
        cardSet.pause();
        
        vm.prank(user1);
        vm.expectRevert();
        cardSet.openPack{value: PACK_PRICE}();
    }

    function testUnpause() public {
        vm.startPrank(owner);
        cardSet.pause();
        cardSet.unpause();
        vm.stopPrank();
        
        vm.prank(user1);
        cardSet.openPack{value: PACK_PRICE}();
        
        // Manually fulfill VRF request
        uint256 requestId = vrfCoordinator.getLastRequestId();
        vrfCoordinator.autoFulfillRequest(requestId, 15);
        
        assertTrue(cardSet.totalEmission() == 15);
    }

    function testPauseUnauthorized() public {
        vm.prank(user1);
        vm.expectRevert();
        cardSet.pause();
    }

    // ============ View Function Tests ============

    function testGetSetInfo() public view {
        ICardSet.SetInfo memory info = cardSet.getSetInfo();
        assertEq(info.name, SET_NAME);
        assertEq(info.emissionCap, EMISSION_CAP);
        assertEq(info.totalEmission, 0);
        assertEq(info.packPrice, PACK_PRICE);
        assertEq(info.cardContracts.length, 7); // All our test cards
    }

    function testGetCardContracts() public view {
        address[] memory cardContracts = cardSet.getCardContracts();
        assertEq(cardContracts.length, 7);
    }

    function testGetCardContractsByRarity() public view {
        address[] memory commons = cardSet.getCardContractsByRarity(ICard.Rarity.COMMON);
        assertEq(commons.length, 2);
        
        address[] memory rares = cardSet.getCardContractsByRarity(ICard.Rarity.RARE);
        assertEq(rares.length, 1);
        
        address[] memory serialized = cardSet.getCardContractsByRarity(ICard.Rarity.SERIALIZED);
        assertEq(serialized.length, 1);
    }

    function testGetDeckTypeNames() public view {
        string[] memory deckNames = cardSet.getDeckTypeNames();
        assertEq(deckNames.length, 1);
        assertEq(deckNames[0], "Starter Deck");
    }

    // ============ Card Contract Tests ============

    function testCardContractBasics() public view {
        ICard.CardInfo memory info = commonCard1.cardInfo();
        assertEq(info.cardId, 1);
        assertEq(info.name, "Forest Sprite");
        assertTrue(info.rarity == ICard.Rarity.COMMON);
        assertEq(info.maxSupply, 0);
        assertEq(info.currentSupply, 0);
        assertTrue(info.active);
    }

    function testSerializedCardLimit() public {
        ICard.CardInfo memory info = serializedCard1.cardInfo();
        assertEq(info.maxSupply, 100);
        assertTrue(serializedCard1.canMint());
    }

    // ============ Integration Tests ============

    function testMultiplePackOpenings() public {
        vm.startPrank(user1);
        
        // Open 3 packs
        for (uint256 i = 0; i < 3; i++) {
            cardSet.openPack{value: PACK_PRICE}();
            // Manually fulfill each VRF request
            uint256 requestId = vrfCoordinator.getLastRequestId();
            vrfCoordinator.autoFulfillRequest(requestId, 15);
        }
        
        // Should have 45 cards total (3 packs * 15 cards)
        assertEq(cardSet.totalEmission(), 45);
        
        vm.stopPrank();
    }

    function testMixedPackAndDeckOpening() public {
        vm.startPrank(user1);
        
        // Open 1 pack and 1 deck
        cardSet.openPack{value: PACK_PRICE}();
        uint256 requestId1 = vrfCoordinator.getLastRequestId();
        vrfCoordinator.autoFulfillRequest(requestId1, 15);
        
        cardSet.openDeck{value: DECK_PRICE}("Starter Deck");
        
        // Pack adds to emission, deck doesn't
        assertEq(cardSet.totalEmission(), 15);
        
        vm.stopPrank();
    }

    function testCardContractAuthorization() public {
        // CardSet should be authorized to mint on card contracts
        assertTrue(commonCard1.isAuthorizedMinter(address(cardSet)));
        
        // Remove card contract from set
        vm.prank(owner);
        cardSet.removeCardContract(address(commonCard1));
        
        // Manually remove authorization (this would be done by card owner)
        vm.prank(owner);
        commonCard1.removeAuthorizedMinter(address(cardSet));
        
        // CardSet should no longer be authorized
        assertFalse(commonCard1.isAuthorizedMinter(address(cardSet)));
    }
} 