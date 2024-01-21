const { Contract, Wallet, ethers } = require("ethers");
const { createInstance } = require("fhevmjs");
const dotenv = require("dotenv");
dotenv.config();
const GameAbi = require("./abi/game.json");

const provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER);
const contractAddress = process.env.CONTRACT;

// const contract = new Contract(contractAddress, nftGuessrAbi, provider);
// const contractGame = new Contract(process.env.GAME, GameAbi, provider);
let _instance;
const signer = new Wallet(process.env.SECRET, provider);
const contractSign = new Contract(process.env.GAME, GameAbi, signer);

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
    console.log(generatedToken);
    const signature = await signer._signTypedData(
      generatedToken.eip712.domain,
      { Reencrypt: generatedToken.eip712.types.Reencrypt }, // Need to remove EIP712Domain from types
      generatedToken.eip712.message
    );
    getInstance().setSignature(contractAddress, signature);
    return { signature, publicKey: generatedToken.publicKey };
  }
};
const createFhevmInstance = async () => {
  const network = await provider.getNetwork();
  const chainId = +network.chainId.toString();
  const publicKey = await provider.call({
    from: null,
    to: "0x0000000000000000000000000000000000000044",
  });
  _instance = await createInstance({ chainId, publicKey });
};

// const getInstance = async () => {
//   if (_instance) return _instance;

//   // 1. Get chain id
//   const network = await provider.getNetwork();

//   const chainId = +network.chainId.toString();

//   // Get blockchain public key
//   const ret = await provider.call({
//     // fhe lib address, may need to be changed depending on network
//     to: "0x000000000000000000000000000000000000005d",
//     // first four bytes of keccak256('fhePubKey(bytes1)') + 1 byte for library
//     data: "0xd9d47bb001",
//   });

//   const decoded = ethers.utils.defaultAbiCoder.decode(["bytes"], ret);
//   const publicKey = decoded[0];

//   // Create instance
//   _instance = createInstance({ chainId, publicKey });
//   return _instance;
// };

const decrypt = async () => {
  await createFhevmInstance();
  const { signature, publicKey } = await getTokenSignature();
  //   console.log(instance);

  //   const generatedToken = instance.generatePublicKey({
  //     verifyingContract: process.env.GAME,
  //   });
  //   console.log(generatedToken);

  //   const signature = await signer._signTypedData(
  //     generatedToken.eip712.domain,
  //     { Reencrypt: generatedToken.eip712.types.Reencrypt }, // Need to remove EIP712Domain from types
  //     generatedToken.eip712.message
  //   );
  //   console.log(signature);
  //   instance.setSignature(process.env.GAME, signature);

  const res = await contractSign.getNFTLocation(2, publicKey, signature);
  console.log(res);
  const balance = getInstance().decrypt(process.env.GAME, res[0]);
  console.log(balance);
};

decrypt();
