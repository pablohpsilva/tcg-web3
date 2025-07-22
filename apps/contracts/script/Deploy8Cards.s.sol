// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/Card.sol";
import "../src/interfaces/ICard.sol";

/**
 * @title Deploy8Cards - Deploy first 8 cards from Limited Edition Alpha
 * @dev Deploys 8 individual Card contracts based on extracted MTG data
 */
contract Deploy8Cards is Script {
    
    // Card data extracted from scripts/extracted-cards.json
    struct CardData {
        uint256 cardId;
        string name;
        uint8 rarity;
        uint256 maxSupply;
        string baseURI;
    }
    
    // Array to store deployed card addresses
    address[] public deployedCards;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying 8 cards with deployer:", deployer);
        console.log("Deployer balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy all 8 cards from the extracted data
        _deployAllCards(deployer);
        
        vm.stopBroadcast();
        
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("Total cards deployed:", deployedCards.length);
        console.log("First card address:", deployedCards[0]);
        console.log("Last card address:", deployedCards[deployedCards.length - 1]);
    }
    
    function _deployAllCards(address owner) internal {
        CardData[8] memory cards = _getCardData();
        
        for (uint256 i = 0; i < cards.length; i++) {
            CardData memory cardData = cards[i];
            
            console.log("Deploying card #%s: %s", cardData.cardId, cardData.name);
            
            Card newCard = new Card(
                cardData.cardId,
                cardData.name,
                ICard.Rarity(cardData.rarity),
                cardData.maxSupply,
                cardData.baseURI,
                owner
            );
            
            deployedCards.push(address(newCard));
            
            console.log("Card deployed at:", address(newCard));
        }
    }
    
    function _getCardData() internal pure returns (CardData[8] memory) {
        CardData[8] memory cards;
        
        // First 8 cards from Limited Edition Alpha extracted data
        cards[0] = CardData(1, "Animate Wall", 2, 0, "https://api.tcg-magic.com/cards/LEA");
        cards[1] = CardData(2, "Armageddon", 2, 0, "https://api.tcg-magic.com/cards/LEA");
        cards[2] = CardData(3, "Balance", 2, 0, "https://api.tcg-magic.com/cards/LEA");
        cards[3] = CardData(4, "Benalish Hero", 0, 0, "https://api.tcg-magic.com/cards/LEA");
        cards[4] = CardData(5, "Black Ward", 1, 0, "https://api.tcg-magic.com/cards/LEA");
        cards[5] = CardData(6, "Blaze of Glory", 2, 0, "https://api.tcg-magic.com/cards/LEA");
        cards[6] = CardData(7, "Blessing", 2, 0, "https://api.tcg-magic.com/cards/LEA");
        cards[7] = CardData(8, "Blue Ward", 1, 0, "https://api.tcg-magic.com/cards/LEA");
        
        return cards;
    }
} 