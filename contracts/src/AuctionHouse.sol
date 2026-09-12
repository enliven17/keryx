// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CampaignEscrow} from "./CampaignEscrow.sol";

/// @title AuctionHouse
/// @notice English-ascending auction deciding ad placement. Each campaign carries a
///         standing bid (price per block); advertisers must *raise* to re-bid. The ad
///         server serves the highest standing bid among funded, active campaigns. Bids
///         are written through to {CampaignEscrow} so AttestcoinSettlement charges at the live price.
/// @dev "Escrowed bids" = the campaign's funded USDC balance in CampaignEscrow; this
///      contract never custodies tokens, it only ranks. A bid requires the campaign to be
///      funded for at least one block at the bid price (so a winning ad can actually deliver).
contract AuctionHouse {
    CampaignEscrow public immutable escrow;

    uint256 internal constant IMPRESSIONS_PER_BLOCK = 1_000;

    /// All campaign ids that have ever placed a bid (for off-chain auction board rendering).
    uint256[] public bidders;
    mapping(uint256 => bool) internal seen;
    mapping(uint256 => uint256) public bidOf; // campaignId => current pricePerBlock

    event BidPlaced(uint256 indexed campaignId, address indexed advertiser, uint256 pricePerBlock);

    error NotAdvertiser();
    error MustOutbidSelf();
    error UnderfundedForBid();

    constructor(CampaignEscrow _escrow) {
        escrow = _escrow;
    }

    /// @notice Place or raise the standing bid for a campaign.
    /// @param campaignId the advertiser's campaign.
    /// @param pricePerBlock USDC base units per 1,000 impressions; must exceed the prior bid.
    function placeBid(uint256 campaignId, uint256 pricePerBlock) external {
        (address advertiser, uint256 balance,,,) = escrow.campaigns(campaignId);
        if (advertiser != msg.sender) revert NotAdvertiser();

        uint256 prior = bidOf[campaignId];
        if (pricePerBlock <= prior) revert MustOutbidSelf();
        // Must be able to deliver at least one block at this price.
        if (balance < pricePerBlock) revert UnderfundedForBid();

        bidOf[campaignId] = pricePerBlock;
        if (!seen[campaignId]) {
            seen[campaignId] = true;
            bidders.push(campaignId);
        }
        escrow.setBid(campaignId, pricePerBlock);
        emit BidPlaced(campaignId, msg.sender, pricePerBlock);
    }

    /// @notice The current winner: highest standing bid among active, still-fundable campaigns.
    /// @return winnerId 0 if no eligible campaign.
    /// @return winningPrice the clearing price per block (0 if none).
    function winner() public view returns (uint256 winnerId, uint256 winningPrice) {
        uint256 n = bidders.length;
        for (uint256 i = 0; i < n; i++) {
            uint256 id = bidders[i];
            (, uint256 balance,,, bool active) = escrow.campaigns(id);
            uint256 price = bidOf[id];
            // still fundable for at least one block and active
            if (active && price > winningPrice && balance >= price) {
                winningPrice = price;
                winnerId = id;
            }
        }
    }

    function biddersCount() external view returns (uint256) {
        return bidders.length;
    }

    /// @notice Full standing-bid board for the dashboard (campaignId, advertiser, bid, balance, active).
    function board()
        external
        view
        returns (
            uint256[] memory ids,
            address[] memory advertisers,
            uint256[] memory prices,
            uint256[] memory balances,
            bool[] memory actives
        )
    {
        uint256 n = bidders.length;
        ids = new uint256[](n);
        advertisers = new address[](n);
        prices = new uint256[](n);
        balances = new uint256[](n);
        actives = new bool[](n);
        for (uint256 i = 0; i < n; i++) {
            uint256 id = bidders[i];
            (address adv, uint256 bal,,, bool act) = escrow.campaigns(id);
            ids[i] = id;
            advertisers[i] = adv;
            prices[i] = bidOf[id];
            balances[i] = bal;
            actives[i] = act;
        }
    }
}
