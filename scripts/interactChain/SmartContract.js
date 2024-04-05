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
const contractInfo = require("../../abi/NftGuessr.json");
const path = require("path");
const logger = require("../../srcs/utils/logger");
dotenv.config();

let _instance;
const CONTRACT_ADDRESS = process.env.CONTRACT;
const sign = process.env.SECRET;
const signUser = process.env.USER_SECRET;

const provider = new ethers.providers.JsonRpcProvider(
  "https://devnet.zama.ai/"
);
const contractAddress = process.env.CONTRACT;
const signer = new Wallet(sign, provider);

const contract = new Contract(process.env.CONTRACT, contractInfo, signer);

// const getInstance = async () => {
//   if (_instance) return _instance;

//   // 1. Get chain id
//   //console.log(provider);
//   const network = await provider.getNetwork();

//   const chainId = +network.chainId.toString();

//   const ret = await provider.call({
//     // fhe lib address, may need to be changed depending on network
//     to: "0x000000000000000000000000000000000000005d",
//     // first four bytes of keccak256('fhePubKey(bytes1)') + 1 byte for library
//     data: "0xd9d47bb001",
//   });
//   const abiCoder = new ethers.utils.AbiCoder();

//   const decode = abiCoder.decode(["bytes"], ret);
//   //const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["bytes"], ret);
//   const publicKey = decode[0];

//   return createInstance({ chainId, publicKey });
// };

const createFhevmInstance = async () => {
  if (_instance) return _instance;

  const network = await provider.getNetwork();

  const chainId = +network.chainId.toString();

  const ret = await provider.call({
    to: "0x000000000000000000000000000000000000005d",
    data: "0xd9d47bb001",
  });
  const abiCoder = new ethers.utils.AbiCoder();

  const decode = abiCoder.decode(["bytes"], ret);
  const publicKey = decode[0];

  _instance = await createInstance({ chainId, publicKey });
};

const getInstance = () => {
  return _instance;
};

const getTokenSignature = async (contractAddress, userAddress) => {
  if (getInstance().hasKeypair(contractAddress)) {
    return getInstance().getTokenSignature(contractAddress);
  } else {
    const generatedToken = getInstance().generatePublicKey({
      verifyingContract: process.env.GAME,
    });
    const signature = await signer._signTypedData(
      generatedToken.eip712.domain,
      { Reencrypt: generatedToken.eip712.types.Reencrypt }, // Need to remove EIP712Domain from types
      generatedToken.eip712.message
    );
    getInstance().setSignature(contractAddress, signature);
    return { signature, publicKey: generatedToken.publicKey };
  }
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

const createNft = async () => {
  const fullPath = path.resolve(__dirname, "../../locations/rajout.json");
  const rawData = fs.readFileSync(fullPath);
  const jsonData = JSON.parse(rawData);

  try {
    console.log(process.env.CONTRACT);

    // const signer = new Wallet(sign, provider);

    // Initialize contract with ethers
    // const contract = new Contract(CONTRACT_ADDRESS, contractInfo, signer);
    await createFhevmInstance();

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
    const emptyData = [];

    // Écriture du contenu dans le fichier JSON
    fs.writeFile(fullPath, JSON.stringify(emptyData), (err) => {
      if (err) {
        console.error("Erreur lors de la vidange du fichier :", err);
        return;
      }
      console.log("Le fichier a été vidé avec succès.");
    });
    return tx.wait();
  } catch (error) {
    console.log(error);

    return error;
  }
};

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
