const { Contract, Wallet, ethers } = require("ethers");
//const dotenv = require("dotenv");

/*const { EthersClient } = require("../EthersClient");
const { Contract, Wallet, ethers } = require("ethers");

const GameAbi = require("../../abi/game.json");*/


const dotenv = require("dotenv");
const { createInstance } = require("fhevmjs");

dotenv.config();
const provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER);
let _instance;



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
  

  
class EthersClient {
    constructor(address, abi){
        this.signer = new Wallet(process.env.SECRET, provider);
        this.contractInteract = new Contract(address, abi, this.signer);

    }

    async init() {
        await createFhevmInstance();

    }

     async getTokenSignature (contractAddress, userAddress){
        if (getInstance().hasKeypair(contractAddress)) {
          return getInstance().getTokenSignature(contractAddress);
        } else {
          const generatedToken = getInstance().generatePublicKey({
            verifyingContract: process.env.GAME,
          });
          const signature = await this.signer._signTypedData(
            generatedToken.eip712.domain,
            { Reencrypt: generatedToken.eip712.types.Reencrypt }, // Need to remove EIP712Domain from types
            generatedToken.eip712.message
          );
          getInstance().setSignature(contractAddress, signature);
          return { signature, publicKey: generatedToken.publicKey };
        }
      };
    

}


module.exports = {
    EthersClient,
    getInstance,
  };
  