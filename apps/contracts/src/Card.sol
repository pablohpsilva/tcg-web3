// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/ICard.sol";
import "./errors/CardSetErrors.sol";

/**
 * @title Card
 * @dev Individual trading card contract with supply limits and authorization
 * @notice Each card type gets its own contract for maximum modularity and gas optimization
 */
contract Card is 
    ERC721,
    ERC721URIStorage,
    ERC721Royalty,
    Ownable,
    ReentrancyGuard,
    Pausable,
    ICard
{
    using CardSetErrors for *;

    // Card metadata
    uint256 public immutable cardId;
    string private _cardName;
    Rarity public immutable rarity;
    uint256 public immutable maxSupply;
    uint256 public currentSupply;
    string private _metadataURI;
    bool public isActive;

    // Token management
    uint256 private _tokenIdCounter = 1;

    // Authorization management
    mapping(address => bool) private _authorizedMinters;

    // Constants
    uint96 private constant DEFAULT_ROYALTY_PERCENTAGE = 10; // 0.1% (10/10000)

    /**
     * @dev Constructor
     * @param _cardId Unique identifier for this card type
     * @param _name Name of the card
     * @param _rarity Rarity level of the card
     * @param _maxSupply Maximum supply (0 for unlimited, >0 for serialized)
     * @param _metadataURI IPFS URI for card metadata
     * @param _owner Owner of the card contract
     */
    constructor(
        uint256 _cardId,
        string memory _name,
        Rarity _rarity,
        uint256 _maxSupply,
        string memory metadataURI_,
        address _owner
    ) ERC721(_name, _generateSymbol(_name, _cardId)) Ownable(_owner) {
        if (bytes(_name).length == 0) revert CardSetErrors.InvalidCardData();
        if (bytes(metadataURI_).length == 0) revert CardSetErrors.InvalidCardData();
        if (_owner == address(0)) revert CardSetErrors.ZeroAddress();
        
        // Validate serialized card constraints
        if (_rarity == Rarity.SERIALIZED && _maxSupply == 0) {
            revert CardSetErrors.InvalidMaxSupply();
        }
        if (_rarity != Rarity.SERIALIZED && _maxSupply != 0) {
            revert CardSetErrors.InvalidMaxSupply();
        }

        cardId = _cardId;
        _cardName = _name;
        rarity = _rarity;
        maxSupply = _maxSupply;
        _metadataURI = metadataURI_;
        isActive = true;
        
        // Set default royalty to 0.1%
        _setDefaultRoyalty(_owner, DEFAULT_ROYALTY_PERCENTAGE);
    }

    // ============ Minting Functions ============

    /**
     * @dev Mint a single card to the specified address
     * @param to Address to mint the card to
     * @return tokenId The minted token ID
     */
    function mint(address to) external override nonReentrant whenNotPaused returns (uint256 tokenId) {
        if (!_authorizedMinters[msg.sender]) revert CardSetErrors.NotAuthorized();
        if (!isActive) revert CardSetErrors.InvalidCardData();
        if (to == address(0)) revert CardSetErrors.ZeroAddress();
        
        // Check supply limits for serialized cards
        if (maxSupply > 0 && currentSupply >= maxSupply) {
            revert CardSetErrors.SerializedCardCapExceeded(cardId, 1, 0);
        }

        tokenId = _tokenIdCounter++;
        currentSupply++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _metadataURI);
        
        emit CardMinted(to, tokenId, msg.sender);
        
        // Check if max supply reached
        if (maxSupply > 0 && currentSupply >= maxSupply) {
            emit MaxSupplyReached();
        }
        
        return tokenId;
    }

    /**
     * @dev Mint multiple cards to the specified address
     * @param to Address to mint the cards to
     * @param quantity Number of cards to mint
     * @return tokenIds Array of minted token IDs
     */
    function mintBatch(address to, uint256 quantity) 
        external 
        override 
        nonReentrant 
        whenNotPaused 
        returns (uint256[] memory tokenIds) 
    {
        if (!_authorizedMinters[msg.sender]) revert CardSetErrors.NotAuthorized();
        if (!isActive) revert CardSetErrors.InvalidCardData();
        if (to == address(0)) revert CardSetErrors.ZeroAddress();
        if (quantity == 0) revert CardSetErrors.InvalidParameter();
        
        // Check supply limits for serialized cards
        if (maxSupply > 0 && currentSupply + quantity > maxSupply) {
            revert CardSetErrors.SerializedCardCapExceeded(
                cardId, 
                quantity, 
                maxSupply - currentSupply
            );
        }

        tokenIds = new uint256[](quantity);
        
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _tokenIdCounter++;
            currentSupply++;
            
            _safeMint(to, tokenId);
            _setTokenURI(tokenId, _metadataURI);
            tokenIds[i] = tokenId;
            
            emit CardMinted(to, tokenId, msg.sender);
        }
        
        // Check if max supply reached
        if (maxSupply > 0 && currentSupply >= maxSupply) {
            emit MaxSupplyReached();
        }
        
        return tokenIds;
    }

    // ============ View Functions ============

    /**
     * @dev Get complete card information
     */
    function cardInfo() external view override returns (CardInfo memory) {
        return CardInfo({
            cardId: cardId,
            name: _cardName,
            rarity: rarity,
            maxSupply: maxSupply,
            currentSupply: currentSupply,
            metadataURI: _metadataURI,
            active: isActive
        });
    }

    /**
     * @dev Get card name (overrides ERC721 name for clarity)
     */
    function name() public view override(ERC721, ICard) returns (string memory) {
        return _cardName;
    }

    /**
     * @dev Get metadata URI for this card type
     */
    function metadataURI() external view override returns (string memory) {
        return _metadataURI;
    }

    /**
     * @dev Check if card can be minted
     */
    function canMint() external view override returns (bool) {
        if (!isActive) return false;
        if (maxSupply > 0 && currentSupply >= maxSupply) return false;
        return true;
    }

    /**
     * @dev Check if address is authorized to mint
     */
    function isAuthorizedMinter(address minter) external view override returns (bool) {
        return _authorizedMinters[minter];
    }

    // ============ Admin Functions ============

    /**
     * @dev Set card active status
     */
    function setActive(bool _active) external override onlyOwner {
        if (isActive == _active) return; // No change needed
        
        isActive = _active;
        
        if (_active) {
            emit CardActivated();
        } else {
            emit CardDeactivated();
        }
    }

    /**
     * @dev Update metadata URI
     */
    function setMetadataURI(string calldata _newMetadataURI) external override onlyOwner {
        if (bytes(_newMetadataURI).length == 0) revert CardSetErrors.InvalidCardData();
        _metadataURI = _newMetadataURI;
    }

    /**
     * @dev Set royalty information
     */
    function setRoyalty(address receiver, uint96 feeNumerator) external override onlyOwner {
        if (receiver == address(0)) revert CardSetErrors.ZeroAddress();
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    /**
     * @dev Add authorized minter
     */
    function addAuthorizedMinter(address minter) external override onlyOwner {
        if (minter == address(0)) revert CardSetErrors.ZeroAddress();
        _authorizedMinters[minter] = true;
    }

    /**
     * @dev Remove authorized minter
     */
    function removeAuthorizedMinter(address minter) external override onlyOwner {
        _authorizedMinters[minter] = false;
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

    // ============ Internal Functions ============

    /**
     * @dev Generate symbol for the card
     */
    function _generateSymbol(string memory cardName, uint256 _cardId) internal pure returns (string memory) {
        // Create symbol like "CARD001" for card ID 1
        return string(abi.encodePacked("CARD", _padNumber(_cardId, 3)));
    }

    /**
     * @dev Pad number with leading zeros
     */
    function _padNumber(uint256 number, uint256 length) internal pure returns (string memory) {
        string memory numStr = _toString(number);
        bytes memory numBytes = bytes(numStr);
        
        if (numBytes.length >= length) {
            return numStr;
        }
        
        bytes memory result = new bytes(length);
        uint256 padLength = length - numBytes.length;
        
        // Add leading zeros
        for (uint256 i = 0; i < padLength; i++) {
            result[i] = "0";
        }
        
        // Add number
        for (uint256 i = 0; i < numBytes.length; i++) {
            result[padLength + i] = numBytes[i];
        }
        
        return string(result);
    }

    /**
     * @dev Convert uint256 to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
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

    // ============ Required Overrides ============

    function tokenURI(uint256 tokenId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (string memory) 
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721, ERC721URIStorage, ERC721Royalty, IERC165) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth) 
        internal 
        override(ERC721) 
        returns (address) 
    {
        return super._update(to, tokenId, auth);
    }
} 