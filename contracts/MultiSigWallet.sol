// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.0;
import "./GNGN.sol";

/**
 * @title MultiSigWallet
 * @dev Contract for multi-signature governance of the GNGN token
 * Provides additional security for critical operations like minting and burning
 */
contract MultiSigWallet {
    // GNGN token reference
    GNGN public gngnToken;
    
    // Signers of the multisig wallet
    mapping(address => bool) public isSigner;
    
    // Number of required confirmations for a transaction
    uint256 public requiredConfirmations;
    
    // Array of signer addresses for iteration
    address[] public signers;
    
    // Transaction struct
    struct Transaction {
        address target;     // Target address for token operations
        uint256 amount;     // Amount of tokens to mint or burn
        bool isMint;        // True if mint, false if burn
        bool executed;      // Whether the transaction was executed
        uint256 confirmations; // Number of confirmations
        mapping(address => bool) isConfirmed; // Confirmations from signers
    }
    
    // Transactions storage
    mapping(uint256 => Transaction) public transactions;
    uint256 public transactionCount;
    
    // Events
    event TransactionSubmitted(uint256 indexed txIndex, address indexed target, uint256 amount, bool isMint);
    event TransactionConfirmed(address indexed signer, uint256 indexed txIndex);
    event TransactionExecuted(uint256 indexed txIndex);
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    
    // Modifiers
    modifier onlySigner() {
        require(isSigner[msg.sender], "MultiSigWallet: caller is not a signer");
        _;
    }
    
    modifier txExists(uint256 _txIndex) {
        require(_txIndex < transactionCount, "MultiSigWallet: transaction does not exist");
        _;
    }
    
    modifier notExecuted(uint256 _txIndex) {
        require(!transactions[_txIndex].executed, "MultiSigWallet: transaction already executed");
        _;
    }
    
    modifier notConfirmed(uint256 _txIndex) {
        require(!transactions[_txIndex].isConfirmed[msg.sender], "MultiSigWallet: transaction already confirmed by signer");
        _;
    }
    
    /**
     * @dev Constructor to set up the MultiSigWallet
     * @param _gngnToken The address of the GNGN token contract
     * @param _signers Array of signer addresses
     * @param _requiredConfirmations Number of required confirmations
     */
    constructor(address _gngnToken, address[] memory _signers, uint256 _requiredConfirmations) {
        require(_signers.length > 0, "MultiSigWallet: signers required");
        require(_requiredConfirmations > 0 && _requiredConfirmations <= _signers.length, 
                "MultiSigWallet: invalid required confirmations");
        
        gngnToken = GNGN(_gngnToken);
        
        // Set up signers
        for (uint256 i = 0; i < _signers.length; i++) {
            address signer = _signers[i];
            
            require(signer != address(0), "MultiSigWallet: invalid signer address");
            require(!isSigner[signer], "MultiSigWallet: signer not unique");
            
            isSigner[signer] = true;
            signers.push(signer);
            
            emit SignerAdded(signer);
        }
        
        requiredConfirmations = _requiredConfirmations;
    }
    
    /**
     * @dev Submit a transaction to mint tokens
     * @param _target The address to receive minted tokens
     * @param _amount The amount to mint
     * @return txIndex The transaction index
     */
    function submitMintTransaction(address _target, uint256 _amount) 
        public
        onlySigner
        returns (uint256 txIndex)
    {
        txIndex = transactionCount;
        
        // Create transaction in storage
        Transaction storage transaction = transactions[txIndex];
        transaction.target = _target;
        transaction.amount = _amount;
        transaction.isMint = true;
        transaction.executed = false;
        transaction.confirmations = 0;
        
        transactionCount += 1;
        
        emit TransactionSubmitted(txIndex, _target, _amount, true);
        
        // Auto-confirm by submitter
        confirmTransaction(txIndex);
    }
    
    /**
     * @dev Submit a transaction to burn tokens
     * @param _target The address to burn tokens from
     * @param _amount The amount to burn
     * @return txIndex The transaction index
     */
    function submitBurnTransaction(address _target, uint256 _amount) 
        public
        onlySigner
        returns (uint256 txIndex)
    {
        txIndex = transactionCount;
        
        // Create transaction in storage
        Transaction storage transaction = transactions[txIndex];
        transaction.target = _target;
        transaction.amount = _amount;
        transaction.isMint = false;
        transaction.executed = false;
        transaction.confirmations = 0;
        
        transactionCount += 1;
        
        emit TransactionSubmitted(txIndex, _target, _amount, false);
        
        // Auto-confirm by submitter
        confirmTransaction(txIndex);
    }
    
    /**
     * @dev Confirm a transaction
     * @param _txIndex The transaction index
     */
    function confirmTransaction(uint256 _txIndex) 
        public
        onlySigner
        txExists(_txIndex)
        notExecuted(_txIndex)
        notConfirmed(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];
        transaction.isConfirmed[msg.sender] = true;
        transaction.confirmations += 1;
        
        emit TransactionConfirmed(msg.sender, _txIndex);
        
        // Execute if confirmations threshold reached
        if (transaction.confirmations >= requiredConfirmations) {
            executeTransaction(_txIndex);
        }
    }
    
    /**
     * @dev Execute a confirmed transaction
     * @param _txIndex The transaction index
     */
    function executeTransaction(uint256 _txIndex) 
        public
        onlySigner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];
        
        require(transaction.confirmations >= requiredConfirmations, 
                "MultiSigWallet: not enough confirmations");
        
        transaction.executed = true;
        
        // Execute the transaction on GNGN token
        if (transaction.isMint) {
            gngnToken.mint(transaction.target, transaction.amount);
        } else {
            gngnToken.burn(transaction.target, transaction.amount);
        }
        
        emit TransactionExecuted(_txIndex);
    }
    
    /**
     * @dev Get transaction details
     * @param _txIndex The transaction index
     * @return target The target address
     * @return amount The amount of tokens
     * @return isMint Whether it's a mint transaction
     * @return executed Whether the transaction was executed
     * @return confirmations Number of confirmations
     */
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
    
    /**
     * @dev Check if a transaction is confirmed by a signer
     * @param _txIndex The transaction index
     * @param _signer The signer address
     * @return confirmed Whether the transaction is confirmed by the signer
     */
    function isConfirmed(uint256 _txIndex, address _signer)
        public
        view
        txExists(_txIndex)
        returns (bool confirmed)
    {
        return transactions[_txIndex].isConfirmed[_signer];
    }
    
    /**
     * @dev Get the number of signers
     * @return count The number of signers
     */
    function getSignerCount() public view returns (uint256 count) {
        return signers.length;
    }
} 