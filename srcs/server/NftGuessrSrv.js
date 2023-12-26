const express = require("express");
const app = express();
const cors = require("cors");
const { NftGuessr } = require("../game/NftGuessr");
const { Utiles } = require("../utils/Utiles");
const { loggerServer } = require("../utils/logger");
// const { Telegram } = require("../utils/Telegram");
const { Map } = require("../map/Map");

const port = 8000;

class Server {
  constructor(chain) {
    // this.telegram = new Telegram(this.utiles, this.nftGuessr);
    this.utiles = new Utiles();
    // this.nftGuessr =
    //   chain === "zama"
    //     ? new NftGuessr(this.utiles, this?.telegram, "zama")
    //     : new NftGuessr(this.utiles, this?.telegram, "inco");
    this.nftGuessr = new NftGuessr(this.utiles, this?.telegram, "zama");
    this.nftGuessrInco = new NftGuessr(this.utiles, this?.telegram, "inco");
    this.nftGuessrFenix = new NftGuessr(this.utiles, this?.telegram, "fhenix");

    this.mapGoogle = new Map();

    this.startServer();
  }

  getFees() {
    app.get("/api/get-fees", async (req, res) => {
      const { chain } = req.query;

      try {
        let fees;
        if (chain === "inco") fees = await this.nftGuessrInco.getFees();
        else if (chain === "zama") fees = await this.nftGuessr.getFees();
        else if (chain === "fhenix") fees = await this.nftGuessrFenix.getFee();

        const rep = Math.round(this.utiles.convertEthToWei(fees));
        res.json(rep.toString());
        loggerServer.trace(`${chain} get-fees`);
      } catch (error) {
        loggerServer.error(`${chain} get-fees`, error);
        res.status(500).send("Error intern server (5).");
      }
    });
  }
  getMinimumStake() {
    app.get("/api/get-minimum-nft-stake", async (req, res) => {
      const { chain } = req.query;
      console.log(chain);
      try {
        let nftsStake;
        if (chain === "inco") {
          nftsStake = await this.nftGuessrInco.getNbStake();
        } else if (chain === "zama")
          nftsStake = await this.nftGuessr.getNbStake();
        else if (chain === "fhenix")
          nftsStake = await this.nftGuessrFhenix.getNbStake();
        res.json(nftsStake.toString());
        loggerServer.trace(`${chain} get-minimum-nft-stake.`);
      } catch (error) {
        loggerServer.error(`${chain} get-minimum-nft-stake`, error);
        res.status(500).send("Error intern server (4).");
      }
    });
  }
  getFeesCreation() {
    app.get("/api/get-fees-creation", async (req, res) => {
      const { chain } = req.query;

      try {
        let feesCrea;
        if (chain === "inco")
          feesCrea = await this.nftGuessrInco.getFeesCreation();
        else if (chain == "zama")
          feesCrea = await this.nftGuessr.getFeesCreation();
        else if (chain === "fhenix")
          feesCrea = await this.nftGuessrFenix.getFeesCreation();

        res.json(feesCrea.toString());
        loggerServer.trace(`${chain} get-total-nft-stake.`);
      } catch (error) {
        loggerServer.error(`${chain} get-total-nft-stake.`, error);
        res.status(500).send("Error intern server (3).");
      }
    });
  }

  getRewardWinner() {
    app.get("/api/get-reward-winner", async (req, res) => {
      const { chain } = req.query;

      try {
        let amountReward;
        if (chain === "inco")
          amountReward = await this.nftGuessrInco.getAmountRewardUser();
        else if (chain === "zama")
          amountReward = await this.nftGuessr.getAmountRewardUser();
        else if (chain === "fhenix")
          amountReward = await this.nftGuessrFhenix.getAmountRewardUser();
        res.json(amountReward.toString());
        loggerServer.trace(`${chain} get-total-nft-stake.`);
      } catch (error) {
        loggerServer.error(`${chain} get-total-nft-stake.`, error);
        res.status(500).send("Error intern server (3).");
      }
    });
  }

  getRewardStaker() {
    app.get("/api/get-reward-staker", async (req, res) => {
      const { chain } = req.query;

      try {
        let amountRewards;
        if (chain === "inco")
          amountRewards = await this.nftGuessrInco.getAmountRewardUsers();
        else if (chain === "zama")
          amountRewards = await this.nftGuessr.getAmountRewardUsers();
        else if (chain === "fhenix")
          amountRewards = await this.nftGuessrFenix.getAmountRewardUsers();
        res.json(amountRewards.toString());
        loggerServer.trace(`${chain} get-total-nft-stake.`);
      } catch (error) {
        loggerServer.error(`${chain} get-total-nft-stake.`, error);
        res.status(500).send("Error intern server (3).");
      }
    });
  }
  getTotalNft() {
    app.get("/api/get-total-nft", async (req, res) => {
      const { chain } = req.query;

      try {
        let totalNft;
        if (chain === "inco") totalNft = await this.nftGuessrInco.getTotalNft();
        else if (chain === "zama")
          totalNft = await this.nftGuessr.getTotalNft();
        else if (chain === "fhenix")
          totalNft = await this.nftGuessrFenix.getTotalNft();

        res.json(totalNft);
        loggerServer.trace(`${chain} get-total-nft`);
      } catch (error) {
        loggerServer.error(`${chain} get-total-nft.`, error);
        res.status(500).send("Error intern server (2).");
      }
    });
  }

  getGps() {
    app.get("/api/get-gps", async (req, res) => {
      const { chain } = req.query;

      try {
        let randomCoordinates;
        if (chain === "inco") {
          randomCoordinates = await this.nftGuessrInco.getRandomLocation();
        } else if (chain === "zama")
          randomCoordinates = await this.nftGuessr.getRandomLocation();
        else if (chain === "fhenix")
          randomCoordinates = await this.nftGuessrFenix.getRandomLocation();
        const ciphertext = this.utiles.encryptData(randomCoordinates);
        loggerServer.trace(`${chain} get-gps ${randomCoordinates.id}`);

        res.json(ciphertext);
      } catch (error) {
        loggerServer.error(`${chain} get-gps`, error);
        res.status(500).send("Error intern server (0).");
      }
    });
  }

  getHolderAndTokens() {
    app.get("/api/get-holder-and-token", async (req, res) => {
      const { chain } = req.query;
      console.log(req.query);
      try {
        let result;
        if (chain === "inco")
          result = await this.nftGuessrInco.getAllAddressesAndTokenIds();
        else if (chain === "zama")
          result = await this.nftGuessr.getAllAddressesAndTokenIds();
        else if (chain === "fhenix")
          result = await this.nftGuessrFenix.getAllAddressesAndTokenIds();
        res.json(result);
        loggerServer.trace(`${chain} get-holder-and-token`);
      } catch (error) {
        loggerServer.error(`${chain} get-holder-and-token.`, error);
        res.status(500).send("Error intern server (1).");
      }
    });
  }

  getTotalResetNfts() {
    app.get("/api/get-total-nft-reset", async (req, res) => {
      const { chain } = req.query;

      try {
        let nftsStake;
        if (chain === "inco") {
          nftsStake = await this.nftGuessrInco.getTotalResetNFTs();
        } else if (chain === "zama")
          nftsStake = await this.nftGuessr.getTotalResetNFTs();
        else if (chain === "fhenix")
          nftsStake = await this.nftGuessrFenix.getTotalResetNFTs();

        res.json(nftsStake.toString());
        loggerServer.info(`${chain} get-total-nft-reset.`);
      } catch (error) {
        loggerServer.error(`${chain} get-total-nft-reset`, error);
        res.status(500).send("Error intern server (6).");
      }
    });
  }

  checkGpsCoordinates() {
    app.post("/api/check-new-coordinates", async (req, res) => {
      const { latitude, longitude } = req.body;

      try {
        loggerServer.info(`latitude: ${latitude} / longitude: ${longitude}`);
        const success = await this.mapGoogle.checkStreetViewImage({
          lat: latitude,
          lng: longitude,
        });
        loggerServer.info(`is success: ${success}`);

        res.json({ success });
      } catch (error) {
        loggerServer.error(
          `error check-new-coordinates ${latitude} ${longitude}`,
          error
        );
        // this.telegram.sendMessageLog({
        //   message: "error check-new-coordinates",
        // });
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
      loggerServer.info(`Server is listening on port ${port}`);
    });
  }

  async rewardUsers() {
    try {
      loggerServer.trace("start reward");
      const rep = await this.nftGuessr.rewardUsersWithERC20();
      await rep.wait();
      // const repInco = await this.nftGuessrInco.rewardUsersWithERC20();
      // await repInco.wait();
      // const repInco = await this.nftGuessrIncoFhenix.rewardUsersWithERC20();
      // await repInco.wait();
      loggerServer.info("Reward success !");
      // this.telegram.sendMessageGroup(
      //   `💵 New Reward for staker, next one in 24h 💵`
      // );
    } catch (error) {
      loggerServer.fatal("rewardUsers", error);
      // this.telegram.sendMessageLog({ message: "error rewardUsers" });
      return error;
    }
  }

  async startIntervals() {
    const intervalInMilliseconds = 24 * 60 * 60 * 1000; // 24 hours
    loggerServer.trace("Start interval reward");
    setInterval(this.rewardUsers.bind(this), intervalInMilliseconds);
  }
  startServer() {
    //this.startFetchStats();
    this.startApp();
    this.getApi();
    this.startIntervals();
    this.nftGuessr.startListeningEvents();
    this.nftGuessrInco.startListeningEvents();
    this.nftGuessrFenix.startListeningEvents();
  }
}

module.exports = {
  Server,
};
