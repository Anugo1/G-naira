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

    /**
     * @dev Constructor that grants the governor role to the deployer
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNOR_ROLE, msg.sender);
    }

    /**
     * @dev Modifier to restrict function to governor only
     */
    modifier onlyGovernor() {
        require(hasRole(GOVERNOR_ROLE, msg.sender), "GovernorRole: caller is not a governor");
        _;
    }

    /**
     * @dev Add a new governor
     * @param account The address to grant the governor role
     */
    function addGovernor(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(GOVERNOR_ROLE, account);
    }

    /**
     * @dev Remove a governor
     * @param account The address to revoke the governor role from
     */
    function removeGovernor(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(GOVERNOR_ROLE, account);
    }

    /**
     * @dev Check if an address has the governor role
     * @param account The address to check
     * @return True if the account has the governor role
     */
    function isGovernor(address account) external view returns (bool) {
        return hasRole(GOVERNOR_ROLE, account);
    }
} 