// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {SourceEngagement} from "../src/SourceEngagement.sol";
import {CampaignEscrow} from "../src/CampaignEscrow.sol";
import {AuctionHouse} from "../src/AuctionHouse.sol";
import {AttestcoinSettlement} from "../src/AttestcoinSettlement.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Deploys the Keryx settlement suite to a local EVM or Creditcoin.
/// @dev The source emitter is deployed here for local demonstrations. On a real
///      submission, deploy SourceEngagement on a supported source chain and set
///      SOURCE_ENGAGEMENT before deploying the Creditcoin contracts.
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address treasury = vm.envOr("TREASURY", deployer);
        address sourceEmitter = vm.envOr("SOURCE_ENGAGEMENT", address(0));
        address sourceRecorder = vm.envOr("SOURCE_RECORDER", deployer);
        address usdcAddr = vm.envOr("USDC_ADDRESS", address(0));

        vm.startBroadcast(pk);

        IERC20 usdc;
        if (usdcAddr == address(0)) {
            MockUSDC mock = new MockUSDC();
            mock.mint(deployer, 1_000_000 * 1e6);
            usdc = IERC20(address(mock));
            console2.log("MockUSDC           ", address(mock));
        } else {
            usdc = IERC20(usdcAddr);
            console2.log("USDC (existing)    ", usdcAddr);
        }

        CampaignEscrow escrow = new CampaignEscrow(usdc, deployer);
        AuctionHouse auction = new AuctionHouse(escrow);
        AttestcoinSettlement settlement = new AttestcoinSettlement(escrow, treasury, deployer);
        if (sourceEmitter == address(0)) sourceEmitter = address(new SourceEngagement(sourceRecorder));

        escrow.setController(address(auction), true);
        escrow.setController(address(settlement), true);
        settlement.setSourceEngagement(sourceEmitter);

        vm.stopBroadcast();

        console2.log("SourceEngagement    ", sourceEmitter);
        console2.log("CampaignEscrow      ", address(escrow));
        console2.log("AuctionHouse        ", address(auction));
        console2.log("AttestcoinSettlement", address(settlement));
        console2.log("treasury            ", treasury);
    }
}
