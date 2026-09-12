// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ASCBase} from "@gluwa/asc-contracts/contracts/readability/ASCBase.sol";
import {EvmV1Decoder} from "@gluwa/asc-contracts/contracts/common/EvmV1Decoder.sol";
import {CampaignEscrow} from "./CampaignEscrow.sol";
import {RevShare} from "./lib/RevShare.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Keryx Attestcoin Settlement
/// @notice Creditcoin ASC that settles source-chain engagement only after Attestcoin
///         verifies the source receipt and the registered emitter's event.
contract AttestcoinSettlement is ASCBase, Ownable {
    using RevShare for uint256;

    uint8 public constant SETTLE_ENGAGEMENT = 0;
    bytes32 public constant ENGAGEMENT_EVENT_SIGNATURE =
        keccak256("EngagementRecorded(bytes32,uint256,address,uint256,uint256)");

    CampaignEscrow public immutable escrow;
    address public treasury;
    address public sourceEngagement;

    event SourceEmitterSet(address indexed emitter);
    event TreasurySet(address indexed treasury);
    event EngagementSettled(
        bytes32 indexed queryId,
        bytes32 indexed receiptId,
        uint256 indexed campaignId,
        address earner,
        uint256 impressions,
        uint256 clicks,
        uint256 charged,
        uint256 earnerShare,
        uint256 treasuryShare
    );

    error InvalidAction(uint8 action);
    error InvalidSourceEmitter();
    error InvalidReceiptStatus();
    error MissingEngagement();
    error InvalidEngagementLog();
    error UnknownCampaign();
    error ZeroEarner();

    constructor(CampaignEscrow _escrow, address _treasury, address _owner) Ownable(_owner) {
        escrow = _escrow;
        treasury = _treasury;
    }

    function setSourceEngagement(address emitter) external onlyOwner {
        if (emitter == address(0)) revert InvalidSourceEmitter();
        sourceEngagement = emitter;
        emit SourceEmitterSet(emitter);
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
        emit TreasurySet(_treasury);
    }

    function _processAndEmitEvent(uint8 action, bytes32 queryId, bytes memory encodedTransaction)
        internal
        override
    {
        if (action != SETTLE_ENGAGEMENT) revert InvalidAction(action);

        EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceiptFields(encodedTransaction);
        if (receipt.receiptStatus != 1) revert InvalidReceiptStatus();

        EvmV1Decoder.LogEntry[] memory logs =
            EvmV1Decoder.getLogsByEventSignature(receipt, ENGAGEMENT_EVENT_SIGNATURE);
        if (logs.length == 0) revert MissingEngagement();

        EvmV1Decoder.LogEntry memory log = logs[0];
        if (log.address_ != sourceEngagement || log.topics.length != 4 || log.data.length != 64) {
            revert InvalidEngagementLog();
        }

        bytes32 receiptId = log.topics[1];
        uint256 campaignId = uint256(log.topics[2]);
        address earner = address(uint160(uint256(log.topics[3])));
        (uint256 impressions, uint256 clicks) = abi.decode(log.data, (uint256, uint256));

        if (earner == address(0)) revert ZeroEarner();
        if (escrow.campaignBalance(campaignId) == 0 || escrow.pricePerBlock(campaignId) == 0) {
            revert UnknownCampaign();
        }

        uint256 cost = RevShare.cost(impressions, clicks, escrow.pricePerBlock(campaignId));
        uint256 charged = cost > escrow.campaignBalance(campaignId) ? escrow.campaignBalance(campaignId) : cost;
        uint256 earnerShare;
        uint256 treasuryShare;

        if (charged > 0) {
            escrow.charge(campaignId, charged);
            (earnerShare, treasuryShare) = RevShare.split(charged);
            if (earnerShare > 0) escrow.credit(earner, earnerShare);
            if (treasuryShare > 0) escrow.credit(treasury, treasuryShare);
        }

        emit EngagementSettled(
            queryId,
            receiptId,
            campaignId,
            earner,
            impressions,
            clicks,
            charged,
            earnerShare,
            treasuryShare
        );
    }
}
