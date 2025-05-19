// We import Hardhat's ethers plugin
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Running with the account:", deployer.address);
  
  // Contract address should be passed as an argument
  const tokenAddress = process.argv[2];
  if (!tokenAddress) {
    console.error("Please provide the token contract address as an argument");
    process.exit(1);
  }

  // Action to perform (mint or burn)
  const action = process.argv[3]?.toLowerCase();
  if (action !== 'mint' && action !== 'burn') {
    console.error("Please specify 'mint' or 'burn' as the second argument");
    process.exit(1);
  }

  // Target address
  const targetAddress = process.argv[4];
  if (!targetAddress) {
    console.error("Please provide the target address as the third argument");
    process.exit(1);
  }

  // Amount to mint or burn
  const amount = process.argv[5];
  if (!amount || isNaN(Number(amount))) {
    console.error("Please provide a valid amount as the fourth argument");
    process.exit(1);
  }

  // Get the deployed GNGN contract instance
  const GNGN = await ethers.getContractFactory("GNGN");
  const gngn = GNGN.attach(tokenAddress);

  try {
    // Check if the caller is a governor
    const isGovernor = await gngn.isGovernor(deployer.address);
    if (!isGovernor) {
      console.error("The caller is not a governor and cannot perform this action");
      process.exit(1);
    }

    // Perform the requested action
    if (action === 'mint') {
      console.log(`Minting ${amount} tokens to ${targetAddress}...`);
      const tx = await gngn.mint(targetAddress, amount);
      await tx.wait();
      console.log(`Successfully minted ${amount} tokens to ${targetAddress}`);
    } else if (action === 'burn') {
      console.log(`Burning ${amount} tokens from ${targetAddress}...`);
      const tx = await gngn.burn(targetAddress, amount);
      await tx.wait();
      console.log(`Successfully burned ${amount} tokens from ${targetAddress}`);
    }

    // Display the new balance
    const balance = await gngn.balanceOf(targetAddress);
    console.log(`New balance of ${targetAddress}: ${balance} tokens`);
    
    // Display total supply
    const totalSupply = await gngn.totalSupply();
    console.log(`Total supply: ${totalSupply} tokens`);
  } catch (error) {
    console.error("Operation failed:", error.message);
    process.exit(1);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  }); 