// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SourceEngagement} from "../src/SourceEngagement.sol";

/// @notice Deploys only the source-chain event emitter used by Attestcoin.
contract DeploySource is Script {
    function run() external returns (SourceEngagement source) {
        uint256 pk = vm.envUint("SOURCE_PRIVATE_KEY");
        address recorder = vm.envOr("SOURCE_RECORDER", vm.addr(pk));

        vm.startBroadcast(pk);
        source = new SourceEngagement(recorder);
        vm.stopBroadcast();

        console2.log("SourceEngagement", address(source));
        console2.log("recorder        ", recorder);
    }
}
