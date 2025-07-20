// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
// Using mock VRF for testing - replace with actual Chainlink imports in production
import "./interfaces/ICardSet.sol";
import "./interfaces/ICard.sol";
import "./Card.sol";
import "./errors/CardSetErrors.sol";
import "./mocks/MockVRFCoordinator.sol";

/**
 * @title CardSet
 * @dev Manages a collection of Card contracts for a trading card set
 * @notice This contract orchestrates pack opening, deck distribution, and emission tracking
 *         across multiple independent Card contracts
 */
contract CardSet is ICardSet, Ownable, ReentrancyGuard, Pausable {
    
    // Set information
    string public setName;
    uint256 public emissionCap;
    uint256 public totalEmission;
    uint256 public packPrice = 0.01 ether; // Default pack price
    bool public isLocked; // Flag to prevent new card additions
    
    // Card contract management
    address[] private _cardContracts;
    mapping(address => bool) private _isValidCardContract;
    mapping(ICard.Rarity => address[]) private _cardContractsByRarity;
    
    // Deck types
    mapping(string => DeckType) private _deckTypes;
    string[] private _deckTypeNames;
    
    // VRF (using mock for testing)
    MockVRFCoordinator private _vrfCoordinator;
    
    // VRF request tracking
    mapping(uint256 => VRFRequest) private _vrfRequests;
    
    // Constants
    uint32 public constant PACK_SIZE = 15;
    
    struct VRFRequest {
        address user;
        bool isPack;
        string deckType;
    }

    /**
     * @dev Constructor
     * @param setName_ Name of the card set
     * @param emissionCap_ Maximum number of cards that can be emitted
     * @param vrfCoordinator_ Chainlink VRF Coordinator address
     * @param owner_ Owner of the contract
     */
    constructor(
        string memory setName_,
        uint256 emissionCap_,
        address vrfCoordinator_,
        address owner_
    ) Ownable(owner_) {
        if (bytes(setName_).length == 0) revert CardSetErrors.InvalidSetName();
        if (emissionCap_ == 0) revert CardSetErrors.InvalidEmissionCap();
        if (vrfCoordinator_ == address(0)) revert CardSetErrors.InvalidVRFCoordinator();
        
        // Validate emission cap for pack size compatibility
        _validateEmissionCapForPackSize(emissionCap_);
        
        setName = setName_;
        emissionCap = emissionCap_;
        _vrfCoordinator = MockVRFCoordinator(vrfCoordinator_);
        isLocked = false;
    }

    // ============ Card Contract Management ============

    /**
     * @dev Add a Card contract to this set
     * @param cardContract Address of the Card contract to add
     */
    function addCardContract(address cardContract) external onlyOwner {
        if (isLocked) revert CardSetErrors.SetIsLocked();
        if (cardContract == address(0)) revert CardSetErrors.InvalidCardContract();
        if (_isValidCardContract[cardContract]) revert CardSetErrors.CardAlreadyExists(0);
        
        // Verify it's a valid Card contract and that we're authorized to mint
        try ICard(cardContract).cardInfo() returns (ICard.CardInfo memory info) {
            // Verify that this CardSet is authorized to mint from the Card contract
            if (!ICard(cardContract).isAuthorizedMinter(address(this))) {
                revert CardSetErrors.NotAuthorized();
            }
            
            _cardContracts.push(cardContract);
            _isValidCardContract[cardContract] = true;
            _cardContractsByRarity[info.rarity].push(cardContract);
            
            emit CardContractAdded(cardContract, info.rarity);
        } catch {
            revert CardSetErrors.InvalidCardData();
        }
    }

    /**
     * @dev Batch create and add multiple Card contracts to this set
     * @param cardData Array of card creation data
     * @notice More gas efficient than creating cards individually
     */
    function batchCreateAndAddCards(ICardSet.CardCreationData[] calldata cardData) external onlyOwner {
        if (isLocked) revert CardSetErrors.SetIsLocked();
        if (cardData.length == 0) revert CardSetErrors.InvalidCardData();
        if (cardData.length > 50) revert CardSetErrors.InvalidCardData(); // Reasonable batch limit
        
        address[] memory newCardContracts = new address[](cardData.length);
        uint256[] memory cardIds = new uint256[](cardData.length);
        string[] memory names = new string[](cardData.length);
        ICard.Rarity[] memory rarities = new ICard.Rarity[](cardData.length);
        
        // Create all cards in a single transaction
        for (uint256 i = 0; i < cardData.length; i++) {
            ICardSet.CardCreationData memory data = cardData[i];
            
            // Deploy new Card contract
            Card newCard = new Card(
                data.cardId,
                data.name,
                data.rarity,
                data.maxSupply,
                data.metadataURI,
                owner()
            );
            
            address cardAddress = address(newCard);
            
            // Add to our tracking
            _cardContracts.push(cardAddress);
            _isValidCardContract[cardAddress] = true;
            _cardContractsByRarity[data.rarity].push(cardAddress);
            
            // Store for event emission
            newCardContracts[i] = cardAddress;
            cardIds[i] = data.cardId;
            names[i] = data.name;
            rarities[i] = data.rarity;
        }
        
        emit CardContractsBatchCreated(newCardContracts, cardIds, names, rarities);
    }

    /**
     * @dev Remove a Card contract from this set
     * @param cardContract Address of the Card contract to remove
     */
    function removeCardContract(address cardContract) external onlyOwner {
        if (isLocked) revert CardSetErrors.SetIsLocked();
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
        ICard.CardInfo memory info = ICard(cardContract).cardInfo();
        address[] storage rarityArray = _cardContractsByRarity[info.rarity];
        for (uint256 i = 0; i < rarityArray.length; i++) {
            if (rarityArray[i] == cardContract) {
                rarityArray[i] = rarityArray[rarityArray.length - 1];
                rarityArray.pop();
                break;
            }
        }
        
        _isValidCardContract[cardContract] = false;
        
        emit CardContractRemoved(cardContract);
    }

    /**
     * @dev Lock the set to prevent adding new cards
     * @notice This action is irreversible and ensures set immutability
     */
    function lockSet() external onlyOwner {
        if (isLocked) revert CardSetErrors.SetIsLocked();
        if (_cardContracts.length == 0) revert CardSetErrors.InvalidCardData(); // Must have at least one card
        
        isLocked = true;
        
        emit SetLocked(owner(), _cardContracts.length);
    }

    // ============ Pack Opening ============

    /**
     * @dev Open a booster pack
     * @notice Requires payment and uses Chainlink VRF for randomness
     */
    function openPack() external payable nonReentrant whenNotPaused {
        if (msg.value < packPrice) revert CardSetErrors.InsufficientPayment(packPrice, msg.value);
        if (totalEmission + PACK_SIZE > emissionCap) revert CardSetErrors.EmissionCapExceeded();
        if (_cardContracts.length == 0) revert CardSetErrors.NoCardsAvailable();
        
        // Request randomness from VRF
        uint256 requestId = _vrfCoordinator.requestRandomWords(
            bytes32(0), // keyHash - not used in mock
            0, // subId - not used in mock
            3, // minimumRequestConfirmations
            100000, // callbackGasLimit
            uint32(PACK_SIZE) // numWords
        );
        
        _vrfRequests[requestId] = VRFRequest({
            user: msg.sender,
            isPack: true,
            deckType: ""
        });
    }

    /**
     * @dev VRF callback function
     * @param requestId The request ID
     * @param randomWords Random numbers from VRF
     */
    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        if (msg.sender != address(_vrfCoordinator)) {
            revert CardSetErrors.NotAuthorized();
        }
        
        VRFRequest memory request = _vrfRequests[requestId];
        if (request.user == address(0)) revert CardSetErrors.InvalidVRFResponse();
        
        delete _vrfRequests[requestId];
        
        if (request.isPack) {
            _fulfillPackOpening(request.user, randomWords);
        } else {
            _fulfillDeckOpening(request.user, request.deckType);
        }
    }

    /**
     * @dev Internal function to fulfill pack opening
     * @param user Address of the user opening the pack
     * @param randomWords Random numbers for card selection
     */
    function _fulfillPackOpening(address user, uint256[] memory randomWords) internal {
        if (totalEmission + PACK_SIZE > emissionCap) {
            // Refund user if emission cap would be exceeded
            payable(user).transfer(packPrice);
            return;
        }
        
        address[] memory selectedContracts = new address[](PACK_SIZE);
        uint256[] memory tokenIds = new uint256[](PACK_SIZE);
        
        for (uint256 i = 0; i < PACK_SIZE; i++) {
            address cardContract = _selectCardContract(randomWords[i], i == PACK_SIZE - 1);
            uint256 tokenId = ICard(cardContract).mint(user);
            
            selectedContracts[i] = cardContract;
            tokenIds[i] = tokenId;
        }
        
        totalEmission += PACK_SIZE;
        
        emit PackOpened(user, selectedContracts, tokenIds);
    }

    /**
     * @dev Select a card contract based on rarity distribution
     * @param randomValue Random value for selection
     * @param isLuckySlot Whether this is the lucky slot (last card)
     * @return Address of selected card contract
     */
    function _selectCardContract(uint256 randomValue, bool isLuckySlot) internal view returns (address) {
        uint256 roll = randomValue % 100;
        
        if (isLuckySlot) {
            // Lucky slot has higher chances for rare cards
            if (roll >= 95 && _cardContractsByRarity[ICard.Rarity.SERIALIZED].length > 0) {
                // 5% chance for serialized, but check if any can still be minted
                address[] memory serialized = _cardContractsByRarity[ICard.Rarity.SERIALIZED];
                for (uint256 i = 0; i < serialized.length; i++) {
                    if (ICard(serialized[i]).canMint()) {
                        return serialized[i];
                    }
                }
                // Fallback to mythical if no serialized available
            }
            
            if (roll >= 70 && _cardContractsByRarity[ICard.Rarity.MYTHICAL].length > 0) {
                // 25% chance for mythical (70-94)
                address[] memory mythical = _cardContractsByRarity[ICard.Rarity.MYTHICAL];
                return mythical[randomValue % mythical.length];
            }
            
            if (roll >= 45 && _cardContractsByRarity[ICard.Rarity.RARE].length > 0) {
                // 25% chance for rare (45-69)
                address[] memory rare = _cardContractsByRarity[ICard.Rarity.RARE];
                return rare[randomValue % rare.length];
            }
            
            if (roll >= 15 && _cardContractsByRarity[ICard.Rarity.UNCOMMON].length > 0) {
                // 30% chance for uncommon (15-44)
                address[] memory uncommon = _cardContractsByRarity[ICard.Rarity.UNCOMMON];
                return uncommon[randomValue % uncommon.length];
            }
            
            // 15% chance for common (0-14)
            address[] memory common = _cardContractsByRarity[ICard.Rarity.COMMON];
            if (common.length > 0) {
                return common[randomValue % common.length];
            }
        } else {
            // Regular slots favor common cards
            if (roll >= 40) {
                // 60% chance for common
                address[] memory common = _cardContractsByRarity[ICard.Rarity.COMMON];
                if (common.length > 0) {
                    return common[randomValue % common.length];
                }
            }
            
            if (roll >= 10) {
                // 30% chance for uncommon
                address[] memory uncommon = _cardContractsByRarity[ICard.Rarity.UNCOMMON];
                if (uncommon.length > 0) {
                    return uncommon[randomValue % uncommon.length];
                }
            }
            
            // 10% chance for rare
            address[] memory rare = _cardContractsByRarity[ICard.Rarity.RARE];
            if (rare.length > 0) {
                return rare[randomValue % rare.length];
            }
        }
        
        // Fallback to any available card
        return _cardContracts[randomValue % _cardContracts.length];
    }

    // ============ Deck Management ============

    /**
     * @dev Add a new deck type
     * @param deckName Name of the deck type
     * @param cardContracts Array of card contract addresses
     * @param quantities Array of quantities for each card contract
     */
    function addDeckType(
        string calldata deckName,
        address[] calldata cardContracts,
        uint256[] calldata quantities
    ) external onlyOwner {
        if (bytes(deckName).length == 0) revert CardSetErrors.InvalidDeckName();
        if (cardContracts.length == 0 || cardContracts.length != quantities.length) {
            revert CardSetErrors.InvalidDeckData();
        }
        if (_deckTypes[deckName].active) revert CardSetErrors.DeckAlreadyExists();
        
        // Verify all card contracts are valid and calculate total cards
        uint256 totalCards = 0;
        for (uint256 i = 0; i < cardContracts.length; i++) {
            if (!_isValidCardContract[cardContracts[i]]) revert CardSetErrors.CardNotFound(0);
            totalCards += quantities[i];
        }
        
        _deckTypes[deckName] = DeckType({
            name: deckName,
            cardContracts: cardContracts,
            quantities: quantities,
            totalCards: totalCards,
            price: 0.05 ether, // Default deck price
            active: true
        });
        
        _deckTypeNames.push(deckName);
        
        emit DeckTypeAdded(deckName, cardContracts, quantities);
    }

    /**
     * @dev Open a deck
     * @param deckType Name of the deck type to open
     * @return tokenIds Array of token IDs of minted cards
     */
    function openDeck(string calldata deckType) external payable nonReentrant whenNotPaused returns (uint256[] memory) {
        DeckType storage deck = _deckTypes[deckType];
        if (!deck.active) revert CardSetErrors.DeckNotFound();
        if (msg.value < deck.price) revert CardSetErrors.InsufficientPayment(deck.price, msg.value);
        
        uint256[] memory tokenIds = new uint256[](deck.totalCards);
        address[] memory selectedContracts = new address[](deck.totalCards);
        uint256 tokenIndex = 0;
        
        // Mint cards according to deck specification
        for (uint256 i = 0; i < deck.cardContracts.length; i++) {
            address cardContract = deck.cardContracts[i];
            uint256 quantity = deck.quantities[i];
            
            for (uint256 j = 0; j < quantity; j++) {
                uint256 tokenId = ICard(cardContract).mint(msg.sender);
                tokenIds[tokenIndex] = tokenId;
                selectedContracts[tokenIndex] = cardContract;
                tokenIndex++;
            }
        }
        
        emit DeckOpened(msg.sender, deckType, selectedContracts, tokenIds);
        
        return tokenIds;
    }

    // ============ Pricing Functions ============

    /**
     * @dev Set pack price
     * @param newPrice New price in wei
     */
    function setPackPrice(uint256 newPrice) external onlyOwner {
        packPrice = newPrice;
        emit PackPriceUpdated(newPrice);
    }

    /**
     * @dev Set deck price
     * @param deckType Name of the deck type
     * @param newPrice New price in wei
     */
    function setDeckPrice(string calldata deckType, uint256 newPrice) external onlyOwner {
        if (!_deckTypes[deckType].active) revert CardSetErrors.DeckNotFound();
        _deckTypes[deckType].price = newPrice;
        emit DeckPriceUpdated(deckType, newPrice);
    }

    /**
     * @dev Get deck price
     * @param deckType Name of the deck type
     * @return Price in wei
     */
    function getDeckPrice(string calldata deckType) external view returns (uint256) {
        if (!_deckTypes[deckType].active) revert CardSetErrors.DeckNotFound();
        return _deckTypes[deckType].price;
    }

    // ============ View Functions ============

    /**
     * @dev Get comprehensive set information
     * @return SetInfo struct with all set details
     */
    function getSetInfo() external view returns (SetInfo memory) {
        return SetInfo({
            name: setName,
            emissionCap: emissionCap,
            totalEmission: totalEmission,
            packPrice: packPrice,
            cardContracts: _cardContracts,
            isLocked: isLocked
        });
    }

    /**
     * @dev Get all card contracts
     * @return Array of card contract addresses
     */
    function getCardContracts() external view returns (address[] memory) {
        return _cardContracts;
    }

    /**
     * @dev Get card contracts by rarity
     * @param rarity The rarity to filter by
     * @return Array of card contract addresses
     */
    function getCardContractsByRarity(ICard.Rarity rarity) external view returns (address[] memory) {
        return _cardContractsByRarity[rarity];
    }

    /**
     * @dev Get deck type information
     * @param deckType Name of the deck type
     * @return DeckType struct
     */
    function getDeckType(string calldata deckType) external view returns (DeckType memory) {
        if (!_deckTypes[deckType].active) revert CardSetErrors.DeckNotFound();
        return _deckTypes[deckType];
    }

    /**
     * @dev Get all deck type names
     * @return Array of deck type names
     */
    function getDeckTypeNames() external view returns (string[] memory) {
        return _deckTypeNames;
    }

    // ============ Admin Functions ============

    /**
     * @dev Withdraw contract balance
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) revert CardSetErrors.NoFundsToWithdraw();
        
        payable(owner()).transfer(balance);
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ Emission Validation Functions ============

    /**
     * @dev Validate if an emission cap is compatible with pack size to ensure complete packs
     * @param emissionCap_ The emission cap to validate
     * @return isValid Whether the emission cap is valid
     * @return suggestedLower Suggested lower emission cap (rounded down to nearest multiple)
     * @return suggestedHigher Suggested higher emission cap (rounded up to nearest multiple)
     */
    function validateEmissionCapForPackSize(uint256 emissionCap_) 
        external 
        pure 
        returns (bool isValid, uint256 suggestedLower, uint256 suggestedHigher) 
    {
        return _calculateEmissionCapSuggestions(emissionCap_);
    }

    /**
     * @dev Set a new emission cap (only if unlocked and valid for pack size)
     * @param newEmissionCap The new emission cap to set
     */
    function setEmissionCap(uint256 newEmissionCap) external onlyOwner {
        if (isLocked) revert CardSetErrors.SetIsLocked();
        if (totalEmission > 0) revert CardSetErrors.EmissionCapReached(); // Cannot change after emission started
        
        _validateEmissionCapForPackSize(newEmissionCap);
        emissionCap = newEmissionCap;
    }

    // ============ Internal Functions ============

    /**
     * @dev Internal function to fulfill deck opening
     * @param user Address of the user opening the deck
     * @param deckType Name of the deck type
     */
    function _fulfillDeckOpening(address user, string memory deckType) internal pure {
        // For deck opening, we don't need randomness - just mint the specified cards
        // This is a placeholder for potential future deck randomization
        (user, deckType); // Suppress unused parameter warnings
    }

    /**
     * @dev Internal function to validate emission cap for pack size compatibility
     * @param emissionCap_ The emission cap to validate
     */
    function _validateEmissionCapForPackSize(uint256 emissionCap_) internal pure {
        if (emissionCap_ == 0) revert CardSetErrors.InvalidEmissionCap();
        
        (bool isValid, uint256 suggestedLower, uint256 suggestedHigher) = _calculateEmissionCapSuggestions(emissionCap_);
        
        if (!isValid) {
            revert CardSetErrors.InvalidEmissionCapForPackSize(emissionCap_, suggestedLower, suggestedHigher);
        }
    }

    /**
     * @dev Internal function to calculate emission cap suggestions
     * @param emissionCap_ The emission cap to analyze
     * @return isValid Whether the emission cap is valid (divisible by PACK_SIZE)
     * @return suggestedLower Suggested lower emission cap (largest multiple of PACK_SIZE ≤ emissionCap_)
     * @return suggestedHigher Suggested higher emission cap (smallest multiple of PACK_SIZE ≥ emissionCap_)
     */
    function _calculateEmissionCapSuggestions(uint256 emissionCap_) 
        internal 
        pure 
        returns (bool isValid, uint256 suggestedLower, uint256 suggestedHigher) 
    {
        if (emissionCap_ == 0) {
            return (false, 0, PACK_SIZE);
        }

        // Check if emission cap is divisible by pack size
        isValid = (emissionCap_ % PACK_SIZE == 0);
        
        if (isValid) {
            // If already valid, both suggestions are the same as input
            suggestedLower = emissionCap_;
            suggestedHigher = emissionCap_;
        } else {
            // Calculate nearest valid values
            suggestedLower = (emissionCap_ / PACK_SIZE) * PACK_SIZE;
            suggestedHigher = suggestedLower + PACK_SIZE;
            
            // Handle edge case where emissionCap_ < PACK_SIZE
            if (emissionCap_ < PACK_SIZE) {
                suggestedLower = 0; // No valid lower option
                suggestedHigher = PACK_SIZE;
            }
        }
        
        return (isValid, suggestedLower, suggestedHigher);
    }
} 