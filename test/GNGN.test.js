const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GNGN", function () {
    let GNGN;
    let gngn;
    let owner;
    let governor;
    let user1;
    let user2;
    const ONE_TOKEN = ethers.utils.parseEther("1");
    const MAX_MINT_PER_PERIOD = ethers.utils.parseEther("1000000"); // 1 million tokens
    const MAX_SUPPLY = ethers.utils.parseEther("1000000000"); // 1 billion tokens

    beforeEach(async function () {
        [owner, governor, user1, user2] = await ethers.getSigners();
        GNGN = await ethers.getContractFactory("GNGN");
        gngn = await GNGN.deploy();
        await gngn.deployed();

        // Add governor role
        await gngn.addGovernor(governor.address);
    });

    describe("Deployment", function () {
        it("Should set the right owner and governor", async function () {
            expect(await gngn.isGovernor(owner.address)).to.be.true;
            expect(await gngn.isGovernor(governor.address)).to.be.true;
            expect(await gngn.isGovernor(user1.address)).to.be.false;
        });

        it("Should have correct name and symbol", async function () {
            expect(await gngn.name()).to.equal("G-Naira");
            expect(await gngn.symbol()).to.equal("gNGN");
        });
    });

    describe("Minting", function () {
        it("Should allow governor to mint tokens", async function () {
            await gngn.connect(governor).mint(user1.address, ONE_TOKEN);
            expect(await gngn.balanceOf(user1.address)).to.equal(ONE_TOKEN);
        });

        it("Should not allow non-governor to mint tokens", async function () {
            await expect(
                gngn.connect(user1).mint(user2.address, ONE_TOKEN)
            ).to.be.revertedWith("GovernorRole: caller is not a governor");
        });

        it("Should not mint to blacklisted address", async function () {
            await gngn.connect(governor).blacklist(user1.address);
            await expect(
                gngn.connect(governor).mint(user1.address, ONE_TOKEN)
            ).to.be.revertedWith("GNGN: recipient is blacklisted");
        });

        it("Should respect rate limits", async function () {
            await gngn.connect(governor).mint(user1.address, MAX_MINT_PER_PERIOD);
            await expect(
                gngn.connect(governor).mint(user1.address, ONE_TOKEN)
            ).to.be.revertedWith("GNGN: mint rate limit exceeded");
        });

        it("Should not exceed max supply", async function () {
            await expect(
                gngn.connect(governor).mint(user1.address, MAX_SUPPLY.add(ONE_TOKEN))
            ).to.be.revertedWith("GNGN: would exceed max supply");
        });
    });

    describe("Burning", function () {
        beforeEach(async function () {
            await gngn.connect(governor).mint(user1.address, MAX_MINT_PER_PERIOD);
        });

        it("Should allow governor to burn tokens", async function () {
            await gngn.connect(governor).burn(user1.address, ONE_TOKEN);
            expect(await gngn.balanceOf(user1.address)).to.equal(MAX_MINT_PER_PERIOD.sub(ONE_TOKEN));
        });

        it("Should not allow non-governor to burn tokens", async function () {
            await expect(
                gngn.connect(user1).burn(user2.address, ONE_TOKEN)
            ).to.be.revertedWith("GovernorRole: caller is not a governor");
        });

        it("Should respect burn rate limits", async function () {
            await gngn.connect(governor).burn(user1.address, MAX_BURN_PER_PERIOD);
            await expect(
                gngn.connect(governor).burn(user1.address, ONE_TOKEN)
            ).to.be.revertedWith("GNGN: burn rate limit exceeded");
        });
    });

    describe("Blacklisting", function () {
        it("Should allow governor to blacklist address", async function () {
            await gngn.connect(governor).blacklist(user1.address);
            expect(await gngn.isBlacklisted(user1.address)).to.be.true;
        });

        it("Should not allow non-governor to blacklist address", async function () {
            await expect(
                gngn.connect(user1).blacklist(user2.address)
            ).to.be.revertedWith("GovernorRole: caller is not a governor");
        });

        it("Should prevent blacklisted address from sending tokens", async function () {
            await gngn.connect(governor).mint(user1.address, ONE_TOKEN);
            await gngn.connect(governor).blacklist(user1.address);
            await expect(
                gngn.connect(user1).transfer(user2.address, ONE_TOKEN)
            ).to.be.revertedWith("GNGN: sender is blacklisted");
        });

        it("Should prevent blacklisted address from receiving tokens", async function () {
            await gngn.connect(governor).mint(user1.address, ONE_TOKEN);
            await gngn.connect(governor).blacklist(user2.address);
            await expect(
                gngn.connect(user1).transfer(user2.address, ONE_TOKEN)
            ).to.be.revertedWith("GNGN: recipient is blacklisted");
        });

        it("Should allow governor to unblacklist address", async function () {
            await gngn.connect(governor).blacklist(user1.address);
            await gngn.connect(governor).unblacklist(user1.address);
            expect(await gngn.isBlacklisted(user1.address)).to.be.false;
        });
    });

    describe("Pausing", function () {
        it("Should allow governor to pause contract", async function () {
            await gngn.connect(governor).pause();
            await expect(
                gngn.connect(governor).mint(user1.address, ONE_TOKEN)
            ).to.be.revertedWith("Pausable: paused");
        });

        it("Should not allow non-governor to pause contract", async function () {
            await expect(
                gngn.connect(user1).pause()
            ).to.be.revertedWith("GovernorRole: caller is not a governor");
        });

        it("Should allow governor to unpause contract", async function () {
            await gngn.connect(governor).pause();
            await gngn.connect(governor).unpause();
            await gngn.connect(governor).mint(user1.address, ONE_TOKEN);
            expect(await gngn.balanceOf(user1.address)).to.equal(ONE_TOKEN);
        });
    });

    describe("Rate Limit Status", function () {
        it("Should return correct rate limit status", async function () {
            const [minted, burned, timeUntilReset] = await gngn.getRateLimitStatus();
            expect(minted).to.equal(0);
            expect(burned).to.equal(0);
            expect(timeUntilReset).to.be.gt(0);
        });

        it("Should reset rate limits after period", async function () {
            await gngn.connect(governor).mint(user1.address, ONE_TOKEN);
            
            // Fast forward time by 25 hours
            await ethers.provider.send("evm_increaseTime", [25 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            const [minted, burned] = await gngn.getRateLimitStatus();
            expect(minted).to.equal(0);
            expect(burned).to.equal(0);
        });
    });
}); 