// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/CardSet.sol";
import "../src/mocks/MockVRFCoordinator.sol";

/**
 * @title DeployCardSet
 * @dev Deployment script for CardSet contracts
 */
contract DeployCardSet is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy VRF Coordinator (use MockVRFCoordinator for testing)
        // In production, use the actual Chainlink VRF Coordinator address
        MockVRFCoordinator vrfCoordinator = new MockVRFCoordinator();
        console.log("VRF Coordinator deployed at:", address(vrfCoordinator));
        
        // Deploy CardSet for "Mystic Realms" - Set 1
        CardSet set1 = new CardSet(
            "Mystic Realms S1",
            1000000, // 1M card emission cap
            address(vrfCoordinator),
            deployer
        );
        console.log("CardSet S1 deployed at:", address(set1));
        
        // Deploy CardSet for "Shadow Wars" - Set 2  
        CardSet set2 = new CardSet(
            "Shadow Wars S2",
            1500000, // 1.5M card emission cap
            address(vrfCoordinator),
            deployer
        );
        console.log("CardSet S2 deployed at:", address(set2));
        
        vm.stopBroadcast();
        
        console.log("Deployment completed!");
        console.log("Next steps:");
        console.log("1. Deploy individual Card contracts for each card type");
        console.log("2. Add Card contracts to sets using addCardContract()");
        console.log("3. Create deck types using addDeckType() with Card contract addresses");
        console.log("4. Set pack and deck prices");
        console.log("5. Or use SetupCardSet.s.sol script to automate steps 1-4");
        console.log("6. Start selling packs and decks!");
    }
}

/**
 * @title DeployWithChainlinkVRF
 * @dev Production deployment script using real Chainlink VRF
 */
contract DeployWithChainlinkVRF is Script {
    // Chainlink VRF Coordinator addresses for different networks
    // Ethereum Mainnet: 0x271682DEB8C4E0901D1a1550aD2e64D568E69909
    // Polygon Mainnet: 0xAE975071Be8F8eE67addBC1A82488F1C24858067
    // Sepolia Testnet: 0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Get VRF Coordinator address from environment or use default
        address vrfCoordinator = vm.envOr("VRF_COORDINATOR", address(0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625)); // Sepolia default
        
        require(vrfCoordinator != address(0), "VRF_COORDINATOR address required");
        
        vm.startBroadcast(deployerPrivateKey);
        
        string memory setName = vm.envOr("SET_NAME", string("Trading Card Set"));
        uint256 emissionCap = vm.envOr("EMISSION_CAP", uint256(1000000));
        
        CardSet cardSet = new CardSet(
            setName,
            emissionCap,
            vrfCoordinator,
            deployer
        );
        
        console.log("CardSet deployed at:", address(cardSet));
        console.log("Set Name:", setName);
        console.log("Emission Cap:", emissionCap);
        console.log("VRF Coordinator:", vrfCoordinator);
        console.log("Owner:", deployer);
        
        vm.stopBroadcast();
    }
} 