const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GNGN and MultiSigWallet Integration", function () {
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

    describe("MultiSig Minting", function () {
        it("Should respect GNGN rate limits when minting through MultiSig", async function () {
            // Submit and confirm mint transaction for max amount
            await multiSigWallet.connect(signer1).submitMintTransaction(user1.address, ethers.utils.parseEther("1000000"));
            await multiSigWallet.connect(signer2).confirmTransaction(0);

            // Try to mint more through MultiSig
            await multiSigWallet.connect(signer1).submitMintTransaction(user1.address, ONE_TOKEN);
            await multiSigWallet.connect(signer2).confirmTransaction(1);

            // Check that second mint failed due to rate limit
            expect(await gngn.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("1000000"));
        });

        it("Should respect GNGN max supply when minting through MultiSig", async function () {
            // Try to mint more than max supply
            await multiSigWallet.connect(signer1).submitMintTransaction(user1.address, ethers.utils.parseEther("1000000001"));
            await multiSigWallet.connect(signer2).confirmTransaction(0);

            // Check that mint failed due to max supply
            expect(await gngn.totalSupply()).to.equal(0);
        });

        it("Should respect GNGN blacklist when minting through MultiSig", async function () {
            // Blacklist user1
            await gngn.connect(owner).blacklist(user1.address);

            // Try to mint to blacklisted address through MultiSig
            await multiSigWallet.connect(signer1).submitMintTransaction(user1.address, ONE_TOKEN);
            await multiSigWallet.connect(signer2).confirmTransaction(0);

            // Check that mint failed due to blacklist
            expect(await gngn.balanceOf(user1.address)).to.equal(0);
        });
    });

    describe("MultiSig Burning", function () {
        beforeEach(async function () {
            // Mint tokens to user1 first
            await multiSigWallet.connect(signer1).submitMintTransaction(user1.address, ethers.utils.parseEther("1000000"));
            await multiSigWallet.connect(signer2).confirmTransaction(0);
        });

        it("Should respect GNGN rate limits when burning through MultiSig", async function () {
            // Submit and confirm burn transaction for max amount
            await multiSigWallet.connect(signer1).submitBurnTransaction(user1.address, ethers.utils.parseEther("1000000"));
            await multiSigWallet.connect(signer2).confirmTransaction(1);

            // Try to burn more through MultiSig
            await multiSigWallet.connect(signer1).submitBurnTransaction(user1.address, ONE_TOKEN);
            await multiSigWallet.connect(signer2).confirmTransaction(2);

            // Check that second burn failed due to rate limit
            expect(await gngn.balanceOf(user1.address)).to.equal(0);
        });

        it("Should respect GNGN blacklist when burning through MultiSig", async function () {
            // Blacklist user1
            await gngn.connect(owner).blacklist(user1.address);

            // Try to burn from blacklisted address through MultiSig
            await multiSigWallet.connect(signer1).submitBurnTransaction(user1.address, ONE_TOKEN);
            await multiSigWallet.connect(signer2).confirmTransaction(1);

            // Check that burn still succeeds (blacklist doesn't affect burning)
            expect(await gngn.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("999999"));
        });
    });

    describe("Emergency Scenarios", function () {
        it("Should respect GNGN pause when minting through MultiSig", async function () {
            // Pause GNGN
            await gngn.connect(owner).pause();

            // Try to mint through MultiSig while paused
            await multiSigWallet.connect(signer1).submitMintTransaction(user1.address, ONE_TOKEN);
            await multiSigWallet.connect(signer2).confirmTransaction(0);

            // Check that mint failed due to pause
            expect(await gngn.balanceOf(user1.address)).to.equal(0);
        });

        it("Should respect GNGN pause when burning through MultiSig", async function () {
            // Mint tokens first
            await multiSigWallet.connect(signer1).submitMintTransaction(user1.address, ONE_TOKEN);
            await multiSigWallet.connect(signer2).confirmTransaction(0);

            // Pause GNGN
            await gngn.connect(owner).pause();

            // Try to burn through MultiSig while paused
            await multiSigWallet.connect(signer1).submitBurnTransaction(user1.address, ONE_TOKEN);
            await multiSigWallet.connect(signer2).confirmTransaction(1);

            // Check that burn failed due to pause
            expect(await gngn.balanceOf(user1.address)).to.equal(ONE_TOKEN);
        });
    });

    describe("MultiSig Governance", function () {
        it("Should allow MultiSig to perform governor operations", async function () {
            // Mint through MultiSig
            await multiSigWallet.connect(signer1).submitMintTransaction(user1.address, ONE_TOKEN);
            await multiSigWallet.connect(signer2).confirmTransaction(0);

            // Burn through MultiSig
            await multiSigWallet.connect(signer1).submitBurnTransaction(user1.address, ONE_TOKEN);
            await multiSigWallet.connect(signer2).confirmTransaction(1);

            // Verify operations succeeded
            expect(await gngn.balanceOf(user1.address)).to.equal(0);
        });

        it("Should maintain proper governor permissions", async function () {
            // Verify MultiSig is governor
            expect(await gngn.isGovernor(multiSigWallet.address)).to.be.true;

            // Verify individual signers are not governors
            expect(await gngn.isGovernor(signer1.address)).to.be.false;
            expect(await gngn.isGovernor(signer2.address)).to.be.false;
            expect(await gngn.isGovernor(signer3.address)).to.be.false;
        });
    });
}); 