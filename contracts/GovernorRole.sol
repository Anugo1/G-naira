// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title GovernorRole
 * @dev Contract for managing Governor role using OpenZeppelin's AccessControl
 */
contract GovernorRole is AccessControl {
    // Create a constant for the governor role
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

  
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNOR_ROLE, msg.sender);
    }

    modifier onlyGovernor() {
        require(hasRole(GOVERNOR_ROLE, msg.sender), "GovernorRole: caller is not a governor");
        _;
    }
//addGovernor function
    function addGovernor(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(GOVERNOR_ROLE, account);
    }

    //removeGovernor function
    function removeGovernor(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(GOVERNOR_ROLE, account);
    }


    function isGovernor(address account) external view returns (bool) {
        return hasRole(GOVERNOR_ROLE, account);
    }
} 