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

const contractInfo = require("./interact/abi/Geo.json");
const TelegramBot = require("node-telegram-bot-api");
const path = "./locations/validLocations.json";
const path2 = "./locations/signature.json";

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
const signer = new Wallet(process.env.SECRET, provider);
// Initialize contract with ethers
const contractSign = new Contract(process.env.CONTRACT, contractInfo, signer);

// const nft = [];

// contract.on("GpsCheckResult", async (userAddress, result) => {
//   console.log(userAddress, result);
// });

const sendTelegramMessage = (message) => {
  bot.sendMessage(TELEGRAM_CHAT_ID, JSON.stringify(message));
};
// sendTelegramMessage("get GPS");

// Générer une clé de chiffrement et un vecteur d'initialisation (IV)
// 128 bits pour un IV

// Fonction pour écouter l'événement GpsCheckResult
/*const listenToGpsCheckResultEvent = () => {
  try {
    // Créer un filtre pour l'événement GpsCheckResult
    const filter = contract.filters.GpsCheckResult();

    // Connecter un gestionnaire d'événements au filtre
    contract.on(filter, (data) => {
      console.log(data.args);
      const userAddress = data.args[0];
      const isSuccess = data.args[1];
      const tokenId = data.args[2];

      sendTelegramMessage({
        message: `GpsCheckResult event received - User: ${userAddress}, Result: ${isSuccess}`,
      });

      // if (isSuccess === false) {
      //   console.log("OOOOOOOOOOOOOOK", tokenId);
      //   // Lire le fichier ValidLocations.json
      //   const validLocationsData = fs.readFileSync(
      //     "./locations/validLocations.json",
      //     "utf-8"
      //   );
      //   const validLocations = JSON.parse(validLocationsData);

      //   // Rechercher l'objet correspondant à tokenId
      //   const index = validLocations.findIndex(
      //     (location) => location.id === Number(tokenId)
      //   );

      //   console.log(index);

      //   if (index !== -1) {
      //     // Si l'objet est trouvé, le retirer de ValidLocations.json
      //     const removedLocation = validLocations.splice(index, 1)[0];
      //     console.log(removedLocation);

      //     const saveLocationsData = fs.readFileSync(
      //       "./locations/saveLocations.json",
      //       "utf-8"
      //     );
      //     const saveLocations = JSON.parse(saveLocationsData);
      //     saveLocations.push(removedLocation);

      //     // Écrire les modifications dans les fichiers
      //     fs.writeFileSync(
      //       "./locations/validLocations.json",
      //       JSON.stringify(validLocations, null, 2)
      //     );
      //     fs.writeFileSync(
      //       "./locations/saveLocations.json",
      //       JSON.stringify(saveLocations, null, 2)
      //     );
      //   } else {
      //     sendTelegramMessage({
      //       message: `GpsCheckResult event tokenId unknow - TokenId: ${tokenId}`,
      //     });
      //   }
      // }
    });

    console.log("Event filter created successfully");
  } catch (error) {
    console.error("Error creating event filter:", error.message);
  }
};*/

// Appeler la fonction pour écouter l'événement au démarrage du serveur
//listenToGpsCheckResultEvent();

function removeDuplicates(array) {
  return Array.from(new Set(array));
}

const groupAddressesWithIds = async (addresses, ids) => {
  let result = {};
  // Assurez-vous que les tableaux ont la même longueur
  if (addresses.length !== ids.length) {
    throw new Error(
      "Les tableaux d'adresses et d'identifiants n'ont pas la même longueur."
    );
  }
  const addrs = addresses.map((bn) => bn.toString());
  const r = removeDuplicates(addrs);

  for (let i = 0; i < r.length; i++) {
    const address = r[i].toLowerCase(); // Utilisez .toLowerCase() pour normaliser les adresses
    try {
      const nftsStaked = await contract.getNFTsStakedByOwner(address);
      const nftsReset = await contract.getNFTsResetByOwner(address);
      const nfts = await contract.getNFTsByOwner(address);
      const nftsResetNb = nftsReset.map((bn) => Number(bn.toString()));
      const nftsStakedNb = nftsStaked.map((bn) => Number(bn.toString()));
      const nftsNb = nfts.map((bn) => Number(bn.toString()));

      result[address] = {
        owner: address,
        nfts: nftsNb,
        nftsStaked: nftsStakedNb,
        nftsReset: nftsResetNb,
        isAccess: false,
      };
    } catch (error) {
      logger.error("groupAddressesWithIds", error);
    }
  }
  return result;
};

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
    const totalNFTs = await contract.getTotalNFTs(); // Supposons que le contrat a une fonction pour obtenir le nombre total de NFTs
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
    const result = await contract.getNFTOwnersAndTokenIds();
    const sendObj = await groupAddressesWithIds(result[0], result[1]);
    res.json(sendObj);
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
    const nftsStake = await contract.nbNftStake();
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
    console.log(toWrite);

    fs.readFile(path, "utf8", (err, data) => {
      if (err) {
        console.error("Erreur lors de la lecture du fichier :", err);
        return;
      }

      // Parsez le contenu JSON
      let contenuJSON;
      try {
        contenuJSON = JSON.parse(data);
      } catch (error) {
        console.error("Erreur lors du parsing JSON :", error);
        return;
      }

      // Ajoutez les nouvelles données au tableau existant
      contenuJSON.push(toWrite);

      // Convertissez le contenu modifié en JSON
      const nouveauContenuJSON = JSON.stringify(contenuJSON, null, 2);

      // Écrivez le nouveau contenu dans le fichier
      fs.writeFile(path, nouveauContenuJSON, "utf8", (err) => {
        if (err) {
          console.error("Erreur lors de l'écriture dans le fichier :", err);
          sendTelegramMessage(
            `Erreur lors de l'écriture dans le fichier ${nftId}`
          );

          res.json({ success: false });
          return;
        } else {
          sendTelegramMessage(`save gps ${nftId}`);
          console.log("Données ajoutées avec succès !");
        }
      });
    });
    res.json({ success: true });
  } catch (error) {
    console.log(error);
    sendTelegramMessage(`error gps ${nftId}`);

    res.status(500).send("Error intern server (6).");
  }
});

app.post("/api/check-new-coordinates", async (req, res) => {
  try {
    logger.info("check new coordinates", req.body);
    const isGood = await startChecking(req.body);
    let success = false;
    if (isGood) {
      // Vérifiez la disponibilité de l'image Street View

      success = true;
    }
    res.json({ success });
  } catch (error) {
    console.log(error);
    res.status(500).send("Error intern server (6).");
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
    console.log(error);
    sendTelegramMessage(`Internal Server Error (6`);

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

      const nftToUpdate = nftsData.find((nft) => nft.tokenId === nftId);

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
