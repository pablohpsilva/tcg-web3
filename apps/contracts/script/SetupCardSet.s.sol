// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/CardSet.sol";
import "../src/interfaces/ICardSet.sol";

/**
 * @title SetupCardSet
 * @dev Script to populate a CardSet with sample cards and decks
 */
contract SetupCardSet is Script {
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Get CardSet address from environment
        address cardSetAddress = vm.envAddress("CARD_SET_ADDRESS");
        CardSet cardSet = CardSet(cardSetAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Setting up CardSet at:", cardSetAddress);
        console.log("Adding cards and deck types...");
        
        // Add sample cards for the set
        _addSampleCards(cardSet);
        
        // Add sample deck types
        _addSampleDecks(cardSet);
        
        // Set competitive pricing
        cardSet.setPackPrice(0.02 ether); // $50-60 USD at $3000 ETH
        cardSet.setDeckPrice("Starter Deck", 0.08 ether); // $200-240 USD
        cardSet.setDeckPrice("Fire Deck", 0.1 ether);
        cardSet.setDeckPrice("Water Deck", 0.1 ether);
        
        vm.stopBroadcast();
        
        console.log("Setup completed!");
        console.log("Pack price: 0.02 ETH");
        console.log("Deck prices: 0.08-0.1 ETH");
        console.log("Ready for pack and deck sales!");
    }
    
    function _addSampleCards(CardSet cardSet) internal {
        // === COMMON CARDS (1-15) ===
        string[15] memory commonNames = [
            "Forest Sprite", "Stone Golem", "Fire Imp", "Water Elemental", "Wind Wisp",
            "Earth Guardian", "Shadow Cat", "Light Fairy", "Ice Shard", "Lightning Bug",
            "Grass Snake", "Rock Turtle", "Flame Mouse", "Wave Rider", "Cloud Hopper"
        ];
        
        for (uint256 i = 0; i < 15; i++) {
            cardSet.addCard(
                i + 1,
                commonNames[i],
                ICardSet.Rarity.COMMON,
                0,
                string(abi.encodePacked("ipfs://Qm", _generateHash(i + 1)))
            );
        }
        
        // === UNCOMMON CARDS (16-25) ===
        string[10] memory uncommonNames = [
            "Storm Mage", "Crystal Guardian", "Shadow Assassin", "Phoenix Rider", "Tidal Warrior",
            "Mountain Giant", "Void Walker", "Solar Priest", "Frost Witch", "Thunder Lord"
        ];
        
        for (uint256 i = 0; i < 10; i++) {
            cardSet.addCard(
                i + 16,
                uncommonNames[i],
                ICardSet.Rarity.UNCOMMON,
                0,
                string(abi.encodePacked("ipfs://Qm", _generateHash(i + 16)))
            );
        }
        
        // === RARE CARDS (26-30) ===
        string[5] memory rareNames = [
            "Dragon Lord", "Archmage Supreme", "Death Knight", "Angel of Light", "Demon Prince"
        ];
        
        for (uint256 i = 0; i < 5; i++) {
            cardSet.addCard(
                i + 26,
                rareNames[i],
                ICardSet.Rarity.RARE,
                0,
                string(abi.encodePacked("ipfs://Qm", _generateHash(i + 26)))
            );
        }
        
        // === MYTHICAL CARDS (31-33) ===
        string[3] memory mythicalNames = [
            "Planar Sovereign", "Reality Shaper", "Void Emperor"
        ];
        
        for (uint256 i = 0; i < 3; i++) {
            cardSet.addCard(
                i + 31,
                mythicalNames[i],
                ICardSet.Rarity.MYTHICAL,
                0,
                string(abi.encodePacked("ipfs://Qm", _generateHash(i + 31)))
            );
        }
        
        // === SERIALIZED CARDS (34-36) ===
        string[3] memory serializedNames = [
            "Genesis Dragon #001", "Alpha Phoenix #001", "Omega Leviathan #001"
        ];
        
        uint256[3] memory serializedSupplies = [uint256(100), uint256(50), uint256(25)];
        
        for (uint256 i = 0; i < 3; i++) {
            cardSet.addCard(
                i + 34,
                serializedNames[i],
                ICardSet.Rarity.SERIALIZED,
                serializedSupplies[i],
                string(abi.encodePacked("ipfs://Qm", _generateHash(i + 34)))
            );
        }
        
        console.log("Added 36 cards:");
        console.log("- 15 Commons");
        console.log("- 10 Uncommons");
        console.log("- 5 Rares");
        console.log("- 3 Mythicals");
        console.log("- 3 Serialized (limited supply)");
    }
    
    function _addSampleDecks(CardSet cardSet) internal {
        // === STARTER DECK ===
        uint256[] memory starterCardIds = new uint256[](4);
        uint256[] memory starterQuantities = new uint256[](4);
        
        starterCardIds[0] = 1;  // Forest Sprite (common)
        starterQuantities[0] = 30;
        
        starterCardIds[1] = 16; // Storm Mage (uncommon)
        starterQuantities[1] = 20;
        
        starterCardIds[2] = 26; // Dragon Lord (rare)
        starterQuantities[2] = 8;
        
        starterCardIds[3] = 31; // Planar Sovereign (mythical)
        starterQuantities[3] = 2;
        
        cardSet.addDeckType("Starter Deck", starterCardIds, starterQuantities);
        
        // === FIRE DECK ===
        uint256[] memory fireCardIds = new uint256[](3);
        uint256[] memory fireQuantities = new uint256[](3);
        
        fireCardIds[0] = 3;  // Fire Imp
        fireQuantities[0] = 35;
        
        fireCardIds[1] = 13; // Flame Mouse
        fireQuantities[1] = 20;
        
        fireCardIds[2] = 18; // Phoenix Rider
        fireQuantities[2] = 5;
        
        cardSet.addDeckType("Fire Deck", fireCardIds, fireQuantities);
        
        // === WATER DECK ===
        uint256[] memory waterCardIds = new uint256[](3);
        uint256[] memory waterQuantities = new uint256[](3);
        
        waterCardIds[0] = 4;  // Water Elemental
        waterQuantities[0] = 35;
        
        waterCardIds[1] = 14; // Wave Rider
        waterQuantities[1] = 20;
        
        waterCardIds[2] = 19; // Tidal Warrior
        waterQuantities[2] = 5;
        
        cardSet.addDeckType("Water Deck", waterCardIds, waterQuantities);
        
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