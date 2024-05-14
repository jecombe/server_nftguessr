const { Contract, Wallet, ethers } = require("ethers");
const dotenv = require("dotenv");
const nftGuessrAbi = require("../../abi/NftGuessr.json");
const GameAbi = require("../../abi/game.json");

const { loggerServer } = require("../utils/logger");
const path = require("path");
var Mutex = require("async-mutex").Mutex;
const mutex = new Mutex();
const pathNfts = path.resolve(__dirname, "../../locations/nfts.json");
const { createInstance } = require("fhevmjs");

let _instance;

dotenv.config();

const provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER);
const contractAddress = process.env.CONTRACT;

const contract = new Contract(contractAddress, nftGuessrAbi, provider);

const signer = new Wallet(process.env.SECRET, provider);
const contractGame = new Contract(process.env.GAME, GameAbi, signer);

const createFhevmInstance = async () => {
  if (_instance) return _instance;

  const network = await provider.getNetwork();

  const chainId = +network.chainId.toString();

  const ret = await provider.call({
    to: "0x000000000000000000000000000000000000005d",
    data: "0xd9d47bb001",
  });
  const abiCoder = new ethers.utils.AbiCoder();

  const decode = abiCoder.decode(["bytes"], ret);
  const publicKey = decode[0];

  _instance = await createInstance({ chainId, publicKey });
};

const getInstance = () => {
  return _instance;
};

const getTokenSignature = async (contractAddress, userAddress) => {
  if (getInstance().hasKeypair(contractAddress)) {
    return getInstance().getTokenSignature(contractAddress);
  } else {
    const generatedToken = getInstance().generatePublicKey({
      verifyingContract: process.env.GAME,
    });
    const signature = await signer._signTypedData(
      generatedToken.eip712.domain,
      { Reencrypt: generatedToken.eip712.types.Reencrypt }, // Need to remove EIP712Domain from types
      generatedToken.eip712.message
    );
    getInstance().setSignature(contractAddress, signature);
    return { signature, publicKey: generatedToken.publicKey };
  }
};

class NftGuessr {
  constructor(utiles, telegram) {
    this.utiles = utiles;
    this.addrContrat = process.env.CONTRACT;
    this.contract = contract;
    this.provider = provider;
    // this.telegram = telegram;
  }

  async init() {
    await createFhevmInstance();
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
    return contract.getFee(address, nftId);
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
      nftsReset: [],
      nftsCreation: [],
    };
  }
  async getNFTLocation(nftId) {
    // return contractSign.getNFTLocation(nftId);
    const { signature, publicKey } = await getTokenSignature();

    // const { signature, publicKey } = await getTokenSignature(this.instance);

    return contractGame.getNFTLocation(nftId, publicKey, signature);
  }

  createOrGetOwnerObject(addressToTokenIds, owner) {
    if (!addressToTokenIds[owner]) {
      addressToTokenIds[owner] = this.getObjectStatsGame();
    }
    return addressToTokenIds[owner];
  }

  async getAddressResetWithToken(tokenId) {
    return contractGame.getAddressResetWithToken(tokenId);
  }
  async getAddressCreationWithToken(tokenId) {
    return contractGame.getAddressCreationWithToken(tokenId);
  }
  async getResetNFTsAndFeesByOwner(address) {
    return contractGame.getResetNFTsAndFeesByOwner(address);
  }
  async getNftCreationAndFeesByUser(address) {
    return contractGame.getNftCreationAndFeesByUser(address);
  }

  async getTotalResetNFTs() {
    return contractGame.getTotalResetNFTs();
  }

  async getRandomLocation(excludedIds) {
    const relacherVerrou = await mutex.acquire();

    try {
      const rawData = await this.utiles.managerFile.readFile(pathNfts);

      const allLocations = JSON.parse(rawData);
      // const validLocations = Object.values(allLocations).filter(
      //   (location) =>
      //     location.isValid && !excludedIds.includes(Number(location.id))
      // );

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
        await contractGame.getResetNFTsAndFeesByOwner(addrReset)
      );
      obj.nftsReset = nftsResetAndFees;
    } catch (error) {
      loggerServer.error("manageDataReset", error);
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
      const addrReset = await this.getAddressResetWithToken(tokenId);
      const addrCreator = await this.getAddressCreationWithToken(tokenId);

      if (addrReset !== "0x0000000000000000000000000000000000000000") {
        await this.manageDataReset(addressToTokenIds, addrReset);
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
    return this.utiles.managerFile.getStats();
  }

  async getTotalNft() {
    try {
      const totalNFTs = await contractGame.getTotalNft();
      return totalNFTs.toString();
    } catch (error) {
      loggerServer.error("error getTotalNft", error);
      return error;
    }
  }

  startGpsCheckResultListener() {
    loggerServer.trace("Listening for GpsCheckResult events...");

    contract.on(
      "GpsCheckResult",
      async (user, previousOwner, result, tokenId) => {
        const formatTokenId = tokenId.toString();
        loggerServer.trace(
          `GpsCheckResult Event - User: ${user}, Previous owner: ${previousOwner} Token ID: ${formatTokenId}, isWinner: ${result}`
        );
        try {
          if (result) {
            await this.utiles.managerFile.manageFiles({
              nftIds: [formatTokenId],
              fee: [{ [formatTokenId]: 0 }],
              isReset: false,
            });
            await this.utiles.managerFile.manageFilesSats(
              Number(formatTokenId)
            );
            const message = `💰 A user win NFT GeoSpace ${formatTokenId} 💰`;
            loggerServer.info(`GpsCheckResult: ${message}`);
            // this.telegram.sendMessageLog({
            //   message: `GpsCheckResult ${message}`,
            // });
            // this.telegram.sendMessageGroup(
            //   `💰 User ${user} win NFT GeoSpace ${formatTokenId} 💰`
            // );
          } else {
            const message = `A user lose ${formatTokenId}`;
            loggerServer.info(`GpsCheckResult: ${message}`);
            // this.telegram.sendMessageLog({
            //   message: `GpsCheckResult lose ${formatTokenId}`,
            // });
          }
        } catch (error) {
          loggerServer.fatal(`startGpsCheckResultListener: `, error);
          // this.telegram.sendMessageLog({
          //   message: `Error GpsCheckResult ${formatTokenId}`,
          // });
        }
      }
    );
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
        console.log("OKOKOKOKOKOKOKOKOK");
        const nb = await this.getNFTLocation(tokenIdReadable);
        const lat = getInstance().decrypt(process.env.GAME, nb[0]);
        const lng = getInstance().decrypt(process.env.GAME, nb[1]);
        const parseLat = Number(lat.toString());
        const parseLng = Number(lng.toString());
        console.log("OKOKOKOKOKOKOKOKOK11111", parseLat, parseLng);

        await this.utiles.managerFile.writeNewNft(
          user.toLowerCase(),
          tokenIdReadable,
          feeReadable,
          [parseLat, parseLng]
        );

        await this.utiles.managerFile.writeFileStatsCreate(
          `${user}`,
          Number(tokenIdReadable),
          Number(feeReadable)
        );

        const message = `💎 Player: ${user} create new GeoSpace with id ${tokenIdReadable} 💎`;
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
        await this.utiles.managerFile.writeStatsReset(
          user.toLowerCase(),
          Number(tokenIdReadable),
          Number(taxReadable),
          isReset
        );
        loggerServer.info(
          `ResetNFT: Token ID: ${tokenIdReadable}, isReset: ${isReset}`
        );
      } catch (error) {
        loggerServer.fatal(`ResetNFT: `, error);
        // this.telegram.sendMessageLog({
        //   message: `error fatal ResetNFT ${tokenIdReadable}`,
        // });
        return error;
      }
    });
  }

  startRewardCreatorsListener() {
    loggerServer.trace("Listening for RewardCreators events...");

    contract.on("RewardCreators", async (user, amount, balance) => {
      const amountReadable = Number(this.utiles.convertWeiToEth(amount));
      const balanceRead = Number(this.utiles.convertWeiToEth(balance));

      loggerServer.info(
        `RewardCreators Event - Creator: ${user}, Amount: ${amountReadable}, Balance: ${balanceRead} SPC`
      );
    });
  }

  startLimiterListener() {
    loggerServer.trace("Listening for Limiter events...");

    contract.on("FunctionCalled", async (user, counter) => {
      const countReadable = counter.toString();

      loggerServer.info(
        `Limiter Event - Creator: ${user}, count: ${countReadable}`
      );
      // this.telegram.sendMessageLog({
      //   message: `Limiter : ${user} : ${countReadable}`,
      // });
    });
  }

  startRewardCreatorFeeListener() {
    loggerServer.trace("Listening for RewardCreatorFees events...");

    contract.on("RewardCreatorFees", async (user, amount, balance) => {
      const amountReadable = Number(this.utiles.convertWeiToEth(amount));
      const balanceRead = Number(this.utiles.convertWeiToEth(balance));

      loggerServer.info(
        `RewardCreatorFees Event - Creator: ${user}, Amount: ${amountReadable}, Balance ${balanceRead} INCO`
      );
    });
  }
  startRewardOwnerFeeListener() {
    loggerServer.trace("Listening for RewardOwnerFees events...");

    contract.on("RewardOwnerFees", async (user, amount, balance) => {
      const amountReadable = Number(this.utiles.convertWeiToEth(amount));
      const balanceReadable = Number(this.utiles.convertWeiToEth(balance));

      loggerServer.info(
        `RewardOwnerFees Event - Owner: ${user}, Amount: ${amountReadable}, Balance: ${balanceReadable}`
      );
    });
  }
  startRewardTeams() {
    loggerServer.trace("Listening for RewardTeams events...");

    contract.on("RewardTeams", async (user, amount, balance) => {
      const amountReadable = Number(this.utiles.convertWeiToEth(amount));
      const balanceReadable = Number(this.utiles.convertWeiToEth(balance));

      loggerServer.info(
        `RewardTeams Event - Teams: ${user}, Amount: ${amountReadable}, Balance: ${balanceReadable}`
      );
    });
  }
  startRewardStakers() {
    loggerServer.trace("Listening for RewardStakers events...");

    contract.on("RewardStakers", async (user, amount, balance) => {
      const amountReadable = Number(this.utiles.convertWeiToEth(amount));
      const balanceReadable = Number(this.utiles.convertWeiToEth(balance));

      loggerServer.info(
        `RewardStakers Event - User: ${user}, Amount: ${amountReadable}, Balance: ${balanceReadable}`
      );
    });
  }

  startRewardWithERC20Listener() {
    loggerServer.trace("Listening for RewardWinner events...");

    contract.on("RewardWinner", async (user, amount) => {
      const amountReadable = Number(this.utiles.convertWeiToEth(amount));
      loggerServer.info(
        `RewardWinner Event - User: ${user}, Amount: ${amountReadable}`
      );
    });
  }

  // startStakeUnstake() {
  //   loggerServer.trace("Listening for stake / unstake events...");

  //   contract.on("RewardWinner", async (user, amount) => {
  //     const amountReadable = Number(this.utiles.convertWeiToEth(amount));
  //     loggerServer.info(
  //       `RewardWinner Event - User: ${user}, Amount: ${amountReadable}`
  //     );
  //   });
  // }

  // async test() {
  //   try {
  //     console.log("OKOKOKOKOKOKOKOKO");
  //     const nb = await this.getNFTLocation(1);
  //     console.log(nb);
  //     const lat = getInstance().decrypt(process.env.GAME, nb[0]);
  //     const lng = getInstance().decrypt(process.env.GAME, nb[1]);

  //     // const res = this.parseDecrypt(nb);
  //     console.log([lat, lng]);
  //   } catch (error) {
  //     console.log(error);
  //   }
  // }

  startListeningEvents() {
    this.startCreateNFTListener();
    this.startGpsCheckResultListener();
    this.startRewardWithERC20Listener();
    this.startResetNFTListener();
    this.startRewardCreatorFeeListener();
    this.startRewardCreatorsListener();
    this.startRewardOwnerFeeListener();
    this.startRewardStakers();
    this.startRewardTeams();
    this.startLimiterListener();
    //this.startStake;
    //this.test();
  }
}

module.exports = {
  NftGuessr,
};
