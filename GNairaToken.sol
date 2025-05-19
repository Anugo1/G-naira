// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title G-Naira (gNGN) Token
 * @dev Implementation of the G-Naira Central Bank Digital Currency
 * Features: ERC20 compliance, minting, burning, blacklisting, and governor role
 */
contract GNairaToken is ERC20, ERC20Burnable, Pausable, AccessControl {
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant BLACKLISTER_ROLE = keccak256("BLACKLISTER_ROLE");
    
    // Blacklisted addresses mapping
    mapping(address => bool) private _blacklisted;
    
    // Events
    event Blacklisted(address indexed account);
    event BlacklistRemoved(address indexed account);
    
    /**
     * @dev Constructor that gives the msg.sender the governor role
     */
    constructor() ERC20("G-Naira", "gNGN") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNOR_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        _grantRole(BLACKLISTER_ROLE, msg.sender);
    }
    
    /**
     * @dev Function to mint tokens
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint
     * Can only be called by addresses with MINTER_ROLE
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        require(!_blacklisted[to], "GNairaToken: receiver is blacklisted");
        _mint(to, amount);
    }
    
    /**
     * @dev Function to burn tokens
     * @param amount The amount of tokens to burn from the caller's account
     * Overrides ERC20Burnable to add blacklisting check
     */
    function burn(uint256 amount) public override {
        require(!_blacklisted[msg.sender], "GNairaToken: caller is blacklisted");
        super.burn(amount);
    }
    
    /**
     * @dev Function to burn tokens from a specified account
     * @param account The account whose tokens will be burnt
     * @param amount The amount of tokens to burn
     * Overrides ERC20Burnable to add blacklisting check
     */
    function burnFrom(address account, uint256 amount) public override onlyRole(BURNER_ROLE) {
        require(!_blacklisted[account], "GNairaToken: account is blacklisted");
        require(!_blacklisted[msg.sender], "GNairaToken: caller is blacklisted");
        super.burnFrom(account, amount);
    }
    
    /**
     * @dev Function to add an address to the blacklist
     * @param account The address to blacklist
     * Can only be called by addresses with BLACKLISTER_ROLE
     */
    function blacklist(address account) public onlyRole(BLACKLISTER_ROLE) {
        _blacklisted[account] = true;
        emit Blacklisted(account);
    }
    
    /**
     * @dev Function to remove an address from the blacklist
     * @param account The address to remove from blacklist
     * Can only be called by addresses with BLACKLISTER_ROLE
     */
    function removeFromBlacklist(address account) public onlyRole(BLACKLISTER_ROLE) {
        _blacklisted[account] = false;
        emit BlacklistRemoved(account);
    }
    
    /**
     * @dev Function to check if an address is blacklisted
     * @param account The address to check
     * @return bool True if the account is blacklisted, false otherwise
     */
    function isBlacklisted(address account) public view returns (bool) {
        return _blacklisted[account];
    }
    
    /**
     * @dev Function to pause all token transfers
     * Can only be called by addresses with GOVERNOR_ROLE
     */
    function pause() public onlyRole(GOVERNOR_ROLE) {
        _pause();
    }
    
    /**
     * @dev Function to unpause all token transfers
     * Can only be called by addresses with GOVERNOR_ROLE
     */
    function unpause() public onlyRole(GOVERNOR_ROLE) {
        _unpause();
    }
    
    // Override _beforeTokenTransfer to enable pausable functionality and enforce blacklisting
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override whenNotPaused {
        require(!_blacklisted[from], "GNairaToken: sender is blacklisted");
        require(!_blacklisted[to], "GNairaToken: receiver is blacklisted");
        super._beforeTokenTransfer(from, to, amount);
    }
}