const { JsonRpcProvider, Contract, ethers } = require("ethers");
const contractInfo = require("./abi/NftGuessr.json");

const dotenv = require("dotenv");

dotenv.config();

const provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER);
const contractAddress = process.env.CONTRACT;

const contract = new Contract(contractAddress, contractInfo, provider);

// const eventName = "GpsCheckResult"; // Remplacez par le nom de l'événement que vous souhaitez écouter

// async function main() {
//   console.log(`Listening for ${eventName} events...`);

//   // Crée un filtre pour l'événement spécifié
//   const filter = {
//     address: contractAddress,
//     topics: [ethers.id(eventName)],
//   };

//   // Crée le filtre et récupère l'ID du filtre
//   const filterId = await provider.send("eth_newFilter", [filter]);

//   // Vérifiez les nouveaux changements toutes les 5 secondes
//   setInterval(async () => {
//     console.log("ssss");
//     const changes = await provider.send("eth_getFilterChanges", [filterId]);
//     changes.forEach((log) => {
//       const parsedLog = contract.interface.parseLog(log);
//       console.log(`Event received for ${eventName}: `, parsedLog.values);
//     });
//   }, 5000);
// }
// main();
// Nettoyez le filtre lorsqu'il n'est plus nécessaire (par exemple, si

contract.on("GpsCheckResult", async (userAddress, result, tokenId) => {
  console.log(userAddress);
});
