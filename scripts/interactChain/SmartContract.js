const { createInstance } = require("fhevmjs");
const {
  Wallet,
  JsonRpcProvider,
  Contract,
  parseEther,
  ethers,
} = require("ethers");
const dotenv = require("dotenv");
const fs = require("fs");
dotenv.config();
const contractInfo = require("../../abi/NftGuessr.json");
const path = require("path");
const logger = require("../../srcs/utils/logger");

const provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER);
const providerInco = new ethers.providers.JsonRpcProvider(
  process.env.PROVIDER_INCO
);
const providerFhenix = new ethers.providers.JsonRpcProvider(
  process.env.PROVIDER_FHENIX
);
let _instance;
const sign = process.env.SECRET;
const signUser = process.env.USER_SECRET;

async function signTypedData(typedData) {
  const signer = new ethers.Wallet(signUser, provider); // Remplacez privateKey par la clé privée associée à l'adresse Ethereum

  const signature = await signer.signMessage(typedData);

  return signature;
}

const getInstance = async (provi) => {
  if (_instance) return _instance;

  const network = await provi.getNetwork();

  const chainId = +network.chainId.toString();

  const publicKey = await provi.call({
    to: "0x0000000000000000000000000000000000000044",
  });

  _instance = createInstance({ chainId, publicKey });
  return _instance;
};
const getToken = async (instanceG) => {
  return instanceG.generateToken({
    name: "Authentication",
    verifyingContract: process.env.CONTRACT,
  });
};

// const changeThreshold = async () => {
//   const signer = new Wallet(sign, provider);

//   // Initialize contract with ethers
//   const contract = new Contract(CONTRACT_ADDRESS, contractInfo, signer);
//   // Get instance to encrypt amount parameter
//   const instance = await getInstance();
//   const encryptedAmount0 = instance.encrypt32(100 * 100);

//   const transaction = await contract["changeThreshold(bytes)"](
//     encryptedAmount0
//   );
//   return transaction;
// };

const getDefaultProvider = (chain) => {
  if (chain === "zama") {
    return provider;
  } else if (chain === "fhenix") {
    return providerFhenix;
  } else if (chain === "inco") {
    return providerInco;
  }
  return undefined;
};

const getDefaultContract = (chain) => {
  if (chain === "zama") {
    return process.env.CONTRACT;
  } else if (chain === "fhenix") {
    return process.env.CONTRACT_FHENIX;
  } else if (chain === "inco") {
    return process.env.CONTRACT_INCO;
  }
  return undefined;
};

const createNft = async (chain) => {
  const fullPath = path.resolve(__dirname, "../../locations/rajout.json");
  const rawData = fs.readFileSync(fullPath);
  const jsonData = JSON.parse(rawData);

  try {
    const provid = chain === "inco" ? providerInco : provider;
    const signer = new Wallet(sign, provid);
    const ADDR_CONTRACT =
      chain === "inco" ? process.env.CONTRACT_INCO : process.env.CONTRACT;

    // Initialize contract with ethers
    const contract = new Contract(ADDR_CONTRACT, contractInfo, signer);

    // Get instance to encrypt amount parameter
    const instance = await getInstance(provid);

    const obj = [];

    const objFees = [];
    jsonData.forEach((location) => {
      console.log(location);
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

    return tx.wait();
  } catch (error) {
    console.log(error);
    return error;
  }
};

const getLocation = async (chain) => {
  const provid = chain === "inco" ? providerInco : provider;
  const signer = new Wallet(sign, provid);
  const ADDR_CONTRACT =
    chain === "inco" ? process.env.CONTRACT_INCO : process.env.CONTRACT;

  // Initialize contract with ethers
  const contract = new Contract(ADDR_CONTRACT, contractInfo, signer);

  // Get instance to encrypt amount parameter
  const instance = await getInstance();
  const token = await getToken(instance);
  console.log(instance.hasKeypair(process.env.CONTRACT)); // false
  const params = JSON.stringify([
    process.env.OWNER,
    JSON.stringify(token.token),
  ]);
  const signature = signTypedData(params);
  // instance.setTokenSignature(process.env.CONTRACT, signature);
  // const tx = await contract.getNFTLocation(1, token.publicKey, {
  //   from: process.env.OWNER,
  // });

  //console.log(tx[0]);
  //const r = instance.decrypt(token.publicKey, tx[0]);
  //await tx.wait();
};

//getLocation();

// const checkGps = async () => {
//   try {
//     console.log(process.env.USER);
//     const signer = new Wallet(signUser, provider);

//     // Initialize contract with ethers
//     const contract = new Contract(CONTRACT_ADDRESS, contractInfo, signer);

//     // Get instance to encrypt amount parameter
//     const instance = await getInstance();

//     const lat = 4461583;
//     const lng = 940601;

//     const encryptLat = instance.encrypt32(lat);
//     const encryptLng = instance.encrypt32(lng);
//     const tx = await contract.checkGps(encryptLat, encryptLng, 1, {
//       gasLimit: 10000000,
//       value: parseEther("1"), // Convertit 1 Ether en wei
//     });

//     await tx.wait();
//     return tx;
//   } catch (error) {
//     console.log(error);
//   }
// };

module.exports = { createNft };
