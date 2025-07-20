// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ICard
 * @dev Interface for individual trading card contracts
 * @notice Each card type gets its own contract for maximum modularity
 */
interface ICard {
    /**
     * @dev Card rarity levels
     */
    enum Rarity {
        COMMON,     // 0
        UNCOMMON,   // 1
        RARE,       // 2
        MYTHICAL,   // 3
        SERIALIZED  // 4
    }

    /**
     * @dev Card metadata structure
     */
    struct CardInfo {
        uint256 cardId;
        string name;
        Rarity rarity;
        uint256 maxSupply;      // For serialized cards only, 0 for unlimited
        uint256 currentSupply;  // Current minted amount
        string metadataURI;     // IPFS hash or URI for card metadata
        bool active;            // Whether this card can be minted
    }

    // Events
    event CardMinted(address indexed to, uint256 indexed tokenId, address indexed minter);
    event CardDeactivated();
    event CardActivated();
    event MaxSupplyReached();

    // Card Information Functions
    function cardInfo() external view returns (CardInfo memory);
    function cardId() external view returns (uint256);
    function name() external view returns (string memory);
    function rarity() external view returns (Rarity);
    function maxSupply() external view returns (uint256);
    function currentSupply() external view returns (uint256);
    function metadataURI() external view returns (string memory);
    function isActive() external view returns (bool);
    function canMint() external view returns (bool);

    // Minting Functions (restricted to authorized contracts)
    function mint(address to) external returns (uint256 tokenId);
    function mintBatch(address to, uint256 quantity) external returns (uint256[] memory tokenIds);

    // Admin Functions
    function setActive(bool _active) external;
    function setMetadataURI(string calldata _metadataURI) external;
    function setRoyalty(uint96 feeNumerator) external;

    // Authorization Functions
    function addAuthorizedMinter(address minter) external;
    function removeAuthorizedMinter(address minter) external;
    function isAuthorizedMinter(address minter) external view returns (bool);
} 