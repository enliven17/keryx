// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title CampaignEscrow
/// @notice The Keryx vault. Holds all ERC20 campaign funds, tracks per-campaign balances and
///         per-earner claimable accruals. Advertisers create/fund/refund campaigns;
///         authorized controllers (AuctionHouse sets bids, AttestcoinSettlement charges & credits);
///         earners and the treasury claim non-custodially at any time, any amount.
/// @dev USDC is plain ERC20 on anvil (MockUSDC) and an ERC20-compatible settlement token.
contract CampaignEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Campaign {
        address advertiser;
        uint256 balance; // remaining funded USDC (base units)
        uint256 pricePerBlock; // current winning bid, set by AuctionHouse
        bytes32 creativeHash; // commitment to ad text + destination URL
        bool active;
    }

    IERC20 public immutable usdc;

    uint256 public nextCampaignId = 1;
    mapping(uint256 => Campaign) public campaigns;

    /// Claimable USDC per address for earners and the protocol treasury.
    mapping(address => uint256) public accrued;

    /// Addresses allowed to set bids / charge / credit (AuctionHouse, AttestcoinSettlement).
    mapping(address => bool) public controllers;

    event CampaignCreated(uint256 indexed campaignId, address indexed advertiser, bytes32 creativeHash);
    event CampaignFunded(uint256 indexed campaignId, address indexed from, uint256 amount, uint256 newBalance);
    event CampaignRefunded(uint256 indexed campaignId, address indexed to, uint256 amount, uint256 newBalance);
    event CampaignClosed(uint256 indexed campaignId);
    event BidSet(uint256 indexed campaignId, uint256 pricePerBlock);
    event Charged(uint256 indexed campaignId, uint256 amount, uint256 newBalance);
    event Credited(address indexed account, uint256 amount, uint256 newAccrued);
    event Claimed(address indexed account, address indexed to, uint256 amount);
    event ControllerSet(address indexed controller, bool enabled);

    error NotAdvertiser();
    error NotController();
    error UnknownCampaign();
    error InsufficientBalance();
    error InsufficientAccrued();
    error ZeroAmount();

    modifier onlyController() {
        if (!controllers[msg.sender]) revert NotController();
        _;
    }

    constructor(IERC20 _usdc, address _owner) Ownable(_owner) {
        usdc = _usdc;
    }

    // ─── Admin ──────────────────────────────────────────────────────────────

    function setController(address controller, bool enabled) external onlyOwner {
        controllers[controller] = enabled;
        emit ControllerSet(controller, enabled);
    }

    // ─── Advertiser ─────────────────────────────────────────────────────────

    function createCampaign(bytes32 creativeHash) external returns (uint256 id) {
        id = nextCampaignId++;
        campaigns[id] =
            Campaign({advertiser: msg.sender, balance: 0, pricePerBlock: 0, creativeHash: creativeHash, active: true});
        emit CampaignCreated(id, msg.sender, creativeHash);
    }

    function fund(uint256 campaignId, uint256 amount) external nonReentrant {
        Campaign storage c = campaigns[campaignId];
        if (c.advertiser == address(0)) revert UnknownCampaign();
        if (amount == 0) revert ZeroAmount();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        c.balance += amount;
        emit CampaignFunded(campaignId, msg.sender, amount, c.balance);
    }

    function refund(uint256 campaignId, uint256 amount) external nonReentrant {
        Campaign storage c = campaigns[campaignId];
        if (c.advertiser != msg.sender) revert NotAdvertiser();
        if (amount == 0) revert ZeroAmount();
        if (amount > c.balance) revert InsufficientBalance();
        c.balance -= amount;
        usdc.safeTransfer(msg.sender, amount);
        emit CampaignRefunded(campaignId, msg.sender, amount, c.balance);
    }

    function closeCampaign(uint256 campaignId) external {
        Campaign storage c = campaigns[campaignId];
        if (c.advertiser != msg.sender) revert NotAdvertiser();
        c.active = false;
        emit CampaignClosed(campaignId);
    }

    // ─── Controller (AuctionHouse / AttestcoinSettlement) ───────────────────────────────

    function setBid(uint256 campaignId, uint256 price) external onlyController {
        Campaign storage c = campaigns[campaignId];
        if (c.advertiser == address(0)) revert UnknownCampaign();
        c.pricePerBlock = price;
        emit BidSet(campaignId, price);
    }

    /// @notice Move `amount` out of a campaign's funded balance (AttestcoinSettlement charges delivery).
    function charge(uint256 campaignId, uint256 amount) external onlyController {
        Campaign storage c = campaigns[campaignId];
        if (c.advertiser == address(0)) revert UnknownCampaign();
        if (amount > c.balance) revert InsufficientBalance();
        c.balance -= amount;
        emit Charged(campaignId, amount, c.balance);
    }

    /// @notice Credit claimable USDC to an earner or the treasury (already held by the vault).
    function credit(address account, uint256 amount) external onlyController {
        accrued[account] += amount;
        emit Credited(account, amount, accrued[account]);
    }

    // ─── Earner / treasury ────────────────────────────────────────────────────

    function claim(uint256 amount) external nonReentrant {
        _claim(msg.sender, amount);
    }

    function claimAll() external nonReentrant {
        _claim(msg.sender, accrued[msg.sender]);
    }

    function _claim(address account, uint256 amount) internal {
        if (amount == 0) revert ZeroAmount();
        if (amount > accrued[account]) revert InsufficientAccrued();
        accrued[account] -= amount;
        usdc.safeTransfer(account, amount);
        emit Claimed(account, account, amount);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function campaignBalance(uint256 campaignId) external view returns (uint256) {
        return campaigns[campaignId].balance;
    }

    function pricePerBlock(uint256 campaignId) external view returns (uint256) {
        return campaigns[campaignId].pricePerBlock;
    }
}
