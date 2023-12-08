const { Contract, Wallet, JsonRpcProvider } = require("ethers");
const dotenv = require("dotenv");
const nftGuessrAbi = require("../../abi/NftGuessr.json");
const { logger } = require("../utils/logger");

dotenv.config();

const provider = new JsonRpcProvider(process.env.PROVIDER);
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
    /* nb.map((bigNumber) =>
    Number(bigNumber.toString())
  );*/

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
    return contract.getNbStake();
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
}

module.exports = {
  NftGuessr,
};
