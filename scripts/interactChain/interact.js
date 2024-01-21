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
const contractAirdrop = require("../../abi/airdrop.json");

const provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER);
let _instance;
const CONTRACT_ADDRESS = process.env.CONTRACT;
const sign = process.env.SECRET;
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

const setAddressToken = async () => {
  const signer = new Wallet(sign, provider);

  // Initialize contract with ethers
  const contract = new Contract(CONTRACT_ADDRESS, contractInfo, signer);
  const contractAir = new Contract(
    process.env.AIRDROP,
    contractAirdrop,
    signer
  );

  try {
    // Get instance to encrypt amount parameter
    const tx = await contract.setAddressToken(process.env.TOKEN, {
      gasLimit: 10000000,
    });
    await tx.wait();
    const tx3 = await contract.setAddressGame(process.env.GAME, {
      gasLimit: 10000000,
    });
    await tx3.wait();
    const tx2 = await contract.setAddressAirdropToken(
      process.env.AIRDROP,
      process.env.TOKEN,
      {
        gasLimit: 10000000,
      }
    );
    await tx2.wait();
    const tx0 = await contract.setDistribution({
      gasLimit: 10000000,
    });
    return tx0.wait();
  } catch (error) {
    console.log(error);
  }
};

const withdrawTeamsNftGuessr = async () => {
  const signer = new Wallet(sign, provider);
  const contract = new Contract(CONTRACT_ADDRESS, contractInfo, signer);

  // Initialize contract with ethers

  // Get instance to encrypt amount parameter
  const tx = await contract.claimRewardTeams({
    gasLimit: 10000000,
  });

  return tx.wait();
};

const withdrawTeamsAirdrop = async () => {
  const signer = new Wallet(sign, provider);
  const contract = new Contract(CONTRACT_ADDRESS, contractInfo, signer);

  // Initialize contract with ethers

  // Get instance to encrypt amount parameter
  const tx = await contract.claimAirDropTeams({
    gasLimit: 10000000,
  });

  return tx.wait();
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

const withdraw = async () => {
  const signer = new Wallet(sign, provider);

  const contract = new Contract(CONTRACT_ADDRESS, contractInfo, signer);

  const approvalTx = await contract.balanceOf(CONTRACT_ADDRESS);

  console.log(`${approvalTx}`);

  const wihtdr = await contract.withdraw();
  await wihtdr.wait();
  // const approvalTxx = await contract.balanceOf(CONTRACT_ADDRESS);
  // console.log(`${approvalTxx}`);
};

const start = async () => {
  const res = await setAddressToken();
  console.log(res);
};

const withdrawGame = async () => {
  try {
    await withdrawTeamsNftGuessr();
  } catch (error) {
    console.log(error);
  }
};
withdrawGame();
//xstart();
