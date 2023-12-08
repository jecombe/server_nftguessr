const cors = require("cors");
const jwt = require("jsonwebtoken");

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

// const readFileAsync = promisify(fs.readFile);
// const writeFileAsync = promisify(fs.writeFile);

// const provider = new JsonRpcProvider(process.env.PROVIDER);
// const contractAddress = process.env.CONTRACT;

// const contract = new Contract(contractAddress, contractInfo, provider);
// const signer = new Wallet(process.env.SECRET, provider);
// Remplacez "VotreEvent" par le nom de votre événement
// const filter = contract.filters.ResetNFT(null, null, null);

// Réinitialiser le filtre après l'avoir utilisé
// contract.once(filter, (user, tokenId, isReset, event) => {
// Traitement initial ici

// Réinitialiser le filtre après l'avoir utilisé
// contract.removeAllListeners(filter);

// Écouter à nouveau pour les événements futurs
// contract.on(filter, (user, tokenId, isReset, event) => {
// Traitement des événements ici
//     logger.info(
//       "============== Nouvel événement détecté =================== ",
//       event
//     );
//     console.log("User:", user);
//     console.log("TokenId:", tokenId.toString());
//     console.log("IsReset:", isReset);
//   });
// });
// const whitelist = ["http://nftguessr.com"]; // Ajoutez d'autres domaines autorisés si nécessaire
// const corsOptions = {
//   origin: function (origin, callback) {
//     if (whitelist.indexOf(origin) !== -1 || !origin) {
//       callback(null, true);
//     } else {
//       callback(new Error("Not allowed by CORS"));
//     }
//   },
// };

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
};*/

// Abonnement à l'événement et gestion des erreurs
// contract.on("GpsCheckResult", onEvent).catch((error) => {
//   console.error("Error subscribing to GpsCheckResult event:", error);
// });

// Désabonnement du filtre lorsque cela est nécessaire (par exemple, à la fin du programme ou lors de la suppression du gestionnaire d'événements)
// Assurez-vous de gérer les erreurs lors de la désinscription
// const unsubscribe = async () => {
//   try {
//     await contract.off("GpsCheckResult", onEvent);
//     console.log("Unsubscribed from GpsCheckResult event");
//   } catch (error) {
//     console.error("Error unsubscribing from GpsCheckResult event:", error);
//   }
// };

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

// app.post("/api/remove-gps", async (req, res) => {
//   const { nftId, isReset } = req.body;
//   let success = false;
//   try {
//     const saveLocationsPath = pathSave;
//     let existingSaveData = [];
//     const rawDataSave = await readFileAsync(saveLocationsPath);
//     existingSaveData = JSON.parse(rawDataSave);
//     const validLocationsPath = path;
//     const rawData = await readFileAsync(validLocationsPath);
//     let validLocations = JSON.parse(rawData);
//     const indexToRemove = validLocations.findIndex(
//       (location) => location.id === nftId
//     );
//     if (indexToRemove !== -1) {
//       const locationToRemove = validLocations[indexToRemove];
//       locationToRemove.tax = 0;
//       existingSaveData.push(locationToRemove);
//       await writeFileAsync(
//         saveLocationsPath,
//         JSON.stringify(existingSaveData, null, 2),
//         "utf8"
//       );
//       validLocations.splice(indexToRemove, 1);
//       logger.trace(`Location with tokenId ${nftId} saved in saveLocations.`);

//       await writeFileAsync(
//         validLocationsPath,
//         JSON.stringify(validLocations, null, 2),
//         "utf8"
//       );
//       logger.trace(
//         `Location with tokenId ${nftId} removed from validLocations.`
//       );
//       success = true;
//     } else {
//       logger.error(
//         `Location with tokenId:${nftId} / to remove: ${indexToRemove} not found in validLocations.`
//       );
//     }
//     if (!isReset) {
//       sendTelegramMessageUser(`💰 A user win NFT GeoSpace ${nftId} 💰`);
//     }
//     res.json({ success });
//   } catch (error) {
//     logger.fatal(`remove-gps: ${nftId}`, error);
//     sendTelegramMessage({ message: `error remove-gps ${nftId}` });
//     res.status(500).send("Error intern server remove gps.");
//   }
// });

// A REVOIR DE TOUTE URGENCE
// app.post("/api/check-new-coordinates", async (req, res) => {
//   const { latitude, longitude } = req.body;

//   try {
//     logger.info(`latitude: ${latitude} / longitude: ${longitude}`);
//     const success = await checkStreetViewImage({
//       lat: latitude,
//       lng: longitude,
//     });
//     logger.info(`is success: ${success}`);
//     res.json({ success });
//   } catch (error) {
//     logger.error(`error check-new-coordinates ${latitude} ${longitude}`, error);
//     sendTelegramMessage({ message: "error check-new-coordinates" });
//     res.status(500).send("Error intern server (7).");
//   }
// });
