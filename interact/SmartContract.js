const { createInstance } = require("fhevmjs");
const {
  Wallet,
  JsonRpcProvider,
  Contract,
  parseEther,
  parseUnits,
} = require("ethers");
const dotenv = require("dotenv");
const fs = require("fs");
dotenv.config();
const contractInfo = require("./abi/Geo.json");

const provider = new JsonRpcProvider("https://devnet.zama.ai/");
let _instance;
const CONTRACT_ADDRESS = process.env.AMM;
const sign = process.env.SECRET;
// Charger le fichier JSON
const rawData = fs.readFileSync("../locations/rajout.json");
const jsonData = JSON.parse(rawData);
const getInstance = async () => {
  if (_instance) return _instance;

  // 1. Get chain id
  const network = await provider.getNetwork();

  const chainId = +network.chainId.toString();

  // Get blockchain public key
  const publicKey = await provider.call({
    to: "0x0000000000000000000000000000000000000044",
  });

  // Create instance
  _instance = createInstance({ chainId, publicKey });
  return _instance;
};

const changeThreshold = async () => {
  const signer = new Wallet(sign, provider);

  // Initialize contract with ethers
  const contract = new Contract(CONTRACT_ADDRESS, contractInfo, signer);
  // Get instance to encrypt amount parameter
  const instance = await getInstance();
  const encryptedAmount0 = instance.encrypt32(100 * 100);

  const transaction = await contract["changeThreshold(bytes)"](
    encryptedAmount0
  );
  return transaction;
};

const createNft = async () => {
  const signer = new Wallet(sign, provider);

  // Initialize contract with ethers
  const contract = new Contract(CONTRACT_ADDRESS, contractInfo, signer);

  // Get instance to encrypt amount parameter
  const instance = await getInstance();

  const obj = [];
  jsonData.forEach((location) => {
    obj.push(
      instance.encrypt32(location.northLat),
      instance.encrypt32(location.southLat),
      instance.encrypt32(location.eastLon),
      instance.encrypt32(location.westLon),
      instance.encrypt32(location.lat),
      instance.encrypt32(location.lng)
    );
  });
  console.log(obj);
  const tx = await contract.createNFT(obj, { gasLimit: 10000000 });

  // const transaction = {
  //   from: signer.address, // Adresse de l'expéditeur
  //   to: contract.address, // Adresse du contrat
  //   gasLimit: "10000000", // Limite de gaz (à personnaliser)
  //   maxFeePerGas: parseUnits("200", "gwei"), // Max Fee Per Gas (à personnaliser)
  //   maxPriorityFeePerGas: parseUnits("50", "gwei"), // Max Priority Fee Per Gas (à personnaliser)
  //   data: contract.interface.encodeFunctionData("createNFT", [obj]), // Encodage de la fonction du contrat et de ses paramètres
  // };

  //const tx = await signer.sendTransaction(transaction);

  // const latitudes = [instance.encrypt32(456151904)]; // Remplacez par les latitudes souhaitées
  // const longitudes = [instance.encrypt32(67637934)]; // Remplacez par les longitudes souhaitées

  // const transaction = await contract.createNFT(latitudes, longitudes);
  await tx.wait();
  return tx;
};

const signer = new Wallet(process.env.SECRET, provider);

// Initialize contract with ethers
const contract = new Contract(process.env.AMM, contractInfo, signer);

const checkGps = async () => {
  // const signer = new Wallet(sign, provider);

  // // Initialize contract with ethers
  // const contract = new Contract(CONTRACT_ADDRESS, contractInfo, signer);
  // Get instance to encrypt amount parameter
  const instance = await getInstance();

  const lat = instance.encrypt32(4575606);
  const lng = instance.encrypt32(484967);
  const valueToSend = parseEther("1");

  const transaction = await contract["checkGps(bytes,bytes)"](
    lat,
    lng,
    { gasLimit: 5000000 } // Spécifiez la valeur à envoyer
  );
  const rep = await transaction.wait();
  console.log(rep);
  return transaction;
};

const getLat = async () => {
  const signer = new Wallet(sign, provider);

  // Initialize contract with ethers
  const contract = new Contract(CONTRACT_ADDRESS, contractInfo, signer);
  // Get instance to encrypt amount parameter
  const instance = await getInstance();

  const lat = instance.encrypt32(-343439875);
  const lng = instance.encrypt32(-662332078);

  const transaction = await contract["getNFTLocation(uint256)"](0);
  const balance = instance.decrypt(CONTRACT_ADDRESS, transaction);
  return balance;
};

//ETAPE 1 change changeThreshold
//ETAPE 2 change createNft

const start = async () => {
  const res = await createNft();
  console.log(res);
};

start();
