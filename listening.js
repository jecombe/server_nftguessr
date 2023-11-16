const { ethers, JsonRpcProvider, Wallet } = require("ethers");
const { Web3 } = require("web3");
const dotenv = require("dotenv");
const contractInfo = require("./interact/abi/Geo.json");

dotenv.config();
// Remplacez ces valeurs par les vôtres
const ethereumRpcUrl = process.env.PROVIDER; // Remplacez par l'URL RPC Ethereum appropriée
const contractAddress = process.env.CONTRACT; // Remplacez par l'adresse de votre contrat
const privateKey = process.env.SECRET; // Remplacez par votre clé privée

console.log(ethereumRpcUrl);
// Configuration d'ethers
const provider = new JsonRpcProvider(ethereumRpcUrl);
const signer = new Wallet(privateKey, provider);

// Configuration de web3.js
const web3 = new Web3(signer);

// Utilisez web3 pour interagir avec le contrat
const contract = new web3.eth.Contract(contractInfo, contractAddress);

// ... Le reste de votre code
