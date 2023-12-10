const { createInstance } = require("fhevmjs");
const { Wallet, JsonRpcProvider, Contract, parseEther } = require("ethers");
const dotenv = require("dotenv");
const fs = require("fs");
dotenv.config();
const contractInfo = require("../../abi/NftGuessr.json");

const provider = new JsonRpcProvider(process.env.PROVIDER);
let _instance;
const CONTRACT_ADDRESS = process.env.CONTRACT;
const sign = process.env.SECRET;
const signUser = process.env.USER_SECRET;
const rawData = fs.readFileSync("./locations/rajout.json");
const jsonData = JSON.parse(rawData);
const getInstance = async () => {
  if (_instance) return _instance;

  const network = await provider.getNetwork();

  const chainId = +network.chainId.toString();

  const publicKey = await provider.call({
    to: "0x0000000000000000000000000000000000000044",
  });

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

  const objFees = [];
  jsonData.forEach((location) => {
    obj.push(
      instance.encrypt32(location.northLat),
      instance.encrypt32(location.southLat),
      instance.encrypt32(location.eastLon),
      instance.encrypt32(location.westLon),
      instance.encrypt32(location.lat),
      instance.encrypt32(location.lng)
    );
    objFees.push(0);
  });
  const tx = await contract.createGpsOwner(obj, objFees, {
    gasLimit: 10000000,
  });

  await tx.wait();
  return tx;
};

const checkGps = async () => {
  try {
    console.log(process.env.USER);
    const signer = new Wallet(signUser, provider);

    // Initialize contract with ethers
    const contract = new Contract(CONTRACT_ADDRESS, contractInfo, signer);

    // Get instance to encrypt amount parameter
    const instance = await getInstance();

    const lat = 4461583;
    const lng = 940601;

    const encryptLat = instance.encrypt32(lat);
    const encryptLng = instance.encrypt32(lng);
    const tx = await contract.checkGps(encryptLat, encryptLng, 1, {
      gasLimit: 10000000,
      value: parseEther("1"), // Convertit 1 Ether en wei
    });

    await tx.wait();
    return tx;
  } catch (error) {
    console.log(error);
  }
};

const start = async () => {
  const res = await createNft();
  console.log(res);
};

start();

//module.exports = { createNft };
