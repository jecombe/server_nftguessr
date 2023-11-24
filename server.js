const express = require("express");
const cors = require("cors");
const { createInstance } = require("fhevmjs");

const app = express();
const http = require("http"); // Ajoutez cette ligne
const {
  Wallet,
  JsonRpcProvider,
  Contract,
  parseEther,
  parseUnits,
  formatEther,
} = require("ethers");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const secretKey = "votre_clé_secrète";
const port = 8000;
const CryptoJS = require("crypto-js");
const { promisify } = require("util");
const contractInfo = require("./interact/abi/NftGuessr.json");
const TelegramBot = require("node-telegram-bot-api");
const path = "./locations/validLocations.json";
const pathSave = "./locations/saveLocations.json";

// ...
const dotenv = require("dotenv");
const log4js = require("log4js");
const startChecking = require("./test");
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

log4js.configure({
  appenders: {
    server: {
      type: "file",
      filename: "server.log",
      layout: { type: "pattern", pattern: "%[[%d] %5.5p -%] %m" },
    },
  },
  categories: { default: { appenders: ["server"], level: "all" } },
});

const logger = log4js.getLogger();
dotenv.config();

// Middleware d'authentification
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; //"6786879794:AAG_BSKbY9h5vv-c01PWc1zIs4dKT9hWk0o";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
const provider = new JsonRpcProvider(process.env.PROVIDER); // Remplacez par l'URL RPC Ethereum appropriée
const contractAddress = process.env.CONTRACT; // Remplacez par l'adresse de votre contrat

const contract = new Contract(contractAddress, contractInfo, provider);
// const nft = [];
let nbCall = 0;
let _instance;

/*const filter = contract.filters.GpsCheckResult();

// Abonnement à l'événement en utilisant le filtre
const onEvent = async () => {
  const events = await contract.queryFilter(filter);

  // Gestion des événements ici
  for (const event of events) {
    const { userAddress, isWin, tokenId } = event.args;
    console.log("Event:", userAddress, isWin, tokenId);

    const token = Number(tokenId.toString());
    console.log(userAddress, isWin, token);

    if (!isWin) {
      try {
        // Lire le fichier validLocations.json
        const validLocationsPath = path;
        const rawData = fs.readFileSync(validLocationsPath);
        const validLocations = JSON.parse(rawData);

        // Trouver l'index de l'élément avec le tokenId dans le tableau validLocations
        const indexToRemove = validLocations.findIndex(
          (location) => location.id === token
        );

        if (indexToRemove !== -1) {
          // Supprimer l'élément du tableau validLocations
          validLocations.splice(indexToRemove, 1);

          // Enregistrer les modifications dans le fichier saveLocation.json
          const saveLocationsPath = pathSave;
          fs.writeFileSync(
            saveLocationsPath,
            JSON.stringify(validLocations, null, 2)
          );

          console.log(
            `Location with tokenId ${token} removed from validLocations.`
          );
        } else {
          console.log(
            `Location with tokenId ${token} not found in validLocations.`
          );
        }
      } catch (error) {
        console.error("Error updating validLocations:", error);
      }
    }

    // Logique supplémentaire si isWin est true
    if (isWin) {
      // Votre logique ici
      console.log("Winning event!");
    }
  }
};

// Abonnement à l'événement et gestion des erreurs
contract.on("GpsCheckResult", onEvent).catch((error) => {
  console.error("Error subscribing to GpsCheckResult event:", error);
});

// Désabonnement du filtre lorsque cela est nécessaire (par exemple, à la fin du programme ou lors de la suppression du gestionnaire d'événements)
// Assurez-vous de gérer les erreurs lors de la désinscription
const unsubscribe = async () => {
  try {
    await contract.off("GpsCheckResult", onEvent);
    console.log("Unsubscribed from GpsCheckResult event");
  } catch (error) {
    console.error("Error unsubscribing from GpsCheckResult event:", error);
  }
};*/

// contract.on("createNFT", async (userAddress, tokenId, fee) => {
//   console.log(userAddress, tokenId, fee);
// });

// contract.on("ResetNFT", async (userAddress, tokenId, isReset) => {
//   console.log(userAddress, tokenId, isReset);
// });

const sendTelegramMessage = (message) => {
  bot.sendMessage(TELEGRAM_CHAT_ID, JSON.stringify(message));
};
// sendTelegramMessage("get GPS");

// Générer une clé de chiffrement et un vecteur d'initialisation (IV)
// 128 bits pour un IV

function removeDuplicates(array) {
  return Array.from(new Set(array));
}

async function getAllAddressesAndTokenIds() {
  const totalSupply = await contract.totalSupply();

  const addressToTokenIds = {};
  let isOwner = false;
  for (let i = 1; i <= totalSupply; i++) {
    const currentOwner = await contract.ownerOf(i);
    const nftsStake = await contract.getNFTsStakedByOwner(currentOwner);
    const tokenId = i;
    const addrStake = await contract.getAddressStakeWithToken(tokenId);
    const addrReset = await contract.getAddressResetWithToken(tokenId);

    if (!addressToTokenIds[currentOwner]) {
      addressToTokenIds[currentOwner] = {
        nftsId: [],
        nftsStake,
        nftsReset: [],
      };
    }
    if (addrStake !== "0x0000000000000000000000000000000000000000") {
      if (!addressToTokenIds[addrStake]) {
        addressToTokenIds[addrStake] = {
          nftsId: [],
          nftsStake: [],
          nftsReset: [],
        };
        addressToTokenIds[addrStake].nftsStake.push(tokenId);
        isOwner = true;
      }
    }
    if (addrReset !== "0x0000000000000000000000000000000000000000") {
      if (!addressToTokenIds[addrReset]) {
        addressToTokenIds[addrReset] = {
          nftsId: [],
          nftsStake: [],
          nftsReset: [],
        };
        addressToTokenIds[addrReset].nftsReset.push(tokenId);
      }
    }
    if (!isOwner) addressToTokenIds[currentOwner].nftsId.push(tokenId);
  }

  return addressToTokenIds;
}

const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).send("Accès refusé");

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.status(403).send("Token non valide");
    req.user = user;
    next();
  });
};

// Middleware de contrôle d'autorisation
const authorizeRole = (role) => {
  return (req, res, next) => {
    if (req.user && req.user.role === role) {
      next();
    } else {
      res.status(403).send("Accès refusé");
    }
  };
};

const getTotalNft = async () => {
  try {
    const totalNFTs = await contract.getTotalNft(); // Supposons que le contrat a une fonction pour obtenir le nombre total de NFTs
    return totalNFTs.toString();
  } catch (error) {
    logger.error("error getTotalNft", error);

    throw error;
  }
};

// Utilisation du middleware cors pour autoriser les requêtes CORS
app.use(cors());
// Assurez-vous d'utiliser express.json() pour gérer les données JSON
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Exemple d'une route sécurisée avec authentification et autorisation
app.get(
  "/api/secure-route",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    res.json({ message: "Accès autorisé à la route sécurisée" });
  }
);

app.listen(port, () => {
  logger.info(`Server is listening on port ${port}`);
});

app.get("/api/get-gps", (req, res) => {
  try {
    sendTelegramMessage({ message: "api get gps", numberCall: nbCall });
    const rawData = fs.readFileSync("./locations/validLocations.json");
    const randomLocations = JSON.parse(rawData);
    const randomIndex = Math.floor(Math.random() * randomLocations.length);
    const randomCoordinates = randomLocations[randomIndex];
    var ciphertext = CryptoJS.AES.encrypt(
      JSON.stringify(randomCoordinates),
      process.env.KEY
    ).toString();
    res.json(ciphertext);
  } catch (error) {
    logger.error("Error read file JSON.", error);
    res.status(500).send("Error intern server (0).");
  }
});

app.get("/api/get-holder-and-token", async (req, res) => {
  try {
    const result = await getAllAddressesAndTokenIds();
    res.json(result);
    // const sendObj = await groupAddressesWithIds(result[0], result[1]);
    //res.json(sendObj);
  } catch (error) {
    res.status(500).send("Error intern server (1).");
  }
});

app.get("/api/get-total-nft", async (req, res) => {
  try {
    const holdersAndTokenIds = await getTotalNft();
    res.json(holdersAndTokenIds);
  } catch (error) {
    res.status(500).send("Error intern server (2).");
  }
});

app.get("/api/get-total-nft-stake", async (req, res) => {
  try {
    const nftsStake = await contract.getTotalStakedNFTs();
    res.json(nftsStake.toString());
  } catch (error) {
    res.status(500).send("Error intern server (3).");
  }
});

app.get("/api/get-minimum-nft-stake", async (req, res) => {
  try {
    const nftsStake = await contract.getNbStake();
    res.json(nftsStake.toString());
  } catch (error) {
    res.status(500).send("Error intern server (4).");
  }
});

app.get("/api/get-fees", async (req, res) => {
  try {
    const nftsStake = await contract.fees();
    const rep = Math.round(formatEther(nftsStake));
    res.json(rep.toString());
  } catch (error) {
    res.status(500).send("Error intern server (5).");
  }
});

app.get("/api/get-total-nft-reset", async (req, res) => {
  try {
    const nftsStake = await contract.getTotalResetNFTs();
    res.json(nftsStake.toString());
  } catch (error) {
    res.status(500).send("Error intern server (6).");
  }
});

app.post("/api/remove-gps", async (req, res) => {
  const { nftId } = req.body;

  let success = false;
  try {
    // Lire le fichier saveLocations.json
    const saveLocationsPath = pathSave;
    let existingSaveData = [];

    try {
      // Tenter de lire le fichier
      const rawDataSave = fs.readFileSync(saveLocationsPath);
      existingSaveData = JSON.parse(rawDataSave);
    } catch (readError) {
      // Ignorer l'erreur si le fichier n'existe pas encore
      logger.fatal("saveLocations.json does not exist yet.");
    }

    // Lire le fichier validLocations.json
    const validLocationsPath = path;
    const rawData = fs.readFileSync(validLocationsPath);
    let validLocations = JSON.parse(rawData);

    // Trouver l'index de l'élément avec le tokenId dans le tableau validLocations
    const indexToRemove = validLocations.findIndex(
      (location) => location.id === nftId
    );

    if (indexToRemove !== -1) {
      // Créer un nouveau tableau avec seulement l'élément à supprimer
      const locationToRemove = validLocations[indexToRemove];
      locationToRemove.tax = 0;

      // Ajouter l'élément au tableau existingSaveData
      existingSaveData.push(locationToRemove);

      // Enregistrer le tableau mis à jour dans le fichier saveLocations.json
      fs.writeFileSync(
        saveLocationsPath,
        JSON.stringify(existingSaveData, null, 2)
      );

      logger.info(`Location with tokenId ${nftId} saved in saveLocations.`);

      // Retirer l'élément du tableau validLocations
      validLocations.splice(indexToRemove, 1);

      // Enregistrer les modifications dans le fichier validLocations.json
      fs.writeFileSync(
        validLocationsPath,
        JSON.stringify(validLocations, null, 2)
      );

      logger.info(
        `Location with tokenId ${nftId} removed from validLocations.`
      );
      success = true;
    } else {
      logger.error(
        `Location with tokenId ${nftId} not found in validLocations.`
      );
    }
    res.json({ success });
  } catch (error) {
    logger.fatal("Error updating locations:", error);
    res.status(500).send("Error intern server remove gps.");
  }
});
app.post("/api/request-new-coordinates", async (req, res) => {
  const { nftId, addressOwner } = req.body;
  const signer = new Wallet(process.env.SECRET, provider);
  // Initialize contract with ethers
  const contractSign = new Contract(process.env.CONTRACT, contractInfo, signer);
  try {
    const data = await readFileAsync(path, "utf8");
    // Parsez le contenu JSON
    let contenuJSON;
    try {
      contenuJSON = JSON.parse(data);
    } catch (error) {
      logger.error("Erreur lors du parsing JSON :", error);
      res.json({ success: false });
      return;
    }

    const indexToRemove = contenuJSON.findIndex(
      (location) => location.id === nftId
    );

    if (indexToRemove !== -1) {
      res.json({ success: false });
      return;
    }
    const nb = await contractSign.getNFTLocation(nftId);
    const fee = await contractSign.getFee(addressOwner, nftId);

    const tableauNombres = nb.map((bigNumber) => Number(bigNumber.toString()));

    const latitude = tableauNombres[4] / 1e5;
    const longitude = tableauNombres[5] / 1e5;
    const toWrite = {
      latitude,
      longitude,
      northLat: tableauNombres[0],
      southLat: tableauNombres[1],
      eastLon: tableauNombres[2],
      westLon: tableauNombres[3],
      tax: Number(fee.toString()),
      id: nftId,
      lat: tableauNombres[4],
      lng: tableauNombres[5],
    };
    contenuJSON.push(toWrite);
    const nouveauContenuJSON = JSON.stringify(contenuJSON, null, 2);
    await writeFileAsync(path, nouveauContenuJSON, "utf8");
    sendTelegramMessage(`save gps ${nftId}`);
    res.json({ success: true });
  } catch (error) {
    logger.fatal(`error save ${nftId}`, error);
    res.status(500).send("Error intern server (6).");
    sendTelegramMessage(`error save gps ${nftId}`);
  }
});

app.post("/api/check-new-coordinates", async (req, res) => {
  try {
    const isGood = await req.body;
    let success = false;
    if (isGood) success = true;
    res.json({ success });
  } catch (error) {
    logger.error("error interne server (7)", error);
    res.status(500).send("Error intern server (7).");
  }
});

app.post("/api/reset-nft", async (req, res) => {
  const { nftId, fee } = req.body;
  try {
    // Lire le fichier saveLocations.json
    const saveLocationsPath = pathSave;
    const rawDataSave = fs.readFileSync(saveLocationsPath);
    let saveLocations = JSON.parse(rawDataSave);

    // Trouver l'index de l'élément avec le tokenId dans le tableau saveLocations
    const indexToRemove = saveLocations.findIndex(
      (location) => location.id === 1
    );

    if (indexToRemove !== -1) {
      //const fee = contract.getFee(addressOwner, nftId);
      // Créer un nouveau tableau avec seulement l'élément à supprimer
      const locationToRemove = saveLocations[indexToRemove];

      locationToRemove.tax = Number(fee.toString());

      // Enregistrer l'élément dans le fichier validLocations.json
      const validLocationsPath = path;
      let existingValidData = [];

      try {
        // Tenter de lire le fichier
        const rawDataValid = fs.readFileSync(validLocationsPath);
        existingValidData = JSON.parse(rawDataValid);
      } catch (readError) {
        // Ignorer l'erreur si le fichier n'existe pas encore
        logger.error("validLocations.json does not exist yet.");
        res.json({ success: false });
        return;
      }

      // Ajouter l'élément au tableau existingValidData
      existingValidData.push(locationToRemove);

      // Enregistrer le tableau mis à jour dans le fichier validLocations.json
      fs.writeFileSync(
        validLocationsPath,
        JSON.stringify(existingValidData, null, 2)
      );

      logger.info(`Location with tokenId ${nftId} added to validLocations.`);

      // Retirer l'élément du tableau saveLocations
      saveLocations.splice(indexToRemove, 1);

      // Enregistrer les modifications dans le fichier saveLocations.json
      fs.writeFileSync(
        saveLocationsPath,
        JSON.stringify(saveLocations, null, 2)
      );

      logger.info(`Location with tokenId ${nftId} removed from saveLocations.`);
      res.json({ success: true });
    } else {
      logger.error(
        `Location with tokenId ${nftId} not found in saveLocations.`
      );
      res.json({ success: false });
    }
  } catch (error) {
    logger.fatal("Error updating locations:", error);
  }
});
