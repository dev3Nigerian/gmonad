import { expect } from "chai";
import { ethers } from "hardhat";
import { DailyGM } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("DailyGM", function () {
  // We define a fixture to reuse the same setup in every test.
  let dailyGM: DailyGM;
  let user1: any;
  let user2: any;

  before(async () => {
    [user1, user2] = await ethers.getSigners();
    const dailyGMFactory = await ethers.getContractFactory("DailyGM");
    dailyGM = (await dailyGMFactory.deploy()) as DailyGM;
    await dailyGM.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should initialize with empty lastGM values", async function () {
      expect(await dailyGM.lastGM(user1.address)).to.equal(0);
    });
  });

  describe("GM Functionality", function () {
    it("Should allow a user to say GM", async function () {
      await expect(dailyGM.connect(user1).gm()).to.emit(dailyGM, "GM").withArgs(user1.address, ethers.ZeroAddress);

      // Should have updated lastGM timestamp
      expect(await dailyGM.lastGM(user1.address)).to.be.gt(0);
    });

    it("Should not allow a user to say GM twice in one day", async function () {
      // Try to say GM again
      await expect(dailyGM.connect(user1).gm()).to.be.reverted;
    });

    it("Should allow a user to say GM after 24 hours", async function () {
      // Fast forward time by 24 hours + 1 second
      await time.increase(24 * 60 * 60 + 1);

      // Should now be able to say GM again
      await expect(dailyGM.connect(user1).gm()).to.emit(dailyGM, "GM").withArgs(user1.address, ethers.ZeroAddress);
    });
  });

  describe("GM To Functionality", function () {
    it("Should allow a user to say GM to another user", async function () {
      // Fast forward time for user1
      await time.increase(24 * 60 * 60 + 1);

      await expect(dailyGM.connect(user1).gmTo(user2.address))
        .to.emit(dailyGM, "GM")
        .withArgs(user1.address, user2.address);
    });

    it("Should not allow a user to say GM to themselves", async function () {
      // Fast forward time
      await time.increase(24 * 60 * 60 + 1);

      await expect(dailyGM.connect(user1).gmTo(user1.address)).to.be.reverted;
    });
  });
});
