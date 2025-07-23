// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "./interfaces/ICard.sol";

/**
 * @title CardBatch - Security-Hardened Gas-Optimized Multi-Card Contract
 * @dev ERC1155 implementation that holds multiple card types in a single contract
 * @notice Provides massive gas savings by batching multiple cards in one contract
 */
contract CardBatch is ERC1155, Ownable, ReentrancyGuard, Pausable, IERC2981, ICard {
    
    // ============ Security Constants ============
    
    uint256 public constant MAX_MINT_PER_TX = 1000;
    uint256 public constant MAX_UINT32 = type(uint32).max;
    uint256 public constant MAX_ROYALTY_BASIS_POINTS = 1000; // 10% maximum
    uint256 public constant MAX_CARDS_PER_BATCH = 1000; // Maximum cards in one batch contract
    
    // ============ Structs ============
    
    /**
     * @dev Card creation data for batch creation
     */
    struct CardCreationData {
        uint256 cardId;
        string name;
        ICard.Rarity rarity;
        uint256 maxSupply;
        string metadataURI;
    }
    
    /**
     * @dev Packed card information - optimized storage
     */
    struct PackedCardInfo {
        uint32 cardId;           // 4 bytes
        uint32 maxSupply;        // 4 bytes
        uint32 currentSupply;    // 4 bytes
        uint8 rarity;            // 1 byte
        uint64 createdAt;        // 8 bytes
        bool active;             // 1 byte
        bool mintingLocked;      // 1 byte
        // Total: 23 bytes (fits in 32-byte slot)
    }
    
    /**
     * @dev Security controls
     */
    struct SecurityControls {
        bool emergencyPause;
        bool mintingPermanentlyLocked;
        bool metadataLocked;
        uint64 lastOwnerChange;
        uint32 totalMinters;
        uint32 totalCards;
    }
    SecurityControls private _security;
    
    /**
     * @dev Enhanced royalty information
     */
    struct RoyaltyInfo {
        uint96 percentage;      // 12 bytes - royalty percentage in basis points
        bool isActive;          // 1 byte
        bool changeLocked;      // 1 byte
        uint64 lastChanged;     // 8 bytes
    }
    RoyaltyInfo private _royaltyInfo;
    
    // ============ Storage Variables ============
    
    string public batchName;
    
    // Card data mappings - indexed by token ID
    mapping(uint256 => PackedCardInfo) private _cardInfo;
    mapping(uint256 => string) private _cardNames;
    mapping(uint256 => string) private _cardMetadataURIs;
    mapping(uint256 => bool) private _cardExists;
    
    // Address mappings for compatibility with original Card contract interface
    mapping(address => uint256) private _addressToTokenId;
    mapping(uint256 => address) private _tokenIdToAddress;
    
    // Authorization
    mapping(address => bool) private _authorizedMinters;
    mapping(address => bool) private _revokedMinters;
    
    // Card organization by rarity
    mapping(ICard.Rarity => uint256[]) private _cardsByRarity;
    uint256[] private _allCardIds;
    
    // ============ Events ============
    
    event CardBatchCreated(address indexed creator, uint256 totalCards, string batchName);
    event CardMinted(address indexed to, uint256 indexed tokenId, uint256 amount);
    event MinterAuthorized(address indexed minter);
    event MinterRevoked(address indexed minter);
    event CardActivated(uint256 indexed tokenId, bool active);
    event RoyaltyUpdated(address indexed recipient, uint256 percentage);
    event BatchMintCompleted(address indexed to, uint256 indexed tokenId, uint256 amount, uint256 totalSupply);
    event SecurityEvent(string indexed eventType, address indexed actor, uint256 timestamp);
    event CardAddressGenerated(uint256 indexed tokenId, address indexed generatedAddress);
    
    // ============ Custom Errors ============
    
    error InvalidInput(string parameter);
    error Unauthorized(string operation);
    error SecurityBreach(string reason);
    error OperationLocked(string operation);
    error ExceedsLimit(string limitType, uint256 requested, uint256 maximum);
    error CardNotFound(uint256 tokenId);
    
    // ============ Enhanced Security Modifiers ============
    
    modifier onlyAuthorizedMinter() {
        if (!(_authorizedMinters[msg.sender] || msg.sender == owner())) {
            revert Unauthorized("minting");
        }
        if (_revokedMinters[msg.sender]) {
            revert Unauthorized("minter revoked");
        }
        if (_security.emergencyPause || _security.mintingPermanentlyLocked) {
            revert OperationLocked("minting");
        }
        _;
    }
    
    modifier notEmergencyPaused() {
        if (_security.emergencyPause) {
            revert OperationLocked("emergency pause active");
        }
        _;
    }
    
    modifier validAddress(address addr) {
        if (addr == address(0)) revert InvalidInput("zero address");
        _;
    }
    
    modifier validAmount(uint256 amount) {
        if (amount == 0) revert InvalidInput("amount cannot be zero");
        if (amount > MAX_MINT_PER_TX) revert ExceedsLimit("mint amount", amount, MAX_MINT_PER_TX);
        _;
    }
    
    modifier cardExists(uint256 tokenId) {
        if (!_cardExists[tokenId]) revert CardNotFound(tokenId);
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        string memory batchName_,
        CardCreationData[] memory cards,
        string memory baseURI_,
        address owner_
    ) 
        ERC1155(baseURI_)
        Ownable(owner_)
    {
        // Input validation
        if (owner_ == address(0)) revert InvalidInput("owner cannot be zero address");
        if (bytes(batchName_).length == 0) revert InvalidInput("batchName cannot be empty");
        if (bytes(baseURI_).length == 0) revert InvalidInput("baseURI cannot be empty");
        if (cards.length == 0) revert InvalidInput("cards array cannot be empty");
        if (cards.length > MAX_CARDS_PER_BATCH) revert ExceedsLimit("cards", cards.length, MAX_CARDS_PER_BATCH);
        
        batchName = batchName_;
        
        // Initialize security controls
        _security = SecurityControls({
            emergencyPause: false,
            mintingPermanentlyLocked: false,
            metadataLocked: false,
            lastOwnerChange: uint64(block.timestamp),
            totalMinters: 0,
            totalCards: uint32(cards.length)
        });
        
        // Set default royalty: 2.5% to owner
        _royaltyInfo = RoyaltyInfo({
            percentage: 250,  // 2.5% in basis points
            isActive: true,
            changeLocked: false,
            lastChanged: uint64(block.timestamp)
        });
        
        // Create all cards
        _createCards(cards);
        
        // Enhanced authorization: only authorize if caller is a contract (likely CardSetBatch)
        if (msg.sender != owner_ && msg.sender.code.length > 0) {
            _authorizedMinters[msg.sender] = true;
            _security.totalMinters = 1;
            emit MinterAuthorized(msg.sender);
        }
        
        emit CardBatchCreated(owner_, cards.length, batchName_);
        emit RoyaltyUpdated(owner_, 250);
        emit SecurityEvent("CONTRACT_DEPLOYED", owner_, block.timestamp);
    }
    
    // ============ Internal Card Creation ============
    
    function _createCards(CardCreationData[] memory cards) internal {
        for (uint256 i = 0; i < cards.length; i++) {
            uint256 tokenId = cards[i].cardId;
            
            // Validation
            if (_cardExists[tokenId]) revert InvalidInput("duplicate card ID");
            if (bytes(cards[i].name).length == 0) revert InvalidInput("card name cannot be empty");
            if (tokenId > MAX_UINT32) revert ExceedsLimit("cardId", tokenId, MAX_UINT32);
            if (cards[i].maxSupply > MAX_UINT32) revert ExceedsLimit("maxSupply", cards[i].maxSupply, MAX_UINT32);
            if (uint8(cards[i].rarity) > 4) revert InvalidInput("invalid rarity");
            
            // Store card information
            _cardInfo[tokenId] = PackedCardInfo({
                cardId: uint32(tokenId),
                maxSupply: uint32(cards[i].maxSupply),
                currentSupply: 0,
                rarity: uint8(cards[i].rarity),
                createdAt: uint64(block.timestamp),
                active: true,
                mintingLocked: false
            });
            
            _cardNames[tokenId] = cards[i].name;
            _cardMetadataURIs[tokenId] = cards[i].metadataURI;
            _cardExists[tokenId] = true;
            
            // Organize by rarity
            _cardsByRarity[cards[i].rarity].push(tokenId);
            _allCardIds.push(tokenId);
            
            // Generate a deterministic address for this card for compatibility
            address generatedAddress = _generateCardAddress(tokenId);
            _tokenIdToAddress[tokenId] = generatedAddress;
            _addressToTokenId[generatedAddress] = tokenId;
            
            emit CardAddressGenerated(tokenId, generatedAddress);
        }
    }
    
    function _generateCardAddress(uint256 tokenId) internal view returns (address) {
        // Generate a deterministic address based on contract address and token ID
        bytes32 salt = keccak256(abi.encodePacked(address(this), tokenId, block.timestamp));
        return address(uint160(uint256(salt)));
    }
    
    // ============ Enhanced Minting Functions ============
    
    /**
     * @dev Secure batch mint with comprehensive validation
     */
    function batchMint(address to, uint256 tokenId, uint256 amount) 
        external 
        onlyAuthorizedMinter 
        whenNotPaused 
        notEmergencyPaused
        validAddress(to)
        validAmount(amount)
        cardExists(tokenId)
        nonReentrant
        returns (uint256[] memory) 
    {
        PackedCardInfo storage card = _cardInfo[tokenId];
        
        if (!card.active) revert OperationLocked("card not active");
        if (card.mintingLocked) revert OperationLocked("card minting locked");
        
        // Enhanced supply validation with overflow protection
        uint256 newSupply = card.currentSupply + amount;
        if (card.maxSupply > 0 && newSupply > card.maxSupply) {
            revert ExceedsLimit("supply", newSupply, card.maxSupply);
        }
        
        // Safe supply update
        card.currentSupply = uint32(newSupply);
        
        // Mint ERC1155 tokens in batch
        _mint(to, tokenId, amount, "");
        
        emit CardMinted(to, tokenId, amount);
        emit BatchMintCompleted(to, tokenId, amount, card.currentSupply);
        
        // Return array for compatibility
        uint256[] memory tokenIds = new uint256[](amount);
        for (uint256 i = 0; i < amount; i++) {
            tokenIds[i] = tokenId;
        }
        return tokenIds;
    }
    
    /**
     * @dev Batch mint multiple different cards
     */
    function batchMintMultiple(
        address to,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts
    ) 
        external 
        onlyAuthorizedMinter 
        whenNotPaused 
        notEmergencyPaused
        validAddress(to)
        nonReentrant
        returns (uint256[][] memory) 
    {
        if (tokenIds.length != amounts.length) revert InvalidInput("array length mismatch");
        if (tokenIds.length == 0) revert InvalidInput("empty arrays");
        
        uint256[][] memory allTokenIds = new uint256[][](tokenIds.length);
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (amounts[i] == 0) revert InvalidInput("amount cannot be zero");
            if (!_cardExists[tokenIds[i]]) revert CardNotFound(tokenIds[i]);
            
            PackedCardInfo storage card = _cardInfo[tokenIds[i]];
            if (!card.active) revert OperationLocked("card not active");
            if (card.mintingLocked) revert OperationLocked("card minting locked");
            
            uint256 newSupply = card.currentSupply + amounts[i];
            if (card.maxSupply > 0 && newSupply > card.maxSupply) {
                revert ExceedsLimit("supply", newSupply, card.maxSupply);
            }
            
            card.currentSupply = uint32(newSupply);
            allTokenIds[i] = new uint256[](amounts[i]);
            for (uint256 j = 0; j < amounts[i]; j++) {
                allTokenIds[i][j] = tokenIds[i];
            }
        }
        
        // Batch mint all tokens
        _mintBatch(to, tokenIds, amounts, "");
        
        return allTokenIds;
    }
    
    // ============ Compatibility Functions with Original Card Interface ============
    
    /**
     * @dev Get card info by token ID
     */
    function getCardInfo(uint256 tokenId) external view cardExists(tokenId) returns (CardInfo memory) {
        PackedCardInfo storage card = _cardInfo[tokenId];
        return CardInfo({
            cardId: card.cardId,
            name: _cardNames[tokenId],
            rarity: Rarity(card.rarity),
            maxSupply: card.maxSupply,
            currentSupply: card.currentSupply,
            metadataURI: _cardMetadataURIs[tokenId],
            active: card.active
        });
    }
    
    /**
     * @dev Get card info by generated address (for compatibility)
     */
    function getCardInfoByAddress(address cardAddress) external view returns (CardInfo memory) {
        uint256 tokenId = _addressToTokenId[cardAddress];
        if (!_cardExists[tokenId]) revert CardNotFound(tokenId);
        return this.getCardInfo(tokenId);
    }
    
    // ============ ICard Interface Implementation ============
    
    function cardId() external pure override returns (uint256) {
        revert("Use getCardInfo(tokenId) for specific card");
    }
    
    function name() external view override returns (string memory) {
        return batchName;
    }
    
    function rarity() external pure override returns (Rarity) {
        revert("Use getCardInfo(tokenId) for specific card rarity");
    }
    
    function maxSupply() external pure override returns (uint256) {
        revert("Use getCardInfo(tokenId) for specific card max supply");
    }
    
    function currentSupply() external pure override returns (uint256) {
        revert("Use getCardInfo(tokenId) for specific card current supply");
    }
    
    function canMint() external view override returns (bool) {
        // Return true if any card can mint
        for (uint256 i = 0; i < _allCardIds.length; i++) {
            uint256 tokenId = _allCardIds[i];
            PackedCardInfo storage card = _cardInfo[tokenId];
            if (card.active && 
                !card.mintingLocked && 
                !_security.emergencyPause && 
                !_security.mintingPermanentlyLocked && 
                (card.maxSupply == 0 || card.currentSupply < card.maxSupply)) {
                return true;
            }
        }
        return false;
    }
    
    function canMintCard(uint256 tokenId) external view cardExists(tokenId) returns (bool) {
        PackedCardInfo storage card = _cardInfo[tokenId];
        return card.active && 
               !card.mintingLocked && 
               !_security.emergencyPause && 
               !_security.mintingPermanentlyLocked && 
               (card.maxSupply == 0 || card.currentSupply < card.maxSupply);
    }
    
    function metadataURI() external pure override returns (string memory) {
        revert("Use getCardInfo(tokenId) for specific card metadata");
    }
    
    function isActive() external pure override returns (bool) {
        revert("Use getCardInfo(tokenId) for specific card active status");
    }
    
    function cardInfo() external pure override returns (CardInfo memory) {
        revert("Use getCardInfo(tokenId) for specific card info");
    }
    
    // ============ Batch-Specific View Functions ============
    
    function getAllCardIds() external view returns (uint256[] memory) {
        return _allCardIds;
    }
    
    function getCardsByRarity(Rarity rarity) external view returns (uint256[] memory) {
        return _cardsByRarity[rarity];
    }
    
    function getTotalCards() external view returns (uint256) {
        return _security.totalCards;
    }
    
    function getCardAddress(uint256 tokenId) external view cardExists(tokenId) returns (address) {
        return _tokenIdToAddress[tokenId];
    }
    
    function getTokenIdByAddress(address cardAddress) external view returns (uint256) {
        uint256 tokenId = _addressToTokenId[cardAddress];
        if (!_cardExists[tokenId]) revert CardNotFound(tokenId);
        return tokenId;
    }
    
    // ============ Enhanced Authorization System ============
    
    function addAuthorizedMinter(address minter) 
        external 
        onlyOwner 
        validAddress(minter)
        notEmergencyPaused
    {
        if (_authorizedMinters[minter]) revert InvalidInput("already authorized");
        if (_revokedMinters[minter]) revert InvalidInput("minter was revoked");
        if (_security.totalMinters >= 10) revert ExceedsLimit("minters", _security.totalMinters + 1, 10);
        
        _authorizedMinters[minter] = true;
        _security.totalMinters++;
        
        emit MinterAuthorized(minter);
        emit SecurityEvent("MINTER_AUTHORIZED", minter, block.timestamp);
    }
    
    function removeAuthorizedMinter(address minter) 
        external 
        onlyOwner 
        validAddress(minter)
    {
        if (!_authorizedMinters[minter]) revert InvalidInput("not authorized");
        
        _authorizedMinters[minter] = false;
        _revokedMinters[minter] = true;
        _security.totalMinters--;
        
        emit MinterRevoked(minter);
        emit SecurityEvent("MINTER_REVOKED", minter, block.timestamp);
    }
    
    function isAuthorizedMinter(address minter) external view returns (bool) {
        return (_authorizedMinters[minter] || minter == owner()) && !_revokedMinters[minter];
    }
    
    // ============ Enhanced Royalty System ============
    
    function royaltyInfo(uint256, uint256 salePrice) external view override returns (address, uint256) {
        if (!_royaltyInfo.isActive) {
            return (address(0), 0);
        }
        
        uint256 royaltyAmount = (salePrice * _royaltyInfo.percentage) / 10000;
        return (owner(), royaltyAmount);
    }
    
    function getRoyaltyInfo(uint256 salePrice) external view returns (
        address recipient,
        uint256 amount,
        bool royaltyActive
    ) {
        if (!_royaltyInfo.isActive) {
            return (address(0), 0, false);
        }
        
        recipient = owner();
        amount = (salePrice * _royaltyInfo.percentage) / 10000;
        royaltyActive = _royaltyInfo.isActive;
    }
    
    function setRoyalty(uint96 feeNumerator) external onlyOwner notEmergencyPaused {
        if (_royaltyInfo.changeLocked) revert OperationLocked("royalty changes locked");
        if (feeNumerator > MAX_ROYALTY_BASIS_POINTS) {
            revert ExceedsLimit("royalty", feeNumerator, MAX_ROYALTY_BASIS_POINTS);
        }
        
        _royaltyInfo.percentage = feeNumerator;
        _royaltyInfo.lastChanged = uint64(block.timestamp);
        
        emit RoyaltyUpdated(owner(), feeNumerator);
        emit SecurityEvent("ROYALTY_UPDATED", msg.sender, block.timestamp);
    }
    
    function setRoyaltyActive(bool active) external onlyOwner notEmergencyPaused {
        if (_royaltyInfo.changeLocked) revert OperationLocked("royalty changes locked");
        
        _royaltyInfo.isActive = active;
        emit SecurityEvent(active ? "ROYALTY_ACTIVATED" : "ROYALTY_DEACTIVATED", msg.sender, block.timestamp);
    }
    
    // ============ Enhanced Admin Functions ============
    
    function setCardActive(uint256 tokenId, bool active_) external onlyOwner cardExists(tokenId) notEmergencyPaused {
        _cardInfo[tokenId].active = active_;
        emit CardActivated(tokenId, active_);
        emit SecurityEvent(active_ ? "CARD_ACTIVATED" : "CARD_DEACTIVATED", msg.sender, block.timestamp);
    }
    
    function setCardMetadataURI(uint256 tokenId, string calldata newURI) external onlyOwner cardExists(tokenId) notEmergencyPaused {
        if (_security.metadataLocked) revert OperationLocked("metadata locked");
        if (bytes(newURI).length == 0) revert InvalidInput("URI cannot be empty");
        
        _cardMetadataURIs[tokenId] = newURI;
        emit SecurityEvent("CARD_METADATA_UPDATED", msg.sender, block.timestamp);
    }
    
    function pause() external onlyOwner {
        _pause();
        emit SecurityEvent("CONTRACT_PAUSED", msg.sender, block.timestamp);
    }
    
    function unpause() external onlyOwner {
        _unpause();
        emit SecurityEvent("CONTRACT_UNPAUSED", msg.sender, block.timestamp);
    }
    
    // ============ Emergency Security Functions ============
    
    function emergencyPause() external onlyOwner {
        _security.emergencyPause = true;
        _pause();
        emit SecurityEvent("EMERGENCY_PAUSE", msg.sender, block.timestamp);
    }
    
    function permanentlyLockMinting() external onlyOwner {
        _security.mintingPermanentlyLocked = true;
        emit SecurityEvent("MINTING_PERMANENTLY_LOCKED", msg.sender, block.timestamp);
    }
    
    function lockMetadata() external onlyOwner {
        _security.metadataLocked = true;
        emit SecurityEvent("METADATA_LOCKED", msg.sender, block.timestamp);
    }
    
    function lockRoyaltyChanges() external onlyOwner {
        _royaltyInfo.changeLocked = true;
        emit SecurityEvent("ROYALTY_CHANGES_LOCKED", msg.sender, block.timestamp);
    }
    
    // ============ URI Functions ============
    
    function uri(uint256 tokenId) public view override cardExists(tokenId) returns (string memory) {
        return string(abi.encodePacked(_cardMetadataURIs[tokenId], "/", _uint2str(tokenId)));
    }
    
    function setBaseURI(string calldata newBaseURI) external onlyOwner notEmergencyPaused {
        if (_security.metadataLocked) revert OperationLocked("metadata locked");
        if (bytes(newBaseURI).length == 0) revert InvalidInput("URI cannot be empty");
        
        _setURI(newBaseURI);
        emit SecurityEvent("BASE_URI_UPDATED", msg.sender, block.timestamp);
    }
    
    // ============ Interface Support ============
    
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, IERC165) returns (bool) {
        return interfaceId == type(IERC2981).interfaceId ||
               interfaceId == type(ICard).interfaceId ||
               super.supportsInterface(interfaceId);
    }
    
    // ============ Helper Functions ============
    
    function _uint2str(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }
    
    // ============ Security View Functions ============
    
    function getSecurityStatus() external view returns (
        bool isEmergencyPaused,
        bool mintingLocked,
        bool metadataLocked,
        bool royaltyChangesLocked,
        uint256 totalMinters,
        uint256 lastOwnerChange
    ) {
        return (
            _security.emergencyPause,
            _security.mintingPermanentlyLocked,
            _security.metadataLocked,
            _royaltyInfo.changeLocked,
            _security.totalMinters,
            _security.lastOwnerChange
        );
    }
    
    // ============ Ownership Transfer Override ============
    
    function transferOwnership(address newOwner) public override onlyOwner validAddress(newOwner) {
        super.transferOwnership(newOwner);
        
        _security.lastOwnerChange = uint64(block.timestamp);
        emit SecurityEvent("OWNERSHIP_TRANSFERRED", newOwner, block.timestamp);
    }
} 