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
const server = http.createServer(app); // Remplacez app par server
const TelegramBot = require("node-telegram-bot-api");

const path = "./locations/validLocations.json";
// ...
const dotenv = require("dotenv");
const log4js = require("log4js");

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

const sendTelegramMessage = (message) => {
  bot.sendMessage(TELEGRAM_CHAT_ID, JSON.stringify(message));
};
// sendTelegramMessage("get GPS");

// Générer une clé de chiffrement et un vecteur d'initialisation (IV)
// 128 bits pour un IV

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
