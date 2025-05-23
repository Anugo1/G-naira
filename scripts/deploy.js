const hre = require("hardhat");

async function main() {
    console.log("Starting deployment to Base Sepolia...");

    // Get the contract factories
    const GNGN = await hre.ethers.getContractFactory("GNGN");
    const MultiSigWallet = await hre.ethers.getContractFactory("MultiSigWallet");

    // Get the signers
    const [deployer, account1, account2, account3] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // Deploy GNGN token
    console.log("Deploying GNGN token...");
    const gngn = await GNGN.deploy();
    await gngn.deployed();
    console.log("GNGN token deployed to:", gngn.address);

    // Define initial signers for MultiSig
    let signers;
    let requiredConfirmations;
    
    // Check if we're on a local network or testnet/mainnet
    const networkName = hre.network.name;
    if (networkName === 'localhost' || networkName === 'hardhat') {
        // Use test accounts for local testing
        console.log("Using local test accounts as signers");
        signers = [
            deployer.address,
            account1.address
        ];
        requiredConfirmations = 1; // Only require 1 confirmation for easier testing
    } else {
        // Use configured addresses for real networks
        console.log("Using configured accounts as signers");
        // Use MULTISIG_SIGNERS from .env if available
        if (process.env.MULTISIG_SIGNERS) {
            signers = process.env.MULTISIG_SIGNERS.split(',');
        } else {
            signers = [
                deployer.address,
                process.env.SIGNER2 || account1.address
            ];
        }
        
        // Use MULTISIG_REQUIRED_CONFIRMATIONS from .env if available
        requiredConfirmations = process.env.MULTISIG_REQUIRED_CONFIRMATIONS ? 
            parseInt(process.env.MULTISIG_REQUIRED_CONFIRMATIONS) : 1;
    }
    
    console.log("Signers:", signers);
    console.log("Required confirmations:", requiredConfirmations);

    // Deploy MultiSigWallet
    console.log("Deploying MultiSigWallet...");
    const multiSigWallet = await MultiSigWallet.deploy(
        gngn.address,
        signers,
        requiredConfirmations
    );
    await multiSigWallet.deployed();
    console.log("MultiSigWallet deployed to:", multiSigWallet.address);

    // Add MultiSigWallet as governor
    console.log("Adding MultiSigWallet as governor...");
    const governorTx = await gngn.addGovernor(multiSigWallet.address);
    await governorTx.wait();
    console.log("MultiSigWallet added as governor");

    console.log("Deployment completed successfully!");
    console.log("GNGN Token:", gngn.address);
    console.log("MultiSigWallet:", multiSigWallet.address);
    
    // Wait for block confirmations
    if (networkName !== 'localhost' && networkName !== 'hardhat') {
        console.log("Waiting for block confirmations...");
        await new Promise(r => setTimeout(r, 60000)); // Wait 1 minute before verification
        
        // Verification can be done manually on BaseScan
        console.log("To verify contracts on BaseScan:");
        console.log(`npx hardhat verify --network base-sepolia ${gngn.address}`);
        console.log(`npx hardhat verify --network base-sepolia ${multiSigWallet.address} "${gngn.address}" "${signers.join(',')}" "${requiredConfirmations}"`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 