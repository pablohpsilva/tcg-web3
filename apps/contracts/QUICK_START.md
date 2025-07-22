# Quick Start: Deploy 50 Cards to Polygon Amoy

## TL;DR Commands

### 1. Setup Environment

```bash
cd apps/contracts
forge install
```

Create `.env` file:

```bash
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology/
PRIVATE_KEY=your_private_key_without_0x_prefix
POLYGONSCAN_API_KEY=your_api_key_optional
```

### 2. Get Test MATIC

Visit: https://faucet.polygon.technology/ (select Polygon Amoy)

### 3. Deploy 50 Cards

```bash
forge script script/Deploy50Cards.s.sol:Deploy50Cards \
  --rpc-url $POLYGON_AMOY_RPC_URL \
  --broadcast \
  --verify \
  -vvvv
```

### 4. Interact with Cards

```bash
# Check card info
cast call <CARD_ADDRESS> "name()" --rpc-url $POLYGON_AMOY_RPC_URL

# Authorize minter
cast send <CARD_ADDRESS> "addAuthorizedMinter(address)" <MINTER_ADDRESS> \
  --rpc-url $POLYGON_AMOY_RPC_URL --private-key $PRIVATE_KEY

# Mint a card
cast send <CARD_ADDRESS> "mint(address)" <PLAYER_ADDRESS> \
  --rpc-url $POLYGON_AMOY_RPC_URL --private-key $PRIVATE_KEY
```

## Cards Being Deployed

✅ **50 cards from Limited Edition Alpha MTG set**

- Card IDs: 1-50
- Names: Animate Wall, Armageddon, Balance, etc.
- Rarities: Common (0), Uncommon (1), Rare (2)
- All with unlimited supply (maxSupply = 0)
- Base URI: https://api.tcg-magic.com/cards/LEA

## Estimated Costs

- ~125M gas total (~3.75 test MATIC at 30 gwei)
- Each card ~2.5M gas to deploy

## What You Get

- 50 individual ERC1155 Card contracts
- Gas-optimized (98.5% savings vs ERC721)
- Royalty system (2.5% default)
- Minting authorization system
- Emergency controls
- Batch minting capabilities

See `DEPLOYMENT_GUIDE.md` for full details!
