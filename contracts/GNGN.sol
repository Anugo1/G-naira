// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

//GNGN contract
contract GNGN is ERC20, AccessControl, Pausable {
    // Create a constant for the governor role
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    
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

    // Multi-signature functionality
    mapping(address => bool) public isSigner;
    uint256 public requiredConfirmations;
    address[] public signers;
    
    // Transaction struct for multi-sig operations
    struct Transaction {
        address target;
        uint256 amount;
        bool isMint;
        bool executed;
        uint256 confirmations;
    }
    
    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => mapping(address => bool)) public transactionConfirmations;
    uint256 public transactionCount;

    // Events for blacklisting
    event Blacklisted(address indexed account);
    event Unblacklisted(address indexed account);
    event RateLimitReset(uint256 timestamp);
    event EmergencyPaused(address indexed by);
    event EmergencyUnpaused(address indexed by);
    
    // Events for multi-signature operations
    event TransactionSubmitted(uint256 indexed txIndex, address indexed target, uint256 amount, bool isMint);
    event TransactionConfirmed(address indexed signer, uint256 indexed txIndex);
    event TransactionExecuted(uint256 indexed txIndex);
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    
    // Events for governor role management
    event GovernorAdded(address indexed account);
    event GovernorRemoved(address indexed account);

    // Modifiers
    modifier onlyGovernor() {
        require(hasRole(GOVERNOR_ROLE, msg.sender), "GNGN: caller is not a governor");
        _;
    }
    
    modifier onlySigner() {
        require(isSigner[msg.sender], "GNGN: caller is not a signer");
        _;
    }
    
    modifier txExists(uint256 _txIndex) {
        require(_txIndex < transactionCount, "GNGN: transaction does not exist");
        _;
    }
    
    modifier notExecuted(uint256 _txIndex) {
        require(!transactions[_txIndex].executed, "GNGN: transaction already executed");
        _;
    }
    
    modifier notConfirmed(uint256 _txIndex) {
        require(!transactionConfirmations[_txIndex][msg.sender], "GNGN: transaction already confirmed by signer");
        _;
    }

   
    constructor() ERC20("G-Naira", "gNGN") {
        lastRateLimitReset = block.timestamp;
        
        // Grant roles to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNOR_ROLE, msg.sender);
        
        // Mint initial supply to deployer (10% of max supply)
        uint256 initialSupply = MAX_SUPPLY / 10; // 100 million tokens
        _mint(msg.sender, initialSupply);
        
        // Update rate limit tracking
        mintedInCurrentPeriod = initialSupply > MAX_MINT_PER_PERIOD ? 
            MAX_MINT_PER_PERIOD : initialSupply;
            
        emit GovernorAdded(msg.sender);
    }
//setupMultiSig function
    function setupMultiSig(
        address[] memory _signers,
        uint256 _requiredConfirmations
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_signers.length > 0, "GNGN: signers required");
        require(_requiredConfirmations > 0 && _requiredConfirmations <= _signers.length, 
                "GNGN: invalid required confirmations");
        require(signers.length == 0, "GNGN: multi-sig already initialized");
        
        // Set up signers
        for (uint256 i = 0; i < _signers.length; i++) {
            address signer = _signers[i];
            
            require(signer != address(0), "GNGN: invalid signer address");
            require(!isSigner[signer], "GNGN: signer not unique");
            
            isSigner[signer] = true;
            signers.push(signer);
            
            emit SignerAdded(signer);
        }
        
        requiredConfirmations = _requiredConfirmations;
    }

    //checkRateLimit modifier
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

  //addGovernor function
    function addGovernor(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(GOVERNOR_ROLE, account);
        emit GovernorAdded(account);
    }


    function removeGovernor(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(GOVERNOR_ROLE, account);
        emit GovernorRemoved(account);
    }

 
    function isGovernor(address account) external view returns (bool) {
        return hasRole(GOVERNOR_ROLE, account);
    }

    
    function submitMintTransaction(address _target, uint256 _amount) 
        public
        onlySigner
        returns (uint256 txIndex)
    {
        require(signers.length > 0, "GNGN: multi-sig not initialized");
        txIndex = transactionCount;
        
        transactions[txIndex] = Transaction({
            target: _target,
            amount: _amount,
            isMint: true,
            executed: false,
            confirmations: 0
        });
        
        transactionCount += 1;
        
        emit TransactionSubmitted(txIndex, _target, _amount, true);
        
        // Auto-confirm by submitter
        confirmTransaction(txIndex);
        
        return txIndex;
    }
    
    
    function submitBurnTransaction(address _target, uint256 _amount) 
        public
        onlySigner
        returns (uint256 txIndex)
    {
        require(signers.length > 0, "GNGN: multi-sig not initialized");
        txIndex = transactionCount;
        
        transactions[txIndex] = Transaction({
            target: _target,
            amount: _amount,
            isMint: false,
            executed: false,
            confirmations: 0
        });
        
        transactionCount += 1;
        
        emit TransactionSubmitted(txIndex, _target, _amount, false);
        
        // Auto-confirm by submitter
        confirmTransaction(txIndex);
        
        return txIndex;
    }
    
   
    function confirmTransaction(uint256 _txIndex) 
        public
        onlySigner
        txExists(_txIndex)
        notExecuted(_txIndex)
        notConfirmed(_txIndex)
    {
        transactionConfirmations[_txIndex][msg.sender] = true;
        transactions[_txIndex].confirmations += 1;
        
        emit TransactionConfirmed(msg.sender, _txIndex);
        
        // Execute if confirmations threshold reached
        if (transactions[_txIndex].confirmations >= requiredConfirmations) {
            executeTransaction(_txIndex);
        }
    }
    
    
    function executeTransaction(uint256 _txIndex) 
        public
        onlySigner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];
        
        require(transaction.confirmations >= requiredConfirmations, 
                "GNGN: not enough confirmations");
        
        transaction.executed = true;
        
        // Execute the transaction
        if (transaction.isMint) {
            _internalMint(transaction.target, transaction.amount);
        } else {
            _internalBurn(transaction.target, transaction.amount);
        }
        
        emit TransactionExecuted(_txIndex);
    }

   
    function _internalMint(address to, uint256 amount) private checkRateLimit(amount, true) {
        require(!_blacklisted[to], "GNGN: recipient is blacklisted");
        require(totalSupply() + amount <= MAX_SUPPLY, "GNGN: would exceed max supply");
        _mint(to, amount);
    }

    
    function _internalBurn(address from, uint256 amount) private checkRateLimit(amount, false) {
        _burn(from, amount);
    }

   //mint function
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


    function unblacklist(address account) external onlyGovernor {
        require(_blacklisted[account], "GNGN: account is not blacklisted");
        _blacklisted[account] = false;
        emit Unblacklisted(account);
    }
//
    function isBlacklisted(address account) external view returns (bool) {
        return _blacklisted[account];
    }

  //pause function
    function pause() external onlyGovernor {
        _pause();
        emit EmergencyPaused(msg.sender);
    }

   //unpause function
    function unpause() external onlyGovernor {
        _unpause();
        emit EmergencyUnpaused(msg.sender);
    }

    
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        require(!paused(), "Pausable: paused");
        // Check blacklist before transfer
        if (from != address(0)) {  // Skip check during minting
            require(!_blacklisted[from], "GNGN: sender is blacklisted");
        }
        if (to != address(0)) {  // Skip check during burning
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

   
    function getTransaction(uint256 _txIndex)
        public
        view
        txExists(_txIndex)
        returns (
            address target,
            uint256 amount,
            bool isMint,
            bool executed,
            uint256 confirmations
        )
    {
        Transaction storage transaction = transactions[_txIndex];
        
        return (
            transaction.target,
            transaction.amount,
            transaction.isMint,
            transaction.executed,
            transaction.confirmations
        );
    }
    
   
    function isConfirmed(uint256 _txIndex, address _signer)
        public
        view
        txExists(_txIndex)
        returns (bool confirmed)
    {
        return transactionConfirmations[_txIndex][_signer];
    }
    
    
    function getSignerCount() public view returns (uint256 count) {
        return signers.length;
    }
}