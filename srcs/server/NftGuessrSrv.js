const express = require("express");
const app = express();
const cors = require("cors");

const { NftGuessr } = require("../game/NftGuessr");
const { Utiles } = require("../utils/Utiles");
const { logger } = require("../utils/logger");
const { Telegram } = require("../utils/Telegram");
const path = require("path");

const paths = path.resolve(__dirname, "../../locations/validLocations.json");

const pathSave = path.resolve(__dirname, "../../locations/saveLocations.json");

const port = 8000;

class Server {
  constructor() {
    this.utiles = new Utiles();
    this.nftGuessr = new NftGuessr(this.utiles);
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
        logger.info("get-fees");
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
        logger.info("get-minimum-nft-stake.");
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
        logger.info("get-total-nft-stake.");
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
        logger.info("get-total-nft-stake.");
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
        logger.info("get-total-nft-stake.");
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
        logger.info("get-total-nft");
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
        logger.info(`get-gps ${randomCoordinates.id}`);

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
        logger.info("get-holder-and-token");
      } catch (error) {
        logger.error("get-holder-and-token.", error);

        res.status(500).send("Error intern server (1).");
      }
    });
  }

  getLocationToAdd(rawDataSave, nftIds, fees) {
    let saveLocations = JSON.parse(rawDataSave);
    let locationsToAdd = []; // Tableau pour stocker les emplacements à ajouter

    // Iterate over the array of nftIds
    nftIds.forEach((id) => {
      const locationToAdd = saveLocations.find(
        (location) => location.id === id
      );
      if (locationToAdd) {
        locationToAdd.tax = Number(fees[id].toString());
        locationsToAdd.push(locationToAdd);
      }
    });
    this.saveLocations = saveLocations;

    // Utilisez let ici pour déclarer saveLocations
    return { locationsToAdd };
  }

  async addLocation(nftIds, validLocationsPath, locationsToAdd) {
    try {
      const rawDataValid = await this.utiles.managerFile.readFile(
        validLocationsPath
      );
      logger.trace(`reset-nft ${nftIds} read validLocationsPath`);

      let validLocations = JSON.parse(rawDataValid);

      // Add locations from the locationsToAdd array to validLocations if not already present
      locationsToAdd.forEach((location) => {
        const isLocationPresent = validLocations.some(
          (existingLocation) => existingLocation.id === location.id
        );

        if (!isLocationPresent) {
          validLocations.push(location);
        }
      });
      return validLocations;
    } catch (error) {
      throw `addLocation ${error}`;
    }
  }

  async manageResetAndWin(req) {
    const { nftIds, fee, isReset, isWinner } = req.body;
    try {
      logger.info(`reset-nft start save and delete with nft: ${nftIds}`);

      const saveLocationsPath = isReset ? pathSave : paths;
      const validLocationsPath = isReset ? paths : pathSave;

      const rawDataSave = await this.utiles.managerFile.readFile(
        saveLocationsPath
      );
      logger.trace(`reset-nft ${nftIds} read saveLocationsPath`);
      let { locationsToAdd } = this.getLocationToAdd(rawDataSave, nftIds, fee);

      // Read the existing validLocations.json
      let validLocations = await this.addLocation(
        nftIds,
        validLocationsPath,
        locationsToAdd
      );

      await this.saveDataToFile({
        validLocations,
        validLocationsPath,
        saveLocationsPath,
        nftIds,
      });

      logger.trace(`reset-nft ${nftIds} write saveLocationsPath`);
      logger.info(`reset-nft ${nftIds} saved !`);
      this.telegram.sendMessageLog({ message: `reset-nft ${nftIds}` });
      if (isWinner) {
        this.telegram.sendMessageGroup(
          `💰 A user win NFT GeoSpace ${nftIds} 💰`
        );
        this.telegram.sendMessageLog({
          message: `reset-nft winner ${nftIds}`,
        });
      }
    } catch (error) {
      throw error;
    }
  }

  async saveDataToFile(params) {
    const {
      validLocations,
      validLocationsPath,

      saveLocationsPath,
      nftIds,
    } = params;
    try {
      // Save the updated validLocations.json
      await this.utiles.managerFile.writeFile(
        validLocationsPath,
        validLocations
      );
      logger.trace(`reset-nft ${nftIds} write validLocationsPath`);

      // Remove the added locations from saveLocations
      this.saveLocations = this.saveLocations.filter(
        (location) => !nftIds.includes(location.id)
      );
      // Save the updated saveLocations.json
      await this.utiles.managerFile.writeFile(
        saveLocationsPath,
        this.saveLocations
      );
    } catch (error) {
      throw `saveDataToFile: ${error}`;
    }
  }

  async newCoordinates(req) {
    const { nftId, addressOwner } = req.body;

    try {
      logger.info(`request-new-coordinates start with nft id: ${nftId}`);

      const data = await this.utiles.managerFile.readFile(paths);
      let contenuJSON = JSON.parse(data);

      const indexToRemove = this.utiles.findLocationId(contenuJSON, nftId);

      if (indexToRemove !== -1) {
        throw error;
      }
      const nb = await this.nftGuessr.getNFTLocation(nftId);
      logger.trace(`request-new-coordinates ${nftId} get nb `);

      const fee = await this.nftGuessr.getFee(addressOwner, nftId);
      logger.trace(`request-new-coordinates ${nftId} get fees`);

      const toWrite = this.nftGuessr.formatNftToJson(nb, fee, nftId);

      contenuJSON.push(toWrite);
      await this.utiles.managerFile.writeFile(paths, contenuJSON);
      logger.trace(`request-new-coordinates ${nftId} write file`);
      logger.info(`request-new-coordinates ${nftId} saved !`);
      this.telegram.sendMessageLog({
        message: `request-new-coordinates ${nftId}`,
      });
      this.telegram.sendMessageGroup(`💎 New NFT create with id ${nftId} 💎`);
    } catch (error) {
      throw error;
    }
  }

  startPostRequest() {
    app.post("/api/reset-nft", async (req, res) => {
      try {
        await this.manageResetAndWin(req);
        res.json({ success: true });
      } catch (error) {
        res.status(500).send("Error intern server (6).");
        this.telegram.sendMessageLog({
          message: `error reset-nft ${req.body.nftIds}`,
        });
        logger.fatal(`reset-nft ${req.body.nftIds}`, error);
      }
    });
    app.post(
      "/api/request-new-coordinates",

      async (req, res) => {
        try {
          await this.newCoordinates(req);
          res.json({ success: true });
        } catch (error) {
          logger.fatal(`request-new-coordinates ${req.body.nftId}`, error);
          res.status(500).send("Error intern server (6).");
          this.telegram.sendMessageLog({
            message: `Error request-new-coordinates ${req.body.nftId}`,
          });
        }
      }
    );
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

  getApi() {
    this.getFees();
    this.getMinimumStake();
    this.getFeesCreation();
    this.getRewardStaker();
    this.getRewardWinner();
    this.getTotalNft();
    this.getHolderAndTokens();
    this.getGps();
  }
  postApi() {
    this.startPostRequest();
  }
  startApp() {
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.listen(port, () => {
      logger.info(`Server is listening on port ${port}`);
    });
  }

  // fetchData() {
  //   logger.trace("Fetch data");

  //   this.getFees();
  //   this.getMinimumStake();
  //   this.getTotalNftStake();
  //   this.getTotalNft();
  //   this.getHolderAndTokens();
  // }

  // startFetchStats() {
  //   setInterval(async () => {
  //     await fetchData();
  //   }, 500000);
  // }
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
    this.postApi();
    this.getApi();
    this.startIntervals();
  }
}

module.exports = {
  Server,
};
