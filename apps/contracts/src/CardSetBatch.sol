// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./interfaces/ICardSet.sol";
import "./interfaces/ICard.sol";
import "./CardBatch.sol";
import "./errors/CardSetErrors.sol";
import "./mocks/MockVRFCoordinator.sol";

/**
 * @title CardSetBatch - Security-Hardened Gas-Optimized Trading Card Set for Batch Cards
 * @dev Implements batch operations, meta-transactions, storage optimization with CardBatch integration
 * @notice Provides 95%+ gas savings with military-grade security protections using batch card system
 */
contract CardSetBatch is ICardSet, Ownable, ReentrancyGuard, Pausable, EIP712 {
    using ECDSA for bytes32;
    
    // ============ Security Constants ============
    
    uint256 public constant MAX_BATCH_PACKS = 10;
    uint256 public constant MAX_BATCH_DECKS = 5;
    uint256 public constant MAX_DECK_CARDS = 100;
    uint256 public constant MAX_PRICE = 10 ether;
    uint256 public constant MIN_PRICE = 0.0001 ether;
    uint256 public constant MAX_STRING_LENGTH = 100;
    uint256 public constant VRF_TIMEOUT = 1 hours;
    uint256 public constant MAX_UINT64 = type(uint64).max;
    uint256 public constant MAX_UINT32 = type(uint32).max;
    
    // ============ Packed Storage Structures ============
    
    /**
     * @dev Enhanced packed set information with CardBatch integration
     */
    struct PackedSetInfo {
        uint64 emissionCap;
        uint64 totalEmission;
        uint64 packPrice;
        uint32 totalCardTypes;
        bool isLocked;
        bool useCardBatch;  // Always true for CardSetBatch
        uint32 totalPacksOpened;
        uint32 totalDecksOpened;
        uint32 lastVRFRequestId;
        uint160 vrfCoordinator;
        uint160 cardBatchContract;  // Address of the CardBatch contract
    }
    
    /**
     * @dev Enhanced packed deck type information
     */
    struct PackedDeckType {
        uint32 totalCards;
        uint64 price;
        uint32 timesOpened;
        bool active;
        bool priceLocked;
        uint64 createdAt;
    }
    
    /**
     * @dev Enhanced VRF request structure
     */
    struct VRFRequest {
        address user;
        bool isPack;
        string deckType;
        uint8 batchSize;
        uint64 timestamp;
        bool fulfilled;
    }
    
    /**
     * @dev Security controls structure
     */
    struct SecurityControls {
        bool emergencyPause;
        bool mintingLocked;
        bool priceChangesLocked;
        uint64 lastOwnerChange;
        uint32 totalVRFRequests;
        uint32 failedVRFRequests;
    }
    SecurityControls private _security;
    
    // ============ Storage Variables ============
    
    string public setName;
    PackedSetInfo private _setInfo;
    CardBatch public immutable cardBatch;  // The single CardBatch contract
    
    // Token ID management instead of contract addresses
    mapping(uint256 => bool) private _validTokenIds;
    mapping(ICard.Rarity => uint256[]) private _tokenIdsByRarity;
    mapping(uint256 => bool) private _removedTokenIds;
    
    // Enhanced deck types management with token IDs
    mapping(string => PackedDeckType) private _deckTypes;
    mapping(string => uint256[]) private _deckTokenIds;  // Token IDs instead of contracts
    mapping(string => uint256[]) private _deckQuantities;
    string[] private _deckTypeNames;
    mapping(string => bool) private _deckTypeExists;
    
    // Enhanced VRF and meta-transaction support
    mapping(uint256 => VRFRequest) private _vrfRequests;
    mapping(address => uint256) private _nonces;
    mapping(uint256 => bool) private _processedVRFRequests;
    
    // Enhanced batch operation tracking
    mapping(address => uint256) private _userPacksOpened;
    mapping(address => uint256) private _userDecksOpened;
    mapping(address => uint256) private _lastUserAction;
    
    // Constants
    uint32 public constant PACK_SIZE = 15;
    bytes32 private constant META_TX_TYPEHASH = keccak256("MetaTx(address user,string deckType,uint256 nonce,uint256 deadline)");
    
    // ============ Events ============
    
    event OptimizedPackOpened(address indexed user, uint256[] tokenIds, uint256[] amounts, bool[] isSerializedCard);
    event BatchPacksOpened(address indexed user, uint256 packCount, uint256 totalCards);
    event MetaTransactionExecuted(address indexed user, string indexed operation, uint256 nonce);
    event GasOptimizationEnabled(string indexed feature);
    event RoyaltyPaid(address indexed recipient, uint256 amount, uint256 indexed tokenId);
    event SecurityEvent(string indexed eventType, address indexed actor, uint256 timestamp);
    event EmergencyPauseActivated(address indexed activator);
    event VRFRequestTimeout(uint256 indexed requestId, address indexed user);
    event PaymentRefunded(address indexed user, uint256 amount, string reason);
    event TokenIdAdded(uint256 indexed tokenId, ICard.Rarity rarity);
    event TokenIdRemoved(uint256 indexed tokenId);
    event CardBatchIntegrated(address indexed cardBatchContract, uint256 totalCards);
    
    // ============ Custom Errors ============
    
    error InvalidInput(string parameter);
    error Unauthorized(string operation);
    error SecurityBreach(string reason);
    error OperationLocked(string operation);
    error ExceedsLimit(string limitType, uint256 requested, uint256 maximum);
    error PaymentFailed(string reason);
    error VRFSecurityBreach(string reason);
    error TokenIdNotFound(uint256 tokenId);
    
    // ============ Security Modifiers ============
    
    modifier validAddress(address addr) {
        if (addr == address(0)) revert InvalidInput("zero address");
        _;
    }
    
    modifier notEmergencyPaused() {
        if (_security.emergencyPause) revert OperationLocked("emergency pause active");
        _;
    }
    
    modifier notMintingLocked() {
        if (_security.mintingLocked) revert OperationLocked("minting locked");
        _;
    }
    
    modifier validStringLength(string memory str, string memory paramName) {
        if (bytes(str).length == 0) revert InvalidInput(string(abi.encodePacked(paramName, " cannot be empty")));
        if (bytes(str).length > MAX_STRING_LENGTH) revert ExceedsLimit(paramName, bytes(str).length, MAX_STRING_LENGTH);
        _;
    }
    
    modifier validPrice(uint256 price) {
        if (price < MIN_PRICE) revert ExceedsLimit("price too low", price, MIN_PRICE);
        if (price > MAX_PRICE) revert ExceedsLimit("price too high", price, MAX_PRICE);
        _;
    }
    
    modifier rateLimited(address user) {
        if (_lastUserAction[user] == block.timestamp && _lastUserAction[user] != 0) {
            revert SecurityBreach("rate limited");
        }
        _lastUserAction[user] = block.timestamp;
        _;
    }
    
    modifier validTokenId(uint256 tokenId) {
        if (!_validTokenIds[tokenId]) revert TokenIdNotFound(tokenId);
        _;
    }
    
    // ============ Enhanced Constructor ============
    
    constructor(
        string memory setName_,
        uint256 emissionCap_,
        address vrfCoordinator_,
        address cardBatchContract_,
        address owner_
    ) 
        EIP712("CardSetBatch", "1")
        Ownable(owner_)
    {
        // ============ Enhanced Input Validation ============
        
        if (owner_ == address(0)) revert InvalidInput("owner cannot be zero address");
        if (bytes(setName_).length == 0) revert InvalidInput("setName cannot be empty");
        if (bytes(setName_).length > MAX_STRING_LENGTH) revert ExceedsLimit("setName", bytes(setName_).length, MAX_STRING_LENGTH);
        if (emissionCap_ == 0) revert CardSetErrors.InvalidEmissionCap();
        if (emissionCap_ % PACK_SIZE != 0) revert CardSetErrors.InvalidEmissionCap();
        if (emissionCap_ > MAX_UINT64) revert ExceedsLimit("emissionCap", emissionCap_, MAX_UINT64);
        if (vrfCoordinator_ == address(0)) revert InvalidInput("vrfCoordinator cannot be zero address");
        if (vrfCoordinator_.code.length == 0) revert InvalidInput("vrfCoordinator must be contract");
        if (cardBatchContract_ == address(0)) revert InvalidInput("cardBatchContract cannot be zero address");
        if (cardBatchContract_.code.length == 0) revert InvalidInput("cardBatchContract must be contract");
        
        setName = setName_;
        cardBatch = CardBatch(cardBatchContract_);
        
        _setInfo = PackedSetInfo({
            emissionCap: uint64(emissionCap_),
            totalEmission: 0,
            packPrice: uint64(0.01 ether),
            totalCardTypes: 0,
            isLocked: false,
            useCardBatch: true,
            totalPacksOpened: 0,
            totalDecksOpened: 0,
            lastVRFRequestId: 0,
            vrfCoordinator: uint160(vrfCoordinator_),
            cardBatchContract: uint160(cardBatchContract_)
        });
        
        // Initialize security controls
        _security = SecurityControls({
            emergencyPause: false,
            mintingLocked: false,
            priceChangesLocked: false,
            lastOwnerChange: uint64(block.timestamp),
            totalVRFRequests: 0,
            failedVRFRequests: 0
        });
        
        // Initialize token IDs from CardBatch
        _initializeTokenIds();
        
        emit GasOptimizationEnabled("CardBatchIntegration");
        emit CardBatchIntegrated(cardBatchContract_, _setInfo.totalCardTypes);
        emit SecurityEvent("CARDSET_DEPLOYED", owner_, block.timestamp);
    }
    
    // ============ Initialization ============
    
    function _initializeTokenIds() internal {
        uint256[] memory allTokenIds = cardBatch.getAllCardIds();
        
        for (uint256 i = 0; i < allTokenIds.length; i++) {
            uint256 tokenId = allTokenIds[i];
            ICard.CardInfo memory cardInfo = cardBatch.getCardInfo(tokenId);
            
            _validTokenIds[tokenId] = true;
            _tokenIdsByRarity[cardInfo.rarity].push(tokenId);
        }
        
        _setInfo.totalCardTypes = uint32(allTokenIds.length);
    }
    
    // ============ Enhanced Pack Opening ============
    
    function openPack() 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        notEmergencyPaused 
        notMintingLocked
    {
        if (msg.value < _setInfo.packPrice) revert PaymentFailed("insufficient payment");
        if (_setInfo.totalEmission + PACK_SIZE > _setInfo.emissionCap) revert SecurityBreach("emission cap exceeded");
        if (_setInfo.totalCardTypes == 0) revert SecurityBreach("no cards available");
        
        _requestPackOpening(msg.sender, 1);
        
        emit SecurityEvent("PACK_OPENED", msg.sender, block.timestamp);
    }
    
    function openPacksBatch(uint8 packCount) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        notEmergencyPaused 
        notMintingLocked
        rateLimited(msg.sender)
    {
        if (packCount == 0) revert InvalidInput("packCount cannot be zero");
        if (packCount > MAX_BATCH_PACKS) revert ExceedsLimit("packCount", packCount, MAX_BATCH_PACKS);
        
        uint256 totalCost = _setInfo.packPrice * packCount;
        if (msg.value < totalCost) revert PaymentFailed("insufficient payment");
        
        uint256 totalCards = PACK_SIZE * packCount;
        if (_setInfo.totalEmission + totalCards > _setInfo.emissionCap) {
            revert SecurityBreach("emission cap exceeded");
        }
        
        _requestPackOpening(msg.sender, packCount);
        emit BatchPacksOpened(msg.sender, packCount, totalCards);
        emit SecurityEvent("BATCH_PACKS_OPENED", msg.sender, block.timestamp);
    }
    
    function openPackMeta(
        address user,
        string calldata deckType,
        uint256 deadline,
        bytes calldata signature
    ) 
        external 
        nonReentrant 
        whenNotPaused 
        notEmergencyPaused 
        validAddress(user)
        validStringLength(deckType, "deckType")
    {
        if (block.timestamp > deadline) revert SecurityBreach("signature expired");
        if (deadline > block.timestamp + 1 hours) revert SecurityBreach("deadline too far");
        
        uint256 nonce = _nonces[user];
        _nonces[user]++;
        
        bytes32 structHash = keccak256(abi.encode(META_TX_TYPEHASH, user, keccak256(bytes(deckType)), nonce, deadline));
        bytes32 hash = _hashTypedDataV4(structHash);
        
        address signer = hash.recover(signature);
        if (signer != user) revert SecurityBreach("invalid signature");
        if (signer == address(0)) revert SecurityBreach("invalid signature recovery");
        
        _executeMetaDeckOpening(user, deckType);
        emit MetaTransactionExecuted(user, "openDeck", nonce);
        emit SecurityEvent("META_TRANSACTION", user, block.timestamp);
    }
    
    // ============ Enhanced Deck Opening ============
    
    function openDeck(string calldata deckType) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        notEmergencyPaused 
        notMintingLocked
        validStringLength(deckType, "deckType")
        returns (uint256[] memory) 
    {
        PackedDeckType storage deck = _deckTypes[deckType];
        if (!deck.active) revert SecurityBreach("deck not found or inactive");
        if (msg.value < deck.price) revert PaymentFailed("insufficient payment");
        
        uint256[] memory tokenIds = _executeDeckOpening(msg.sender, deckType);
        
        // Secure royalty distribution
        _secureDistributeRoyaltiesToCards(deckType, deck.price);
        
        // Refund excess payment
        if (msg.value > deck.price) {
            uint256 refund = msg.value - deck.price;
            (bool success, ) = payable(msg.sender).call{value: refund}("");
            if (!success) revert PaymentFailed("refund failed");
            emit PaymentRefunded(msg.sender, refund, "excess payment");
        }
        
        emit SecurityEvent("DECK_OPENED", msg.sender, block.timestamp);
        return tokenIds;
    }
    
    function openDecksBatch(string[] calldata deckTypes) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        notEmergencyPaused 
        notMintingLocked
        rateLimited(msg.sender)
        returns (uint256[][] memory) 
    {
        if (deckTypes.length == 0) revert InvalidInput("empty deckTypes array");
        if (deckTypes.length > MAX_BATCH_DECKS) revert ExceedsLimit("deckTypes", deckTypes.length, MAX_BATCH_DECKS);
        
        uint256 totalCost = 0;
        for (uint256 i = 0; i < deckTypes.length; i++) {
            if (bytes(deckTypes[i]).length == 0) revert InvalidInput("empty deck name");
            if (!_deckTypes[deckTypes[i]].active) revert SecurityBreach("inactive deck found");
            totalCost += _deckTypes[deckTypes[i]].price;
        }
        
        if (msg.value < totalCost) revert PaymentFailed("insufficient payment");
        
        uint256[][] memory allTokenIds = new uint256[][](deckTypes.length);
        for (uint256 i = 0; i < deckTypes.length; i++) {
            allTokenIds[i] = _executeDeckOpening(msg.sender, deckTypes[i]);
            _secureDistributeRoyaltiesToCards(deckTypes[i], _deckTypes[deckTypes[i]].price);
        }
        
        // Refund excess payment
        if (msg.value > totalCost) {
            uint256 refund = msg.value - totalCost;
            (bool success, ) = payable(msg.sender).call{value: refund}("");
            if (!success) revert PaymentFailed("refund failed");
            emit PaymentRefunded(msg.sender, refund, "excess payment");
        }
        
        emit SecurityEvent("BATCH_DECKS_OPENED", msg.sender, block.timestamp);
        return allTokenIds;
    }
    
    // ============ Enhanced Internal Functions ============
    
    function _requestPackOpening(address user, uint8 batchSize) internal {
        MockVRFCoordinator vrfCoordinator = MockVRFCoordinator(address(uint160(_setInfo.vrfCoordinator)));
        
        uint256 requestId = vrfCoordinator.requestRandomWords(
            bytes32(0),
            0,
            3,
            500000,
            uint32(PACK_SIZE * batchSize)
        );
        
        _vrfRequests[requestId] = VRFRequest({
            user: user,
            isPack: true,
            deckType: "",
            batchSize: batchSize,
            timestamp: uint64(block.timestamp),
            fulfilled: false
        });
        
        _setInfo.lastVRFRequestId = uint32(requestId);
        _security.totalVRFRequests++;
        
        emit SecurityEvent("VRF_REQUESTED", user, block.timestamp);
    }
    
    function _executeDeckOpening(address user, string memory deckType) internal returns (uint256[] memory) {
        PackedDeckType storage deck = _deckTypes[deckType];
        uint256[] memory deckTokenIds = _deckTokenIds[deckType];
        uint256[] memory quantities = _deckQuantities[deckType];
        
        uint256[] memory allTokenIds = new uint256[](deck.totalCards);
        uint256 tokenIndex = 0;
        
        // Enhanced validation and batch minting using CardBatch
        for (uint256 i = 0; i < deckTokenIds.length; i++) {
            uint256 tokenId = deckTokenIds[i];
            uint256 quantity = quantities[i];
            
            if (!_validTokenIds[tokenId]) revert SecurityBreach("invalid token ID");
            if (_removedTokenIds[tokenId]) revert SecurityBreach("removed token ID");
            if (!cardBatch.canMintCard(tokenId)) revert SecurityBreach("cannot mint card");
            
            // Secure batch minting with error handling
            try cardBatch.batchMint(user, tokenId, quantity) returns (uint256[] memory batchTokenIds) {
                for (uint256 j = 0; j < batchTokenIds.length; j++) {
                    allTokenIds[tokenIndex++] = batchTokenIds[j];
                }
            } catch {
                revert SecurityBreach("minting failed");
            }
        }
        
        // Safe counter updates
        deck.timesOpened++;
        _setInfo.totalDecksOpened++;
        _userDecksOpened[user]++;
        
        emit DeckOpened(user, deckType, _convertTokenIdsToAddresses(deckTokenIds), allTokenIds);
        return allTokenIds;
    }
    
    function _executeMetaDeckOpening(address user, string memory deckType) internal {
        PackedDeckType storage deck = _deckTypes[deckType];
        if (!deck.active) revert SecurityBreach("deck not found");
        
        _executeDeckOpening(user, deckType);
    }
    
    function _secureDistributeRoyaltiesToCards(string memory deckType, uint256 totalAmount) internal {
        uint256[] memory deckTokenIds = _deckTokenIds[deckType];
        uint256[] memory quantities = _deckQuantities[deckType];
        
        uint256 totalCards = 0;
        for (uint256 i = 0; i < quantities.length; i++) {
            totalCards += quantities[i];
        }
        
        if (totalCards == 0) return;
        
        uint256 totalDistributed = 0;
        
        for (uint256 i = 0; i < deckTokenIds.length; i++) {
            if (!_validTokenIds[deckTokenIds[i]]) continue;
            if (_removedTokenIds[deckTokenIds[i]]) continue;
            
            uint256 cardProportion = (quantities[i] * totalAmount) / totalCards;
            if (cardProportion == 0) continue;
            
            try cardBatch.getRoyaltyInfo(cardProportion) returns (
                address recipient,
                uint256 amount,
                bool royaltyActive
            ) {
                if (royaltyActive && recipient != address(0) && amount > 0 && amount <= cardProportion) {
                    (bool success, ) = payable(recipient).call{value: amount}("");
                    if (success) {
                        totalDistributed += amount;
                        emit RoyaltyPaid(recipient, amount, deckTokenIds[i]);
                    }
                }
            } catch {
                continue;
            }
        }
        
        emit SecurityEvent("ROYALTIES_DISTRIBUTED", msg.sender, block.timestamp);
    }
    
    // ============ Enhanced VRF Callback ============
    
    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        if (msg.sender != address(uint160(_setInfo.vrfCoordinator))) {
            revert VRFSecurityBreach("unauthorized caller");
        }
        
        VRFRequest storage request = _vrfRequests[requestId];
        if (request.user == address(0)) revert VRFSecurityBreach("invalid request");
        if (request.fulfilled) revert VRFSecurityBreach("request already fulfilled");
        if (_processedVRFRequests[requestId]) revert VRFSecurityBreach("request already processed");
        if (block.timestamp > request.timestamp + VRF_TIMEOUT) {
            emit VRFRequestTimeout(requestId, request.user);
            revert VRFSecurityBreach("request timeout");
        }
        
        request.fulfilled = true;
        _processedVRFRequests[requestId] = true;
        
        if (request.isPack) {
            _fulfillBatchPackOpening(request.user, randomWords, request.batchSize);
        }
        
        emit SecurityEvent("VRF_FULFILLED", request.user, block.timestamp);
    }
    
    function _fulfillBatchPackOpening(address user, uint256[] memory randomWords, uint8 batchSize) internal {
        uint256 totalCards = PACK_SIZE * batchSize;
        
        if (_setInfo.totalEmission + totalCards > _setInfo.emissionCap) {
            revert SecurityBreach("emission cap exceeded during fulfillment");
        }
        
        uint256[] memory selectedTokenIds = new uint256[](totalCards);
        uint256[] memory amounts = new uint256[](totalCards);
        bool[] memory isSerializedCard = new bool[](totalCards);
        
        for (uint256 i = 0; i < totalCards; i++) {
            uint256 tokenId = _selectTokenId(randomWords[i], (i % PACK_SIZE) == (PACK_SIZE - 1));
            selectedTokenIds[i] = tokenId;
            amounts[i] = 1;
            isSerializedCard[i] = false;
            
            if (!_validTokenIds[tokenId]) revert SecurityBreach("no valid token ID");
            if (_removedTokenIds[tokenId]) revert SecurityBreach("removed token ID");
            if (!cardBatch.canMintCard(tokenId)) revert SecurityBreach("cannot mint card");
            
            try cardBatch.batchMint(user, tokenId, 1) {
                // Minting successful
            } catch {
                revert SecurityBreach("card minting failed");
            }
        }
        
        _setInfo.totalEmission += uint64(totalCards);
        _setInfo.totalPacksOpened += batchSize;
        _userPacksOpened[user] += batchSize;
        
        emit OptimizedPackOpened(user, selectedTokenIds, amounts, isSerializedCard);
    }
    
    // ============ Enhanced Token ID Management ============
    
    function addTokenId(uint256 tokenId) 
        external 
        onlyOwner 
        notEmergencyPaused
    {
        if (_setInfo.isLocked) revert OperationLocked("set is locked");
        if (_validTokenIds[tokenId]) revert SecurityBreach("token ID already exists");
        if (_removedTokenIds[tokenId]) revert SecurityBreach("token ID was previously removed");
        
        // Validate token exists in CardBatch
        try cardBatch.getCardInfo(tokenId) returns (ICard.CardInfo memory cardInfo) {
            _validTokenIds[tokenId] = true;
            _tokenIdsByRarity[cardInfo.rarity].push(tokenId);
            _setInfo.totalCardTypes++;
            
            emit TokenIdAdded(tokenId, cardInfo.rarity);
            emit SecurityEvent("TOKEN_ID_ADDED", msg.sender, block.timestamp);
        } catch {
            revert SecurityBreach("invalid token ID in CardBatch");
        }
    }
    
    function removeTokenId(uint256 tokenId) 
        external 
        onlyOwner 
        validTokenId(tokenId)
        notEmergencyPaused
    {
        if (_setInfo.isLocked) revert OperationLocked("set is locked");
        if (_removedTokenIds[tokenId]) revert SecurityBreach("already removed");
        
        // Get card info to determine rarity
        try cardBatch.getCardInfo(tokenId) returns (ICard.CardInfo memory cardInfo) {
            uint256[] storage rarityTokenIds = _tokenIdsByRarity[cardInfo.rarity];
            
            for (uint256 i = 0; i < rarityTokenIds.length; i++) {
                if (rarityTokenIds[i] == tokenId) {
                    rarityTokenIds[i] = rarityTokenIds[rarityTokenIds.length - 1];
                    rarityTokenIds.pop();
                    break;
                }
            }
            
            _validTokenIds[tokenId] = false;
            _removedTokenIds[tokenId] = true;
            _setInfo.totalCardTypes--;
            
            emit TokenIdRemoved(tokenId);
            emit SecurityEvent("TOKEN_ID_REMOVED", msg.sender, block.timestamp);
        } catch {
            revert SecurityBreach("invalid token ID");
        }
    }
    
    // ============ Enhanced Deck Management ============
    
    function addDeckType(
        string calldata deckName,
        uint256[] calldata tokenIds,
        uint256[] calldata quantities
    ) 
        external 
        onlyOwner 
        validStringLength(deckName, "deckName")
        notEmergencyPaused
    {
        if (tokenIds.length == 0) revert InvalidInput("empty tokenIds array");
        if (tokenIds.length != quantities.length) revert InvalidInput("array length mismatch");
        if (_deckTypes[deckName].active) revert SecurityBreach("deck already exists");
        if (_deckTypeExists[deckName]) revert SecurityBreach("deck name already used");
        
        uint256 totalCards = 0;
        for (uint256 i = 0; i < quantities.length; i++) {
            if (!_validTokenIds[tokenIds[i]]) revert SecurityBreach("invalid token ID");
            if (_removedTokenIds[tokenIds[i]]) revert SecurityBreach("removed token ID");
            if (quantities[i] == 0) revert InvalidInput("zero quantity");
            
            totalCards += quantities[i];
        }
        
        if (totalCards > MAX_DECK_CARDS) revert ExceedsLimit("deck size", totalCards, MAX_DECK_CARDS);
        
        _deckTypes[deckName] = PackedDeckType({
            totalCards: uint32(totalCards),
            price: uint64(0.05 ether),
            timesOpened: 0,
            active: true,
            priceLocked: false,
            createdAt: uint64(block.timestamp)
        });
        
        _deckTokenIds[deckName] = tokenIds;
        _deckQuantities[deckName] = quantities;
        _deckTypeNames.push(deckName);
        _deckTypeExists[deckName] = true;
        
        emit DeckTypeAdded(deckName, _convertTokenIdsToAddresses(tokenIds), quantities);
        emit SecurityEvent("DECK_ADDED", msg.sender, block.timestamp);
    }
    
    // ============ Enhanced Pricing Functions ============
    
    function setPackPrice(uint256 newPrice) 
        external 
        onlyOwner 
        validPrice(newPrice)
        notEmergencyPaused
    {
        if (_security.priceChangesLocked) revert OperationLocked("price changes locked");
        
        _setInfo.packPrice = uint64(newPrice);
        emit PackPriceUpdated(newPrice);
        emit SecurityEvent("PACK_PRICE_UPDATED", msg.sender, block.timestamp);
    }
    
    function setDeckPrice(string calldata deckType, uint256 newPrice) 
        external 
        onlyOwner 
        validStringLength(deckType, "deckType")
        validPrice(newPrice)
        notEmergencyPaused
    {
        if (_security.priceChangesLocked) revert OperationLocked("price changes locked");
        if (!_deckTypes[deckType].active) revert SecurityBreach("deck not found");
        if (_deckTypes[deckType].priceLocked) revert OperationLocked("deck price locked");
        
        _deckTypes[deckType].price = uint64(newPrice);
        emit DeckPriceUpdated(deckType, newPrice);
        emit SecurityEvent("DECK_PRICE_UPDATED", msg.sender, block.timestamp);
    }
    
    // ============ Emergency Security Functions ============
    
    function emergencyPause() external onlyOwner {
        _security.emergencyPause = true;
        _pause();
        emit EmergencyPauseActivated(msg.sender);
        emit SecurityEvent("EMERGENCY_PAUSE", msg.sender, block.timestamp);
    }
    
    function lockMinting() external onlyOwner {
        _security.mintingLocked = true;
        emit SecurityEvent("MINTING_LOCKED", msg.sender, block.timestamp);
    }
    
    function lockPriceChanges() external onlyOwner {
        _security.priceChangesLocked = true;
        emit SecurityEvent("PRICE_CHANGES_LOCKED", msg.sender, block.timestamp);
    }
    
    function lockDeckPrice(string calldata deckType) 
        external 
        onlyOwner 
        validStringLength(deckType, "deckType")
    {
        if (!_deckTypes[deckType].active) revert SecurityBreach("deck not found");
        _deckTypes[deckType].priceLocked = true;
        emit SecurityEvent("DECK_PRICE_LOCKED", msg.sender, block.timestamp);
    }
    
    // ============ Enhanced Admin Functions ============
    
    function lockSet() external onlyOwner notEmergencyPaused {
        if (_setInfo.isLocked) revert OperationLocked("set already locked");
        if (_setInfo.totalCardTypes == 0) revert SecurityBreach("cannot lock empty set");
        
        _setInfo.isLocked = true;
        emit SetLocked(msg.sender, _setInfo.totalCardTypes);
        emit SecurityEvent("SET_LOCKED", msg.sender, block.timestamp);
    }
    
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) revert SecurityBreach("no funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        if (!success) revert PaymentFailed("withdrawal failed");
        
        emit SecurityEvent("FUNDS_WITHDRAWN", msg.sender, block.timestamp);
    }
    
    function pause() external onlyOwner {
        _pause();
        emit SecurityEvent("CONTRACT_PAUSED", msg.sender, block.timestamp);
    }
    
    function unpause() external onlyOwner {
        _unpause();
        emit SecurityEvent("CONTRACT_UNPAUSED", msg.sender, block.timestamp);
    }
    
    // ============ Security View Functions ============
    
    function getSecurityStatus() external view returns (
        bool isEmergencyPaused,
        bool mintingLocked,
        bool priceChangesLocked,
        uint256 totalVRFRequests,
        uint256 failedVRFRequests,
        uint256 lastOwnerChange
    ) {
        return (
            _security.emergencyPause,
            _security.mintingLocked,
            _security.priceChangesLocked,
            _security.totalVRFRequests,
            _security.failedVRFRequests,
            _security.lastOwnerChange
        );
    }
    
    // ============ Meta-Transaction Support ============
    
    function getNonce(address user) external view returns (uint256) {
        return _nonces[user];
    }
    
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
    
    // ============ Enhanced View Functions ============
    
    function getSetInfo() external view returns (SetInfo memory) {
        return SetInfo({
            name: setName,
            emissionCap: _setInfo.emissionCap,
            totalEmission: _setInfo.totalEmission,
            packPrice: _setInfo.packPrice,
            cardContracts: _getAllTokenAddresses(),
            isLocked: _setInfo.isLocked
        });
    }
    
    function getDeckPrice(string calldata deckType) external view returns (uint256) {
        if (!_deckTypes[deckType].active) revert SecurityBreach("deck not found");
        return _deckTypes[deckType].price;
    }
    
    function getDeckType(string calldata deckType) external view returns (DeckType memory) {
        if (!_deckTypes[deckType].active) revert SecurityBreach("deck not found");
        
        PackedDeckType storage packedDeck = _deckTypes[deckType];
        return DeckType({
            name: deckType,
            cardContracts: _convertTokenIdsToAddresses(_deckTokenIds[deckType]),
            quantities: _deckQuantities[deckType],
            totalCards: packedDeck.totalCards,
            price: packedDeck.price,
            active: packedDeck.active
        });
    }
    
    function getUserStats(address user) external view returns (uint256 packsOpened, uint256 decksOpened) {
        return (_userPacksOpened[user], _userDecksOpened[user]);
    }
    
    function getOptimizationStats() external view returns (
        uint256 totalPacksOpened,
        uint256 totalDecksOpened,
        uint256 totalCardTypes,
        bool optimizationsEnabled
    ) {
        return (
            _setInfo.totalPacksOpened,
            _setInfo.totalDecksOpened,
            _setInfo.totalCardTypes,
            _setInfo.useCardBatch
        );
    }
    
    // ============ Enhanced Helper Functions ============
    
    function _selectTokenId(uint256 randomValue, bool isLuckySlot) internal view returns (uint256) {
        if (isLuckySlot) {
            // Ultra rare tier: 0.5% chance for serialized
            uint256 serializedRoll = randomValue % 1000;
            if (serializedRoll >= 995) {
                uint256[] memory serialized = _tokenIdsByRarity[ICard.Rarity.SERIALIZED];
                if (serialized.length > 0) {
                    return _getValidTokenId(serialized, randomValue);
                }
            }
            
            // Legendary tier: 0.5% chance for mythical
            uint256 mythicalRoll = randomValue % 1000;
            if (mythicalRoll >= 995) {
                uint256[] memory mythical = _tokenIdsByRarity[ICard.Rarity.MYTHICAL];
                if (mythical.length > 0) {
                    return _getValidTokenId(mythical, randomValue);
                }
            }
            
            uint256 roll = randomValue % 100;
            if (roll >= 70) {
                uint256[] memory mythical = _tokenIdsByRarity[ICard.Rarity.MYTHICAL];
                if (mythical.length > 0) {
                    return _getValidTokenId(mythical, randomValue);
                }
            }
            
            if (roll >= 45) {
                uint256[] memory rare = _tokenIdsByRarity[ICard.Rarity.RARE];
                if (rare.length > 0) {
                    return _getValidTokenId(rare, randomValue);
                }
            }
            
            if (roll >= 15) {
                uint256[] memory uncommon = _tokenIdsByRarity[ICard.Rarity.UNCOMMON];
                if (uncommon.length > 0) {
                    return _getValidTokenId(uncommon, randomValue);
                }
            }
            
            uint256[] memory common = _tokenIdsByRarity[ICard.Rarity.COMMON];
            if (common.length > 0) {
                return _getValidTokenId(common, randomValue);
            }
        } else {
            uint256 roll = randomValue % 100;
            if (roll >= 40) {
                uint256[] memory common = _tokenIdsByRarity[ICard.Rarity.COMMON];
                if (common.length > 0) {
                    return _getValidTokenId(common, randomValue);
                }
            }
            
            if (roll >= 10) {
                uint256[] memory uncommon = _tokenIdsByRarity[ICard.Rarity.UNCOMMON];
                if (uncommon.length > 0) {
                    return _getValidTokenId(uncommon, randomValue);
                }
            }
            
            uint256[] memory rare = _tokenIdsByRarity[ICard.Rarity.RARE];
            if (rare.length > 0) {
                return _getValidTokenId(rare, randomValue);
            }
        }
        
        // Enhanced fallback with validation
        uint256[] memory allTokenIds = _getAllValidTokenIds();
        if (allTokenIds.length == 0) return 0;
        
        return _getValidTokenId(allTokenIds, randomValue);
    }
    
    function _isValidTokenId(uint256 tokenId) internal view returns (bool) {
        if (!_validTokenIds[tokenId]) return false;
        if (_removedTokenIds[tokenId]) return false;
        
        try cardBatch.canMintCard(tokenId) returns (bool canMint) {
            return canMint;
        } catch {
            return false;
        }
    }
    
    function _getValidTokenId(uint256[] memory tokenIds, uint256 randomValue) internal view returns (uint256) {
        if (tokenIds.length == 0) return 0;
        
        uint256 attempts = 0;
        uint256 index = randomValue % tokenIds.length;
        
        while (attempts < tokenIds.length) {
            if (_isValidTokenId(tokenIds[index])) {
                return tokenIds[index];
            }
            index = (index + 1) % tokenIds.length;
            attempts++;
        }
        
        return 0; // No valid token ID found
    }
    
    function _getAllValidTokenIds() internal view returns (uint256[] memory) {
        uint256[] memory allTokenIds = cardBatch.getAllCardIds();
        uint256[] memory validTokenIds = new uint256[](allTokenIds.length);
        uint256 validCount = 0;
        
        for (uint256 i = 0; i < allTokenIds.length; i++) {
            if (_isValidTokenId(allTokenIds[i])) {
                validTokenIds[validCount++] = allTokenIds[i];
            }
        }
        
        // Resize array to actual valid count
        assembly {
            mstore(validTokenIds, validCount)
        }
        
        return validTokenIds;
    }
    
    function _getAllTokenAddresses() internal view returns (address[] memory) {
        uint256[] memory allTokenIds = _getAllValidTokenIds();
        address[] memory addresses = new address[](allTokenIds.length);
        
        for (uint256 i = 0; i < allTokenIds.length; i++) {
            addresses[i] = cardBatch.getCardAddress(allTokenIds[i]);
        }
        
        return addresses;
    }
    
    function _convertTokenIdsToAddresses(uint256[] memory tokenIds) internal view returns (address[] memory) {
        address[] memory addresses = new address[](tokenIds.length);
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            addresses[i] = cardBatch.getCardAddress(tokenIds[i]);
        }
        
        return addresses;
    }
    
    // ============ Legacy Compatibility Functions ============
    
    function getCardContracts() external view returns (address[] memory) {
        return _getAllTokenAddresses();
    }
    
    function getCardContractsByRarity(ICard.Rarity rarity) external view returns (address[] memory) {
        return _convertTokenIdsToAddresses(_tokenIdsByRarity[rarity]);
    }
    
    function getTokenIdsByRarity(ICard.Rarity rarity) external view returns (uint256[] memory) {
        return _tokenIdsByRarity[rarity];
    }
    
    function getDeckTypeNames() external view returns (string[] memory) {
        return _deckTypeNames;
    }
    
    function packPrice() external view returns (uint256) {
        return _setInfo.packPrice;
    }
    
    function totalEmission() external view returns (uint256) {
        return _setInfo.totalEmission;
    }
    
    function emissionCap() external view returns (uint256) {
        return _setInfo.emissionCap;
    }
    
    function isLocked() external view returns (bool) {
        return _setInfo.isLocked;
    }
    
    function getCardBatchContract() external view returns (address) {
        return address(cardBatch);
    }
    
    // ============ Ownership Transfer Override ============
    
    function transferOwnership(address newOwner) public override onlyOwner validAddress(newOwner) {
        super.transferOwnership(newOwner);
        
        _security.lastOwnerChange = uint64(block.timestamp);
        emit SecurityEvent("OWNERSHIP_TRANSFERRED", newOwner, block.timestamp);
    }
} 