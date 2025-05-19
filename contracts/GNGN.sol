// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./GovernorRole.sol";

/**
 * @title G-Naira (gNGN)
 * @dev Implementation of the G-Naira CBDC
 * Includes:
 * - ERC20 token functionality
 * - Mint and burn capabilities for authorized governors
 * - Blacklisting functionality
 * - Secured by GovernorRole access control
 */
contract GNGN is ERC20, GovernorRole {
    // Mapping to track blacklisted addresses
    mapping(address => bool) private _blacklisted;

    // Events for blacklisting
    event Blacklisted(address indexed account);
    event Unblacklisted(address indexed account);

    /**
     * @dev Constructor that initializes the token with name and symbol
     */
    constructor() ERC20("G-Naira", "gNGN") {
        // Contract is initialized with no supply
        // Tokens will be minted by governors
    }

    /**
     * @dev Mint new tokens
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyGovernor {
        require(!_blacklisted[to], "GNGN: recipient is blacklisted");
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens
     * @param from The address from which to burn tokens
     * @param amount The amount of tokens to burn
     */
    function burn(address from, uint256 amount) external onlyGovernor {
        _burn(from, amount);
    }

    /**
     * @dev Add an address to blacklist
     * @param account The address to blacklist
     */
    function blacklist(address account) external onlyGovernor {
        require(!_blacklisted[account], "GNGN: account is already blacklisted");
        _blacklisted[account] = true;
        emit Blacklisted(account);
    }

    /**
     * @dev Remove an address from blacklist
     * @param account The address to remove from blacklist
     */
    function unblacklist(address account) external onlyGovernor {
        require(_blacklisted[account], "GNGN: account is not blacklisted");
        _blacklisted[account] = false;
        emit Unblacklisted(account);
    }

    /**
     * @dev Check if an address is blacklisted
     * @param account The address to check
     * @return True if the account is blacklisted
     */
    function isBlacklisted(address account) external view returns (bool) {
        return _blacklisted[account];
    }

    /**
     * @dev Override _update to prevent blacklisted addresses from sending or receiving tokens
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        // Check blacklist before transfer
        if (from != address(0)) {  // Skip check during minting
            require(!_blacklisted[from], "GNGN: sender is blacklisted");
        }
        
        if (to != address(0)) {  // Skip check during burning
            require(!_blacklisted[to], "GNGN: recipient is blacklisted");
        }
        
        super._update(from, to, amount);
    }
} 