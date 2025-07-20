// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockVRFCoordinator
 * @dev Mock VRF Coordinator for testing purposes
 * @notice This is for testing only - use real Chainlink VRF in production
 */
contract MockVRFCoordinator {
    uint256 private _requestIdCounter = 1;
    mapping(uint256 => address) private _requesters;
    
    event RandomWordsRequested(
        bytes32 indexed keyHash,
        uint256 requestId,
        uint256 preSeed,
        uint64 indexed subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords,
        address indexed sender
    );

    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256 requestId) {
        requestId = _requestIdCounter++;
        _requesters[requestId] = msg.sender;
        
        emit RandomWordsRequested(
            keyHash,
            requestId,
            0, // preSeed
            subId,
            minimumRequestConfirmations,
            callbackGasLimit,
            numWords,
            msg.sender
        );

        return requestId;
    }

    function _fulfillRandomWords(uint256 requestId, uint32 numWords) internal {
        address requester = _requesters[requestId];
        require(requester != address(0), "Invalid request ID");
        
        uint256[] memory randomWords = new uint256[](numWords);
        for (uint32 i = 0; i < numWords; i++) {
            // Generate pseudo-random numbers for testing
            // DO NOT use this in production!
            randomWords[i] = uint256(keccak256(abi.encodePacked(
                block.timestamp,
                block.prevrandao,
                requestId,
                i,
                msg.sender
            )));
        }
        
        IVRFConsumer(requester).rawFulfillRandomWords(requestId, randomWords);
    }

    // Manual fulfillment function for testing
    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external {
        address requester = _requesters[requestId];
        require(requester != address(0), "Invalid request ID");
        
        IVRFConsumer(requester).rawFulfillRandomWords(requestId, randomWords);
    }

    // Auto fulfill function for testing
    function autoFulfillRequest(uint256 requestId, uint32 numWords) external {
        _fulfillRandomWords(requestId, numWords);
    }

    // Get the last request ID for testing
    function getLastRequestId() external view returns (uint256) {
        return _requestIdCounter - 1;
    }

    // Get requester for a request ID
    function getRequester(uint256 requestId) external view returns (address) {
        return _requesters[requestId];
    }
}

interface IVRFConsumer {
    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external;
} 