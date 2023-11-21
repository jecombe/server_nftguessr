const express = require("express");
const cors = require("cors");
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

const contractInfo = require("./interact/abi/NftGuessr.json");
const server = http.createServer(app); // Remplacez app par server
const TelegramBot = require("node-telegram-bot-api");
const path = "./locations/validLocations.json";
const path2 = "./locations/signature.json";
const pathSave = "./locations/saveLocation.json";

// ...
const dotenv = require("dotenv");
const log4js = require("log4js");
const startChecking = require("./test");

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

  for (let i = 1; i <= totalSupply; i++) {
    const currentOwner = await contract.ownerOf(i);
    const nftsStake = await contract.getNFTsStakedByOwner(currentOwner);
    const tokenId = i;

    if (!addressToTokenIds[currentOwner]) {
      addressToTokenIds[currentOwner] = {
        nftsId: [],
        nftsStake,
      };
    }

    addressToTokenIds[currentOwner].nftsId.push(tokenId);
    //   // Votre logique pour déterminer si le NFT est staké ou non
    //   const isStaked = await contract.isStaked(tokenId); // Remplacez par votre propre logique

    //   if (isStaked) {
    //     addressToTokenIds[currentOwner].nftsStake.push(tokenId);
    //   }
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

app.post("/api/request-new-coordinates", async (req, res) => {
  const { nftId, signature } = req.body;

  try {
    sendTelegramMessage({ message: "new coordinate" });

    const signatureData = fs.readFileSync(path2, "utf-8");
    const signatureList = JSON.parse(signatureData);
    const validSignature = signatureList.some(
      (entry) => entry.signature === signature
    );
    if (!validSignature) {
      res.status(401).json({ success: false, message: "Invalid signature" });
      return;
    }
    const signer = new Wallet(process.env.SECRET, provider);
    // Initialize contract with ethers
    const contractSign = new Contract(
      process.env.CONTRACT,
      contractInfo,
      signer
    );

    const nb = await contractSign.getNFTLocation(nftId);
    const tableauNombres = nb.map((bigNumber) => Number(bigNumber.toString()));

    const latitude = tableauNombres[5] / 1e5;
    const longitude = tableauNombres[6] / 1e5;
    const toWrite = {
      latitude,
      longitude,
      northLat: tableauNombres[0],
      southLat: tableauNombres[1],
      eastLon: tableauNombres[2],
      westLon: tableauNombres[3],
      tax: tableauNombres[4],
      id: nftId,
      lat: tableauNombres[5],
      lng: tableauNombres[6],
    };

    fs.readFile(path, "utf8", (err, data) => {
      if (err) {
        logger.error("Erreur lors de la lecture du fichier :", err);
        return;
      }

      // Parsez le contenu JSON
      let contenuJSON;
      try {
        contenuJSON = JSON.parse(data);
      } catch (error) {
        logger.error("Erreur lors du parsing JSON :", err);
        return;
      }

      // Ajoutez les nouvelles données au tableau existant
      contenuJSON.push(toWrite);

      // Convertissez le contenu modifié en JSON
      const nouveauContenuJSON = JSON.stringify(contenuJSON, null, 2);

      // Écrivez le nouveau contenu dans le fichier
      fs.writeFile(path, nouveauContenuJSON, "utf8", (err) => {
        if (err) {
          logger.error("Erreur lors de l'écriture dans le fichier :", err);

          sendTelegramMessage(
            `Erreur lors de l'écriture dans le fichier ${nftId}`
          );

          res.json({ success: false });
          return;
        } else {
          sendTelegramMessage(`save gps ${nftId}`);
          logger.info("Données ajoutées avec succès :", err);
        }
      });
    });
    res.json({ success: true });
  } catch (error) {
    logger.error("error interne server (6)", error);
    sendTelegramMessage(`error gps ${nftId}`);
    res.status(500).send("Error intern server (6).");
  }
});

app.post("/api/check-new-coordinates", async (req, res) => {
  try {
    const isGood = await startChecking(req.body);
    let success = false;
    if (isGood) success = true;
    res.json({ success });
  } catch (error) {
    logger.error("error interne server (7)", error);
    res.status(500).send("Error intern server (7).");
  }
});

app.post("/api/save-signature", async (req, res) => {
  try {
    // Enregistrez la signature dans le fichier signature.json
    const signatureData = {
      signature: req.body.signature,
      timestamp: new Date().toISOString(),
      id: req.body.id,
    };

    // Lisez le contenu actuel du fichier, s'il existe
    let currentData = [];
    if (fs.existsSync(path2)) {
      const fileContent = fs.readFileSync(path2, "utf-8");
      currentData = JSON.parse(fileContent);
    }

    // Ajoutez la nouvelle signature aux données existantes
    currentData.push(signatureData);

    // Écrivez les données mises à jour dans le fichier
    fs.writeFileSync(path2, JSON.stringify(currentData, null, 2));

    let success = false;
    res.json({ success });
  } catch (error) {
    sendTelegramMessage(`Internal Server Error (6`);
    logger.error("save signature", error);
    res.status(500).send("Internal Server Error (6).");
  }
});

app.post("/api/reset-nft", async (req, res) => {
  try {
    const { selectedNFTs, feesArray } = req.body;
    sendTelegramMessage({ message: "RESET" });

    const rawData = fs.readFileSync(path);
    const nftsData = JSON.parse(rawData);

    // Mettre à jour la taxe de chaque NFT en fonction de l'ID correspondant
    for (let i = 0; i < selectedNFTs.length; i++) {
      const nftId = selectedNFTs[i];
      const feeInEth = Number(feesArray[i]);

      const nftToUpdate = nftsData.find((nft) => nft.id === nftId);
      if (nftToUpdate) {
        // Mettre à jour la propriété "tax" avec les nouveaux frais
        nftToUpdate.tax = feeInEth;
      }
    }

    // Écrire les données mises à jour dans le fichier JSON
    fs.writeFileSync(path, JSON.stringify(nftsData, null, 2));

    // Send a response to the client if needed
    res.json({ success: true });
  } catch (error) {
    logger.error("Error handling reset-nft request:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
