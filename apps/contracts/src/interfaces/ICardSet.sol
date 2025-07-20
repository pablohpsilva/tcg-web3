// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ICard.sol";

/**
 * @title ICardSet
 * @dev Interface for CardSet contracts that manage collections of Card contracts
 */
interface ICardSet {
    
    // ============ Structs ============
    
    /**
     * @dev Deck type configuration
     */
    struct DeckType {
        string name;
        address[] cardContracts;
        uint256[] quantities;
        uint256 totalCards;
        uint256 price;
        bool active;
    }
    
    /**
     * @dev Set information
     */
    struct SetInfo {
        string name;
        uint256 emissionCap;
        uint256 totalEmission;
        uint256 packPrice;
        address[] cardContracts;
        bool isLocked;
    }

    /**
     * @dev Batch card creation data
     */
    struct CardCreationData {
        uint256 cardId;
        string name;
        ICard.Rarity rarity;
        uint256 maxSupply;
        string metadataURI;
    }
    
    // ============ Events ============
    
    event CardContractAdded(address indexed cardContract, ICard.Rarity rarity);
    event CardContractRemoved(address indexed cardContract);
    event CardContractsBatchCreated(address[] cardContracts, uint256[] cardIds, string[] names, ICard.Rarity[] rarities);
    event SetLocked(address indexed owner, uint256 totalCardContracts);
    event PackOpened(address indexed user, address[] cardContracts, uint256[] tokenIds);
    event DeckOpened(address indexed user, string deckType, address[] cardContracts, uint256[] tokenIds);
    event DeckTypeAdded(string indexed deckType, address[] cardContracts, uint256[] quantities);
    event PackPriceUpdated(uint256 newPrice);
    event DeckPriceUpdated(string indexed deckType, uint256 newPrice);
    
    // ============ Card Contract Management ============
    
    /**
     * @dev Add a Card contract to this set
     * @param cardContract Address of the Card contract to add
     */
    function addCardContract(address cardContract) external;

    /**
     * @dev Batch create and add multiple Card contracts to this set
     * @param cardData Array of card creation data
     * @notice More gas efficient than creating cards individually
     */
    function batchCreateAndAddCards(CardCreationData[] calldata cardData) external;
    
    /**
     * @dev Remove a Card contract from this set
     * @param cardContract Address of the Card contract to remove
     */
    function removeCardContract(address cardContract) external;

    /**
     * @dev Lock the set to prevent adding new cards
     * @notice This action is irreversible and ensures set immutability
     */
    function lockSet() external;
    
    // ============ Pack Opening ============
    
    /**
     * @dev Open a booster pack
     * @notice Requires payment and uses Chainlink VRF for randomness
     */
    function openPack() external payable;
    
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
    ) external;
    
    /**
     * @dev Open a deck
     * @param deckType Name of the deck type to open
     * @return tokenIds Array of token IDs of minted cards
     */
    function openDeck(string calldata deckType) external payable returns (uint256[] memory);
    
    // ============ Pricing Functions ============
    
    /**
     * @dev Set pack price
     * @param newPrice New price in wei
     */
    function setPackPrice(uint256 newPrice) external;
    
    /**
     * @dev Set deck price
     * @param deckType Name of the deck type
     * @param newPrice New price in wei
     */
    function setDeckPrice(string calldata deckType, uint256 newPrice) external;
    
    /**
     * @dev Get deck price
     * @param deckType Name of the deck type
     * @return Price in wei
     */
    function getDeckPrice(string calldata deckType) external view returns (uint256);
    
    // ============ View Functions ============
    
    /**
     * @dev Get comprehensive set information
     * @return SetInfo struct with all set details
     */
    function getSetInfo() external view returns (SetInfo memory);
    
    /**
     * @dev Get all card contracts
     * @return Array of card contract addresses
     */
    function getCardContracts() external view returns (address[] memory);
    
    /**
     * @dev Get card contracts by rarity
     * @param rarity The rarity to filter by
     * @return Array of card contract addresses
     */
    function getCardContractsByRarity(ICard.Rarity rarity) external view returns (address[] memory);
    
    /**
     * @dev Get deck type information
     * @param deckType Name of the deck type
     * @return DeckType struct
     */
    function getDeckType(string calldata deckType) external view returns (DeckType memory);
    
    /**
     * @dev Get all deck type names
     * @return Array of deck type names
     */
    function getDeckTypeNames() external view returns (string[] memory);
    
    // ============ Admin Functions ============
    
    /**
     * @dev Withdraw contract balance
     */
    function withdraw() external;
    
    /**
     * @dev Pause the contract
     */
    function pause() external;
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external;
} 