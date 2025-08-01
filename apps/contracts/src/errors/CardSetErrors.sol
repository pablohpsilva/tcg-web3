// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CardSetErrors
 * @dev Custom errors for the CardSet contract system
 */
library CardSetErrors {
    // Access Control Errors
    error NotOwner();
    error NotAuthorized();
    
    // Emission and Supply Errors
    error EmissionCapExceeded();
    error EmissionCapReached();
    error InvalidEmissionCap();
    error InvalidEmissionCapForPackSize(uint256 provided, uint256 suggestedLower, uint256 suggestedHigher);
    error SerializedCardCapExceeded(uint256 cardId, uint256 requested, uint256 available);
    
    // Card Management Errors
    error CardNotFound(uint256 cardId);
    error CardAlreadyExists(uint256 cardId);
    error InvalidCardData();
    error InvalidRarity();
    error InvalidMaxSupply();
    
    // Deck Management Errors
    error DeckTypeNotFound(string deckType);
    error DeckTypeAlreadyExists(string deckType);
    error DeckTypeInactive(string deckType);
    error InvalidDeckData();
    error CardQuantityMismatch();
    error EmptyDeck();
    
    // Pack Opening Errors
    error InsufficientPayment(uint256 required, uint256 provided);
    error PackOpeningFailed();
    error NoCardsAvailable();
    error RandomnessNotReady();
    
    // VRF Errors
    error VRFRequestFailed();
    error InvalidVRFResponse();
    error VRFCallbackFailed();
    
    // General Errors
    error ZeroAddress();
    error InvalidPrice();
    error WithdrawFailed();
    error ContractPaused();
    error InvalidArrayLength();
    error InvalidParameter();
    
    // ============ Additional Errors for New Features ============
    
    error InvalidSetName();
    error InvalidCardContract();
    error SetIsLocked();
    error InvalidDeckName();
    error DeckAlreadyExists();
    error DeckNotFound();
    error NoFundsToWithdraw();
    error InvalidVRFCoordinator();
} 