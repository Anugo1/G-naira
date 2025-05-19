const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GNGN Token", function () {
  let GNGN;
  let gngn;
  let owner;
  let governor;
  let user1;
  let user2;

  beforeEach(async function () {
    // Get the ContractFactory and Signers
    GNGN = await ethers.getContractFactory("GNGN");
    [owner, governor, user1, user2] = await ethers.getSigners();

    // Deploy the contract
    gngn = await GNGN.deploy();
    await gngn.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await gngn.name()).to.equal("G-Naira");
      expect(await gngn.symbol()).to.equal("gNGN");
    });

    it("Should set the deployer as governor", async function () {
      expect(await gngn.isGovernor(owner.address)).to.equal(true);
    });

    it("Should have zero initial supply", async function () {
      expect(await gngn.totalSupply()).to.equal(0);
    });
  });

  describe("Governor Role", function () {
    it("Should allow admin to add a new governor", async function () {
      await gngn.addGovernor(governor.address);
      expect(await gngn.isGovernor(governor.address)).to.equal(true);
    });

    it("Should allow admin to remove a governor", async function () {
      await gngn.addGovernor(governor.address);
      await gngn.removeGovernor(governor.address);
      expect(await gngn.isGovernor(governor.address)).to.equal(false);
    });

    it("Should not allow non-admin to add a governor", async function () {
      await expect(
        gngn.connect(user1).addGovernor(user2.address)
      ).to.be.reverted;
    });
  });

  describe("Mint and Burn", function () {
    beforeEach(async function () {
      // Add governor for testing
      await gngn.addGovernor(governor.address);
    });

    it("Should allow governor to mint tokens", async function () {
      await gngn.connect(governor).mint(user1.address, 1000);
      expect(await gngn.balanceOf(user1.address)).to.equal(1000);
      expect(await gngn.totalSupply()).to.equal(1000);
    });

    it("Should allow governor to burn tokens", async function () {
      await gngn.connect(governor).mint(user1.address, 1000);
      await gngn.connect(governor).burn(user1.address, 400);
      expect(await gngn.balanceOf(user1.address)).to.equal(600);
      expect(await gngn.totalSupply()).to.equal(600);
    });

    it("Should not allow non-governor to mint tokens", async function () {
      await expect(
        gngn.connect(user1).mint(user1.address, 1000)
      ).to.be.reverted;
    });

    it("Should not allow non-governor to burn tokens", async function () {
      await gngn.connect(governor).mint(user1.address, 1000);
      await expect(
        gngn.connect(user1).burn(user1.address, 400)
      ).to.be.reverted;
    });
  });

  describe("Blacklisting", function () {
    beforeEach(async function () {
      // Add governor for testing
      await gngn.addGovernor(governor.address);
      // Mint tokens to users
      await gngn.connect(governor).mint(user1.address, 1000);
      await gngn.connect(governor).mint(user2.address, 1000);
    });

    it("Should allow governor to blacklist an address", async function () {
      await gngn.connect(governor).blacklist(user1.address);
      expect(await gngn.isBlacklisted(user1.address)).to.equal(true);
    });

    it("Should allow governor to unblacklist an address", async function () {
      await gngn.connect(governor).blacklist(user1.address);
      await gngn.connect(governor).unblacklist(user1.address);
      expect(await gngn.isBlacklisted(user1.address)).to.equal(false);
    });

    it("Should prevent blacklisted address from sending tokens", async function () {
      await gngn.connect(governor).blacklist(user1.address);
      await expect(
        gngn.connect(user1).transfer(user2.address, 100)
      ).to.be.revertedWith("GNGN: sender is blacklisted");
    });

    it("Should prevent tokens being sent to blacklisted address", async function () {
      await gngn.connect(governor).blacklist(user2.address);
      await expect(
        gngn.connect(user1).transfer(user2.address, 100)
      ).to.be.revertedWith("GNGN: recipient is blacklisted");
    });

    it("Should prevent minting to blacklisted address", async function () {
      await gngn.connect(governor).blacklist(user1.address);
      await expect(
        gngn.connect(governor).mint(user1.address, 500)
      ).to.be.revertedWith("GNGN: recipient is blacklisted");
    });
  });
}); 