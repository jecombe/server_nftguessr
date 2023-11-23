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
const contractInfo = require("./interact/abi/NftGuessr.json");

const provider = new JsonRpcProvider(process.env.PROVIDER);
let _instance;
const CONTRACT_ADDRESS = process.env.CONTRACT;
const sign = process.env.SECRET;
// Charger le fichier JSON
const rawData = fs.readFileSync("./locations/rajout.json");
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
      instance.encrypt32(location.lng),
      instance.encrypt32(0)
    );
  });
  console.log(obj);
  const tx = await contract.createGpsOwner(obj, { gasLimit: 10000000 });

  await tx.wait();
  return tx;
};

const start = async () => {
  const res = await createNft();
  console.log(res);
};

start();

module.exports = { createNft };
