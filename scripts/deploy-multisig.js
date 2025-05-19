// We import Hardhat's ethers plugin
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying GNGN token with MultiSig wallet...");

  // Load the GNGN contract
  const GNGN = await ethers.getContractFactory("GNGN");
  
  // Deploy the GNGN token
  console.log("Deploying GNGN token...");
  const gngn = await GNGN.deploy();
  await gngn.waitForDeployment();
  
  // Get the deployed contract address
  const gngnAddress = await gngn.getAddress();
  console.log("GNGN token deployed to:", gngnAddress);

  // Get the list of signers from the environment
  const signerAddresses = process.env.MULTISIG_SIGNERS || "";
  const signers = signerAddresses.split(",").filter(address => address.trim() !== "");
  
  // Check if we have signers specified
  if (signers.length === 0) {
    console.log("No signer addresses specified in MULTISIG_SIGNERS. Skipping MultiSig deployment.");
    process.exit(0);
  }

  // Get required confirmations from the environment or default to majority
  const requiredConfirmations = parseInt(process.env.MULTISIG_REQUIRED_CONFIRMATIONS) || Math.ceil(signers.length / 2);
  
  // Load the MultiSigWallet contract
  const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
  
  // Deploy the MultiSigWallet
  console.log(`Deploying MultiSigWallet with ${signers.length} signers and ${requiredConfirmations} required confirmations...`);
  const multiSigWallet = await MultiSigWallet.deploy(gngnAddress, signers, requiredConfirmations);
  await multiSigWallet.waitForDeployment();
  
  // Get the deployed multisig wallet address
  const multiSigAddress = await multiSigWallet.getAddress();
  console.log("MultiSigWallet deployed to:", multiSigAddress);
  
  // Grant the governor role to the multisig wallet
  console.log("Granting GOVERNOR role to MultiSigWallet...");
  await gngn.addGovernor(multiSigAddress);
  console.log("GOVERNOR role granted to MultiSigWallet");
  
  console.log("Deployment complete!");
  console.log("-------------------------------------");
  console.log("GNGN Token:", gngnAddress);
  console.log("MultiSig Wallet:", multiSigAddress);
  console.log("Signers:", signers.join(", "));
  console.log("Required Confirmations:", requiredConfirmations);
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  }); 