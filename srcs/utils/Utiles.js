const { formatEther, formatUnits, ethers } = require("ethers");
const fs = require("fs");
const dotenv = require("dotenv");
const { promisify } = require("util");
const CryptoJS = require("crypto-js");
const { loggerServer } = require("./logger");
const path = require("path");
var Mutex = require("async-mutex").Mutex;
const mutex = new Mutex();

const pathNfts = path.resolve(__dirname, "../../locations/nfts.json");
const pathStats = path.resolve(__dirname, "../../locations/stats.json");

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
dotenv.config();

class ManagerFile {
  constructor(utiles) {
    this.utiles = utiles;
  }

  writeFile(filePath, data) {
    return writeFileAsync(filePath, JSON.stringify(data, null, 2));
  }

  async readFile(filePath) {
    return readFileAsync(filePath, "utf8");
  }

  async addLocation(nftIds, validLocationsPath, locationsToAdd) {
    try {
      const rawDataValid = await this.readFile(validLocationsPath);
      loggerServer.trace(`addLocation ${nftIds} read validLocationsPath`);

      let validLocations = JSON.parse(rawDataValid);

      // Add locations from the locationsToAdd array to validLocations if not already present
      locationsToAdd.forEach((location) => {
        const isLocationPresent = validLocations.some(
          (existingLocation) => existingLocation.id == location.id
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
    const { validLocations, validLocationsPath, saveLocationsPath, nftIds } =
      params;
    try {
      // Save the updated validLocations.json
      await this.writeFile(validLocationsPath, validLocations);
      loggerServer.trace(`saveDataToFile ${nftIds} write validLocationsPath`);

      // Remove the added locations from saveLocations
      this.saveLocations = this.saveLocations.filter(
        (location) => !nftIds.includes(location.id)
      );
      // Save the updated saveLocations.json
      await this.writeFile(saveLocationsPath, this.saveLocations);
    } catch (error) {
      throw `saveDataToFile: ${error}`;
    }
  }

  getLocationToAdd(rawDataSave, nftIds, fees) {
    let saveLocations = JSON.parse(rawDataSave);
    let locationsToAdd = []; // Tableau pour stocker les emplacements à ajouter
    // Iterate over the array of nftIds
    nftIds.forEach((id, index) => {
      const locationToAdd = saveLocations.find(
        (location) => location.id === id
      );
      if (locationToAdd) {
        locationToAdd.tax = Object.values(fees[index])[0];
        locationsToAdd.push(locationToAdd);
      }
    });
    this.saveLocations = saveLocations;

    // Utilisez let ici pour déclarer saveLocations
    return { locationsToAdd };
  }
  deleteTokenId(tokenId, data) {
    data.forEach((item, index) => {
      // Parcourir chaque objet dans dataArray
      const addressKey = Object.keys(item)[0]; // Obtenir la clé d'adresse
      const addressObject = item[addressKey]; // Obtenir l'objet de l'adresse
      if (addressObject && addressObject.tokenReset) {
        // Si l'objet a un tableau tokenReset
        const tokenResetIndex = addressObject.tokenReset.findIndex(
          (token) => token.id === Number(tokenId)
        );
        if (tokenResetIndex !== -1) {
          // Si le tokenId est trouvé, le supprimer du tableau tokenReset
          addressObject.tokenReset.splice(tokenResetIndex, 1);
          // Si le tableau tokenReset est vide, vérifier le tableau tokenIdCreated
          if (
            addressObject.tokenReset.length === 0 &&
            addressObject.tokenIdCreated.length === 0
          ) {
            // Si les deux tableaux sont vides, supprimer l'objet principal
            data.splice(index, 1);
          }
        }
      }
    });
  }

  createdTokenId(address, tokenId, tax, dataArray) {
    // Vérifier si l'adresse existe déjà dans le tableau
    const addressObject = dataArray.find((item) => address in item);

    if (addressObject) {
      // Si l'adresse existe, ajouter le tokenId dans le tableau tokenIdCreated
      addressObject[address].tokenIdCreated.push(tokenId);

      // Ajouter le tokenId dans le tableau tokenReset (s'il n'existe pas déjà)
      const tokenResetIndex = addressObject[address].tokenReset.findIndex(
        (token) => token.id === tokenId
      );

      if (tokenResetIndex === -1) {
        addressObject[address].tokenReset.push({ id: tokenId, feesWin: tax });
      }
    } else {
      // Si l'adresse n'existe pas, l'ajouter avec des tableaux vides
      const newAddressObject = {
        [address]: {
          tokenReset: [{ id: tokenId, feesWin: tax }],
          tokenIdCreated: [tokenId],
        },
      };

      dataArray.push(newAddressObject);
    }
  }

  resetTokenId(address, tokenId, tax, dataArray) {
    // Vérifier si l'adresse existe déjà dans le tableau
    const addressObject = dataArray.find((item) => address in item);

    if (addressObject) {
      const tokenIndex = addressObject[address].tokenReset.findIndex(
        (token) => token.id === tokenId
      );

      if (tokenIndex !== -1) {
        // Si le tokenId existe, mettre à jour la taxe
        addressObject[address].tokenReset[tokenIndex].feesWin = tax;
      } else {
        // Si le tokenId n'existe pas, ajouter une nouvelle entrée dans le tableau
        addressObject[address].tokenReset.push({ id: tokenId, feesWin: tax });
      }
    } else {
      // Si l'adresse n'existe pas, l'ajouter avec des tableaux vides
      const newAddressObject = {
        [address]: {
          tokenReset: [{ id: tokenId, feesWin: tax }],
          tokenIdCreated: [],
        },
      };

      dataArray.push(newAddressObject);
    }
  }

  async writeStatsReset(player, tokenId, tax, isReset) {
    const relacherVerrou = await mutex.acquire();
    try {
      // Lire le fichier JSON de manière asynchrone
      const data = await this.readFile(pathStats, "utf-8");
      const nftsData = JSON.parse(data);
      if (isReset) this.resetTokenId(player, tokenId, tax, nftsData);
      else this.deleteTokenId(tokenId, nftsData);

      await this.writeFile(pathStats, nftsData);
    } catch (error) {
      loggerServer.fatal("error manage file", error);

      throw `manageFiles ${error}`;
    } finally {
      loggerServer.trace("unlock");
      relacherVerrou();
    }
  }

  async writeFileStatsCreate(player, tokenId, tax) {
    const relacherVerrou = await mutex.acquire();
    try {
      // Lire le fichier JSON de manière asynchrone
      const data = await this.readFile(pathStats, "utf-8");
      const nftsData = JSON.parse(data);
      this.createdTokenId(`${player}`.toLowerCase(), tokenId, tax, nftsData);

      await this.writeFile(pathStats, nftsData);
    } catch (error) {
      loggerServer.fatal("error manage file", error);

      throw `manageFiles ${error}`;
    } finally {
      loggerServer.trace("unlock");
      relacherVerrou();
    }
  }

  async manageFilesSats(tokenId) {
    const relacherVerrou = await mutex.acquire();
    try {
      // Lire le fichier JSON de manière asynchrone
      const data = await this.readFile(pathStats, "utf-8");
      const nftsData = JSON.parse(data);
      this.deleteTokenId(tokenId, nftsData);

      await this.writeFile(pathStats, nftsData);
    } catch (error) {
      loggerServer.fatal("error manage file", error);

      throw `manageFiles ${error}`;
    } finally {
      loggerServer.trace("unlock");
      relacherVerrou();
    }
  }

  async getStats() {
    const relacherVerrou = await mutex.acquire();
    try {
      const data = await this.readFile(pathStats, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      return error;
    } finally {
      loggerServer.trace("unlock");
      relacherVerrou();
    }
  }

  async manageFiles(req) {
    const { nftIds, fee, isReset } = req;
    const relacherVerrou = await mutex.acquire();
    const id = nftIds[0];
    const feeSave = Object.values(fee[0])[0];
    try {
      // Lire le fichier JSON de manière asynchrone
      const data = await this.readFile(pathNfts, "utf-8");
      const nftsData = JSON.parse(data);

      // Mettre à jour les données en fonction de l'événement Solidity
      if (nftsData[id]) {
        nftsData[id].tax = Number(feeSave); // Mettez à jour la propriété en fonction de vos besoins
        nftsData[id].isValid = isReset;
        // Écrire de manière asynchrone les données mises à jour dans le fichier JSON
        await this.writeFile(pathNfts, nftsData);
        loggerServer.info(`manageFiles update nft ${id} with fees: ${feeSave}`);
      } else {
        loggerServer.error(`Aucun objet trouvé pour l'ID ${id}`);
      }
    } catch (error) {
      loggerServer.fatal("error manage file", error);

      throw `manageFiles ${error}`;
    } finally {
      loggerServer.trace("unlock");
      relacherVerrou();
    }
  }

  async writeNewNft(user, tokenIdReadable, feeReadable, arrayGps) {
    const relacherVerrou = await mutex.acquire();

    try {
      const data = await this.readFile(pathNfts);
      let nftsData = JSON.parse(data);

      loggerServer.trace(`createNFT ${tokenIdReadable} `);

      const toWrite = this.utiles.formatNftToJson(
        arrayGps,
        feeReadable,
        tokenIdReadable
      );

      if (!nftsData[tokenIdReadable]) {
        nftsData[tokenIdReadable] = toWrite;

        await this.writeFile(pathNfts, nftsData);
      } else {
        throw new Error(
          `user ${user} NFT with the same ID: ${tokenIdReadable} already exists.`
        );
      }
    } catch (error) {
      throw `createNFT: ${error}`;
    } finally {
      relacherVerrou();
    }
  }
}

class Utiles {
  constructor() {
    this.managerFile = new ManagerFile(this);
  }
  convertArrayIdBigNumberToNumber(array) {
    return array.map((bigNumber) => Number(bigNumber));
  }
  convertArrayFeesToEth(array) {
    return array.map((bigNumber) =>
      Math.round(this.convertWeiToEth(bigNumber))
    );
  }

  formaterNumber(nombre) {
    const nombreEnChaine = nombre.toString();

    if (nombreEnChaine.length === 7) {
      // Si le nombre a 7 chiffres, placez la virgule après le deuxième chiffre
      return nombreEnChaine.slice(0, 2) + "." + nombreEnChaine.slice(2);
    } else if (nombreEnChaine.length === 6) {
      // Si le nombre a 6 chiffres, placez la virgule après le premier chiffre
      return nombreEnChaine[0] + "." + nombreEnChaine.slice(1);
    } else {
      // Pour d'autres longueurs, laissez la représentation du nombre inchangée
      return nombreEnChaine;
    }
  }

  convertWeiToEth(bigNumberWei) {
    return ethers.utils.formatUnits(bigNumberWei, "ether");
  }

  convertEthToWei(wei) {
    return ethers.utils.formatEther(wei);
  }

  findLocationId(locations, toFind) {
    return locations.findIndex((location) => location.id === toFind);
  }

  encryptData(randomCoordinates) {
    return CryptoJS.AES.encrypt(
      JSON.stringify(randomCoordinates),
      process.env.KEY
    ).toString();
  }

  formatNftToJson(arrayGps, tax, nftId) {
    // const tableauNombres = this.convertArrayIdBigNumberToNumber(nb);

    const lat = arrayGps[0];
    const lng = arrayGps[1];

    const convertLat = this.formaterNumber(lat);
    const convertLng = this.formaterNumber(lng);
    const r = {
      isValid: true,
      latitude: Number(convertLat),
      longitude: Number(convertLng),
      tax,
      id: Number(nftId),
      lat,
      lng,
    };
    return r;
  }
}

module.exports = {
  Utiles,
};
