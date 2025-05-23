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
  const ONE_TOKEN = ethers.utils.parseEther("1");
  const REQUIRED_CONFIRMATIONS = 2;
  
  beforeEach(async function () {
    [owner, signer1, signer2, signer3, user1] = await ethers.getSigners();
    
    // Deploy GNGN token
    GNGN = await ethers.getContractFactory("GNGN");
    gngn = await GNGN.deploy();
    await gngn.deployed();

    // Deploy MultiSigWallet
    MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
    multiSigWallet = await MultiSigWallet.deploy(
      gngn.address,
      [signer1.address, signer2.address, signer3.address],
      REQUIRED_CONFIRMATIONS
    );
    await multiSigWallet.deployed();

    // Add MultiSigWallet as governor
    await gngn.addGovernor(multiSigWallet.address);
  });
  
  describe("Deployment", function () {
    it("Should set the correct GNGN token address", async function () {
      expect(await multiSigWallet.gngnToken()).to.equal(gngn.address);
    });
    
    it("Should set the correct required confirmations", async function () {
      expect(await multiSigWallet.requiredConfirmations()).to.equal(REQUIRED_CONFIRMATIONS);
    });
    
    it("Should set the correct signers", async function () {
      expect(await multiSigWallet.isSigner(signer1.address)).to.be.true;
      expect(await multiSigWallet.isSigner(signer2.address)).to.be.true;
      expect(await multiSigWallet.isSigner(signer3.address)).to.be.true;
      expect(await multiSigWallet.isSigner(user1.address)).to.be.false;
    });
    
    it("Should have correct number of signers", async function () {
      expect(await multiSigWallet.getSignerCount()).to.equal(3);
    });
  });
  
  describe("Mint Transactions", function () {
    it("Should allow signer to submit mint transaction", async function () {
      const tx = await multiSigWallet.connect(signer1).submitMintTransaction(user1.address, ONE_TOKEN);
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'TransactionSubmitted');
      
      expect(event.args.target).to.equal(user1.address);
      expect(event.args.amount).to.equal(ONE_TOKEN);
      expect(event.args.isMint).to.be.true;
    });
    
    it("Should auto-confirm transaction by submitter", async function () {
      const tx = await multiSigWallet.connect(signer1).submitMintTransaction(user1.address, ONE_TOKEN);
      const receipt = await tx.wait();
      const txIndex = receipt.events.find(e => e.event === 'TransactionSubmitted').args.txIndex;
      
      expect(await multiSigWallet.isConfirmed(txIndex, signer1.address)).to.be.true;
    });
    
    it("Should execute mint transaction after required confirmations", async function () {
      const tx = await multiSigWallet.connect(signer1).submitMintTransaction(user1.address, ONE_TOKEN);
      const receipt = await tx.wait();
      const txIndex = receipt.events.find(e => e.event === 'TransactionSubmitted').args.txIndex;
      
      await multiSigWallet.connect(signer2).confirmTransaction(txIndex);
      
      expect(await gngn.balanceOf(user1.address)).to.equal(ONE_TOKEN);
    });
    
    it("Should not execute mint transaction before required confirmations", async function () {
      const tx = await multiSigWallet.connect(signer1).submitMintTransaction(user1.address, ONE_TOKEN);
      const receipt = await tx.wait();
      const txIndex = receipt.events.find(e => e.event === 'TransactionSubmitted').args.txIndex;
      
      expect(await gngn.balanceOf(user1.address)).to.equal(0);
    });
  });
  
  describe("Burn Transactions", function () {
    beforeEach(async function () {
      // Mint tokens to user1 first
      await multiSigWallet.connect(signer1).submitMintTransaction(user1.address, ONE_TOKEN);
      const tx = await multiSigWallet.connect(signer2).confirmTransaction(0);
      await tx.wait();
    });
    
    it("Should allow signer to submit burn transaction", async function () {
      const tx = await multiSigWallet.connect(signer1).submitBurnTransaction(user1.address, ONE_TOKEN);
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'TransactionSubmitted');
      
      expect(event.args.target).to.equal(user1.address);
      expect(event.args.amount).to.equal(ONE_TOKEN);
      expect(event.args.isMint).to.be.false;
    });
    
    it("Should execute burn transaction after required confirmations", async function () {
      const tx = await multiSigWallet.connect(signer1).submitBurnTransaction(user1.address, ONE_TOKEN);
      const receipt = await tx.wait();
      const txIndex = receipt.events.find(e => e.event === 'TransactionSubmitted').args.txIndex;
      
      await multiSigWallet.connect(signer2).confirmTransaction(txIndex);
      
      expect(await gngn.balanceOf(user1.address)).to.equal(0);
    });
  });
  
  describe("Transaction Management", function () {
    it("Should not allow non-signer to submit transaction", async function () {
      await expect(
        multiSigWallet.connect(user1).submitMintTransaction(user1.address, ONE_TOKEN)
      ).to.be.revertedWith("MultiSigWallet: caller is not a signer");
    });
    
    it("Should not allow same signer to confirm twice", async function () {
      const tx = await multiSigWallet.connect(signer1).submitMintTransaction(user1.address, ONE_TOKEN);
      const receipt = await tx.wait();
      const txIndex = receipt.events.find(e => e.event === 'TransactionSubmitted').args.txIndex;
      
      await expect(
        multiSigWallet.connect(signer1).confirmTransaction(txIndex)
      ).to.be.revertedWith("MultiSigWallet: transaction already confirmed by signer");
    });
    
    it("Should not allow confirming non-existent transaction", async function () {
      await expect(
        multiSigWallet.connect(signer1).confirmTransaction(999)
      ).to.be.revertedWith("MultiSigWallet: transaction does not exist");
    });
    
    it("Should not allow executing already executed transaction", async function () {
      const tx = await multiSigWallet.connect(signer1).submitMintTransaction(user1.address, ONE_TOKEN);
      const receipt = await tx.wait();
      const txIndex = receipt.events.find(e => e.event === 'TransactionSubmitted').args.txIndex;
      
      await multiSigWallet.connect(signer2).confirmTransaction(txIndex);
      
      await expect(
        multiSigWallet.connect(signer1).executeTransaction(txIndex)
      ).to.be.revertedWith("MultiSigWallet: transaction already executed");
    });
  });
  
  describe("Transaction Information", function () {
    it("Should return correct transaction information", async function () {
      const tx = await multiSigWallet.connect(signer1).submitMintTransaction(user1.address, ONE_TOKEN);
      const receipt = await tx.wait();
      const txIndex = receipt.events.find(e => e.event === 'TransactionSubmitted').args.txIndex;
      
      const [target, amount, isMint, executed, confirmations] = await multiSigWallet.getTransaction(txIndex);
      
      expect(target).to.equal(user1.address);
      expect(amount).to.equal(ONE_TOKEN);
      expect(isMint).to.be.true;
      expect(executed).to.be.false;
      expect(confirmations).to.equal(1);
    });
  });
}); 