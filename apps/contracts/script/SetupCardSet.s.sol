// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/CardSet.sol";
import "../src/Card.sol";
import "../src/interfaces/ICardSet.sol";
import "../src/interfaces/ICard.sol";

/**
 * @title SetupCardSet
 * @dev Script to populate a CardSet with sample Card contracts using batch creation for gas efficiency
 * @notice This script uses the batchCreateAndAddCards function for optimal gas usage
 */
contract SetupCardSet is Script {
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Get CardSet address from environment
        address cardSetAddress = vm.envAddress("CARD_SET_ADDRESS");
        CardSet cardSet = CardSet(cardSetAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Setting up CardSet at:", cardSetAddress);
        console.log("Using batch creation for gas efficiency...");
        
        // Batch create and add Card contracts for maximum gas efficiency
        _batchCreateCards(cardSet, deployer);
        
        // Add sample deck types using Card contracts
        _addSampleDecks(cardSet);
        
        // Set competitive pricing
        cardSet.setPackPrice(0.02 ether); // $50-60 USD at $3000 ETH
        cardSet.setDeckPrice("Starter Deck", 0.08 ether); // $200-240 USD
        cardSet.setDeckPrice("Fire Deck", 0.1 ether);
        cardSet.setDeckPrice("Water Deck", 0.1 ether);
        
        // Lock the set to ensure immutability and guarantee card scarcity
        console.log("Locking set to ensure immutability...");
        cardSet.lockSet();
        
        vm.stopBroadcast();
        
        console.log("Setup completed with batch creation!");
        console.log("Pack price: 0.02 ETH");
        console.log("Deck prices: 0.08-0.1 ETH");
        console.log("Set is now LOCKED - no more cards can be added");
        console.log("Total cards deployed in a single batch transaction");
        console.log("Ready for pack and deck sales!");
    }
    
    function _batchCreateCards(CardSet cardSet, address owner) internal {
        // Prepare batch creation data for maximum gas efficiency
        ICardSet.CardCreationData[] memory cardData = new ICardSet.CardCreationData[](36);
        uint256 index = 0;
        
        // === COMMON CARDS (15 cards) ===
        string[15] memory commonNames = [
            "Forest Sprite", "Stone Golem", "Fire Imp", "Water Elemental", "Wind Wisp",
            "Earth Guardian", "Shadow Cat", "Light Fairy", "Ice Shard", "Lightning Bug",
            "Grass Snake", "Rock Turtle", "Flame Mouse", "Wave Rider", "Cloud Hopper"
        ];
        
        for (uint256 i = 0; i < 15; i++) {
            cardData[index] = ICardSet.CardCreationData({
                cardId: i + 1,
                name: commonNames[i],
                rarity: ICard.Rarity.COMMON,
                maxSupply: 0, // Unlimited
                metadataURI: string(abi.encodePacked("ipfs://Qm", _generateHash(i + 1)))
            });
            index++;
        }
        
        // === UNCOMMON CARDS (10 cards) ===
        string[10] memory uncommonNames = [
            "Storm Mage", "Crystal Guardian", "Shadow Assassin", "Phoenix Rider", "Tidal Warrior",
            "Mountain Giant", "Void Walker", "Solar Priest", "Frost Witch", "Thunder Lord"
        ];
        
        for (uint256 i = 0; i < 10; i++) {
            cardData[index] = ICardSet.CardCreationData({
                cardId: i + 16,
                name: uncommonNames[i],
                rarity: ICard.Rarity.UNCOMMON,
                maxSupply: 0, // Unlimited
                metadataURI: string(abi.encodePacked("ipfs://Qm", _generateHash(i + 16)))
            });
            index++;
        }
        
        // === RARE CARDS (5 cards) ===
        string[5] memory rareNames = [
            "Dragon Lord", "Archmage Supreme", "Death Knight", "Angel of Light", "Demon Prince"
        ];
        
        for (uint256 i = 0; i < 5; i++) {
            cardData[index] = ICardSet.CardCreationData({
                cardId: i + 26,
                name: rareNames[i],
                rarity: ICard.Rarity.RARE,
                maxSupply: 0, // Unlimited
                metadataURI: string(abi.encodePacked("ipfs://Qm", _generateHash(i + 26)))
            });
            index++;
        }
        
        // === MYTHICAL CARDS (3 cards) ===
        string[3] memory mythicalNames = [
            "Planar Sovereign", "Reality Shaper", "Void Emperor"
        ];
        
        for (uint256 i = 0; i < 3; i++) {
            cardData[index] = ICardSet.CardCreationData({
                cardId: i + 31,
                name: mythicalNames[i],
                rarity: ICard.Rarity.MYTHICAL,
                maxSupply: 0, // Unlimited
                metadataURI: string(abi.encodePacked("ipfs://Qm", _generateHash(i + 31)))
            });
            index++;
        }
        
        // === SERIALIZED CARDS (3 cards) ===
        string[3] memory serializedNames = [
            "Genesis Dragon #001", "Alpha Phoenix #001", "Omega Leviathan #001"
        ];
        
        uint256[3] memory serializedSupplies = [uint256(100), uint256(50), uint256(25)];
        
        for (uint256 i = 0; i < 3; i++) {
            cardData[index] = ICardSet.CardCreationData({
                cardId: i + 34,
                name: serializedNames[i],
                rarity: ICard.Rarity.SERIALIZED,
                maxSupply: serializedSupplies[i], // Limited supply
                metadataURI: string(abi.encodePacked("ipfs://Qm", _generateHash(i + 34)))
            });
            index++;
        }
        
        console.log("Creating and deploying 36 Card contracts in a single batch transaction...");
        
        // Execute batch creation - deploys all cards in one transaction!
        cardSet.batchCreateAndAddCards(cardData);
        
        console.log("Batch creation completed:");
        console.log("- 15 Commons deployed and added");
        console.log("- 10 Uncommons deployed and added");
        console.log("- 5 Rares deployed and added");
        console.log("- 3 Mythicals deployed and added");
        console.log("- 3 Serialized (limited supply) deployed and added");
        console.log("All cards deployed, authorized, and registered in ONE transaction!");
    }
    
    function _addSampleDecks(CardSet cardSet) internal {
        // Get the deployed card contracts by rarity for deck construction
        address[] memory commons = cardSet.getCardContractsByRarity(ICard.Rarity.COMMON);
        address[] memory uncommons = cardSet.getCardContractsByRarity(ICard.Rarity.UNCOMMON);
        address[] memory rares = cardSet.getCardContractsByRarity(ICard.Rarity.RARE);
        address[] memory mythicals = cardSet.getCardContractsByRarity(ICard.Rarity.MYTHICAL);
        
        // === STARTER DECK ===
        address[] memory starterCardContracts = new address[](4);
        uint256[] memory starterQuantities = new uint256[](4);
        
        starterCardContracts[0] = commons[0]; // Forest Sprite
        starterQuantities[0] = 30;
        
        starterCardContracts[1] = uncommons[0]; // Storm Mage
        starterQuantities[1] = 20;
        
        starterCardContracts[2] = rares[0]; // Dragon Lord
        starterQuantities[2] = 8;
        
        starterCardContracts[3] = mythicals[0]; // Planar Sovereign
        starterQuantities[3] = 2;
        
        cardSet.addDeckType("Starter Deck", starterCardContracts, starterQuantities);
        
        // === FIRE DECK ===
        address[] memory fireCardContracts = new address[](3);
        uint256[] memory fireQuantities = new uint256[](3);
        
        fireCardContracts[0] = commons[2]; // Fire Imp
        fireQuantities[0] = 35;
        
        fireCardContracts[1] = commons[12]; // Flame Mouse
        fireQuantities[1] = 20;
        
        fireCardContracts[2] = uncommons[3]; // Phoenix Rider
        fireQuantities[2] = 5;
        
        cardSet.addDeckType("Fire Deck", fireCardContracts, fireQuantities);
        
        // === WATER DECK ===
        address[] memory waterCardContracts = new address[](3);
        uint256[] memory waterQuantities = new uint256[](3);
        
        waterCardContracts[0] = commons[3]; // Water Elemental
        waterQuantities[0] = 35;
        
        waterCardContracts[1] = commons[13]; // Wave Rider
        waterQuantities[1] = 20;
        
        waterCardContracts[2] = uncommons[4]; // Tidal Warrior
        waterQuantities[2] = 5;
        
        cardSet.addDeckType("Water Deck", waterCardContracts, waterQuantities);
        
        console.log("Added 3 deck types:");
        console.log("- Starter Deck (balanced, 60 cards)");
        console.log("- Fire Deck (fire-themed, 60 cards)");
        console.log("- Water Deck (water-themed, 60 cards)");
    }
    
    function _generateHash(uint256 id) internal pure returns (string memory) {
        // Generate a simple hash-like string for IPFS simulation
        bytes32 hash = keccak256(abi.encodePacked("card", id));
        return _toHexString(uint256(hash));
    }
    
    function _toHexString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0000000000000000000000000000000000000000000000000000000000000000";
        }
        uint256 temp = value;
        uint256 length = 0;
        while (temp != 0) {
            length++;
            temp >>= 4;
        }
        bytes memory buffer = new bytes(64); // 32 bytes = 64 hex chars
        for (uint256 i = 64; i > 0; --i) {
            buffer[i - 1] = _toHexChar(uint8(value & 0xf));
            value >>= 4;
        }
        return string(buffer);
    }
    
    function _toHexChar(uint8 value) internal pure returns (bytes1) {
        if (value < 10) {
            return bytes1(uint8(bytes1('0')) + value);
        } else {
            return bytes1(uint8(bytes1('a')) + value - 10);
        }
    }
} 