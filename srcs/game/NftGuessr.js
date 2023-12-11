const { Contract, Wallet, ethers } = require("ethers");
const dotenv = require("dotenv");
const nftGuessrAbi = require("../../abi/NftGuessr.json");
const { logger } = require("../utils/logger");
const path = require("path");

const paths = path.resolve(__dirname, "../../locations/validLocations.json");

const pathSave = path.resolve(__dirname, "../../locations/saveLocations.json");

dotenv.config();

const provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER);
const contractAddress = process.env.CONTRACT;

const contract = new Contract(contractAddress, nftGuessrAbi, provider);
const signer = new Wallet(process.env.SECRET, provider);
const contractSign = new Contract(process.env.CONTRACT, nftGuessrAbi, signer);

class NftGuessr {
  constructor(utiles) {
    this.utiles = utiles;
  }

  getObjectCreationAndFees(array) {
    const nftsCreaId = this.utiles.convertArrayIdBigNumberToNumber(array[0]);
    const nftsCreaFees = this.utiles.convertArrayFeesToEth(array[1]);
    return nftsCreaId.map((id, index) => ({ id, fee: nftsCreaFees[index] }));
  }

  formatNftToJson(nb, fee, nftId) {
    const tableauNombres = this.utiles.convertArrayIdBigNumberToNumber(nb);

    const latitude = tableauNombres[4];
    const longitude = tableauNombres[5];

    const convertLat = this.utiles.formaterNumber(latitude);
    const convertLng = this.utiles.formaterNumber(longitude);
    return {
      latitude: Number(convertLat),
      longitude: Number(convertLng),
      northLat: tableauNombres[0],
      southLat: tableauNombres[1],
      eastLon: tableauNombres[2],
      westLon: tableauNombres[3],
      tax: Math.round(this.utiles.convertWeiToEth(fee)),
      id: nftId,
      lat: tableauNombres[4],
      lng: tableauNombres[5],
    };
  }
  async getFees() {
    return contract.fees();
  }

  async getFee(address, nftId) {
    return contractSign.getFee(address, nftId);
  }

  async getTotalStakedNFTs() {
    return contract.getTotalStakedNFTs();
  }

  getNbStake() {
    return contract.nbNftStake();
  }

  getFeesCreation() {
    return contract.feesCreation();
  }
  getAmountRewardUsers() {
    return contract.amountRewardUsers();
  }

  getAmountRewardUser() {
    return contract.amountRewardUser();
  }
  getObjectStatsGame() {
    return {
      nfts: [],
      nftsStake: [],
      nftsReset: [],
      nftsCreation: [],
    };
  }
  getNFTLocation(nftId) {
    return contractSign.getNFTLocation(nftId);
  }

  createOrGetOwnerObject(addressToTokenIds, owner) {
    if (!addressToTokenIds[owner]) {
      addressToTokenIds[owner] = this.getObjectStatsGame();
    }
    return addressToTokenIds[owner];
  }

  async getAddressStakeWithToken(tokenId) {
    return contract.getAddressStakeWithToken(tokenId);
  }
  async getAddressResetWithToken(tokenId) {
    return contract.getAddressResetWithToken(tokenId);
  }
  async getAddressCreationWithToken(tokenId) {
    return contract.getAddressCreationWithToken(tokenId);
  }
  async getResetNFTsAndFeesByOwner(address) {
    return contract.getResetNFTsAndFeesByOwner(address);
  }
  async getNFTsStakedByOwner(address) {
    return contract.getNFTsStakedByOwner(address);
  }
  async getNftCreationAndFeesByUser(address) {
    return contract.getNftCreationAndFeesByUser(address);
  }

  async rewardUsersWithERC20() {
    return contractSign.rewardUsersWithERC20();
  }

  async getTotalResetNFTs() {
    return contract.getTotalResetNFTs();
  }

  async getRandomLocation() {
    const rawData = await this.utiles.managerFile.readFile(
      "./locations/validLocations.json"
    );

    const randomLocations = JSON.parse(rawData);
    const randomIndex = Math.floor(Math.random() * randomLocations.length);
    return randomLocations[randomIndex];
  }

  async manageDataReset(addressToTokenIds, addrReset) {
    try {
      const obj = this.createOrGetOwnerObject(addressToTokenIds, addrReset);

      const nftsResetAndFees = this.getObjectCreationAndFees(
        await contract.getResetNFTsAndFeesByOwner(addrReset)
      );

      obj.nftsReset = nftsResetAndFees;
    } catch (error) {
      logger.error("manageDataReset", error);
      return error;
    }
  }

  async manageDataStake(addressToTokenIds, addrStake) {
    try {
      const obj = this.createOrGetOwnerObject(addressToTokenIds, addrStake);
      const nftsStake = await this.getNFTsStakedByOwner(addrStake);
      const nftsstaked = nftsStake.map((bigNumber) => Number(bigNumber));

      obj.nftsStake = nftsstaked;
    } catch (error) {
      logger.error("manageDataStake", error);
      return error;
    }
  }
  async manageDataCreator(addressToTokenIds, addrCreator) {
    try {
      const obj = this.createOrGetOwnerObject(addressToTokenIds, addrCreator);

      const nftsCreationReset = this.getObjectCreationAndFees(
        await this.getNftCreationAndFeesByUser(addrCreator)
      );
      obj.nftsCreation = nftsCreationReset;
    } catch (error) {
      logger.error("manageDataCreator", error);
      return error;
    }
  }
  async getAddressToTokenIds(owner, tokenId, addressToTokenIds) {
    const objectPrincipal = this.createOrGetOwnerObject(
      addressToTokenIds,
      owner
    );

    objectPrincipal.nfts.push(tokenId);
    try {
      const addrStake = await this.getAddressStakeWithToken(tokenId);
      const addrReset = await this.getAddressResetWithToken(tokenId);
      const addrCreator = await this.getAddressCreationWithToken(tokenId);

      if (addrReset !== "0x0000000000000000000000000000000000000000") {
        await this.manageDataReset(addressToTokenIds, addrReset);
      }

      if (addrStake !== "0x0000000000000000000000000000000000000000") {
        await this.manageDataStake(addressToTokenIds, addrStake);
      }

      if (
        addrCreator !== "0x0000000000000000000000000000000000000000" &&
        addrCreator.toLowerCase() !== process.env.OWNER
      ) {
        await this.manageDataCreator(addressToTokenIds, addrCreator);
      }
    } catch (error) {
      logger.error("getAddressToTokenIds", error);
      return error;
    }
  }

  async getAllAddressesAndTokenIds() {
    const totalSupply = await contract.totalSupply();
    const addressToTokenIds = {};
    const promises = [];
    for (let i = 1; i <= totalSupply; i++) {
      const currentOwner = await contract.ownerOf(i);
      promises.push(
        this.getAddressToTokenIds(currentOwner, i, addressToTokenIds)
      );
    }
    try {
      await Promise.all(promises);
      return addressToTokenIds;
    } catch (error) {
      logger.error("getAllAddressesAndTokenIds", error);

      return error;
    }
  }

  async getTotalNft() {
    try {
      const totalNFTs = await contract.getTotalNft();
      return totalNFTs.toString();
    } catch (error) {
      logger.error("error getTotalNft", error);
      return error;
    }
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
        locationToAdd.tax = fees[id];
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
      logger.trace(`GpsCheckResult ${nftIds} read validLocationsPath`);

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
      logger.trace(`GpsCheckResult ${nftIds} write validLocationsPath`);

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

  async manageFile(req) {
    const { nftIds, fee, isReset } = req;
    try {
      logger.info(`manageFile start save and delete with nft: ${nftIds}`);

      const saveLocationsPath = isReset ? pathSave : paths;
      const validLocationsPath = isReset ? paths : pathSave;

      const rawDataSave = await this.utiles.managerFile.readFile(
        saveLocationsPath
      );
      logger.trace(`manageFile ${nftIds} read saveLocationsPath`);
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

      logger.trace(`manageFile ${nftIds} write saveLocationsPath`);
      logger.info(`manageFile ${nftIds} saved !`);
    } catch (error) {
      throw error;
    }
  }

  startGpsCheckResultListener() {
    // Subscribe to future events using the filter
    logger.trace("Listening for GpsCheckResult events...");

    // Set an interval to periodically check for new events
    // Retrieve changes in the filter
    contract.on("GpsCheckResult", async (user, result, tokenId) => {
      const formatTokenId = Number(tokenId.toString());
      logger.trace(
        `GpsCheckResult Event - User: ${user}, Token ID: ${formatTokenId}, isWinner: ${result}`
      );
      try {
        if (result) {
          await this.manageFile({
            nftIds: [formatTokenId],
            fee: [{ [formatTokenId]: 0 }],
            isReset: false,
          });
          const message = `💰 A user win NFT GeoSpace ${formatTokenId} 💰`;
          logger.info(`GpsCheckResult: ${message}`);
          // this.telegram.sendMessageLog({ message: `GpsCheckResult ${message}` });
          //   this.telegram.sendMessageGroup(
          //     `💰 User ${user} win NFT GeoSpace ${nftIds} 💰`
          //   );
          //   this.telegram.sendMessageLog({
          //     message: `GpsCheckResult winner ${nftIds}`,
          //   });
        } else {
          const message = `💰 A user lose ${formatTokenId} 💰`;
          logger.info(`GpsCheckResult: ${message}`);
          //   this.telegram.sendMessageLog({
          //     message: `GpsCheckResult winner ${nftIds}`,
          //   });
        }
      } catch (error) {
        logger.fatal(`startGpsCheckResultListener: `, error);
        //   this.telegram.sendMessageLog({
        //     message: `Error GpsCheckResult ${nftIds}`,
        //   });
      }
    });
  }

  // Repeat the pattern for other events
  async startCreateNFTListener() {
    logger.trace("Listening for createNFT events...");

    contract.on("createNFT", async (user, tokenId, fee) => {
      const tokenIdReadable = Number(tokenId.toString());
      const feeReadable = Number(fee.toString());
      logger.trace(
        `createNFT Event - User: ${user}, Token ID: ${tokenIdReadable}, Fee: ${feeReadable}`
      );
      try {
        const data = await this.utiles.managerFile.readFile(paths);
        let contenuJSON = JSON.parse(data);

        const indexToRemove = this.utiles.findLocationId(
          contenuJSON,
          tokenIdReadable
        );

        if (indexToRemove !== -1) {
          throw error;
        }

        const nb = await this.getNFTLocation(tokenIdReadable);
        logger.trace(`createNFT ${tokenIdReadable} get nb `);

        logger.trace(`createNFT ${tokenIdReadable} get fees`);

        const toWrite = this.formatNftToJson(nb, feeReadable, tokenIdReadable);

        contenuJSON.push(toWrite);
        await this.utiles.managerFile.writeFile(paths, contenuJSON);
        const message = `💎 New NFT create with id ${tokenIdReadable} 💎`;
        logger.info(`createNFT: ${message}`);

        // this.telegram.sendMessageLog({
        //   message: `createNFT ${tokenIdReadable}`,
        // });
        // this.telegram.sendMessageGroup(`💎 New NFT create with id ${tokenIdReadable} 💎`);
      } catch (error) {
        logger.fatal(`createNFT: `, error);
        // this.telegram.sendMessageLog({
        //   message: `error fatal createNFT ${tokenIdReadable}`,
        // });
        return error;
      }
    });
  }

  startResetNFTListener() {
    logger.trace("Listening for ResetNFT events...");
    contract.on("ResetNFT", async (user, tokenId, isReset, tax) => {
      const tokenIdReadable = Number(tokenId.toString());
      const taxReadable = Number(tax.toString());

      logger.trace(
        `ResetNFT Event - User: ${user}, Token ID: ${tokenIdReadable}, isReset: ${isReset}, tax: ${taxReadable}`
      );
      try {
        await this.utiles.managerFile.manageFile({
          nftIds: [tokenIdReadable],
          fee: [{ [tokenIdReadable]: taxReadable }],
          isReset,
        });
        logger.info(
          `ResetNFT: Token ID: ${tokenIdReadable}, isReset: ${isReset}`
        );
      } catch (error) {
        logger.fatal(`ResetNFT: `, error);
        // this.telegram.sendMessageLog({
        //   message: `error fatal ResetNFT ${nftId}`,
        // });
        return error;
      }
    });
  }

  startRewardWithERC20Listener(changes) {
    logger.trace("Listening for RewardWithERC20 events...");

    // logger.trace("Interval filter events for RewardWithERC20");
    contract.on("RewardWithERC20", async (user, amount) => {
      logger.info(
        `RewardWithERC20 Event - User: ${user}, Amount: ${Number(
          amount.toString()
        )}`
      );
    });
  }

  startListeningEvents() {
    this.startCreateNFTListener();
    this.startGpsCheckResultListener();
    this.startRewardWithERC20Listener();
    this.startResetNFTListener();
  }
}

module.exports = {
  NftGuessr,
};
