// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/CardSet.sol";
import "../src/Card.sol";
import "../src/interfaces/ICardSet.sol";
import "../src/interfaces/ICard.sol";

/**
 * @title SetupCardSet
 * @dev Script to populate a CardSet with sample Card contracts and decks
 * @notice This script deploys individual Card contracts and adds them to a CardSet
 */
contract SetupCardSet is Script {
    
    // Arrays to store deployed Card contracts
    Card[] public commonCards;
    Card[] public uncommonCards;
    Card[] public rareCards;
    Card[] public mythicalCards;
    Card[] public serializedCards;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Get CardSet address from environment
        address cardSetAddress = vm.envAddress("CARD_SET_ADDRESS");
        CardSet cardSet = CardSet(cardSetAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Setting up CardSet at:", cardSetAddress);
        console.log("Deploying Card contracts and adding to set...");
        
        // Deploy and add sample Card contracts
        _deployAndAddCards(cardSet, deployer);
        
        // Add sample deck types using Card contracts
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
        console.log("Deployed and registered", commonCards.length + uncommonCards.length + rareCards.length + mythicalCards.length + serializedCards.length, "Card contracts");
        console.log("Ready for pack and deck sales!");
    }
    
    function _deployAndAddCards(CardSet cardSet, address owner) internal {
        // === DEPLOY COMMON CARDS ===
        string[15] memory commonNames = [
            "Forest Sprite", "Stone Golem", "Fire Imp", "Water Elemental", "Wind Wisp",
            "Earth Guardian", "Shadow Cat", "Light Fairy", "Ice Shard", "Lightning Bug",
            "Grass Snake", "Rock Turtle", "Flame Mouse", "Wave Rider", "Cloud Hopper"
        ];
        
        for (uint256 i = 0; i < 15; i++) {
            Card commonCard = new Card(
                i + 1,
                commonNames[i],
                ICard.Rarity.COMMON,
                0,
                string(abi.encodePacked("ipfs://Qm", _generateHash(i + 1))),
                owner
            );
            commonCards.push(commonCard);
            commonCard.addAuthorizedMinter(address(cardSet));
            cardSet.addCardContract(address(commonCard));
        }
        
        // === DEPLOY UNCOMMON CARDS ===
        string[10] memory uncommonNames = [
            "Storm Mage", "Crystal Guardian", "Shadow Assassin", "Phoenix Rider", "Tidal Warrior",
            "Mountain Giant", "Void Walker", "Solar Priest", "Frost Witch", "Thunder Lord"
        ];
        
        for (uint256 i = 0; i < 10; i++) {
            Card uncommonCard = new Card(
                i + 16,
                uncommonNames[i],
                ICard.Rarity.UNCOMMON,
                0,
                string(abi.encodePacked("ipfs://Qm", _generateHash(i + 16))),
                owner
            );
            uncommonCards.push(uncommonCard);
            uncommonCard.addAuthorizedMinter(address(cardSet));
            cardSet.addCardContract(address(uncommonCard));
        }
        
        // === DEPLOY RARE CARDS ===
        string[5] memory rareNames = [
            "Dragon Lord", "Archmage Supreme", "Death Knight", "Angel of Light", "Demon Prince"
        ];
        
        for (uint256 i = 0; i < 5; i++) {
            Card rareCard = new Card(
                i + 26,
                rareNames[i],
                ICard.Rarity.RARE,
                0,
                string(abi.encodePacked("ipfs://Qm", _generateHash(i + 26))),
                owner
            );
            rareCards.push(rareCard);
            rareCard.addAuthorizedMinter(address(cardSet));
            cardSet.addCardContract(address(rareCard));
        }
        
        // === DEPLOY MYTHICAL CARDS ===
        string[3] memory mythicalNames = [
            "Planar Sovereign", "Reality Shaper", "Void Emperor"
        ];
        
        for (uint256 i = 0; i < 3; i++) {
            Card mythicalCard = new Card(
                i + 31,
                mythicalNames[i],
                ICard.Rarity.MYTHICAL,
                0,
                string(abi.encodePacked("ipfs://Qm", _generateHash(i + 31))),
                owner
            );
            mythicalCards.push(mythicalCard);
            mythicalCard.addAuthorizedMinter(address(cardSet));
            cardSet.addCardContract(address(mythicalCard));
        }
        
        // === DEPLOY SERIALIZED CARDS ===
        string[3] memory serializedNames = [
            "Genesis Dragon #001", "Alpha Phoenix #001", "Omega Leviathan #001"
        ];
        
        uint256[3] memory serializedSupplies = [uint256(100), uint256(50), uint256(25)];
        
        for (uint256 i = 0; i < 3; i++) {
            Card serializedCard = new Card(
                i + 34,
                serializedNames[i],
                ICard.Rarity.SERIALIZED,
                serializedSupplies[i],
                string(abi.encodePacked("ipfs://Qm", _generateHash(i + 34))),
                owner
            );
            serializedCards.push(serializedCard);
            serializedCard.addAuthorizedMinter(address(cardSet));
            cardSet.addCardContract(address(serializedCard));
        }
        
        console.log("Deployed and added Card contracts:");
        console.log("- 15 Commons");
        console.log("- 10 Uncommons");
        console.log("- 5 Rares");
        console.log("- 3 Mythicals");
        console.log("- 3 Serialized (limited supply)");
    }
    
    function _addSampleDecks(CardSet cardSet) internal {
        // === STARTER DECK ===
        address[] memory starterCardContracts = new address[](4);
        uint256[] memory starterQuantities = new uint256[](4);
        
        starterCardContracts[0] = address(commonCards[0]); // Forest Sprite
        starterQuantities[0] = 30;
        
        starterCardContracts[1] = address(uncommonCards[0]); // Storm Mage
        starterQuantities[1] = 20;
        
        starterCardContracts[2] = address(rareCards[0]); // Dragon Lord
        starterQuantities[2] = 8;
        
        starterCardContracts[3] = address(mythicalCards[0]); // Planar Sovereign
        starterQuantities[3] = 2;
        
        cardSet.addDeckType("Starter Deck", starterCardContracts, starterQuantities);
        
        // === FIRE DECK ===
        address[] memory fireCardContracts = new address[](3);
        uint256[] memory fireQuantities = new uint256[](3);
        
        fireCardContracts[0] = address(commonCards[2]); // Fire Imp
        fireQuantities[0] = 35;
        
        fireCardContracts[1] = address(commonCards[12]); // Flame Mouse
        fireQuantities[1] = 20;
        
        fireCardContracts[2] = address(uncommonCards[3]); // Phoenix Rider
        fireQuantities[2] = 5;
        
        cardSet.addDeckType("Fire Deck", fireCardContracts, fireQuantities);
        
        // === WATER DECK ===
        address[] memory waterCardContracts = new address[](3);
        uint256[] memory waterQuantities = new uint256[](3);
        
        waterCardContracts[0] = address(commonCards[3]); // Water Elemental
        waterQuantities[0] = 35;
        
        waterCardContracts[1] = address(commonCards[13]); // Wave Rider
        waterQuantities[1] = 20;
        
        waterCardContracts[2] = address(uncommonCards[4]); // Tidal Warrior
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