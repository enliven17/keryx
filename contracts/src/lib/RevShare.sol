// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title RevShare
/// @notice Pure economic math for Keryx: per-event cost and the earner/treasury split.
/// @dev One "block" = IMPRESSIONS_PER_BLOCK impressions; an advertiser's bid is a
///      price *per block* denominated in USDC base units (6 decimals). A click is
///      billed at CLICK_WEIGHT impression-equivalents. The developer keeps DEV_BPS.
library RevShare {
    /// 1 block = 1,000 five-second impressions (matches the spec's auction unit).
    uint256 internal constant IMPRESSIONS_PER_BLOCK = 1_000;

    /// A click is worth 50 impressions.
    uint256 internal constant CLICK_WEIGHT = 50;

    /// Developer share in basis points (50%). Remainder goes to the treasury.
    uint256 internal constant DEV_BPS = 5_000;
    uint256 internal constant BPS_DENOMINATOR = 10_000;

    /// @notice Cost in USDC base units for a batch of impressions + clicks at `pricePerBlock`.
    /// @dev impression-equivalents = impressions + clicks*50; cost = units * price / 1000.
    ///      Integer division floors; callers cap to the campaign's remaining balance.
    function cost(uint256 impressions, uint256 clicks, uint256 pricePerBlock)
        internal
        pure
        returns (uint256)
    {
        uint256 units = impressions + (clicks * CLICK_WEIGHT);
        return (units * pricePerBlock) / IMPRESSIONS_PER_BLOCK;
    }

    /// @notice Split a charged amount into the developer's share and the treasury's share.
    /// @return devShare amount credited to the human-backed earner.
    /// @return treasuryShare remainder credited to the protocol treasury.
    function split(uint256 amount) internal pure returns (uint256 devShare, uint256 treasuryShare) {
        devShare = (amount * DEV_BPS) / BPS_DENOMINATOR;
        treasuryShare = amount - devShare;
    }
}
