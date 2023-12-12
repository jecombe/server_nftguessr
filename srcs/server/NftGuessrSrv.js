const express = require("express");
const app = express();
const cors = require("cors");

const { NftGuessr } = require("../game/NftGuessr");
const { Utiles } = require("../utils/Utiles");
const { logger } = require("../utils/logger");
const { Telegram } = require("../utils/Telegram");
const { Map } = require("../map/Map");

const port = 8000;

class Server {
  constructor() {
    this.utiles = new Utiles();
    this.nftGuessr = new NftGuessr(this.utiles);
    this.mapGoogle = new Map();
    this.telegram = new Telegram(this.utiles, this.nftGuessr);
    this.saveData = {};
    this.startServer();
  }

  getFees() {
    app.get("/api/get-fees", async (req, res) => {
      try {
        const fees = await this.nftGuessr.getFees();

        const rep = Math.round(this.utiles.convertEthToWei(fees));
        res.json(rep.toString());
        logger.trace("get-fees");
      } catch (error) {
        logger.error("get-fees", error);
        res.status(500).send("Error intern server (5).");
      }
    });
  }
  getMinimumStake() {
    app.get("/api/get-minimum-nft-stake", async (req, res) => {
      try {
        const nftsStake = await this.nftGuessr.getNbStake();
        res.json(nftsStake.toString());
        logger.trace("get-minimum-nft-stake.");
      } catch (error) {
        logger.error("get-minimum-nft-stake", error);
        res.status(500).send("Error intern server (4).");
      }
    });
  }
  getFeesCreation() {
    app.get("/api/get-fees-creation", async (req, res) => {
      try {
        const nftsStake = await this.nftGuessr.getFeesCreation();

        res.json(nftsStake.toString());
        logger.trace("get-total-nft-stake.");
      } catch (error) {
        logger.error("get-total-nft-stake.", error);
        res.status(500).send("Error intern server (3).");
      }
    });
  }

  getRewardWinner() {
    app.get("/api/get-reward-winner", async (req, res) => {
      try {
        const nftsStake = await this.nftGuessr.getAmountRewardUser();
        res.json(nftsStake.toString());
        logger.trace("get-total-nft-stake.");
      } catch (error) {
        logger.error("get-total-nft-stake.", error);
        res.status(500).send("Error intern server (3).");
      }
    });
  }

  getRewardStaker() {
    app.get("/api/get-reward-staker", async (req, res) => {
      try {
        const nftsStake = await this.nftGuessr.getAmountRewardUsers();
        res.json(nftsStake.toString());
        logger.trace("get-total-nft-stake.");
      } catch (error) {
        logger.error("get-total-nft-stake.", error);
        res.status(500).send("Error intern server (3).");
      }
    });
  }
  getTotalNft() {
    app.get("/api/get-total-nft", async (req, res) => {
      try {
        const holdersAndTokenIds = await this.nftGuessr.getTotalNft();
        res.json(holdersAndTokenIds);
        logger.trace("get-total-nft");
      } catch (error) {
        logger.error("get-total-nft.", error);
        res.status(500).send("Error intern server (2).");
      }
    });
  }

  getGps() {
    app.get("/api/get-gps", async (req, res) => {
      try {
        const randomCoordinates = await this.nftGuessr.getRandomLocation();
        const ciphertext = this.utiles.encryptData(randomCoordinates);
        logger.trace(`get-gps ${randomCoordinates.id}`);

        res.json(ciphertext);
      } catch (error) {
        logger.error(`get-gps`, error);
        res.status(500).send("Error intern server (0).");
      }
    });
  }

  getHolderAndTokens() {
    app.get("/api/get-holder-and-token", async (req, res) => {
      try {
        const result = await this.nftGuessr.getAllAddressesAndTokenIds();
        res.json(result);
        logger.trace("get-holder-and-token");
      } catch (error) {
        logger.error("get-holder-and-token.", error);

        res.status(500).send("Error intern server (1).");
      }
    });
  }

  getTotalResetNfts() {
    app.get("/api/get-total-nft-reset", async (req, res) => {
      try {
        const nftsStake = await this.nftGuessr.getTotalResetNFTs();
        res.json(nftsStake.toString());
        logger.info("get-total-nft-reset.");
      } catch (error) {
        logger.error("get-total-nft-reset", error);
        res.status(500).send("Error intern server (6).");
      }
    });
  }

  checkGpsCoordinates() {
    app.post("/api/check-new-coordinates", async (req, res) => {
      const { latitude, longitude } = req.body;

      try {
        logger.info(`latitude: ${latitude} / longitude: ${longitude}`);
        const success = await this.mapGoogle.checkStreetViewImage({
          lat: latitude,
          lng: longitude,
        });
        logger.info(`is success: ${success}`);

        res.json({ success });
      } catch (error) {
        logger.error(
          `error check-new-coordinates ${latitude} ${longitude}`,
          error
        );
        this.telegram.sendMessageLog({
          message: "error check-new-coordinates",
        });
        res.status(500).send("Error intern server (7).");
      }
    });
  }

  getApi() {
    this.getFees();
    this.getMinimumStake();
    this.getFeesCreation();
    this.getRewardStaker();
    this.getRewardWinner();
    this.getTotalNft();
    this.getHolderAndTokens();
    this.getGps();
    this.checkGpsCoordinates();
  }
  startApp() {
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.listen(port, () => {
      logger.info(`Server is listening on port ${port}`);
    });
  }

  async rewardUsers() {
    try {
      logger.trace("start reward");
      const rep = await this.nftGuessr.rewardUsersWithERC20();
      await rep.wait();
      logger.info("Reward success !");
      this.telegram.sendMessageGroup(
        `💵 New Reward for staker, next one in 24h 💵`
      );
    } catch (error) {
      logger.fatal("rewardUsers", error);
      this.telegram.sendMessageLog({ message: "error rewardUsers" });
      return error;
    }
  }

  async startIntervals() {
    const intervalInMilliseconds = 24 * 60 * 60 * 1000; // 24 hours
    logger.trace("Start interval reward");
    setInterval(this.rewardUsers.bind(this), intervalInMilliseconds);
  }
  startServer() {
    //this.startFetchStats();
    this.startApp();
    this.getApi();
    this.startIntervals();
    this.nftGuessr.startListeningEvents();
  }
}

module.exports = {
  Server,
};
