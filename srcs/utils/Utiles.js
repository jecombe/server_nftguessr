const { formatEther, formatUnits } = require("ethers");
const fs = require("fs");
const dotenv = require("dotenv");
const { promisify } = require("util");
const CryptoJS = require("crypto-js");

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
dotenv.config();

class ManagerFile {
  constructor() {}

  writeFile(filePath, data) {
    return writeFileAsync(filePath, JSON.stringify(data, null, 2));
  }

  async readFile(filePath) {
    return readFileAsync(filePath, "utf8");
  }
}

class Utiles {
  constructor() {
    this.managerFile = new ManagerFile();
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
    return formatUnits(bigNumberWei, "ether");
  }

  convertEthToWei(wei) {
    return formatEther(wei);
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
