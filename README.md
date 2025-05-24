# G-Naira (gNGN) - Central Bank Digital Currency

## Overview
G-Naira (gNGN) is a blockchain-based Central Bank Digital Currency (CBDC) solution designed to enhance transparency and accountability in a country's financial sector. This implementation leverages blockchain technology to provide a secure, traceable, and efficient digital currency system.

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Security Measures](#security-measures)
- [Technical Specifications](#technical-specifications)
- [Installation](#installation)
- [Deployment](#deployment)
- [Contract Interaction](#contract-interaction)
- [Testing](#testing)
- [License](#license)

## Features

### Core Features
- **ERC20 Compliant**: Full compliance with ERC20 token standard for maximum interoperability
- **Minting Capability**: Central Bank can issue new digital currency
- **Burning Capability**: Removal of currency from circulation as needed
- **Blacklisting**: Ability to prevent specific addresses from sending or receiving tokens
- **Governance**: Restricted access to critical functions via the GOVERNOR role
- **Multi-signature Security**: Requires multiple approvals for sensitive operations

### Advanced Security Features
- **Rate Limiting**: Caps on minting and burning per time period
- **Maximum Supply Cap**: Hard limit on total token supply
- **Emergency Pause**: Ability to halt all transfers in case of security incidents
- **Comprehensive Event Logging**: Full transparency of all operations

## Architecture

The G-Naira system consists of two main contracts with integrated functionality:

### GNGN Token Contract
The primary contract implementing the ERC20 token with additional CBDC-specific functionality.
- Inherits from OpenZeppelin's ERC20 and Pausable contracts
- Integrates with GovernorRole for access control
- Implements blacklisting, rate limiting, and maximum supply
- Mints initial supply (10% of max supply) to deployer during contract creatio
Handles governance, access control, and multi-signature functionality for the GNGN token.
- Built on OpenZeppelin's AccessControl
- Manages GOVERNOR_ROLE assignment and verification
- Contains embedded multi-signature functionality:
  - Configurable signers and confirmation threshold
  - Transaction submission and confirmation workflow
  - Secure mint/burn operations requiring multiple approvals

This consolidated architecture makes the codebase more concise while maintaining all security features.

## Security Measures

### Access Control
- Operations like minting, burning, and blacklisting restricted to GOVERNOR role
- Two-factor authentication via MultiSigWallet for critical operations

### Rate Limiting
- Maximum mint rate: 1,000,000 tokens per 24-hour period
- Maximum burn rate: 1,000,000 tokens per 24-hour period
- Automatic rate limit reset after time period expires

### Supply Control
- Maximum supply capped at 1,000,000,000 tokens
- Prevents inflation beyond predetermined limits

### Emergency Controls
- Pause functionality to stop all transfers in emergency situations
- Only executable by GOVERNOR role

## Technical Specifications

### Token Details
- **Name**: G-Naira
- **Symbol**: gNGN
- **Decimals**: 18
- **Maximum Supply**: 1,000,000,000 tokens
- **Initial Supply**: 100,000,000 tokens (10% of maximum supply)

### Deployment Information
- **Network**: Base Sepolia Testnet
- **GNGN Token Address**: `0x844950A11457E6896fCf26752d4e54C52775b5e4`
- **Contract Verification**: [View on BaseScan](https://sepolia.basescan.org/address/0x844950A11457E6896fCf26752d4e54C52775b5e4#code)

## Installation

### Prerequisites
- Node.js (>= 14.0.0)
- npm (>= 7.0.0)
- Hardhat (>= 2.12.0)

### Setup
1. Clone the repository
```bash
git clone https://github.com/your-username/G-Naira.git
cd G-Naira
```

2. Install dependencies
```bash
npm install
```

## Environment Configuration

The project uses environment variables for secure configuration. Create a `.env` file in the project root with the following variables:

```
# Private key for deployment (without 0x prefix)
PRIVATE_KEY=your_wallet_private_key_here

# Network RPC URLs
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/your-api-key

# BaseScan API Key for contract verification
BASESCAN_API_KEY=your_basescan_api_key

# Initial Governor Address
GOVERNOR_ADDRESS=your_governor_address

# Multi-signature configuration
# Comma-separated list of signer addresses (no spaces)
MULTISIG_SIGNERS=address1,address2,address3

# Number of required confirmations for transactions
MULTISIG_REQUIRED_CONFIRMATIONS=2

# Network name override (optional)
NETWORK_NAME=base-sepolia
```

### Environment Variables Explained

| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY` | Your wallet's private key for deploying contracts |
| `BASE_SEPOLIA_RPC_URL` | RPC endpoint for Base Sepolia testnet |
| `BASESCAN_API_KEY` | API key for verifying contracts on BaseScan |
| `GOVERNOR_ADDRESS` | Address that will have governor privileges |
| `MULTISIG_SIGNERS` | Comma-separated list of addresses that can sign multi-sig transactions |
| `MULTISIG_REQUIRED_CONFIRMATIONS` | Number of confirmations required for multi-sig operations |
| `NETWORK_NAME` | Optional override for the network name in deployment logs |

## Deployment

### Compile Contracts
```bash
npx hardhat compile
```

### Deploy to Local Test Network
```bash
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```

### Deploy to Base Sepolia
```bash
npx hardhat run scripts/deploy.js --network base-sepolia
```

The deployment script will:
1. Deploy the GNGN token contract
2. Set up multi-signature functionality with the signers specified in your .env file
3. Configure rate limiting and other security features
4. Wait for block confirmations on non-local networks
5. Provide verification commands

### Verify Contracts
```bash
npx hardhat verify --network base-sepolia <GNGN_CONTRACT_ADDRESS>
```

### Recent Deployment
The G-Naira token has been successfully deployed to Base Sepolia at address `0x844950A11457E6896fCf26752d4e54C52775b5e4`. You can view and interact with the contract on [BaseScan](https://sepolia.basescan.org/address/0x844950A11457E6896fCf26752d4e54C52775b5e4).

## Contract Interaction

### Governor Operations

#### Mint Tokens
```javascript
// Direct mint as governor
const gngn = await ethers.getContractAt("GNGN", "GNGN_CONTRACT_ADDRESS");
await gngn.connect(governorSigner).mint(recipientAddress, ethers.utils.parseEther("1000"));

// Mint through MultiSig (requires multiple confirmations)
const multiSig = await ethers.getContractAt("MultiSigWallet", "MULTISIG_CONTRACT_ADDRESS");
await multiSig.connect(signer1).submitMintTransaction(recipientAddress, ethers.utils.parseEther("1000"));
await multiSig.connect(signer2).confirmTransaction(txIndex);
```

#### Burn Tokens
```javascript
// Direct burn as governor
await gngn.connect(governorSigner).burn(holderAddress, ethers.utils.parseEther("500"));

// Burn through MultiSig
await multiSig.connect(signer1).submitBurnTransaction(holderAddress, ethers.utils.parseEther("500"));
await multiSig.connect(signer2).confirmTransaction(txIndex);
```

#### Blacklist Operations
```javascript
// Blacklist an address
await gngn.connect(governorSigner).blacklist(suspiciousAddress);

// Remove from blacklist
await gngn.connect(governorSigner).unblacklist(rehabilitatedAddress);

// Check blacklist status
const isBlacklisted = await gngn.isBlacklisted(checkAddress);
```

#### Emergency Functions
```javascript
// Pause all transfers
await gngn.connect(governorSigner).pause();

// Resume operations
await gngn.connect(governorSigner).unpause();
```

### Token Operations

#### Transfer Tokens
```javascript
// Standard ERC20 transfer
await gngn.connect(userSigner).transfer(recipientAddress, ethers.utils.parseEther("100"));

// Transfer with approval
await gngn.connect(userSigner).approve(spenderAddress, ethers.utils.parseEther("100"));
await gngn.connect(spenderSigner).transferFrom(userAddress, recipientAddress, ethers.utils.parseEther("100"));
```

## Testing

### Run All Tests
```bash
npx hardhat test
```

### Automated Tests
```bash
npm test
```

This will run the test suite that verifies all contract functionality including:
- Basic ERC20 operations
- Governance functionality
- Multi-signature operations
- Rate limiting and blacklisting features

### Test Coverage
```bash
npx hardhat coverage
```

### Manual Testing with Scripts
A test script is provided to interact with the deployed contract:

```bash
npx hardhat run scripts/test-gngn.js --network base-sepolia
```

This script will:
- Connect to the deployed contract
- Display contract information
- Check balances and roles
- Test mint and transfer operations if you have the appropriate permissions

## Interacting via Block Explorer

You can interact with the deployed G-Naira contract directly through the Base Sepolia block explorer:

1. **Access the contract on BaseScan**:
   - Visit [https://sepolia.basescan.org/address/0x844950A11457E6896fCf26752d4e54C52775b5e4](https://sepolia.basescan.org/address/0x844950A11457E6896fCf26752d4e54C52775b5e4)

2. **Connect your wallet**:
   - Click on the "Contract" tab
   - Select "Write Contract"
   - Click "Connect to Web3" to connect your MetaMask or other wallet
   - Ensure your wallet is connected to Base Sepolia network

3. **Read Contract Data**:
   - Under the "Read Contract" tab, you can:
     - Check `balanceOf` any address
     - View `totalSupply`
     - Check if an address `hasRole` (like GOVERNOR_ROLE)
     - View `name`, `symbol`, and `decimals`

4. **Execute Transactions**:
   - Under the "Write Contract" tab, you can:
     - `transfer` tokens to another address
     - If you have GOVERNOR_ROLE, you can:
       - `mint` new tokens
       - `burn` tokens
       - `addGovernor` to add new governors
       - `setupMultiSig` to configure multi-signature functionality
       - `blacklistAddress` to restrict addresses

5. **View Token Holders**:
   - The "Token Holders" section shows addresses holding gNGN tokens and their balances

## License
This project is licensed under the MIT License.

---

*This project was developed for the Central Bank to improve financial transparency and accountability through blockchain technology.*
