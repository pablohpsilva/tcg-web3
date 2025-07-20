// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ICard.sol";

/**
 * @title ICardSet
 * @dev Interface for trading card set contracts that manage multiple Card contracts
 * @notice CardSet focuses on set-level operations while Card contracts handle individual card logic
 */
interface ICardSet {
    /**
     * @dev Deck definition structure
     */
    struct DeckType {
        string name;
        address[] cardContracts; // Array of Card contract addresses in this deck
        uint256[] quantities;    // Quantity of each card (must match cardContracts length)
        bool active;             // Whether this deck type is available
    }

    /**
     * @dev Pack opening result structure
     */
    struct PackResult {
        address[] cardContracts;
        uint256[] tokenIds;
        address recipient;
        uint256 timestamp;
    }

    /**
     * @dev Set information structure
     */
    struct SetInfo {
        string name;
        uint256 emissionCap;
        uint256 totalEmission;
        uint256 packPrice;
        address[] cardContracts;
        string[] deckTypeNames;
    }

    // Events
    event PackOpened(address indexed user, address[] cardContracts, uint256[] tokenIds);
    event DeckOpened(address indexed user, string deckType, address[] cardContracts, uint256[] tokenIds);
    event CardContractAdded(address indexed cardContract, ICard.Rarity rarity);
    event DeckTypeAdded(string name, address[] cardContracts, uint256[] quantities);
    event EmissionCapReached();

    // Pack and Deck Functions
    function openPack() external payable returns (uint256[] memory tokenIds);
    function openDeck(string calldata deckType) external payable returns (uint256[] memory tokenIds);

    // Card Management Functions
    function addCardContract(address cardContract) external;
    function removeCardContract(address cardContract) external;
    function addDeckType(
        string calldata name,
        address[] calldata cardContracts,
        uint256[] calldata quantities
    ) external;

    // View Functions
    function getSetInfo() external view returns (SetInfo memory);
    function getDeckType(string calldata deckType) external view returns (DeckType memory);
    function totalEmission() external view returns (uint256);
    function emissionCap() external view returns (uint256);
    function packPrice() external view returns (uint256);
    function getDeckPrice(string calldata deckType) external view returns (uint256);
    function getCardContracts() external view returns (address[] memory);
    function getCardContractsByRarity(ICard.Rarity rarity) external view returns (address[] memory);
    function getDeckTypeNames() external view returns (string[] memory);
    
    // Admin Functions
    function setPackPrice(uint256 price) external;
    function setDeckPrice(string calldata deckType, uint256 price) external;
    function withdraw() external;
    function pause() external;
    function unpause() external;
} 