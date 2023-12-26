const { Contract, Wallet, ethers } = require("ethers");
const dotenv = require("dotenv");
const nftGuessrAbi = require("../../abi/NftGuessr.json");
const { loggerServer } = require("../utils/logger");
const path = require("path");
var Mutex = require("async-mutex").Mutex;
const mutex = new Mutex();
const pathNfts = path.resolve(__dirname, "../../locations/nfts.json");
const pathNftsInco = path.resolve(__dirname, "../../locations/nftsInco.json");
const pathNftsFhenix = path.resolve(
  __dirname,
  "../../locations/nftsFhenix.json"
);

dotenv.config();

const provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER);
const contractAddress = process.env.CONTRACT;

const contract = new Contract(contractAddress, nftGuessrAbi, provider);
const signer = new Wallet(process.env.SECRET, provider);
const contractSign = new Contract(process.env.CONTRACT, nftGuessrAbi, signer);

const providerInco = new ethers.providers.JsonRpcProvider(
  process.env.PROVIDER_INCO
);
const contractAddressInco = process.env.CONTRACT_INCO;

const contractInco = new Contract(
  contractAddressInco,
  nftGuessrAbi,
  providerInco
);
const signerInco = new Wallet(process.env.SECRET, providerInco);
const contractSignInco = new Contract(
  process.env.CONTRACT_INCO,
  nftGuessrAbi,
  signerInco
);

const providerFhenix = new ethers.providers.JsonRpcProvider(
  process.env.PROVIDER_FHENIX
);
const contractAddressFhenix = process.env.CONTRACT_FHENIX;

const contractFhenix = new Contract(
  contractAddressFhenix,
  nftGuessrAbi,
  providerFhenix
);
const signerFhenix = new Wallet(process.env.SECRET, providerFhenix);
const contractSignFhenix = new Contract(
  process.env.CONTRACT_FHENIX,
  nftGuessrAbi,
  signerFhenix
);

class NftGuessr {
  constructor(utiles, telegram, chain) {
    this.utiles = utiles;
    this.chain = chain;
    this.contract = this.getContract(chain);
    this.contractSign = this.getContractSign(chain);
    this.pathNfts = this.getPathNfts(chain);

    // this.telegram = telegram;
  }

  getContract(chain) {
    if (chain === "zama") {
      return contract;
    } else if (chain === "inco") {
      return contractInco;
    } else if (chain === "fhenix") {
      return contractFhenix;
    }
  }

  getContractSign(chain) {
    if (chain === "zama") {
      return contractSign;
    } else if (chain === "inco") {
      return contractSignInco;
    } else if (chain === "fhenix") {
      return contractSignFhenix;
    }
  }

  getPathNfts(chain) {
    if (chain === "zama") {
      return pathNfts;
    } else if (chain === "inco") {
      return pathNftsInco;
    } else if (chain === "fhenix") {
      return pathNftsFhenix;
    }
  }

  getObjectCreationAndFees(array) {
    const nftsCreaId = this.utiles.convertArrayIdBigNumberToNumber(array[0]);
    const nftsCreaFees = this.utiles.convertArrayFeesToEth(array[1]);
    return nftsCreaId.map((id, index) => ({ id, fee: nftsCreaFees[index] }));
  }

  async getFees() {
    return this.contract.fees();
  }

  async getFee(address, nftId) {
    return this.contractSign.getFee(address, nftId);
  }

  async getTotalStakedNFTs() {
    return this.contract.getTotalStakedNFTs();
  }

  getNbStake() {
    return this.contract.nbNftStake();
  }

  getFeesCreation() {
    return this.contract.feesCreation();
  }
  getAmountRewardUsers() {
    return this.contract.amountRewardUsers();
  }

  getAmountRewardUser() {
    return this.contract.amountRewardUser();
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
    return this.contractSign.getNFTLocation(nftId);
  }

  createOrGetOwnerObject(addressToTokenIds, owner) {
    if (!addressToTokenIds[owner]) {
      addressToTokenIds[owner] = this.getObjectStatsGame();
    }
    return addressToTokenIds[owner];
  }

  async getAddressStakeWithToken(tokenId) {
    return this.contract.getAddressStakeWithToken(tokenId);
  }
  async getAddressResetWithToken(tokenId) {
    return this.contract.getAddressResetWithToken(tokenId);
  }
  async getAddressCreationWithToken(tokenId) {
    return this.contract.getAddressCreationWithToken(tokenId);
  }
  async getResetNFTsAndFeesByOwner(address) {
    return this.contract.getResetNFTsAndFeesByOwner(address);
  }
  async getNFTsStakedByOwner(address) {
    return this.contract.getNFTsStakedByOwner(address);
  }
  async getNftCreationAndFeesByUser(address) {
    return this.contract.getNftCreationAndFeesByUser(address);
  }

  async rewardUsersWithERC20() {
    return this.contractSign.rewardUsersWithERC20();
  }

  async getTotalResetNFTs() {
    return this.contract.getTotalResetNFTs();
  }

  async getRandomLocation() {
    const relacherVerrou = await mutex.acquire();

    try {
      const rawData = await this.utiles.managerFile.readFile(this.pathNfts);

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
        await this.contract.getResetNFTsAndFeesByOwner(addrReset)
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
    const totalSupply = await this.contract.totalSupply();
    const addressToTokenIds = {};
    const promises = [];
    for (let i = 1; i <= totalSupply; i++) {
      const currentOwner = await this.contract.ownerOf(i);
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
      const totalNFTs = await this.contract.getTotalNft();
      return totalNFTs.toString();
    } catch (error) {
      loggerServer.error("error getTotalNft", error);
      return error;
    }
  }

  startGpsCheckResultListener() {
    loggerServer.trace(`Listening ${this.chain} for GpsCheckResult events...`);

    this.contract.on("GpsCheckResult", async (user, result, tokenId) => {
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
            chain: this.chain,
          });
          const message = `💰 A user win NFT GeoSpace ${formatTokenId} 💰`;
          loggerServer.info(`GpsCheckResult: ${message}`);
          // this.telegram.sendMessageLog({
          //   message: `GpsCheckResult ${message}`,
          // });
          // this.telegram.sendMessageGroup(
          //   `💰 User ${user} win NFT GeoSpace ${formatTokenId} 💰`
          // );
        } else {
          const message = `💰 A user lose ${formatTokenId} 💰`;
          loggerServer.info(`GpsCheckResult: ${message}`);
          // this.telegram.sendMessageLog({
          //   message: `GpsCheckResult winner ${formatTokenId}`,
          // });
        }
      } catch (error) {
        loggerServer.fatal(`startGpsCheckResultListener: `, error);
        // this.telegram.sendMessageLog({
        //   message: `Error GpsCheckResult ${formatTokenId}`,
        // });
      }
    });
  }

  async startCreateNFTListener() {
    loggerServer.trace(`Listening ${this.chain} for createNFT events...`);

    this.contract.on("createNFT", async (user, tokenId, fee) => {
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
          nb,
          this.chain
        );

        const messag = `💎 Player: ${user} create new GeoSpace with id ${tokenIdReadable} 💎`;
        loggerServer.info(`createNFT: ${message}`);
        // this.telegram.sendMessageLog({
        //   message: `createNFT ${tokenIdReadable}`,
        // });
        // this.telegram.sendMessageGroup(
        //   `💎 New NFT create with id ${tokenIdReadable} 💎`
        // );
      } catch (error) {
        loggerServer.fatal(`createNFT: `, error);
        // this.telegram.sendMessageLog({
        //   message: `error fatal createNFT ${tokenIdReadable}`,
        // });
        return error;
      }
    });
  }

  startResetNFTListener() {
    loggerServer.trace(`Listening ${this.chain} for ResetNFT events...`);
    this.contract.on("ResetNFT", async (user, tokenId, isReset, tax) => {
      const tokenIdReadable = tokenId.toString();
      const taxReadable = Number(this.utiles.convertWeiToEth(tax));

      loggerServer.trace(
        `ResetNFT Event ${this.chain} - User: ${user}, Token ID: ${tokenIdReadable}, isReset: ${isReset}, tax: ${taxReadable}`
      );
      try {
        await this.utiles.managerFile.manageFiles({
          nftIds: [tokenIdReadable],
          fee: [{ [tokenIdReadable]: taxReadable }],
          isReset,
          chain: this.chain,
        });
        loggerServer.info(
          `ResetNFT ${this.chain} : Token ID: ${tokenIdReadable}, isReset: ${isReset}`
        );
      } catch (error) {
        loggerServer.fatal(`ResetNFT ${this.chain} : `, error);
        // this.telegram.sendMessageLog({
        //   message: `error fatal ResetNFT ${tokenIdReadable}`,
        // });
        return error;
      }
    });
  }

  startRewardWithERC20Listener() {
    loggerServer.trace(`Listening ${this.chain} for RewardWithERC20 events...`);

    this.contract.on("RewardWithERC20", async (user, amount) => {
      const amountReadable = Number(this.utiles.convertWeiToEth(amount));
      loggerServer.info(
        `RewardWithERC20 ${this.chain} Event - User: ${user}, Amount: ${amountReadable}`
      );
    });
  }

  startStakingListener() {
    loggerServer.trace(`Listening ${this.chain} for StakingNFT events...`);

    this.contract.on(
      "StakingNFT",
      async (user, tokenId, timestamp, isStake) => {
        const tokenIdReadable = tokenId.toString();

        loggerServer.info(
          `StakingNFT ${this.chain}  Event - User: ${user},TokenId: ${tokenIdReadable} isStake: ${isStake} Timestamp: ${timestamp}`
        );
      }
    );
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
