// We import Hardhat's ethers plugin
const { ethers } = require("hardhat");

async function main() {
  // Load the GNGN contract
  const GNGN = await ethers.getContractFactory("GNGN");
  
  // Deploy the contract
  console.log("Deploying GNGN token...");
  const gngn = await GNGN.deploy();
  await gngn.waitForDeployment();
  
  // Get the deployed contract address
  const address = await gngn.getAddress();
  console.log("GNGN token deployed to:", address);
  
  // If GOVERNOR_ADDRESS is set in the environment, we'll add it as a governor
  const governorAddress = process.env.GOVERNOR_ADDRESS;
  if (governorAddress && governorAddress !== '') {
    console.log(`Adding ${governorAddress} as a governor...`);
    await gngn.addGovernor(governorAddress);
    console.log(`${governorAddress} added as a governor.`);
  }
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  }); 