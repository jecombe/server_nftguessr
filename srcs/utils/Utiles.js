const { formatEther, formatUnits, ethers } = require("ethers");
const fs = require("fs");
const dotenv = require("dotenv");
const { promisify } = require("util");
const CryptoJS = require("crypto-js");
const { logger } = require("./logger");
const path = require("path");
var Mutex = require("async-mutex").Mutex;
const mutex = new Mutex();

const paths = path.resolve(__dirname, "../../locations/validLocations.json");
const pathNfts = path.resolve(__dirname, "../../locations/nfts.json");

const pathSave = path.resolve(__dirname, "../../locations/saveLocations.json");

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

  findLocationId(locations, toFind) {
    return locations.findIndex((location) => location.id === toFind);
  }

  async addLocation(nftIds, validLocationsPath, locationsToAdd) {
    try {
      const rawDataValid = await this.readFile(validLocationsPath);
      logger.trace(`addLocation ${nftIds} read validLocationsPath`);

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
    const { validLocations, validLocationsPath, saveLocationsPath, nftIds } =
      params;
    try {
      // Save the updated validLocations.json
      await this.writeFile(validLocationsPath, validLocations);
      logger.trace(`saveDataToFile ${nftIds} write validLocationsPath`);

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

  async manageFile(req) {
    const { nftIds, fee, isReset } = req;
    try {
      logger.info(`manageFile start save and delete with nft: ${nftIds}`);
      const saveLocationsPath = isReset ? pathSave : paths;
      const validLocationsPath = isReset ? paths : pathSave;

      const rawDataSave = await this.readFile(saveLocationsPath);
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
        nftsData[id].tax = feeSave; // Mettez à jour la propriété en fonction de vos besoins
        nftsData[id].isValid = isReset;
        // Écrire de manière asynchrone les données mises à jour dans le fichier JSON
        await this.writeFile(pathNfts, nftsData);
        logger.info(`manageFiles update nft ${id} with fees: ${feeSave}`);
      } else {
        logger.error(`Aucun objet trouvé pour l'ID ${id}`);
      }
    } catch (error) {
      logger.fatal("Error manageFiles: ", error);
      return error;
    } finally {
      logger.trace("unlock");
      relacherVerrou();
    }
  }

  async writeNewNft(user, tokenIdReadable, feeReadable, nb) {
    const relacherVerrou = await mutex.acquire();

    try {
      const data = await this.readFile(pathNfts);
      let nftsData = JSON.parse(data);

      logger.trace(`createNFT ${tokenIdReadable} `);

      const toWrite = this.utiles.formatNftToJson(
        nb,
        feeReadable,
        tokenIdReadable
      );

      if (!nftsData[tokenIdReadable]) {
        // Ajouter le nouvel NFT aux données existantes
        nftsData[tokenIdReadable] = toWrite;

        // Écrire de manière asynchrone les données mises à jour dans le fichier JSON
        await this.writeFile(pathNfts, nftsData);
      } else {
        throw new Error(
          `NFT with the same ID: ${tokenIdReadable} already exists.`
        );
      }

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

  convertBigToReadable(number) {
    return Number(number.toString());
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
  formatNftToJson(nb, fee, nftId) {
    const tableauNombres = this.convertArrayIdBigNumberToNumber(nb);

    const latitude = tableauNombres[4];
    const longitude = tableauNombres[5];

    const convertLat = this.formaterNumber(latitude);
    const convertLng = this.formaterNumber(longitude);
    const r = {
      latitude: Number(convertLat),
      longitude: Number(convertLng),
      northLat: tableauNombres[0],
      southLat: tableauNombres[1],
      eastLon: tableauNombres[2],
      westLon: tableauNombres[3],
      tax: Math.round(this.convertWeiToEth(fee)),
      id: nftId,
      lat: tableauNombres[4],
      lng: tableauNombres[5],
    };
    return r;
  }
}

module.exports = {
  Utiles,
};
