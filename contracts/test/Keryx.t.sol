// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {SourceEngagement} from "../src/SourceEngagement.sol";
import {CampaignEscrow} from "../src/CampaignEscrow.sol";
import {AuctionHouse} from "../src/AuctionHouse.sol";
import {AttestcoinSettlement} from "../src/AttestcoinSettlement.sol";

contract KeryxTest is Test {
    MockUSDC internal token;
    SourceEngagement internal source;
    CampaignEscrow internal escrow;
    AuctionHouse internal auction;
    AttestcoinSettlement internal settlement;

    address internal advertiser = makeAddr("advertiser");
    address internal earner = makeAddr("earner");
    address internal treasury = makeAddr("treasury");

    function setUp() public {
        token = new MockUSDC();
        source = new SourceEngagement(address(this));
        escrow = new CampaignEscrow(token, address(this));
        auction = new AuctionHouse(escrow);
        settlement = new AttestcoinSettlement(escrow, treasury, address(this));

        escrow.setController(address(auction), true);
        escrow.setController(address(settlement), true);
        token.mint(advertiser, 1_000_000e6);
    }

    function testSourceEngagementIsReplayProtected() public {
        bytes32 receiptId = keccak256("receipt");
        source.recordEngagement(receiptId, 1, earner, 10, 1);
        assertTrue(source.recorded(receiptId));

        vm.expectRevert(SourceEngagement.AlreadyRecorded.selector);
        source.recordEngagement(receiptId, 1, earner, 10, 1);
    }

    function testSourceEngagementRejectsUnauthorizedRecorder() public {
        vm.prank(makeAddr("intruder"));
        vm.expectRevert(SourceEngagement.NotRecorder.selector);
        source.recordEngagement(keccak256("forged"), 1, earner, 1, 0);
    }

    function testAuctionRanksFundedCampaigns() public {
        vm.startPrank(advertiser);
        uint256 campaignId = escrow.createCampaign(keccak256("keryx-ad"));
        token.approve(address(escrow), 100e6);
        escrow.fund(campaignId, 100e6);
        auction.placeBid(campaignId, 1e6);
        vm.stopPrank();

        (uint256 winnerId, uint256 price) = auction.winner();
        assertEq(winnerId, campaignId);
        assertEq(price, 1e6);
    }

    function testSettlementControllerCanCreditClaimableBalance() public {
        escrow.setController(address(this), true);
        escrow.credit(earner, 25e6);
        assertEq(escrow.accrued(earner), 25e6);
    }
}
