const { formatEther, formatUnits, ethers } = require("ethers");
const fs = require("fs");
const dotenv = require("dotenv");
const { promisify } = require("util");
const CryptoJS = require("crypto-js");
const { logger } = require("./logger");
const path = require("path");

const paths = path.resolve(__dirname, "../../locations/validLocations.json");

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
}

module.exports = {
  Utiles,
};
