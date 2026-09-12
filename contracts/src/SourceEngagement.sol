// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title KeryxSourceEngagement
/// @notice Source-chain event registry consumed by the Keryx Attestcoin ASC.
/// @dev Deploy this contract on a supported source chain such as Ethereum Sepolia.
///      Creditcoin proves the resulting receipt; no server-signed settlement is trusted.
contract SourceEngagement {
    address public immutable recorder;
    mapping(bytes32 => bool) public recorded;

    event EngagementRecorded(
        bytes32 indexed receiptId,
        uint256 indexed campaignId,
        address indexed earner,
        uint256 impressions,
        uint256 clicks
    );

    error AlreadyRecorded();
    error NotRecorder();
    error ZeroRecorder();
    error ZeroEarner();
    error EmptyEngagement();

    constructor(address _recorder) {
        if (_recorder == address(0)) revert ZeroRecorder();
        recorder = _recorder;
    }

    function recordEngagement(
        bytes32 receiptId,
        uint256 campaignId,
        address earner,
        uint256 impressions,
        uint256 clicks
    ) external {
        if (msg.sender != recorder) revert NotRecorder();
        if (recorded[receiptId]) revert AlreadyRecorded();
        if (earner == address(0)) revert ZeroEarner();
        if (impressions == 0 && clicks == 0) revert EmptyEngagement();

        recorded[receiptId] = true;
        emit EngagementRecorded(receiptId, campaignId, earner, impressions, clicks);
    }
}
