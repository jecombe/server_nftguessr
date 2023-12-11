const { createInstance } = require("fhevmjs");
const {
  Wallet,
  JsonRpcProvider,
  Contract,
  formatUnits,
  parseUnits,
  ethers,
} = require("ethers");
const dotenv = require("dotenv");
const fs = require("fs");
dotenv.config();
const contractInfo = require("../../abi/NftGuessr.json");

const provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER);
let _instance;
const CONTRACT_ADDRESS = process.env.CONTRACT;
const sign = process.env.SECRET;
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

const setAddressToken = async () => {
  const signer = new Wallet(sign, provider);

  // Initialize contract with ethers
  const contract = new Contract(CONTRACT_ADDRESS, contractInfo, signer);

  // Get instance to encrypt amount parameter
  const tx = await contract.setAddressToken(process.env.TOKEN, {
    gasLimit: 10000000,
  });

  await tx.wait();
  return tx;
};

const getToken = async () => {
  const signer = new Wallet(sign, provider);

  // Initialize contract with ethers
  const contract = new Contract(CONTRACT_ADDRESS, contractInfo, signer);

  // Get instance to encrypt amount parameter
  const tx = await contract.getToken({
    gasLimit: 10000000,
  });

  await tx.wait();
  return tx;
};

const testMint = async () => {
  const signer = new Wallet(process.env.USER_SECRET, provider);
  // Initialize contract with ethers
  const contract = new Contract(CONTRACT_ADDRESS, contractInfo, signer);

  // Get instance to encrypt amount parameter
  const tx = await contract.testMint({
    gasLimit: 10000000,
  });

  await tx.wait();
  return tx;
};

const getBalance = async () => {
  const signer = new Wallet(sign, provider);

  // Initialize contract with ethers
  const contract = new Contract(CONTRACT_ADDRESS, contractInfo, signer);

  // Get instance to encrypt amount parameter
  const tx = await contract.getBalanceCoinSpace(process.env.USER, {
    gasLimit: 10000000,
  });
  const valueInWei = formatUnits(tx, 18);
  console.log(valueInWei);
};

const approveContract = async (amount) => {
  const signer = new Wallet(sign, provider);

  // Initialize contract with ethers
  const contract = new Contract(CONTRACT_ADDRESS, contractInfo, signer);

  // Get instance to encrypt amount parameter
  const tx = await contract.approveContract(10);
  console.log(tx);
  await tx.wait();
  return tx;
};

const approval = async () => {
  const signer = new Wallet(sign, provider);

  const erc20Contract = new Contract(process.env.TOKEN, contractInfo, signer);
  const approvalAmount = parseUnits("80", 18);

  const approvalTx = await erc20Contract.approve(
    CONTRACT_ADDRESS,
    approvalAmount
  );

  await approvalTx.wait();
};

const start = async () => {
  const res = await setAddressToken();
  console.log(res);
};

start();
