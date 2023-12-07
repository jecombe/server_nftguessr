const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
const {
  Wallet,
  JsonRpcProvider,
  Contract,
  formatEther,
  formatUnits,
} = require("ethers");
const fs = require("fs");
const port = 8000;
const CryptoJS = require("crypto-js");
const { promisify } = require("util");
const contractInfo = require("./abi/NftGuessr.json");
const TelegramBot = require("node-telegram-bot-api");
const path = "./locations/validLocations.json";
const pathSave = "./locations/saveLocations.json";

const dotenv = require("dotenv");
const log4js = require("log4js");
// const { default: axios } = require("axios");
//const { checkStreetViewImage } = require("./creationGps");

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

log4js.configure({
  appenders: {
    server: {
      type: "file",
      filename: "./logs/server.log",
      layout: { type: "pattern", pattern: "%[[%d] %5.5p -%] %m" },
    },
  },
  categories: { default: { appenders: ["server"], level: "all" } },
  debug: true, // Activez le débogage
  pm2: true,
});

const logger = log4js.getLogger();
dotenv.config();

const TELEGRAM_BOT_TOKEN_BOT = process.env.TELEGRAM_BOT_LOG_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID_LOG = process.env.TELEGRAM_CHAT_ID_LOG;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN_BOT, { polling: false });
const bot_users = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

const provider = new JsonRpcProvider(process.env.PROVIDER);
const contractAddress = process.env.CONTRACT;

const contract = new Contract(contractAddress, contractInfo, provider);
const signer = new Wallet(process.env.SECRET, provider);
const contractSign = new Contract(process.env.CONTRACT, contractInfo, signer);
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

// Middleware d'authentification
/*function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ message: "Accès non autorisé" });

  // Séparez le token de l'en-tête
  const token = authHeader.split(" ")[1];

  // Vérifiez le token
  jwt.verify(token, process.env.KEY, (err, user) => {
    if (err) {
      console.error("Erreur de vérification du token :", err);
      return res.status(403).json({ message: "Token non valide" });
    }
    req.user = user;
    next();
  });
}*/
const sendTelegramMessage = (message) => {
  bot.sendMessage(TELEGRAM_CHAT_ID_LOG, JSON.stringify(message));
};

const sendTelegramMessageUser = (message) => {
  bot_users.sendMessage(TELEGRAM_CHAT_ID, JSON.stringify(message));
};

const getObjectCreationAndFees = (array) => {
  const nftsCreaId = array[0].map((bigNumber) => Number(bigNumber));
  const nftsCreaFees = array[1].map((bigNumber) =>
    Math.round(formatUnits(bigNumber, "ether"))
  );
  return nftsCreaId.map((id, index) => ({ id, fee: nftsCreaFees[index] }));
};

const createOrGetOwnerObject = (addressToTokenIds, owner) => {
  if (!addressToTokenIds[owner]) {
    addressToTokenIds[owner] = {
      nfts: [],
      nftsStake: [],
      nftsReset: [],
      nftsCreation: [],
    };
  }
  return addressToTokenIds[owner];
};

const getAddressToTokenIds = async (owner, tokenId, addressToTokenIds) => {
  const obj = createOrGetOwnerObject(addressToTokenIds, owner);

  obj.nfts.push(tokenId);
  try {
    const addrStake = await contract.getAddressStakeWithToken(tokenId);
    const addrReset = await contract.getAddressResetWithToken(tokenId);
    const addrCreator = await contract.getAddressCreationWithToken(tokenId);

    if (addrReset !== "0x0000000000000000000000000000000000000000") {
      const obj = createOrGetOwnerObject(addressToTokenIds, addrReset);

      const nftsResetAndFees = getObjectCreationAndFees(
        await contract.getResetNFTsAndFeesByOwner(addrReset)
      );

      obj.nftsReset = nftsResetAndFees;
    }

    if (addrStake !== "0x0000000000000000000000000000000000000000") {
      const obj = createOrGetOwnerObject(addressToTokenIds, addrStake);
      const nftsStake = await contract.getNFTsStakedByOwner(addrStake);
      const nftsstaked = nftsStake.map((bigNumber) => Number(bigNumber));

      obj.nftsStake = nftsstaked;
    }

    if (
      addrCreator !== "0x0000000000000000000000000000000000000000" &&
      addrCreator.toLowerCase() !== process.env.OWNER
    ) {
      const obj = createOrGetOwnerObject(addressToTokenIds, addrCreator);

      const nftsCreationReset = getObjectCreationAndFees(
        await contract.getNftCreationAndFeesByUser(addrCreator)
      );
      obj.nftsCreation = nftsCreationReset;
    }
  } catch (error) {
    logger.error("getAddressToTokenIds", error);
    return error;
  }
};

async function getAllAddressesAndTokenIds() {
  const totalSupply = await contract.totalSupply();
  const addressToTokenIds = {};
  const promises = [];
  for (let i = 1; i <= totalSupply; i++) {
    const currentOwner = await contract.ownerOf(i);
    promises.push(getAddressToTokenIds(currentOwner, i, addressToTokenIds));
  }
  try {
    await Promise.all(promises);
    return addressToTokenIds;
  } catch (error) {
    logger.error("getAllAddressesAndTokenIds", error);

    return error;
  }
}

const getTotalNft = async () => {
  try {
    const totalNFTs = await contract.getTotalNft();
    return totalNFTs.toString();
  } catch (error) {
    logger.error("error getTotalNft", error);

    throw error;
  }
};

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.listen(port, () => {
  logger.info(`Server is listening on port ${port}`);
});

app.get("/api/get-gps", async (req, res) => {
  try {
    const rawData = await readFileAsync("./locations/validLocations.json");

    const randomLocations = JSON.parse(rawData);
    const randomIndex = Math.floor(Math.random() * randomLocations.length);
    const randomCoordinates = randomLocations[randomIndex];
    logger.info(`get-gps ${randomCoordinates.id}`);
    var ciphertext = CryptoJS.AES.encrypt(
      JSON.stringify(randomCoordinates),
      process.env.KEY
    ).toString();
    res.json(ciphertext);
  } catch (error) {
    logger.error(`get-gps`, error);
    res.status(500).send("Error intern server (0).");
  }
});

app.get("/api/get-holder-and-token", async (req, res) => {
  try {
    const result = await getAllAddressesAndTokenIds();
    res.json(result);
    logger.info("get-holder-and-token");
  } catch (error) {
    logger.error("get-holder-and-token.", error);

    res.status(500).send("Error intern server (1).");
  }
});

app.get("/api/get-total-nft", async (req, res) => {
  try {
    const holdersAndTokenIds = await getTotalNft();
    res.json(holdersAndTokenIds);
    logger.info("get-total-nft");
  } catch (error) {
    logger.error("get-total-nft.", error);
    res.status(500).send("Error intern server (2).");
  }
});

app.get("/api/get-total-nft-stake", async (req, res) => {
  try {
    const nftsStake = await contract.getTotalStakedNFTs();
    res.json(nftsStake.toString());
    logger.info("get-total-nft-stake.");
  } catch (error) {
    logger.error("get-total-nft-stake.", error);
    res.status(500).send("Error intern server (3).");
  }
});

app.get("/api/get-minimum-nft-stake", async (req, res) => {
  try {
    const nftsStake = await contract.getNbStake();
    res.json(nftsStake.toString());
    logger.info("get-minimum-nft-stake.");
  } catch (error) {
    logger.error("get-minimum-nft-stake", error);
    res.status(500).send("Error intern server (4).");
  }
});

app.get("/api/get-fees", async (req, res) => {
  try {
    const rep = await getFees();
    res.json(rep);
    logger.info("get-fees");
  } catch (error) {
    logger.error("get-fees", error);
    res.status(500).send("Error intern server (5).");
  }
});

const getFees = async () => {
  try {
    const nftsStake = await contract.fees();
    const rep = Math.round(formatEther(nftsStake));
    return rep.toString();
  } catch (error) {
    return error;
  }
};

app.get("/api/get-total-nft-reset", async (req, res) => {
  try {
    const nftsStake = await contract.getTotalResetNFTs();
    res.json(nftsStake.toString());
    logger.info("get-total-nft-reset.");
  } catch (error) {
    logger.error("get-total-nft-reset", error);
    res.status(500).send("Error intern server (6).");
  }
});

app.post("/api/remove-gps", async (req, res) => {
  const { nftId, isReset } = req.body;
  let success = false;
  try {
    const saveLocationsPath = pathSave;
    let existingSaveData = [];
    const rawDataSave = await readFileAsync(saveLocationsPath);
    existingSaveData = JSON.parse(rawDataSave);
    const validLocationsPath = path;
    const rawData = await readFileAsync(validLocationsPath);
    let validLocations = JSON.parse(rawData);
    const indexToRemove = validLocations.findIndex(
      (location) => location.id === nftId
    );
    if (indexToRemove !== -1) {
      const locationToRemove = validLocations[indexToRemove];
      locationToRemove.tax = 0;
      existingSaveData.push(locationToRemove);
      await writeFileAsync(
        saveLocationsPath,
        JSON.stringify(existingSaveData, null, 2),
        "utf8"
      );
      validLocations.splice(indexToRemove, 1);
      logger.trace(`Location with tokenId ${nftId} saved in saveLocations.`);

      await writeFileAsync(
        validLocationsPath,
        JSON.stringify(validLocations, null, 2),
        "utf8"
      );
      logger.trace(
        `Location with tokenId ${nftId} removed from validLocations.`
      );
      success = true;
    } else {
      logger.error(
        `Location with tokenId:${nftId} / to remove: ${indexToRemove} not found in validLocations.`
      );
    }
    if (!isReset) {
      sendTelegramMessageUser(`💰 A user win NFT GeoSpace ${nftId} 💰`);
    }
    res.json({ success });
  } catch (error) {
    logger.fatal(`remove-gps: ${nftId}`, error);
    sendTelegramMessage({ message: `error remove-gps ${nftId}` });
    res.status(500).send("Error intern server remove gps.");
  }
});

function formaterNombre(nombre) {
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
app.post(
  "/api/request-new-coordinates",

  async (req, res) => {
    const { nftId, addressOwner } = req.body;

    try {
      logger.info(`request-new-coordinates start with nft id: ${nftId}`);

      const data = await readFileAsync(path, "utf8");
      let contenuJSON;
      contenuJSON = JSON.parse(data);

      const indexToRemove = contenuJSON.findIndex(
        (location) => location.id === nftId
      );

      if (indexToRemove !== -1) {
        res.json({ success: false });
        return;
      }
      const nb = await contractSign.getNFTLocation(nftId);
      logger.trace(`request-new-coordinates ${nftId} get nb `);

      const fee = await contractSign.getFee(addressOwner, nftId);
      logger.trace(`request-new-coordinates ${nftId} get fees`);

      const tableauNombres = nb.map((bigNumber) =>
        Number(bigNumber.toString())
      );

      const latitude = tableauNombres[4];
      const longitude = tableauNombres[5];

      const convertLat = formaterNombre(latitude);
      const convertLng = formaterNombre(longitude);
      const toWrite = {
        latitude: Number(convertLat),
        longitude: Number(convertLng),
        northLat: tableauNombres[0],
        southLat: tableauNombres[1],
        eastLon: tableauNombres[2],
        westLon: tableauNombres[3],
        tax: Math.round(formatUnits(fee, "ether")),
        id: nftId,
        lat: tableauNombres[4],
        lng: tableauNombres[5],
      };
      contenuJSON.push(toWrite);
      const nouveauContenuJSON = JSON.stringify(contenuJSON, null, 2);
      await writeFileAsync(path, nouveauContenuJSON, "utf8");
      logger.trace(`request-new-coordinates ${nftId} write file`);

      res.json({ success: true });
      logger.info(`request-new-coordinates ${nftId} saved !`);
      sendTelegramMessage({ message: `request-new-coordinates ${nftId}` });
      sendTelegramMessageUser(`💎 New NFT create with id ${nftId} 💎`);
    } catch (error) {
      logger.fatal(`request-new-coordinates ${nftId}`, error);
      res.status(500).send("Error intern server (6).");
      sendTelegramMessage({
        message: `Error request-new-coordinates ${nftId}`,
      });
    }
  }
);

// A REVOIR DE TOUTE URGENCE
app.post("/api/check-new-coordinates", async (req, res) => {
  const { latitude, longitude } = req.body;

  try {
    logger.info(`latitude: ${latitude} / longitude: ${longitude}`);
    const success = await checkStreetViewImage({
      lat: latitude,
      lng: longitude,
    });
    logger.info(`is success: ${success}`);
    res.json({ success });
  } catch (error) {
    logger.error(`error check-new-coordinates ${latitude} ${longitude}`, error);
    sendTelegramMessage({ message: "error check-new-coordinates" });
    res.status(500).send("Error intern server (7).");
  }
});

app.post("/api/reset-nft", async (req, res) => {
  const { nftIds, fee, isReset } = req.body;
  try {
    logger.info(`reset-nft start save and delete with nft: ${nftIds}`);

    const saveLocationsPath = isReset ? pathSave : path;
    const validLocationsPath = isReset ? path : pathSave;

    const rawDataSave = await readFileAsync(saveLocationsPath, "utf8");
    logger.trace(`reset-nft ${nftIds} read saveLocationsPath`);

    let saveLocations = JSON.parse(rawDataSave);
    let locationsToAdd = []; // Tableau pour stocker les emplacements à ajouter

    // Iterate over the array of nftIds
    nftIds.forEach((id) => {
      const locationToAdd = saveLocations.find(
        (location) => location.id === id
      );

      if (locationToAdd) {
        locationToAdd.tax = Number(fee[id].toString());

        locationsToAdd.push(locationToAdd);
      }
    });

    // Read the existing validLocations.json

    const rawDataValid = await readFileAsync(validLocationsPath, "utf8");
    logger.trace(`reset-nft ${nftIds} read validLocationsPath`);

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

    // Save the updated validLocations.json
    await writeFileAsync(
      validLocationsPath,
      JSON.stringify(validLocations, null, 2)
    );
    logger.trace(`reset-nft ${nftIds} write validLocationsPath`);

    // Remove the added locations from saveLocations
    saveLocations = saveLocations.filter(
      (location) => !nftIds.includes(location.id)
    );
    // Save the updated saveLocations.json
    await writeFileAsync(
      saveLocationsPath,
      JSON.stringify(saveLocations, null, 2)
    );
    logger.trace(`reset-nft ${nftIds} write saveLocationsPath`);
    logger.info(`reset-nft ${nftIds} saved !`);
    sendTelegramMessage({ message: `reset-nft ${nftIds}` });
    res.json({ success: true });
  } catch (error) {
    res.status(500).send("Error intern server (6).");
    sendTelegramMessage({ message: `error reset-nft ${nftIds}` });
    logger.fatal(`reset-nft ${nftIds}`, error);
  }
});

app.post("/api/telegram-channel", async (req, res) => {
  console.log(isAccess, userName);
  res.json({ success: true });

  // if (isAccess) {
  //   const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/addChatMember?chat_id=${process.env.TELEGRAM_CHAT_GOVERNANCE}&user_id=${userName}`;
  //   const response = await fetch(url, { method: "POST" });
  //   const result = await response.json();
  //   console.log(result);
  // }
});

const botTe = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: true,
});

const manageInfos = async (chatId) => {
  const fees = await getFees();
  const minimumStake = await contract.getNbStake();
  const totalNfts = await getTotalNft();

  const message = `
  💎 GeoSpace total:${totalNfts}\n 💸 Minimum fees to guess: ${fees} ZAMA\n🔓 Minimum GeoSpace hold to access creation: ${minimumStake}`;
  botTe.sendMessage(chatId, message);
};

botTe.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  // Créer un clavier personnalisé
  const keyboard = {
    resize_keyboard: true,
    keyboard: [["get rules"], ["get stats"], ["help"]],
    one_time_keyboard: true,
  };

  // Envoyer un message d'introduction avec le clavier personnalisé
  const message = `🌐 **Welcome to NFTGuessr Bot!** 🌐
  "With this, you can get rules and all informations about the game.",
  `;
  botTe.sendMessage(chatId, message, {
    reply_markup: JSON.stringify(keyboard),
  });
});

// Écouter les réponses de l'utilisateur
botTe.on("message", (msg) => {
  const chatId = msg.chat.id;

  // Vérifier le texte du message
  switch (msg.text) {
    case "get rules":
      // Gérer la commande 1
      const message = `
      NFTGuessr is a thrilling game inspired by GeoGuessr. The concept is simple: pinpoint the location in Google Street View. Powered by EVM on Zama, each location is tied to an NFT encrypted with Fully Homomorphic Encryption (FHE).
      
      🔍 **How to Play:**
      1. Pay 1 Zama to inquire if your location guess is correct (within the 5 km² radius of the NFT location).
      2. If correct, you win the associated NFT!
      
      💡 **Options for Winners:**
      - **Option 1:** Put the NFT back into play with your tax for one round.
      - **Option 2:** Accumulate 3 NFTs, stake them, and unlock the ability to create new NFTs with GPS coordinates, including your tax.
      
      🚀 **Ready to play? Dive into the NFTGuessr adventure!**
      
      📌 *Note: Make sure to join our Telegram group for updates and discussions! [Telegram Group Link]*
      
      Happy Guessing! 🌍🎮
      `;
      botTe.sendMessage(chatId, message);
      break;
    case "get stats":
      // Gérer la commande 2
      manageInfos(chatId);
      break;
    case "help":
      const msg = `🌐 **Welcome to NFTGuessr Bot!** 🌐
      "With this, you can get rules and all informations about the game.",
      `;
      botTe.sendMessage(chatId, msg);
      break;
    default:
  }
});
