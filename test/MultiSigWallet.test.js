const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSigWallet", function () {
  let GNGN;
  let gngn;
  let MultiSigWallet;
  let multiSigWallet;
  let owner;
  let signer1;
  let signer2;
  let signer3;
  let user1;
  
  // Variables for multisig setup
  const requiredConfirmations = 2; // Require 2 signers to confirm
  
  beforeEach(async function () {
    // Get contract factories and signers
    GNGN = await ethers.getContractFactory("GNGN");
    MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
    [owner, signer1, signer2, signer3, user1] = await ethers.getSigners();
    
    // Deploy GNGN token
    gngn = await GNGN.deploy();
    await gngn.waitForDeployment();
    
    // Get the deployed contract address
    const gngnAddress = await gngn.getAddress();
    
    // Make the multisig wallet a governor of the GNGN token
    // Create array of signers for multisig
    const signers = [signer1.address, signer2.address, signer3.address];
    
    // Deploy multisig wallet
    multiSigWallet = await MultiSigWallet.deploy(
      gngnAddress,
      signers,
      requiredConfirmations
    );
    await multiSigWallet.waitForDeployment();
    
    // Get the deployed multisig address
    const multiSigAddress = await multiSigWallet.getAddress();
    
    // Add multisig wallet as a governor of GNGN
    await gngn.addGovernor(multiSigAddress);
  });
  
  describe("Deployment", function () {
    it("Should set the correct token reference", async function () {
      const gngnAddress = await gngn.getAddress();
      expect(await multiSigWallet.gngnToken()).to.equal(gngnAddress);
    });
    
    it("Should set the correct signers", async function () {
      expect(await multiSigWallet.isSigner(signer1.address)).to.be.true;
      expect(await multiSigWallet.isSigner(signer2.address)).to.be.true;
      expect(await multiSigWallet.isSigner(signer3.address)).to.be.true;
      expect(await multiSigWallet.isSigner(owner.address)).to.be.false;
    });
    
    it("Should set the correct required confirmations", async function () {
      expect(await multiSigWallet.requiredConfirmations()).to.equal(requiredConfirmations);
    });
    
    it("Should set the multisig wallet as a governor of GNGN", async function () {
      const multiSigAddress = await multiSigWallet.getAddress();
      expect(await gngn.isGovernor(multiSigAddress)).to.be.true;
    });
  });
  
  describe("Submit and confirm mint transactions", function () {
    it("Should allow a signer to submit a mint transaction", async function () {
      const txIndex = await multiSigWallet.connect(signer1).submitMintTransaction(user1.address, 1000);
      
      // Check that transaction was created correctly
      const [target, amount, isMint, executed, confirmations] = await multiSigWallet.getTransaction(0);
      expect(target).to.equal(user1.address);
      expect(amount).to.equal(1000);
      expect(isMint).to.be.true;
      expect(executed).to.be.false;
      expect(confirmations).to.equal(1); // Auto-confirmed by submitter
    });
    
    it("Should reject transaction submission from non-signers", async function () {
      await expect(
        multiSigWallet.connect(owner).submitMintTransaction(user1.address, 1000)
      ).to.be.revertedWith("MultiSigWallet: caller is not a signer");
    });
    
    it("Should auto-confirm the transaction by the submitter", async function () {
      await multiSigWallet.connect(signer1).submitMintTransaction(user1.address, 1000);
      expect(await multiSigWallet.isConfirmed(0, signer1.address)).to.be.true;
    });
    
    it("Should allow a second signer to confirm and execute a mint transaction", async function () {
      await multiSigWallet.connect(signer1).submitMintTransaction(user1.address, 1000);
      await multiSigWallet.connect(signer2).confirmTransaction(0);
      
      // Check that the transaction was executed
      const [,,, executed,] = await multiSigWallet.getTransaction(0);
      expect(executed).to.be.true;
      
      // Check that tokens were minted
      expect(await gngn.balanceOf(user1.address)).to.equal(1000);
    });
    
    it("Should not allow a signer to confirm twice", async function () {
      await multiSigWallet.connect(signer1).submitMintTransaction(user1.address, 1000);
      await expect(
        multiSigWallet.connect(signer1).confirmTransaction(0)
      ).to.be.revertedWith("MultiSigWallet: transaction already confirmed by signer");
    });
  });
  
  describe("Submit and confirm burn transactions", function () {
    beforeEach(async function () {
      // First mint some tokens via multisig
      await multiSigWallet.connect(signer1).submitMintTransaction(user1.address, 2000);
      await multiSigWallet.connect(signer2).confirmTransaction(0);
    });
    
    it("Should allow a signer to submit a burn transaction", async function () {
      const txIndex = await multiSigWallet.connect(signer2).submitBurnTransaction(user1.address, 500);
      
      // Check that transaction was created correctly
      const [target, amount, isMint, executed, confirmations] = await multiSigWallet.getTransaction(1);
      expect(target).to.equal(user1.address);
      expect(amount).to.equal(500);
      expect(isMint).to.be.false;
      expect(executed).to.be.false;
      expect(confirmations).to.equal(1); // Auto-confirmed by submitter
    });
    
    it("Should allow execution of a burn transaction after enough confirmations", async function () {
      await multiSigWallet.connect(signer2).submitBurnTransaction(user1.address, 500);
      await multiSigWallet.connect(signer1).confirmTransaction(1);
      
      // Check that the transaction was executed
      const [,,, executed,] = await multiSigWallet.getTransaction(1);
      expect(executed).to.be.true;
      
      // Check that tokens were burned
      expect(await gngn.balanceOf(user1.address)).to.equal(1500);
    });
  });
  
  describe("Edge cases", function () {
    it("Should not execute a transaction with insufficient confirmations", async function () {
      // Submit without reaching threshold
      await multiSigWallet.connect(signer1).submitMintTransaction(user1.address, 1000);
      
      // Check that not executed
      const [,,, executed,] = await multiSigWallet.getTransaction(0);
      expect(executed).to.be.false;
      
      // Check that no tokens were minted
      expect(await gngn.balanceOf(user1.address)).to.equal(0);
    });
    
    it("Should not allow execution of already executed transactions", async function () {
      // Submit and confirm to execute
      await multiSigWallet.connect(signer1).submitMintTransaction(user1.address, 1000);
      await multiSigWallet.connect(signer2).confirmTransaction(0);
      
      // Try to execute again
      await expect(
        multiSigWallet.connect(signer3).executeTransaction(0)
      ).to.be.revertedWith("MultiSigWallet: transaction already executed");
    });
    
    it("Should not allow confirmation of non-existent transactions", async function () {
      await expect(
        multiSigWallet.connect(signer1).confirmTransaction(999)
      ).to.be.revertedWith("MultiSigWallet: transaction does not exist");
    });
  });
}); 