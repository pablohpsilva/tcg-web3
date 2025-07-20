# HOW TO Guide - TCG Magic Card Set Contract

This guide provides step-by-step instructions for running the TCG Magic Card Set contract system in development and deploying to production.

## How to Run This in Development Mode

### Prerequisites

1. **Install Foundry**

   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Install Node.js** (if using the monorepo setup)
   ```bash
   # Install Node.js 18+ and npm
   npm install
   ```

### Setup Development Environment

1. **Clone and Navigate to Project**

   ```bash
   git clone <your-repo>
   cd tcg-magic/apps/contracts
   ```

2. **Install Dependencies**

   ```bash
   # Install Foundry dependencies
   forge install

   # If part of monorepo, install all dependencies
   cd ../../ && npm install
   ```

3. **Compile Contracts**
   ```bash
   forge build
   ```

### Running Tests

1. **Run All Tests**

   ```bash
   forge test
   ```

2. **Run Specific Test Files**

   ```bash
   # Run only emission validation tests
   forge test --match-contract EmissionValidationTest

   # Run only batch creation tests
   forge test --match-contract BatchCreationAndLockTest

   # Run specific test function
   forge test --match-test testValidateEmissionCapForPackSize
   ```

3. **Run Tests with Verbosity**

   ```bash
   # Show traces for failed tests
   forge test -v

   # Show traces for all tests
   forge test -vv

   # Show traces and logs
   forge test -vvv
   ```

4. **Generate Test Coverage**
   ```bash
   forge coverage
   ```

### Local Development Deployment

1. **Start Local Anvil Node**

   ```bash
   anvil
   ```

2. **Deploy to Local Network**

   ```bash
   # Deploy CardSet with test parameters
   forge script script/DeployCardSet.s.sol --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
   ```

3. **Set Up Local Card Set**
   ```bash
   # Run setup script to add cards and configure the set
   forge script script/SetupCardSet.s.sol --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
   ```

### Testing Individual Components

1. **Test Emission Validation**

   ```solidity
   // Example: Test emission cap validation
   CardSet cardSet = new CardSet("Test Set", 150, vrfCoordinator, owner);
   (bool isValid, uint256 lower, uint256 higher) = cardSet.validateEmissionCapForPackSize(100);
   // isValid = false, lower = 90, higher = 105
   ```

2. **Test Pack Opening Locally**
   ```bash
   # Use cast to interact with deployed contracts
   cast call <CARDSET_ADDRESS> "packPrice()" --rpc-url http://localhost:8545
   cast send <CARDSET_ADDRESS> "openPack()" --value 0.01ether --private-key <PRIVATE_KEY> --rpc-url http://localhost:8545
   ```

### Development Tools

1. **Format Code**

   ```bash
   forge fmt
   ```

2. **Check for Common Issues**

   ```bash
   forge build --sizes  # Check contract sizes
   slither .            # Static analysis (if installed)
   ```

3. **Generate Documentation**
   ```bash
   forge doc --build
   ```

---

## How to Deploy to Production

### Prerequisites for Production

1. **Environment Setup**

   ```bash
   # Create .env file
   cp .env.example .env

   # Add your configuration to .env:
   # PRIVATE_KEY=your_deployer_private_key
   # ETHERSCAN_API_KEY=your_etherscan_api_key
   # RPC_URL=your_production_rpc_url
   # VRF_COORDINATOR=chainlink_vrf_coordinator_address
   # KEY_HASH=chainlink_vrf_key_hash
   # SUBSCRIPTION_ID=chainlink_vrf_subscription_id
   ```

2. **Network Configuration**
   Update `foundry.toml` with production network settings:

   ```toml
   [rpc_endpoints]
   mainnet = "${MAINNET_RPC_URL}"
   polygon = "${POLYGON_RPC_URL}"
   arbitrum = "${ARBITRUM_RPC_URL}"

   [etherscan]
   mainnet = { key = "${ETHERSCAN_API_KEY}" }
   polygon = { key = "${POLYGONSCAN_API_KEY}" }
   arbitrum = { key = "${ARBISCAN_API_KEY}" }
   ```

### Pre-Deployment Checklist

1. **Security Review**

   ```bash
   # Run static analysis
   slither .

   # Check for common vulnerabilities
   forge test --gas-report

   # Verify all tests pass
   forge test
   ```

2. **Contract Size Check**

   ```bash
   forge build --sizes
   # Ensure all contracts are under 24KB limit
   ```

3. **Emission Cap Validation**
   ```bash
   # Verify your emission cap is valid
   # Example: For 1 million cards = 66,666 complete packs
   # Valid emission cap = 66,666 * 15 = 999,990
   ```

### Production Deployment Steps

1. **Deploy VRF Setup** (if not using existing Chainlink VRF)

   ```bash
   # Create VRF subscription on Chainlink
   # Fund subscription with LINK tokens
   # Note the subscription ID
   ```

2. **Deploy CardSet Contract**

   ```bash
   # Deploy to mainnet (example)
   forge script script/DeployCardSet.s.sol \
     --rpc-url $RPC_URL \
     --private-key $PRIVATE_KEY \
     --broadcast \
     --verify \
     --etherscan-api-key $ETHERSCAN_API_KEY
   ```

3. **Configure CardSet**
   ```bash
   # Run setup script with production parameters
   forge script script/SetupCardSet.s.sol \
     --rpc-url $RPC_URL \
     --private-key $PRIVATE_KEY \
     --broadcast
   ```

### Production Configuration Example

```solidity
// Example production deployment script
contract DeployProduction is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address vrfCoordinator = vm.envAddress("VRF_COORDINATOR");
        address owner = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy with production parameters
        CardSet cardSet = new CardSet(
            "Genesis TCG Set",           // Set name
            999990,                      // Emission cap (66,666 complete packs)
            vrfCoordinator,              // Chainlink VRF Coordinator
            owner                        // Owner address
        );

        // Set production pack price (e.g., 0.05 ETH)
        cardSet.setPackPrice(0.05 ether);

        vm.stopBroadcast();

        console.log("CardSet deployed to:", address(cardSet));
    }
}
```

### Post-Deployment Verification

1. **Verify Contract on Etherscan**

   ```bash
   forge verify-contract <CONTRACT_ADDRESS> src/CardSet.sol:CardSet \
     --etherscan-api-key $ETHERSCAN_API_KEY \
     --constructor-args $(cast abi-encode "constructor(string,uint256,address,address)" "Genesis TCG Set" 999990 $VRF_COORDINATOR $OWNER)
   ```

2. **Test Production Contract**

   ```bash
   # Verify emission cap
   cast call <CARDSET_ADDRESS> "validateEmissionCapForPackSize(uint256)" 999990 --rpc-url $RPC_URL

   # Check pack price
   cast call <CARDSET_ADDRESS> "packPrice()" --rpc-url $RPC_URL

   # Verify owner
   cast call <CARDSET_ADDRESS> "owner()" --rpc-url $RPC_URL
   ```

3. **Add VRF Consumer**
   ```bash
   # Add CardSet as VRF consumer to your Chainlink subscription
   # This can be done through Chainlink VRF UI or programmatically
   ```

### Production Security Measures

1. **Multi-Sig Wallet Setup**

   ```solidity
   // Consider transferring ownership to a multi-sig wallet
   cardSet.transferOwnership(MULTISIG_ADDRESS);
   ```

2. **Timelock Implementation** (Optional)

   ```solidity
   // For extra security, use OpenZeppelin's TimelockController
   // This adds delays to critical function calls
   ```

3. **Emergency Procedures**
   ```bash
   # Document emergency pause procedures
   cast send <CARDSET_ADDRESS> "pause()" --private-key $EMERGENCY_KEY --rpc-url $RPC_URL
   ```

### Monitoring and Maintenance

1. **Set Up Monitoring**

   - Monitor contract balance for withdrawals
   - Track total emissions vs emission cap
   - Monitor pack opening events
   - Set up alerts for unusual activity

2. **Regular Maintenance**
   ```bash
   # Check VRF subscription balance
   # Monitor gas prices for optimal transaction timing
   # Regular security audits
   ```

### Important Production Notes

- **Emission Cap**: Must be divisible by 15 (PACK_SIZE)
- **VRF Setup**: Ensure sufficient LINK balance in VRF subscription
- **Gas Optimization**: Consider deployment timing for lower gas costs
- **Testing**: Always test on testnets before mainnet deployment
- **Upgrades**: Contracts are not upgradeable by design - plan carefully
- **Ownership**: Consider multi-sig wallet for production ownership

### Troubleshooting

1. **Invalid Emission Cap Error**

   ```bash
   # Check if your emission cap is divisible by 15
   # Use the validation function to get suggestions
   ```

2. **VRF Issues**

   ```bash
   # Verify VRF subscription is funded
   # Check that CardSet is added as consumer
   # Verify key hash and coordinator address
   ```

3. **Gas Issues**
   ```bash
   # Batch operations may require high gas limits
   # Consider splitting large batches
   ```

For additional support or questions, refer to the contract documentation or create an issue in the project repository.
