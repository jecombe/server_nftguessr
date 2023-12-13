const { Contract, Wallet, ethers } = require("ethers");
const dotenv = require("dotenv");
const nftGuessrAbi = require("../../abi/NftGuessr.json");
const { loggerServer } = require("../utils/logger");
const path = require("path");
var Mutex = require("async-mutex").Mutex;
const mutex = new Mutex();
const pathNfts = path.resolve(__dirname, "../../locations/nfts.json");

dotenv.config();

const provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER);
const contractAddress = process.env.CONTRACT;

const contract = new Contract(contractAddress, nftGuessrAbi, provider);
const signer = new Wallet(process.env.SECRET, provider);
const contractSign = new Contract(process.env.CONTRACT, nftGuessrAbi, signer);

class NftGuessr {
  constructor(utiles, telegram) {
    this.utiles = utiles;

    this.telegram = telegram;
  }

  getObjectCreationAndFees(array) {
    const nftsCreaId = this.utiles.convertArrayIdBigNumberToNumber(array[0]);
    const nftsCreaFees = this.utiles.convertArrayFeesToEth(array[1]);
    return nftsCreaId.map((id, index) => ({ id, fee: nftsCreaFees[index] }));
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
    const relacherVerrou = await mutex.acquire();

    try {
      const rawData = await this.utiles.managerFile.readFile(pathNfts);

      const allLocations = JSON.parse(rawData);
      const validLocations = Object.values(allLocations).filter(
        (location) => location.isValid
      );

      if (validLocations.length === 0) {
        throw new Error("Aucune localisation valide n'est disponible.");
      }

      const randomIndex = Math.floor(Math.random() * validLocations.length);
      return validLocations[randomIndex];
    } finally {
      relacherVerrou();
    }
  }
  async manageDataReset(addressToTokenIds, addrReset) {
    try {
      const obj = this.createOrGetOwnerObject(addressToTokenIds, addrReset);

      const nftsResetAndFees = this.getObjectCreationAndFees(
        await contract.getResetNFTsAndFeesByOwner(addrReset)
      );
      obj.nftsReset = nftsResetAndFees;
    } catch (error) {
      loggerServer.error("manageDataReset", error);
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
      loggerServer.error("manageDataStake", error);
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
      loggerServer.error("manageDataCreator", error);
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
      loggerServer.error("getAddressToTokenIds", error);
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
      loggerServer.error("getAllAddressesAndTokenIds", error);

      return error;
    }
  }

  async getTotalNft() {
    try {
      const totalNFTs = await contract.getTotalNft();
      return totalNFTs.toString();
    } catch (error) {
      loggerServer.error("error getTotalNft", error);
      return error;
    }
  }

  startGpsCheckResultListener() {
    loggerServer.trace("Listening for GpsCheckResult events...");

    contract.on("GpsCheckResult", async (user, result, tokenId) => {
      const formatTokenId = tokenId.toString();
      loggerServer.trace(
        `GpsCheckResult Event - User: ${user}, Token ID: ${formatTokenId}, isWinner: ${result}`
      );
      try {
        if (result) {
          await this.utiles.managerFile.manageFiles({
            nftIds: [formatTokenId],
            fee: [{ [formatTokenId]: 0 }],
            isReset: false,
          });
          const message = `💰 A user win NFT GeoSpace ${formatTokenId} 💰`;
          loggerServer.info(`GpsCheckResult: ${message}`);
          this.telegram.sendMessageLog({
            message: `GpsCheckResult ${message}`,
          });
          this.telegram.sendMessageGroup(
            `💰 User ${user} win NFT GeoSpace ${nftIds} 💰`
          );
        } else {
          const message = `💰 A user lose ${formatTokenId} 💰`;
          loggerServer.info(`GpsCheckResult: ${message}`);
          this.telegram.sendMessageLog({
            message: `GpsCheckResult winner ${nftIds}`,
          });
        }
      } catch (error) {
        loggerServer.fatal(`startGpsCheckResultListener: `, error);
        this.telegram.sendMessageLog({
          message: `Error GpsCheckResult ${nftIds}`,
        });
      }
    });
  }

  async startCreateNFTListener() {
    loggerServer.trace("Listening for createNFT events...");

    contract.on("createNFT", async (user, tokenId, fee) => {
      const tokenIdReadable = tokenId.toString();
      const feeReadable = Math.round(this.utiles.convertWeiToEth(fee)); // Suppose que cette fonction renvoie un nombre représentant la valeur en ether

      // Convertir le fee en nombre JavaScript
      loggerServer.trace(
        `createNFT Event - User: ${user}, Token ID: ${tokenIdReadable}, Fee: ${feeReadable}`
      );
      try {
        const nb = await this.getNFTLocation(tokenIdReadable);
        await this.utiles.managerFile.writeNewNft(
          user,
          tokenIdReadable,
          feeReadable,
          nb
        );

        const message = `💎 Player: ${user} create new GeoSpace with id ${tokenIdReadable} 💎`;
        loggerServer.info(`createNFT: ${message}`);
        this.telegram.sendMessageLog({
          message: `createNFT ${tokenIdReadable}`,
        });
        this.telegram.sendMessageGroup(
          `💎 New NFT create with id ${tokenIdReadable} 💎`
        );
      } catch (error) {
        loggerServer.fatal(`createNFT: `, error);
        this.telegram.sendMessageLog({
          message: `error fatal createNFT ${tokenIdReadable}`,
        });
        return error;
      }
    });
  }

  startResetNFTListener() {
    loggerServer.trace("Listening for ResetNFT events...");
    contract.on("ResetNFT", async (user, tokenId, isReset, tax) => {
      const tokenIdReadable = tokenId.toString();
      const taxReadable = Number(this.utiles.convertWeiToEth(tax));

      loggerServer.trace(
        `ResetNFT Event - User: ${user}, Token ID: ${tokenIdReadable}, isReset: ${isReset}, tax: ${taxReadable}`
      );
      try {
        await this.utiles.managerFile.manageFiles({
          nftIds: [tokenIdReadable],
          fee: [{ [tokenIdReadable]: taxReadable }],
          isReset,
        });
        loggerServer.info(
          `ResetNFT: Token ID: ${tokenIdReadable}, isReset: ${isReset}`
        );
      } catch (error) {
        loggerServer.fatal(`ResetNFT: `, error);
        this.telegram.sendMessageLog({
          message: `error fatal ResetNFT ${nftId}`,
        });
        return error;
      }
    });
  }

  startRewardWithERC20Listener() {
    loggerServer.trace("Listening for RewardWithERC20 events...");

    contract.on("RewardWithERC20", async (user, amount) => {
      const amountReadable = Number(this.utiles.convertWeiToEth(amount));
      loggerServer.info(
        `RewardWithERC20 Event - User: ${user}, Amount: ${amountReadable}`
      );
    });
  }

  startStakingListener() {
    loggerServer.trace("Listening for StakingNFT events...");

    contract.on("StakingNFT", async (user, tokenId, timestamp, isStake) => {
      const tokenIdReadable = tokenId.toString();

      loggerServer.info(
        `StakingNFT Event - User: ${user},TokenId: ${tokenIdReadable} isStake: ${isStake} Timestamp: ${timestamp}`
      );
    });
  }

  startListeningEvents() {
    this.startCreateNFTListener();
    this.startGpsCheckResultListener();
    this.startRewardWithERC20Listener();
    this.startStakingListener();
    this.startResetNFTListener();
  }
}

module.exports = {
  NftGuessr,
};
