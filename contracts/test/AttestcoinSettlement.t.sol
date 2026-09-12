// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {EvmV1Decoder} from "@gluwa/asc-contracts/contracts/common/EvmV1Decoder.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {CampaignEscrow} from "../src/CampaignEscrow.sol";
import {AuctionHouse} from "../src/AuctionHouse.sol";
import {AttestcoinSettlement} from "../src/AttestcoinSettlement.sol";
import {RevShare} from "../src/lib/RevShare.sol";

/// Exposes the ASC handler that `ASCBase.execute` calls once the Creditcoin
/// precompile has verified the source receipt.
contract SettlementHarness is AttestcoinSettlement {
    constructor(CampaignEscrow e, address t, address o) AttestcoinSettlement(e, t, o) {}

    function process(uint8 action, bytes32 queryId, bytes calldata encodedTransaction) external {
        _processAndEmitEvent(action, queryId, encodedTransaction);
    }
}

contract AttestcoinSettlementTest is Test {
    MockUSDC internal token;
    CampaignEscrow internal escrow;
    AuctionHouse internal auction;
    SettlementHarness internal settlement;

    address internal advertiser = makeAddr("advertiser");
    address internal earner = makeAddr("earner");
    address internal treasury = makeAddr("treasury");
    address internal sourceEmitter = makeAddr("sourceEmitter");

    uint256 internal campaignId;
    uint256 internal constant PRICE_PER_BLOCK = 1e6;

    function setUp() public {
        token = new MockUSDC();
        escrow = new CampaignEscrow(token, address(this));
        auction = new AuctionHouse(escrow);
        settlement = new SettlementHarness(escrow, treasury, address(this));
        escrow.setController(address(auction), true);
        escrow.setController(address(settlement), true);
        settlement.setSourceEngagement(sourceEmitter);

        token.mint(advertiser, 1_000e6);
        vm.startPrank(advertiser);
        campaignId = escrow.createCampaign(keccak256("creative"));
        token.approve(address(escrow), 100e6);
        escrow.fund(campaignId, 100e6);
        auction.placeBid(campaignId, PRICE_PER_BLOCK);
        vm.stopPrank();
    }

    function testSettlesProvenEngagement() public {
        uint256 impressions = 1_000;
        uint256 clicks = 2;
        uint256 expectedCost = RevShare.cost(impressions, clicks, PRICE_PER_BLOCK);
        (uint256 expectedEarner, uint256 expectedTreasury) = RevShare.split(expectedCost);

        settlement.process(0, keccak256("query"), _receipt(sourceEmitter, 1, impressions, clicks));

        assertEq(escrow.accrued(earner), expectedEarner);
        assertEq(escrow.accrued(treasury), expectedTreasury);
        assertEq(escrow.campaignBalance(campaignId), 100e6 - expectedCost);
        assertEq(expectedEarner, expectedTreasury, "50/50 revenue share");
    }

    function testChargeIsCappedByCampaignBalance() public {
        settlement.process(0, keccak256("query"), _receipt(sourceEmitter, 1, 1_000_000, 0));

        assertEq(escrow.campaignBalance(campaignId), 0);
        assertEq(escrow.accrued(earner) + escrow.accrued(treasury), 100e6);
    }

    function testRejectsLogFromForeignEmitter() public {
        bytes memory encoded = _receipt(makeAddr("impostor"), 1, 10, 0);
        vm.expectRevert(AttestcoinSettlement.InvalidEngagementLog.selector);
        settlement.process(0, keccak256("query"), encoded);
    }

    function testRejectsFailedSourceReceipt() public {
        bytes memory encoded = _receipt(sourceEmitter, 0, 10, 0);
        vm.expectRevert(AttestcoinSettlement.InvalidReceiptStatus.selector);
        settlement.process(0, keccak256("query"), encoded);
    }

    function testRejectsUnknownAction() public {
        bytes memory encoded = _receipt(sourceEmitter, 1, 10, 0);
        vm.expectRevert(abi.encodeWithSelector(AttestcoinSettlement.InvalidAction.selector, uint8(7)));
        settlement.process(7, keccak256("query"), encoded);
    }

    function testRejectsReceiptWithoutEngagementLog() public {
        EvmV1Decoder.LogEntryTuple[] memory logs = new EvmV1Decoder.LogEntryTuple[](0);
        vm.expectRevert(AttestcoinSettlement.MissingEngagement.selector);
        settlement.process(0, keccak256("query"), _encode(1, logs));
    }

    function testRejectsUnfundedCampaign() public {
        EvmV1Decoder.LogEntryTuple[] memory logs = new EvmV1Decoder.LogEntryTuple[](1);
        logs[0] = _engagementLog(sourceEmitter, 999, 10, 0);
        vm.expectRevert(AttestcoinSettlement.UnknownCampaign.selector);
        settlement.process(0, keccak256("query"), _encode(1, logs));
    }

    /// Builds prover `txBytes` for a type-2 transaction carrying one engagement log.
    function _receipt(address emitter, uint8 status, uint256 impressions, uint256 clicks)
        internal
        view
        returns (bytes memory)
    {
        EvmV1Decoder.LogEntryTuple[] memory logs = new EvmV1Decoder.LogEntryTuple[](1);
        logs[0] = _engagementLog(emitter, campaignId, impressions, clicks);
        return _encode(status, logs);
    }

    function _engagementLog(address emitter, uint256 id, uint256 impressions, uint256 clicks)
        internal
        view
        returns (EvmV1Decoder.LogEntryTuple memory)
    {
        bytes32[] memory topics = new bytes32[](4);
        topics[0] = settlement.ENGAGEMENT_EVENT_SIGNATURE();
        topics[1] = keccak256("receipt");
        topics[2] = bytes32(id);
        topics[3] = bytes32(uint256(uint160(earner)));
        return EvmV1Decoder.LogEntryTuple({
            address_: emitter,
            topics: topics,
            data: abi.encode(impressions, clicks)
        });
    }

    /// `abi.encode(uint8 txType, bytes[] chunks)` with chunk[2] holding the receipt.
    function _encode(uint8 status, EvmV1Decoder.LogEntryTuple[] memory logs) internal pure returns (bytes memory) {
        bytes[] memory chunks = new bytes[](3);
        chunks[0] = abi.encode(uint64(0), uint64(21_000), address(0), false, address(0), uint256(0), bytes(""));
        chunks[1] = abi.encode(uint64(11155111), uint128(0), uint128(0), new bytes(0), uint8(0), bytes32(0), bytes32(0));
        chunks[2] = abi.encode(status, uint64(21_000), logs, bytes(""));
        return abi.encode(uint8(2), chunks);
    }
}
