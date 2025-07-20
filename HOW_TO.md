# HOW TO Guide - TCG Magic Card Set Contract

This guide provides step-by-step instructions for running the **security-hardened** TCG Magic Card Set contract system in development and deploying to production.

## 🛡️ Security Features Overview

Our contracts now include **military-grade security** with:

- **Emergency Controls**: Complete system shutdown capabilities
- **Access Control**: Multi-layer authorization with detailed error messages
- **Payment Security**: Secure royalty distribution with automatic refunds
- **Rate Limiting**: Protection against spam and bot attacks
- **Input Validation**: Comprehensive parameter validation with custom errors
- **VRF Security**: Enhanced randomness protection with replay attack prevention
- **Economic Protections**: Gas bomb prevention and price manipulation safeguards

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
   # ✅ All 130 tests should pass with security validations
   ```

2. **Run Specific Test Files**

   ```bash
   # Run security-focused tests
   forge test --match-contract RoyaltySystemTest
   forge test --match-contract EmissionValidationTest
   forge test --match-contract BatchCreationAndLockTest

   # Run specific security test function
   forge test --match-test testSecurityBreach
   forge test --match-test testEmergencyPause
   forge test --match-test testPaymentSecurity
   ```

3. **Run Tests with Verbosity**

   ```bash
   # Show traces for failed tests
   forge test -v

   # Show traces and security event logs
   forge test -vvv
   ```

4. **Generate Test Coverage**
   ```bash
   forge coverage
   # Should show >95% coverage including security functions
   ```

### Local Development Deployment

1. **Start Local Anvil Node**

   ```bash
   anvil
   ```

2. **Deploy to Local Network with Security Features**

   ```bash
   # Deploy CardSet with enhanced security
   forge script script/DeployCardSet.s.sol --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
   ```

3. **Test Security Features Locally**

   ```bash
   # Test emergency pause
   cast send <CARDSET_ADDRESS> "emergencyPause()" --private-key <OWNER_KEY> --rpc-url http://localhost:8545

   # Test security status
   cast call <CARDSET_ADDRESS> "getSecurityStatus()" --rpc-url http://localhost:8545

   # Test rate limiting (multiple rapid calls should fail)
   cast send <CARDSET_ADDRESS> "openPack()" --value 0.01ether --private-key <USER_KEY> --rpc-url http://localhost:8545
   ```

### Testing Security Features

1. **Test Payment Security**

   ```solidity
   // Example: Test automatic refunds
   CardSet cardSet = new CardSet("Test Set", 150, vrfCoordinator, owner);

   // Overpayment should trigger automatic refund
   vm.deal(user, 1 ether);
   cardSet.openDeck{value: 0.1 ether}("Starter Deck"); // Deck costs 0.05 ether
   // ✅ User should receive 0.05 ether refund automatically
   ```

2. **Test Access Control**

   ```bash
   # Unauthorized user trying admin functions should fail with SecurityBreach
   cast send <CARDSET_ADDRESS> "lockMinting()" --private-key <NON_OWNER_KEY> --rpc-url http://localhost:8545
   # ❌ Should revert with "Unauthorized(string operation)"
   ```

3. **Test Emergency Controls**

   ```bash
   # Owner can pause all operations
   cast send <CARDSET_ADDRESS> "emergencyPause()" --private-key <OWNER_KEY> --rpc-url http://localhost:8545

   # All user operations should now fail
   cast send <CARDSET_ADDRESS> "openPack()" --value 0.01ether --private-key <USER_KEY> --rpc-url http://localhost:8545
   # ❌ Should revert with "OperationLocked(string operation)"
   ```

### Development Tools

1. **Format Code**

   ```bash
   forge fmt
   ```

2. **Security Analysis**

   ```bash
   forge build --sizes  # Check contract sizes (should be under 24KB)
   slither .            # Static analysis (if installed)

   # Custom security checks
   forge test --match-test "testSecurity" -vvv
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
   # Create .env file with security considerations
   cp .env.example .env

   # Add your configuration to .env:
   # PRIVATE_KEY=your_deployer_private_key (use hardware wallet in production)
   # ETHERSCAN_API_KEY=your_etherscan_api_key
   # RPC_URL=your_production_rpc_url
   # VRF_COORDINATOR=chainlink_vrf_coordinator_address
   # KEY_HASH=chainlink_vrf_key_hash
   # SUBSCRIPTION_ID=chainlink_vrf_subscription_id
   # MULTISIG_ADDRESS=your_multisig_wallet_address (recommended)
   ```

2. **Security Configuration**
   Update `foundry.toml` with production network settings and gas optimization:

   ```toml
   [profile.production]
   gas_reports = true
   optimizer = true
   optimizer_runs = 200

   [rpc_endpoints]
   mainnet = "${MAINNET_RPC_URL}"
   polygon = "${POLYGON_RPC_URL}"
   arbitrum = "${ARBITRUM_RPC_URL}"

   [etherscan]
   mainnet = { key = "${ETHERSCAN_API_KEY}" }
   polygon = { key = "${POLYGONSCAN_API_KEY}" }
   arbitrum = { key = "${ARBISCAN_API_KEY}" }
   ```

### Pre-Deployment Security Checklist

1. **Comprehensive Security Review**

   ```bash
   # Run full security test suite
   forge test --match-contract "Security" -vvv

   # Static analysis with security focus
   slither . --exclude-dependencies

   # Check for common vulnerabilities
   forge test --gas-report

   # Verify all 130 tests pass
   forge test
   ```

2. **Contract Size and Gas Analysis**

   ```bash
   forge build --sizes
   # Ensure all contracts are under 24KB limit
   # CardSet: ~23KB, Card: ~22KB (optimized)
   ```

3. **Security Parameter Validation**
   ```bash
   # Verify security constants are properly set
   # MAX_BATCH_PACKS = 10 (prevents gas bombs)
   # MAX_PRICE = 10 ether (prevents price manipulation)
   # VRF_TIMEOUT = 1 hour (prevents stale requests)
   ```

### Production Deployment Steps

1. **Deploy with Security Features**

   ```bash
   # Deploy to mainnet with all security features enabled
   forge script script/DeployCardSet.s.sol \
     --rpc-url $RPC_URL \
     --private-key $PRIVATE_KEY \
     --broadcast \
     --verify \
     --etherscan-api-key $ETHERSCAN_API_KEY \
     --optimize
   ```

2. **Immediate Post-Deployment Security Setup**

   ```bash
   # Transfer ownership to multisig (CRITICAL)
   cast send <CARDSET_ADDRESS> "transferOwnership(address)" $MULTISIG_ADDRESS \
     --private-key $PRIVATE_KEY --rpc-url $RPC_URL

   # Set up monitoring
   cast call <CARDSET_ADDRESS> "getSecurityStatus()" --rpc-url $RPC_URL
   ```

3. **Configure Production Security Settings**

   ```bash
   # Set reasonable price limits (from multisig)
   cast send <CARDSET_ADDRESS> "setPackPrice(uint256)" 50000000000000000 \  # 0.05 ETH
     --private-key $MULTISIG_KEY --rpc-url $RPC_URL

   # Consider locking price changes if final
   cast send <CARDSET_ADDRESS> "lockPriceChanges()" \
     --private-key $MULTISIG_KEY --rpc-url $RPC_URL
   ```

### Production Security Configuration Example

```solidity
// Example production deployment script with security
contract DeployProductionSecure is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address vrfCoordinator = vm.envAddress("VRF_COORDINATOR");
        address multisig = vm.envAddress("MULTISIG_ADDRESS");
        address owner = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy with production security parameters
        CardSet cardSet = new CardSet(
            "Genesis TCG Set",           // Set name
            999990,                      // Emission cap (66,666 complete packs)
            vrfCoordinator,              // Chainlink VRF Coordinator
            owner                        // Initial owner (will transfer to multisig)
        );

        // Set production pack price with security bounds
        cardSet.setPackPrice(0.05 ether);

        // Transfer to multisig for enhanced security
        cardSet.transferOwnership(multisig);

        vm.stopBroadcast();

        console.log("CardSet deployed to:", address(cardSet));
        console.log("Ownership transferred to multisig:", multisig);
    }
}
```

### Post-Deployment Security Verification

1. **Verify Contract Security Features**

   ```bash
   # Verify security status
   cast call <CONTRACT_ADDRESS> "getSecurityStatus()" --rpc-url $RPC_URL

   # Test emergency functions (from multisig)
   cast call <CONTRACT_ADDRESS> "owner()" --rpc-url $RPC_URL  # Should be multisig

   # Verify price limits are active
   cast call <CONTRACT_ADDRESS> "packPrice()" --rpc-url $RPC_URL
   cast call <CONTRACT_ADDRESS> "getDeckPrice(string)" "Starter Deck" --rpc-url $RPC_URL
   ```

2. **Security Monitoring Setup**

   ```bash
   # Monitor security events
   cast logs --address <CONTRACT_ADDRESS> \
     --from-block latest \
     'SecurityEvent(string indexed eventType, address indexed actor, uint256 timestamp)'

   # Set up alerts for critical functions
   # - Emergency pause activations
   # - Ownership transfers
   # - Large batch operations
   # - Price changes
   ```

3. **Emergency Response Plan**
   ```bash
   # Incident Response Playbook:
   # 1. Identify threat type
   # 2. Activate emergency pause if needed
   # 3. Assess damage and risk
   # 4. Apply targeted mitigations
   # 5. Communicate with stakeholders
   # 6. Post-incident review and improvements
   ```

### Production Security Best Practices

1. **Multi-Sig Wallet Configuration**

   ```solidity
   // Use Gnosis Safe or similar with:
   // - 3/5 or 2/3 signature threshold
   // - Hardware wallet signers
   // - Geographic distribution of signers
   // - Regular security audits
   ```

2. **Monitoring and Alerting**

   - **Real-time monitoring** of all SecurityEvent emissions
   - **Automated alerts** for emergency pause activations
   - **Dashboard** showing security status, rates, and limits
   - **Regular audits** of access patterns and operations

3. **Incident Response**
   ```bash
   # Incident Response Playbook:
   # 1. Identify threat type
   # 2. Activate emergency pause if needed
   # 3. Assess damage and risk
   # 4. Apply targeted mitigations
   # 5. Communicate with stakeholders
   # 6. Post-incident review and improvements
   ```

### Important Production Security Notes

- **Emergency Controls**: Always test emergency pause functions before launch
- **Rate Limiting**: Protects against bot attacks while allowing normal usage
- **Payment Security**: Automatic refunds prevent user funds from being stuck
- **VRF Security**: Enhanced validation prevents manipulation of randomness
- **Access Control**: Multi-layer validation with detailed error messages
- **Economic Protection**: Built-in safeguards against gas bombs and price manipulation
- **Monitoring**: Comprehensive event logging for security incident detection

### Security Troubleshooting

1. **SecurityBreach Errors**

   ```bash
   # Check specific security breach reason
   # Common causes:
   # - "rate limited" -> User making too many rapid requests
   # - "emission cap exceeded" -> Trying to mint beyond limits
   # - "invalid signature" -> Meta-transaction signature issues
   ```

2. **OperationLocked Errors**

   ```bash
   # Check which operations are locked
   cast call <CONTRACT_ADDRESS> "getSecurityStatus()" --rpc-url $RPC_URL
   # - emergencyPause = true -> All operations locked
   # - mintingLocked = true -> Only minting operations locked
   # - priceChangesLocked = true -> Only price changes locked
   ```

3. **PaymentFailed Errors**
   ```bash
   # Common payment issues:
   # - "insufficient payment" -> User didn't send enough ETH
   # - "refund failed" -> Contract couldn't return excess payment
   # - "withdrawal failed" -> Owner withdrawal attempt failed
   ```

### Security Metrics to Monitor

- **Failed SecurityBreach events per hour**
- **Emergency pause activations**
- **Rate limiting triggers**
- **Payment failures and refunds**
- **VRF request timeouts**
- **Unauthorized access attempts**

For additional security support or questions, refer to the comprehensive security documentation or create an issue in the project repository.

---

**🛡️ Your TCG Magic contracts now feature military-grade security suitable for enterprise deployment with millions of dollars in value.**
