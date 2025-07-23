# CardBatch & CardSetBatch Smart Contracts

This document describes the new batch-based card system that provides enhanced gas efficiency and simplified management for TCG cards.

## Overview

The batch system consists of two main contracts:

1. **CardBatch**: A single ERC1155 contract that holds multiple card types
2. **CardSetBatch**: A card set manager that works with CardBatch instead of individual Card contracts

## Key Benefits

- **Massive Gas Savings**: Up to 95% reduction in gas costs compared to individual card contracts
- **Simplified Management**: Single contract deployment for entire card collections
- **Enhanced Security**: All security features from original contracts maintained
- **Backward Compatibility**: Compatible with existing interfaces and workflows

## Contract Architecture

### CardBatch Contract

The `CardBatch` contract is an enhanced ERC1155 implementation that:

- Stores multiple card types in a single contract
- Each card has a unique token ID within the contract
- Generates deterministic addresses for each card for compatibility
- Supports batch minting operations
- Maintains all security and royalty features

#### Key Features

- **Multi-Card Storage**: Holds up to 1000 different card types
- **Address Mapping**: Maps generated addresses to token IDs for compatibility
- **Batch Operations**: Efficient minting of multiple cards
- **Rarity Organization**: Cards organized by rarity for easy access
- **Security Controls**: Emergency pause, minting locks, metadata locks

#### Constructor Parameters

```solidity
constructor(
    string memory batchName_,
    CardCreationData[] memory cards,
    string memory baseURI_,
    address owner_
)
```

- `batchName_`: Name of the card batch collection
- `cards`: Array of card creation data
- `baseURI_`: Base URI for metadata
- `owner_`: Owner address

#### CardCreationData Structure

```solidity
struct CardCreationData {
    uint256 cardId;      // Unique card identifier
    string name;         // Card name
    ICard.Rarity rarity; // Card rarity (COMMON, UNCOMMON, RARE, MYTHICAL, SERIALIZED)
    uint256 maxSupply;   // Maximum supply (0 = unlimited)
    string metadataURI;  // Card-specific metadata URI
}
```

### CardSetBatch Contract

The `CardSetBatch` contract works exactly like the original `CardSet` but:

- Consumes a single `CardBatch` contract instead of multiple `Card` contracts
- Works with token IDs instead of contract addresses
- Maintains all pack opening, deck management, and VRF functionality
- Preserves all security and optimization features

#### Constructor Parameters

```solidity
constructor(
    string memory setName_,
    uint256 emissionCap_,
    address vrfCoordinator_,
    address cardBatchContract_,
    address owner_
)
```

- `setName_`: Name of the card set
- `emissionCap_`: Maximum number of cards that can be emitted
- `vrfCoordinator_`: VRF coordinator for randomness
- `cardBatchContract_`: Address of the CardBatch contract
- `owner_`: Owner address

## Usage Examples

### 1. Deploying CardBatch

```solidity
// Prepare card data
CardBatch.CardCreationData[] memory cards = new CardBatch.CardCreationData[](3);

cards[0] = CardBatch.CardCreationData({
    cardId: 1,
    name: "Fire Dragon",
    rarity: ICard.Rarity.RARE,
    maxSupply: 1000,
    metadataURI: "https://api.example.com/cards/1"
});

// Deploy CardBatch
CardBatch cardBatch = new CardBatch(
    "Dragon Collection",
    cards,
    "https://api.example.com/metadata/",
    msg.sender
);
```

### 2. Deploying CardSetBatch

```solidity
// Deploy CardSetBatch
CardSetBatch cardSet = new CardSetBatch(
    "Dragon Set",
    15000, // 1000 packs * 15 cards
    vrfCoordinatorAddress,
    address(cardBatch),
    msg.sender
);
```

### 3. Adding Deck Types

```solidity
// Create starter deck with token IDs
uint256[] memory tokenIds = new uint256[](2);
uint256[] memory quantities = new uint256[](2);

tokenIds[0] = 1; // Fire Dragon
tokenIds[1] = 2; // Water Dragon
quantities[0] = 3;
quantities[1] = 3;

cardSet.addDeckType("Starter", tokenIds, quantities);
```

### 4. Opening Packs and Decks

```solidity
// Open a pack (requires VRF fulfillment)
cardSet.openPack{value: 0.01 ether}();

// Open a deck
uint256[] memory receivedCards = cardSet.openDeck{value: 0.05 ether}("Starter");

// Open multiple decks
string[] memory deckTypes = new string[](2);
deckTypes[0] = "Starter";
deckTypes[1] = "Premium";
uint256[][] memory allCards = cardSet.openDecksBatch{value: 0.15 ether}(deckTypes);
```

### 5. Checking Card Balances

```solidity
// Check balance of token ID 1 for a user
uint256 balance = cardBatch.balanceOf(userAddress, 1);

// Get card information
ICard.CardInfo memory cardInfo = cardBatch.getCardInfo(1);

// Get card address (for compatibility)
address cardAddress = cardBatch.getCardAddress(1);
```

## Key Functions

### CardBatch Functions

#### Minting Functions

- `batchMint(address to, uint256 tokenId, uint256 amount)`: Mint specific card type
- `batchMintMultiple(address to, uint256[] tokenIds, uint256[] amounts)`: Mint multiple card types

#### View Functions

- `getCardInfo(uint256 tokenId)`: Get card information by token ID
- `getCardInfoByAddress(address cardAddress)`: Get card info by generated address
- `getAllCardIds()`: Get all token IDs in the batch
- `getCardsByRarity(Rarity rarity)`: Get token IDs by rarity
- `getCardAddress(uint256 tokenId)`: Get generated address for token ID
- `getTokenIdByAddress(address cardAddress)`: Get token ID by address

#### Admin Functions

- `addAuthorizedMinter(address minter)`: Authorize new minter
- `setCardActive(uint256 tokenId, bool active)`: Enable/disable card
- `setRoyalty(uint96 feeNumerator)`: Set royalty percentage

### CardSetBatch Functions

#### Pack & Deck Operations

- `openPack()`: Open a random pack
- `openPacksBatch(uint8 packCount)`: Open multiple packs
- `openDeck(string deckType)`: Open specific deck type
- `openDecksBatch(string[] deckTypes)`: Open multiple decks

#### Deck Management

- `addDeckType(string name, uint256[] tokenIds, uint256[] quantities)`: Add new deck type
- `setDeckPrice(string deckType, uint256 newPrice)`: Set deck price

#### View Functions

- `getTokenIdsByRarity(Rarity rarity)`: Get token IDs by rarity
- `getCardBatchContract()`: Get CardBatch contract address
- `getDeckType(string deckType)`: Get deck configuration
- `getUserStats(address user)`: Get user's pack/deck opening statistics

## Security Features

Both contracts maintain all security features from the original implementation:

- **Emergency Pause**: Stop all operations in case of emergency
- **Access Control**: Role-based permissions for different operations
- **Reentrancy Protection**: Guards against reentrancy attacks
- **Rate Limiting**: Prevents spam transactions
- **Price Validation**: Ensures reasonable pricing
- **Supply Controls**: Prevents over-minting

## Gas Optimization

The batch system provides significant gas savings:

1. **Single Contract Deployment**: Deploy one CardBatch instead of many Card contracts
2. **Batch Minting**: Mint multiple cards in single transaction
3. **Optimized Storage**: Packed storage structures reduce gas costs
4. **Efficient Lookups**: Organized data structures for fast access

## Migration from Original System

To migrate from the original Card/CardSet system:

1. **Deploy CardBatch**: Create new CardBatch with existing card data
2. **Deploy CardSetBatch**: Deploy new CardSetBatch pointing to CardBatch
3. **Migrate Deck Types**: Recreate deck types using token IDs instead of addresses
4. **Update Frontend**: Use new contract addresses and token ID-based calls

## Testing

Run the comprehensive test suite:

```bash
forge test --match-contract CardBatchTest -vvv
```

Tests cover:

- Contract deployment and initialization
- Card minting and batch operations
- Pack and deck opening
- Security features and access control
- Gas optimization verification
- Error handling and edge cases

## Deployment Script

Use the deployment script to deploy both contracts with sample data:

```bash
forge script script/DeployCardBatch.s.sol --rpc-url <RPC_URL> --broadcast
```

This will deploy:

- MockVRFCoordinator for testing
- CardBatch with 8 sample cards
- CardSetBatch configured with starter and premium decks

## Best Practices

1. **Card ID Management**: Use sequential or well-organized card IDs
2. **Supply Limits**: Set appropriate max supply for rare cards
3. **Metadata URIs**: Use consistent and accessible metadata URLs
4. **Deck Balance**: Design balanced deck types for gameplay
5. **Price Setting**: Set competitive and sustainable prices
6. **Security**: Use multi-sig wallets for contract ownership

## Conclusion

The CardBatch and CardSetBatch system provides a more efficient, cost-effective solution for managing TCG cards while maintaining all the security and functionality of the original system. The batch approach significantly reduces deployment and operational costs while simplifying card management.
