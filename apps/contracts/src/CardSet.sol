// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/ICardSet.sol";
import "./interfaces/ICard.sol";
import "./errors/CardSetErrors.sol";
import "./mocks/MockVRFCoordinator.sol";

/**
 * @title CardSet
 * @dev Trading card set contract that manages multiple Card contracts for pack/deck distribution
 * @notice Each set is deployed as its own contract for modularity and manages Card contract references
 */
contract CardSet is 
    Ownable,
    ReentrancyGuard,
    Pausable,
    ICardSet,
    IVRFConsumer
{
    using CardSetErrors for *;

    // Constants
    uint256 private constant PACK_SIZE = 15;
    uint256 private constant PACK_COMMONS = 7;
    uint256 private constant PACK_UNCOMMONS = 6;
    uint256 private constant PACK_GUARANTEED_RARE = 1;
    uint256 private constant PACK_LUCKY_SLOT = 1;
    uint256 private constant DECK_SIZE = 60;

    // State variables
    uint256 public totalEmission;
    uint256 public immutable emissionCap;
    string public setName;
    uint256 public packPrice = 0.01 ether; // Default pack price

    // Card contract management
    address[] private _cardContracts;
    mapping(address => bool) private _isValidCardContract;
    mapping(ICard.Rarity => address[]) private _cardContractsByRarity;

    // Deck management
    mapping(string => DeckType) private _deckTypes;
    mapping(string => uint256) private _deckPrices;
    string[] private _deckTypeNames;

    // VRF integration
    MockVRFCoordinator private _vrfCoordinator;
    mapping(uint256 => address) private _vrfRequests;
    mapping(uint256 => bool) private _vrfRequestTypes; // true for pack, false for deck
    mapping(uint256 => string) private _vrfDeckTypes; // For deck openings

    // Events for VRF
    event VRFRequestSent(uint256 indexed requestId, address indexed user, bool isPack);
    event VRFRequestFulfilled(uint256 indexed requestId, uint256[] randomWords);

    /**
     * @dev Constructor
     * @param _setName Name of the card set
     * @param _emissionCap Maximum number of cards that can be minted through this set
     * @param _vrfCoordinatorAddress Address of the VRF coordinator
     * @param _owner Owner of the card set contract
     */
    constructor(
        string memory _setName,
        uint256 _emissionCap,
        address _vrfCoordinatorAddress,
        address _owner
    ) Ownable(_owner) {
        if (bytes(_setName).length == 0) revert CardSetErrors.InvalidParameter();
        if (_emissionCap == 0) revert CardSetErrors.InvalidEmissionCap();
        if (_vrfCoordinatorAddress == address(0)) revert CardSetErrors.ZeroAddress();

        setName = _setName;
        emissionCap = _emissionCap;
        _vrfCoordinator = MockVRFCoordinator(_vrfCoordinatorAddress);
    }

    // ============ Pack Opening Functions ============

    /**
     * @dev Open a pack and receive 15 random cards from managed Card contracts
     * @return Array of token IDs minted
     */
    function openPack() external payable override nonReentrant whenNotPaused returns (uint256[] memory) {
        if (msg.value < packPrice) {
            revert CardSetErrors.InsufficientPayment(packPrice, msg.value);
        }
        if (totalEmission + PACK_SIZE > emissionCap) {
            revert CardSetErrors.EmissionCapExceeded();
        }
        if (_cardContracts.length == 0) {
            revert CardSetErrors.NoCardsAvailable();
        }

        // Request randomness from VRF
        uint256 requestId = _vrfCoordinator.requestRandomWords(
            bytes32(0), // keyHash - not used in mock
            0, // subId - not used in mock
            3, // minimumRequestConfirmations
            100000, // callbackGasLimit
            uint32(PACK_SIZE) // numWords
        );

        _vrfRequests[requestId] = msg.sender;
        _vrfRequestTypes[requestId] = true; // true for pack

        emit VRFRequestSent(requestId, msg.sender, true);

        // Return empty array initially - actual minting happens in VRF callback
        return new uint256[](0);
    }

    // ============ Deck Opening Functions ============

    /**
     * @dev Open a preconstructed deck using managed Card contracts
     * @param deckType Name of the deck type to open
     * @return Array of token IDs minted
     */
    function openDeck(string calldata deckType) 
        external 
        payable 
        override 
        nonReentrant 
        whenNotPaused 
        returns (uint256[] memory) 
    {
        DeckType storage deck = _deckTypes[deckType];
        if (!deck.active) revert CardSetErrors.DeckTypeNotFound(deckType);
        
        uint256 deckPrice = _deckPrices[deckType];
        if (msg.value < deckPrice) {
            revert CardSetErrors.InsufficientPayment(deckPrice, msg.value);
        }

        // Calculate total cards in deck
        uint256 totalCards = 0;
        for (uint256 i = 0; i < deck.quantities.length; i++) {
            totalCards += deck.quantities[i];
        }

        if (totalCards != DECK_SIZE) {
            revert CardSetErrors.InvalidDeckData();
        }

        // Mint deck cards directly (no randomness needed for preconstructed decks)
        return _mintDeckCards(msg.sender, deckType);
    }

    // ============ VRF Callback ============

    /**
     * @dev Callback function used by VRF Coordinator
     * @param requestId The ID of the VRF request
     * @param randomWords Array of random numbers
     */
    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external override {
        if (msg.sender != address(_vrfCoordinator)) {
            revert CardSetErrors.NotAuthorized();
        }

        address user = _vrfRequests[requestId];
        if (user == address(0)) revert CardSetErrors.InvalidVRFResponse();

        emit VRFRequestFulfilled(requestId, randomWords);

        if (_vrfRequestTypes[requestId]) {
            // Pack opening
            _fulfillPackOpening(user, randomWords);
        } else {
            // Deck opening (if we ever need randomness for decks)
            string memory deckType = _vrfDeckTypes[requestId];
            _fulfillDeckOpening(user, deckType, randomWords);
        }

        // Clean up
        delete _vrfRequests[requestId];
        delete _vrfRequestTypes[requestId];
        delete _vrfDeckTypes[requestId];
    }

    // ============ Internal Functions ============

    /**
     * @dev Internal function to fulfill pack opening with randomness
     */
    function _fulfillPackOpening(address user, uint256[] memory randomWords) internal {
        uint256[] memory tokenIds = new uint256[](PACK_SIZE);
        address[] memory cardContracts = new address[](PACK_SIZE);
        
        uint256 cardIndex = 0;
        
        // Mint 7 commons
        for (uint256 i = 0; i < PACK_COMMONS; i++) {
            address cardContract = _getRandomCardByRarity(ICard.Rarity.COMMON, randomWords[cardIndex]);
            uint256 tokenId = ICard(cardContract).mint(user);
            tokenIds[cardIndex] = tokenId;
            cardContracts[cardIndex] = cardContract;
            cardIndex++;
        }
        
        // Mint 6 uncommons
        for (uint256 i = 0; i < PACK_UNCOMMONS; i++) {
            address cardContract = _getRandomCardByRarity(ICard.Rarity.UNCOMMON, randomWords[cardIndex]);
            uint256 tokenId = ICard(cardContract).mint(user);
            tokenIds[cardIndex] = tokenId;
            cardContracts[cardIndex] = cardContract;
            cardIndex++;
        }
        
        // Mint 1 guaranteed rare
        address rareCardContract = _getRandomCardByRarity(ICard.Rarity.RARE, randomWords[cardIndex]);
        uint256 rareTokenId = ICard(rareCardContract).mint(user);
        tokenIds[cardIndex] = rareTokenId;
        cardContracts[cardIndex] = rareCardContract;
        cardIndex++;
        
        // Mint 1 lucky slot (rare/mythical/serialized)
        address luckyCardContract = _getLuckySlotCard(randomWords[cardIndex]);
        uint256 luckyTokenId = ICard(luckyCardContract).mint(user);
        tokenIds[cardIndex] = luckyTokenId;
        cardContracts[cardIndex] = luckyCardContract;

        totalEmission += PACK_SIZE;
        
        emit PackOpened(user, cardContracts, tokenIds);
    }

    /**
     * @dev Internal function to fulfill deck opening
     */
    function _fulfillDeckOpening(address user, string memory deckType, uint256[] memory) internal {
        _mintDeckCards(user, deckType);
    }

    /**
     * @dev Internal function to mint deck cards using Card contracts
     */
    function _mintDeckCards(address user, string memory deckType) internal returns (uint256[] memory) {
        DeckType storage deck = _deckTypes[deckType];
        
        uint256 totalCards = 0;
        for (uint256 i = 0; i < deck.quantities.length; i++) {
            totalCards += deck.quantities[i];
        }
        
        uint256[] memory tokenIds = new uint256[](totalCards);
        address[] memory cardContracts = new address[](totalCards);
        uint256 tokenIndex = 0;
        
        for (uint256 i = 0; i < deck.cardContracts.length; i++) {
            address cardContract = deck.cardContracts[i];
            uint256 quantity = deck.quantities[i];
            
            for (uint256 j = 0; j < quantity; j++) {
                uint256 tokenId = ICard(cardContract).mint(user);
                tokenIds[tokenIndex] = tokenId;
                cardContracts[tokenIndex] = cardContract;
                tokenIndex++;
            }
        }
        
        emit DeckOpened(user, deckType, cardContracts, tokenIds);
        return tokenIds;
    }

    /**
     * @dev Get random Card contract by rarity
     */
    function _getRandomCardByRarity(ICard.Rarity rarity, uint256 randomness) internal view returns (address) {
        address[] memory cards = _cardContractsByRarity[rarity];
        if (cards.length == 0) revert CardSetErrors.NoCardsAvailable();
        
        uint256 index = randomness % cards.length;
        return cards[index];
    }

    /**
     * @dev Get lucky slot Card contract (rare/mythical/serialized with weighted probability)
     */
    function _getLuckySlotCard(uint256 randomness) internal view returns (address) {
        // Lucky slot probabilities:
        // 70% rare, 25% mythical, 5% serialized
        uint256 roll = randomness % 100;
        
        if (roll < 70) {
            // 70% chance for rare
            return _getRandomCardByRarity(ICard.Rarity.RARE, randomness);
        } else if (roll < 95) {
            // 25% chance for mythical
            if (_cardContractsByRarity[ICard.Rarity.MYTHICAL].length > 0) {
                return _getRandomCardByRarity(ICard.Rarity.MYTHICAL, randomness);
            } else {
                return _getRandomCardByRarity(ICard.Rarity.RARE, randomness);
            }
        } else {
            // 5% chance for serialized
            if (_cardContractsByRarity[ICard.Rarity.SERIALIZED].length > 0) {
                address cardContract = _getRandomCardByRarity(ICard.Rarity.SERIALIZED, randomness);
                // Check if serialized card can still be minted
                if (ICard(cardContract).canMint()) {
                    return cardContract;
                }
            }
            // Fallback to mythical or rare
            if (_cardContractsByRarity[ICard.Rarity.MYTHICAL].length > 0) {
                return _getRandomCardByRarity(ICard.Rarity.MYTHICAL, randomness);
            } else {
                return _getRandomCardByRarity(ICard.Rarity.RARE, randomness);
            }
        }
    }



    // ============ Admin Functions ============

    /**
     * @dev Add a Card contract to the set
     * @param cardContract Address of the Card contract to add
     */
    function addCardContract(address cardContract) external override onlyOwner {
        if (cardContract == address(0)) revert CardSetErrors.ZeroAddress();
        if (_isValidCardContract[cardContract]) revert CardSetErrors.CardAlreadyExists(0);
        
        // Verify it's a valid Card contract
        try ICard(cardContract).cardInfo() returns (ICard.CardInfo memory info) {
            // Add this contract as an authorized minter on the Card contract
            ICard(cardContract).addAuthorizedMinter(address(this));
            
            _cardContracts.push(cardContract);
            _isValidCardContract[cardContract] = true;
            _cardContractsByRarity[info.rarity].push(cardContract);
            
            emit CardContractAdded(cardContract, info.rarity);
        } catch {
            revert CardSetErrors.InvalidCardData();
        }
    }

    /**
     * @dev Remove a Card contract from the set
     * @param cardContract Address of the Card contract to remove
     */
    function removeCardContract(address cardContract) external override onlyOwner {
        if (!_isValidCardContract[cardContract]) revert CardSetErrors.CardNotFound(0);
        
        // Remove from main array
        for (uint256 i = 0; i < _cardContracts.length; i++) {
            if (_cardContracts[i] == cardContract) {
                _cardContracts[i] = _cardContracts[_cardContracts.length - 1];
                _cardContracts.pop();
                break;
            }
        }
        
        // Remove from rarity mapping
        ICard.Rarity rarity = ICard(cardContract).rarity();
        address[] storage rarityArray = _cardContractsByRarity[rarity];
        for (uint256 i = 0; i < rarityArray.length; i++) {
            if (rarityArray[i] == cardContract) {
                rarityArray[i] = rarityArray[rarityArray.length - 1];
                rarityArray.pop();
                break;
            }
        }
        
        _isValidCardContract[cardContract] = false;
        
        // Remove this contract as an authorized minter
        ICard(cardContract).removeAuthorizedMinter(address(this));
    }

    /**
     * @dev Add a new deck type using Card contracts
     */
    function addDeckType(
        string calldata name,
        address[] calldata cardContracts,
        uint256[] calldata quantities
    ) external override onlyOwner {
        if (bytes(name).length == 0) revert CardSetErrors.InvalidDeckData();
        if (cardContracts.length != quantities.length) revert CardSetErrors.CardQuantityMismatch();
        if (cardContracts.length == 0) revert CardSetErrors.EmptyDeck();
        if (_deckTypes[name].active) revert CardSetErrors.DeckTypeAlreadyExists(name);

        // Validate that all Card contracts are valid and registered
        for (uint256 i = 0; i < cardContracts.length; i++) {
            if (!_isValidCardContract[cardContracts[i]]) {
                revert CardSetErrors.CardNotFound(0);
            }
            if (quantities[i] == 0) revert CardSetErrors.InvalidDeckData();
        }

        _deckTypes[name] = DeckType({
            name: name,
            cardContracts: cardContracts,
            quantities: quantities,
            active: true
        });

        _deckTypeNames.push(name);
        _deckPrices[name] = 0.05 ether; // Default deck price

        emit DeckTypeAdded(name, cardContracts, quantities);
    }

    /**
     * @dev Set pack price
     */
    function setPackPrice(uint256 price) external override onlyOwner {
        if (price == 0) revert CardSetErrors.InvalidPrice();
        packPrice = price;
    }

    /**
     * @dev Set deck price
     */
    function setDeckPrice(string calldata deckType, uint256 price) external override onlyOwner {
        if (!_deckTypes[deckType].active) revert CardSetErrors.DeckTypeNotFound(deckType);
        if (price == 0) revert CardSetErrors.InvalidPrice();
        _deckPrices[deckType] = price;
    }

    /**
     * @dev Withdraw contract funds
     */
    function withdraw() external override onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) revert CardSetErrors.InvalidParameter();
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        if (!success) revert CardSetErrors.WithdrawFailed();
    }



    // ============ View Functions ============

    /**
     * @dev Get complete set information
     */
    function getSetInfo() external view override returns (SetInfo memory) {
        return SetInfo({
            name: setName,
            emissionCap: emissionCap,
            totalEmission: totalEmission,
            packPrice: packPrice,
            cardContracts: _cardContracts,
            deckTypeNames: _deckTypeNames
        });
    }

    /**
     * @dev Get deck type information
     */
    function getDeckType(string calldata deckType) external view override returns (DeckType memory) {
        if (!_deckTypes[deckType].active) revert CardSetErrors.DeckTypeNotFound(deckType);
        return _deckTypes[deckType];
    }

    /**
     * @dev Get deck price
     */
    function getDeckPrice(string calldata deckType) external view override returns (uint256) {
        if (!_deckTypes[deckType].active) revert CardSetErrors.DeckTypeNotFound(deckType);
        return _deckPrices[deckType];
    }

    /**
     * @dev Get all Card contract addresses
     */
    function getCardContracts() external view override returns (address[] memory) {
        return _cardContracts;
    }

    /**
     * @dev Get Card contract addresses by rarity
     */
    function getCardContractsByRarity(ICard.Rarity rarity) external view override returns (address[] memory) {
        return _cardContractsByRarity[rarity];
    }

    /**
     * @dev Get all deck type names
     */
    function getDeckTypeNames() external view override returns (string[] memory) {
        return _deckTypeNames;
    }

    /**
     * @dev Pause the contract
     */
    function pause() external override onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external override onlyOwner {
        _unpause();
    }
} 