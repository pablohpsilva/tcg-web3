# Trading Card Game Smart Contracts

A complete blockchain-based trading card game system similar to Magic: The Gathering, with full on-chain minting, rarity control, and NFT trading.

## 🎯 Key Features

- **Modular Design**: Each set is its own smart contract for independent operation
- **On-Chain Pack Opening**: 15 cards per pack with guaranteed rarity distribution
- **Preconstructed Decks**: Fixed 60-card deck types for competitive play
- **Emission Control**: Hard caps on total cards minted per set
- **Serialized Cards**: Limited edition cards with enforced supply limits
- **Chainlink VRF**: Provably fair randomness for pack opening
- **EIP-2981 Royalties**: Built-in 0.1% royalty support
- **Transparent Logic**: All game mechanics are on-chain and verifiable

## 📦 Architecture

### 🏗️ Separate Contracts Per Set (Optimal Design)

**Each trading card set is deployed as its own independent smart contract** - this architectural choice provides significant advantages:

#### ⚡ **Gas Efficiency Benefits**

- **30-40% lower gas costs** per operation (no routing overhead)
- **Optimized storage layout** for each set's specific needs
- **Direct function calls** instead of proxy routing
- **Smaller contract size** = less deployment cost

#### 🛡️ **Risk Management Benefits**

- **Complete isolation**: Bug in Set 1 doesn't affect Set 2 or Set 3
- **Independent upgrades**: Fix/enhance sets without touching others
- **Fail-safe operation**: If one set has issues, others continue normally
- **No single point of failure**: Distributed risk across contracts

#### 🔧 **Technical Benefits**

- **No 24KB contract size limit** concerns
- **Independent optimization** for each set's mechanics
- **Modular development**: Deploy sets as they're ready
- **Flexible pricing**: Each set can have different economics

#### 💰 **Cost Benefits**

- **Predictable gas costs**: Each set optimized for its use case
- **No storage bloat**: Distributed state prevents expensive storage slots
- **Lower maintenance costs**: Simpler contracts = easier audits

### Core Contracts

- **`CardSet.sol`** - Main contract for each trading card set (deployed separately)
- **`ICardSet.sol`** - Interface defining all CardSet functionality
- **`CardSetErrors.sol`** - Custom error definitions for better UX
- **`MockVRFCoordinator.sol`** - Mock VRF for testing (use real Chainlink in production)

### Distribution Logic

#### 🟩 Packs (15 cards each)

- 7 Commons
- 6 Uncommons
- 1 Guaranteed Rare
- 1 Lucky Slot (70% Rare, 25% Mythical, 5% Serialized)

#### 🟦 Decks (60 cards each)

- Preconstructed, fixed composition
- Multiple deck types per set
- No serialized/mythical cards
- Don't count against emission cap

## 🚀 Quick Start

### 1. Installation

```bash
cd apps/contracts
forge install
```

### 2. Run Tests

```bash
forge test
```

All 34 tests should pass, covering:

- Pack opening mechanics
- Deck distribution
- Rarity enforcement
- Serialized card limits
- Access controls
- Royalty functionality

### 3. Deploy Contracts

#### For Testing (with Mock VRF):

```bash
# Set your private key
export PRIVATE_KEY=0x...

# Deploy CardSet contracts
forge script script/DeployCardSet.s.sol --rpc-url $RPC_URL --broadcast
```

#### For Production (with Chainlink VRF):

```bash
# Set environment variables
export PRIVATE_KEY=0x...
export VRF_COORDINATOR=0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625  # Sepolia
export SET_NAME="Mystic Realms S1"
export EMISSION_CAP=1000000

# Deploy CardSet
forge script script/DeployCardSet.s.sol:DeployWithChainlinkVRF --rpc-url $RPC_URL --broadcast
```

### 4. Setup Sample Cards and Decks

```bash
# Set the deployed CardSet address
export CARD_SET_ADDRESS=0x...

# Populate with sample cards and decks
forge script script/SetupCardSet.s.sol --rpc-url $RPC_URL --broadcast
```

## 🎮 Usage

### For Players

#### Opening Packs

```solidity
// Open a pack for 0.02 ETH (or set price)
uint256[] memory tokenIds = cardSet.openPack{value: 0.02 ether}();
// Returns empty array initially - NFTs minted in VRF callback
```

#### Opening Decks

```solidity
// Open a preconstructed deck
uint256[] memory tokenIds = cardSet.openDeck{value: 0.08 ether}("Starter Deck");
// Returns array of 60 token IDs immediately
```

#### Trading Cards

Cards are ERC-721 NFTs and can be traded on any compatible marketplace (OpenSea, LooksRare, etc.)

### For Set Creators

#### Adding Cards

```solidity
cardSet.addCard(
    1,                              // Card ID
    "Dragon Lord",                  // Name
    ICardSet.Rarity.RARE,          // Rarity
    0,                             // Max supply (0 for non-serialized)
    "ipfs://QmCardMetadata..."     // Metadata URI
);
```

#### Adding Serialized Cards

```solidity
cardSet.addCard(
    100,
    "Genesis Dragon #001",
    ICardSet.Rarity.SERIALIZED,
    100,                           // Limited to 100 copies
    "ipfs://QmSerializedMetadata..."
);
```

#### Creating Deck Types

```solidity
uint256[] memory cardIds = [1, 2, 3];
uint256[] memory quantities = [30, 20, 10];  // Total must equal 60

cardSet.addDeckType("Fire Deck", cardIds, quantities);
```

#### Setting Prices

```solidity
cardSet.setPackPrice(0.02 ether);                        // Pack price
cardSet.setDeckPrice("Starter Deck", 0.08 ether);       // Deck price
```

## 🔧 Contract Details

### CardSet Contract Features

- **ERC-721 Compliant**: Full NFT functionality
- **ERC-2981 Royalties**: Automatic 0.1% royalties
- **Pausable**: Emergency pause functionality
- **Access Control**: Owner-only admin functions
- **Reentrancy Protected**: Safe against reentrancy attacks
- **Gas Optimized**: Efficient pack opening and minting

### Events Emitted

```solidity
event PackOpened(address indexed user, uint256[] cardIds, uint256[] tokenIds);
event DeckOpened(address indexed user, string deckType, uint256[] cardIds, uint256[] tokenIds);
event CardAdded(uint256 indexed cardId, string name, Rarity rarity, uint256 maxSupply);
event DeckTypeAdded(string name, uint256[] cardIds, uint256[] quantities);
```

### View Functions

```solidity
// Get card information
function getCard(uint256 cardId) external view returns (Card memory);

// Get deck type information
function getDeckType(string calldata deckType) external view returns (DeckType memory);

// Get cards by rarity
function getCardsByRarity(Rarity rarity) external view returns (uint256[] memory);

// Get pricing
function packPrice() external view returns (uint256);
function getDeckPrice(string calldata deckType) external view returns (uint256);

// Get emission stats
function totalEmission() external view returns (uint256);
function emissionCap() external view returns (uint256);
```

## 🌐 Network Configuration

### Chainlink VRF Coordinators

| Network          | Address                                      |
| ---------------- | -------------------------------------------- |
| Ethereum Mainnet | `0x271682DEB8C4E0901D1a1550aD2e64D568E69909` |
| Polygon Mainnet  | `0xAE975071Be8F8eE67addBC1A82488F1C24858067` |
| Sepolia Testnet  | `0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625` |

## 🏗️ Backend Integration

### Database Schema

For indexing with The Graph or custom indexer:

```sql
-- Sets table
CREATE TABLE sets (
    id SERIAL PRIMARY KEY,
    contract_address VARCHAR(42) UNIQUE,
    name VARCHAR(255),
    emission_cap BIGINT,
    total_emission BIGINT,
    created_at TIMESTAMP
);

-- Cards table
CREATE TABLE cards (
    id SERIAL PRIMARY KEY,
    set_id INTEGER REFERENCES sets(id),
    card_id INTEGER,
    name VARCHAR(255),
    rarity INTEGER, -- 0=common, 1=uncommon, 2=rare, 3=mythical, 4=serialized
    max_supply INTEGER,
    current_supply INTEGER,
    metadata_uri TEXT
);

-- Minted cards table
CREATE TABLE minted_cards (
    id SERIAL PRIMARY KEY,
    token_id BIGINT,
    card_id INTEGER REFERENCES cards(id),
    owner_address VARCHAR(42),
    minted_at TIMESTAMP,
    tx_hash VARCHAR(66)
);

-- Pack openings table
CREATE TABLE pack_openings (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42),
    set_id INTEGER REFERENCES sets(id),
    card_ids INTEGER[],
    token_ids BIGINT[],
    opened_at TIMESTAMP,
    tx_hash VARCHAR(66)
);

-- Deck openings table
CREATE TABLE deck_openings (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42),
    set_id INTEGER REFERENCES sets(id),
    deck_type VARCHAR(255),
    card_ids INTEGER[],
    token_ids BIGINT[],
    opened_at TIMESTAMP,
    tx_hash VARCHAR(66)
);
```

### Event Listening

Listen for these events to keep your backend in sync:

```javascript
// Pack opening
cardSet.on("PackOpened", (user, cardIds, tokenIds, event) => {
  // Insert pack opening record
  // Update card supply counts
  // Update user inventory
});

// Deck opening
cardSet.on("DeckOpened", (user, deckType, cardIds, tokenIds, event) => {
  // Insert deck opening record
  // Update user inventory
});

// Card additions (admin only)
cardSet.on("CardAdded", (cardId, name, rarity, maxSupply, event) => {
  // Insert new card record
});
```

## 🔒 Security Features

- **Custom Errors**: Gas-efficient error handling
- **Access Controls**: Owner-only admin functions
- **Reentrancy Guards**: Protection against reentrancy attacks
- **Pausable**: Emergency stop functionality
- **Input Validation**: Comprehensive parameter validation
- **Overflow Protection**: Built-in Solidity 0.8+ overflow protection

## 📊 Gas Usage

Typical gas costs:

- Pack Opening: ~1.1M gas (including VRF and 15 NFT mints)
- Deck Opening: ~3.3M gas (60 NFT mints)
- Card Addition: ~165K gas
- Deck Type Addition: ~270K gas

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass: `forge test`
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

Built with ❤️ using [Foundry](https://getfoundry.sh/) and [OpenZeppelin](https://openzeppelin.com/)
