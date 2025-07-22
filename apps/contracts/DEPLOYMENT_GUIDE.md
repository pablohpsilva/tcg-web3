# Deploying 50 Cards to Polygon Amoy Network

This guide walks you through deploying the first 50 cards from the Limited Edition Alpha set to the Polygon Amoy testnet using Foundry.

## Prerequisites

1. **Install Foundry** (if not already installed):

   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Navigate to the contracts directory**:

   ```bash
   cd apps/contracts
   ```

3. **Install dependencies**:
   ```bash
   forge install
   ```

## Environment Setup

### 1. Create Environment File

Create a `.env` file in the `apps/contracts` directory:

```bash
# Polygon Amoy Network Configuration
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology/
CHAIN_ID=80002

# Private key for deployment (without 0x prefix)
# NEVER commit your real private key to version control!
PRIVATE_KEY=your_private_key_here

# Contract verification
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# Addresses for minting setup
MINTER_ADDRESS=0x1234567890123456789012345678901234567890
TEST_PLAYER_ADDRESS=0x1234567890123456789012345678901234567890
```

### 2. Get Test MATIC

Get test MATIC for Polygon Amoy from the faucet:

- Visit: https://faucet.polygon.technology/
- Select "Polygon Amoy" network
- Enter your wallet address
- Request test MATIC

### 3. Get PolygonScan API Key (Optional)

For contract verification:

1. Visit https://polygonscan.com/
2. Create an account
3. Go to API Keys section
4. Generate a new API key
5. Add it to your `.env` file

## Deployment Steps

### Step 1: Compile Contracts

```bash
forge build
```

### Step 2: Deploy the 50 Cards

Run the deployment script:

```bash
forge script script/Deploy50Cards.s.sol:Deploy50Cards \
  --rpc-url $POLYGON_AMOY_RPC_URL \
  --broadcast \
  --verify \
  -vvvv
```

**Alternative without verification:**

```bash
forge script script/Deploy50Cards.s.sol:Deploy50Cards \
  --rpc-url $POLYGON_AMOY_RPC_URL \
  --broadcast \
  -vvvv
```

### Step 3: Save Deployed Addresses

The script will output the deployed card addresses. Save these for later use:

```
=== DEPLOYMENT COMPLETE ===
Total cards deployed: 50
First card address: 0x...
Last card address: 0x...
```

### Step 4: Verify Contracts (If not done during deployment)

If verification failed during deployment, verify manually:

```bash
forge verify-contract <CONTRACT_ADDRESS> \
  src/Card.sol:Card \
  --chain-id 80002 \
  --etherscan-api-key $POLYGONSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(uint256,string,uint8,uint256,string,address)" 1 "Animate Wall" 2 0 "https://api.tcg-magic.com/cards/LEA" <OWNER_ADDRESS>)
```

## Card Details

The deployment includes these 50 cards from Limited Edition Alpha:

| ID  | Name          | Rarity   | Type        |
| --- | ------------- | -------- | ----------- |
| 1   | Animate Wall  | RARE     | Enchantment |
| 2   | Armageddon    | RARE     | Sorcery     |
| 3   | Balance       | RARE     | Sorcery     |
| 4   | Benalish Hero | COMMON   | Creature    |
| 5   | Black Ward    | UNCOMMON | Enchantment |
| ... | ...           | ...      | ...         |
| 50  | Braingeyser   | RARE     | Sorcery     |

**Rarity Mapping:**

- 0 = COMMON
- 1 = UNCOMMON
- 2 = RARE

## Post-Deployment Setup

### 1. Authorize Minters

Update your `.env` file with deployed card addresses, then run:

```bash
forge script script/SetupCardMinting.s.sol:SetupCardMinting \
  --rpc-url $POLYGON_AMOY_RPC_URL \
  --broadcast \
  -vvvv
```

### 2. Mint Test Cards

Mint a single card:

```bash
cast send <CARD_ADDRESS> \
  "mint(address)" <PLAYER_ADDRESS> \
  --rpc-url $POLYGON_AMOY_RPC_URL \
  --private-key $PRIVATE_KEY
```

Mint multiple cards:

```bash
cast send <CARD_ADDRESS> \
  "batchMint(address,uint256)" <PLAYER_ADDRESS> 5 \
  --rpc-url $POLYGON_AMOY_RPC_URL \
  --private-key $PRIVATE_KEY
```

### 3. Verify Card Information

Check card details:

```bash
cast call <CARD_ADDRESS> "cardInfo()" --rpc-url $POLYGON_AMOY_RPC_URL
cast call <CARD_ADDRESS> "name()" --rpc-url $POLYGON_AMOY_RPC_URL
cast call <CARD_ADDRESS> "currentSupply()" --rpc-url $POLYGON_AMOY_RPC_URL
```

## Network Information

**Polygon Amoy Testnet:**

- Chain ID: 80002
- RPC URL: https://rpc-amoy.polygon.technology/
- Explorer: https://www.oklink.com/amoy
- Faucet: https://faucet.polygon.technology/

## Troubleshooting

### Common Issues

1. **Insufficient Funds**: Ensure you have enough test MATIC
2. **RPC Errors**: Try alternative RPC URLs:

   - https://polygon-amoy.infura.io/v3/YOUR_INFURA_KEY
   - https://polygon-amoy.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

3. **Gas Estimation Failures**: Add `--gas-limit 10000000` to commands

4. **Verification Failures**: Wait a few minutes and retry, or verify manually

### Gas Optimization

Each card deployment costs approximately:

- Contract deployment: ~2.5M gas
- Total for 50 cards: ~125M gas
- Estimated cost at 30 gwei: ~3.75 MATIC

### Contract Interaction Examples

**Check if address is authorized minter:**

```bash
cast call <CARD_ADDRESS> \
  "isAuthorizedMinter(address)" <MINTER_ADDRESS> \
  --rpc-url $POLYGON_AMOY_RPC_URL
```

**Get card rarity:**

```bash
cast call <CARD_ADDRESS> "rarity()" --rpc-url $POLYGON_AMOY_RPC_URL
```

**Check token balance:**

```bash
cast call <CARD_ADDRESS> \
  "balanceOf(address,uint256)" <OWNER_ADDRESS> <TOKEN_ID> \
  --rpc-url $POLYGON_AMOY_RPC_URL
```

## Next Steps

1. **Build a Frontend**: Integrate with your dApp using web3 libraries
2. **Set Up Metadata**: Configure IPFS or centralized metadata storage
3. **Create Game Logic**: Build contracts that interact with these cards
4. **Deploy to Mainnet**: When ready, deploy to Polygon mainnet

## Security Notes

- ✅ All cards have royalty protection (2.5% default)
- ✅ Emergency pause functionality available
- ✅ Minting authorization required
- ✅ Gas-optimized ERC1155 implementation
- ✅ Reentrancy protection on all functions

## Support

For issues or questions:

- Check the Card.md documentation
- Review the contract interfaces in `src/interfaces/`
- Consult Foundry documentation: https://book.getfoundry.sh/
