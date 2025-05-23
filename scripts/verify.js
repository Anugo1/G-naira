const hre = require("hardhat");

async function main() {
  console.log("Starting verification process...");

  // GNGN Token address
  const gngnAddress = "0xd9829CEc1A8432A1dE3Bd4e4a9d4A3A866Fd9aa8";
  
  // MultiSigWallet address
  const multiSigAddress = "0x7B400bA060bC37bb1c5Af88A1c785235BBda2F2e";
  
  // MultiSig parameters
  const signers = [
    "0x2e6F70A41ed6B7928Bb35289893D8DB18D9D390b",
    "0x915f27E1A7f4935DCaddD63A5741ac74d74cE39B"
  ];
  const requiredConfirmations = 2;

  console.log("Verifying GNGN token...");
  try {
    await hre.run("verify:verify", {
      address: gngnAddress,
      constructorArguments: [],
    });
    console.log("GNGN token verified successfully");
  } catch (error) {
    console.error("Error verifying GNGN token:", error);
  }

  console.log("Verifying MultiSigWallet contract...");
  try {
    await hre.run("verify:verify", {
      address: multiSigAddress,
      constructorArguments: [
        gngnAddress,
        signers,
        requiredConfirmations
      ],
    });
    console.log("MultiSigWallet verified successfully");
  } catch (error) {
    console.error("Error verifying MultiSigWallet:", error);
  }

  console.log("Verification process completed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Verification failed:", error);
    process.exit(1);
  }); 