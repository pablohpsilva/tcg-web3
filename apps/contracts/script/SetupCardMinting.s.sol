// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/Card.sol";

/**
 * @title SetupCardMinting - Helper script to authorize minters and mint initial cards
 * @dev Sets up minting permissions and mints test cards for the deployed Card contracts
 */
contract SetupCardMinting is Script {
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Get card addresses from environment or input
        address[] memory cardAddresses = _getCardAddresses();
        address minter = vm.envAddress("MINTER_ADDRESS"); // Address to authorize for minting
        address testPlayer = vm.envAddress("TEST_PLAYER_ADDRESS"); // Address to mint test cards to
        
        console.log("Setting up minting for", cardAddresses.length, "cards");
        console.log("Authorizing minter:", minter);
        console.log("Test player:", testPlayer);
        
        vm.startBroadcast(deployerPrivateKey);
        
        for (uint256 i = 0; i < cardAddresses.length; i++) {
            Card card = Card(cardAddresses[i]);
            
            console.log("Setting up card at:", cardAddresses[i]);
            
            // Authorize the minter
            card.addAuthorizedMinter(minter);
            console.log("Authorized minter for card", card.cardId());
            
            // Mint a test card to the test player
            uint256 tokenId = card.mint(testPlayer);
            console.log("Minted token ID", tokenId, "to", testPlayer);
        }
        
        vm.stopBroadcast();
        
        console.log("=== MINTING SETUP COMPLETE ===");
    }
    
    function mintBatchToPlayer(address cardAddress, address player, uint256 amount) external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        Card card = Card(cardAddress);
        uint256[] memory tokenIds = card.batchMint(player, amount);
        
        console.log("Batch minted", amount, "cards to", player);
        console.log("First token ID:", tokenIds[0]);
        console.log("Last token ID:", tokenIds[tokenIds.length - 1]);
        
        vm.stopBroadcast();
    }
    
    function _getCardAddresses() internal view returns (address[] memory) {
        // This would typically read from a deployment artifact file
        // For now, you'll need to manually input the addresses or read from env
        address[] memory addresses = new address[](3); // Example with 3 cards
        
        // Example addresses - replace with actual deployed addresses
        addresses[0] = vm.envAddress("CARD_1_ADDRESS");
        addresses[1] = vm.envAddress("CARD_2_ADDRESS");
        addresses[2] = vm.envAddress("CARD_3_ADDRESS");
        
        return addresses;
    }
} 