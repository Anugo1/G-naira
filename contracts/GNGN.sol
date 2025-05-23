// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./GovernorRole.sol";


contract GNGN is ERC20, GovernorRole, Pausable {
    // Mapping to track blacklisted addresses
    mapping(address => bool) private _blacklisted;

    // Rate limiting variables
    uint256 public constant RATE_LIMIT_PERIOD = 24 hours;
    uint256 public constant MAX_MINT_PER_PERIOD = 1000000 * 10**18; // 1 million tokens per day
    uint256 public constant MAX_BURN_PER_PERIOD = 1000000 * 10**18; // 1 million tokens per day
    uint256 public mintedInCurrentPeriod;
    uint256 public burnedInCurrentPeriod;
    uint256 public lastRateLimitReset;

    // Maximum supply cap
    uint256 public constant MAX_SUPPLY = 1000000000 * 10**18; // 1 billion tokens

    // Events for blacklisting
    event Blacklisted(address indexed account);
    event Unblacklisted(address indexed account);
    event RateLimitReset(uint256 timestamp);
    event EmergencyPaused(address indexed by);
    event EmergencyUnpaused(address indexed by);

    
    constructor() ERC20("G-Naira", "gNGN") {
        lastRateLimitReset = block.timestamp;
    }


    modifier checkRateLimit(uint256 amount, bool isMint) {
        if (block.timestamp >= lastRateLimitReset + RATE_LIMIT_PERIOD) {
            mintedInCurrentPeriod = 0;
            burnedInCurrentPeriod = 0;
            lastRateLimitReset = block.timestamp;
            emit RateLimitReset(block.timestamp);
        }

        if (isMint) {
            require(mintedInCurrentPeriod + amount <= MAX_MINT_PER_PERIOD, "GNGN: mint rate limit exceeded");
            mintedInCurrentPeriod += amount;
        } else {
            require(burnedInCurrentPeriod + amount <= MAX_BURN_PER_PERIOD, "GNGN: burn rate limit exceeded");
            burnedInCurrentPeriod += amount;
        }
        _;
    }

   
    function mint(address to, uint256 amount) external onlyGovernor whenNotPaused checkRateLimit(amount, true) {
        require(!_blacklisted[to], "GNGN: recipient is blacklisted");
        require(totalSupply() + amount <= MAX_SUPPLY, "GNGN: would exceed max supply");
        _mint(to, amount);
    }

   //burn function
  
    function burn(address from, uint256 amount) external onlyGovernor whenNotPaused checkRateLimit(amount, false) {
        _burn(from, amount);
    }

  //blacklist function
    function blacklist(address account) external onlyGovernor {
        require(!_blacklisted[account], "GNGN: account is already blacklisted");
        _blacklisted[account] = true;
        emit Blacklisted(account);
    }

    //unblacklist function
    function unblacklist(address account) external onlyGovernor {
        require(_blacklisted[account], "GNGN: account is not blacklisted");
        _blacklisted[account] = false;
        emit Unblacklisted(account);
    }

    //isBlacklisted function
    function isBlacklisted(address account) external view returns (bool) {
        return _blacklisted[account];
    }

    //pause function
    function pause() external onlyGovernor {
        _pause();
        emit EmergencyPaused(msg.sender);
    }


    function unpause() external onlyGovernor {
        _unpause();
        emit EmergencyUnpaused(msg.sender);
    }

   //_beforeTokenTransfer function
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        require(!paused(), "Pausable: paused");
        
        if (from != address(0)) {  
            require(!_blacklisted[from], "GNGN: sender is blacklisted");
        }
        if (to != address(0)) { 
            require(!_blacklisted[to], "GNGN: recipient is blacklisted");
        }
        super._beforeTokenTransfer(from, to, amount);
    }

   
    function getRateLimitStatus() external view returns (
        uint256 minted,
        uint256 burned,
        uint256 timeUntilReset
    ) {
        uint256 resetTime = lastRateLimitReset + RATE_LIMIT_PERIOD;
        timeUntilReset = block.timestamp >= resetTime ? 0 : resetTime - block.timestamp;
        return (mintedInCurrentPeriod, burnedInCurrentPeriod, timeUntilReset);
    }
} 