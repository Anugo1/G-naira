require('dotenv').config();
const hre = require("hardhat");

async function main() {
    console.log("Starting G-Naira (GNGN) CBDC deployment...");

    // Get the contract factory
    const GNGN = await hre.ethers.getContractFactory("GNGN");

    // Get the deployer's address and other accounts
    const [deployer, account1, account2] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("Account balance:", hre.ethers.utils.formatEther(balance), "ETH");

    // Deploy GNGN token
    console.log("Deploying G-Naira (GNGN) CBDC contract...");
    const gngn = await GNGN.deploy();
    await gngn.deployed();
    console.log("GNGN contract deployed to:", gngn.address);

    // Log initial deployment details
    const name = await gngn.name();
    const symbol = await gngn.symbol();
    const decimals = await gngn.decimals();
    const totalSupply = await gngn.totalSupply();
    const maxSupply = await gngn.MAX_SUPPLY();
    
    console.log("\n=== Contract Details ===");
    console.log("Name:", name);
    console.log("Symbol:", symbol);
    console.log("Decimals:", decimals);
    console.log("Initial Supply:", hre.ethers.utils.formatEther(totalSupply), "gNGN");
    console.log("Maximum Supply:", hre.ethers.utils.formatEther(maxSupply), "gNGN");

    // Configure signers for MultiSig functionality
    let signers;
    let requiredConfirmations;
    
    // Use environment variable for network name if provided, otherwise use hardhat's network name
    const networkName = process.env.NETWORK_NAME || hre.network.name;
    console.log("\n=== Network Configuration ===");
    console.log("Network:", networkName);
    
    if (networkName === 'localhost' || networkName === 'hardhat') {
        // Local development configuration
        console.log("Configuring for local development...");
        signers = [
            deployer.address,
            account1.address,
            account2.address
        ];
        requiredConfirmations = 2; // Require 2 out of 3 confirmations
    } else {
        // Production/Testnet configuration
        console.log("Configuring for", networkName, "network...");
        console.log("Using configuration from .env file");
        
        // Check for environment variables
        if (process.env.MULTISIG_SIGNERS) {
            signers = process.env.MULTISIG_SIGNERS.split(',').map(addr => addr.trim());
            console.log("Using MULTISIG_SIGNERS from environment:", process.env.MULTISIG_SIGNERS);
        } else {
            // Default signers for testnet/mainnet
            const signer2 = process.env.SIGNER2;
            const signer3 = process.env.SIGNER3;
            
            if (!signer2 || !signer3) {
                console.warn("Warning: SIGNER2 or SIGNER3 not found in .env file. Using fallback addresses.");
            }
            
            signers = [
                deployer.address,
                signer2 || account1.address,
                signer3 || account2.address
            ];
            console.log("Using signer configuration:", signers);
        }
        
        if (process.env.MULTISIG_REQUIRED_CONFIRMATIONS) {
            requiredConfirmations = parseInt(process.env.MULTISIG_REQUIRED_CONFIRMATIONS);
            console.log("Using MULTISIG_REQUIRED_CONFIRMATIONS from environment:", requiredConfirmations);
        } else {
            requiredConfirmations = Math.ceil(signers.length * 0.6); // Require 60% majority
            console.log("MULTISIG_REQUIRED_CONFIRMATIONS not found in .env. Using calculated value:", requiredConfirmations);
        }
    }
    
    console.log("Multi-sig signers:", signers);
    console.log("Required confirmations:", requiredConfirmations);

    // Validate signer configuration
    if (signers.length === 0) {
        throw new Error("No signers provided for multi-signature setup");
    }
    
    if (requiredConfirmations > signers.length || requiredConfirmations <= 0) {
        throw new Error("Invalid required confirmations count");
    }

    // Initialize multi-signature functionality
    console.log("\n=== Setting up Multi-Signature Functionality ===");
    try {
        const setupTx = await gngn.setupMultiSig(signers, requiredConfirmations);
        console.log("Multi-sig setup transaction hash:", setupTx.hash);
        
        const receipt = await setupTx.wait();
        console.log("Multi-sig setup confirmed in block:", receipt.blockNumber);
        
        // Verify setup
        const signerCount = await gngn.getSignerCount();
        const reqConfirmations = await gngn.requiredConfirmations();
        
        console.log("Verified signer count:", signerCount.toString());
        console.log("Verified required confirmations:", reqConfirmations.toString());
        
    } catch (error) {
        console.error("Error setting up multi-signature:", error.message);
        throw error;
    }

    // Optional: Add additional governors if specified
    if (process.env.ADDITIONAL_GOVERNORS) {
        console.log("\n=== Adding Additional Governors ===");
        const additionalGovernors = process.env.ADDITIONAL_GOVERNORS.split(',').map(addr => addr.trim());
        
        for (const governor of additionalGovernors) {
            if (hre.ethers.utils.isAddress(governor)) {
                console.log("Adding governor:", governor);
                const addGovTx = await gngn.addGovernor(governor);
                await addGovTx.wait();
                console.log("Governor added successfully");
            } else {
                console.warn("Invalid governor address:", governor);
            }
        }
    }

    // Display rate limiting information
    console.log("\n=== Rate Limiting Configuration ===");
    const rateLimitPeriod = await gngn.RATE_LIMIT_PERIOD();
    const maxMintPerPeriod = await gngn.MAX_MINT_PER_PERIOD();
    const maxBurnPerPeriod = await gngn.MAX_BURN_PER_PERIOD();
    
    console.log("Rate limit period:", (rateLimitPeriod / 3600).toString(), "hours");
    console.log("Max mint per period:", hre.ethers.utils.formatEther(maxMintPerPeriod), "gNGN");
    console.log("Max burn per period:", hre.ethers.utils.formatEther(maxBurnPerPeriod), "gNGN");

    // Get current rate limit status
    const rateLimitStatus = await gngn.getRateLimitStatus();
    console.log("Current minted in period:", hre.ethers.utils.formatEther(rateLimitStatus.minted), "gNGN");
    console.log("Current burned in period:", hre.ethers.utils.formatEther(rateLimitStatus.burned), "gNGN");

    console.log("\n=== Deployment Summary ===");
    console.log("✅ GNGN Contract Address:", gngn.address);
    console.log("✅ Multi-signature functionality initialized");
    console.log("✅ Rate limiting configured");
    console.log("✅ Emergency pause functionality available");
    console.log("✅ Blacklisting functionality available");

    // Wait for block confirmations on non-local networks
    if (networkName !== 'localhost' && networkName !== 'hardhat') {
        console.log("\n=== Waiting for Block Confirmations ===");
        console.log("Waiting for additional confirmations before verification...");
        
        // Wait for 5 block confirmations
        let currentBlock = await hre.ethers.provider.getBlockNumber();
        const targetBlock = currentBlock + 5;
        
        console.log("Current block:", currentBlock);
        console.log("Target block:", targetBlock);
        
        while (currentBlock < targetBlock) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            currentBlock = await hre.ethers.provider.getBlockNumber();
            console.log("Current block:", currentBlock);
        }
        
        console.log("Block confirmations completed");
        
        // Provide verification commands
        console.log("\n=== Contract Verification ===");
        console.log("To verify the contract on the block explorer, run:");
        console.log(`npx hardhat verify --network ${networkName} ${gngn.address}`);
        
        // Save deployment info
        const deploymentInfo = {
            network: networkName,
            contractAddress: gngn.address,
            deploymentBlock: receipt.blockNumber,
            deployer: deployer.address,
            signers: signers,
            requiredConfirmations: requiredConfirmations,
            timestamp: new Date().toISOString()
        };
        
        console.log("\n=== Deployment Information ===");
        console.log(JSON.stringify(deploymentInfo, null, 2));
    }

    // Display important operational information
    console.log("\n=== Important Operational Notes ===");
    console.log("🔑 Default Admin Role:", deployer.address);
    console.log("🏛️  Governor Role:", deployer.address);
    console.log("📝 Multi-sig Signers:", signers.length, "total");
    console.log("✍️  Required Confirmations:", requiredConfirmations);
    console.log("⏰ Rate Limit Period:", rateLimitPeriod / 3600, "hours");
    console.log("💰 Max Supply Cap:", hre.ethers.utils.formatEther(maxSupply), "gNGN");
    console.log("🚨 Emergency pause available via governor");
    console.log("🚫 Blacklisting available via governor");
    
    console.log("\n🎉 G-Naira CBDC deployment completed successfully!");
}

// Enhanced error handling
main()
    .then(() => {
        console.log("✅ Deployment script completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Deployment failed:");
        console.error(error);
        
        // Provide helpful debugging information
        if (error.message.includes("insufficient funds")) {
            console.error("\n💡 Tip: Make sure your deployer account has enough ETH for gas fees");
        }
        
        if (error.message.includes("nonce")) {
            console.error("\n💡 Tip: Try resetting your account nonce or wait a moment before retrying");
        }
        
        process.exit(1);
    });